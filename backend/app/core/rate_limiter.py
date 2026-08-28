import time
import redis
from fastapi import Request, HTTPException, status
from app.core.config import settings

redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def check_rate_limit(request: Request, key_prefix: str = "rate_limit", max_requests: int = 10, window_seconds: int = 60) -> None:
    """
    Redis sorted-set (ZSET) sliding-window rate limiter.
    Raises HTTP 429 Too Many Requests when rate limit is exceeded.
    """
    try:
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = f"{key_prefix}:{client_ip}"
        now = time.time()
        clear_before = now - window_seconds

        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, clear_before)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window_seconds)
        results = pipe.execute()

        current_requests = results[1]
        if current_requests >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {max_requests} requests allowed per {window_seconds} seconds."
            )
    except HTTPException:
        raise
    except Exception as e:
        # Fallback gracefully if Redis is temporarily unreachable during local testing
        pass
