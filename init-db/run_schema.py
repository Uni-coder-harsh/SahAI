import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
root_dir = Path(__file__).resolve().parents[1]
env_path = root_dir / "ENV" / ".env"
load_dotenv(dotenv_path=env_path)

PG_HOST = os.environ.get("PG_HOST")
PG_PORT = int(os.environ.get("PG_PORT", 5432)) if os.environ.get("PG_PORT") else None
PG_USER = os.environ.get("PG_USER")
PG_PASSWORD = os.environ.get("PG_PASSWORD")
PG_DATABASE = os.environ.get("PG_DATABASE")
PG_SSL = os.environ.get("PG_SSL", "false").lower() == "true"

def connect_postgres():
    kwargs = {
        "host": PG_HOST,
        "port": PG_PORT,
        "user": PG_USER,
        "password": PG_PASSWORD,
        "dbname": PG_DATABASE
    }
    if PG_SSL:
        kwargs["sslmode"] = "require"
    return psycopg2.connect(**kwargs)

def drop_all_tables(cur):
    print("[Schema Exec] Dropping all existing tables to start fresh...")
    cur.execute(
        """
        DROP TABLE IF EXISTS user_handwriting_responses CASCADE;
        DROP TABLE IF EXISTS user_question_responses CASCADE;
        DROP TABLE IF EXISTS option_concept_misconceptions CASCADE;
        DROP TABLE IF EXISTS question_concept_links CASCADE;
        DROP TABLE IF EXISTS options CASCADE;
        DROP TABLE IF EXISTS questions CASCADE;
        DROP TABLE IF EXISTS user_concept_correlations CASCADE;
        DROP TABLE IF EXISTS concept_correlations CASCADE;
        DROP TABLE IF EXISTS user_cognitive_states CASCADE;
        DROP TABLE IF EXISTS advanced_dag_edges CASCADE;
        DROP TABLE IF EXISTS concept_nodes CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS institutions CASCADE;
        """
    )
    print("[Schema Exec] All tables dropped successfully.")

def main():
    print("[Schema Exec] Connecting to database...")
    conn = connect_postgres()
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        if "--drop" in sys.argv:
            drop_all_tables(cur)
            
        # 1. Read and execute init.sql
        init_sql_path = root_dir / "init-db" / "init.sql"
        print(f"[Schema Exec] Executing {init_sql_path}...")
        with open(init_sql_path, "r") as f:
            init_sql = f.read()
        cur.execute(init_sql)
        print("[Schema Exec] init.sql executed successfully.")

        # 2. Read and execute ml_schema.sql
        ml_sql_path = root_dir / "init-db" / "ml_schema.sql"
        print(f"[Schema Exec] Executing {ml_sql_path}...")
        with open(ml_sql_path, "r") as f:
            ml_sql = f.read()
        cur.execute(ml_sql)
        print("[Schema Exec] ml_schema.sql executed successfully.")
        
    except Exception as e:
        print(f"[Schema Exec] ERROR during schema execution: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
