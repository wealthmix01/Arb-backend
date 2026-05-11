// Core arbitrage scanner — compares P2P prices across all exchanges
const bybit   = require("../exchanges/bybit");
const gateio  = require("../exchanges/gateio");
const binance = require("../exchanges/binance");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL || "15") });
const MIN_SPREAD = parseFloat(process.env.MIN_SPREAD_PCT || "1.5");

// Typical P2P fees per exchange (maker + taker estimate)
const FEES = { Bybit: 0.002, "Gate.io": 0.002, Binance: 0.001 };

// Fetch ads from all available exchanges for a given pair
async function fetchAllAds(token, fiat) {
  const results = [];
  const tasks = [
    // Bybit: side "0" = sell ads (best prices to BUY from)
    bybit.getP2PAds({ tokenId: token, currencyId: fiat, side: "0", rows: 5 })
      .then(ads => results.push(...ads))
      .catch(e => console.warn("[Bybit scan]", e.message)),

    // Gate.io: side "sell" = sell ads (best prices to BUY from)
    gateio.getP2PAds({ currency: token, fiat, side: "sell", limit: 5 })
      .then(ads => results.push(...ads))
      .catch(e => console.warn("[Gate.io scan]", e.message)),

    // Binance: BUY ads = ads where you can buy crypto
    binance.getP2PAds({ asset: token, fiat, tradeType: "BUY", rows: 5 })
      .then(ads => results.push(...ads))
      .catch(e => console.warn("[Binance scan]", e.message)),
  ];
  await Promise.allSettled(tasks);
  return results;
}

// Find the best buy price (lowest) and best sell price (highest) across exchanges
function findBestPrices(ads) {
  const byExchange = {};
  for (const ad of ads) {
    if (!byExchange[ad.exchange]) byExchange[ad.exchange] = { buys: [], sells: [] };
    // "sell" side ad = someone selling crypto = we can BUY from them
    if (ad.side === "sell") byExchange[ad.exchange].buys.push(ad);
    // "buy" side ad  = someone buying crypto  = we can SELL to them
    if (ad.side === "buy")  byExchange[ad.exchange].sells.push(ad);
  }
  // Best BUY = lowest ask price across all exchanges
  const allBuys  = ads.filter(a => a.side === "sell").sort((a, b) => a.price - b.price);
  const allSells = ads.filter(a => a.side === "buy" ).sort((a, b) => b.price - a.price);
  return { byExchange, bestBuy: allBuys[0] || null, bestSell: allSells[0] || null };
}

// Build opportunity objects for any profitable cross-exchange combinations
function buildOpportunities(ads, token, fiat) {
  const opportunities = [];
  const sellAds = ads.filter(a => a.side === "sell"); // we buy from these
  const buyAds  = ads.filter(a => a.side === "buy");  // we sell to these

  for (const buyFrom of sellAds) {
    for (const sellTo of buyAds) {
      // Must be different exchanges
      if (buyFrom.exchange === sellTo.exchange) continue;

      const buyFee  = FEES[buyFrom.exchange] || 0.002;
      const sellFee = FEES[sellTo.exchange]  || 0.002;
      const totalFee = buyFee + sellFee;

      const grossSpread = (sellTo.price - buyFrom.price) / buyFrom.price;
      const netSpread   = grossSpread - totalFee;

      if (netSpread * 100 < MIN_SPREAD) continue;

      // Tradeable volume = min of both sides' available liquidity
      const tradeableVol = Math.min(buyFrom.available, sellTo.available, buyFrom.maxAmount / buyFrom.price);
      if (tradeableVol < 1) continue; // skip dust

      const estProfit100  = 100 * netSpread; // profit on $100 capital
      const estProfit1000 = 1000 * netSpread;

      opportunities.push({
        id:           `${buyFrom.exchange}-${sellTo.exchange}-${token}-${fiat}-${Date.now()}`,
        token,
        fiat,
        buyExchange:  buyFrom.exchange,
        sellExchange: sellTo.exchange,
        buyPrice:     buyFrom.price,
        sellPrice:    sellTo.price,
        grossSpreadPct: parseFloat((grossSpread * 100).toFixed(3)),
        feePct:         parseFloat((totalFee   * 100).toFixed(3)),
        netSpreadPct:   parseFloat((netSpread  * 100).toFixed(3)),
        buyAdId:      buyFrom.adId,
        sellAdId:     sellTo.adId,
        buyPayments:  buyFrom.payments,
        sellPayments: sellTo.payments,
        tradeableVol: parseFloat(tradeableVol.toFixed(4)),
        estProfit100:  parseFloat(estProfit100.toFixed(4)),
        estProfit1000: parseFloat(estProfit1000.toFixed(4)),
        buyMinAmount:  buyFrom.minAmount,
        buyMaxAmount:  buyFrom.maxAmount,
        sellMinAmount: sellTo.minAmount,
        sellMaxAmount: sellTo.maxAmount,
        buyCompletion:  buyFrom.completionRate,
        sellCompletion: sellTo.completionRate,
        status:  netSpread * 100 > 3.5 ? "HOT" : netSpread * 100 > 2 ? "GOOD" : "FAIR",
        scannedAt: new Date().toISOString(),
      });
    }
  }

  return opportunities.sort((a, b) => b.netSpreadPct - a.netSpreadPct);
}

// Main scan function — cached per token/fiat pair
async function scan(token = "USDT", fiat = "USD") {
  const key = `scan:${token}:${fiat}`;
  const cached = cache.get(key);
  if (cached) return { ...cached, cached: true };

  const ads = await fetchAllAds(token, fiat);
  const { bestBuy, bestSell } = findBestPrices(ads);
  const opportunities = buildOpportunities(ads, token, fiat);

  const result = {
    token, fiat,
    opportunityCount: opportunities.length,
    bestBuyPrice:  bestBuy?.price  || null,
    bestBuyEx:     bestBuy?.exchange || null,
    bestSellPrice: bestSell?.price || null,
    bestSellEx:    bestSell?.exchange || null,
    opportunities,
    totalAdsScanned: ads.length,
    scannedAt: new Date().toISOString(),
    cached: false,
  };

  cache.set(key, result);
  return result;
}

module.exports = { scan };
