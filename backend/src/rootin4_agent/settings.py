"""Pydantic settings for the Rootin4 agent service."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Gemini ---
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    google_genai_use_vertexai: bool = Field(
        default=False, alias="GOOGLE_GENAI_USE_VERTEXAI"
    )
    google_cloud_project: str | None = Field(default=None, alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str = Field(
        default="us-central1", alias="GOOGLE_CLOUD_LOCATION"
    )

    # --- Phoenix (Arize observability) ---
    phoenix_collector_endpoint: str = Field(
        default="https://app.phoenix.arize.com",
        alias="PHOENIX_COLLECTOR_ENDPOINT",
    )
    phoenix_api_key: str | None = Field(default=None, alias="PHOENIX_API_KEY")
    phoenix_project_name: str = Field(default="rootin4", alias="PHOENIX_PROJECT_NAME")

    # --- App ---
    rootin4_env: str = Field(default="local", alias="ROOTIN4_ENV")
    rootin4_database_url: str | None = Field(
        default=None, alias="ROOTIN4_DATABASE_URL"
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor."""
    return Settings()
