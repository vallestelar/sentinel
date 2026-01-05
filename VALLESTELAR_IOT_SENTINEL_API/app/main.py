from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

import logging
from contextlib import asynccontextmanager

from app.core.logging import configure_logging
from app.core.middleware import log_requests
from app.api.v1 import routes
from app.core.exceptions.conflict_handlers import conflict_handler
from app.core.exceptions.domain_exceptions import ConflictError
from app.dbs.postgres.context import DbContext

configure_logging()
log = logging.getLogger("app")

db = DbContext()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init(generate_schemas=False)
    log.info("Database initialized")
    yield
    await db.close()
    log.info("Database connections closed")

app = FastAPI(title="IOT Sentinel API", lifespan=lifespan)

# ✅ rutas absolutas (robusto)
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/login", status_code=302)

@app.get("/login", response_class=HTMLResponse, include_in_schema=False)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/backoffice", response_class=HTMLResponse, include_in_schema=False)
async def backoffice_page(request: Request):
    return templates.TemplateResponse("backoffice.html", {"request": request})

@app.get("/backoffice/", include_in_schema=False)
async def backoffice_redirect():
    return RedirectResponse(url="/backoffice", status_code=302)

app.middleware("http")(log_requests)
app.add_exception_handler(ConflictError, conflict_handler)

for r in routes.all_routers:
    app.include_router(r)

@app.get("/health")
async def health_check():
    return await db.check_connection()
