<!--
  SEO Component for SpentWorth
  
  Usage:
  <SEO 
    title="Page Title"
    description="Page description under 158 characters"
    keywords="keyword1, keyword2"
    canonical="/page-path"
    noindex={false}
    type="website"
    image="/og-image.png"
  />
  
  SEO Guidelines:
  - Title: Max 600px width (~55-60 chars). Be concise, include brand.
  - Description: Max 158 chars (960px desktop / 680px mobile). Include CTA.
  - Keywords: Comma-separated, relevant to page content.
-->
<script lang="ts">
	const SITE_URL = 'https://spentworth.com';
	const SITE_NAME = 'SpentWorth';
	const DEFAULT_IMAGE = '/logo-512.png';
	
	interface Props {
		// Required
		title: string;
		description: string;
		
		// Optional
		keywords?: string;
		canonical?: string;
		noindex?: boolean;
		nofollow?: boolean;
		
		// Open Graph
		type?: 'website' | 'article' | 'product';
		image?: string;
		imageAlt?: string;
		
		// Twitter
		twitterCard?: 'summary' | 'summary_large_image';
		
		// Article specific (for blog posts if added later)
		publishedTime?: string;
		modifiedTime?: string;
		author?: string;
		
		// JSON-LD structured data type
		structuredData?: 'WebSite' | 'Organization' | 'WebPage' | 'FAQPage' | 'SoftwareApplication' | null;
	}
	
	let {
		title,
		description,
		keywords = '',
		canonical = '',
		noindex = false,
		nofollow = false,
		type = 'website',
		image = DEFAULT_IMAGE,
		imageAlt = '',
		twitterCard = 'summary_large_image',
		publishedTime = '',
		modifiedTime = '',
		author = '',
		structuredData = null
	}: Props = $props();
	
	// Build the full title with brand (using $derived for reactive computation)
	const fullTitle = $derived(title.includes('SpentWorth') ? title : `${title} | SpentWorth`);
	
	// Build canonical URL
	const canonicalUrl = $derived(canonical ? `${SITE_URL}${canonical}` : '');
	
	// Build image URL
	const imageUrl = $derived(image.startsWith('http') ? image : `${SITE_URL}${image}`);
	
	// Build robots directive
	const robotsContent = $derived([
		noindex ? 'noindex' : 'index',
		nofollow ? 'nofollow' : 'follow'
	].join(', '));
	
	// Generate structured data based on type
	function getStructuredData(): string | null {
		if (!structuredData) return null;
		
		const baseOrg = {
			"@type": "Organization",
			"name": "SpentWorth",
			"url": SITE_URL,
			"logo": `${SITE_URL}/logo-512.png`,
			"sameAs": [
				"https://x.com/spentworthapp",
				"https://instagram.com/spentworth",
				"https://reddit.com/r/SpentWorth"
			]
		};
		
		switch (structuredData) {
			case 'WebSite':
				return JSON.stringify({
					"@context": "https://schema.org",
					"@type": "WebSite",
					"name": SITE_NAME,
					"url": SITE_URL,
					"description": description,
					"publisher": baseOrg
				});
			
			case 'Organization':
				return JSON.stringify({
					"@context": "https://schema.org",
					...baseOrg,
					"description": "SpentWorth helps you track spending and see the opportunity cost of your purchases. See what your money could become if invested."
				});
			
			case 'SoftwareApplication':
				return JSON.stringify({
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					"name": SITE_NAME,
					"applicationCategory": "FinanceApplication",
					"operatingSystem": "Web Browser",
					"offers": {
						"@type": "Offer",
						"price": "0",
						"priceCurrency": "USD"
					},
					"description": description,
					"aggregateRating": {
						"@type": "AggregateRating",
						"ratingValue": "4.8",
						"ratingCount": "150"
					}
				});
			
			case 'WebPage':
				return JSON.stringify({
					"@context": "https://schema.org",
					"@type": "WebPage",
					"name": title,
					"description": description,
					"url": canonicalUrl || SITE_URL,
					"isPartOf": {
						"@type": "WebSite",
						"name": SITE_NAME,
						"url": SITE_URL
					}
				});
			
			case 'FAQPage':
				// For FAQ pages, you'll need to pass the questions separately
				return null;
			
			default:
				return null;
		}
	}
	
	const jsonLd = getStructuredData();
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{fullTitle}</title>
	<meta name="title" content={fullTitle} />
	<meta name="description" content={description} />
	
	{#if keywords}
		<meta name="keywords" content={keywords} />
	{/if}
	
	<!-- Robots -->
	<meta name="robots" content={robotsContent} />
	<meta name="googlebot" content={robotsContent} />
	
	<!-- Canonical URL -->
	{#if canonicalUrl}
		<link rel="canonical" href={canonicalUrl} />
	{/if}
	
	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	{#if imageAlt}
		<meta property="og:image:alt" content={imageAlt} />
	{/if}
	{#if canonicalUrl}
		<meta property="og:url" content={canonicalUrl} />
	{/if}
	<meta property="og:locale" content="en_US" />
	
	<!-- Twitter -->
	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:site" content="@spentworthapp" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
	{#if imageAlt}
		<meta name="twitter:image:alt" content={imageAlt} />
	{/if}
	
	<!-- Article specific meta (for future blog posts) -->
	{#if type === 'article' && publishedTime}
		<meta property="article:published_time" content={publishedTime} />
	{/if}
	{#if type === 'article' && modifiedTime}
		<meta property="article:modified_time" content={modifiedTime} />
	{/if}
	{#if type === 'article' && author}
		<meta property="article:author" content={author} />
	{/if}
	
	<!-- JSON-LD Structured Data -->
	{#if jsonLd}
		{@html `<script type="application/ld+json">${jsonLd}</script>`}
	{/if}
</svelte:head>
