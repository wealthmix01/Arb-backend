const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const ExchangeConnector = require('./exchangeConnector');

class ExchangeMonitor {
  constructor() {
    this.connector = new ExchangeConnector();
    this.exchanges = this.connector.exchanges;
    this.cache = new NodeCache({ stdTTL: 10 }); // Cache prices for 10 seconds
    this.monitoringActive = false;
    this.pricesCache = {};
    this.commonSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
  }

  async startMonitoring() {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    logger.info('📊 Exchange Monitor started');
    
    // Continuous monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.updatePrices();
    }, parseInt(process.env.PRICE_CHECK_INTERVAL) || 5000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.monitoringActive = false;
    logger.info('📊 Exchange Monitor stopped');
  }

  async updatePrices() {
    const prices = {};
    
    for (const symbol of this.commonSymbols) {
      prices[symbol] = {};
      
      for (const exchangeName of Object.keys(this.exchanges)) {
        try {
          const ticker = await this.connector.fetchTicker(exchangeName, symbol);
          if (ticker) {
            prices[symbol][exchangeName] = {
              bid: ticker.bid,
              ask: ticker.ask,
              last: ticker.last,
              timestamp: new Date().toISOString()
            };
          }
        } catch (error) {
          // Silently skip errors for individual symbols/exchanges
        }
      }
    }
    
    this.pricesCache = prices;
  }

  async getPrices() {
    if (Object.keys(this.pricesCache).length === 0) {
      await this.updatePrices();
    }
    return this.pricesCache;
  }

  async getPricesBySymbol(symbol) {
    const normalizedSymbol = symbol.toUpperCase().includes('/') ? symbol.toUpperCase() : `${symbol}/USDT`;
    
    if (!this.pricesCache[normalizedSymbol]) {
      await this.updatePrices();
    }
    
    return {
      symbol: normalizedSymbol,
      prices: this.pricesCache[normalizedSymbol] || {}
    };
  }

  getCommonPairs() {
    return this.commonSymbols;
  }
}

module.exports = ExchangeMonitor;
