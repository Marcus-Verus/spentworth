import type { ParsedRow } from '../csv/parse';

export interface DedupeResult {
	isDuplicate: boolean;
	duplicateOf: string | null;
}

// Create a fingerprint for deduplication
function createFingerprint(
	userId: string,
	dateChosen: string | null,
	amountSigned: number | null,
	merchantNorm: string | null
): string {
	return `${userId}|${dateChosen || 'null'}|${amountSigned?.toFixed(2) || 'null'}|${merchantNorm || 'null'}`;
}

// Detect duplicates within a batch
export function detectDuplicatesInBatch(
	rows: ParsedRow[],
	userId: string
): Map<number, DedupeResult> {
	const results = new Map<number, DedupeResult>();
	const seen = new Map<string, number>(); // fingerprint -> first rowIndex

	for (const row of rows) {
		const fingerprint = createFingerprint(
			userId,
			row.dateChosen,
			row.amountSigned,
			row.merchantNorm
		);

		if (seen.has(fingerprint)) {
			// This is a duplicate
			results.set(row.rowIndex, {
				isDuplicate: true,
				duplicateOf: null // We'll set the actual UUID later when rows are inserted
			});
		} else {
			// First occurrence
			seen.set(fingerprint, row.rowIndex);
			results.set(row.rowIndex, {
				isDuplicate: false,
				duplicateOf: null
			});
		}
	}

	return results;
}

// Check for duplicates against existing transactions in the database
export async function checkDuplicatesAgainstExisting(
	rows: ParsedRow[],
	userId: string,
	existingTransactions: Array<{
		id: string;
		date: string;
		amount: number;
		merchantNorm: string | null;
	}>
): Promise<Map<number, DedupeResult>> {
	const results = new Map<number, DedupeResult>();

	// Build a map of existing fingerprints
	const existingFingerprints = new Map<string, string>(); // fingerprint -> transaction id

	for (const tx of existingTransactions) {
		const fingerprint = createFingerprint(
			userId,
			tx.date,
			tx.amount,
			tx.merchantNorm
		);
		existingFingerprints.set(fingerprint, tx.id);
	}

	// Check each row
	for (const row of rows) {
		const fingerprint = createFingerprint(
			userId,
			row.dateChosen,
			row.amountSigned,
			row.merchantNorm
		);

		if (existingFingerprints.has(fingerprint)) {
			results.set(row.rowIndex, {
				isDuplicate: true,
				duplicateOf: existingFingerprints.get(fingerprint)!
			});
		} else {
			results.set(row.rowIndex, {
				isDuplicate: false,
				duplicateOf: null
			});
		}
	}

	return results;
}
