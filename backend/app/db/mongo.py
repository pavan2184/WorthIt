from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any
from uuid import uuid4

import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from app.core.config import settings


client: AsyncIOMotorClient[Any] | None = None
db: Any | None = None

if settings.mongodb_uri:
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=1500)
    db = client[settings.mongodb_db_name]

_memory_decisions: dict[str, dict[str, Any]] = {}
_memory_tracker_entries: dict[str, list[dict[str, Any]]] = {}
_mongo_unavailable = False


def _supabase_is_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_role_key)


def _supabase_headers(prefer: str | None = None) -> dict[str, str]:
    key = settings.supabase_service_role_key or ""
    headers = {
        "apikey": key,
        "content-type": "application/json",
    }

    if key.count(".") == 2:
        headers["authorization"] = f"Bearer {key}"

    if prefer:
        headers["prefer"] = prefer

    return headers


def _supabase_url(path: str) -> str:
    base_url = (settings.supabase_url or "").rstrip("/")

    if base_url.endswith("/rest/v1"):
        return f"{base_url}/{path.lstrip('/')}"

    return f"{base_url}/rest/v1/{path.lstrip('/')}"


def _jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


async def _supabase_request(
    method: str,
    path: str,
    *,
    params: dict[str, str] | None = None,
    json: Any | None = None,
    prefer: str | None = None,
) -> Any:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.request(
            method=method,
            url=_supabase_url(path),
            params=params,
            headers=_supabase_headers(prefer=prefer),
            json=_jsonable(json),
        )

    response.raise_for_status()

    if not response.content:
        return None

    return response.json()


def _supabase_decision_row(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc.get("id") or str(uuid4()),
        "payload": doc["payload"],
        "result": doc["result"],
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


def _supabase_entry_row(decision_id: str, doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc.get("id") or str(uuid4()),
        "decision_id": decision_id,
        "option_key": doc.get("option_key", "option_a"),
        "spend_kind": doc.get("spend_kind", "variable"),
        "expense_frequency": doc.get("expense_frequency", "per_use"),
        "date": doc["date"],
        "uses": doc.get("uses", 1),
        "option_a_spend": doc.get("option_a_spend", 0),
        "option_b_spend": doc.get("option_b_spend", 0),
        "note": doc.get("note", ""),
        "created_at": doc["created_at"],
    }


def _serialize_doc(doc: dict[str, Any]) -> dict[str, Any]:
    serialized = deepcopy(doc)
    if "_id" in serialized:
        serialized["id"] = str(serialized.pop("_id"))
    return serialized


def _memory_doc(doc: dict[str, Any]) -> dict[str, Any]:
    stored = deepcopy(doc)
    stored["id"] = str(uuid4())
    return stored


async def _mongo_is_available() -> bool:
    global _mongo_unavailable

    if db is None or _mongo_unavailable:
        return False

    try:
        await db.command("ping")
        return True
    except (PyMongoError, ServerSelectionTimeoutError):
        _mongo_unavailable = True
        return False


async def save_decision_doc(doc: dict[str, Any]) -> dict[str, Any]:
    if _supabase_is_configured():
        rows = await _supabase_request(
            "POST",
            "decisions",
            json=_supabase_decision_row(doc),
            prefer="return=representation",
        )
        return rows[0]

    if await _mongo_is_available():
        insert_result = await db.decisions.insert_one(deepcopy(doc))
        saved = await db.decisions.find_one({"_id": insert_result.inserted_id})
        return _serialize_doc(saved)

    saved = _memory_doc(doc)
    _memory_decisions[saved["id"]] = saved
    return deepcopy(saved)


async def list_decision_docs(limit: int = 50) -> list[dict[str, Any]]:
    if _supabase_is_configured():
        return await _supabase_request(
            "GET",
            "decisions",
            params={
                "select": "*",
                "order": "created_at.desc",
                "limit": str(limit),
            },
        )

    if await _mongo_is_available():
        cursor = db.decisions.find().sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [_serialize_doc(doc) for doc in docs]

    docs = sorted(
        _memory_decisions.values(),
        key=lambda doc: _date_sort_key(doc.get("created_at")),
        reverse=True,
    )
    return deepcopy(docs[:limit])


async def get_decision_doc(decision_id: str) -> dict[str, Any] | None:
    if _supabase_is_configured():
        rows = await _supabase_request(
            "GET",
            "decisions",
            params={
                "select": "*",
                "id": f"eq.{decision_id}",
                "limit": "1",
            },
        )
        return rows[0] if rows else None

    if await _mongo_is_available():
        if not ObjectId.is_valid(decision_id):
            return None
        doc = await db.decisions.find_one({"_id": ObjectId(decision_id)})
        return _serialize_doc(doc) if doc else None

    return deepcopy(_memory_decisions.get(decision_id))


async def delete_decision_doc(decision_id: str) -> bool:
    if _supabase_is_configured():
        rows = await _supabase_request(
            "DELETE",
            "decisions",
            params={"id": f"eq.{decision_id}"},
            prefer="return=representation",
        )
        return bool(rows)

    if await _mongo_is_available():
        if not ObjectId.is_valid(decision_id):
            return False
        result = await db.decisions.delete_one({"_id": ObjectId(decision_id)})
        await db.tracker_entries.delete_many({"decision_id": decision_id})
        return result.deleted_count > 0

    _memory_tracker_entries.pop(decision_id, None)
    return _memory_decisions.pop(decision_id, None) is not None


async def save_tracker_entry_doc(
    decision_id: str, doc: dict[str, Any]
) -> dict[str, Any]:
    stored = deepcopy(doc)
    stored["decision_id"] = decision_id

    if _supabase_is_configured():
        rows = await _supabase_request(
            "POST",
            "tracker_entries",
            json=_supabase_entry_row(decision_id, stored),
            prefer="return=representation",
        )
        return rows[0]

    if await _mongo_is_available():
        insert_result = await db.tracker_entries.insert_one(stored)
        saved = await db.tracker_entries.find_one({"_id": insert_result.inserted_id})
        return _serialize_doc(saved)

    saved = _memory_doc(stored)
    _memory_tracker_entries.setdefault(decision_id, []).append(saved)
    return deepcopy(saved)


async def list_tracker_entry_docs(decision_id: str) -> list[dict[str, Any]]:
    if _supabase_is_configured():
        return await _supabase_request(
            "GET",
            "tracker_entries",
            params={
                "select": "*",
                "decision_id": f"eq.{decision_id}",
                "order": "date.asc,created_at.asc",
                "limit": "500",
            },
        )

    if await _mongo_is_available():
        cursor = db.tracker_entries.find({"decision_id": decision_id}).sort(
            "date", 1
        )
        docs = await cursor.to_list(length=500)
        return [_serialize_doc(doc) for doc in docs]

    docs = sorted(
        _memory_tracker_entries.get(decision_id, []),
        key=lambda doc: (doc.get("date", ""), str(doc.get("created_at", ""))),
    )
    return deepcopy(docs)


def _date_sort_key(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.min
