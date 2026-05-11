const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const ExchangeMonitor = require('./services/exchangeMonitor');
const ArbitrageEngine = require('./services/arbitrageEngine');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Initialize services
const exchangeMonitor = new ExchangeMonitor();
const arbitrageEngine = new ArbitrageEngine();

let isMonitoring = false;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    monitoring: isMonitoring,
    exchanges: Object.keys(exchangeMonitor.exchanges).length
  });
});

// Get all exchanges
app.get('/api/exchanges', (req, res) => {
  res.json({
    exchanges: Object.keys(exchangeMonitor.exchanges),
    count: Object.keys(exchangeMonitor.exchanges).length
  });
});

// Get current prices across exchanges
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await exchangeMonitor.getPrices();
    res.json(prices);
  } catch (error) {
    logger.error('Error fetching prices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get prices for specific symbol
app.get('/api/prices/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const prices = await exchangeMonitor.getPricesBySymbol(symbol);
    res.json(prices);
  } catch (error) {
    logger.error('Error fetching prices for symbol:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get arbitrage opportunities
app.get('/api/opportunities', async (req, res) => {
  try {
    const opportunities = arbitrageEngine.opportunities;
    res.json({
      count: opportunities.length,
      opportunities
    });
  } catch (error) {
    logger.error('Error fetching opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get performance stats
app.get('/api/stats', (req, res) => {
  try {
    res.json({
      totalOpportunitiesFound: arbitrageEngine.totalOpportunities,
      profitableOpportunities: arbitrageEngine.profitableOpportunities,
      averageProfitPercentage: arbitrageEngine.averageProfitPercentage,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start monitoring
app.post('/api/monitor/start', async (req, res) => {
  try {
    if (!isMonitoring) {
      await exchangeMonitor.startMonitoring();
      arbitrageEngine.start();
      isMonitoring = true;
      logger.info('Monitoring started');
    }
    res.json({ status: 'Monitoring started', monitoring: isMonitoring });
  } catch (error) {
    logger.error('Error starting monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop monitoring
app.post('/api/monitor/stop', (req, res) => {
  try {
    exchangeMonitor.stopMonitoring();
    arbitrageEngine.stop();
    isMonitoring = false;
    logger.info('Monitoring stopped');
    res.json({ status: 'Monitoring stopped', monitoring: isMonitoring });
  } catch (error) {
    logger.error('Error stopping monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Arbitrage Bot Server running on port ${PORT}`);
});

module.exports = app;
