from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongo import (
    get_decision_doc,
    list_tracker_entry_docs,
    save_tracker_entry_doc,
)
from app.models.decision import TrackerEntryCreate, TrackerResponse
from app.services.tracker import build_tracker_response

router = APIRouter(prefix="/api/trackers", tags=["trackers"])


@router.get("/{decision_id}", response_model=TrackerResponse)
async def get_tracker(decision_id: str) -> TrackerResponse:
    decision_doc = await get_decision_doc(decision_id)
    if not decision_doc:
        raise HTTPException(status_code=404, detail="Decision not found")

    entry_docs = await list_tracker_entry_docs(decision_id)
    return build_tracker_response(decision_doc, entry_docs)


@router.post("/{decision_id}/entries", response_model=TrackerResponse)
async def add_tracker_entry(
    decision_id: str, entry: TrackerEntryCreate
) -> TrackerResponse:
    decision_doc = await get_decision_doc(decision_id)
    if not decision_doc:
        raise HTTPException(status_code=404, detail="Decision not found")

    try:
        datetime.fromisoformat(entry.date)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="Entry date must use YYYY-MM-DD format"
        ) from exc

    doc = {
        **entry.model_dump(mode="json"),
        "created_at": datetime.now(timezone.utc),
    }
    await save_tracker_entry_doc(decision_id, doc)

    entry_docs = await list_tracker_entry_docs(decision_id)
    return build_tracker_response(decision_doc, entry_docs)
