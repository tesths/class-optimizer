# -*- coding: utf-8 -*-
"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.auth import router as auth_router
from app.api.term import router as term_router
from app.api.class_ import router as class_router
from app.api.student import router as student_router
from app.api.group import router as group_router
from app.api.score import router as score_router
from app.api.scoring import router as scoring_router
from app.api.stats import router as stats_router
from app.api.import_ import router as import_router

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(term_router, prefix=settings.API_PREFIX)
app.include_router(class_router, prefix=settings.API_PREFIX)
app.include_router(student_router, prefix=settings.API_PREFIX)
app.include_router(group_router, prefix=settings.API_PREFIX)
app.include_router(score_router, prefix=settings.API_PREFIX)
app.include_router(scoring_router, prefix=settings.API_PREFIX)
app.include_router(stats_router, prefix=settings.API_PREFIX)
app.include_router(import_router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/api/health")
async def health():
    """API health check"""
    return {"status": "healthy"}
