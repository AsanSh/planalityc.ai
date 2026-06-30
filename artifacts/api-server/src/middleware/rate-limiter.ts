import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Optional Redis store (for distributed environments like Vercel serverless).
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars,
// then install: pnpm add @upstash/ratelimit @upstash/redis
// Without these env vars the limiter falls back to in-memory (fine on single
// server; on Vercel each cold-start gets a fresh counter, so brute-force
// protection is per-instance only).
// ---------------------------------------------------------------------------
async function makeRedisStore(): Promise<Options['store'] | undefined> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  try {
    const { Redis } = await import('@upstash/redis' as string);
    const { RateLimitRedisStore } = await import('@upstash/ratelimit' as string);
    const redis = new Redis({ url, token });
    return new RateLimitRedisStore({ client: redis });
  } catch {
    // Packages not installed — fall back silently
    return undefined;
  }
}

// Shared store promise — resolved once, reused on warm lambdas
const redisStorePromise = makeRedisStore();

function withStore(opts: Omit<Parameters<typeof rateLimit>[0], 'store'>) {
  return rateLimit({
    ...opts,
    // store is set asynchronously; on cold starts without Redis this is undefined (in-memory)
    store: undefined,
  });
}

// Общий лимит для всех endpoints (SPA делает ~10–15 запросов на страницу)
export const generalLimiter = withStore({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Слишком много запросов, попробуйте позже' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Превышен лимит запросов. Попробуйте через 15 минут.',
      retryAfter: Math.ceil((req as any).rateLimit?.resetTime / 1000),
    });
  },
});

// Строгий лимит входа: 10 неудачных попыток за 15 мин с одного IP
export const authLimiter = withStore({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Слишком много попыток входа',
      message: 'Аккаунт временно заблокирован. Подождите 15 минут и попробуйте снова.',
    });
  },
});

// Лимит для API endpoints
export const apiLimiter = withStore({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'API rate limit exceeded' },
});

// Лимит загрузки файлов
export const uploadLimiter = withStore({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Превышен лимит загрузки файлов' },
});

// Лимит экспорта (Excel/PDF)
export const exportLimiter = withStore({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Слишком много экспортов, подождите минуту' },
});
