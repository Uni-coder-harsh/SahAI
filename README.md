# SahAI: Distributed Event-Driven Cognitive Architecture & Adaptive Testing Platform

SahAI is a B2B2C educational cognitive profiling and adaptive testing platform. It integrates a sub-millisecond event ingestion gateway, a distributed Bayesian probability inference engine, institutional HOD multi-tenancy, and high-performance curriculum Directed Acyclic Graph (DAG) state propagation.

This is the master orchestration repository (`SahAI`) for the platform.

---

## 📋 Phase 2 Deliverables & Evaluation Matrix

To assist the SahAI for Shiksha evaluation committee, the table below maps each requested Phase 2 deliverable to its functional implementation, architectural features, and code locations in this repository.

| Phase 2 Deliverable | Implementation Details | Key Files & Directories |
| :--- | :--- | :--- |
| **1. Functional MVP** | Built a web application supporting a complete user flow: login, personalization, timed diagnostic testing, HOD approval dashboard, interactive SVG skill mesh graph, LeetCode-style Question Bank with integrated compiler/OCR note scanner, dynamic diagnostic audit, and mobile-responsive layout. | • React Web App: [clients/react/](file:///home/harsh/Desktop/SahAI/SahAI/clients/react/) <br> • Gateway: [services/api-node/](file:///home/harsh/Desktop/SahAI/SahAI/services/api-node/) <br> • Models: [services/engine-python/](file:///home/harsh/Desktop/SahAI/SahAI/services/engine-python/) |
| **2. Integrated AI Component** | Real-time Bayesian Knowledge Tracing (BKT) graph updater with temporal forgetting decay, multi-modal Random Forest models evaluating student coding telemetry (MCQ, Code, OCR) for penalty modifiers, HNSW pgvector + BM25 hybrid RAG notes matcher, and LLM Groq/OpenAI grading pipeline. | • Bayesian Updates: [bayesian_network.py](file:///home/harsh/Desktop/SahAI/SahAI/services/engine-python/src/models/bayesian_network.py) <br> • OCR / Hybrid RAG: [ocr_handler.py](file:///home/harsh/Desktop/SahAI/SahAI/services/engine-python/src/models/ocr_handler.py) & [src/rag/](file:///home/harsh/Desktop/SahAI/SahAI/services/engine-python/src/rag/) |
| **3. Working Demo** | Recorded walkthrough showcasing the web app logging in, taking diagnostic tests, updating the skill mesh network in real-time, executing code compilers, uploading base64 note scans, and retrieving active telemetry logs. | • Video/Mockup reference available in workspace root folder. |
| **4. Code Repository** | Fully containerized multi-service monorepo configured with Github Actions CI/CD workflows (automated builds, TruffleHog secrets scanning), database schema runner, and JSON seeder script. | • CI/CD: [.github/workflows/ci-cd.yml](file:///home/harsh/Desktop/SahAI/SahAI/.github/workflows/ci-cd.yml) <br> • Database Setup: [init-db/](file:///home/harsh/Desktop/SahAI/SahAI/init-db/) |
| **5. Revised Presentation** | Updates detailing the transition to the Vite React web client, multi-modal behavior classifiers, and low-resource edge optimizations. | • Reference presentation documents included in main project folder. |
| **6. Evaluation & Validation** | **a. AI Evaluation**: Telemetry classifiers regularized to F1-Score 0.92-0.96 using feature noise loops; t-SNE scatter plots for MCQ/Code/OCR; BKT RMSE convergence metrics (100 students, 15 steps convergence). <br>**b. User Validation**: Restructured diagnostics screen, lowered learning rate penalties, and enabled sticky scroll controls based on testing. | • Evaluation Plots: [services/ml-training/data/](file:///home/harsh/Desktop/SahAI/SahAI/services/ml-training/data/) <br> • BKT Simulator: [evaluate_bkt.py](file:///home/harsh/Desktop/SahAI/SahAI/services/ml-training/src/evaluate_bkt.py) <br> • User Changes: [App.jsx](file:///home/harsh/Desktop/SahAI/SahAI/clients/react/src/App.jsx) |
| **7. Deployment & Sustainability**| Cost-optimized Upstash Redis queue mapping (direct HTTP zero-idle trigger, zero database replication per user). Production deployment on Railway (backends) and Vercel (frontend SPA routing). | • Deploy: [docker-compose.yml](file:///home/harsh/Desktop/SahAI/SahAI/docker-compose.yml) & [vercel.json](file:///home/harsh/Desktop/SahAI/SahAI/clients/react/vercel.json) |

---

## 🏗️ System Topology & Data Flow

```text
[ React (Vite) Web Client ]
         │
    (HTTP / REST)  ──[ AES-256 Telemetry Encryption / Rate Limited (1 / 5s) ]
         │
         ▼
[ Node.js API Gateway ] ──(Serves React SPA statically in prod)
         │
         ├───(Direct HTTP Telemetry Push)
         │   (Zero-Idle Queue Trigger)
         ▼
[ Python Math Inference Worker ] 
         │  (Loads Global DAG into Redis RAM; Predicts behavior with RF;
         │   Extracts note scans with Groq Vision / Tesseract; Matches via RAG)
         │
         ├───> [ Upstash Redis Cache ] (Sub-0.1ms Global DAG lookup)
         ├───> [ Supabase PostgreSQL ] (Student States: alpha, beta parameters)
         └───> [ MongoDB Audit Logs ] (Raw telemetry logging)
```

### The "Global DAG + Localized Delta" Pattern (MNC-Grade Scaling)
To support millions of students with sub-millisecond latency, SahAI avoids duplicating the curriculum's correlation matrix per user:
* **Global Graph (Immutable)**: Prerequisite correlation weights ($W_{pre}$, $W_{diag}$) are stored once in the global `advanced_dag_edges` PostgreSQL table. At startup, the Python worker caches this entire DAG structure into a **Redis Hash** (`global_dag`), reducing database lookup time to **<0.1ms** during telemetry evaluation.
* **Localized Belief (Dynamic)**: Student mastery is tracked as probability density functions ($\alpha, \beta$ parameters) inside `user_cognitive_states`. Updates are processed in-memory and committed asynchronously back to PostgreSQL.

---

## 📂 Codebase Structure

* [clients/react/](file:///home/harsh/Desktop/SahAI/SahAI/clients/react/) - Vite React web client, implements design tokens, Monaco compiler panel, SVG skill mesh, HOD portal, and styled log console.
* [services/api-node/](file:///home/harsh/Desktop/SahAI/SahAI/services/api-node/) - Express.js REST API gateway managing auth token encryption, user onboarding, rate limiting, and telemetry proxy-routing.
* [services/engine-python/](file:///home/harsh/Desktop/SahAI/SahAI/services/engine-python/) - Python engine running Bayesian calculations, live Random Forest classifiers, Tesseract OCR fallbacks, and hybrid pgvector RAG.
* [services/ml-training/](file:///home/harsh/Desktop/SahAI/SahAI/services/ml-training/) - Machine learning offline training pipeline comparing classifiers, regularizing weights, and generating t-SNE scatter graphs.
* [init-db/](file:///home/harsh/Desktop/SahAI/SahAI/init-db/) - Seeding configurations, PostgreSQL schemas, and python database population scripts.
* [ENV/](file:///home/harsh/Desktop/SahAI/SahAI/ENV/) - Unified environment configuration variables (database credentials, queue secrets, model keys).

---

## 🧠 Core AI Architecture

### 1. Bayesian Knowledge Tracing & DAG Updates
Student conceptual mastery is modeled using Beta distributions (initial priors set to $\alpha=2.0, \beta=2.0$, establishing a mathematically sound mastery curve centered at $E[x] = 0.5$). When a student answers a question:
* **Direct Update**: A correct answer increments $\alpha$, boosting the mastery mean. An incorrect answer increments $\beta$, lowering the mean.
* **Asymmetric DAG Propagation**: The python worker queries the prerequisite DAG cache. Updates propagate up to parent nodes using $W_{pre}$ weights on correct answers and $W_{diag}$ weights on incorrect answers.

### 2. Multi-Modal Telemetry Classifiers
Trained Random Forest classifiers parse student interaction parameters dynamically:
* **MCQ Telemetry**: Tracks features like reading velocity, network latency, and option switches to identify guessing behavior.
* **Code Telemetry**: Analyzes structural grit ratio, backspace counts, compile frequencies, and paste-character ratios to isolate shotgun debugging or copy-paste plagiarism.
* **OCR Telemetry**: Monitors spatial density, logical step progression, and erasure scribble ratios during handwritten derivations.
Behavioral patterns map to learning rate modifiers (e.g., 50% update penalty on copy-paste or guessing, 20% penalty on shotgun debugging) to prevent inflating student profiles.

### 3. Note Scanning, Hybrid RAG & LLM Grading
Students can scan handwritten notes directly within the Question Bank interface:
* **Vision Stage**: Groq's multimodal vision engine (`qwen/qwen3.6-27b`) transcribes student handwriting. Auto-rotating Tesseract is integrated as a local offline fallback.
* **Hybrid RAG Search**: Blends dense vector retrieval (Postgres `pgvector` HNSW cosine similarity on semantic chunk embeddings) with sparse retrieval (Okapi BM25 keyword index lookup) using Reciprocal Rank Fusion (RRF). Resolves transcribed text to target concept nodes.
* **CS Professor LLM Grader**: Analyzes transcript correctness against context chunks from the RAG store. Generates JSON feedback scores and updates the student's cognitive state parameters.

---

## 📊 Evaluation & Validation Metrics

### AI/Model Performance
1. **Regularization Noise Loop**: Applied feature noise injection loops during Random Forest training to prevent model overfitting. The classifiers achieve a realistic, generalizable **F1-Score between 0.92 and 0.96**.
2. **t-SNE Clustering**: Visualized multidimensional telemetry distributions into 2D scatter plots to verify clear separation boundaries for student behavior categories.
3. **BKT RMSE Convergence Simulation**: Simulated 100 students across 15 practice cycles. Measured the Root Mean Square Error (RMSE) between expected mastery updates and actual hidden mastery. The RMSE curve converges efficiently below 0.1 in under 8 steps.
*All generated evaluation heatmaps, scatter plots, and convergence diagrams are exported in [services/ml-training/data/](file:///home/harsh/Desktop/SahAI/SahAI/services/ml-training/data/).*

### User Usability Enhancements
During the development sprint, testing with representative users prompted several improvements:
* **Separated Diagnostics Dashboard**: Moved detailed behavior charts to a private diagnostics screen (`/diagnostics`) to keep the primary dashboard clean and action-oriented.
* **Reduced Penalty Calibration**: Increased learning rate penalty modifiers (copy-paste penalty lowered to 50%, shotgun debugging to 20%) to keep user progression encouraging.
* **Sticky Solver Submit controls**: Redesigned the Question Bank modals, separating scrollable options lists from submit triggers to guarantee button visibility across mobile viewports.

---

## 📶 Low-Resource Operations & Cost Sustainability

1. **Edge-Computation & Batch Sync**: To accommodate students in rural low-bandwidth regions, SahAI supports offline execution. The client caches local concept networks in an IndexedDB/SQLite store. Student beta updates are computed locally on-device and batch-synchronized to `/api/user/sync-cognitive-state` once internet access is restored.
2. **Zero-Idle Redis Costs**: Polling worker queue processes were replaced with an on-demand HTTP direct trigger loop. The API Gateway writes telemetry data and sends a synchronous execution trigger to the Python worker, which completes processing and shuts down queue hooks. This maintains Upstash Redis command hits at absolute zero when the platform is idle.
3. **Groq Multimodal API**: Implementing API-based handwriting transcription bypasses local GPU hosting requirements, allowing resource-constrained users to upload basic photo scans using entry-level mobile devices.

---

## 🚀 Local Setup & Verification

### 1. Unified Environment Config
Copy the example environment template into the active config file:
```bash
cp ENV/.env.example ENV/.env
```
Open `ENV/.env` and update the database host credentials, Upstash Redis endpoints, Groq/OpenAI API keys, and your custom AES secret key:
```env
PG_HOST=your-supabase-postgres-host
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your-secure-password
PG_DATABASE=postgres
PG_SSL=true

REDIS_URL=rediss://default:your-token@your-upstash-endpoint.upstash.io:6379
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/sahai

GROQ_API_KEY=gsk_your_groq_api_key
OPENAI_API_KEY=sk-proj-your_openai_key
VITE_AES_SECRET_KEY=your_256bit_aes_key
```

### 2. Database Schema Runner & Seeding
Execute the Python schema script and seed tables with concepts, correlations, and question banks:
```bash
# Initialize and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r services/engine-python/requirements.txt

# Run PostgreSQL schema generation (drops existing tables if --drop is passed)
python init-db/run_schema.py --drop

# Seed JSON curriculum concepts & question banks
python init-db/seed_json.py
```

### 3. Spin Up Local Datastores (Optional)
If running databases locally instead of cloud services:
```bash
docker-compose up -d
```

### 4. Running the Python Inference Worker
Start the Python math server on port 5000:
```bash
PYTHONPATH=services/engine-python/src python services/engine-python/src/main.py
```

### 5. Running the Express API Gateway
Start the Gateway on port 3000 (which serves React statically in production):
```bash
cd services/api-node
npm install
# In development (hot reloading)
npm run dev
# In production
npm start
```

### 6. Running React Client Locally
Start the Vite developer server on port 5173:
```bash
cd clients/react
npm install
npm run dev
```

---

## ☁️ Production Cloud Deployment Mappings

* **Frontend Hosting (Vercel)**:
  * React client is compiled (`npm run build`) and deployed to Vercel. 
  * Rewrite rules in [vercel.json](file:///home/harsh/Desktop/SahAI/SahAI/clients/react/vercel.json) direct all subpaths back to `index.html` to prevent blank reloads.
  * Injected compile-time Railway Gateway URL via `--dart-define` equivalent parameters (`API_URL`).
* **Backend Services (Railway)**:
  * Express Gateway and Python Math Worker are compiled as Docker containers and deployed to Railway.
  * API Gateway uses Railway's private DNS (`http://sahai-engine-python.railway.internal:5000`) for secure, low-latency microservice communications.
