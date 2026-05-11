// GET /api/balance — fetch wallet balances from all connected exchanges
const express = require("express");
const bybit  = require("../exchanges/bybit");
const gateio = require("../exchanges/gateio");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const coin = (req.query.coin || "USDT").toUpperCase();

    // Only query exchanges where keys are set in environment
    const tasks = [];

    if (process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET) {
      tasks.push(
        bybit.getBalance(process.env.BYBIT_API_KEY, process.env.BYBIT_API_SECRET, coin)
          .catch(e => ({ exchange: "Bybit",   coin, error: e.message, available: null, total: null }))
      );
    }

    if (process.env.GATEIO_API_KEY && process.env.GATEIO_API_SECRET) {
      tasks.push(
        gateio.getBalance(process.env.GATEIO_API_KEY, process.env.GATEIO_API_SECRET, coin)
          .catch(e => ({ exchange: "Gate.io", coin, error: e.message, available: null, total: null }))
      );
    }

    if (tasks.length === 0) {
      return res.json({ ok: true, note: "No API keys configured — add them to Railway environment variables", balances: [] });
    }

    const balances = await Promise.all(tasks);
    const total = balances.reduce((sum, b) => sum + (b.available || 0), 0);

    res.json({ ok: true, coin, balances, totalAvailable: parseFloat(total.toFixed(4)), fetchedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

module.exports = router;
