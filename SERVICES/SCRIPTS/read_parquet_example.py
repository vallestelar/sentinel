# read_parquet_example.py
import pandas as pd
from pathlib import Path

parquet_path = Path(
    "C:/Users/anton/OneDrive/Escritorio/REPO_VALLESTELAR/VALLESTELAR_AURORA/"
    "VALLESTELAR_AURORA_SERVICES/PREFECT/orchestrator/data/raw/day=2025-10-18/raw_1760809891.parquet"
)

parquet_path2 = Path(
    "C:/Users/anton/OneDrive/Escritorio/REPO_VALLESTELAR/VALLESTELAR_AURORA/"
    "VALLESTELAR_AURORA_SERVICES/PREFECT/orchestrator/data/etl/day=2025-10-18/telemetry_etl.parquet"
)

if parquet_path.exists():
    df = pd.read_parquet(parquet_path)
    print(f"\n✅ Archivo leído correctamente: {parquet_path}")
    print(f"Total de filas: {len(df)}\n")
    print(df.head())  # muestra las primeras 5 filas
else:
    print(f"❌ No se encontró el archivo Parquet en: {parquet_path}")


if parquet_path2.exists():
    df2 = pd.read_parquet(parquet_path2)
    print(f"\n✅ Archivo leído correctamente: {parquet_path}")
    print(f"Total de filas: {len(df)}\n")
    print(df2.head())  # muestra las primeras 5 filas
else:
    print(f"❌ No se encontró el archivo Parquet en: {parquet_path}")