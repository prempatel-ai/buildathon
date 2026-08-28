import time
from typing import Tuple, Optional
import redis
from app.core.config import settings

def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)

def check_velocity_limit(
    redis_client: Optional[redis.Redis],
    merchant_id: str,
    agent_id: str,
    max_count: int,
    window_seconds: int
) -> Tuple[bool, int]:
    """
    Evaluates sliding-window velocity limit using Redis Sorted Sets (ZSET).
    Returns (is_allowed, current_count_in_window).
    """
    if redis_client is None:
        try:
            redis_client = get_redis_client()
        except Exception as e:
            # If Redis connection is unavailable, pass-through gracefully with warning
            return (True, 0)

    key = f"velocity:{merchant_id}:{agent_id}:{window_seconds}"
    now = time.time()
    cutoff = now - window_seconds

    try:
        # Atomic pipeline for sliding window check
        pipeline = redis_client.pipeline()
        pipeline.zremrangebyscore(key, "-inf", cutoff)
        pipeline.zcard(key)
        results = pipeline.execute()

        current_count = results[1]
        is_allowed = current_count < max_count
        return (is_allowed, current_count)
    except Exception as e:
        # Graceful fallback if Redis throws an exception
        return (True, 0)

def record_velocity_event(
    redis_client: Optional[redis.Redis],
    merchant_id: str,
    agent_id: str,
    window_seconds: int
) -> bool:
    """
    Records a transaction event timestamp into the Redis sliding-window sorted set.
    """
    if redis_client is None:
        try:
            redis_client = get_redis_client()
        except Exception:
            return False

    key = f"velocity:{merchant_id}:{agent_id}:{window_seconds}"
    now = time.time()
    member = f"{now}"

    try:
        pipeline = redis_client.pipeline()
        pipeline.zadd(key, {member: now})
        pipeline.expire(key, window_seconds + 60)
        pipeline.execute()
        return True
    except Exception:
        return False
