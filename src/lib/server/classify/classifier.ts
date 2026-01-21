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

// Category patterns (aligned with Rocket Money / Mint standards)
const CATEGORY_PATTERNS: Record<string, string[]> = {
	'Auto & Transport': [
		'SHELL',
		'EXXON',
		'CHEVRON',
		'BP',
		'SPEEDWAY',
		'WAWA',
		'SHEETZ',
		'RACETRAC',
		'PILOT',
		'LOVES',
		'UBER',
		'LYFT',
		'GAS',
		'FUEL',
		'PARKING',
		'METRO',
		'TRANSIT',
		'AUTOZONE',
		'OREILLY',
		'ADVANCE AUTO',
		'JIFFY LUBE',
		'VALVOLINE',
		'FIRESTONE',
		'DISCOUNT TIRE',
		'CARWASH',
		'CAR WASH',
		'DMV',
		'TOLL'
	],
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
		'SPROUTS',
		'GIANT',
		'HARRIS TEETER',
		'PIGGLY WIGGLY',
		'WINCO',
		'FOOD MART',
		'GROCERY'
	],
	'Dining & Restaurants': [
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
		'PANERA',
		'FIVE GUYS',
		'IN-N-OUT',
		'SHAKE SHACK',
		'BUFFALO WILD',
		'APPLEBEE',
		'CHILIS',
		'OLIVE GARDEN',
		'RED LOBSTER',
		'OUTBACK',
		'TEXAS ROADHOUSE',
		'CHEESECAKE FACTORY',
		'IHOP',
		'DENNYS',
		'WAFFLE HOUSE',
		'CRACKER BARREL',
		'NOODLES',
		'PANDA EXPRESS',
		'DOMINOS',
		'PIZZA HUT',
		'PAPA JOHN',
		'LITTLE CAESARS',
		'WINGSTOP',
		'JERSEY MIKE',
		'JIMMY JOHN',
		'FIREHOUSE SUBS',
		'POTBELLY',
		'QDOBA',
		'MOE',
		'CAVA',
		'SWEETGREEN',
		'BLAZE PIZZA',
		'SQ *',
		'SQUARE *'
	],
	'Coffee & Drinks': [
		'STARBUCKS',
		'DUNKIN',
		'PEETS',
		'COFFEE',
		'PHILZ',
		'BLUE BOTTLE',
		'DUTCH BROS',
		'CARIBOU',
		'TIM HORTON',
		'SCOOTERS',
		'BLACK RIFLE',
		'INTELLIGENTSIA',
		'LA COLOMBE',
		'BAR',
		'BREWERY',
		'PUB',
		'TAPROOM',
		'WINE',
		'LIQUOR',
		'SPIRITS',
		'BEER',
		'COCKTAIL',
		'TOTAL WINE',
		'BINNYS',
		'ABC STORE'
	],
	'Food Delivery': [
		'DOORDASH',
		'UBER EATS',
		'UBEREATS',
		'GRUBHUB',
		'POSTMATES',
		'SEAMLESS',
		'INSTACART',
		'GOPUFF',
		'CAVIAR',
		'FAVOR',
		'BITE SQUAD',
		'DELIVEROO'
	],
	Shopping: [
		'AMAZON',
		'TARGET',
		'WALMART',
		'NORDSTROM',
		'MACYS',
		'KOHLS',
		'TJ MAXX',
		'TJMAXX',
		'MARSHALLS',
		'ROSS',
		'BURLINGTON',
		'OLD NAVY',
		'GAP',
		'ZARA',
		'H&M',
		'UNIQLO',
		'NIKE',
		'ADIDAS',
		'FOOTLOCKER',
		'DICKS SPORTING',
		'REI',
		'ACADEMY',
		'BED BATH',
		'POTTERY BARN',
		'CRATE BARREL',
		'WILLIAMS SONOMA',
		'PIER 1',
		'WORLD MARKET',
		'CONTAINER STORE',
		'IKEA',
		'WAYFAIR',
		'OVERSTOCK',
		'ETSY'
	],
	'Home & Garden': [
		'LOWES',
		'HOME DEPOT',
		'MENARDS',
		'ACE HARDWARE',
		'TRUE VALUE',
		'HARBOR FREIGHT',
		'TRACTOR SUPPLY',
		'NURSERY',
		'GARDEN CENTER',
		'LANDSCAP',
		'LAWN',
		'TREE SERVICE',
		'PEST CONTROL',
		'ORKIN',
		'TERMINIX',
		'SHERWIN WILLIAMS',
		'BENJAMIN MOORE',
		'FLOOR DECOR',
		'LUMBER',
		'PLUMBING',
		'ELECTRICAL SUPPLY',
		'POOL SUPPLY'
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
		'AUDIBLE',
		'PARAMOUNT',
		'PEACOCK',
		'DISCOVERY',
		'ESPN',
		'SLING',
		'FUBO',
		'ADOBE',
		'MICROSOFT',
		'DROPBOX',
		'GOOGLE STORAGE',
		'ICLOUD',
		'LINKEDIN',
		'PATREON',
		'SUBSTACK',
		'MEDIUM',
		'NEW YORK TIMES',
		'WSJ',
		'WASHINGTON POST',
		'ATHLETIC',
		'CALM',
		'HEADSPACE',
		'MASTERCLASS',
		'SKILLSHARE',
		'COURSERA',
		'DUOLINGO'
	],
	'Travel & Vacation': [
		'AIRBNB',
		'VRBO',
		'MARRIOTT',
		'HILTON',
		'HYATT',
		'IHG',
		'HOLIDAY INN',
		'BEST WESTERN',
		'WYNDHAM',
		'DELTA',
		'UNITED',
		'AMERICAN AIR',
		'SOUTHWEST',
		'JETBLUE',
		'SPIRIT',
		'FRONTIER',
		'ALASKA AIR',
		'HOTEL',
		'FLIGHT',
		'AIRLINE',
		'EXPEDIA',
		'BOOKING.COM',
		'PRICELINE',
		'KAYAK',
		'HOTWIRE',
		'ORBITZ',
		'TRAVELOCITY',
		'TRIP',
		'CRUISE',
		'CARNIVAL',
		'ROYAL CARIBBEAN',
		'NORWEGIAN',
		'RENTAL CAR',
		'HERTZ',
		'ENTERPRISE',
		'NATIONAL',
		'AVIS',
		'BUDGET'
	],
	Entertainment: [
		'MOVIE',
		'CINEMA',
		'THEATER',
		'CONCERT',
		'TICKETMASTER',
		'AMC',
		'REGAL',
		'CINEMARK',
		'FANDANGO',
		'STUB HUB',
		'VIVID SEATS',
		'SEAT GEEK',
		'LIVE NATION',
		'AXS',
		'EVENTBRITE',
		'MUSEUM',
		'ZOO',
		'AQUARIUM',
		'THEME PARK',
		'DISNEY PARK',
		'UNIVERSAL',
		'SIX FLAGS',
		'CEDAR FAIR',
		'BOWLING',
		'ARCADE',
		'GOLF',
		'TOPGOLF',
		'MINI GOLF',
		'ESCAPE ROOM',
		'TRAMPOLINE',
		'LASER TAG',
		'GO KART',
		'STEAM',
		'PLAYSTATION',
		'XBOX',
		'NINTENDO',
		'EPIC GAMES',
		'TWITCH'
	],
	'Healthcare & Medical': [
		'PHARMACY',
		'CVS',
		'WALGREENS',
		'RITE AID',
		'HOSPITAL',
		'DOCTOR',
		'MEDICAL',
		'DENTAL',
		'DENTIST',
		'OPTOMETRIST',
		'VISION',
		'EYECARE',
		'URGENT CARE',
		'CLINIC',
		'LABCORP',
		'QUEST DIAG',
		'KAISER',
		'BLUE CROSS',
		'AETNA',
		'CIGNA',
		'UNITED HEALTH',
		'HUMANA',
		'THERAPY',
		'COUNSELING',
		'CHIROPRACT',
		'DERMATOLOG',
		'ORTHOPED'
	],
	Utilities: [
		'ELECTRIC',
		'GAS BILL',
		'WATER BILL',
		'INTERNET',
		'COMCAST',
		'XFINITY',
		'ATT',
		'AT&T',
		'VERIZON',
		'TMOBILE',
		'T-MOBILE',
		'SPRINT',
		'SPECTRUM',
		'COX',
		'CENTURY LINK',
		'FRONTIER',
		'DISH',
		'DIRECTV',
		'DUKE ENERGY',
		'DOMINION',
		'PG&E',
		'CONEDISON',
		'PSEG',
		'FPL',
		'XCEL',
		'TRASH',
		'WASTE',
		'SEWER',
		'CABLE'
	],
	'Housing & Rent': [
		'RENT',
		'LEASE',
		'MORTGAGE',
		'HOA',
		'PROPERTY MANAGEMENT',
		'APARTMENT',
		'REALTOR',
		'REAL ESTATE',
		'ZILLOW',
		'TRULIA',
		'REDFIN',
		'APARTMENTS.COM',
		'ZUMPER',
		'COZY',
		'AVAIL'
	],
	'Personal Care': [
		'SALON',
		'BARBER',
		'HAIRCUT',
		'SPA',
		'MASSAGE',
		'NAIL',
		'MANICURE',
		'PEDICURE',
		'WAXING',
		'ULTA',
		'SEPHORA',
		'BATH BODY',
		'LUSH',
		'AVEDA',
		'GREAT CLIPS',
		'SUPERCUTS',
		'SPORTS CLIPS',
		'DRYBAR',
		'BEAUTY',
		'COSMETIC'
	],
	'Fitness & Gym': [
		'GYM',
		'FITNESS',
		'PLANET FITNESS',
		'LA FITNESS',
		'ANYTIME FITNESS',
		'EQUINOX',
		'ORANGETHEORY',
		'CROSSFIT',
		'F45',
		'PELOTON',
		'SOULCYCLE',
		'BARRY',
		'PURE BARRE',
		'YOGA',
		'PILATES',
		'YMCA',
		'GOLD GYM',
		'24 HOUR',
		'CRUNCH',
		'LIFETIME FITNESS'
	],
	Pets: [
		'PETCO',
		'PETSMART',
		'PET SUPPLIES',
		'CHEWY',
		'BARKBOX',
		'VET',
		'VETERINAR',
		'ANIMAL HOSPITAL',
		'BANFIELD',
		'VCA',
		'GROOMING',
		'DOG WALK',
		'PET SIT',
		'ROVER',
		'WAG',
		'DOGGY',
		'KENNEL',
		'BOARDING'
	],
	Insurance: [
		'GEICO',
		'STATE FARM',
		'ALLSTATE',
		'PROGRESSIVE',
		'LIBERTY MUTUAL',
		'FARMERS',
		'USAA',
		'NATIONWIDE',
		'TRAVELERS',
		'METLIFE',
		'PRUDENTIAL',
		'INSURANCE',
		'INSUR',
		'POLICY',
		'PREMIUM'
	],
	Education: [
		'TUITION',
		'UNIVERSITY',
		'COLLEGE',
		'SCHOOL',
		'ACADEMY',
		'STUDENT',
		'TEXTBOOK',
		'CHEGG',
		'BARTLEBY',
		'PEARSON',
		'MCGRAW',
		'CENGAGE',
		'TUTORING',
		'KUMON',
		'MATHNASIUM',
		'SYLVAN',
		'KAPLAN',
		'PRINCETON REVIEW',
		'SAT',
		'ACT',
		'GRE',
		'LSAT',
		'MCAT'
	],
	'Gifts & Donations': [
		'GIFT',
		'CHARITY',
		'DONATE',
		'DONATION',
		'NONPROFIT',
		'FOUNDATION',
		'RED CROSS',
		'UNITED WAY',
		'SALVATION ARMY',
		'GOODWILL',
		'GOFUNDME',
		'KICKSTARTER',
		'INDIEGOGO',
		'PATREON',
		'HALLMARK',
		'1800FLOWERS',
		'FTD',
		'PROFLOWERS',
		'EDIBLE'
	],
	'Kids & Family': [
		'DAYCARE',
		'CHILDCARE',
		'PRESCHOOL',
		'BABYSIT',
		'CARE.COM',
		'SITTERCITY',
		'BRIGHT HORIZONS',
		'KINDERCARE',
		'TOY',
		'TOYS R US',
		'LEGO',
		'DISNEY STORE',
		'BUILD A BEAR',
		'FIVE BELOW',
		'CLAIRE',
		'PARTY CITY',
		'SPIRIT HALLOWEEN',
		'GYMBOREE',
		'CARTERS',
		'OSH KOSH',
		'KIDS',
		'CHILDRENS',
		'BABY',
		'BABIES R US',
		'BUY BUY BABY'
	],
	Electronics: [
		'BEST BUY',
		'APPLE STORE',
		'MICROSOFT STORE',
		'B&H PHOTO',
		'MICRO CENTER',
		'NEWEGG',
		'GAMESTOP',
		'RADIOSHACK',
		'FRYS',
		'ELECTRONIC',
		'COMPUTER',
		'LAPTOP',
		'PHONE',
		'MOBILE',
		'CELLULAR',
		'TECH',
		'GEEK SQUAD'
	]
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
