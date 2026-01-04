# app/db/context.py
import os
from dotenv import load_dotenv
from tortoise import Tortoise

load_dotenv()  # Carga las variables del .env

class DbContext:
    def __init__(self):
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "")
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "postgres")

        self.db_url = f"postgres://{user}:{password}@{host}:{port}/{db_name}"

        self.tortoise_config = {
            "connections": {"default": self.db_url},
            "apps": {
                "models": {
                    # Importa todos los modelos desde tu carpeta
                    "models": ["app.models.entities", "aerich.models"],
                    "default_connection": "default",
                }
            },
        }

    async def init(self, generate_schemas: bool = False):
        """Initialize the database connection."""
        await Tortoise.init(config=self.tortoise_config)
        if generate_schemas:
            await Tortoise.generate_schemas()

    async def close(self):
        """Close the database connection."""
        await Tortoise.close_connections()
        
    def get_connection(self):
        """Return the default connection."""
        return Tortoise.get_connection("default")

    async def check_connection(self) -> bool:
        """
        Return True if the DB responds, False if there is an error.
        """
        try:
            conn = self.get_connection()
            await conn.execute_query("SELECT 1")
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": f"Database connection failed: {e}"}
        
