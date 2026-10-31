import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: Union[List[str], str] = ["*"]
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Database
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "interview_generator_db"

    # AI Service (Google Gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # De-duplication & Embeddings
    DEDUP_THRESHOLD: float = 0.85
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    @property
    def MONGODB_URL(self) -> str:
        return self.MONGODB_URI

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            return [i.strip() for i in self.CORS_ORIGINS.split(",") if i.strip()]
        return ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=(".env", "Backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


def get_settings() -> Settings:
    return settings

