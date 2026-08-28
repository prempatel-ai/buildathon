import pytest
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.core.rate_limiter import check_rate_limit, redis_client

def test_concurrent_redis_rate_limiter_strict_enforcement():
    """
    Concurrent load test:
    Executes 20 concurrent threads attempting requests against Redis sliding window rate limiter
    configured with max_requests=5.
    Verifies that exactly 5 requests succeed and 15 requests are rejected with HTTP 429.
    """
    key_prefix = f"test_concurrent_{uuid.uuid4().hex[:8]}"
    redis_client.delete(f"{key_prefix}:127.0.0.1")

    mock_request = MagicMock()
    mock_request.client.host = "127.0.0.1"

    success_count = 0
    blocked_count = 0

    def make_request(request_num: int):
        try:
            # Enforce max 5 requests per 60s
            check_rate_limit(mock_request, key_prefix=key_prefix, max_requests=5, window_seconds=60)
            return ("SUCCESS", 200)
        except HTTPException as exc:
            if exc.status_code == 429:
                return ("BLOCKED", 429)
            raise

    # Launch 20 simultaneous threads
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(make_request, i) for i in range(20)]
        results = [f.result() for f in futures]

    for status_str, code in results:
        if code == 200:
            success_count += 1
        elif code == 429:
            blocked_count += 1

    print(f"\n[CONCURRENT RATE LIMITER LOAD TEST RESULTS]")
    print(f"Total Concurrent Requests: 20")
    print(f"Configured Rate Limit:     5")
    print(f"Successful Requests (200): {success_count}")
    print(f"Blocked Requests (429):    {blocked_count}")

    # Cleanup
    redis_client.delete(f"{key_prefix}:127.0.0.1")

    assert success_count == 5, f"Expected exactly 5 allowed requests, got {success_count}"
    assert blocked_count == 15, f"Expected exactly 15 blocked requests, got {blocked_count}"
