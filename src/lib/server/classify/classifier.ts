import type { TransactionKind, MerchantRule } from '$lib/types';
import type { ParsedRow } from '../csv/parse';

export interface ClassificationResult {
	kind: TransactionKind;
	kindReason: string | null;
	includedInSpend: boolean;
	category: string | null;
}

// Pattern definitions for system heuristics
const TRANSFER_PATTERNS = [
	'TRANSFER',
	'XFER',
	'TO SAVINGS',
	'TO CHECKING',
	'INTERNAL TRANSFER',
	'VENMO CASHOUT',
	'VENMO *CASHOUT',
	'CASH APP CASH OUT',
	'PAYPAL TRANSFER',
	'ZELLE TRANSFER',
	'APPLE CASH TRANSFER',
	'BROKERAGE TRANSFER'
];

const CC_PAYMENT_PATTERNS = [
	'AUTOPAY',
	'AUTO PAY',
	'CREDIT CARD PAYMENT',
	'CARD PAYMENT',
	'PAYMENT THANK YOU',
	'THANK YOU PAYMENT',
	'ONLINE PAYMENT.*CHASE',
	'ONLINE PAYMENT.*AMEX',
	'ONLINE PAYMENT.*CITI',
	'ONLINE PAYMENT.*CAPITAL ONE',
	'ONLINE PAYMENT.*DISCOVER',
	'BILL PAY.*CHASE',
	'BILL PAY.*AMEX',
	'BILL PAY.*CITI'
];

const CASH_WITHDRAWAL_PATTERNS = ['ATM', 'CASH WITHDRAWAL', 'WITHDRAWAL', 'CASH ADVANCE'];

const REFUND_PATTERNS = ['REFUND', 'RETURN', 'REVERSAL', 'CHARGEBACK', 'REVERSAL OF', '*REFUND', 'CREDIT', 'CR ADJ', 'ADJUSTMENT CR', 'REBATE'];

const FEE_INTEREST_PATTERNS = [
	'FEE',
	'MONTHLY SERVICE',
	'MAINTENANCE FEE',
	'INTEREST CHARGE',
	'FINANCE CHARGE',
	'LATE FEE',
	'OVERDRAFT'
];

const INCOME_PATTERNS = [
	'PAYROLL',
	'DIRECT DEP',
	'DIRECT DEPOSIT',
	'ADP PAYROLL',
	'PAYCHEX',
	'GUSTO',
	'TAX REFUND',
	'IRS TREAS'
];

// Category patterns
const CATEGORY_PATTERNS: Record<string, string[]> = {
	Groceries: [
		'KROGER',
		'SAFEWAY',
		'ALDI',
		'TRADER JOE',
		'WHOLE FOODS',
		'GIANT EAGLE',
		'PUBLIX',
		'WEGMANS',
		'COSTCO',
		'SAMS CLUB',
		'HEB',
		'FOOD LION',
		'STOP SHOP',
		'SPROUTS'
	],
	Dining: [
		'RESTAURANT',
		'GRILL',
		'TAVERN',
		'DINER',
		'CAFE',
		'BISTRO',
		'KITCHEN',
		'EATERY',
		'CHIPOTLE',
		'MCDONALDS',
		'BURGER KING',
		'WENDYS',
		'TACO BELL',
		'CHICK-FIL-A',
		'SUBWAY',
		'PANERA'
	],
	Coffee: ['STARBUCKS', 'DUNKIN', 'PEETS', 'COFFEE', 'PHILZ', 'BLUE BOTTLE'],
	Delivery: ['DOORDASH', 'UBER EATS', 'GRUBHUB', 'POSTMATES', 'SEAMLESS', 'INSTACART'],
	Shopping: ['AMAZON', 'TARGET', 'WALMART', 'BEST BUY', 'APPLE STORE', 'NORDSTROM', 'MACYS', 'KOHLS'],
	'Gas/Transport': [
		'SHELL',
		'EXXON',
		'CHEVRON',
		'BP',
		'UBER',
		'LYFT',
		'GAS',
		'FUEL',
		'PARKING',
		'METRO',
		'TRANSIT'
	],
	Subscriptions: [
		'NETFLIX',
		'SPOTIFY',
		'HULU',
		'DISNEY',
		'APPLE.COM/BILL',
		'AMAZON PRIME',
		'HBO',
		'YOUTUBE',
		'AUDIBLE'
	],
	Travel: [
		'AIRBNB',
		'MARRIOTT',
		'HILTON',
		'DELTA',
		'UNITED',
		'AMERICAN AIR',
		'SOUTHWEST',
		'HOTEL',
		'FLIGHT',
		'AIRLINE'
	],
	Entertainment: ['MOVIE', 'CINEMA', 'THEATER', 'CONCERT', 'TICKETMASTER', 'AMC', 'REGAL'],
	Healthcare: [
		'PHARMACY',
		'CVS',
		'WALGREENS',
		'HOSPITAL',
		'DOCTOR',
		'MEDICAL',
		'DENTAL',
		'OPTOMETRIST'
	],
	Utilities: ['ELECTRIC', 'GAS BILL', 'WATER BILL', 'INTERNET', 'COMCAST', 'ATT', 'VERIZON', 'TMOBILE']
};

