# 🚀 Arbitrage Backend - P2P Crypto Exchange Arbitrage Bot

A sophisticated P2P arbitrage bot that monitors multiple cryptocurrency exchanges in real-time and identifies profitable trading opportunities.

## 📊 Supported Exchanges

- **Bybit** - Spot trading with high liquidity
- **Bitget** - Derivatives and spot trading
- **Gate.io** - Multi-asset trading platform
- **Binance** - Optional, largest crypto exchange
- **Kraken** - Optional, institutional-grade trading

## ✨ Features

✅ **Real-time Price Monitoring** - Continuous ticker updates across multiple exchanges  
✅ **Arbitrage Detection** - Automatic identification of profitable opportunities  
✅ **REST API** - Full-featured API for monitoring and control  
✅ **Multi-Exchange Support** - Seamless integration with 5+ exchanges  
✅ **Professional Logging** - Comprehensive logging with Winston  
✅ **Configuration System** - Easy setup with environment variables  
✅ **Performance Tracking** - Statistics on opportunities and profits  
✅ **Rate Limiting** - Protection against API abuse  

## 🛠️ Installation

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/wealthmix01/arb-backend.git
cd arb-backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# Edit .env with your API credentials
```

## 🔑 API Configuration

### Bybit API Keys
1. Go to https://www.bybit.com/en/user-service/
2. Click "API" → "Create New Key"
3. Set permissions: Read (Ticker, Orderbook, Position)
4. Add IP whitelist (optional but recommended)
5. Copy API Key and Secret to `.env`

### Bitget API Keys
1. Visit https://www.bitget.com/account/api
2. Create a new API Key
3. Select permissions needed
4. Generate passphrase and save credentials
5. Add to `.env`

### Gate.io API Keys
1. Go to https://www.gate.io/myaccount/APImanagement
2. Create new API Key
3. Set appropriate permissions
4. Get your UID from account settings
5. Configure in `.env`

## 📝 Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Exchange API Keys (at least one required)
BYBIT_API_KEY=your_key
BYBIT_SECRET=your_secret

BITGET_API_KEY=your_key
BITGET_SECRET=your_secret
BITGET_PASSPHRASE=your_passphrase

GATEIO_API_KEY=your_key
GATEIO_SECRET=your_secret
GATEIO_UID=your_uid

# Arbitrage Settings
MIN_PROFIT_PERCENTAGE=0.5          # Minimum profit % to flag as opportunity
PRICE_CHECK_INTERVAL=5000          # Milliseconds between price checks
MAX_POSITION_SIZE=1000             # Maximum USDT per trade
ENABLE_AUTO_TRADING=false          # Enable automatic trade execution

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

## 🚀 Running the Bot

### Development Mode (with hot reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Monitor-Only Mode (no server)
```bash
npm run monitor
```

## 📡 REST API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2026-05-11T12:30:45Z",
  "monitoring": true,
  "exchanges": 3
}
```

### Get Connected Exchanges
```bash
GET /api/exchanges
```

Response:
```json
{
  "exchanges": ["bybit", "bitget", "gateio"],
  "count": 3
}
```

### Get All Prices
```bash
GET /api/prices
```

Response:
```json
{
  "BTC/USDT": {
    "bybit": { "bid": 45000, "ask": 45010, "last": 45005 },
    "bitget": { "bid": 45002, "ask": 45012, "last": 45007 },
    "gateio": { "bid": 44998, "ask": 45008, "last": 45003 }
  },
  "ETH/USDT": { ... }
}
```

### Get Prices for Specific Symbol
```bash
GET /api/prices/BTC
# or
GET /api/prices/BTC/USDT
```

### Get Arbitrage Opportunities
```bash
GET /api/opportunities
```

Response:
```json
{
  "count": 2,
  "opportunities": [
    {
      "symbol": "BTC/USDT",
      "buyExchange": "gateio",
      "buyPrice": 44998,
      "sellExchange": "bybit",
      "sellPrice": 45010,
      "profitPercentage": 0.0267,
      "profitAmount": 12,
      "timestamp": "2026-05-11T12:35:20Z"
    }
  ]
}
```

### Get Performance Statistics
```bash
GET /api/stats
```

Response:
```json
{
  "totalOpportunitiesFound": 156,
  "profitableOpportunities": 42,
  "averageProfitPercentage": 0.75,
  "uptime": 3600,
  "timestamp": "2026-05-11T12:40:00Z"
}
```

### Start Monitoring
```bash
POST /api/monitor/start
```

### Stop Monitoring
```bash
POST /api/monitor/stop
```

## 📊 Sample API Usage

### Using curl

