import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Статика фронтенда (после npm run build)
const distPath = path.join(__dirname, '../dist');

app.use(express.static(distPath));

// API роуты (будущий бэкенд)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Проксирование всех запросов на index.html для React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Здесь можно инициализировать бота
  // initBot();
});
