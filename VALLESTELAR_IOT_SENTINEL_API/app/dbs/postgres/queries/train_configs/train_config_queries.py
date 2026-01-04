# app.dbs.postgres.queries.train_configs.train_config_queries.py
from typing import Final

class TrainConfigQuerys:
    
    GET_BY_ID: Final[str] = """
        SELECT m.id, environment, region, role_arn, bucket, prefix, framework_version, py_version, 
        code_version, instance_type, hyperparameters, base_job_name, base_endpoint_name, is_active, 
        ml_model_type_id as ml_model_type, mt.name as model_type_name, aty.id as asset_type, aty.name as asset_type_name
        FROM public.ml_train_configs as m
        INNER JOIN public.ml_model_types as mt ON m.ml_model_type_id = mt.id
        INNER JOIN public.asset_types as aty ON m.asset_type_id = aty.id
        WHERE m.id = $1
    """
    
    
    GET_BY_MODEL_TYPE: Final[str] = """
        SELECT m.id, environment, region, role_arn, bucket, prefix, framework_version, py_version, 
        code_version, instance_type, hyperparameters, base_job_name, base_endpoint_name, is_active, 
        ml_model_type_id as ml_model_type, mt.name as model_type_name, aty.id as asset_type, aty.name as asset_type_name
        FROM public.ml_train_configs as m
        INNER JOIN public.ml_model_types as mt ON m.ml_model_type_id = mt.id
        INNER JOIN public.asset_types as aty ON m.asset_type_id = aty.id
        WHERE mt.id = $1
    """

    GET_BY_NAMES_ENV_AND_CODE_VERSION: Final[str] = """
        SELECT
            c.id, c.environment, c.region, c.role_arn, c.bucket, c.prefix,
            c.framework_version, c.py_version, c.code_version, c.instance_type,
            c.hyperparameters, c.base_job_name, c.base_endpoint_name, c.is_active,
            m.id AS ml_model_type, m.name AS model_type_name,
            a.id AS asset_type, a.name AS asset_type_name
        FROM public.ml_train_configs c
        JOIN public.asset_types a  ON c.asset_type_id = a.id
        JOIN public.ml_model_types m ON c.ml_model_type_id = m.id
        WHERE a.name = $1
          AND m.name = $2
          AND c.environment = $3
          AND c.code_version = $4
          AND c.region= $5
        ORDER BY c.updated_at DESC
    """

    GET_ACTIVE_BY_NAMES_AND_ENV: Final[str] = """
        SELECT
            c.id, c.environment, c.region, c.role_arn, c.bucket, c.prefix,
            c.framework_version, c.py_version, c.code_version, c.instance_type,
            c.hyperparameters, c.base_job_name, c.base_endpoint_name, c.is_active,
            m.id AS ml_model_type, m.name AS model_type_name,
            a.id AS asset_type, a.name AS asset_type_name
        FROM public.ml_train_configs c
        JOIN public.asset_types a  ON c.asset_type_id = a.id
        JOIN public.ml_model_types m ON c.ml_model_type_id = m.id
        WHERE a.name = $1
          AND m.name = $2
          AND c.environment = $3
          AND c.region= $4
          AND c.is_active = true
        ORDER BY c.updated_at DESC
    """