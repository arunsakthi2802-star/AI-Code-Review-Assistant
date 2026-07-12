from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.api.api import api_router
from app.core.config import settings

app = FastAPI(
    title="AI Code Review Assistant API",
    description="Backend API for the AI Code Review Assistant",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    await init_db()

# Configure CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to AI Code Review Assistant API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(api_router, prefix=settings.API_V1_STR)
