import json
import time
from datetime import datetime, timezone
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
from pymongo import MongoClient

import config
from math_engine import process_cognitive_update, calculate_expected_mastery, apply_ebbinghaus_decay

def get_db_connections():
    """Establishes connections to Redis, PostgreSQL, and MongoDB."""
    # Connect to Redis
    r_client = redis.from_url(config.REDIS_URL)
    
    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(
        host=config.PG_HOST,
        port=config.PG_PORT,
        user=config.PG_USER,
        password=config.PG_PASSWORD,
        dbname=config.PG_DATABASE
    )
    
    # Connect to MongoDB
    mongo_client = MongoClient(config.MONGO_URI)
    mongo_db = mongo_client.get_default_database()
    
    return r_client, pg_conn, mongo_db

def fetch_or_init_state(user_id, node_id, mongo_db, pg_conn):
    """
    Retrieves the user's cognitive distribution from MongoDB.
    If it does not exist, it initializes one and syncs it with PostgreSQL.
    """
    col = mongo_db["student_cognitive_distributions"]
    doc = col.find_one({"user_id": user_id, "node_id": node_id})
    
    if doc:
        return doc
        
    # Init new state (Gaussian prior / uniform: alpha=1.0, beta=1.0)
    now_str = datetime.now(timezone.utc).isoformat()
    new_doc = {
      "user_id": user_id,
      "node_id": node_id,
      "distribution": {
        "type": "BETA",
        "alpha": 1.0,
        "beta": 1.0,
        "variance": 0.0833, # Var[Beta(1,1)] = 1/12
        "confidence_interval_95": [0.05, 0.95]
      },
      "temporal_factors": {
        "last_practiced": now_str,
        "forgetting_curve_decay_rate": 0.02, 
        "current_adjusted_mastery": 0.50
      },
      "behavioral_flags": []
    }
    
    # Save to MongoDB
    col.insert_one(new_doc)
    
    # Sync with PostgreSQL
    with pg_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_cognitive_states (user_id, node_id, alpha, beta, expected_mastery, last_practiced)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (user_id, node_id) DO NOTHING;
            """,
            (user_id, node_id, 1.0, 1.0, 0.50)
        )
        pg_conn.commit()
        
    return new_doc

def save_cognitive_state(user_id, node_id, alpha, beta, mastery, behavioral_flags, last_practiced_dt, mongo_db, pg_conn):
    """Saves updated parameters to both MongoDB and PostgreSQL cache."""
    # Update MongoDB
    col = mongo_db["student_cognitive_distributions"]
    variance = (alpha * beta) / (((alpha + beta) ** 2) * (alpha + beta + 1.0))
    
    # Simplified 95% Confidence Interval for Beta distribution
    lower_ci = max(0.01, mastery - 1.96 * (variance ** 0.5))
    upper_ci = min(0.99, mastery + 1.96 * (variance ** 0.5))
    
    col.update_one(
        {"user_id": user_id, "node_id": node_id},
        {
            "$set": {
                "distribution.alpha": float(alpha),
                "distribution.beta": float(beta),
                "distribution.variance": float(variance),
                "distribution.confidence_interval_95": [float(lower_ci), float(upper_ci)],
                "temporal_factors.last_practiced": last_practiced_dt.isoformat(),
                "temporal_factors.current_adjusted_mastery": float(mastery)
            },
            "$addToSet": {
                "behavioral_flags": {"$each": behavioral_flags}
            }
        },
        upsert=True
    )
    
    # Update PostgreSQL Cache
    with pg_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_cognitive_states (user_id, node_id, alpha, beta, expected_mastery, last_practiced, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (user_id, node_id) DO UPDATE SET
                alpha = EXCLUDED.alpha,
                beta = EXCLUDED.beta,
                expected_mastery = EXCLUDED.expected_mastery,
                last_practiced = EXCLUDED.last_practiced,
                updated_at = NOW();
            """,
            (user_id, node_id, float(alpha), float(beta), float(mastery), last_practiced_dt)
        )
        pg_conn.commit()

