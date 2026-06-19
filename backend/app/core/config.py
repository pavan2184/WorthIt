import os
from pathlib import Path

from pydantic import BaseModel


def _load_dotenv() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv()


class Settings(BaseModel):
    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_service_role_key: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    mongodb_uri: str | None = os.getenv("MONGODB_URI")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "worthit")
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:3012")
    ai_provider: str = os.getenv("AI_PROVIDER", "none")
    ai_api_key: str | None = os.getenv("AI_API_KEY")


settings = Settings()
