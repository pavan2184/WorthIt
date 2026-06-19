from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.decisions import router as decisions_router
from app.routes.parse import router as parse_router
from app.routes.trackers import router as trackers_router

app = FastAPI(
    title="WorthIt API",
    description="AI break-even agent for everyday decisions",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decisions_router)
app.include_router(parse_router)
app.include_router(trackers_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
