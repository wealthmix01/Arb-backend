const logger = require('../utils/logger');

class ArbitrageEngine {
  constructor() {
    this.opportunities = [];
    this.totalOpportunities = 0;
    this.profitableOpportunities = 0;
    this.averageProfitPercentage = 0;
    this.minProfitThreshold = parseFloat(process.env.MIN_PROFIT_PERCENTAGE) || 0.5;
    this.monitoringActive = false;
  }

  start() {
    this.monitoringActive = true;
    logger.info(`🔍 Arbitrage Engine started (Min profit threshold: ${this.minProfitThreshold}%)`);
  }

  stop() {
    this.monitoringActive = false;
    logger.info('🔍 Arbitrage Engine stopped');
  }

  analyzeOpportunities(pricesData) {
    this.opportunities = [];
    let profitSum = 0;
    let profitableCount = 0;

    for (const [symbol, exchangePrices] of Object.entries(pricesData)) {
      const exchangeNames = Object.keys(exchangePrices);
      
      // Find best buy and best sell opportunities
      let bestBuy = null;
      let bestSell = null;

      for (const exchangeName of exchangeNames) {
        const priceData = exchangePrices[exchangeName];
        if (!priceData || !priceData.ask) continue;

        if (!bestBuy || priceData.ask < bestBuy.price) {
          bestBuy = { exchange: exchangeName, price: priceData.ask, bid: priceData.bid };
        }

        if (!bestSell || priceData.bid > bestSell.price) {
          bestSell = { exchange: exchangeName, price: priceData.bid, ask: priceData.ask };
        }
      }

      // Calculate profit if opportunities exist
      if (bestBuy && bestSell && bestBuy.exchange !== bestSell.exchange) {
        const profitPercentage = ((bestSell.price - bestBuy.price) / bestBuy.price) * 100;

        if (profitPercentage >= this.minProfitThreshold) {
          const opportunity = {
            symbol,
            buyExchange: bestBuy.exchange,
            buyPrice: bestBuy.price,
            sellExchange: bestSell.exchange,
            sellPrice: bestSell.price,
            profitPercentage: parseFloat(profitPercentage.toFixed(4)),
            profitAmount: bestSell.price - bestBuy.price,
            timestamp: new Date().toISOString()
          };

          this.opportunities.push(opportunity);
          profitSum += profitPercentage;
          profitableCount++;
          this.profitableOpportunities++;
        }
      }

      this.totalOpportunities++;
    }

    if (profitableCount > 0) {
      this.averageProfitPercentage = profitSum / profitableCount;
    }

    return this.opportunities;
  }

  getOpportunitiesBySortOrder(sortBy = 'profit') {
    let sorted = [...this.opportunities];

    if (sortBy === 'profit') {
      sorted.sort((a, b) => b.profitPercentage - a.profitPercentage);
    } else if (sortBy === 'time') {
      sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    return sorted;
  }

  filterOpportunitiesBySymbol(symbol) {
    return this.opportunities.filter(opp => opp.symbol === symbol);
  }
}

module.exports = ArbitrageEngine;