function matchesAnyPattern(text: string | null, patterns: string[]): boolean {
	if (!text) return false;
	const upper = text.toUpperCase();
	return patterns.some((p) => {
		if (p.includes('.*')) {
			// Treat as regex
			try {
				return new RegExp(p, 'i').test(upper);
			} catch {
				return false;
			}
		}
		return upper.includes(p.toUpperCase());
	});
}

function determineCategory(merchantNorm: string | null, descriptionRaw: string | null): string | null {
	const searchText = merchantNorm || descriptionRaw || '';
	if (!searchText) return null;

	for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
		if (matchesAnyPattern(searchText, patterns)) {
			return category;
		}
	}

	return null;
}

function applyMerchantRules(
	row: ParsedRow,
	rules: MerchantRule[]
): Partial<ClassificationResult> | null {
	if (rules.length === 0) return null;

	// Sort by priority (lower = higher priority)
	const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

	for (const rule of sortedRules) {
		if (!rule.enabled) continue;

		const fieldValue =
			rule.matchField === 'merchant_norm' ? row.merchantNorm : row.descriptionRaw;

		if (!fieldValue) continue;

		let matches = false;

		switch (rule.matchType) {
			case 'contains':
				matches = fieldValue.toUpperCase().includes(rule.matchValue.toUpperCase());
				break;
			case 'equals':
				matches = fieldValue.toUpperCase() === rule.matchValue.toUpperCase();
				break;
			case 'regex':
				try {
					matches = new RegExp(rule.matchValue, 'i').test(fieldValue);
				} catch {
					matches = false;
				}
				break;
		}

		if (matches) {
			const result: Partial<ClassificationResult> = {};

			if (rule.actionExclude) {
				result.includedInSpend = false;
			}

			if (rule.setKind) {
				result.kind = rule.setKind;
				result.kindReason = `Rule: ${rule.matchValue}`;
			}

			if (rule.setCategory) {
				result.category = rule.setCategory;
			}

			return result;
		}
	}

	return null;
}

