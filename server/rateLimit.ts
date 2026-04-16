// Простой in-memory rate limiter для webhook
// Ограничение: 60 запросов в секунду на IP

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Rate limit: IP → { count, resetTime }
const rateLimitMap = new Map<string, RateLimitEntry>();

// Ограничение: 60 запросов в секунду
const RATE_LIMIT = 60;
const WINDOW_MS = 1000; // 1 секунда

/**
 * Проверить, не превышен ли rate limit для IP
 * @returns true если запрос разрешён, false если заблокирован
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    // Новая окно или истёкшее - сбрасываем счётчик
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return true;
  }
  
  // Проверяем лимит
  if (entry.count >= RATE_LIMIT) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
    return false;
  }
  
  // Увеличиваем счётчик
  entry.count++;
  return true;
}

/**
 * Очистить старые записи rate limit (вызывать периодически)
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

// Запускаем cleanup каждые 5 минут
setInterval(cleanupRateLimit, 5 * 60 * 1000);

/**
 * Получить IP из запроса
 */
export function getClientIp(req: any): string {
  // Проверяем x-forwarded-for для прокси/балансировщика
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}
