"""Redis-backed rate limiter for brute-force protection."""
from .redis import redis_client


def check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 60) -> tuple[bool, int]:
    """Check if a key has exceeded the rate limit.
    Returns (is_allowed, remaining_attempts).
    """
    current = redis_client.get(key)
    if current is None:
        redis_client.setex(key, window_seconds, 1)
        return True, max_attempts - 1
    count = int(current)
    if count >= max_attempts:
        ttl = redis_client.ttl(key)
        return False, 0
    redis_client.incr(key)
    return True, max_attempts - count - 1


def reset_rate_limit(key: str) -> None:
    """Reset rate limit on successful login."""
    redis_client.delete(key)
