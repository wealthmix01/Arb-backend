# ⚡ ARB ENGINE — P2P Arbitrage Scanner Backend

Real-time P2P price scanner across Bybit, Gate.io & Binance.
Designed to deploy on Railway in under 10 minutes.

---

## What this does

- Fetches live P2P buy/sell ads from multiple exchanges simultaneously
- Calculates net spread after fees for every cross-exchange combination
- Returns ranked opportunities sorted by profitability
- Caches results to avoid hammering exchange APIs
- Exposes a clean REST API your frontend bot connects to

---

## Deploy to Railway (Step by Step)

### Step 1 — Push code to GitHub
1. Go to github.com → New repository → name it `arb-engine-backend`
2. Upload all files from this folder into it
3. Make sure `.env` is NOT uploaded (it's in .gitignore — good)

### Step 2 — Create Railway project
1. Go to railway.app and log in
2. Click **New Project → Deploy from GitHub repo**
3. Select your `arb-engine-backend` repo
4. Railway auto-detects Node.js and deploys

### Step 3 — Add environment variables in Railway
In your Railway project → **Variables** tab, add:

```
BYBIT_API_KEY        = your_bybit_api_key
BYBIT_API_SECRET     = your_bybit_secret
GATEIO_API_KEY       = your_gateio_key
GATEIO_API_SECRET    = your_gateio_secret
CACHE_TTL            = 15
MIN_SPREAD_PCT       = 1.5
```

> ⚠️ When creating API keys on Bybit/Gate.io:
> - Enable: Read + Trade permissions only
> - DISABLE withdrawal permissions
> - Whitelist your Railway server IP if possible

### Step 4 — Get your backend URL
Railway gives you a public URL like:
`https://arb-engine-backend-production-xxxx.up.railway.app`

### Step 5 — Connect your frontend bot
In the bot's **API Keys** tab → paste your Railway URL into the **Backend URL** field.
The frontend will now fetch real live prices from your backend.

---

## API Endpoints

### Health check
```
GET /api/status
```
Returns which exchanges are connected and current settings.

### Scan a single pair
```
GET /api/scan?token=USDT&fiat=USD
GET /api/scan?token=USDT&fiat=NGN
GET /api/scan?token=USDT&fiat=KES
```

### Scan multiple pairs at once
```
GET /api/scan/multi?pairs=USDT:USD,USDT:NGN,USDT:KES,USDC:USD
```
Returns all opportunities across all pairs, sorted by spread.

### Check wallet balances
```
GET /api/balance?coin=USDT
```
Returns available balance on each connected exchange.

---

## Example scan response

```json
{
  "ok": true,
  "data": {
    "token": "USDT",
    "fiat": "NGN",
    "opportunityCount": 3,
    "opportunities": [
      {
        "buyExchange": "Binance",
        "sellExchange": "Bybit",
        "buyPrice": 1590.5,
        "sellPrice": 1621.0,
        "grossSpreadPct": 1.918,
        "feePct": 0.4,
        "netSpreadPct": 1.518,
        "estProfit100": 1.518,
        "estProfit1000": 15.18,
        "status": "GOOD",
        "buyPayments": ["Bank Transfer"],
        "sellPayments": ["Bank Transfer", "USSD"],
        "scannedAt": "2026-05-11T08:23:01.000Z"
      }
    ]
  }
}
```

---

## Local development

```bash
npm install
cp .env.example .env
# Edit .env with your keys
npm run dev
```

---

## Important notes

- P2P trades require **manual execution** — the backend gives you the price intelligence,
  you confirm and execute via the exchange app. This keeps your accounts safe.
- Bybit P2P public ads endpoint does not require API keys for price scanning.
  Keys are only needed for balance checks.
- Cache is set to 15 seconds by default. Lower = fresher data, higher = less API load.
