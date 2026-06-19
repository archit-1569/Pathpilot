from functools import lru_cache
from pathlib import Path
from urllib.parse import unquote

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_name: str = "PathPilot AI API"
    api_v1_prefix: str = "/api/v1"
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def sqlalchemy_database_url(self) -> str | URL:
        if self.database_url.startswith(("postgresql://", "postgresql+psycopg://")):
            # Split from the right so raw "@" characters in local passwords
            # are not mistaken for the start of the hostname.
            driver_and_credentials, host_and_database = self.database_url.rsplit("@", 1)
            driver, credentials = driver_and_credentials.split("://", 1)
            username, password = credentials.split(":", 1)
            host_and_port, database = host_and_database.split("/", 1)
            host, separator, port = host_and_port.rpartition(":")

            return URL.create(
                drivername="postgresql+psycopg" if driver == "postgresql" else driver,
                username=unquote(username),
                password=unquote(password),
                host=host if separator else host_and_port,
                port=int(port) if separator else None,
                database=database,
            )
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
