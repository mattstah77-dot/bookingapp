/**
 * Утилиты для безопасного выполнения операций
 */

// Таймаут для промисов
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

// Безопасное выполнение с логированием
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context: string,
  botId?: number
): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    const tag = botId ? `[Bot:${botId}]` : '[Bot]';
    console.error(`${tag} Error in ${context}:`, {
      message: err?.message || String(err),
      stack: err?.stack,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

// Безопасное выполнение синхронной функции
export function safeExecuteSync<T>(
  fn: () => T,
  context: string,
  botId?: number
): T | null {
  try {
    return fn();
  } catch (err: any) {
    const tag = botId ? `[Bot:${botId}]` : '[Bot]';
    console.error(`${tag} Sync error in ${context}:`, {
      message: err?.message || String(err),
      stack: err?.stack,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

// Простой rate limiter для Telegram API
export class RateLimiter {
  private requests: Map<number, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 30, windowMs: number = 1000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  canSend(botId: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(botId) || [];
    
    // Очищаем старые записи
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    
    if (validTimestamps.length >= this.limit) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(botId, validTimestamps);
    return true;
  }

  // Ждать пока нельзя будет отправить
  async waitAndSend(botId: number): Promise<void> {
    while (!this.canSend(botId)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Глобальный rate limiter (30 msg/sec как по лимиту Telegram)
export const globalRateLimiter = new RateLimiter(30, 1000);
