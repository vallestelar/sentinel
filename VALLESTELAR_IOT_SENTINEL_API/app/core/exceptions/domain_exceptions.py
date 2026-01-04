
class ConflictError(Exception):
    def __init__(self, detail: str, code: str | None = None, meta: dict | None = None):
        self.detail = detail
        self.code = code
        self.meta = meta or {}