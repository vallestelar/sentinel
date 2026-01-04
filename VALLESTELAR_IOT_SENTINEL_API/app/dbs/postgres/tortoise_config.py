# app/db/context.py
import os
from dotenv import load_dotenv
from tortoise import Tortoise


load_dotenv()  # Carga las variables del .env

user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "postgres")
host = os.getenv("POSTGRES_HOST", "localhost")
port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "iot_sentinel_db")

db_url = f"postgres://{user}:{password}@{host}:{port}/{db_name}"

MODELS = ["app.models.entities", "aerich.models"] 

TORTOISE_ORM = {
    "connections": {"default": db_url},
    "apps": {
        "models": {
            "models": MODELS,
            "default_connection": "default",
        }
    },
}
