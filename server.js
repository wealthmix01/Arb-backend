require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

const scanRouter    = require("./routes/scan");
const balanceRouter = require("./routes/balance");
const statusRouter  = require("./routes/status");

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "*" })); // Restrict to your frontend URL in production
app.use(express.json());

// Rate limit: 120 requests per minute per IP
app.use(rateLimit({ windowMs: 60_000, max: 120, message: { error: "Rate limit exceeded" } }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/scan",    scanRouter);
app.use("/api/balance", balanceRouter);
app.use("/api/status",  statusRouter);

// Root health check
app.get("/", (req, res) => res.json({
  status: "ARB ENGINE backend is running ✅",
  docs:   "GET /api/status for full endpoint list"
}));

// Global error handler
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ ok: false, error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ ARB ENGINE backend running on port ${PORT}`);
  console.log(`   Status:  http://localhost:${PORT}/api/status`);
  console.log(`   Scan:    http://localhost:${PORT}/api/scan?token=USDT&fiat=USD`);
  console.log(`   Balance: http://localhost:${PORT}/api/balance\n`);
});
