import { ALPHA_VANTAGE_API_KEY } from '$env/static/private';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, subDays, isWeekend, format, parseISO } from 'date-fns';

// Price provider interface
export interface PriceProvider {
	name: string;
	getAdjustedClose(ticker: string, date: Date): Promise<number | null>;
}

// Alpha Vantage provider
class AlphaVantageProvider implements PriceProvider {
	name = 'alpha_vantage';
	private cache = new Map<string, Record<string, number>>();

	async getAdjustedClose(ticker: string, date: Date): Promise<number | null> {
		const dateStr = format(date, 'yyyy-MM-dd');
		const cacheKey = `${ticker}`;

		// Check in-memory cache first
		if (this.cache.has(cacheKey)) {
			const data = this.cache.get(cacheKey)!;
			if (data[dateStr] !== undefined) {
				return data[dateStr];
			}
		}

		// Fetch from API
		try {
			const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
			const response = await fetch(url);
			const json = await response.json();

			if (json['Time Series (Daily)']) {
				const timeSeries = json['Time Series (Daily)'];
				const data: Record<string, number> = {};

				for (const [dateKey, values] of Object.entries(timeSeries)) {
					const adjClose = parseFloat((values as Record<string, string>)['5. adjusted close']);
					if (!isNaN(adjClose)) {
						data[dateKey] = adjClose;
					}
				}

				this.cache.set(cacheKey, data);

				if (data[dateStr] !== undefined) {
					return data[dateStr];
				}
			}

			return null;
		} catch (error) {
			console.error('Alpha Vantage error:', error);
			return null;
		}
	}
}

// Fallback provider using constant return
class FallbackProvider implements PriceProvider {
	name = 'fallback_7pct';
	private annualReturn = 0.07;

	async getAdjustedClose(_ticker: string, _date: Date): Promise<number | null> {
		// This provider doesn't return actual prices
		// It's used as a signal to use the fallback calculation
		return null;
	}

	calculateFutureValue(amount: number, investDate: Date, currentDate: Date = new Date()): number {
		const years = (currentDate.getTime() - investDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
		return amount * Math.pow(1 + this.annualReturn, years);
	}
}

// Trading day utilities
function isUSMarketOpen(date: Date): boolean {
	// Basic check: not weekend
	// TODO: Add US market holiday calendar
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

// Main price service
export class PriceService {
	private primaryProvider: PriceProvider;
	private fallbackProvider: FallbackProvider;
	private supabase: SupabaseClient;

	constructor(supabase: SupabaseClient) {
		this.primaryProvider = new AlphaVantageProvider();
		this.fallbackProvider = new FallbackProvider();
		this.supabase = supabase;
	}

	// Get adjusted close with caching and date shifting
	async getAdjustedClose(ticker: string, date: Date): Promise<{
		price: number | null;
		source: string;
		actualDate: string;
	}> {
		const dateStr = format(date, 'yyyy-MM-dd');

		// 1. Check database cache
		const { data: cached } = await this.supabase
			.from('price_cache')
			.select('adj_close, source')
			.eq('ticker', ticker)
			.eq('price_date', dateStr)
			.single();

		if (cached?.adj_close) {
			return {
				price: cached.adj_close,
				source: cached.source || 'cache',
				actualDate: dateStr
			};
		}

		// 2. Try to fetch from primary provider
		let price = await this.primaryProvider.getAdjustedClose(ticker, date);
		let actualDate = date;

		// 3. If no price, try shifting to next trading day
		if (price === null) {
			const nextDay = getNextTradingDay(date);
			if (nextDay) {
				price = await this.primaryProvider.getAdjustedClose(ticker, nextDay);
				if (price !== null) {
					actualDate = nextDay;
				}
			}
		}

		// 4. If still no price, try shifting to previous trading day
		if (price === null) {
			const prevDay = getPreviousTradingDay(date);
			if (prevDay) {
				price = await this.primaryProvider.getAdjustedClose(ticker, prevDay);
				if (price !== null) {
					actualDate = prevDay;
				}
			}
		}

		// 5. Cache the result if we got a price
		if (price !== null) {
			await this.supabase.from('price_cache').upsert({
				ticker,
				price_date: format(actualDate, 'yyyy-MM-dd'),
				adj_close: price,
				source: this.primaryProvider.name
			});

			return {
				price,
				source: this.primaryProvider.name,
				actualDate: format(actualDate, 'yyyy-MM-dd')
			};
		}

		return {
			price: null,
			source: 'unavailable',
			actualDate: dateStr
		};
	}

	// Calculate investment date based on delay
	calculateInvestDate(purchaseDate: Date, delayTradingDays: number): Date {
		let investDate = purchaseDate;

		for (let i = 0; i < delayTradingDays; i++) {
			const next = getNextTradingDay(investDate);
			if (next) {
				investDate = next;
			} else {
				break;
			}
		}

		// Make sure invest date is a trading day
		if (!isUSMarketOpen(investDate)) {
			const next = getNextTradingDay(investDate);
			if (next) {
				investDate = next;
			}
		}

		return investDate;
	}

	// Calculate opportunity cost for a transaction
	async calculateOpportunityCost(
		amount: number,
		purchaseDate: Date,
		ticker: string,
		delayTradingDays: number,
		allowFallback: boolean = false
	): Promise<{
		investDate: string;
		futureValue: number | null;
		growthDelta: number | null;
		calcMethod: 'adj_close_ratio' | 'fallback_7pct' | 'unavailable';
		calcError: string | null;
	}> {
		const investDate = this.calculateInvestDate(purchaseDate, delayTradingDays);
		const investDateStr = format(investDate, 'yyyy-MM-dd');
		const today = new Date();

		// Get price on invest date
		const investPrice = await this.getAdjustedClose(ticker, investDate);

		// Get current price
		const currentPrice = await this.getAdjustedClose(ticker, today);

		if (investPrice.price !== null && currentPrice.price !== null) {
			// Calculate using adjusted close ratio
			const futureValue = amount * (currentPrice.price / investPrice.price);
			const growthDelta = futureValue - amount;

			return {
				investDate: investDateStr,
				futureValue: Math.round(futureValue * 100) / 100,
				growthDelta: Math.round(growthDelta * 100) / 100,
				calcMethod: 'adj_close_ratio',
				calcError: null
			};
		}

		// Check if fallback is allowed
		const fallbackTickers = ['SPY', 'VTI', 'VOO', 'QQQ'];
		if (allowFallback || fallbackTickers.includes(ticker.toUpperCase())) {
			const futureValue = this.fallbackProvider.calculateFutureValue(amount, investDate, today);
			const growthDelta = futureValue - amount;

			return {
				investDate: investDateStr,
				futureValue: Math.round(futureValue * 100) / 100,
				growthDelta: Math.round(growthDelta * 100) / 100,
				calcMethod: 'fallback_7pct',
				calcError: 'Price unavailable, using 7% annual return fallback'
			};
		}

		return {
			investDate: investDateStr,
			futureValue: null,
			growthDelta: null,
			calcMethod: 'unavailable',
			calcError: 'Price data unavailable'
		};
	}
}

// Create a price service instance
export function createPriceService(supabase: SupabaseClient): PriceService {
	return new PriceService(supabase);
}
