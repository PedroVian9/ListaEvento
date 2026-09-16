from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    admin_username: str = "pedro"
    admin_password: str = Field(min_length=12)
    jwt_secret: str = Field(min_length=32)
    database_url: str = "sqlite:///./database.db"
    frontend_origin: str = "http://localhost:5173"
    cookie_secure: bool = False
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
