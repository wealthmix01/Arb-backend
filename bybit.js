// Bybit P2P price fetcher
const crypto = require("crypto");
const axios  = require("axios");

const BASE = "https://api.bybit.com";

function makeHeaders(apiKey, secret, body = "") {
  const ts  = Date.now().toString();
  const raw = ts + apiKey + "5000" + (typeof body === "string" ? body : JSON.stringify(body));
  const sig = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return {
    "X-BAPI-API-KEY":     apiKey,
    "X-BAPI-TIMESTAMP":   ts,
    "X-BAPI-SIGN":        sig,
    "X-BAPI-RECV-WINDOW": "5000",
    "Content-Type":       "application/json",
  };
}

// Fetch public P2P listings — no auth needed for price scanning
// side: "1" = buy ads (you sell to them), "0" = sell ads (you buy from them)
async function getP2PAds({ tokenId = "USDT", currencyId = "USD", side = "0", page = 1, rows = 10 } = {}) {
  const body = { tokenId, currencyId, side, page, size: rows };
  const res = await axios.post(
    `${BASE}/v5/p2p/item/online`,
    body,
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );
  if (res.data.ret_code !== 0 && res.data.ret_code !== undefined) {
    throw new Error(`Bybit P2P error: ${res.data.ret_msg}`);
  }
  return (res.data.result?.items || []).map(ad => ({
    exchange:   "Bybit",
    adId:       ad.id,
    side:       side === "0" ? "sell" : "buy",
    tokenId,
    currencyId,
    price:      parseFloat(ad.price),
    minAmount:  parseFloat(ad.minAmount),
    maxAmount:  parseFloat(ad.maxAmount),
    available:  parseFloat(ad.quantity),
    payments:   ad.payments?.map(p => p.paymentType) || [],
    traderId:   ad.userId,
    completionRate: ad.recentExecuteRate,
  }));
}

// Get wallet balance (requires API key)
async function getBalance(apiKey, secret, coin = "USDT") {
  const headers = makeHeaders(apiKey, secret, "");
  const res = await axios.get(
    `${BASE}/v5/account/wallet-balance?accountType=FUND&coin=${coin}`,
    { headers, timeout: 10000 }
  );
  if (res.data.retCode !== 0) throw new Error(`Bybit balance: ${res.data.retMsg}`);
  const coins = res.data.result?.list?.[0]?.coin || [];
  const found = coins.find(c => c.coin === coin) || {};
  return {
    exchange:  "Bybit",
    coin,
    available: parseFloat(found.availableToWithdraw || 0),
    total:     parseFloat(found.walletBalance       || 0),
  };
}

module.exports = { getP2PAds, getBalance };
