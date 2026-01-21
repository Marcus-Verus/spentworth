// Transaction Kinds - the core classification enum
export type TransactionKind =
	| 'purchase'
	| 'income'
	| 'transfer'
	| 'cc_payment'
	| 'refund'
	| 'cash_withdrawal'
	| 'fee_interest'
	| 'unknown'
	| 'duplicate';

// Parse status for raw transactions
export type ParseStatus = 'ok' | 'error';

// Calculation method for opportunity cost
export type CalcMethod = 'adj_close_ratio' | 'fallback_7pct' | 'unavailable';

// Batch status
export type BatchStatus = 'parsed' | 'committed' | 'deleted';

// Match types for merchant rules
export type MatchType = 'contains' | 'equals' | 'regex';

// Match fields for merchant rules
export type MatchField = 'merchant_norm' | 'description';

// API Response wrapper
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string; details?: unknown };

// Import batch summary
export interface BatchSummary {
	rowsTotal: number;
	rowsIncluded: number;
	rowsExcluded: number;
	rowsNeedsReview: number;
	rowsDuplicates: number;
	rowsUncategorized: number;
	totalIncludedSpend: number;
	totalExcludedAmount: number;
	dateMin: string | null;
	dateMax: string | null;
	currency: 'USD';
}

// Import batch
export interface ImportBatch {
	id: string;
	userId: string;
	sourceName: string | null;
	originalFilename: string | null;
	uploadedAt: string;
	status: BatchStatus;
	dateMin: string | null;
	dateMax: string | null;
	rowsTotal: number;
	rowsIncluded: number;
	rowsExcluded: number;
	rowsNeedsReview: number;
	rowsDuplicates: number;
	totalIncludedSpend: number;
	totalExcludedAmount: number;
	currency: string;
}

// Raw transaction from CSV import
export interface RawTransaction {
	id: string;
	batchId: string;
	userId: string;
	rowIndex: number;
	raw: Record<string, unknown>;

	parseStatus: ParseStatus;
	parseError: string | null;

	dateRaw: string | null;
	dateChosen: string | null;
	amountRaw: string | null;
	amountSigned: number | null;
	descriptionRaw: string | null;
	merchantRaw: string | null;
	merchantNorm: string | null;

	kind: TransactionKind;
	kindReason: string | null;
	includedInSpend: boolean;
	category: string | null;

	isDuplicate: boolean;
	duplicateOf: string | null;

	createdAt: string;
}

// Raw row with effective fields (after overrides applied)
export interface RawRowEffective {
	id: string;
	rowIndex: number;

	dateChosen: string | null;
	amountSigned: number | null;
	merchantRaw: string | null;
	merchantNorm: string | null;
	descriptionRaw: string | null;

	systemKind: TransactionKind;
	systemIncludedInSpend: boolean;
	systemCategory: string | null;
	systemReason: string | null;

	effectiveKind: TransactionKind;
	effectiveIncludedInSpend: boolean;
	effectiveCategory: string | null;

	parseStatus: ParseStatus;
	parseError: string | null;

	isDuplicate: boolean;
	duplicateOf: string | null;
}

// Committed transaction
export interface Transaction {
	id: string;
	userId: string;
	batchId: string | null;
	date: string;
	investDate: string;
	amount: number;
	direction: 'debit' | 'credit';
	merchant: string | null;
	merchantNorm: string | null;
	description: string | null;
	kind: TransactionKind;
	category: string | null;
	includedInSpend: boolean;
	tickerSymbol: string;
	futureValue: number | null;
	growthDelta: number | null;
	calcMethod: CalcMethod;
	calcError: string | null;
	matchedRefundFor: string | null;
	matchedRefundTo: string | null;
	createdAt: string;
	updatedAt: string;
}

// Transaction override
export interface TransactionOverride {
	id: string;
	userId: string;
	rawTransactionId: string | null;
	transactionId: string | null;
	overrideKind: TransactionKind | null;
	overrideIncludedInSpend: boolean | null;
	overrideCategory: string | null;
	overrideMerchant: string | null;
	createdAt: string;
}

// Merchant rule
export interface MerchantRule {
	id: string;
	userId: string;
	matchType: MatchType;
	matchValue: string;
	matchField: MatchField;
	actionExclude: boolean;
	setKind: TransactionKind | null;
	setCategory: string | null;
	priority: number;
	enabled: boolean;
	createdAt: string;
}

