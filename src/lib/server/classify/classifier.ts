import type { TransactionKind, MerchantRule } from '$lib/types';
import type { ParsedRow } from '../csv/parse';

export interface ClassificationResult {
	kind: TransactionKind;
	kindReason: string | null;
	includedInSpend: boolean;
	category: string | null;
	subcategory: string | null;
}

/**
 * Normalize merchant names by stripping store numbers, location codes, and other noise.
 * This allows "LOWES #3228" and "LOWES #3229" to both match "LOWES".
 */
export function normalizeMerchantName(merchant: string | null): string | null {
	if (!merchant) return null;
	
	let normalized = merchant.toUpperCase().trim();
	
	// Remove common suffixes and patterns
	normalized = normalized
		// Remove store/location numbers: "LOWES #3228" -> "LOWES", "ARBYS 1858" -> "ARBYS"
		.replace(/\s*#\d+\s*/g, ' ')
		.replace(/\s+\d{3,}\s*/g, ' ')
		// Remove trailing digits after merchant name
		.replace(/\s+\d+$/g, '')
		// Remove location codes like "0363403703"
		.replace(/\s*\d{8,}\s*/g, ' ')
		// Remove city/state suffixes: "WALMART SUPERCENTER HOUSTON TX" -> keep just merchant
		.replace(/\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$/g, '')
		// Remove common suffixes
		.replace(/\s+(INC|LLC|CORP|CO|LTD|STORE|STORES)\.?$/g, '')
		// Remove extra whitespace
		.replace(/\s+/g, ' ')
		.trim();
	
	return normalized || null;
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
// Extensively expanded with common merchant name variations
const CATEGORY_PATTERNS: Record<string, string[]> = {
	'Auto & Transport': [
		// Gas Stations - Major Chains
		'SHELL',
		'EXXON',
		'EXXONMOBIL',
		'MOBIL',
		'CHEVRON',
		'TEXACO',
		'BP',
		'AMOCO',
		'SUNOCO',
		'MARATHON',
		'MARATHON PETRO',
		'SPEEDWAY',
		'CIRCLE K',
		'WAWA',
		'SHEETZ',
		'RACETRAC',
		'RACETRACK',
		'RACEWAY',
		'PILOT',
		'FLYING J',
		'LOVES',
		"LOVE'S",
		'KWIK TRIP',
		'KWICK',
		'KWIKTRIP',
		'QT',
		'QUIKTRIP',
		'QUICK TRIP',
		'CASEY',
		"CASEY'S",
		'CASEYS',
		'MURPHY USA',
		'MURPHYUSA',
		'MURPHY EXPRESS',
		'SAMS CLUB FUEL',
		'SAM\'S CLUB GAS',
		'COSTCO GAS',
		'COSTCO FUEL',
		'BJS GAS',
		'KROGER FUEL',
		'GIANT EAGLE GAS',
		'GETGO',
		'GET GO',
		'MAVERIK',
		'MAVERICK',
		'KUMS',
		'KUM & GO',
		'HOLIDAY STATION',
		'CENEX',
		'SINCLAIR',
		'CITGO',
		'VALERO',
		'PHILLIPS 66',
		'CONOCO',
		'76 GAS',
		'ARCO',
		'ATLANTIC',
		'GULF',
		'HESS',
		'LUKOIL',
		'MAPCO',
		'STEWARTS',
		"STEWART'S",
		'TA TRAVEL',
		'PETRO STOPPING',
		'LOVES TRAVEL',
		'THORNTONS',
		'THORNTON',
		'STRIPES',
		'GATE PETROLEUM',
		'FUEL',
		'GAS STATION',
		'PETRO',
		'PETROLEUM',
		// Ride Share & Transit
		'UBER',
		'LYFT',
		'PARKING',
		'PARK MOBILE',
		'PARKMOBILE',
		'SPOTHERO',
		'METRO',
		'TRANSIT',
		'SUBWAY FARE',
		'TOLL',
		'EZPASS',
		'E-ZPASS',
		'FASTRAK',
		'SUNPASS',
		// Auto Parts & Service
		'AUTOZONE',
		'AUTO ZONE',
		'OREILLY',
		"O'REILLY",
		'ADVANCE AUTO',
		'NAPA AUTO',
		'PEPBOYS',
		'PEP BOYS',
		'JIFFY LUBE',
		'VALVOLINE',
		'FIRESTONE',
		'GOODYEAR',
		'DISCOUNT TIRE',
		'AMERICAS TIRE',
		'TIRE KINGDOM',
		'TIRES PLUS',
		'NTB',
		'MIDAS',
		'MAACO',
		'MEINEKE',
		'PENSKE',
		'CARWASH',
		'CAR WASH',
		'DMV',
		'UHAUL',
		'U-HAUL'
	],
	Groceries: [
		// Major Chains
		'KROGER',
		'SAFEWAY',
		'ALBERTSONS',
		'ALDI',
		'LIDL',
		'TRADER JOE',
		"TRADER JOE'S",
		'WHOLE FOODS',
		'GIANT EAGLE',
		'PUBLIX',
		'WEGMANS',
		'COSTCO',
		'SAMS CLUB',
		"SAM'S CLUB",
		'BJS WHOLESALE',
		"BJ'S WHOLESALE",
		'HEB',
		'H-E-B',
		'FOOD LION',
		'STOP SHOP',
		'STOP & SHOP',
		'SPROUTS',
		'GIANT',
		'HARRIS TEETER',
		'PIGGLY WIGGLY',
		'WINCO',
		'FOOD MART',
		'GROCERY',
		'MARKET BASKET',
		'FOOD 4 LESS',
		'FOOD4LESS',
		'SAVE A LOT',
		'SAVE-A-LOT',
		'PRICE CHOPPER',
		'SHOPRITE',
		'SHOP RITE',
		'ACME MARKET',
		'ACME SUPER',
		'JEWEL OSCO',
		'JEWEL-OSCO',
		'VONS',
		'RALPHS',
		'SMITHS',
		"SMITH'S",
		'FRY',
		"FRY'S",
		'DILLONS',
		'KING SOOPERS',
		'MEIJER',
		'SCHNUCKS',
		'HY-VEE',
		'HYVEE',
		'FAREWAY',
		'CUB FOODS',
		'STATER BROS',
		'WINN DIXIE',
		'WINN-DIXIE',
		'INGLES',
		'BI-LO',
		'BILO',
		'HARVEYS SUPER',
		'LUCKY SUPERMARKET',
		'RANCH MARKET',
		'CARDENAS',
		'FIESTA MART',
		'NORTHGATE',
		'99 RANCH',
		'H MART',
		'HMART',
		'ASIAN MARKET',
		'SUPERMERCADO',
		'GROCERY OUTLET',
		'FRESH THYME',
		'FRESH MARKET',
		'EARTH FARE',
		'NATURAL GROCERS',
		// Convenience/Small Grocery
		'7-ELEVEN',
		'7 ELEVEN',
		'711',
		'SEVEN ELEVEN'
	],
	'Dining & Restaurants': [
		// Generic terms
		'RESTAURANT',
		'GRILL',
		'TAVERN',
		'DINER',
		'CAFE',
		'BISTRO',
		'KITCHEN',
		'EATERY',
		'STEAKHOUSE',
		'PIZZERIA',
		'TRATTORIA',
		'CANTINA',
		// Fast Food - Burgers
		'MCDONALDS',
		"MCDONALD'S",
		'MCD',
		'BURGER KING',
		'WENDYS',
		"WENDY'S",
		'FIVE GUYS',
		'IN-N-OUT',
		'IN N OUT',
		'SHAKE SHACK',
		'WHATABURGER',
		'WHAT A BURGER',
		'CULVERS',
		"CULVER'S",
		'STEAK N SHAKE',
		'STEAK AND SHAKE',
		'CHECKERS',
		'RALLYS',
		"RALLY'S",
		'HARDEES',
		"HARDEE'S",
		'CARLS JR',
		"CARL'S JR",
		'SMASHBURGER',
		'FATBURGER',
		'HABIT BURGER',
		'WHITE CASTLE',
		'FREDDY',
		'FUDDRUCKERS',
		// Fast Food - Chicken
		'CHICK-FIL-A',
		'CHICK FIL A',
		'CHICKFILA',
		'CFA',
		'RAISING CANE',
		"RAISING CANE'S",
		'CANES',
		'POPEYES',
		"POPEYE'S",
		'KFC',
		'KENTUCKY FRIED',
		'CHURCHS CHICKEN',
		"CHURCH'S",
		'BOJANGLES',
		'ZAXBYS',
		"ZAXBY'S",
		'WINGSTOP',
		'WING STOP',
		'BUFFALO WILD',
		'BWW',
		'HOOTERS',
		'SLIM CHICKENS',
		'PDQ',
		'GOLDEN CHICK',
		// Fast Food - Mexican
		'CHIPOTLE',
		'TACO BELL',
		'QDOBA',
		'MOE',
		"MOE'S",
		'DEL TACO',
		'TACO CABANA',
		'TACO BUENO',
		'TACO JOHN',
		'EL POLLO LOCO',
		'CHRONIC TACOS',
		'TIJUANA FLATS',
		'BAJA FRESH',
		// Fast Food - Sandwiches & Subs
		'SUBWAY',
		'JERSEY MIKE',
		"JERSEY MIKE'S",
		'JIMMY JOHN',
		"JIMMY JOHN'S",
		'FIREHOUSE SUBS',
		'POTBELLY',
		'PENN STATION',
		'QUIZNOS',
		'WHICH WICH',
		'SCHLOTZSKY',
		'MCALISTER',
		"MCALISTER'S",
		'JASON DELI',
		"JASON'S DELI",
		// Fast Food - Pizza
		'DOMINOS',
		"DOMINO'S",
		'PIZZA HUT',
		'PAPA JOHN',
		"PAPA JOHN'S",
		'LITTLE CAESARS',
		'PAPA MURPHY',
		"PAPA MURPHY'S",
		'MARCOS PIZZA',
		"MARCO'S",
		'JETS PIZZA',
		"JET'S PIZZA",
		'HUNGRY HOWIES',
		'CICIS',
		"CICI'S",
		'ROUND TABLE',
		'MOD PIZZA',
		'BLAZE PIZZA',
		'PIEOLOGY',
		'DONATOS',
		// Fast Food - Other
		'ARBYS',
		"ARBY'S",
		'SONIC',
		'SONIC DRIVE',
		'LONG JOHN SILVER',
		'CAPTAIN D',
		'PANDA EXPRESS',
		'NOODLES',
		'NOODLES AND CO',
		'CAVA',
		'SWEETGREEN',
		'JUST SALAD',
		'CHOPT',
		'TROPICAL SMOOTHIE',
		'SMOOTHIE KING',
		'JAMBA',
		'JAMBA JUICE',
		'PLANET SMOOTHIE',
		'AUNTIE ANNE',
		"AUNTIE ANNE'S",
		'CINNABON',
		'WETZEL',
		"WETZEL'S",
		'WOK BOX',
		'POKE',
		// Fast Casual / Casual Dining
		'PANERA',
		'CHILIS',
		"CHILI'S",
		'APPLEBEE',
		"APPLEBEE'S",
		'TGI FRIDAY',
		'TGIF',
		'FRIDAYS',
		'OLIVE GARDEN',
		'RED LOBSTER',
		'OUTBACK',
		'TEXAS ROADHOUSE',
		'LONGHORN',
		'CHEESECAKE FACTORY',
		'P.F. CHANG',
		'PF CHANG',
		'RED ROBIN',
		'RUBY TUESDAY',
		'GOLDEN CORRAL',
		'DENNYS',
		"DENNY'S",
		'IHOP',
		'WAFFLE HOUSE',
		'CRACKER BARREL',
		'BOB EVANS',
		'PERKINS',
		'BJS RESTAURANT',
		"BJ'S RESTAURANT",
		'YARD HOUSE',
		'CHEVY',
		'CHEDDAR',
		"CHEDDAR'S",
		'CARRABBA',
		"CARRABBA'S",
		'MAGGIANO',
		"MAGGIANO'S",
		'BONEFISH',
		'BAHAMA BREEZE',
		'SEASONS 52',
		'BENIHANA',
		'BUCA DI BEPPO',
		'CALIFORNIA PIZZA',
		'CPK',
		'HARD ROCK CAFE',
		'DAVE AND BUSTER',
		'DAVE & BUSTER',
		'MAIN EVENT',
		// Square/Toast POS
		'SQ *',
		'SQUARE *',
		'TST*',
		'TOAST*'
	],
	'Coffee & Drinks': [
		// Coffee Shops
		'STARBUCKS',
		'DUNKIN',
		"DUNKIN'",
		'DUNKIN DONUTS',
		'PEETS',
		"PEET'S",
		'COFFEE',
		'PHILZ',
		'BLUE BOTTLE',
		'DUTCH BROS',
		'CARIBOU',
		'TIM HORTON',
		"TIM HORTON'S",
		'SCOOTERS',
		"SCOOTER'S",
		'BLACK RIFLE',
		'INTELLIGENTSIA',
		'LA COLOMBE',
		'GREGORYS',
		"GREGORY'S",
		'BIGGBY',
		'KRISPY KREME',
		'EINSTEIN BROS',
		'BRUEGGERS',
		"BRUEGGER'S",
		// Bars & Alcohol
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
		"BINNY'S",
		'ABC STORE',
		'ABC LIQUOR',
		'BEVMO',
		'SPEC\'S',
		'SPECS',
		'GOODY GOODY',
		'TWIN LIQUOR'
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

// Subcategory patterns - maps to {category, subcategory}
// Checked first for more specific classification
const SUBCATEGORY_PATTERNS: Array<{ patterns: string[]; category: string; subcategory: string }> = [
	// Auto & Transport subcategories
	{ patterns: ['SHELL', 'EXXON', 'CHEVRON', 'BP', 'SUNOCO', 'MARATHON', 'SPEEDWAY', 'CIRCLE K', 'WAWA', 'SHEETZ', 'RACETRAC', 'PILOT', 'FLYING J', 'LOVES', 'KWIK TRIP', 'QT', 'QUIKTRIP', 'CASEY', 'MURPHY USA', 'COSTCO GAS', 'CITGO', 'VALERO', 'PHILLIPS 66', 'CONOCO', 'ARCO', 'GULF', 'FUEL', 'GAS STATION', 'PETRO'], category: 'Auto & Transport', subcategory: 'Gas & Fuel' },
	{ patterns: ['PARKING', 'PARK MOBILE', 'PARKMOBILE', 'SPOTHERO'], category: 'Auto & Transport', subcategory: 'Parking' },
	{ patterns: ['UBER', 'LYFT'], category: 'Auto & Transport', subcategory: 'Ride Share' },
	{ patterns: ['METRO', 'TRANSIT', 'SUBWAY FARE'], category: 'Auto & Transport', subcategory: 'Public Transit' },
	{ patterns: ['TOLL', 'EZPASS', 'E-ZPASS', 'FASTRAK', 'SUNPASS'], category: 'Auto & Transport', subcategory: 'Tolls' },
	{ patterns: ['AUTOZONE', 'OREILLY', 'ADVANCE AUTO', 'NAPA AUTO', 'PEPBOYS', 'JIFFY LUBE', 'VALVOLINE', 'FIRESTONE', 'GOODYEAR', 'DISCOUNT TIRE', 'MIDAS', 'MEINEKE'], category: 'Auto & Transport', subcategory: 'Auto Maintenance' },
	
	// Coffee & Drinks subcategories
	{ patterns: ['STARBUCKS', 'DUNKIN', 'PEETS', 'COFFEE', 'PHILZ', 'BLUE BOTTLE', 'DUTCH BROS', 'CARIBOU', 'TIM HORTON', 'SCOOTERS', 'BLACK RIFLE'], category: 'Coffee & Drinks', subcategory: 'Coffee Shops' },
	{ patterns: ['BAR', 'BREWERY', 'PUB', 'TAPROOM', 'WINE', 'LIQUOR', 'SPIRITS', 'BEER', 'COCKTAIL', 'TOTAL WINE', 'BINNYS', 'ABC LIQUOR', 'BEVMO'], category: 'Coffee & Drinks', subcategory: 'Bars & Alcohol' },
	{ patterns: ['SMOOTHIE', 'JAMBA', 'TROPICAL SMOOTHIE', 'JUICE'], category: 'Coffee & Drinks', subcategory: 'Smoothies & Juice' },
	
	// Dining & Restaurants subcategories  
	{ patterns: ['MCDONALDS', 'BURGER KING', 'WENDYS', 'TACO BELL', 'CHICK-FIL-A', 'CHICKFILA', 'RAISING CANE', 'POPEYES', 'KFC', 'ARBYS', 'SONIC', 'WHATABURGER', 'CULVERS', 'HARDEES', 'CARLS JR', 'IN-N-OUT', 'FIVE GUYS', 'ZAXBYS', 'BOJANGLES', 'WINGSTOP', 'LITTLE CAESARS', 'DOMINOS', 'PIZZA HUT', 'PAPA JOHN', 'SUBWAY', 'JERSEY MIKE', 'JIMMY JOHN', 'CHIPOTLE', 'QDOBA', 'DEL TACO', 'PANDA EXPRESS', 'LONG JOHN SILVER', 'CAPTAIN D'], category: 'Dining & Restaurants', subcategory: 'Fast Food' },
	{ patterns: ['APPLEBEE', 'CHILIS', 'TGI FRIDAY', 'OLIVE GARDEN', 'RED LOBSTER', 'OUTBACK', 'TEXAS ROADHOUSE', 'LONGHORN', 'RED ROBIN', 'RUBY TUESDAY', 'GOLDEN CORRAL', 'DENNYS', 'IHOP', 'WAFFLE HOUSE', 'CRACKER BARREL', 'BOB EVANS', 'BJS RESTAURANT', 'CHEDDAR', 'CARRABBA', 'BONEFISH', 'BAHAMA BREEZE'], category: 'Dining & Restaurants', subcategory: 'Casual Dining' },
	{ patterns: ['CHEESECAKE FACTORY', 'P.F. CHANG', 'PF CHANG', 'CAPITAL GRILLE', 'RUTH CHRIS', 'MORTONS', 'FLEMINGS', 'SEASONS 52', 'EDDIE V'], category: 'Dining & Restaurants', subcategory: 'Fine Dining' },
	{ patterns: ['SQ *', 'SQUARE *', 'TST*', 'TOAST*'], category: 'Dining & Restaurants', subcategory: 'Takeout' },
	
	// Groceries subcategories
	{ patterns: ['KROGER', 'SAFEWAY', 'ALBERTSONS', 'PUBLIX', 'GIANT', 'FOOD LION', 'HEB', 'MEIJER', 'STOP SHOP', 'SHOPRITE', 'ACME', 'RALPHS', 'VONS', 'WEGMANS'], category: 'Groceries', subcategory: 'Supermarket' },
	{ patterns: ['WHOLE FOODS', 'TRADER JOE', 'SPROUTS', 'NATURAL GROCERS', 'EARTH FARE', 'FRESH MARKET'], category: 'Groceries', subcategory: 'Organic & Natural' },
	{ patterns: ['COSTCO', 'SAMS CLUB', 'BJS WHOLESALE'], category: 'Groceries', subcategory: 'Warehouse Clubs' },
	{ patterns: ['H MART', 'HMART', '99 RANCH', 'ASIAN MARKET'], category: 'Groceries', subcategory: 'Specialty Foods' },
	
	// Food Delivery subcategories
	{ patterns: ['DOORDASH', 'UBER EATS', 'GRUBHUB', 'POSTMATES', 'SEAMLESS', 'CAVIAR'], category: 'Food Delivery', subcategory: 'Delivery Apps' },
	{ patterns: ['HELLOFRESH', 'BLUE APRON', 'HOME CHEF', 'FRESHLY', 'FACTOR'], category: 'Food Delivery', subcategory: 'Meal Kits' },
	
	// Entertainment subcategories
	{ patterns: ['AMC', 'REGAL', 'CINEMARK', 'FANDANGO', 'MOVIE', 'CINEMA', 'THEATER'], category: 'Entertainment', subcategory: 'Movies & TV' },
	{ patterns: ['TICKETMASTER', 'LIVE NATION', 'STUB HUB', 'SEAT GEEK', 'AXS', 'CONCERT'], category: 'Entertainment', subcategory: 'Music & Concerts' },
	{ patterns: ['STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'EPIC GAMES', 'TWITCH', 'GAME'], category: 'Entertainment', subcategory: 'Games' },
	{ patterns: ['NETFLIX', 'HULU', 'DISNEY', 'HBO', 'PARAMOUNT', 'PEACOCK', 'AMAZON PRIME VIDEO', 'YOUTUBE TV', 'SLING', 'FUBO'], category: 'Entertainment', subcategory: 'Streaming Services' },
	{ patterns: ['GOLF', 'TOPGOLF', 'BOWLING', 'ZOO', 'AQUARIUM', 'MUSEUM', 'THEME PARK', 'SIX FLAGS', 'ARCADE'], category: 'Entertainment', subcategory: 'Sports & Recreation' },
	
	// Shopping subcategories
	{ patterns: ['NORDSTROM', 'MACYS', 'DILLARDS', 'BLOOMINGDALE', 'NEIMAN', 'SAKS', 'TJ MAXX', 'MARSHALLS', 'ROSS', 'BURLINGTON', 'KOHLS'], category: 'Shopping', subcategory: 'Department Stores' },
	{ patterns: ['OLD NAVY', 'GAP', 'ZARA', 'H&M', 'UNIQLO', 'FOREVER 21', 'EXPRESS', 'BANANA REPUBLIC', 'J CREW'], category: 'Shopping', subcategory: 'Clothing' },
	{ patterns: ['NIKE', 'ADIDAS', 'FOOTLOCKER', 'FINISH LINE', 'DSW', 'FAMOUS FOOTWEAR'], category: 'Shopping', subcategory: 'Shoes' },
	{ patterns: ['AMAZON', 'EBAY', 'ETSY', 'WAYFAIR', 'OVERSTOCK'], category: 'Shopping', subcategory: 'Online Shopping' },
	
	// Healthcare subcategories
	{ patterns: ['CVS', 'WALGREENS', 'RITE AID', 'PHARMACY'], category: 'Healthcare & Medical', subcategory: 'Pharmacy' },
	{ patterns: ['DOCTOR', 'MEDICAL', 'PHYSICIAN', 'CLINIC', 'URGENT CARE', 'HOSPITAL'], category: 'Healthcare & Medical', subcategory: 'Doctor' },
	{ patterns: ['DENTAL', 'DENTIST', 'ORTHODONT'], category: 'Healthcare & Medical', subcategory: 'Dentist' },
	{ patterns: ['OPTOMETRIST', 'VISION', 'EYECARE', 'LENSCRAFTERS', 'PEARLE VISION'], category: 'Healthcare & Medical', subcategory: 'Vision' },
	{ patterns: ['THERAPY', 'COUNSELING', 'MENTAL HEALTH', 'PSYCHIATR'], category: 'Healthcare & Medical', subcategory: 'Mental Health' },
	
	// Home & Garden subcategories
	{ patterns: ['LOWES', 'HOME DEPOT', 'MENARDS', 'ACE HARDWARE', 'TRUE VALUE', 'HARBOR FREIGHT'], category: 'Home & Garden', subcategory: 'Home Improvement' },
	{ patterns: ['NURSERY', 'GARDEN CENTER', 'LANDSCAP', 'LAWN', 'TREE SERVICE'], category: 'Home & Garden', subcategory: 'Garden & Lawn' },
	{ patterns: ['IKEA', 'WAYFAIR', 'POTTERY BARN', 'CRATE BARREL', 'WEST ELM', 'RESTORATION HARDWARE'], category: 'Home & Garden', subcategory: 'Furniture' },
	
	// Utilities subcategories
	{ patterns: ['ELECTRIC', 'DUKE ENERGY', 'DOMINION', 'PG&E', 'CONEDISON', 'XCEL', 'FPL'], category: 'Utilities', subcategory: 'Electric' },
	{ patterns: ['INTERNET', 'COMCAST', 'XFINITY', 'SPECTRUM', 'COX', 'CENTURY LINK', 'FRONTIER COMM'], category: 'Utilities', subcategory: 'Internet' },
	{ patterns: ['ATT', 'AT&T', 'VERIZON', 'TMOBILE', 'T-MOBILE', 'SPRINT'], category: 'Utilities', subcategory: 'Phone' },
	{ patterns: ['CABLE', 'DISH', 'DIRECTV'], category: 'Utilities', subcategory: 'Cable & TV' },
	{ patterns: ['WATER BILL', 'WATER UTILITY'], category: 'Utilities', subcategory: 'Water' },
	
	// Travel subcategories
	{ patterns: ['DELTA', 'UNITED', 'AMERICAN AIR', 'SOUTHWEST', 'JETBLUE', 'SPIRIT', 'FRONTIER', 'ALASKA AIR', 'AIRLINE', 'FLIGHT'], category: 'Travel & Vacation', subcategory: 'Flights' },
	{ patterns: ['MARRIOTT', 'HILTON', 'HYATT', 'IHG', 'HOLIDAY INN', 'BEST WESTERN', 'WYNDHAM', 'HOTEL', 'AIRBNB', 'VRBO'], category: 'Travel & Vacation', subcategory: 'Hotels' },
	{ patterns: ['HERTZ', 'ENTERPRISE', 'NATIONAL', 'AVIS', 'BUDGET', 'RENTAL CAR', 'CAR RENTAL'], category: 'Travel & Vacation', subcategory: 'Car Rental' },
	{ patterns: ['CARNIVAL', 'ROYAL CARIBBEAN', 'NORWEGIAN', 'CRUISE'], category: 'Travel & Vacation', subcategory: 'Cruises' },
	
	// Fitness subcategories
	{ patterns: ['PLANET FITNESS', 'LA FITNESS', 'ANYTIME FITNESS', 'EQUINOX', '24 HOUR', 'CRUNCH', 'GOLD GYM', 'LIFETIME FITNESS', 'YMCA'], category: 'Fitness & Gym', subcategory: 'Gym Membership' },
	{ patterns: ['ORANGETHEORY', 'CROSSFIT', 'F45', 'SOULCYCLE', 'BARRY', 'PURE BARRE', 'YOGA', 'PILATES'], category: 'Fitness & Gym', subcategory: 'Fitness Classes' },
	{ patterns: ['GNC', 'VITAMIN SHOPPE', 'SUPPLEMENT'], category: 'Fitness & Gym', subcategory: 'Supplements' },
	
	// Personal Care subcategories
	{ patterns: ['SALON', 'BARBER', 'HAIRCUT', 'GREAT CLIPS', 'SUPERCUTS', 'SPORTS CLIPS', 'DRYBAR'], category: 'Personal Care', subcategory: 'Hair & Salon' },
	{ patterns: ['SPA', 'MASSAGE'], category: 'Personal Care', subcategory: 'Spa & Massage' },
	{ patterns: ['ULTA', 'SEPHORA', 'COSMETIC', 'BEAUTY'], category: 'Personal Care', subcategory: 'Cosmetics' },
	
	// Pets subcategories
	{ patterns: ['PETCO', 'PETSMART', 'PET SUPPLIES', 'CHEWY'], category: 'Pets', subcategory: 'Pet Supplies' },
	{ patterns: ['VET', 'VETERINAR', 'ANIMAL HOSPITAL', 'BANFIELD', 'VCA'], category: 'Pets', subcategory: 'Vet' },
	{ patterns: ['GROOMING', 'PET GROOM'], category: 'Pets', subcategory: 'Pet Grooming' },
	
	// Subscriptions subcategories
	{ patterns: ['SPOTIFY', 'APPLE MUSIC', 'YOUTUBE PREMIUM', 'PANDORA', 'TIDAL'], category: 'Subscriptions', subcategory: 'Streaming' },
	{ patterns: ['ADOBE', 'MICROSOFT 365', 'DROPBOX', 'GOOGLE STORAGE', 'ICLOUD'], category: 'Subscriptions', subcategory: 'Software' },
	{ patterns: ['NEW YORK TIMES', 'WSJ', 'WASHINGTON POST', 'ATHLETIC', 'SUBSTACK', 'MEDIUM'], category: 'Subscriptions', subcategory: 'News & Magazines' },
	
	// Kids & Family subcategories
	{ patterns: ['DAYCARE', 'CHILDCARE', 'PRESCHOOL', 'BRIGHT HORIZONS', 'KINDERCARE'], category: 'Kids & Family', subcategory: 'Childcare' },
	{ patterns: ['TOY', 'LEGO', 'DISNEY STORE', 'BUILD A BEAR', 'FIVE BELOW'], category: 'Kids & Family', subcategory: 'Toys & Games' },
	{ patterns: ['CARTERS', 'OSH KOSH', 'GYMBOREE', 'KIDS CLOTHING', 'CHILDRENS PLACE'], category: 'Kids & Family', subcategory: 'Kids Clothing' },
	
	// Gifts & Donations subcategories
	{ patterns: ['HALLMARK', '1800FLOWERS', 'FTD', 'PROFLOWERS', 'GIFT'], category: 'Gifts & Donations', subcategory: 'Gifts' },
	{ patterns: ['CHARITY', 'DONATE', 'DONATION', 'RED CROSS', 'UNITED WAY', 'SALVATION ARMY', 'GOFUNDME'], category: 'Gifts & Donations', subcategory: 'Charity' },
];

interface CategoryResult {
	category: string | null;
	subcategory: string | null;
}

function determineCategory(merchantNorm: string | null, descriptionRaw: string | null): CategoryResult {
	// Try normalized merchant name first for better matching
	const normalizedMerchant = normalizeMerchantName(merchantNorm);
	const normalizedDescription = normalizeMerchantName(descriptionRaw);
	
	// Search in priority order: normalized merchant, original merchant, normalized description, original description
	const searchTexts = [normalizedMerchant, merchantNorm, normalizedDescription, descriptionRaw].filter(Boolean) as string[];
	
	if (searchTexts.length === 0) return { category: null, subcategory: null };

	// First try subcategory patterns for more specific matching
	for (const { patterns, category, subcategory } of SUBCATEGORY_PATTERNS) {
		for (const searchText of searchTexts) {
			if (matchesAnyPattern(searchText, patterns)) {
				return { category, subcategory };
			}
		}
	}

	// Fall back to category-only patterns
	for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
		for (const searchText of searchTexts) {
			if (matchesAnyPattern(searchText, patterns)) {
				return { category, subcategory: null };
			}
		}
	}

	return { category: null, subcategory: null };
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
		category: null,
		subcategory: null
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
		const categoryResult = determineCategory(merchantNorm, descriptionRaw);
		result.category = categoryResult.category || 'Uncategorized';
		result.subcategory = categoryResult.subcategory;
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
