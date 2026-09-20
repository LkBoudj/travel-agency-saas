import { Injectable } from '@nestjs/common';

/** One counter bucket: how many hits so far, and when the window resets. */
interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the caller may retry. Only meaningful when blocked. */
  retryAfterSeconds: number;
}

/**
 * A fixed-window counter, in process memory.
 *
 * Deliberately dependency-free: `@nestjs/throttler` is not installed, and this
 * task forbids installing anything without approval. A fixed window is coarser
 * than a sliding window — a burst spanning a window boundary can briefly reach
 * twice the limit — which is an acceptable trade for slowing credential
 * stuffing and identity probing.
 *
 * The real limitation is that state lives in ONE process: it does not survive a
 * restart and is not shared between instances, so behind a load balancer each
 * instance enforces its own quota. That is a genuine weakness for a production
 * deployment and is reported rather than hidden; a shared store (Redis) or
 * `@nestjs/throttler` with a distributed backend is the production answer.
 */
@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();
  /** Bounds memory if an attacker cycles keys; oldest entries are dropped. */
  private static readonly MAX_BUCKETS = 50_000;

  /**
   * Counts one hit against `key` and says whether it may proceed.
   *
   * Every dimension is counted independently, so a login can be limited per IP
   * and per email at once and an attacker rotating IPs still meets the
   * per-email ceiling.
   */
  hit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitDecision {
    this.evictExpired(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Forgets a key, so a successful login does not keep counting against it. */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Test seam. */
  clear(): void {
    this.buckets.clear();
  }

  private evictExpired(now: number): void {
    if (this.buckets.size < RateLimitService.MAX_BUCKETS) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    // Still full of live buckets: drop the oldest insertions rather than grow
    // without bound. Under that pressure the limiter is already doing its job.
    while (this.buckets.size >= RateLimitService.MAX_BUCKETS) {
      const oldest = this.buckets.keys().next();
      if (oldest.done) break;
      this.buckets.delete(oldest.value);
    }
  }
}

/** Builds a namespaced bucket key, lowercased so dimensions cannot collide. */
export function rateLimitKey(scope: string, dimension: string, value: string): string {
  return `${scope}:${dimension}:${value.trim().toLowerCase()}`;
}
