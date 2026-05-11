// Binance P2P price fetcher (public endpoint — no auth needed for scanning)
const axios = require("axios");

const BASE = "https://p2p.binance.com";

async function getP2PAds({ asset = "USDT", fiat = "USD", tradeType = "BUY", page = 1, rows = 10 } = {}) {
  const body = {
    asset, fiat, tradeType,
    page, rows,
    publisherType: null,
    payTypes: [],
  };
  const res = await axios.post(
    `${BASE}/bapi/c2c/v2/friendly/c2c/adv/search`,
    body,
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    }
  );
  return (res.data?.data || []).map(item => {
    const adv = item.adv || {};
    return {
      exchange:   "Binance",
      adId:       adv.advNo,
      side:       tradeType === "BUY" ? "sell" : "buy",
      tokenId:    asset,
      currencyId: fiat,
      price:      parseFloat(adv.price),
      minAmount:  parseFloat(adv.minSingleTransAmount),
      maxAmount:  parseFloat(adv.maxSingleTransAmount),
      available:  parseFloat(adv.tradableQuantity),
      payments:   (adv.tradeMethods || []).map(m => m.tradeMethodName),
      traderId:   item.advertiser?.userNo,
      completionRate: item.advertiser?.monthFinishRate,
    };
  });
}

module.exports = { getP2PAds };
