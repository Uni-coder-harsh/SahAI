import os
import json
import psycopg2
import uuid
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

# Deterministic UUID generation
NAMESPACE = uuid.NAMESPACE_DNS
def get_q_uuid(q_id):
    return str(uuid.uuid5(NAMESPACE, f"question_{q_id}"))

def get_opt_uuid(q_id, opt_letter):
    return str(uuid.uuid5(NAMESPACE, f"option_{q_id}_{opt_letter}"))

def main():
    print("[Seeder] Connecting to database...")
    conn = connect_postgres()
    conn.autocommit = False
    cur = conn.cursor()
    
    try:
        # 1. Load concepts
        concepts_path = root_dir / "models" / "python_concept_list.json"
        print(f"[Seeder] Loading concepts from {concepts_path}...")
        with open(concepts_path, "r") as f:
            concepts = json.load(f)
            
        for concept in concepts:
            node_id = concept["node_id"]
            concept_name = concept["concept_name"]
            difficulty = float(concept["difficulty_baseline"])
            
            cur.execute("""
                INSERT INTO concept_nodes (node_id, domain, concept_name, difficulty_baseline)
                VALUES (%s, 'CS', %s, %s)
                ON CONFLICT (node_id) DO UPDATE SET
                    concept_name = EXCLUDED.concept_name,
                    difficulty_baseline = EXCLUDED.difficulty_baseline;
            """, (node_id, concept_name, difficulty))
        print(f"[Seeder] Inserted/Updated {len(concepts)} concepts.")

        # 2. Load correlations
        correlations_path = root_dir / "models" / "python_correlation_matrix.json"
        print(f"[Seeder] Loading correlations from {correlations_path}...")
        with open(correlations_path, "r") as f:
            correlations = json.load(f)
            
        for corr in correlations:
            src = corr["source_node"]
            tgt = corr["target_node"]
            w_pre = float(corr["w_pre"])
            w_diag = float(corr["w_diag"])
            # Average as baseline correlation weight
            avg_weight = (w_pre + w_diag) / 2.0
            
            cur.execute("""
                INSERT INTO advanced_dag_edges (source_node, target_node, context_domain, edge_type, correlation_weight, w_pre, w_diag)
                VALUES (%s, %s, 'CS', 'PREREQUISITE', %s, %s, %s)
                ON CONFLICT (source_node, target_node, context_domain) DO UPDATE SET
                    correlation_weight = EXCLUDED.correlation_weight,
                    w_pre = EXCLUDED.w_pre,
                    w_diag = EXCLUDED.w_diag;
            """, (src, tgt, avg_weight, w_pre, w_diag))
        print(f"[Seeder] Inserted/Updated {len(correlations)} correlation edges.")

        # 3. Load question bank
        questions_path = root_dir / "models" / "python_question_bank.json"
        print(f"[Seeder] Loading questions from {questions_path}...")
        with open(questions_path, "r") as f:
            questions = json.load(f)

        # We want to flag exactly 7 questions as diagnostic/initial test
        # Let's pick 7 questions distributed across difficulty
        # Sort questions by question_id or select specific ones
        # E.g. PY_Q_001, PY_Q_008, PY_Q_015, PY_Q_022, PY_Q_030, PY_Q_038, PY_Q_045
        diagnostic_set = {"PY_Q_001", "PY_Q_008", "PY_Q_015", "PY_Q_022", "PY_Q_030", "PY_Q_038", "PY_Q_045"}
        
        q_count = 0
        o_count = 0
        l_count = 0
        m_count = 0
        
        for q in questions:
            q_id = q["question_id"]
            print(f"[Seeder] Processing question {q_id}...")
            q_uuid = get_q_uuid(q_id)
            q_text = q["q_text"]
            difficulty = float(q["difficulty"])
            is_initial = q_id in diagnostic_set
            
            # Insert question
            cur.execute("""
                INSERT INTO questions (id, question_text, difficulty_level, expected_time, is_initial_test)
                VALUES (%s, %s, %s, 60, %s)
                ON CONFLICT (id) DO UPDATE SET
                    question_text = EXCLUDED.question_text,
                    difficulty_level = EXCLUDED.difficulty_level,
                    is_initial_test = EXCLUDED.is_initial_test;
            """, (q_uuid, q_text, difficulty, is_initial))
            q_count += 1
            
            # Insert options
            correct_opt_letter = q["correct_option"]
            correct_opt_uuid = None
            
            for letter, opt_data in q["options"].items():
                opt_uuid = get_opt_uuid(q_id, letter)
                opt_text = opt_data["text"]
                
                cur.execute("""
                    INSERT INTO options (id, question_id, option_letter, option_text)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        option_text = EXCLUDED.option_text;
                """, (opt_uuid, q_uuid, letter, opt_text))
                o_count += 1
                
                if letter == correct_opt_letter:
                    correct_opt_uuid = opt_uuid
                    
                # Option Misconceptions (if any)
                misc_concepts = opt_data.get("misconception_concepts", [])
                for misc in misc_concepts:
                    m_node = misc["node_id"]
                    m_weight = float(misc["weight"])
                    
                    cur.execute("""
                        INSERT INTO option_concept_misconceptions (option_id, node_id, weight)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (option_id, node_id) DO UPDATE SET
                            weight = EXCLUDED.weight;
                    """, (opt_uuid, m_node, m_weight))
                    m_count += 1
            
            # Set correct_option_id
            if correct_opt_uuid:
                cur.execute("""
                    UPDATE questions SET correct_option_id = %s WHERE id = %s;
                """, (correct_opt_uuid, q_uuid))
                
            # Question concept links
            coverage = q.get("concept_coverage", [])
            for cov in coverage:
                c_node = cov["node_id"]
                c_weight = float(cov["weight"])
                
                cur.execute("""
                    INSERT INTO question_concept_links (question_id, node_id, weight)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (question_id, node_id) DO UPDATE SET
                        weight = EXCLUDED.weight;
                """, (q_uuid, c_node, c_weight))
                l_count += 1
                
        print(f"[Seeder] Committed {q_count} questions, {o_count} options, {l_count} concept links, and {m_count} misconceptions.")
        conn.commit()
        print("[Seeder] Database successfully seeded!")
        
    except Exception as e:
        conn.rollback()
        print(f"[Seeder] ERROR during seeding: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
