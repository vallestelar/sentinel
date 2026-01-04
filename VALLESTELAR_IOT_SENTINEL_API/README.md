# FastAPI Backend – Insights Project

This backend exposes a REST API using FastAPI to query prediction models in SageMaker, access time series data from InfluxDB, and manage orders using PostgreSQL.

## Main Services

- **FastAPI**: `/api/v1/predict/` and `/health`
- **PostgreSQL**: Relational database for configuration and data
- **InfluxDB**: Sensor readings in time series format
- **SageMaker**: ML endpoint for predictions
- **S3**: AWS storage

## Configuration and Local Setup

### Create and activate a virtual environment
```
python -m venv venv
```
```
.\venv\Scripts\Activate.ps1
```
### Install packages
```
pip install -r requirements.txt
```
### Add new packages 
```
pip install <nuevo-paquete>
```
```
pip freeze > requirements.txt
```
### Run local
```
uvicorn app.main:app --reload
```
### Run local cuando dice que falta algun paquete

```
.\venv\Scripts\python -m uvicorn app.main:app --reload     
```
###  run local with Docker
```
docker-compose up --build -d
```
### deploy api
```
npm run ecr-publish
```
# deploy api
npm run ecr-publish

## Database migration
### In order to perform the database migration, follow the next steps:
```
aerich init -t app.dbs.postgres.tortoise_config.TORTOISE_ORM
```
### Create an initial state
```
aerich init-db
```
### Create migration
If you have already performed a migration before, you can start from this step for a new migration.
```
aerich migrate --name first
```
### Upgrade database
```
aerich upgrade
```

