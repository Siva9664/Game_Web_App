from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.db.database import engine, Base
import app.models # ensure all models loaded

from app.api.routes import health, games, draw_guess, scores, users

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Game Web App featuring Draw & Guess",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Or settings.FRONTEND_URL in strict production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Completed request: {request.method} {request.url.path} -> Status {response.status_code}")
    return response

# Include API Router under /api/v1
api_prefix = "/api/v1"
app.include_router(health.router, prefix=api_prefix)
app.include_router(games.router, prefix=api_prefix)
app.include_router(draw_guess.router, prefix=api_prefix)
app.include_router(scores.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)

@app.get("/")
def root():
    return {
        "success": True,
        "message": f"Welcome to {settings.APP_NAME} API v1",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
