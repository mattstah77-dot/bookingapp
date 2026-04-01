import { describe, it, expect, vi } from 'vitest';
import { withTimeout, safeExecute, safeExecuteSync, RateLimiter } from '../safeExecute';

describe('withTimeout', () => {
  it('должен вернуть результат если промис выполнился вовремя', async () => {
    const result = await withTimeout(Promise.resolve('success'), 1000);
    expect(result).toBe('success');
  });

  it('должен выбросить ошибку если таймаут истёк', async () => {
    await expect(
      withTimeout(new Promise(r => setTimeout(() => r('slow'), 2000)), 500)
    ).rejects.toThrow('Operation timed out');
  });

  it('должен выбросить кастомное сообщение об ошибке', async () => {
    await expect(
      withTimeout(new Promise(r => setTimeout(() => r('slow'), 2000)), 500, 'Custom timeout')
    ).rejects.toThrow('Custom timeout');
  });
});

describe('safeExecute', () => {
  it('должен вернуть результат при успехе', async () => {
    const result = await safeExecute(async () => 'ok', 'test');
    expect(result).toBe('ok');
  });

  it('должен вернуть null при ошибке', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await safeExecute(async () => {
      throw new Error('test error');
    }, 'test');
    
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

describe('safeExecuteSync', () => {
  it('должен вернуть результат при успехе', () => {
    const result = safeExecuteSync(() => 'ok', 'test');
    expect(result).toBe('ok');
  });

  it('должен вернуть null при ошибке', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = safeExecuteSync(() => {
      throw new Error('sync error');
    }, 'test');
    
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

describe('RateLimiter', () => {
  it('должен разрешить запросы в пределах лимита', () => {
    const limiter = new RateLimiter(3, 1000);
    
    expect(limiter.canSend(1)).toBe(true);
    expect(limiter.canSend(1)).toBe(true);
    expect(limiter.canSend(1)).toBe(true);
  });

  it('должен заблокировать после превышения лимита', () => {
    const limiter = new RateLimiter(2, 1000);
    
    limiter.canSend(1);
    limiter.canSend(1);
    expect(limiter.canSend(1)).toBe(false);
  });

  it('должен использовать разные счётчики для разных botId', () => {
    const limiter = new RateLimiter(1, 1000);
    
    expect(limiter.canSend(1)).toBe(true);
    expect(limiter.canSend(1)).toBe(false);
    expect(limiter.canSend(2)).toBe(true);
  });
});
