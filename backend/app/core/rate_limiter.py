from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Request, HTTPException
import structlog

logger = structlog.get_logger()


class RateLimiter:
    
    def __init__(self):
        # {ip: [(timestamp, endpoint), ...]}
        self.requests: dict[str, list[tuple[datetime, str]]] = defaultdict(list)
        # {ip: upload_count_today}
        self.daily_uploads: dict[str, tuple[str, int]] = {}  # (date_str, count)
        
    def _cleanup_old_requests(self, ip: str, window_seconds: int = 60):
        cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)
        self.requests[ip] = [
            (ts, ep) for ts, ep in self.requests[ip] 
            if ts > cutoff
        ]
    
    def check_rate_limit(
        self, 
        ip: str, 
        endpoint: str,
        max_requests: int = 30,  # per minute
        window_seconds: int = 60
    ) -> bool:
        self._cleanup_old_requests(ip, window_seconds)
        
        # Count requests in window
        count = len(self.requests[ip])
        
        if count >= max_requests:
            logger.warning("Rate limit exceeded", ip=ip, endpoint=endpoint, count=count)
            return False
        
        # Record this request
        self.requests[ip].append((datetime.utcnow(), endpoint))
        return True
    
    def check_daily_upload_limit(self, ip: str, max_uploads: int = 5) -> bool:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        if ip in self.daily_uploads:
            date_str, count = self.daily_uploads[ip]
            if date_str == today:
                if count >= max_uploads:
                    logger.warning("Daily upload limit exceeded", ip=ip, count=count)
                    return False
                self.daily_uploads[ip] = (today, count + 1)
            else:
                # New day, reset count
                self.daily_uploads[ip] = (today, 1)
        else:
            self.daily_uploads[ip] = (today, 1)
        
        return True
    
    def check_daily_chat_limit(self, ip: str, max_messages: int = 50) -> bool:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        key = f"chat_{ip}"
        
        if key in self.daily_uploads:
            date_str, count = self.daily_uploads[key]
            if date_str == today:
                if count >= max_messages:
                    logger.warning("Daily chat limit exceeded", ip=ip, count=count)
                    return False
                self.daily_uploads[key] = (today, count + 1)
            else:
                self.daily_uploads[key] = (today, 1)
        else:
            self.daily_uploads[key] = (today, 1)
        
        return True


rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    # Check X-Real-IP
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


async def rate_limit_dependency(request: Request):
    ip = get_client_ip(request)
    
    if not rate_limiter.check_rate_limit(ip, request.url.path):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please slow down."
        )


async def upload_rate_limit(request: Request):
    ip = get_client_ip(request)
    
    if not rate_limiter.check_rate_limit(ip, "upload", max_requests=5, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Too many upload requests. Please wait a minute."
        )
    
    if not rate_limiter.check_daily_upload_limit(ip, max_uploads=10):
        raise HTTPException(
            status_code=429,
            detail="Daily upload limit reached (10 files/day). Try again tomorrow."
        )


async def chat_rate_limit(request: Request):
    ip = get_client_ip(request)
    
    if not rate_limiter.check_rate_limit(ip, "chat", max_requests=20, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please slow down."
        )
    
    if not rate_limiter.check_daily_chat_limit(ip, max_messages=100):
        raise HTTPException(
            status_code=429,
            detail="Daily message limit reached (100 messages/day). Try again tomorrow."
        )