```bash
# Check health
curl http://localhost:3000/health

# Get exchanges
curl http://localhost:3000/api/exchanges

# Get current opportunities
curl http://localhost:3000/api/opportunities

# Start monitoring
curl -X POST http://localhost:3000/api/monitor/start
```

### Using Python

```python
import requests
import json

BASE_URL = "http://localhost:3000"

# Get opportunities
response = requests.get(f"{BASE_URL}/api/opportunities")
opportunities = response.json()

print(f"Found {opportunities['count']} opportunities")
for opp in opportunities['opportunities']:
    print(f"Buy {opp['symbol']} on {opp['buyExchange']} @ ${opp['buyPrice']}")
    print(f"Sell on {opp['sellExchange']} @ ${opp['sellPrice']}")
    print(f"Profit: {opp['profitPercentage']}%\n")
```

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Get opportunities
axios.get(`${BASE_URL}/api/opportunities`)
  .then(response => {
    const { count, opportunities } = response.data;
    console.log(`Found ${count} opportunities`);
    opportunities.forEach(opp => {
      console.log(`${opp.symbol}: Buy on ${opp.buyExchange} for ${opp.profitPercentage}% profit`);
    });
  })
  .catch(error => console.error(error));
```

## 🔍 Understanding Arbitrage Opportunities

An arbitrage opportunity is when:
- **Buy Price** (best ask on one exchange) < **Sell Price** (best bid on another exchange)
- The profit margin exceeds `MIN_PROFIT_PERCENTAGE`
- Transaction fees are accounted for

Example:
- Buy BTC on Gate.io at $44,998
- Sell BTC on Bybit at $45,010
- Profit: $12 per BTC (0.0267% or 2.67 basis points)

## 📈 Performance Optimization

1. **Adjust Price Check Interval** - Lower values = more API calls but fresher data
   ```env
   PRICE_CHECK_INTERVAL=3000  # 3 seconds
   ```

2. **Set Minimum Profit Threshold** - Filter out low-margin opportunities
   ```env
   MIN_PROFIT_PERCENTAGE=1.0  # 1% profit minimum
   ```

3. **Monitor API Rate Limits** - Check exchange documentation

## 🛡️ Security Considerations

⚠️ **Important Security Tips:**

1. **Never commit .env files** - They're in .gitignore for a reason
2. **Use API Key Restrictions** - Enable IP whitelisting when possible
3. **Limit API Permissions** - Only enable "Read" access for monitoring
4. **Rotate Keys Regularly** - Change API keys periodically
5. **Use Environment Variables** - Never hardcode credentials
6. **Run on Secure Server** - Use HTTPS in production

## 🐛 Troubleshooting

### "Exchange not initialized" Error
**Solution:** Verify API keys are correctly set in `.env` and the exchange is spelled correctly.

### No Opportunities Found
**Solution:** 
- Check `MIN_PROFIT_PERCENTAGE` isn't too high
- Verify price data is being fetched (check `/api/prices`)
- Ensure you have at least 2 exchanges configured

### API Rate Limit Exceeded
**Solution:**
- Increase `PRICE_CHECK_INTERVAL` to reduce API calls
- Add retry logic with exponential backoff
- Distribute requests across time

### Connection Refused Error
**Solution:**
- Verify the server is running: `npm start`
- Check PORT environment variable
- Ensure firewall allows the port

## 📚 Project Structure

```
arb-backend/
├── src/
│   ├── server.js                 # Express server
│   ├── monitor.js                # Standalone monitor script
│   ├── services/
│   │   ├── exchangeConnector.js  # CCXT exchange wrapper
│   │   ├── exchangeMonitor.js    # Price monitoring service
│   │   └── arbitrageEngine.js    # Opportunity detection
│   └── utils/
│       └── logger.js             # Winston logging
├── logs/                          # Generated log files
├── package.json                   # Dependencies
├── .env.example                   # Configuration template
└── README.md                      # This file
```

## 📦 Dependencies

- **ccxt** - Cryptocurrency exchange APIs
- **express** - Web framework
- **axios** - HTTP client
- **winston** - Logging library
- **node-cache** - In-memory caching
- **redis** - Optional caching backend
- **mongoose** - Optional database
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - See LICENSE file for details

## ⚠️ Disclaimer

This bot is for educational and informational purposes. Cryptocurrency trading involves significant risk. Always:
- Test thoroughly in a safe environment first
- Start with small amounts
- Use sandbox/testnet APIs when available
- Monitor your bot's performance
- Be aware of tax implications
- Implement proper risk management

The creators are not responsible for any financial losses incurred.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review exchange API documentation
3. Check logs in `logs/` directory
4. Open an issue on GitHub

---

**Happy Arbitraging! 🚀💰**
