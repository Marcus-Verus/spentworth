import { ALPHA_VANTAGE_API_KEY } from '$env/static/private';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, subDays, isWeekend, format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';

// In-memory cache for full ticker data (survives during single request)
const tickerDataCache = new Map<string, Record<string, number>>();

// Fetch full price history for a ticker from Alpha Vantage
// Returns ALL historical data in ONE API call
async function fetchFullPriceHistory(ticker: string): Promise<Record<string, number> | null> {
	// Check in-memory cache first
	if (tickerDataCache.has(ticker)) {
		return tickerDataCache.get(ticker)!;
	}

	if (!ALPHA_VANTAGE_API_KEY) {
		console.error('ALPHA_VANTAGE_API_KEY not set in environment variables');
		return null;
	}

	try {
		// Use TIME_SERIES_DAILY (free) instead of TIME_SERIES_DAILY_ADJUSTED (premium)
		const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
		console.log(`Fetching Alpha Vantage data for ${ticker}...`);
		const response = await fetch(url);
		const json = await response.json();

		// Log the response keys for debugging
		console.log('Alpha Vantage response keys:', Object.keys(json));

		// Check for API errors
		if (json['Error Message']) {
			console.error('Alpha Vantage error:', json['Error Message']);
			return null;
		}

		if (json['Note']) {
			// Rate limit hit
			console.error('Alpha Vantage rate limit:', json['Note']);
			return null;
		}

		if (json['Information']) {
			// API limit or other info message
			console.error('Alpha Vantage info:', json['Information']);
			return null;
		}

		if (!json['Time Series (Daily)']) {
			console.error('Alpha Vantage: No time series data. Full response:', JSON.stringify(json).slice(0, 500));
			return null;
		}

		const timeSeries = json['Time Series (Daily)'];
		const data: Record<string, number> = {};

		for (const [dateKey, values] of Object.entries(timeSeries)) {
			// Use closing price (field 4) from the free endpoint
			const close = parseFloat((values as Record<string, string>)['4. close']);
			if (!isNaN(close)) {
				data[dateKey] = close;
			}
		}

		// Cache in memory
		tickerDataCache.set(ticker, data);

		return data;
	} catch (error) {
		console.error('Alpha Vantage fetch error:', error);
		return null;
	}
}

// Trading day utilities
function isUSMarketOpen(date: Date): boolean {
	return !isWeekend(date);
}

function getNextTradingDay(date: Date, maxDays: number = 7): Date | null {
	let current = date;
	for (let i = 0; i < maxDays; i++) {
		current = addDays(current, 1);
		if (isUSMarketOpen(current)) {
			return current;
		}
	}
	return null;
}

function getPreviousTradingDay(date: Date, maxDays: number = 7): Date | null {
	let current = date;
	for (let i = 0; i < maxDays; i++) {
		current = subDays(current, 1);
		if (isUSMarketOpen(current)) {
			return current;
		}
	}
	return null;
}

// Find closest available date in price data
function findClosestDate(
	data: Record<string, number>,
	targetDate: Date,
	direction: 'before' | 'after' | 'nearest' = 'nearest'
): { date: string; price: number } | null {
	const targetStr = format(targetDate, 'yyyy-MM-dd');
	
	// Exact match
	if (data[targetStr] !== undefined) {
		return { date: targetStr, price: data[targetStr] };
	}

	const dates = Object.keys(data).sort();
	
	// Find surrounding dates
	let before: string | null = null;
	let after: string | null = null;

	for (const d of dates) {
		if (d < targetStr) {
			before = d;
		} else if (d > targetStr && !after) {
			after = d;
			break;
		}
	}

	if (direction === 'before' && before) {
		return { date: before, price: data[before] };
	}
	if (direction === 'after' && after) {
		return { date: after, price: data[after] };
	}
	if (direction === 'nearest') {
		// Return the closer one
		if (before && after) {
			const beforeDiff = Math.abs(parseISO(before).getTime() - targetDate.getTime());
			const afterDiff = Math.abs(parseISO(after).getTime() - targetDate.getTime());
			return beforeDiff <= afterDiff
				? { date: before, price: data[before] }
				: { date: after, price: data[after] };
		}
		if (before) return { date: before, price: data[before] };
		if (after) return { date: after, price: data[after] };
	}

	return null;
}

// Main price service
export class PriceService {
	private supabase: SupabaseClient;
	private dbCacheLoaded = new Set<string>();
	private dbCache: Map<string, Map<string, { price: number; source: string }>> = new Map();

	constructor(supabase: SupabaseClient) {
		this.supabase = supabase;
	}

	// Load all cached prices for a ticker from database
	async loadCacheForTicker(ticker: string): Promise<void> {
		if (this.dbCacheLoaded.has(ticker)) return;

		const { data } = await this.supabase
			.from('price_cache')
			.select('price_date, adj_close, source')
			.eq('ticker', ticker);

		if (data && data.length > 0) {
			const tickerCache = new Map<string, { price: number; source: string }>();
			for (const row of data) {
				tickerCache.set(row.price_date, {
					price: row.adj_close,
					source: row.source || 'cache'
				});
			}
			this.dbCache.set(ticker, tickerCache);
		}

		this.dbCacheLoaded.add(ticker);
	}

