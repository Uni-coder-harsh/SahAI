# SahAI: Event-Driven, Multi-Tenant Cognitive Architecture

This repository is the central hub ("SahAI-Master") for the B2B2C educational cognitive profiling system. It features sub-millisecond telemetry ingestion, asynchronous Bayesian probability inference, institutional multi-tenancy whitelisting, and curriculum DAG propagation.

---

## 🏗️ System Topology & Data Flow

```text
[ Flutter Mobile/Desktop Clients ]
               │
      (HTTP / WebSockets)
               ▼
   [ Node.js API Gateway ]
               │
    ┌──────────┴──────────┐
    ▼                     ▼
[ MongoDB Log ]     [ Redis Queue ]
(Event Sourcing)    (telemetry_queue)
                          │
                          ▼
              [ Python Math Workers ]
              (Calculates Beta updates & decay)
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
      [ PostgreSQL DB ]        [ MongoDB Cache ]
   (Relational tenant data    (Full distribution
    & cached masteries)        history and flags)
```

1. **Cold Start (Onboarding):** A student registers. The Node.js API creates the user record in PostgreSQL and initializes their belief states in the `user_cognitive_states` table with prior Beta distributions ($\alpha = 1.0, \beta = 1.0$, Expected Mastery = $0.50$).
2. **Telemetry Ingestion:** When the client performs actions, telemetry is sent to Node.js. Node.js writes it to MongoDB as a raw event stream (Event Sourcing) and pushes it to Redis queue, returning a fast HTTP `202 Accepted`.
3. **Cognitive Computation:** The Python worker pops the event, decays the user's prior parameters based on time elapsed (Ebbinghaus forgetting curve), computes the updated Beta distribution, and writes it back to Mongo and Postgres.
4. **DAG Propagation:** The Python worker queries the PG curriculum schema for prerequisite nodes (parents) and propagates discounted rewards or penalties to parent nodes based on edge correlation weights.

---

## 📂 Codebase Structure

* `/docker-compose.yml` - Starts PostgreSQL (pgvector), MongoDB, and Redis.
* `/init-db/init.sql` - Bootstraps Postgres tables, indexes, and a 15-node Computer Science core syllabus.
* `/services/api-node/` - Node.js Express server handling client requests and queueing telemetry.
* `/services/engine-python/` - Python worker implementing Bayesian logic and DAG propagation.
* `/tests/integration_test.js` - Self-contained integration test script verifying the complete loop.

---

## 🚀 Local Deployment & Verification

### 1. Boot up database containers
Ensure Docker is running, then start the containers:
```bash
docker compose up -d
```
This loads PostgreSQL on port `5432` (seeded with the CS curriculum graph), MongoDB on port `27017`, and Redis on port `6379`.

### 2. Run Python Math Unit Tests
Ensure you have Python 3.12+ installed:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r services/engine-python/requirements.txt
PYTHONPATH=services/engine-python pytest services/engine-python/tests/test_math.py
```

### 3. Start the API Gateway
In a terminal, run:
```bash
cd services/api-node
npm install
npm start
```
The server will bind to port `3000`.

### 4. Start the Inference Worker
In another terminal, run:
```bash
source venv/bin/activate
python services/engine-python/src/worker.py
```
The worker will begin polling messages from Redis.

### 5. Run the End-to-End Integration Test
Verify telemetry logging, queue processing, math updates, and DAG propagation:
```bash
node tests/integration_test.js
```

---

## 📂 Git Submodule Strategy

To isolate developer actions across teams (Flutter, Node, Python) while locking in stable releases:
1. Create independent GitHub repositories for `sahai-client-flutter`, `sahai-api-node`, and `sahai-engine-python`.
2. Delete the local folders if you want to pull clean submodules:
```bash
git submodule add https://github.com/your-org/sahai-client-flutter.git clients/flutter
git submodule add https://github.com/your-org/sahai-api-node.git services/api-node
git submodule add https://github.com/your-org/sahai-engine-python.git services/engine-python
```
3. To pull down all repositories on a fresh clone:
```bash
git clone --recurse-submodules https://github.com/your-org/SahAI-Master.git
```
