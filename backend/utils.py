"""
Utility functions for retry logic, error handling, and logging
"""
import time
import asyncio
import logging
from functools import wraps
from typing import Callable, Any, TypeVar, Optional
from config import RETRY_CONFIG, LOG_LEVEL

# Configure logging
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

F = TypeVar('F', bound=Callable[..., Any])


class RateLimitError(Exception):
    """Raised when API rate limit is exceeded"""
    pass


class APIError(Exception):
    """Raised when external API call fails"""
    pass


def retry_with_backoff(
    max_retries: int = RETRY_CONFIG["max_retries"],
    initial_delay: float = RETRY_CONFIG["initial_delay"],
    backoff_factor: float = RETRY_CONFIG["backoff_factor"],
    max_delay: float = RETRY_CONFIG["max_delay"]
) -> Callable:
    """
    Decorator for retrying failed async functions with exponential backoff.
    Handles rate limit errors (429) specially.
    """
    def decorator(func: F) -> F:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            delay = initial_delay
            last_error = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except RateLimitError as e:
                    last_error = e
                    if attempt < max_retries:
                        logger.warning(
                            f"Rate limit hit on {func.__name__}, "
                            f"retrying in {delay}s (attempt {attempt + 1}/{max_retries})"
                        )
                        await asyncio.sleep(delay)
                        delay = min(delay * backoff_factor, max_delay)
                    else:
                        logger.error(f"Max retries exceeded for {func.__name__}")
                        break
                except APIError as e:
                    last_error = e
                    if attempt < max_retries:
                        logger.warning(
                            f"API error on {func.__name__}: {str(e)}, "
                            f"retrying in {delay}s (attempt {attempt + 1}/{max_retries})"
                        )
                        await asyncio.sleep(delay)
                        delay = min(delay * backoff_factor, max_delay)
                    else:
                        logger.error(f"Max retries exceeded for {func.__name__}")
                        break
                except Exception as e:
                    # Don't retry on other exceptions
                    logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
                    raise
            
            if last_error:
                raise last_error
            return None
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            delay = initial_delay
            last_error = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except RateLimitError as e:
                    last_error = e
                    if attempt < max_retries:
                        logger.warning(
                            f"Rate limit hit on {func.__name__}, "
                            f"retrying in {delay}s (attempt {attempt + 1}/{max_retries})"
                        )
                        time.sleep(delay)
                        delay = min(delay * backoff_factor, max_delay)
                    else:
                        break
                except APIError as e:
                    last_error = e
                    if attempt < max_retries:
                        logger.warning(
                            f"API error on {func.__name__}: {str(e)}, "
                            f"retrying in {delay}s (attempt {attempt + 1}/{max_retries})"
                        )
                        time.sleep(delay)
                        delay = min(delay * backoff_factor, max_delay)
                    else:
                        break
                except Exception as e:
                    logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
                    raise
            
            if last_error:
                raise last_error
            return None
        
        # Return async wrapper if function is coroutine, else sync
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def handle_api_error(response_text: str = "", status_code: int = 0) -> None:
    """Parse API error and raise appropriate exception"""
    if status_code == 429:
        raise RateLimitError(f"Rate limit exceeded: {response_text}")
    elif status_code >= 500:
        raise APIError(f"Server error ({status_code}): {response_text}")
    elif status_code >= 400:
        raise APIError(f"Client error ({status_code}): {response_text}")
    else:
        raise APIError(f"API error ({status_code}): {response_text}")


def log_cache_hit(endpoint: str, hit: bool) -> None:
    """Log cache hit/miss for monitoring"""
    if hit:
        logger.debug(f"Cache HIT: {endpoint}")
    else:
        logger.debug(f"Cache MISS: {endpoint}")


def format_error_response(error: Exception, fallback_data: Any = None) -> dict:
    """Format error into API response"""
    return {
        "error": str(error),
        "fallback_data": fallback_data,
        "offline_mode": fallback_data is not None
    }
