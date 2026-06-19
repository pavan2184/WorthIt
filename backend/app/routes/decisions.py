from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongo import (
    delete_decision_doc,
    get_decision_doc,
    list_decision_docs,
    save_decision_doc,
)
from app.models.decision import CalculationResult, DecisionPayload
from app.services.calculator import calculate_decision

router = APIRouter(prefix="/api/decisions", tags=["decisions"])


@router.post("/calculate", response_model=CalculationResult)
async def calculate(payload: DecisionPayload) -> CalculationResult:
    return calculate_decision(payload)


@router.post("")
async def save_decision(payload: DecisionPayload) -> dict:
    now = datetime.now(timezone.utc)
    result = calculate_decision(payload)
    doc = {
        "payload": payload.model_dump(),
        "result": result.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    return await save_decision_doc(doc)


@router.get("")
async def list_decisions() -> list[dict]:
    return await list_decision_docs()


@router.get("/{decision_id}")
async def get_decision(decision_id: str) -> dict:
    doc = await get_decision_doc(decision_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Decision not found")
    return doc


@router.delete("/{decision_id}")
async def delete_decision(decision_id: str) -> dict[str, bool]:
    deleted = await delete_decision_doc(decision_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Decision not found")
    return {"deleted": True}
