# app.dbs.postgres.querys.train_configs.train_queries_responses.py
from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID
from datetime import datetime
import json

class TrainConfigQueryResponse(BaseModel):
    id: UUID
    asset_type: UUID
    asset_type_name: str | None
    ml_model_type: UUID
    model_type_name: str | None
    environment: str
    region: str | None
    role_arn: str | None
    bucket: str | None
    prefix: str | None
    framework_version: str | None
    py_version: str | None
    code_version: str | None
    instance_type: str | None
    hyperparameters: dict = Field(default_factory=dict)
    base_job_name: str | None
    base_endpoint_name: str | None
    is_active: bool
    
    model_config = ConfigDict(from_attributes=False)
    
    
    @field_validator("hyperparameters", mode="before")
    def parse_hparams(cls, v):
        if v is None:
            return {}
        if isinstance(v, str):
            return json.loads(v)  # convierte cadena JSON a dict
        return v

