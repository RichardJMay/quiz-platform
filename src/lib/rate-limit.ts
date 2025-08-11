// src/lib/rate-limit.ts
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  // Clean up expired entries
  if (store[key] && now > store[key].resetTime) {
    delete store[key];
  }

  // Initialize or increment
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
  } else {
    store[key].count++;
  }

  const success = store[key].count <= limit;
  const remaining = Math.max(0, limit - store[key].count);

  return { 
    success, 
    remaining, 
    resetTime: store[key].resetTime 
  };
}

// Helper to get client IP for rate limiting
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  return 'unknown';
}