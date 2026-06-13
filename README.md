# SahAI: Distributed State Engine & Event-Driven Cognitive Architecture

This repository is the master orchestration repository (`SahAI`) for the B2B2C educational cognitive profiling and adaptive testing platform. It implements a sub-millisecond event ingestion gateway, a distributed Bayesian probability inference engine, institutional multi-tenancy, and high-performance curriculum Directed Acyclic Graph (DAG) state propagation.

---

## 🏗️ System Topology & Data Flow

```text
[ Flutter Mobile/Web/Desktop Client ]
                 │
       (HTTP REST / WebSockets)
                 │  (Edge-Compute Sync Payload)
                 ▼
      [ Node.js API Gateway ]
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
  [ MongoDB ]         [ Upstash Redis ]
(Raw Log Audit)      (telemetry_queue)
                            │
                            ▼
               [ Python Inference Worker ]
            (Loads Global DAG into Redis RAM;
             Computes Beta updates & temporal decay)
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
        [ Supabase Postgres ]      [ MongoDB Cache ]
      (User cognitive states:   (Full distribution state)
         alpha, beta, mastery)
```

### The "Global DAG + Localized Delta" Pattern (MNC-Grade Scaling)
To support millions of students with sub-millisecond latency, SahAI avoids duplicating the curriculum's correlation matrix per user. 
* **Global Graph (Immutable)**: The correlation weights ($W_{pre}$, $W_{diag}$) are stored once in the global `advanced_dag_edges` PostgreSQL table. At application startup, the Python worker caches this entire DAG structure into a **Redis Hash** (`global_dag`), reducing database lookup time to **<0.1ms** during telemetry processing.
* **Localized Belief (Dynamic)**: Student mastery is tracked as probability density functions ($\alpha, \beta$ parameters) inside `user_cognitive_states`. Updates are processed in-memory and committed asynchronously back to PostgreSQL and MongoDB.

---

## 📂 Codebase Structure

* `/.github/workflows/ci-cd.yml` - GitHub Actions pipeline featuring automated testing and TruffleHog security scans.
* `/init-db/init.sql` - Bootstraps Postgres tables, whitelists, indices, and performance log schemas.
* `/init-db/seed_json.py` - Dynamically seeds concept lists, correlations, and question banks from models.
* `/services/api-node/` - Express.js REST API gateway managing authentication, user onboarding, and telemetry queuing.
* `/services/engine-python/` - Python queue listener implementing Bayesian updates, temporal Ebbinghaus decay, and Redis DAG cache traversal.
* `/services/ml-training/` - Offline training pipeline computing correlation coefficients.
* `/clients/flutter/` - Frontend codebase compiling to iOS, Android, Desktop, and Flutter Web.

---

## 🚀 Local Deployment & Verification

### 1. Configure the Environment
Ensure your configurations are set in `ENV/.env` (cloned from the secure master template):
```bash
# Relational DB
PG_HOST=your-supabase-host
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your-password
PG_DATABASE=postgres
PG_SSL=true

# Cache & In-Memory Queue
REDIS_URL=rediss://default:your-token@your-upstash-endpoint.upstash.io:6379

# Audit Store
MONGO_URI=mongodb+srv://your-user:your-pass@cluster.mongodb.net/sahai?retryWrites=true&w=majority
```

### 2. Seeding the Database
To populate the database tables with default concepts, correlations, and the question bank:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r services/engine-python/requirements.txt
python init-db/seed_json.py
```

### 3. Running the Python Inference Worker
Start the background worker queue listener:
```bash
PYTHONPATH=services/engine-python/src python services/engine-python/src/main.py
```
Upon startup, the worker will connect to all datastores, fetch the global DAG edges from PostgreSQL, cache them in Upstash Redis RAM, and start polling the `telemetry_queue`.

### 4. Running the API Gateway
```bash
cd services/api-node
npm install
npm start
```
The gateway will start on `http://localhost:3000`.

### 5. Running the Flutter Webapp Locally
To run the client application in development mode:
```bash
cd clients/flutter
flutter pub get
flutter run -d chrome
```

---

## ☁️ Enterprise Cloud Deployment Strategy

### 1. Flutter Web Client on Vercel
Flutter Web compiles to a single-page application (SPA). Since the `build/` folder is gitignored, you cannot push pre-compiled static files. Vercel's standard runner lacks the Flutter SDK to build it on the fly. 

To deploy to Vercel, use a **GitHub Actions CI/CD pipeline**:
1. **Build Step**: Compile the app using the Flutter Action in your GitHub workflow:
   ```yaml
   - name: Setup Flutter
     uses: subosito/flutter-action@v2
     with:
       channel: 'stable'
   - name: Build Web
     run: |
       cd clients/flutter
       flutter build web --release
   ```
2. **Deploy Step**: Upload the generated `clients/flutter/build/web` static folder directly to Vercel using the Vercel GitHub Action (e.g. `amondnet/vercel-action` or `vercel/actions`):
   ```yaml
   - name: Deploy to Vercel
     uses: amondnet/vercel-action@v20
     with:
       vercel-token: ${{ secrets.VERCEL_TOKEN }}
       vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
       vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
       working-directory: clients/flutter/build/web
       vercel-args: '--prod'
   ```
3. **SPAs Routing Rule**: Inside `clients/flutter/vercel.json`, we have configured a rewrite rule mapping all sub-routes back to `index.html` to avoid `404 Not Found` errors on page reloads.

### 2. Node.js Gateway & Python Workers on Railway
Railway natively supports multi-service deployments from a single monorepo.
* **Service A: API Gateway**
  * Root Directory: `services/api-node`
  * Start Command: `npm start`
* **Service B: Inference worker**
  * Root Directory: `services/engine-python`
  * Build Type: Docker (Railway automatically picks up the `Dockerfile` in the subfolder) or Nixpacks.
  * Start Command: `python src/main.py`
  * Add the shared `ENV/.env` variables inside Railway's shared environment interface.

---

## 📶 Low-Internet "Offline-Sync" Engine Design
To support students in rural regions with low-bandwidth (2G/3G) internet connections, SahAI implements the **Edge-Computation & Batch Sync** protocol:

```text
[ Flutter SQLite (Offline) ]  ──(Saves updates locally)──> [ Queue Sync Batches ]
                                                                  │
                                                        (When online, push batch)
                                                                  ▼
                                                      [ Node.js Sync Endpoint ]
                                                                  │
                                                        (Pushed to Redis Queue)
                                                                  ▼
                                                       [ Python Batch Worker ]
```

1. **Client-Side Cache**: During the initial login, the Flutter app downloads the relevant chunk of the concept DAG (e.g., Python Basics nodes) and caches it in the client device using a local `SQLite` database.
2. **Local Inference**: As the student answers questions offline, the Flutter client updates their Beta distributions ($\alpha, \beta$ parameters) **locally on the device** in real-time.
3. **Batch Sync**: The client logs each response metrics without pinging the cloud. When a stable connection is detected, the logged payloads are compiled into a single `BatchUpdate` payload and sent to `/api/user/sync-cognitive-state`.
4. **Conflict Resolution**: The backend processes the batch sequentially based on client timestamps. If the server state has updated in the interim (e.g. the student practiced on another device), the server applies the delta updates ($\Delta\alpha, \Delta\beta$) to the server's master state.