// Price cache entry
export interface PriceCache {
	id: string;
	ticker: string;
	priceDate: string;
	adjClose: number | null;
	close: number | null;
	source: string | null;
	fetchedAt: string;
}

// User preferences
export interface UserPrefs {
	userId: string;
	defaultTicker: string;
	investDelayTradingDays: number;
	allowFallbackForAllTickers: boolean;
}

// Dashboard summary
export interface DashboardSummary {
	totalSpent: number;
	totalFutureValue: number;
	totalDelta: number;
	categories: CategorySummary[];
	ticker: string;
	usingRealPrices: number;
	usingFallback: number;
	transactionCount: number;
	dateMin: string | null;
	dateMax: string | null;
	monthly: MonthlySummary[];
	topTransactions: TopTransaction[];
	topMerchants: MerchantSummary[];
	topMerchantsBySpend: MerchantSummary[];
	avgTransaction: number;
	biggestPurchase: TopTransaction | null;
	dayOfWeek: DayOfWeekSummary[];
	biggestSpendingDay: DayOfWeekSummary;
	mostFrequentDay: DayOfWeekSummary;
	recurringCharges: RecurringCharge[];
	yoyComparison: YoYComparison | null;
	monthlyIncome: number | null;
}

export interface YoYComparison {
	lastYearTotal: number;
	currentYearTotal: number;
	changeAmount: number;
	changePct: number;
	lastYearTxCount: number;
	categoryChanges: CategoryChange[];
}

export interface CategoryChange {
	category: string;
	currentYear: number;
	lastYear: number;
	change: number;
	changePct: number;
}

export interface MonthlySummary {
	month: string; // YYYY-MM
	spent: number;
	future: number;
	delta: number;
}

export interface TopTransaction {
	merchant: string;
	date: string;
	amount: number;
	futureValue: number;
	growth: number;
	growthPct: number;
}

export interface MerchantSummary {
	merchant: string;
	count: number;
	totalSpent: number;
	totalFuture: number;
	totalGrowth: number;
	avgTransaction: number;
	lastDate: string;
}

export interface DayOfWeekSummary {
	day: string;
	dayShort: string;
	spent: number;
	count: number;
	avg: number;
}

export interface RecurringCharge {
	merchant: string;
	avgAmount: number;
	frequency: string;
	monthlyEstimate: number;
	yearlyEstimate: number;
	count: number;
}

export interface CategorySummary {
	category: string;
	spent: number;
	future: number;
	delta: number;
}

// Override patch request
export interface OverridePatch {
	kind?: TransactionKind | null;
	includedInSpend?: boolean | null;
	category?: string | null;
	merchant?: string | null;
}

// Tab types for import preview
export type PreviewTab = 'included' | 'excluded' | 'needs_review' | 'duplicates' | 'uncategorized';

// Sort options
export type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

// Default categories (aligned with Rocket Money / Mint standards)
export const CATEGORIES = [
	'Auto & Transport',
	'Groceries',
	'Dining & Restaurants',
	'Coffee & Drinks',
	'Food Delivery',
	'Shopping',
	'Home & Garden',
	'Subscriptions',
	'Travel & Vacation',
	'Entertainment',
	'Healthcare & Medical',
	'Utilities',
	'Housing & Rent',
	'Personal Care',
	'Fitness & Gym',
	'Pets',
	'Insurance',
	'Education',
	'Gifts & Donations',
	'Kids & Family',
	'Electronics',
	'Uncategorized'
] as const;

export type Category = (typeof CATEGORIES)[number];

// Budget types
export interface Budget {
	id: string;
	userId: string;
	category: string;
	monthlyLimit: number;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface BudgetWithProgress extends Budget {
	currentSpent: number;
	previousSpent: number;
	percentUsed: number;
	remaining: number;
	overUnder: number; // positive = under budget (savings), negative = over
	opportunityCostLost: number; // if over budget, what that costs in 10 years
	opportunityCostGained: number; // if under budget, what you'll gain in 10 years
	trend: 'improving' | 'worsening' | 'stable'; // vs last month
	trendAmount: number; // how much better/worse vs last month
}
