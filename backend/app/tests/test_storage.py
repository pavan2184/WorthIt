from app.db import mongo as storage


def test_supabase_url_accepts_project_root(monkeypatch):
    monkeypatch.setattr(
        storage.settings,
        "supabase_url",
        "https://example.supabase.co",
    )

    assert (
        storage._supabase_url("decisions")
        == "https://example.supabase.co/rest/v1/decisions"
    )


def test_supabase_url_accepts_rest_endpoint(monkeypatch):
    monkeypatch.setattr(
        storage.settings,
        "supabase_url",
        "https://example.supabase.co/rest/v1",
    )

    assert (
        storage._supabase_url("decisions")
        == "https://example.supabase.co/rest/v1/decisions"
    )
