import logging
import os
import sys
from pythonjsonlogger import jsonlogger

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

def configure_logging():
    root = logging.getLogger()
    root.setLevel(LOG_LEVEL)

    # Clear existing handlers in case of re-execution (tests / reload)
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    fmt = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s %(pathname)s %(lineno)s %(process)d %(threadName)s"
    )
    handler.setFormatter(fmt)
    root.addHandler(handler)

    # Adjust log levels to reduce noise from common libraries
    logging.getLogger("uvicorn").setLevel(LOG_LEVEL)
    logging.getLogger("uvicorn.error").setLevel(LOG_LEVEL)
    logging.getLogger("uvicorn.access").setLevel(LOG_LEVEL)
    logging.getLogger("botocore").setLevel("WARNING")
    logging.getLogger("boto3").setLevel("WARNING")
