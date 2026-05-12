const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();
const logger = require('./utils/logger');
const ExchangeMonitor = require('./services/exchangeMonitor');
const ArbitrageEngine = require('./services/arbitrageEngine');

// Telegram
const TelegramBot = require('node-telegram-bot-api');
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let bot;
if (TELEGRAM_TOKEN) {
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  logger.info('Telegram bot initialized');
} else {
  logger.warn('No TELEGRAM_BOT_TOKEN set — Telegram disabled');
}

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

// Telegram helper
function sendTelegram(message) {
  if (bot && TELEGRAM_CHAT_ID) {
    bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
  }
}

// Telegram commands
if (bot) {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `🤖 *Arbitrage Bot Online*\n\nCommands:\n/status - Check bot status\n/monitor - Start monitoring\n/stop - Stop monitoring\n/opportunities - Latest opportunities\n/stats - Performance stats`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/status/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `📊 *Status*\nMonitoring: ${isMonitoring ? '✅ Active' : '❌ Inactive'}\nExchanges: ${Object.keys(exchangeMonitor.exchanges).length}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/monitor/, async (msg) => {
    try {
      if (!isMonitoring) {
        await exchangeMonitor.startMonitoring();
        arbitrageEngine.start();
        isMonitoring = true;
        bot.sendMessage(msg.chat.id, '✅ *Monitoring started!* I will alert you when opportunities are found.', { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(msg.chat.id, '⚠️ Already monitoring!');
      }
    } catch (error) {
      bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
  });

  bot.onText(/\/stop/, (msg) => {
    exchangeMonitor.stopMonitoring();
    arbitrageEngine.stop();
    isMonitoring = false;
    bot.sendMessage(msg.chat.id, '🛑 *Monitoring stopped.*', { parse_mode: 'Markdown' });
  });

  bot.onText(/\/opportunities/, (msg) => {
    const opportunities = arbitrageEngine.opportunities;
    if (!opportunities || opportunities.length === 0) {
      bot.sendMessage(msg.chat.id, '🔍 No opportunities found yet. Make sure monitoring is running with /monitor');
      return;
    }
    const top5 = opportunities.slice(0, 5);
    let message = `💰 *Top Opportunities*\n\n`;
    top5.forEach((opp, i) => {
      message += `${i + 1}. *${opp.symbol}*\n`;
      message += `   Buy: ${opp.buyExchange} @ $${opp.buyPrice}\n`;
      message += `   Sell: ${opp.sellExchange} @ $${opp.sellPrice}\n`;
      message += `   Profit: ${opp.profitPercentage}%\n\n`;
    });
    bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/stats/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `📈 *Stats*\nTotal Opportunities: ${arbitrageEngine.totalOpportunities || 0}\nProfitable: ${arbitrageEngine.profitableOpportunities || 0}\nUptime: ${Math.floor(process.uptime() / 60)} minutes`,
      { parse_mode: 'Markdown' }
    );
  });
}

// Notify on new opportunity
arbitrageEngine.on && arbitrageEngine.on('opportunity', (opp) => {
  sendTelegram(
    `🚨 *Arbitrage Opportunity!*\n\n*${opp.symbol}*\nBuy: ${opp.buyExchange} @ $${opp.buyPrice}\nSell: ${opp.sellExchange} @ $${opp.sellPrice}\nProfit: ${opp.profitPercentage}%`
  );
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    monitoring: isMonitoring,
    exchanges: Object.keys(exchangeMonitor.exchanges).length
  });
});

app.get('/api/exchanges', (req, res) => {
  res.json({
    exchanges: Object.keys(exchangeMonitor.exchanges),
    count: Object.keys(exchangeMonitor.exchanges).length
  });
});

app.get('/api/prices', async (req, res) => {
  try {
    const prices = await exchangeMonitor.getPrices();
    res.json(prices);
  } catch (error) {
    logger.error('Error fetching prices:', error);
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/opportunities', async (req, res) => {
  try {
    const opportunities = arbitrageEngine.opportunities;
    res.json({ count: opportunities.length, opportunities });
  } catch (error) {
    logger.error('Error fetching opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

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

app.post('/api/monitor/start', async (req, res) => {
  try {
    if (!isMonitoring) {
      await exchangeMonitor.startMonitoring();
      arbitrageEngine.start();
      isMonitoring = true;
      sendTelegram('✅ Monitoring started via API');
      logger.info('Monitoring started');
    }
    res.json({ status: 'Monitoring started', monitoring: isMonitoring });
  } catch (error) {
    logger.error('Error starting monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/monitor/stop', (req, res) => {
  try {
    exchangeMonitor.stopMonitoring();
    arbitrageEngine.stop();
    isMonitoring = false;
    sendTelegram('🛑 Monitoring stopped via API');
    logger.info('Monitoring stopped');
    res.json({ status: 'Monitoring stopped', monitoring: isMonitoring });
  } catch (error) {
    logger.error('Error stopping monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Arbitrage Bot Server running on port ${PORT}`);
  sendTelegram('🚀 Arbitrage Bot started successfully!');
});

module.exports = app;
