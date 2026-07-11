export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}, 300_000);

export function checkRateLimit(key: string, options: RateLimiterOptions): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (bucket.count >= options.maxRequests) {
    return false;
  }

  bucket.count++;
  return true;
}

export function getRateLimitHeaders(key: string, options: RateLimiterOptions): Record<string, string> {
  const now = Date.now();
  const bucket = buckets.get(key);
  const remaining = bucket && now <= bucket.resetAt
    ? Math.max(0, options.maxRequests - bucket.count)
    : options.maxRequests;
  const resetAt = bucket ? bucket.resetAt : now + options.windowMs;

  return {
    'X-RateLimit-Limit': String(options.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}
