# SpentWorth

**See what your spending could be worth.**

SpentWorth is a personal finance tool that calculates the opportunity cost of your spending. Upload your bank statements and discover how much your daily coffee habit, dining out, or subscriptions would be worth today if you had invested that money instead.

## Features

- 📊 **CSV Import** - Upload bank or credit card statements in CSV format
- 🏷️ **Smart Classification** - Automatic categorization with manual overrides
- 💰 **Opportunity Cost** - See what your spending would be worth if invested in SPY (or your ticker of choice)
- 🔄 **Trust Layer** - Excludes transfers, CC payments, and ATM withdrawals by default to avoid double-counting
- 📈 **Sankey Visualization** - Visual breakdown of spending by category
- ⚙️ **Customizable** - Create rules, adjust investment delay, choose your benchmark ticker

## Tech Stack

- **Frontend**: SvelteKit 2 with Svelte 5, TailwindCSS
- **Backend**: SvelteKit API routes
- **Database**: Supabase (PostgreSQL + Auth)
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- (Optional) Alpha Vantage API key for stock prices

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/spentworth.git
cd spentworth
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ALPHA_VANTAGE_API_KEY=your-api-key

# Stripe (for payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PRICE_PRO_MONTHLY=your-monthly-price-id
STRIPE_PRICE_PRO_YEARLY=your-yearly-price-id

# Resend (for emails)
RESEND_API_KEY=your-resend-api-key

# Cloudflare Turnstile (for contact form)
PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

4. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the SQL from `supabase/schema.sql`

5. Start the development server:
```bash
npm run dev
```

## How It Works

### Import Flow

1. Upload a CSV bank statement
2. SpentWorth parses and classifies each transaction
3. Review classifications in the Import Preview
4. Make any manual adjustments (exclude rows, change categories, create rules)
5. Commit the import to calculate opportunity costs

### Calculation Method

- Uses **adjusted close prices** (dividends + splits) for accurate total returns
- Configurable **investment delay** (default: 1 trading day)
- Falls back to 7% annual return for SPY-like tickers when price data unavailable

### Exclusions (Default)

To avoid double-counting, these are excluded by default:
- Transfers (internal, Venmo cashout, etc.)
- Credit card payments
- ATM/cash withdrawals
- Refunds (tracked separately)
- Fees and interest charges

You can include/exclude any transaction manually.

## Project Structure

```
src/
├── lib/
│   ├── types.ts           # TypeScript types
│   ├── supabase.ts        # Client-side Supabase
│   └── server/
│       ├── csv/           # CSV parsing
│       ├── classify/      # Transaction classification
│       ├── dedupe/        # Duplicate detection
│       ├── imports/       # Batch summary computation
│       └── prices/        # Stock price fetching
├── routes/
│   ├── +page.svelte       # Landing page
│   ├── login/             # Auth pages
│   ├── signup/
│   ├── dashboard/         # Main dashboard with Sankey
│   ├── imports/           # Import list and preview
│   ├── settings/          # User preferences
│   └── api/               # API endpoints
└── app.css                # Global styles
```

## Deployment

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables in Netlify dashboard

## License

MIT

## Acknowledgments

Built with the philosophy that understanding the true cost of spending can lead to better financial decisions.