	// Fetch and cache full price history for a ticker
	async ensurePricesLoaded(ticker: string): Promise<boolean> {
		// Load DB cache
		await this.loadCacheForTicker(ticker);

		// If we have substantial cache data, we're good
		const cached = this.dbCache.get(ticker);
		if (cached && cached.size > 100) {
			return true;
		}

		// Fetch from API
		const priceData = await fetchFullPriceHistory(ticker);
		if (!priceData) {
			return false;
		}

		// Bulk insert into database cache
		const rows = Object.entries(priceData).map(([date, price]) => ({
			ticker,
			price_date: date,
			adj_close: price,
			source: 'alpha_vantage'
		}));

		// Insert in chunks
		const chunkSize = 500;
		for (let i = 0; i < rows.length; i += chunkSize) {
			const chunk = rows.slice(i, i + chunkSize);
			await this.supabase.from('price_cache').upsert(chunk, {
				onConflict: 'ticker,price_date'
			});
		}

		// Update local cache
		const tickerCache = new Map<string, { price: number; source: string }>();
		for (const [date, price] of Object.entries(priceData)) {
			tickerCache.set(date, { price, source: 'alpha_vantage' });
		}
		this.dbCache.set(ticker, tickerCache);

		return true;
	}

	// Get price for a specific date
	async getPrice(ticker: string, date: Date): Promise<{
		price: number | null;
		actualDate: string;
		source: string;
	}> {
		const dateStr = format(date, 'yyyy-MM-dd');

		// Ensure prices are loaded
		await this.loadCacheForTicker(ticker);
		const tickerCache = this.dbCache.get(ticker);

		// Check cache
		if (tickerCache) {
			const cached = tickerCache.get(dateStr);
			if (cached) {
				return { price: cached.price, actualDate: dateStr, source: cached.source };
			}

			// Find nearest date
			const cacheData: Record<string, number> = {};
			for (const [d, v] of tickerCache) {
				cacheData[d] = v.price;
			}
			const nearest = findClosestDate(cacheData, date, 'before');
			if (nearest) {
				return { price: nearest.price, actualDate: nearest.date, source: 'cache' };
			}
		}

		// Try fetching from API
		const priceData = await fetchFullPriceHistory(ticker);
		if (priceData) {
			const result = findClosestDate(priceData, date, 'before');
			if (result) {
				return { price: result.price, actualDate: result.date, source: 'alpha_vantage' };
			}
		}

		return { price: null, actualDate: dateStr, source: 'unavailable' };
	}

	// Get current price (most recent)
	async getCurrentPrice(ticker: string): Promise<{
		price: number | null;
		date: string;
		source: string;
	}> {
		await this.loadCacheForTicker(ticker);
		const tickerCache = this.dbCache.get(ticker);

		if (tickerCache && tickerCache.size > 0) {
			// Find most recent date
			const dates = Array.from(tickerCache.keys()).sort().reverse();
			const mostRecent = dates[0];
			const data = tickerCache.get(mostRecent)!;
			return { price: data.price, date: mostRecent, source: data.source };
		}

		// Try API
		const priceData = await fetchFullPriceHistory(ticker);
		if (priceData) {
			const dates = Object.keys(priceData).sort().reverse();
			if (dates.length > 0) {
				const mostRecent = dates[0];
				return { price: priceData[mostRecent], date: mostRecent, source: 'alpha_vantage' };
			}
		}

		return { price: null, date: format(new Date(), 'yyyy-MM-dd'), source: 'unavailable' };
	}

	// Calculate opportunity cost using real prices when available
	async calculateOpportunityCost(
		amount: number,
		purchaseDate: Date,
		ticker: string,
		delayTradingDays: number
	): Promise<{
		investDate: string;
		investPrice: number | null;
		currentPrice: number | null;
		currentDate: string | null;
		futureValue: number;
		growthDelta: number;
		calcMethod: 'adj_close_ratio' | 'fallback_7pct';
		calcError: string | null;
	}> {
		// Calculate invest date
		let investDate = purchaseDate;
		for (let i = 0; i < delayTradingDays; i++) {
			const next = getNextTradingDay(investDate);
			if (next) investDate = next;
		}
		if (!isUSMarketOpen(investDate)) {
			const next = getNextTradingDay(investDate);
			if (next) investDate = next;
		}

		const investDateStr = format(investDate, 'yyyy-MM-dd');
		const today = new Date();

		// Try to get real prices
		const investPriceResult = await this.getPrice(ticker, investDate);
		const currentPriceResult = await this.getCurrentPrice(ticker);

		if (investPriceResult.price !== null && currentPriceResult.price !== null) {
			const ratio = currentPriceResult.price / investPriceResult.price;
			const futureValue = amount * ratio;
			const growthDelta = futureValue - amount;

			return {
				investDate: investDateStr,
				investPrice: investPriceResult.price,
				currentPrice: currentPriceResult.price,
				currentDate: currentPriceResult.date,
				futureValue: Math.round(futureValue * 100) / 100,
				growthDelta: Math.round(growthDelta * 100) / 100,
				calcMethod: 'adj_close_ratio',
				calcError: null
			};
		}

		// Fallback to 7% annual
		const years = (today.getTime() - investDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
		const futureValue = amount * Math.pow(1.07, Math.max(0, years));
		const growthDelta = futureValue - amount;

		return {
			investDate: investDateStr,
			investPrice: null,
			currentPrice: null,
			currentDate: null,
			futureValue: Math.round(futureValue * 100) / 100,
			growthDelta: Math.round(growthDelta * 100) / 100,
			calcMethod: 'fallback_7pct',
			calcError: investPriceResult.price === null
				? 'Price data unavailable for invest date'
				: 'Current price unavailable'
		};
	}
}

export function createPriceService(supabase: SupabaseClient): PriceService {
	return new PriceService(supabase);
}
