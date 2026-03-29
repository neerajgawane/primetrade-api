from typing import Optional
import redis
from .config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

def blacklist_token(token: str, expires_in: int) -> None:
    redis_client.setex(f"blacklist:{token}", expires_in, "true")

def is_token_blacklisted(token: str) -> bool:
    return redis_client.exists(f"blacklist:{token}") > 0

def cache_set(key: str, value: str, ttl: int = 300) -> None:
    redis_client.setex(key, ttl, value)

def cache_get(key: str) -> Optional[str]:
    return redis_client.get(key)

def cache_delete_pattern(pattern: str) -> None:
    keys = redis_client.keys(pattern)
    if keys:
        redis_client.delete(*keys)
