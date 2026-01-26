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

// Hidden data info for tier limit warnings
export interface HiddenDataInfo {
	hasHiddenData: boolean;
	hiddenTransactionCount: number;
	hiddenTotalSpent: number;
	tierDateLimit: string | null;
	oldestTransactionDate: string | null;
	historyLimitDays: number;
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
	hiddenDataInfo: HiddenDataInfo | null;
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

// Category hierarchy with subcategories (Rocket Money style)
export const CATEGORY_HIERARCHY: Record<string, string[]> = {
	'Auto & Transport': [
		'Gas & Fuel',
		'Parking',
		'Auto Insurance',
		'Auto Payment',
		'Auto Maintenance',
		'Ride Share',
		'Public Transit',
		'Tolls'
	],
	'Coffee & Drinks': [
		'Coffee Shops',
		'Bars & Alcohol',
		'Smoothies & Juice'
	],
	'Dining & Restaurants': [
		'Fast Food',
		'Casual Dining',
		'Fine Dining',
		'Takeout',
		'Food Trucks'
	],
	'Education': [
		'Tuition',
		'Books & Supplies',
		'Student Loans',
		'Online Courses'
	],
	'Electronics': [
		'Computers',
		'Phones & Tablets',
		'Accessories',
		'Software'
	],
	'Entertainment': [
		'Movies & TV',
		'Music & Concerts',
		'Games',
		'Sports & Recreation',
		'Hobbies',
		'Streaming Services'
	],
	'Fitness & Gym': [
		'Gym Membership',
		'Fitness Classes',
		'Sports Equipment',
		'Supplements'
	],
	'Food Delivery': [
		'Delivery Apps',
		'Meal Kits'
	],
	'Gifts & Donations': [
		'Gifts',
		'Charity',
		'Religious'
	],
	'Groceries': [
		'Supermarket',
		'Specialty Foods',
		'Organic & Natural',
		'Warehouse Clubs'
	],
	'Healthcare & Medical': [
		'Doctor',
		'Dentist',
		'Vision',
		'Pharmacy',
		'Mental Health',
		'Medical Equipment'
	],
	'Home & Garden': [
		'Home Improvement',
		'Garden & Lawn',
		'Furniture',
		'Home Decor',
		'Cleaning Supplies'
	],
	'Housing & Rent': [
		'Rent',
		'Mortgage',
		'HOA Fees',
		'Home Insurance'
	],
	'Insurance': [
		'Life Insurance',
		'Health Insurance',
		'Renters Insurance',
		'Other Insurance'
	],
	'Kids & Family': [
		'Childcare',
		'Kids Activities',
		'Toys & Games',
		'Baby Supplies',
		'Kids Clothing'
	],
	'Personal Care': [
		'Hair & Salon',
		'Spa & Massage',
		'Cosmetics',
		'Skincare'
	],
	'Pets': [
		'Pet Food',
		'Vet',
		'Pet Supplies',
		'Pet Grooming'
	],
	'Shopping': [
		'Clothing',
		'Shoes',
		'Accessories',
		'Online Shopping',
		'Department Stores'
	],
	'Subscriptions': [
		'Streaming',
		'Software',
		'News & Magazines',
		'Memberships',
		'Other Subscriptions'
	],
	'Travel & Vacation': [
		'Flights',
		'Hotels',
		'Car Rental',
		'Vacation Packages',
		'Cruises'
	],
	'Utilities': [
		'Electric',
		'Gas',
		'Water',
		'Internet',
		'Phone',
		'Cable & TV',
		'Trash'
	],
	'Uncategorized': []
};

// Default categories (aligned with Rocket Money / Mint standards) - alphabetically sorted
export const CATEGORIES = Object.keys(CATEGORY_HIERARCHY).sort() as readonly string[];

// Flat list of all subcategories with their parent category
export const SUBCATEGORY_MAP: Record<string, string> = Object.entries(CATEGORY_HIERARCHY).reduce(
	(acc, [category, subcategories]) => {
		for (const sub of subcategories) {
			acc[sub] = category;
		}
		return acc;
	},
	{} as Record<string, string>
);

// Get all subcategories for a given category
export function getSubcategories(category: string): string[] {
	return CATEGORY_HIERARCHY[category] || [];
}

// Get parent category for a subcategory
export function getParentCategory(subcategory: string): string | null {
	return SUBCATEGORY_MAP[subcategory] || null;
}

// Format category display (e.g., "Dining & Restaurants › Fast Food")
export function formatCategoryDisplay(category: string | null, subcategory: string | null): string {
	if (!category) return 'Uncategorized';
	if (!subcategory) return category;
	return `${category} › ${subcategory}`;
}

export type Category = string;

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

// ============================================
// Engagement Features Types
// ============================================

// User Source (bank account/card tracking)
export interface UserSource {
	id: string;
	userId: string;
	name: string;
	sourceType: 'bank' | 'credit_card' | 'investment' | 'other';
	institution: string | null;
	lastUploadedAt: string | null;
	uploadReminderDays: number;
	csvMapping: Record<string, unknown> | null;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

// Notification Preferences
export interface NotificationPrefs {
	userId: string;
	// Daily Brief
	dailyBriefEnabled: boolean;
	dailyBriefTime: string; // HH:MM:SS
	dailyBriefTimezone: string;
	dailyBriefLastSent: string | null;
	// Upload Reminders
	uploadReminderEnabled: boolean;
	uploadReminderEmail: boolean;
	// Review Inbox
	reviewInboxEnabled: boolean;
	reviewInboxDailyGoal: number;
	// Weekly Pulse
	weeklyPulseEnabled: boolean;
	weeklyPulseDay: number; // 0-6
	weeklyPulseLastSent: string | null;
	// In-app
	showUploadNudges: boolean;
	showAchievementBadges: boolean;
	createdAt: string;
	updatedAt: string;
}

// Review Inbox Item Types
export type ReviewItemType = 
	| 'uncategorized' 
	| 'rule_suggestion' 
	| 'duplicate_candidate' 
	| 'subscription_candidate' 
	| 'transfer_confirm';

export type ReviewItemStatus = 'pending' | 'completed' | 'dismissed' | 'expired';

// Review Inbox Item
export interface ReviewInboxItem {
	id: string;
	userId: string;
	itemType: ReviewItemType;
	transactionId: string | null;
	rawTransactionId: string | null;
	data: {
		// For uncategorized
		suggestedCategory?: string;
		merchant?: string;
		amount?: number;
		date?: string;
		// For rule_suggestion
		suggestedRule?: {
			matchType: MatchType;
			matchValue: string;
			setCategory?: string;
			setKind?: TransactionKind;
		};
		similarCount?: number;
		// For subscription_candidate
		frequency?: string;
		avgAmount?: number;
		// For transfer_confirm
		possibleTransferTo?: string;
	};
	status: ReviewItemStatus;
	priority: number;
	createdAt: string;
	completedAt: string | null;
	expiresAt: string | null;
}

// User Streaks
export interface UserStreaks {
	userId: string;
	reviewStreakCurrent: number;
	reviewStreakBest: number;
	reviewLastCompletedAt: string | null;
	uploadStreakCurrent: number;
	uploadStreakBest: number;
	uploadLastAt: string | null;
	totalItemsCleared: number;
	updatedAt: string;
}

// Daily Brief Data (for email/dashboard)
export interface DailyBriefData {
	// Spending pace
	currentMonthSpent: number;
	projectedMonthSpend: number;
	budgetTotal: number;
	paceStatus: 'on_track' | 'ahead' | 'behind';
	daysRemaining: number;
	// Insights
	topCategoryThisWeek: { category: string; spent: number } | null;
	unusualSpending: { merchant: string; amount: number; reason: string } | null;
	subscriptionAlert: { merchant: string; amount: number; dueDate: string } | null;
	// Opportunity cost highlight
	opportunityCostHighlight: {
		description: string;
		amount: number;
		futureValue: number;
	} | null;
	// Review inbox
	pendingReviewItems: number;
	// Upload status
	daysSinceLastUpload: number | null;
	sourcesNeedingUpload: string[];
}

// Upload Nudge Data
export interface UploadNudgeData {
	show: boolean;
	daysSinceLastUpload: number | null;
	sourcesNeedingUpload: Array<{
		id: string;
		name: string;
		daysSinceUpload: number;
		uploadReminderDays: number;
	}>;
	message: string;
}

// ============================================
// Subscription Tracking Types
// ============================================

export type SubscriptionStatus = 'active' | 'trial' | 'canceling' | 'canceled' | 'paused';
export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TrackedSubscription {
	id: string;
	userId: string;
	merchantName: string;
	merchantNorm: string;
	amount: number;
	currency: string;
	billingCycle: BillingCycle;
	nextChargeDate: string | null;
	lastChargeDate: string | null;
	status: SubscriptionStatus;
	isEssential: boolean;
	trialEndsAt: string | null;
	cancelRequestedAt: string | null;
	detectedAt: string;
	detectionConfidence: number;
	occurrenceCount: number;
	category: string | null;
	notes: string | null;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface UpcomingCharge {
	subscription: TrackedSubscription;
	daysUntil: number;
	futureValue10yr: number;
	futureValue20yr: number;
}

export interface SubscriptionSummary {
	totalMonthly: number;
	totalYearly: number;
	essentialMonthly: number;
	nonEssentialMonthly: number;
	trialCount: number;
	cancelingCount: number;
	upcomingCharges: UpcomingCharge[];
	potentialSavings10yr: number;
	potentialSavings20yr: number;
}

// ============================================
// Financial Score Types
// ============================================

export type ScoreTrend = 'improving' | 'stable' | 'declining';

export interface FinancialScore {
	userId: string;
	overallScore: number;
	budgetAdherenceScore: number;
	spendingConsistencyScore: number;
	subscriptionHealthScore: number;
	savingsRateScore: number;
	goalProgressScore: number;
	monthlyInvestableDelta: number;
	annualInvestableDelta: number;
	leakScore: number;
	monthlyLeakAmount: number;
	scoreTrend: ScoreTrend;
	scoreChange30d: number;
	lastCalculatedAt: string;
	calculationPeriodStart: string | null;
	calculationPeriodEnd: string | null;
}

export interface ScoreBreakdown {
	score: FinancialScore;
	insights: ScoreInsight[];
	improvements: ScoreImprovement[];
}

export interface ScoreInsight {
	type: 'positive' | 'neutral' | 'negative';
	title: string;
	description: string;
	impact: number; // Points impact on score
}

export interface ScoreImprovement {
	title: string;
	description: string;
	potentialPoints: number;
	difficulty: 'easy' | 'medium' | 'hard';
	category: string;
}

// ============================================
// Suggested Rules Types (Post-Import)
// ============================================

export type SuggestedRuleStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface SuggestedRule {
	id: string;
	userId: string;
	batchId: string | null;
	matchType: MatchType;
	matchValue: string;
	matchField: MatchField;
	suggestedCategory: string | null;
	suggestedKind: TransactionKind | null;
	suggestedExclude: boolean;
	confidence: number;
	affectedCount: number;
	affectedAmount: number;
	sampleMerchants: string[];
	status: SuggestedRuleStatus;
	createdAt: string;
	respondedAt: string | null;
}

// ============================================
// Enhanced Streaks Types
// ============================================

export interface CategoryStreak {
	current: number;
	best: number;
	lastUnderAt: string | null;
}

export interface EnhancedStreaks extends UserStreaks {
	budgetStreakCurrent: number;
	budgetStreakBest: number;
	budgetLastUnderAt: string | null;
	categoryStreaks: Record<string, CategoryStreak>;
	totalTransactionsReviewed: number;
	perfectWeeks: number;
}

export interface StreakDisplay {
	type: 'review' | 'budget' | 'category' | 'upload';
	label: string;
	current: number;
	best: number;
	icon: string;
	color: string;
	sublabel?: string;
}

// ============================================
// Philosophy Presets
// ============================================

export type PhilosophyPreset = 
	| 'comfortable_saver'   // Gentle encouragement, focus on small wins
	| 'aggressive_builder'  // Bold projections, wealth-building focus
	| 'debt_first'          // Prioritizes debt payoff insights
	| 'family_budget';      // Practical, household-oriented messaging

export interface PhilosophyConfig {
	id: PhilosophyPreset;
	name: string;
	description: string;
	icon: string;
	color: string;
	tone: {
		overBudgetMessage: string;
		underBudgetMessage: string;
		savingsMessage: string;
		projectionEmphasis: 'subtle' | 'moderate' | 'bold';
		emoji: boolean;
	};
}

export const PHILOSOPHY_PRESETS: Record<PhilosophyPreset, PhilosophyConfig> = {
	comfortable_saver: {
		id: 'comfortable_saver',
		name: 'Comfortable Saver',
		description: 'Gentle encouragement with focus on sustainable habits',
		icon: 'fa-couch',
		color: '#22c55e',
		tone: {
			overBudgetMessage: "You've gone a bit over — no worries, tomorrow's a fresh start.",
			underBudgetMessage: 'Nice work staying on track!',
			savingsMessage: 'Every little bit counts toward your goals.',
			projectionEmphasis: 'subtle',
			emoji: true
		}
	},
	aggressive_builder: {
		id: 'aggressive_builder',
		name: 'Aggressive Builder',
		description: 'Bold projections and wealth-building focus',
		icon: 'fa-rocket',
		color: '#f59e0b',
		tone: {
			overBudgetMessage: 'This overspend is costing you compound growth. Course correct now.',
			underBudgetMessage: "Crushing it! That's more fuel for your investment engine.",
			savingsMessage: "This money compounds. In 20 years, you'll thank yourself.",
			projectionEmphasis: 'bold',
			emoji: false
		}
	},
	debt_first: {
		id: 'debt_first',
		name: 'Debt First',
		description: 'Prioritizes debt payoff with practical strategies',
		icon: 'fa-link-slash',
		color: '#ef4444',
		tone: {
			overBudgetMessage: 'Extra spending slows your debt payoff timeline.',
			underBudgetMessage: 'Great restraint — put the savings toward your debt!',
			savingsMessage: 'Every dollar saved is a dollar off your debt.',
			projectionEmphasis: 'moderate',
			emoji: false
		}
	},
	family_budget: {
		id: 'family_budget',
		name: 'Family Budget',
		description: 'Practical household-oriented financial guidance',
		icon: 'fa-house-chimney',
		color: '#8b5cf6',
		tone: {
			overBudgetMessage: "The family budget's a bit stretched this month. Let's review together.",
			underBudgetMessage: 'Great job managing the household budget!',
			savingsMessage: "Building security for your family's future.",
			projectionEmphasis: 'moderate',
			emoji: true
		}
	}
};

// ============================================
// Share Reports
// ============================================

export interface ShareReportData {
	id?: string;
	reportType: 'year_projection' | 'category_breakdown' | 'subscription_savings';
	reportYear: number;
	projectionYear: number;
	totalSpent: number;
	projectedFutureValue: number;
	topCategory: string | null;
	topCategorySpent: number | null;
	shareToken?: string;
	createdAt?: string;
}

export interface ShareCardData {
	headline: string;
	subheadline: string;
	spentAmount: number;
	futureValue: number;
	years: number;
	topCategories: Array<{ name: string; spent: number; percentage: number }>;
	philosophy: PhilosophyPreset;
	generatedAt: string;
}