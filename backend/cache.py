"""
In-memory cache manager with TTL-based expiration
"""
import time
import hashlib
import json
from typing import Any, Optional, Dict
from datetime import datetime

class CacheManager:
    """Thread-safe in-memory cache with TTL expiration"""
    
    def __init__(self):
        self.cache: Dict[str, dict] = {}
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # Clean expired entries every 5 minutes
    
    def _cleanup(self):
        """Remove expired entries"""
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        expired_keys = [
            key for key, value in self.cache.items()
            if value.get('expires_at', 0) < current_time
        ]
        for key in expired_keys:
            del self.cache[key]
        
        self.last_cleanup = current_time
    
    def _generate_key(self, endpoint: str, params: dict = None) -> str:
        """Generate cache key from endpoint and parameters"""
        if params is None:
            params = {}
        
        # Sort params for consistent hashing
        params_str = json.dumps(params, sort_keys=True, default=str)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
        return f"{endpoint}:{params_hash}"
    
    def get(self, endpoint: str, params: dict = None) -> Optional[Any]:
        """Get cached data if exists and not expired"""
        self._cleanup()
        key = self._generate_key(endpoint, params)
        
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        if entry.get('expires_at', 0) < time.time():
            del self.cache[key]
            return None
        
        entry['hits'] += 1
        return entry['data']
    
    def set(self, endpoint: str, data: Any, ttl_seconds: int, params: dict = None) -> None:
        """Store data in cache with TTL"""
        key = self._generate_key(endpoint, params)
        self.cache[key] = {
            'data': data,
            'expires_at': time.time() + ttl_seconds,
            'created_at': datetime.now().isoformat(),
            'hits': 0
        }
    
    def invalidate(self, endpoint: str, params: dict = None) -> None:
        """Remove specific cache entry"""
        key = self._generate_key(endpoint, params)
        if key in self.cache:
            del self.cache[key]
    
    def invalidate_pattern(self, pattern: str) -> None:
        """Invalidate all cache entries matching a pattern"""
        keys_to_delete = [key for key in self.cache.keys() if pattern in key]
        for key in keys_to_delete:
            del self.cache[key]
    
    def clear(self) -> None:
        """Clear entire cache"""
        self.cache.clear()
    
    def stats(self) -> dict:
        """Get cache statistics"""
        total_size = len(self.cache)
        total_hits = sum(entry.get('hits', 0) for entry in self.cache.values())
        
        # Group by endpoint
        by_endpoint = {}
        for key, entry in self.cache.items():
            endpoint = key.split(':')[0]
            if endpoint not in by_endpoint:
                by_endpoint[endpoint] = {'count': 0, 'hits': 0}
            by_endpoint[endpoint]['count'] += 1
            by_endpoint[endpoint]['hits'] += entry.get('hits', 0)
        
        return {
            'total_entries': total_size,
            'total_hits': total_hits,
            'by_endpoint': by_endpoint,
            'cache_size_mb': sum(
                len(json.dumps(entry['data']).encode()) 
                for entry in self.cache.values()
            ) / (1024 * 1024)
        }


# Global cache instance
cache_manager = CacheManager()
