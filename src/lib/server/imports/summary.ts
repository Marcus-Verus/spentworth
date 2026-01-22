import type { BatchSummary, TransactionKind } from '$lib/types';

export interface RawRowWithEffective {
	parseStatus: 'ok' | 'error';
	amountSigned: number | null;
	dateChosen: string | null;
	systemKind: TransactionKind;
	systemIncludedInSpend: boolean;
	effectiveKind: TransactionKind;
	effectiveIncludedInSpend: boolean;
	effectiveCategory: string | null;
	isDuplicate: boolean;
}

export function computeBatchSummary(rows: RawRowWithEffective[]): BatchSummary {
	let rowsIncluded = 0;
	let rowsExcluded = 0;
	let rowsNeedsReview = 0;
	let rowsDuplicates = 0;
	let rowsUncategorized = 0;
	let totalIncludedSpend = 0;
	let totalExcludedAmount = 0;
	let dateMin: string | null = null;
	let dateMax: string | null = null;

	for (const row of rows) {
		// Update date range
		if (row.dateChosen) {
			if (!dateMin || row.dateChosen < dateMin) {
				dateMin = row.dateChosen;
			}
			if (!dateMax || row.dateChosen > dateMax) {
				dateMax = row.dateChosen;
			}
		}

		// Count uncategorized (purchases without a category or with "Uncategorized")
		if (row.effectiveKind === 'purchase' && 
		    row.effectiveIncludedInSpend && 
		    !row.isDuplicate &&
		    (!row.effectiveCategory || row.effectiveCategory === 'Uncategorized')) {
			rowsUncategorized++;
		}

		// Count by status
		if (row.isDuplicate) {
			rowsDuplicates++;
			rowsExcluded++;
			if (row.amountSigned !== null) {
				totalExcludedAmount += Math.abs(row.amountSigned);
			}
		} else if (row.parseStatus === 'error' || row.effectiveKind === 'unknown') {
			rowsNeedsReview++;
			rowsExcluded++;
			if (row.amountSigned !== null) {
				totalExcludedAmount += Math.abs(row.amountSigned);
			}
		} else if (row.effectiveIncludedInSpend) {
			rowsIncluded++;
			if (row.amountSigned !== null) {
				// IMPORTANT: Only count NEGATIVE amounts (actual spending) toward totalIncludedSpend
				// Positive amounts are refunds/income and should NOT be added to spend totals
				// They can optionally be subtracted (net spending) but we keep them neutral for clarity
				if (row.amountSigned < 0) {
					// Purchases are negative, convert to positive for display
					totalIncludedSpend += Math.abs(row.amountSigned);
				}
				// Note: Positive amounts (refunds, income) don't contribute to totalIncludedSpend
				// They're still "included" for visibility purposes but don't inflate the spending total
			}
		} else {
			rowsExcluded++;
			if (row.amountSigned !== null) {
				totalExcludedAmount += Math.abs(row.amountSigned);
			}
		}
	}

	return {
		rowsTotal: rows.length,
		rowsIncluded,
		rowsExcluded,
		rowsNeedsReview,
		rowsDuplicates,
		rowsUncategorized,
		totalIncludedSpend: Math.round(totalIncludedSpend * 100) / 100,
		totalExcludedAmount: Math.round(totalExcludedAmount * 100) / 100,
		dateMin,
		dateMax,
		currency: 'USD'
	};
}
