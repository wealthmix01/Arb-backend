// Gate.io P2P price fetcher
const crypto = require("crypto");
const axios  = require("axios");

const BASE = "https://api.gateio.ws";

function makeHeaders(apiKey, secret, method, path, body = "") {
  const ts      = Math.floor(Date.now() / 1000).toString();
  const bodyhash = crypto.createHash("sha512").update(body).digest("hex");
  const raw     = `${method}\n${path}\n\n${bodyhash}\n${ts}`;
  const sig     = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  return {
    "KEY":          apiKey,
    "SIGN":         sig,
    "Timestamp":    ts,
    "Content-Type": "application/json",
    "Accept":       "application/json",
  };
}

// Fetch P2P ads — public endpoint, no auth required for price reading
// side: "buy" = ads where you can sell crypto, "sell" = ads where you can buy crypto
async function getP2PAds({ currency = "USDT", fiat = "USD", side = "sell", page = 1, limit = 10 } = {}) {
  const path = `/api/v4/p2p/ads`;
  const params = `currency=${currency}&fiat_currency=${fiat}&side=${side}&page=${page}&limit=${limit}`;
  const res = await axios.get(`${BASE}${path}?${params}`, {
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    timeout: 10000,
  });
  return (res.data || []).map(ad => ({
    exchange:   "Gate.io",
    adId:       ad.id,
    side:       side === "sell" ? "sell" : "buy",
    tokenId:    currency,
    currencyId: fiat,
    price:      parseFloat(ad.price),
    minAmount:  parseFloat(ad.min_amount),
    maxAmount:  parseFloat(ad.max_amount),
    available:  parseFloat(ad.available_amount),
    payments:   ad.pay_methods?.map(p => p.name) || [],
    traderId:   ad.user_id,
    completionRate: ad.finish_rate,
  }));
}

// Get wallet balance (requires API key)
async function getBalance(apiKey, secret, currency = "USDT") {
  const path = `/api/v4/wallet/total_balance`;
  const headers = makeHeaders(apiKey, secret, "GET", path);
  const res = await axios.get(`${BASE}${path}`, { headers, timeout: 10000 });
  const details = res.data?.details || {};
  return {
    exchange:  "Gate.io",
    coin:      currency,
    available: parseFloat(details[currency]?.amount || 0),
    total:     parseFloat(details[currency]?.amount || 0),
  };
}

module.exports = { getP2PAds, getBalance };
