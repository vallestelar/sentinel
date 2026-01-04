from fastapi import FastAPI
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

import logging
from contextlib import asynccontextmanager

from app.core.logging import configure_logging
from app.core.middleware import log_requests
from app.api.v1 import routes
from app.core.exceptions.conflict_handlers import conflict_handler
from app.core.exceptions.domain_exceptions import ConflictError

from app.dbs.postgres.context import DbContext  # <- su clase

configure_logging()
log = logging.getLogger("app")

db = DbContext()  # <- instancia única


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ✅ STARTUP: init DB
    await db.init(generate_schemas=False)  # en dev puede poner True para probar rápido
    log.info("Database initialized")
    yield
    # ✅ SHUTDOWN: close DB
    await db.close()
    log.info("Database connections closed")


app = FastAPI(title="IOT Sentinel API", lifespan=lifespan)

# middleware + excepciones
app.middleware("http")(log_requests)
app.add_exception_handler(ConflictError, conflict_handler)

# routers
for r in routes.all_routers:
    app.include_router(r)

@app.get("/")
def root():
    return {"hello": "fastapi is secure"}

@app.get("/health")
async def health_check():
    return await db.check_connection()
