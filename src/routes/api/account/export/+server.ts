import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const format = url.searchParams.get('format') || 'json';

	try {
		// Fetch all user data in parallel
		const [
			transactionsRes,
			budgetsRes,
			goalsRes,
			rulesRes,
			tagsRes,
			prefsRes
		] = await Promise.all([
			locals.supabase
				.from('transactions')
				.select('date, amount, merchant, description, category, subcategory, kind, included_in_spend')
				.eq('user_id', user.id)
				.order('date', { ascending: false }),
			locals.supabase
				.from('budgets')
				.select('category, monthly_limit, enabled, created_at')
				.eq('user_id', user.id),
			locals.supabase
				.from('spending_goals')
				.select('name, goal_type, target_category, target_merchant, target_amount, enabled, created_at')
				.eq('user_id', user.id),
			locals.supabase
				.from('merchant_rules')
				.select('match_type, match_value, match_field, action_exclude, set_kind, set_category, set_subcategory, priority, enabled')
				.eq('user_id', user.id),
			locals.supabase
				.from('custom_tags')
				.select('name, color')
				.eq('user_id', user.id),
			locals.supabase
				.from('user_prefs')
				.select('default_ticker, custom_ticker, invest_delay_trading_days, allow_fallback_for_all_tickers, fallback_annual_return, monthly_income')
				.eq('user_id', user.id)
				.single()
		]);

		const exportData = {
			exportedAt: new Date().toISOString(),
			account: {
				email: user.email,
				userId: user.id
			},
			settings: prefsRes.data || {},
			transactions: transactionsRes.data || [],
			budgets: budgetsRes.data || [],
			goals: goalsRes.data || [],
			rules: rulesRes.data || [],
			tags: tagsRes.data || []
		};

		if (format === 'csv') {
			// Generate CSV for transactions (main data users typically want)
			const transactions = exportData.transactions;
			if (transactions.length === 0) {
				return new Response('No transactions to export', {
					status: 200,
					headers: {
						'Content-Type': 'text/plain'
					}
				});
			}

			const headers = ['Date', 'Amount', 'Merchant', 'Description', 'Category', 'Subcategory', 'Type', 'Included in Spend'];
			const csvRows = [headers.join(',')];

			for (const tx of transactions) {
				const row = [
					tx.date || '',
					tx.amount?.toString() || '0',
					`"${(tx.merchant || '').replace(/"/g, '""')}"`,
					`"${(tx.description || '').replace(/"/g, '""')}"`,
					tx.category || '',
					tx.subcategory || '',
					tx.kind || '',
					tx.included_in_spend ? 'Yes' : 'No'
				];
				csvRows.push(row.join(','));
			}

			const csv = csvRows.join('\n');
			const filename = `spentworth-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

			return new Response(csv, {
				status: 200,
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="${filename}"`
				}
			});
		}

		// Default: JSON format with all data
		const filename = `spentworth-export-${new Date().toISOString().slice(0, 10)}.json`;

		return new Response(JSON.stringify(exportData, null, 2), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (e) {
		console.error('Export error:', e);
		throw error(500, 'Failed to export data');
	}
};