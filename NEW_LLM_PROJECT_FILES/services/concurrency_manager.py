"""
Concurrency Manager - Handles concurrent requests and rate limiting
"""

import asyncio
import threading
import time
from collections import defaultdict, deque
from functools import wraps
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ConcurrencyManager:
    def __init__(self, max_concurrent_requests=10, rate_limit_per_minute=100):
        self.max_concurrent_requests = max_concurrent_requests
        self.rate_limit_per_minute = rate_limit_per_minute
        
        # Semaphore for controlling concurrent requests
        self.semaphore = threading.Semaphore(max_concurrent_requests)
        
        # Rate limiting per API key
        self.request_history = defaultdict(deque)
        self.rate_limit_lock = threading.Lock()
        
        # Active request tracking
        self.active_requests = {}
        self.request_counter = 0
        self.request_lock = threading.Lock()
        
        # Metrics
        self.metrics = {
            'total_requests': 0,
            'concurrent_requests': 0,
            'rate_limited_requests': 0,
            'max_concurrent_reached': 0,
            'average_response_time': 0
        }
        
    def limit_concurrent_requests(self, timeout=300):
        """
        Decorator to limit concurrent requests
        """
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                request_id = self._get_request_id()
                
                # Try to acquire semaphore
                acquired = self.semaphore.acquire(timeout=timeout)
                if not acquired:
                    logger.warning(f"Request {request_id} timed out waiting for semaphore")
                    return {
                        'success': False, 
                        'error': 'Service is busy, please try again later',
                        'retry_after': 30
                    }
                
                try:
                    # Track active request
                    start_time = time.time()
                    self._track_request_start(request_id)
                    
                    # Execute the function
                    result = func(*args, **kwargs)
                    
                    # Update metrics
                    end_time = time.time()
                    self._track_request_end(request_id, end_time - start_time)
                    
                    return result
                    
                finally:
                    # Always release semaphore
                    self.semaphore.release()
                    
            return wrapper
        return decorator
        
    def rate_limit_by_api_key(self, api_key):
        """
        Check if API key has exceeded rate limit
        
        Returns:
            tuple: (allowed, wait_time)
        """
        with self.rate_limit_lock:
            now = datetime.now()
            cutoff = now - timedelta(minutes=1)
            
            # Clean old requests
            history = self.request_history[api_key]
            while history and history[0] < cutoff:
                history.popleft()
                
            # Check rate limit
            if len(history) >= self.rate_limit_per_minute:
                oldest_request = history[0]
                wait_time = (oldest_request + timedelta(minutes=1) - now).total_seconds()
                
                self.metrics['rate_limited_requests'] += 1
                logger.warning(f"Rate limit exceeded for API key: {api_key[:8]}...")
                
                return False, max(0, wait_time)
            
            # Add current request
            history.append(now)
            return True, 0
            
    def _get_request_id(self):
        """Generate unique request ID"""
        with self.request_lock:
            self.request_counter += 1
            return f"req_{self.request_counter}_{int(time.time())}"
            
    def _track_request_start(self, request_id):
        """Track request start"""
        with self.request_lock:
            self.active_requests[request_id] = {
                'start_time': time.time(),
                'thread_id': threading.current_thread().ident
            }
            
            concurrent = len(self.active_requests)
            self.metrics['concurrent_requests'] = concurrent
            self.metrics['total_requests'] += 1
            
            if concurrent > self.metrics['max_concurrent_reached']:
                self.metrics['max_concurrent_reached'] = concurrent
                
            logger.info(f"Request {request_id} started. Active requests: {concurrent}")
            
    def _track_request_end(self, request_id, duration):
        """Track request completion"""
        with self.request_lock:
            if request_id in self.active_requests:
                del self.active_requests[request_id]
                
            # Update average response time
            total = self.metrics['total_requests']
            current_avg = self.metrics['average_response_time']
            self.metrics['average_response_time'] = (current_avg * (total - 1) + duration) / total
            
            self.metrics['concurrent_requests'] = len(self.active_requests)
            
            logger.info(f"Request {request_id} completed in {duration:.2f}s")
            
    def get_metrics(self):
        """Get current concurrency metrics"""
        with self.request_lock:
            return {
                **self.metrics,
                'current_concurrent_requests': len(self.active_requests),
                'available_slots': self.max_concurrent_requests - len(self.active_requests),
                'timestamp': datetime.now().isoformat()
            }
            
    def get_active_requests(self):
        """Get information about active requests"""
        with self.request_lock:
            current_time = time.time()
            return {
                request_id: {
                    'duration': current_time - info['start_time'],
                    'thread_id': info['thread_id']
                }
                for request_id, info in self.active_requests.items()
            }

# Global concurrency manager instance
concurrency_manager = ConcurrencyManager(
    max_concurrent_requests=20,  # Adjust based on your server capacity
    rate_limit_per_minute=200    # Adjust based on your needs
)