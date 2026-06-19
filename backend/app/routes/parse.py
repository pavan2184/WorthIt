from fastapi import APIRouter

from app.models.decision import ParseRequest, ParseResponse
from app.services.decision_parser import parse_decision_text

router = APIRouter(prefix="/api", tags=["parse"])


@router.post("/parse", response_model=ParseResponse)
async def parse(request: ParseRequest) -> ParseResponse:
    return await parse_decision_text(request)
