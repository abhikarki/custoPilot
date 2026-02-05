from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
from typing import Optional

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    
    APP_NAME: str = "CustoPilot"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    BASE_URL: str = "http://localhost:8080"
    
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BACKEND_DIR / 'data' / 'custopilot.db'}"
    
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "custopilot"
    
    CHROMA_PERSIST_DIRECTORY: str = str(BACKEND_DIR / "data" / "chroma")
    CHROMA_HOST: Optional[str] = None  # For remote ChromaDB
    CHROMA_PORT: Optional[int] = None
    
    UPLOAD_DIRECTORY: str = str(BACKEND_DIR / "data" / "uploads")
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    
    CONFIDENCE_THRESHOLD: float = 0.7
    MAX_RETRIES: int = 3
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
