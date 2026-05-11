// GET /api/status — health check + which exchanges are configured
const express = require("express");
const router  = express.Router();

router.get("/", (req, res) => {
  const exchanges = {
    Bybit:   !!(process.env.BYBIT_API_KEY   && process.env.BYBIT_API_SECRET),
    "Gate.io": !!(process.env.GATEIO_API_KEY && process.env.GATEIO_API_SECRET),
    Binance: !!(process.env.BINANCE_API_KEY  && process.env.BINANCE_API_SECRET),
    OKX:     !!(process.env.OKX_API_KEY      && process.env.OKX_API_SECRET),
  };

  const connectedCount = Object.values(exchanges).filter(Boolean).length;

  res.json({
    ok:       true,
    service:  "ARB ENGINE backend",
    version:  "2.0.0",
    uptime:   Math.floor(process.uptime()),
    exchanges,
    connectedExchanges: connectedCount,
    settings: {
      cacheTTL:    parseInt(process.env.CACHE_TTL   || "15"),
      minSpreadPct: parseFloat(process.env.MIN_SPREAD_PCT || "1.5"),
    },
    endpoints: {
      singleScan: "GET /api/scan?token=USDT&fiat=USD",
      multiScan:  "GET /api/scan/multi?pairs=USDT:USD,USDT:NGN,USDT:KES",
      balance:    "GET /api/balance?coin=USDT",
      status:     "GET /api/status",
    },
    checkedAt: new Date().toISOString(),
  });
});

module.exports = router;
