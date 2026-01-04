import uuid
import logging
from fastapi import Request

log = logging.getLogger("app")

# Middleware for request correlation and trace logging
async def log_requests(request: Request, call_next):
    # Reuse existing IDs if provided by ALB/ECS/X-Ray; otherwise generate a new one
    req_id = request.headers.get("X-Request-Id") \
             or request.headers.get("X-Amzn-Trace-Id") \
             or str(uuid.uuid4())
    
    # Store the request ID in the request state so it can be accessed later
    request.state.request_id = req_id

    # Log the start of the request
    log.info("request.start",
             extra={"path": request.url.path, "method": request.method, "request_id": req_id})
    try:
        # Process the request and get the response
        response = await call_next(request)
    except Exception as ex:
        # Log the error if an exception occurs during request handling
        log.exception("request.error",
                      extra={"request_id": req_id, "path": request.url.path, "method": request.method})
        raise

    # Include the request ID in the response headers to propagate downstream
    response.headers["X-Request-Id"] = req_id

    # Log the end of the request including the status code
    log.info("request.end",
             extra={"path": request.url.path, "method": request.method,
                    "status_code": response.status_code, "request_id": req_id})
    return response
