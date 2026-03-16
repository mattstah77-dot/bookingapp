import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createBot, startBot } from '../bot/index.js';
import apiRouter from './api.js';
import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API роуты
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Статика фронтенда
const distPath = path.join(__dirname, '..');
app.use(express.static(distPath));

// Telegram webhook endpoint
app.post('/webhook', async (req, res) => {
  const bot = createBot();
  if (bot) {
    await bot.handleUpdate(req.body);
  }
  res.send('OK');
});

// SPA fallback (для /admin и других роутов)
app.get('*', (req, res) => {
  // Не отдаём index.html для API запросов
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Запуск сервера
async function start() {
  try {
    // Инициализация базы данных
    await db.init();
    console.log('✅ Database initialized');

    // Запуск сервера
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      
      // Запуск Telegram бота
      const bot = createBot();
      if (bot) {
        await startBot(bot);
      } else {
        console.log('ℹ️ Bot not started (BOT_TOKEN not set)');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();