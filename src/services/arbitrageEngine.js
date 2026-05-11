const logger = require('../utils/logger');

class ArbitrageEngine {
  constructor() {
    this.opportunities = [];
    this.totalOpportunities = 0;
    this.profitableOpportunities = 0;
    this.totalProfit = 0;
    this.running = false;
    this.scanInterval = null;
    this.minProfitThreshold = parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5');
  }

  start() {
    if (this.running) {
      logger.info('Arbitrage Engine already running');
      return;
    }
    
    this.running = true;
    logger.info(`Arbitrage Engine started with ${this.minProfitThreshold}% profit threshold`);
    
    // Scan immediately
    this.scan();
    
    // Then scan every 60 seconds
    this.scanInterval = setInterval(() => {
      this.scan()
        .then(() => logger.debug('Arbitrage scan completed'))
        .catch(error => logger.error('Error during arbitrage scan:', error));
    }, 60000);
  }

  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    this.running = false;
    logger.info('Arbitrage Engine stopped');
  }

  async scan() {
    try {
      // This is a mock scan - replace with real arbitrage logic
      const newOpportunities = this.generateMockOpportunities();
      this.opportunities = newOpportunities;
      this.totalOpportunities += newOpportunities.length;
      
      const profitable = newOpportunities.filter(opp => opp.profitPercentage >= this.minProfitThreshold);
      this.profitableOpportunities += profitable.length;
      
      if (profitable.length > 0) {
        this.totalProfit += profitable.reduce((sum, opp) => sum + opp.profitPercentage, 0);
        logger.info(`Found ${profitable.length} profitable opportunities`);
      }
      
      return newOpportunities;
    } catch (error) {
      logger.error('Error during arbitrage scan:', error);
      throw error;
    }
  }

  generateMockOpportunities() {
    // Mock data - replace with real price comparison logic
    const random = Math.random();
    if (random < 0.3) {
      return [
        {
          symbol: 'BTC/USDT',
          buyExchange: 'binance',
          buyPrice: 42000,
          sellExchange: 'bybit',
          sellPrice: 42150,
          profitPercentage: 0.36,
          timestamp: new Date().toISOString(),
        },
      ];
    }
    return [];
  }

  get averageProfitPercentage() {
    if (this.profitableOpportunities === 0) return 0;
    return (this.totalProfit / this.profitableOpportunities).toFixed(4);
  }
}

module.exports = ArbitrageEngine;
