require('dotenv').config();
const logger = require('./utils/logger');
const ExchangeMonitor = require('./services/exchangeMonitor');
const ArbitrageEngine = require('./services/arbitrageEngine');

// Standalone monitoring script
const exchangeMonitor = new ExchangeMonitor();
const arbitrageEngine = new ArbitrageEngine();

const main = async () => {
  try {
    logger.info('🚀 Starting P2P Arbitrage Bot Monitor...');
    logger.info(`📊 Monitoring ${Object.keys(exchangeMonitor.exchanges).length} exchanges`);
    
    // Start monitoring
    await exchangeMonitor.startMonitoring();
    arbitrageEngine.start();
    
    // Print opportunities every 10 seconds
    setInterval(() => {
      const opportunities = arbitrageEngine.opportunities;
      if (opportunities.length > 0) {
        logger.info(`💰 Found ${opportunities.length} arbitrage opportunities!`);
        opportunities.forEach((opp, idx) => {
          logger.info(`  [${idx + 1}] ${opp.symbol}: Buy on ${opp.buyExchange} @ ${opp.buyPrice} → Sell on ${opp.sellExchange} @ ${opp.sellPrice} (${opp.profitPercentage.toFixed(2)}% profit)`);
        });
      }
    }, 10000);
    
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  logger.info('\n👋 Shutting down monitor...');
  exchangeMonitor.stopMonitoring();
  arbitrageEngine.stop();
  process.exit(0);
});

main();
