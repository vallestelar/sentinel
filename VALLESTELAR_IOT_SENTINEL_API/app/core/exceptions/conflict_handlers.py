import json
from fastapi import Request
from fastapi.responses import JSONResponse
from uuid import UUID
from .domain_exceptions import ConflictError

def to_json_serializable(obj):
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

async def conflict_handler(_: Request, exc: ConflictError):
    content = {
        "error": "conflict",
        "detail": exc.detail,
        "code": exc.code,
        "meta": exc.meta,
    }
    serialized_content = json.loads(json.dumps(content, default=to_json_serializable))
    return JSONResponse(status_code=409, content=serialized_content)
