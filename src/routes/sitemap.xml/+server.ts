import type { RequestHandler } from './$types';

const SITE_URL = 'https://spentworth.com';

// Define all public pages with their metadata
// Priority: 1.0 = most important, 0.1 = least important
// Change frequency hints to search engines how often content changes
const publicPages = [
	// Core pages - highest priority
	{ path: '/', priority: 1.0, changefreq: 'weekly' },
	{ path: '/pricing', priority: 0.9, changefreq: 'monthly' },
	{ path: '/demo', priority: 0.9, changefreq: 'monthly' },
	
	// Marketing pages
	{ path: '/about', priority: 0.7, changefreq: 'monthly' },
	{ path: '/contact', priority: 0.6, changefreq: 'yearly' },
	
	// Auth pages - medium priority, helps with sign-up funnels
	{ path: '/signup', priority: 0.8, changefreq: 'monthly' },
	{ path: '/login', priority: 0.5, changefreq: 'yearly' },
	
	// Legal pages - low priority but important for trust
	{ path: '/privacy', priority: 0.4, changefreq: 'yearly' },
	{ path: '/terms', priority: 0.4, changefreq: 'yearly' },
	{ path: '/security', priority: 0.5, changefreq: 'yearly' },
];

// Pages to exclude from sitemap (private/authenticated pages)
// These are handled by robots.txt noindex as well
const excludedPaths = [
	'/dashboard',
	'/transactions',
	'/imports',
	'/insights',
	'/budgets',
	'/review',
	'/sources',
	'/settings',
	'/forgot-password',
	'/reset-password',
];

export const GET: RequestHandler = async () => {
	const lastmod = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${publicPages
	.map(
		(page) => `	<url>
		<loc>${SITE_URL}${page.path}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>${page.changefreq}</changefreq>
		<priority>${page.priority.toFixed(1)}</priority>
	</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600, s-maxage=3600' // Cache for 1 hour
		}
	});
};
