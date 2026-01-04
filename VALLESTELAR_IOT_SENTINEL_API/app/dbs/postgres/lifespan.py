from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI
from app.dbs.postgres.context import DbContext
from app.core.logging import configure_logging
import logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    log = logging.getLogger("app")

    db = DbContext()

    await db.init(generate_schemas=False) # set to True only in dev env
    app.state.db_ctx = db    
    log.info("DB initialized")
    try:
        yield
    finally:
        await db.close()
        log.info("DB connections closed")