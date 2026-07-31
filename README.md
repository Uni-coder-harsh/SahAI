# SahAI: Distributed Event-Driven Cognitive Architecture & Adaptive Testing Platform

**Live Production Demo**: [https://sah-ai-xi.vercel.app/](https://sah-ai-xi.vercel.app/)

SahAI is a B2B2C educational cognitive profiling and adaptive testing platform. It integrates a sub-millisecond event ingestion gateway, a distributed Bayesian probability inference engine, institutional HOD multi-tenancy, and high-performance curriculum Directed Acyclic Graph (DAG) state propagation.

This is the master orchestration repository (`SahAI`) for the platform.

---

## 📋 Phase 2 Deliverables & Evaluation Matrix

To assist the SahAI evaluation committee, the table below maps each requested Phase 2 deliverable to its functional implementation, architectural features, and code locations in this repository.

| Phase 2 Deliverable | Implementation Details | Key Files & Directories |
| :--- | :--- | :--- |
| **1. Functional MVP** | Built a web application supporting a complete user flow: login, personalization, timed diagnostic testing, HOD approval dashboard, interactive SVG skill mesh graph, LeetCode-style Question Bank with integrated compiler/OCR note scanner, dynamic diagnostic audit, and mobile-responsive layout. | • React Web App: [clients/react/](file:///home/harsh/Desktop/CodeNova/SahAI/clients/react/) <br> • Gateway: [services/api-node/](file:///home/harsh/Desktop/CodeNova/SahAI/services/api-node/) <br> • Models: [services/engine-python/](file:///home/harsh/Desktop/CodeNova/SahAI/services/engine-python/) |
| **2. Integrated AI Component** | Real-time Bayesian Knowledge Tracing (BKT) graph updater with temporal forgetting decay, multi-modal Random Forest models evaluating student coding telemetry (MCQ, Code, OCR) for penalty modifiers, HNSW pgvector + BM25 hybrid RAG notes matcher, and LLM Groq/OpenAI grading pipeline. | • Bayesian Updates: [bayesian_network.py](file:///home/harsh/Desktop/CodeNova/SahAI/services/engine-python/src/models/bayesian_network.py) <br> • OCR / Hybrid RAG: [ocr_handler.py](file:///home/harsh/Desktop/CodeNova/SahAI/services/engine-python/src/models/ocr_handler.py) & [src/rag/](file:///home/harsh/Desktop/CodeNova/SahAI/services/engine-python/src/rag/) |
| **3. Working Demo** | Recorded walkthrough showcasing the web app logging in, taking diagnostic tests, updating the skill mesh network in real-time, executing code compilers, uploading base64 note scans, and retrieving active telemetry logs. | • Production Vercel App: [https://sah-ai-xi.vercel.app/](https://sah-ai-xi.vercel.app/) |
| **4. Code Repository** | Fully containerized monorepo configured with Github Actions CI/CD workflows, database schema runner, JSON seeder script, and custom VS Code extension `vscode-sahai-lens`. | • VS Code Extension: [extensions/vscode-sahai-lens/](file:///home/harsh/Desktop/CodeNova/SahAI/extensions/vscode-sahai-lens/) <br> • CI/CD: [.github/workflows/ci-cd.yml](file:///home/harsh/Desktop/CodeNova/SahAI/.github/workflows/ci-cd.yml) <br> • Database Setup: [init-db/](file:///home/harsh/Desktop/CodeNova/SahAI/init-db/) |
| **5. Working VS Code Extension** | **SahAI Lens**: Extends learning telemetry tracking to the IDE. Implements per-file problem mapping, automatic LeetCode question header comments injection, and offline Socratic hovers running local CodeGemma. | • Source Code: [extensions/vscode-sahai-lens/src/extension.ts](file:///home/harsh/Desktop/CodeNova/SahAI/extensions/vscode-sahai-lens/src/extension.ts) <br> • Packaged VSIX: [extensions/vscode-sahai-lens/vscode-sahai-lens-1.0.0.vsix](file:///home/harsh/Desktop/CodeNova/SahAI/extensions/vscode-sahai-lens/vscode-sahai-lens-1.0.0.vsix) |
| **6. Revised Presentation** | Updates detailing the transition to the Vite React web client, multi-modal behavior classifiers, and low-resource edge optimizations. | • Reference presentation documents included in main project folder. |
| **7. Evaluation & Validation** | **a. AI Evaluation**: Telemetry classifiers regularized to F1-Score 0.92-0.96 using feature noise loops; t-SNE scatter plots for MCQ/Code/OCR; BKT RMSE convergence metrics (100 students, 15 steps convergence). <br>**b. User Validation**: Restructured diagnostics screen, lowered learning rate penalties, and enabled sticky scroll controls based on testing. | • Evaluation Plots: [services/ml-training/data/](file:///home/harsh/Desktop/CodeNova/SahAI/services/ml-training/data/) <br> • BKT Simulator: [evaluate_bkt.py](file:///home/harsh/Desktop/CodeNova/SahAI/services/ml-training/src/evaluate_bkt.py) <br> • User Changes: [App.jsx](file:///home/harsh/Desktop/CodeNova/SahAI/clients/react/src/App.jsx) |

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
         │   Extracts note scans with Gemma-4 Vision; Matches via RAG)
         │
         ├───> [ Upstash Redis Cache ] (Sub-0.1ms Global DAG lookup)
         ├───> [ Supabase PostgreSQL ] (Student States: alpha, beta parameters)
         └───> [ MongoDB Audit Logs ] (Raw telemetry logging)
```

---

## 🧠 Google Gemma / CodeGemma Integration (Our Core AI Engines)

Google's **Gemma** open-weights models power the intelligent curriculum structure and on-device Socratic tutor mechanisms in SahAI:

### 1. Gemma 4: The Intelligent Curriculum Architect
* **Free Gemma-4 API (OpenRouter)**: SahAI queries `google/gemma-4-26b-a4b-it` completely for free to run our backend cognitive mapping pipeline.
* **Semantic Concept Alignment**: When a student inputs a LeetCode problem ID (like `lc 1`) or description, the backend fetches tags and problem details. Gemma 4 analyzes the algorithmic logic (e.g., bitwise XOR logic, frequency tracking arrays) and aligns it semantically to our internal database of 167 CS concept nodes (mapping it to nodes like `BIT_MANIPULATION_01` or `HASH_TABLE_01`), bypassing brittle literal name checks and caching the mapping inside MongoDB.
* **Multimodal Vision Diagnostics**: When students draw answers on our React handwriting canvas, the canvas content is exported as a Base64 image. Gemma-4 Vision reads the handwritten math and source code to instantly diagnose logic errors.

### 2. Local CodeGemma: The Local Socratic Tutor
* **Edge Optimized (Ollama)**: Running `codegemma:2b` locally on the student's edge machine (`http://localhost:11434`) allows SahAI to run entirely offline, with zero subscription dependencies.
* **Socratic Guiding Questions**: On file save in VS Code, `codegemma:2b` reviews code syntax changes. It uses a structured prompt with few-shot programming examples to output a **single-sentence Socratic question** ending with `?` (e.g. *"Why does your recursion path not check if the list has fewer than 2 elements?"*), guiding students to self-correct rather than providing copy-paste solutions.

---

## 🔌 VS Code Integration: SahAI Lens

We built the **SahAI Lens** extension to let students sync active learning telemetry directly inside their IDE.

### Features:
1. **Interactive Output Channel Debugger**: Renders a dedicated `SahAI Lens` tab inside VS Code's Output drawer, logging token handshakes, telemetry syncs, local Ollama queries, and error diagnostics in real-time.
2. **Dual Status Bar Items**: 
   * **Left side** (`👤 SahAI: {UserName}`): Connected profile display. Clicking it prompts user to enter their Web Dashboard API Token. Supports raw UUID user ID fallback if token decryption is bypassed.
   * **Right side** (`🧠 [{ProblemTitle}] Mastery: {Expected}%`): Shows the live expected mastery for the currently active tab context, updated in real time via the BKT engine.
3. **Per-File Context Binding**: Students target specific LeetCode problems (e.g., inputting `1` or `lc-206`) for individual file tabs. It automatically queries the Node.js context API and inserts the official description as formatted block comments at the top of the file.
4. **Active Code Cleaning**: Strips out commented problem descriptions from code before sending it to local Ollama, ensuring context size limits are preserved and Socratic hovers focus only on the student's code block.
5. **Empathetic Telemetry**: Debounces backspaces and checks code pastes. Pasting over 100 characters triggers a friendly prompt: *"Copy-pasting? Breaking down logic yourself builds stronger long-term memory! 🌱"*.

---

## 📂 Codebase Structure

* [clients/react/](file:///home/harsh/Desktop/CodeNova/SahAI/clients/react/) - Vite React web client, implements design tokens, Monaco compiler panel, SVG skill mesh, HOD portal, and styled log console.
* [services/api-node/](file:///home/harsh/Desktop/CodeNova/SahAI/services/api-node/) - Express.js REST API gateway managing auth token encryption, user onboarding, rate limiting, and telemetry proxy-routing.
* [services/engine-python/](file:///home/harsh/Desktop/CodeNova/SahAI/services/engine-python/) - Python engine running Bayesian calculations, live Random Forest classifiers, Tesseract OCR fallbacks, and hybrid pgvector RAG.
* [extensions/vscode-sahai-lens/](file:///home/harsh/Desktop/CodeNova/SahAI/extensions/vscode-sahai-lens/) - VS Code extension implementing Socratic hovers, file-mapped context telemetry, and OutputChannel logging.
* [services/ml-training/](file:///home/harsh/Desktop/CodeNova/SahAI/services/ml-training/) - Machine learning offline training pipeline comparing classifiers, regularizing weights, and generating t-SNE scatter graphs.
* [init-db/](file:///home/harsh/Desktop/CodeNova/SahAI/init-db/) - Seeding configurations, PostgreSQL schemas, and python database population scripts.
* [ENV/](file:///home/harsh/Desktop/CodeNova/SahAI/ENV/) - Unified environment configuration variables (database credentials, queue secrets, model keys).

---

## 🚀 Setup & Verification

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
# In development
npm run dev
# Build production bundle
npm run build
```

---

## ☁️ Production Cloud Deployment Mappings

* **Frontend Hosting (Vercel)**:
  * React client is compiled (`npm run build`) and deployed to Vercel at [https://sah-ai-xi.vercel.app/](https://sah-ai-xi.vercel.app/).
  * Rewrite rules in [vercel.json](file:///home/harsh/Desktop/CodeNova/SahAI/clients/react/vercel.json) direct all subpaths back to `index.html` to prevent blank reloads.
* **Backend Services (Railway)**:
  * Express Gateway and Python Math Worker are compiled as Docker containers and deployed to Railway.
  * API Gateway uses Railway's private DNS (`http://sahai-engine-python.railway.internal:5000`) for secure, low-latency microservice communications.
