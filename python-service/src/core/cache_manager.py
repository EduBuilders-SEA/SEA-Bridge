"""
Manages the Redis cache connection and operations.
"""
from typing import Optional, Any
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
from src.config import settings
from src.core.logging import logger

class CacheManager:
    _pool: Optional[ConnectionPool] = None

    @classmethod
    async def get_pool(cls) -> ConnectionPool:
        """Get the Redis connection pool, creating it if it doesn't exist."""
        if cls._pool is None:
            logger.info("Creating new Redis connection pool...")
            try:
                cls._pool = ConnectionPool.from_url(
                    f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                    password=settings.REDIS_PASSWORD,
                    db=0,  # Default DB
                    max_connections=10,
                    socket_connect_timeout=5,
                    decode_responses=True
                )
                # Test connection
                r = redis.Redis(connection_pool=cls._pool)
                await r.ping()
                logger.info("Redis connection pool created successfully.")
            except Exception as e:
                logger.error(f"Failed to create Redis connection pool: {e}")
                cls._pool = None
                raise
        return cls._pool

    @classmethod
    async def get_client(cls) -> redis.Redis:
        """Get a Redis client from the connection pool."""
        pool = await cls.get_pool()
        return redis.Redis(connection_pool=pool)

    @classmethod
    async def close(cls):
        """Close the Redis connection pool."""
        if cls._pool:
            logger.info("Closing Redis connection pool...")
            await cls._pool.disconnect()
            cls._pool = None
            logger.info("Redis connection pool closed.")

    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set a value in the cache."""
        client = await self.get_client()
        try:
            await client.set(key, value, ex=ttl or settings.REDIS_TTL)
            logger.debug(f"Cache SET for key: {key}")
        except Exception as e:
            logger.error(f"Failed to SET cache for key {key}: {e}")
        finally:
            await client.close()

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from the cache."""
        client = await self.get_client()
        try:
            value = await client.get(key)
            logger.debug(f"Cache GET for key: {key}")
            return value
        except Exception as e:
            logger.error(f"Failed to GET cache for key {key}: {e}")
            return None
        finally:
            await client.close()

    async def delete(self, key: str):
        """Delete a value from the cache."""
        client = await self.get_client()
        try:
            await client.delete(key)
            logger.debug(f"Cache DELETE for key: {key}")
        except Exception as e:
            logger.error(f"Failed to DELETE cache for key {key}: {e}")
        finally:
            await client.close()

# Global instance
cache_manager = CacheManager()
