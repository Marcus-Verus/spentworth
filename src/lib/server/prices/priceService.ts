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
		// Use TIME_SERIES_DAILY_ADJUSTED with full outputsize (premium)
		// Adjusted prices account for splits and dividends for accurate calculations
		const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
		console.log(`Fetching Alpha Vantage premium data for ${ticker} (full history)...`);
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

		// Premium endpoint uses 'Time Series (Daily)' key
		const timeSeries = json['Time Series (Daily)'] || json['Time Series (Daily Adjusted)'];
		if (!timeSeries) {
			console.error('Alpha Vantage: No time series data. Full response:', JSON.stringify(json).slice(0, 500));
			return null;
		}

		const data: Record<string, number> = {};

		for (const [dateKey, values] of Object.entries(timeSeries)) {
			// Use adjusted close price (field 5) for accurate calculations
			// Falls back to regular close (field 4) if adjusted not available
			const adjClose = parseFloat((values as Record<string, string>)['5. adjusted close']);
			const close = parseFloat((values as Record<string, string>)['4. close']);
			const price = !isNaN(adjClose) ? adjClose : (!isNaN(close) ? close : null);
			if (price !== null) {
				data[dateKey] = price;
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

// Fetch real-time quote for a ticker (premium feature)
async function fetchRealtimeQuote(ticker: string): Promise<{ price: number; date: string } | null> {
	if (!ALPHA_VANTAGE_API_KEY) {
		return null;
	}

	try {
		const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
		console.log(`Fetching real-time quote for ${ticker}...`);
		const response = await fetch(url);
		const json = await response.json();

		if (json['Error Message'] || json['Note'] || json['Information']) {
			console.error('Alpha Vantage quote error:', json['Error Message'] || json['Note'] || json['Information']);
			return null;
		}

		const quote = json['Global Quote'];
		if (!quote || !quote['05. price']) {
			return null;
		}

		const price = parseFloat(quote['05. price']);
		const date = quote['07. latest trading day'] || format(new Date(), 'yyyy-MM-dd');

		if (!isNaN(price)) {
			return { price, date };
		}

		return null;
	} catch (error) {
		console.error('Alpha Vantage quote fetch error:', error);
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

	// Fetch and cache price history for a ticker (full 20+ years with premium API)
	async ensurePricesLoaded(ticker: string): Promise<boolean> {
		// Load DB cache
		await this.loadCacheForTicker(ticker);

		// If we have recent cache data (within last week), we're good
		const cached = this.dbCache.get(ticker);
		if (cached && cached.size > 0) {
			const dates = Array.from(cached.keys()).sort().reverse();
			const mostRecent = dates[0];
			const daysSinceCache = (Date.now() - new Date(mostRecent).getTime()) / (1000 * 60 * 60 * 24);
			if (daysSinceCache < 7) {
				console.log(`Using cached prices for ${ticker} (${cached.size} dates, most recent: ${mostRecent})`);
				return true;
			}
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

	// Get current price (most recent, with real-time quote fallback)
	async getCurrentPrice(ticker: string): Promise<{
		price: number | null;
		date: string;
		source: string;
	}> {
		// Try real-time quote first (premium feature)
		const realtimeQuote = await fetchRealtimeQuote(ticker);
		if (realtimeQuote) {
			return { 
				price: realtimeQuote.price, 
				date: realtimeQuote.date, 
				source: 'alpha_vantage_realtime' 
			};
		}

		// Fallback to cached or historical data
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
		delayTradingDays: number,
		fallbackAnnualReturn: number = 0.07
	): Promise<{
		investDate: string;
		investPrice: number | null;
		currentPrice: number | null;
		currentDate: string | null;
		futureValue: number;
		growthDelta: number;
		calcMethod: 'adj_close_ratio' | 'fallback_rate';
		calcError: string | null;
		fallbackRateUsed?: number;
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

		// Fallback to configured annual return rate
		const years = (today.getTime() - investDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
		const rate = 1 + fallbackAnnualReturn;
		const futureValue = amount * Math.pow(rate, Math.max(0, years));
		const growthDelta = futureValue - amount;

		return {
			investDate: investDateStr,
			investPrice: null,
			currentPrice: null,
			currentDate: null,
			futureValue: Math.round(futureValue * 100) / 100,
			growthDelta: Math.round(growthDelta * 100) / 100,
			calcMethod: 'fallback_rate',
			calcError: investPriceResult.price === null
				? 'Price data unavailable for invest date'
				: 'Current price unavailable',
			fallbackRateUsed: fallbackAnnualReturn
		};
	}
}

export function createPriceService(supabase: SupabaseClient): PriceService {
	return new PriceService(supabase);
}
