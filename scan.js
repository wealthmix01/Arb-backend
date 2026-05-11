// GET /api/scan?token=USDT&fiat=USD
// GET /api/scan/multi?pairs=USDT:USD,USDT:NGN,USDT:KES
const express = require("express");
const { scan } = require("../utils/scanner");

const router = express.Router();

// Single pair scan
router.get("/", async (req, res, next) => {
  try {
    const token = (req.query.token || "USDT").toUpperCase();
    const fiat  = (req.query.fiat  || "USD").toUpperCase();
    const result = await scan(token, fiat);
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
});

// Multi-pair scan — scan several pairs in one request
router.get("/multi", async (req, res, next) => {
  try {
    // pairs = comma-separated TOKEN:FIAT e.g. "USDT:USD,USDT:NGN,USDT:KES"
    const raw   = req.query.pairs || "USDT:USD";
    const pairs = raw.split(",").map(p => {
      const [token, fiat] = p.trim().split(":");
      return { token: (token || "USDT").toUpperCase(), fiat: (fiat || "USD").toUpperCase() };
    }).slice(0, 8); // max 8 pairs per request

    const results = await Promise.allSettled(pairs.map(p => scan(p.token, p.fiat)));

    const data = results.map((r, i) => ({
      pair: `${pairs[i].token}/${pairs[i].fiat}`,
      ok:   r.status === "fulfilled",
      data: r.status === "fulfilled" ? r.value : null,
      error: r.status === "rejected"  ? r.reason?.message : null,
    }));

    // Flatten all opportunities across all pairs, sorted by net spread
    const allOpps = data
      .filter(d => d.ok && d.data?.opportunities)
      .flatMap(d => d.data.opportunities)
      .sort((a, b) => b.netSpreadPct - a.netSpreadPct);

    res.json({ ok: true, pairCount: pairs.length, totalOpportunities: allOpps.length, pairs: data, topOpportunities: allOpps.slice(0, 20) });
  } catch (err) { next(err); }
});

module.exports = router;