def propagate_updates_up_dag(user_id, target_node, success, event_timestamp, mongo_db, pg_conn, gamma=0.5):
    """
    Query Postgres for prerequisites (incoming advanced_dag_edges) of the target node.
    Propagates a discounted update to them.
    """
    with pg_conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT source_node, correlation_weight 
            FROM advanced_dag_edges 
            WHERE target_node = %s;
            """,
            (target_node,)
        )
        edges = cur.fetchall()
        
    for edge in edges:
        parent_node = edge["source_node"]
        weight = float(edge["correlation_weight"])
        
        # Fetch current state of parent
        parent_state = fetch_or_init_state(user_id, parent_node, mongo_db, pg_conn)
        
        # Calculate time decay
        last_practiced_str = parent_state["temporal_factors"]["last_practiced"]
        last_practiced_dt = datetime.fromisoformat(last_practiced_str.replace("Z", "+00:00"))
        time_delta = (event_timestamp - last_practiced_dt).total_seconds() / (24 * 3600.0)
        time_delta_days = max(0.0, time_delta)
        
        decay_rate = parent_state["temporal_factors"].get("forgetting_curve_decay_rate", 0.02)
        
        # Apply decay to prior parameters
        decayed_alpha = apply_ebbinghaus_decay(
            parent_state["distribution"]["alpha"], 
            time_delta_days, 
            decay_rate
        )
        decayed_beta = parent_state["distribution"]["beta"]
        
        # Propagate discounted update
        discounted_delta = weight * gamma
        if success:
            new_alpha = decayed_alpha + discounted_delta
            new_beta = decayed_beta
        else:
            new_alpha = decayed_alpha
            new_beta = decayed_beta + discounted_delta
            
        new_mastery = calculate_expected_mastery(new_alpha, new_beta)
        
        # Save updated parent state
        save_cognitive_state(
            user_id, 
            parent_node, 
            new_alpha, 
            new_beta, 
            new_mastery, 
            [], 
            event_timestamp, 
            mongo_db, 
            pg_conn
        )
        print(f"Propagated update up from {target_node} -> parent: {parent_node} (Mastery: {new_mastery:.4f})")

def process_telemetry_event(event, mongo_db, pg_conn):
    """
    Loads user state, runs Bayesian updates, runs behavior updates,
    saves new parameters, and propagates updates up the DAG.
    """
    user_id = event["user_id"]
    node_id = event["node_id"]
    success = event["success"]
    behavioral_flags = event.get("behavioral_flags", [])
    event_time_str = event["timestamp"]
    
    # Parse timestamp
    if isinstance(event_time_str, str):
        event_timestamp = datetime.fromisoformat(event_time_str.replace("Z", "+00:00"))
    else:
        # Handles BSON datetime from MongoDB directly
        event_timestamp = event_time_str
        
    print(f"\nProcessing telemetry for User: {user_id}, Node: {node_id}, Success: {success}")
    
    # 1. Fetch current belief state parameters
    state = fetch_or_init_state(user_id, node_id, mongo_db, pg_conn)
    
    prior_alpha = state["distribution"]["alpha"]
    prior_beta = state["distribution"]["beta"]
    
    last_practiced_str = state["temporal_factors"]["last_practiced"]
    last_practiced_dt = datetime.fromisoformat(last_practiced_str.replace("Z", "+00:00"))
    
    time_delta = (event_timestamp - last_practiced_dt).total_seconds() / (24 * 3600.0)
    last_practiced_days = max(0.0, time_delta)
    
    decay_rate = state["temporal_factors"].get("forgetting_curve_decay_rate", 0.02)
    
    # 2. Compute the update
    new_alpha, new_beta, expected_mastery = process_cognitive_update(
        prior_alpha=prior_alpha,
        prior_beta=prior_beta,
        last_practiced_days=last_practiced_days,
        decay_rate=decay_rate,
        success=success,
        behavioral_flags=behavioral_flags
    )
    
    # 3. Save the update
    save_cognitive_state(
        user_id=user_id,
        node_id=node_id,
        alpha=new_alpha,
        beta=new_beta,
        mastery=expected_mastery,
        behavioral_flags=behavioral_flags,
        last_practiced_dt=event_timestamp,
        mongo_db=mongo_db,
        pg_conn=pg_conn
    )
    print(f"Updated Node: {node_id} (Mastery: {expected_mastery:.4f}, Alpha: {new_alpha:.2f}, Beta: {new_beta:.2f})")
    
    # 4. Propagate up the Curriculum DAG
    propagate_updates_up_dag(
        user_id=user_id,
        target_node=node_id,
        success=success,
        event_timestamp=event_timestamp,
        mongo_db=mongo_db,
        pg_conn=pg_conn
    )

def main():
    print("Initializing Python Inference Engine Worker...")
    
    r_client, pg_conn, mongo_db = None, None, None
    retries = 10
    
    # Wait for database availability (critical for Docker Compose boots)
    for i in range(retries):
        try:
            r_client, pg_conn, mongo_db = get_db_connections()
            print("Successfully connected to Redis, PostgreSQL, and MongoDB.")
            break
        except Exception as e:
            print(f"Database connection attempt {i+1}/{retries} failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)
            
    if not r_client:
        print("Fatal: Could not connect to database services. Exiting.")
        return
        
    print(f"Listening on Redis queue: '{config.TELEMETRY_QUEUE}'...")
    
    try:
        while True:
            try:
                # Blocking pop from Redis queue (blpop returns (queue_name, message))
                packed = r_client.blpop(config.TELEMETRY_QUEUE, timeout=5)
                if packed:
                    _, message_json = packed
                    try:
                        event = json.loads(message_json)
                        process_telemetry_event(event, mongo_db, pg_conn)
                    except Exception as ex:
                        print(f"Error processing message: {ex}")
            except redis.exceptions.TimeoutError:
                # Socket timeout handler to retry
                continue
    except KeyboardInterrupt:
        print("Worker shutting down gracefully.")
    finally:
        if pg_conn:
            pg_conn.close()

if __name__ == "__main__":
    main()
