const ccxt = require('ccxt');
const logger = require('../utils/logger');

class ExchangeMonitor {
  constructor() {
    this.exchanges = {
      binance: new ccxt.binance(),
      bybit: new ccxt.bybit(),
      gateio: new ccxt.gateio(),
      kraken: new ccxt.kraken(),
    };
    this.prices = {};
    this.monitoring = false;
    this.monitoringInterval = null;
  }

  async getPrices() {
    try {
      const allPrices = {};
      
      for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
        try {
          const ticker = await exchange.fetchTicker('BTC/USDT');
          allPrices[exchangeName] = {
            symbol: 'BTC/USDT',
            bid: ticker.bid,
            ask: ticker.ask,
            last: ticker.last,
            timestamp: ticker.timestamp,
          };
        } catch (error) {
          logger.warn(`Error fetching price from ${exchangeName}:`, error.message);
          allPrices[exchangeName] = { error: error.message };
        }
      }
      
      this.prices = allPrices;
      return allPrices;
    } catch (error) {
      logger.error('Error in getPrices:', error);
      throw error;
    }
  }

  async getPricesBySymbol(symbol) {
    try {
      const allPrices = {};
      
      for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
        try {
          const ticker = await exchange.fetchTicker(symbol);
          allPrices[exchangeName] = {
            symbol: symbol,
            bid: ticker.bid,
            ask: ticker.ask,
            last: ticker.last,
            timestamp: ticker.timestamp,
          };
        } catch (error) {
          logger.warn(`Error fetching ${symbol} from ${exchangeName}:`, error.message);
          allPrices[exchangeName] = { error: error.message };
        }
      }
      
      return allPrices;
    } catch (error) {
      logger.error(`Error in getPricesBySymbol for ${symbol}:`, error);
      throw error;
    }
  }

  startMonitoring() {
    if (this.monitoring) {
      logger.info('Monitoring already started');
      return;
    }
    
    this.monitoring = true;
    logger.info('Starting price monitoring...');
    
    // Fetch prices immediately
    this.getPrices();
    
    // Then fetch every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.getPrices()
        .then(() => logger.debug('Prices updated'))
        .catch(error => logger.error('Error updating prices:', error));
    }, 30000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.monitoring = false;
    logger.info('Price monitoring stopped');
  }
}

module.exports = ExchangeMonitor;
