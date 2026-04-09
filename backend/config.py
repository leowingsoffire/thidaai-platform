from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./thidaai.db"
    openai_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""
    telegram_bot_token: str = ""
    telegram_webhook_url: str = ""  # e.g. https://yourdomain.com/api/telegram/webhook
    viber_auth_token: str = ""
    viber_bot_name: str = "AIA Thida Soe"
    viber_webhook_url: str = ""  # e.g. https://yourdomain.com/api/viber/webhook
    app_env: str = "development"
    app_secret_key: str = "change-this"
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:5180,http://localhost:3000,https://frontend-five-lake-93.vercel.app"

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
