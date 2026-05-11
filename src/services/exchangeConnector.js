const ccxt = require('ccxt');
const logger = require('../utils/logger');

class ExchangeConnector {
  constructor() {
    this.exchanges = {};
    this.initializeExchanges();
  }

  initializeExchanges() {
    // Bybit
    if (process.env.BYBIT_API_KEY && process.env.BYBIT_SECRET) {
      this.exchanges.bybit = new ccxt.bybit({
        apiKey: process.env.BYBIT_API_KEY,
        secret: process.env.BYBIT_SECRET,
        sandbox: process.env.BYBIT_TESTNET === 'true'
      });
    }

    // Bitget
    if (process.env.BITGET_API_KEY && process.env.BITGET_SECRET) {
      this.exchanges.bitget = new ccxt.bitget({
        apiKey: process.env.BITGET_API_KEY,
        secret: process.env.BITGET_SECRET,
        password: process.env.BITGET_PASSPHRASE
      });
    }

    // Gate.io
    if (process.env.GATEIO_API_KEY && process.env.GATEIO_SECRET) {
      this.exchanges.gateio = new ccxt.gate({
        apiKey: process.env.GATEIO_API_KEY,
        secret: process.env.GATEIO_SECRET,
        uid: process.env.GATEIO_UID
      });
    }

    // Binance (optional)
    if (process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET) {
      this.exchanges.binance = new ccxt.binance({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_SECRET
      });
    }

    // Kraken (optional)
    if (process.env.KRAKEN_API_KEY && process.env.KRAKEN_SECRET) {
      this.exchanges.kraken = new ccxt.kraken({
        apiKey: process.env.KRAKEN_API_KEY,
        secret: process.env.KRAKEN_SECRET
      });
    }

    logger.info(`Initialized ${Object.keys(this.exchanges).length} exchanges`);
  }

  async fetchTicker(exchangeName, symbol) {
    try {
      const exchange = this.exchanges[exchangeName];
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not initialized`);
      }
      return await exchange.fetchTicker(symbol);
    } catch (error) {
      logger.error(`Error fetching ticker from ${exchangeName}:`, error.message);
      return null;
    }
  }

  async fetchOrderBook(exchangeName, symbol, limit = 5) {
    try {
      const exchange = this.exchanges[exchangeName];
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not initialized`);
      }
      return await exchange.fetchOrderBook(symbol, limit);
    } catch (error) {
      logger.error(`Error fetching order book from ${exchangeName}:`, error.message);
      return null;
    }
  }

  async getSymbols(exchangeName) {
    try {
      const exchange = this.exchanges[exchangeName];
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not initialized`);
      }
      if (!exchange.symbols) {
        await exchange.loadMarkets();
      }
      return exchange.symbols;
    } catch (error) {
      logger.error(`Error fetching symbols from ${exchangeName}:`, error.message);
      return [];
    }
  }

  getExchangeNames() {
    return Object.keys(this.exchanges);
  }
}

module.exports = ExchangeConnector;
