import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';

export interface ParsedRow {
	rowIndex: number;
	raw: Record<string, unknown>;
	parseStatus: 'ok' | 'error';
	parseError: string | null;
	dateRaw: string | null;
	dateChosen: string | null;
	amountRaw: string | null;
	amountSigned: number | null;
	descriptionRaw: string | null;
	merchantRaw: string | null;
	merchantNorm: string | null;
}

// Column name synonyms for mapping
const DATE_COLUMNS = [
	'transaction date',
	'trans date',
	'date',
	'authorized date',
	'posting date',
	'posted date',
	'transaction_date',
	'trans_date'
];

const AMOUNT_COLUMNS = ['amount', 'transaction amount', 'transaction_amount', 'debit', 'credit'];

const DESCRIPTION_COLUMNS = [
	'description',
	'merchant',
	'name',
	'payee',
	'memo',
	'details',
	'merchant name',
	'merchant_name'
];

// Date formats to try
const DATE_FORMATS = [
	'MM/dd/yyyy',
	'M/d/yyyy',
	'MM-dd-yyyy',
	'M-d-yyyy',
	'yyyy-MM-dd',
	'yyyy/MM/dd',
	'dd/MM/yyyy',
	'd/M/yyyy',
	'MMM dd, yyyy',
	'MMMM dd, yyyy',
	'MM/dd/yy',
	'M/d/yy'
];

// Noise tokens to remove from merchant names
const NOISE_TOKENS = [
	'POS',
	'DEBIT',
	'CREDIT',
	'PURCHASE',
	'ONLINE',
	'WEB',
	'SQ *',
	'SQ*',
	'TST*',
	'CHECKCARD',
	'VISA',
	'MASTERCARD',
	'AMEX',
	'#',
	'CARD'
];

function findColumn(headers: string[], candidates: string[]): string | null {
	const normalized = headers.map((h) => h.toLowerCase().trim());
	for (const candidate of candidates) {
		const idx = normalized.indexOf(candidate.toLowerCase());
		if (idx !== -1) {
			return headers[idx];
		}
	}
	return null;
}

function parseDate(value: string | null | undefined): string | null {
	if (!value || typeof value !== 'string') return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	// Try each format
	for (const format of DATE_FORMATS) {
		try {
			const parsed = parse(trimmed, format, new Date());
			if (isValid(parsed)) {
				// Return ISO date string
				return parsed.toISOString().split('T')[0];
			}
		} catch {
			// Continue trying
		}
	}

	// Try native Date parsing as fallback
	try {
		const parsed = new Date(trimmed);
		if (isValid(parsed) && !isNaN(parsed.getTime())) {
			return parsed.toISOString().split('T')[0];
		}
	} catch {
		// Failed
	}

	return null;
}

function parseAmount(
	value: string | null | undefined,
	debitValue?: string | null,
	creditValue?: string | null
): number | null {
	// Handle separate debit/credit columns
	if (debitValue !== undefined || creditValue !== undefined) {
		const debit = parseAmountValue(debitValue);
		const credit = parseAmountValue(creditValue);

		if (debit !== null && debit > 0) {
			return -Math.abs(debit); // Debit is spending (negative)
		}
		if (credit !== null && credit > 0) {
			return Math.abs(credit); // Credit is incoming (positive)
		}
		if (debit !== null) return -Math.abs(debit);
		if (credit !== null) return Math.abs(credit);
		return null;
	}

	return parseAmountValue(value);
}

function parseAmountValue(value: string | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') return value;

	let str = String(value).trim();
	if (!str) return null;

	// Check for parentheses (negative)
	const isParenthetical = str.startsWith('(') && str.endsWith(')');
	if (isParenthetical) {
		str = str.slice(1, -1);
	}

	// Remove currency symbols and commas
	str = str.replace(/[$£€¥,]/g, '').trim();

	// Check for negative sign
	const hasNegative = str.startsWith('-');
	if (hasNegative) {
		str = str.slice(1);
	}

	const num = parseFloat(str);
	if (isNaN(num)) return null;

	// Apply sign
	if (isParenthetical || hasNegative) {
		return -Math.abs(num);
	}
	return num;
}

function normalizeMerchant(value: string | null | undefined): string | null {
	if (!value || typeof value !== 'string') return null;

	let normalized = value.toUpperCase();

	// Remove noise tokens
	for (const token of NOISE_TOKENS) {
		normalized = normalized.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
	}

	// Remove punctuation except spaces
	normalized = normalized.replace(/[^\w\s]/g, ' ');

	// Collapse whitespace
	normalized = normalized.replace(/\s+/g, ' ').trim();

	return normalized || null;
}

export function parseCSV(csvContent: string): { rows: ParsedRow[]; headers: string[] } {
	const result = Papa.parse<Record<string, string>>(csvContent, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h) => h.trim()
	});

	const headers = result.meta.fields || [];
	const rows: ParsedRow[] = [];

	// Find column mappings
	const dateColumn = findColumn(headers, DATE_COLUMNS);
	const amountColumn = findColumn(headers, AMOUNT_COLUMNS);
	const debitColumn = findColumn(headers, ['debit']);
	const creditColumn = findColumn(headers, ['credit']);
	const descColumn = findColumn(headers, DESCRIPTION_COLUMNS);

	for (let i = 0; i < result.data.length; i++) {
		const raw = result.data[i];
		const errors: string[] = [];

		// Extract date
		const dateRaw = dateColumn ? (raw[dateColumn] as string) : null;
		const dateChosen = parseDate(dateRaw);

		if (!dateChosen && dateRaw) {
			errors.push(`Unable to parse date: ${dateRaw}`);
		}

		// Extract amount
		const amountRaw = amountColumn ? (raw[amountColumn] as string) : null;
		const debitRaw = debitColumn ? (raw[debitColumn] as string) : undefined;
		const creditRaw = creditColumn ? (raw[creditColumn] as string) : undefined;
		const amountSigned = parseAmount(amountRaw, debitRaw, creditRaw);

		if (amountSigned === null && (amountRaw || debitRaw || creditRaw)) {
			errors.push(`Unable to parse amount: ${amountRaw || `debit:${debitRaw} credit:${creditRaw}`}`);
		}

		// Extract description/merchant
		const descriptionRaw = descColumn ? (raw[descColumn] as string) : null;
		const merchantRaw = descriptionRaw;
		const merchantNorm = normalizeMerchant(merchantRaw);

		const parsed: ParsedRow = {
			rowIndex: i,
			raw: raw as Record<string, unknown>,
			parseStatus: errors.length > 0 || !dateChosen || amountSigned === null ? 'error' : 'ok',
			parseError: errors.length > 0 ? errors.join('; ') : null,
			dateRaw,
			dateChosen,
			amountRaw: amountRaw || (debitRaw ?? null) || (creditRaw ?? null),
			amountSigned,
			descriptionRaw,
			merchantRaw,
			merchantNorm
		};

		rows.push(parsed);
	}

	return { rows, headers };
}
