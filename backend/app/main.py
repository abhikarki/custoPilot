import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import structlog

from app.core.config import settings
from app.api import auth, organizations, knowledge, chat, support, agents, voice, chatbots
from app.db.session import init_db

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

DB_STATUS = {"initialized": False, "error": None}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CustoPilot API", version="1.0.0")
    logger.info("Config", db_url=settings.DATABASE_URL[:30] + "...", openai_set=bool(settings.OPENAI_API_KEY))
    try:
        await init_db()
        DB_STATUS["initialized"] = True
        logger.info("Database initialized successfully")
    except Exception as e:
        DB_STATUS["error"] = str(e)
        logger.error("Database initialization failed - app will start but DB features won't work", error=str(e))
    yield
    logger.info("Shutting down CustoPilot API")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Customer Support Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WIDGET_STATIC_DIR = Path(__file__).parent.parent / "static"
if WIDGET_STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=WIDGET_STATIC_DIR), name="widget-static")

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["Organizations"])
app.include_router(chatbots.router, prefix="/api/chatbots", tags=["Chatbots"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(support.router, prefix="/api/support", tags=["Support"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected" if DB_STATUS["initialized"] else f"error: {DB_STATUS['error']}",
        "openai_key_set": bool(settings.OPENAI_API_KEY),
        "version": "1.0.0"
    }


@app.get("/test-widget")
async def serve_widget_test():
    test_html = WIDGET_STATIC_DIR / "test-widget.html"
    if test_html.exists():
        return FileResponse(test_html)
    return {"error": "Test page not found"}


STATIC_DIR = Path(__file__).parent.parent / "static"
ASSETS_DIR = STATIC_DIR / "assets"
if STATIC_DIR.exists() and ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA for all non-API routes"""
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