export function classifyTransaction(
	row: ParsedRow,
	rules: MerchantRule[] = []
): ClassificationResult {
	// Default result
	const result: ClassificationResult = {
		kind: 'unknown',
		kindReason: null,
		includedInSpend: false,
		category: null
	};

	// 1. If parse error, return unknown
	if (row.parseStatus === 'error') {
		result.kindReason = 'Parse error';
		return result;
	}

	const merchantNorm = row.merchantNorm;
	const descriptionRaw = row.descriptionRaw;
	const amount = row.amountSigned;

	// 2. Apply merchant rules first
	const ruleResult = applyMerchantRules(row, rules);
	if (ruleResult) {
		return { ...result, ...ruleResult };
	}

	// 3. System heuristics

	// Transfer
	if (matchesAnyPattern(merchantNorm, TRANSFER_PATTERNS) || matchesAnyPattern(descriptionRaw, TRANSFER_PATTERNS)) {
		result.kind = 'transfer';
		result.kindReason = 'Transfer detected';
		result.includedInSpend = false;
		return result;
	}

	// CC Payment
	if (matchesAnyPattern(merchantNorm, CC_PAYMENT_PATTERNS) || matchesAnyPattern(descriptionRaw, CC_PAYMENT_PATTERNS)) {
		result.kind = 'cc_payment';
		result.kindReason = 'Credit card payment';
		result.includedInSpend = false;
		return result;
	}

	// Cash withdrawal
	if (matchesAnyPattern(merchantNorm, CASH_WITHDRAWAL_PATTERNS) || matchesAnyPattern(descriptionRaw, CASH_WITHDRAWAL_PATTERNS)) {
		result.kind = 'cash_withdrawal';
		result.kindReason = 'Cash withdrawal';
		result.includedInSpend = false;
		return result;
	}

	// Refund (positive amount + refund keywords)
	if (
		amount !== null &&
		amount > 0 &&
		(matchesAnyPattern(merchantNorm, REFUND_PATTERNS) || matchesAnyPattern(descriptionRaw, REFUND_PATTERNS))
	) {
		result.kind = 'refund';
		result.kindReason = 'Refund detected';
		result.includedInSpend = false;
		return result;
	}

	// Fee/Interest
	if (matchesAnyPattern(merchantNorm, FEE_INTEREST_PATTERNS) || matchesAnyPattern(descriptionRaw, FEE_INTEREST_PATTERNS)) {
		result.kind = 'fee_interest';
		result.kindReason = 'Fee or interest charge';
		result.includedInSpend = false;
		return result;
	}

	// Income (positive amount + income keywords)
	if (
		amount !== null &&
		amount > 0 &&
		(matchesAnyPattern(merchantNorm, INCOME_PATTERNS) || matchesAnyPattern(descriptionRaw, INCOME_PATTERNS))
	) {
		result.kind = 'income';
		result.kindReason = 'Income detected';
		result.includedInSpend = false;
		return result;
	}

	// Purchase (negative amount, nothing else matched)
	if (amount !== null && amount < 0) {
		result.kind = 'purchase';
		result.kindReason = 'Purchase';
		result.includedInSpend = true;
		result.category = determineCategory(merchantNorm, descriptionRaw) || 'Uncategorized';
		return result;
	}

	// Unknown - needs review
	result.kind = 'unknown';
	result.kindReason = 'Unable to classify';
	result.includedInSpend = false;
	return result;
}

// Classify all rows in a batch
export function classifyBatch(rows: ParsedRow[], rules: MerchantRule[] = []): ClassificationResult[] {
	return rows.map((row) => classifyTransaction(row, rules));
}

// Find potential refund pairs (same merchant, same amount, different dates)
export interface RefundPair {
	purchaseIndex: number;
	refundIndex: number;
	merchant: string;
	amount: number;
}

export function findPotentialRefundPairs(rows: ParsedRow[]): RefundPair[] {
	const pairs: RefundPair[] = [];
	const matched = new Set<number>();
	
	for (let i = 0; i < rows.length; i++) {
		if (matched.has(i)) continue;
		const row1 = rows[i];
		if (!row1.merchantNorm || row1.amountSigned === null) continue;
		
		// Look for a matching pair
		for (let j = i + 1; j < rows.length; j++) {
			if (matched.has(j)) continue;
			const row2 = rows[j];
			if (!row2.merchantNorm || row2.amountSigned === null) continue;
			
			// Same merchant, opposite signs, same absolute amount
			const sameAmount = Math.abs(Math.abs(row1.amountSigned) - Math.abs(row2.amountSigned)) < 0.01;
			const sameMerchant = row1.merchantNorm === row2.merchantNorm;
			const oppositeSign = (row1.amountSigned > 0 && row2.amountSigned < 0) || 
			                     (row1.amountSigned < 0 && row2.amountSigned > 0);
			
			if (sameMerchant && sameAmount && oppositeSign) {
				// Determine which is purchase and which is refund
				const purchaseIdx = row1.amountSigned < 0 ? i : j;
				const refundIdx = row1.amountSigned < 0 ? j : i;
				
				pairs.push({
					purchaseIndex: purchaseIdx,
					refundIndex: refundIdx,
					merchant: row1.merchantNorm,
					amount: Math.abs(row1.amountSigned)
				});
				
				matched.add(i);
				matched.add(j);
				break;
			}
		}
	}
	
	return pairs;
}
