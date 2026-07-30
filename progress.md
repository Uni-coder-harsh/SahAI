# SahAI Build Progress & Setup Log

## System Identity & Core Config
- **Project**: SahAI (Continuous Cognitive Diagnostics & Root-Cause Analysis)
- **Primary LLM Engine**: Local Google Gemma (`codegemma:2b` / `gemma2:2b` via Ollama @ `http://localhost:11434`)
- **Fallback Engine**: Groq API
- **Target Event**: Neo-Nexus (BITM Ballari)

---

## Progress Log

### [TASK-001] Repository Fresh Setup & Local Environment Restoration
- **Status**: RESOLVED
- **Details**: Cloned repo, created Python venv, installed node API and react client dependencies, resolved database role issues, initialized DB schema, and seeded curriculum data.

### [TASK-002] CORS Origin and Credentials Policy Configuration
- **Status**: RESOLVED
- **Details**: Configured dynamic origin checking in the Express API Gateway to allow all Vercel-deployed subdomains and localhost ports with `credentials: true` enabled.

### [TASK-003] Local Docker-Compose Environment Resolution & Integration Testing
- **Status**: RESOLVED
- **Details**: Fixed the internal Redis SSL/TLS auto-upgrade logic bug in the Python and Node.js database connector code (which prevented local non-SSL container connections from succeeding). Corrected mock concept node IDs in the integration test to real, seeded Python nodes (`PY_CONTROL_01`, `PY_DATA_07`, and `PY_DATA_08`). Rebuilt containers and successfully verified the end-to-end telemetry and Bayesian DAG propagation.

### [TASK-004] Judge0-Monaco Telemetry Editor Integration
- **Status**: RESOLVED
- **Details**: Built the `Judge0TelemetryEditor.jsx` React component using Monaco editor to track typing telemetry (backspaces, paste length, timer) and execute code securely via Judge0 CE API, posting the unified results to the Bayesian engine. Registered its path in the client sidebar and routes.

### [TASK-005] Synchronous BKT Updates & Latency Optimizations
- **Status**: RESOLVED
- **Details**: Restored synchronous BKT calculations in the Node.js API controller to return expected mastery, alpha, beta, and tutor feedback directly in the MCQ submit response. Optimized latency in the Python ML Engine by: (a) caching generated empathetic tutor feedback (even during LLM credential failures) to eliminate duplicate network calls, reducing cached latency from 9.8s to 83ms; and (b) merging multiple sequential Postgres transaction commits into a single request-level commit.

### [TASK-006] Split-Screen Layout Responsiveness, Sandbox Scroll Isolation & UX Enhancements
- **Status**: RESOLVED
- **Details**: Redesigned the split-screen question solver layouts to support responsive scroll-isolated columns (`.solver-grid`, `.solver-panel-left`, `.solver-panel-right`, `.sandbox-root`, `.sandbox-editor-layout`, `.sandbox-sidebar`, `.sandbox-sidebar-list`, `.sandbox-main-area`). On desktop, this isolates the scroll context of sidebar concepts lists and editor workspaces, completely preventing the main document layout scrollbar from shifting the code editor out of viewport context. Supports graceful responsive collapse to vertical grid blocks on tablet and mobile viewports. Integrated Monaco Editor in both Code Scratchpad interfaces. Added custom scrollbars.

### [TASK-007] Gemma 4 Reasoning Orchestrator and OpenRouter Gateway Integration
- **Status**: RESOLVED
- **Details**: Built the Google Gemma 4 26B agentic reasoning orchestrator in Python (`gemma_orchestrator.py`) using OpenAI tool schema format, supporting 4 custom tool callbacks (BKT lookup, code sandbox execution, textbook RAG queries, telemetry updates). Configured dynamic OpenRouter model gateway fallback with local Ollama (`codegemma:2b`) override. Added environmental variables `OPENROUTER_API_KEY` and `OPENROUTER_API_URL` to all environment templates.

### [TASK-008] UI/UX Socratic Agent HUD and Multimodal Vision Notes Scanner
- **Status**: RESOLVED
- **Details**: Created the `GemmaAgentHUD.jsx` component in React. Embedded live tool tracking consoles, warning banners, and English/Hindi Socratic feedback panels. Integrated the Express `/api/telemetry/gemma-diagnose` routing proxy on Node. Removed the separate page route to ensure handwriting upload sits directly inside the Question Solver modal context.

### [TASK-009] BKT Telemetry Gemma Socratic Hook & Coding Sandbox Scroll Resolution
- **Status**: RESOLVED
- **Details**: Integrated the `gemma_orchestrator` loop directly into the BKT telemetry pipeline inside `job_consumer.py`, enabling Socratic diagnostics in both English and natural Hindi for every incorrect MCQ or Code submission. Redesigned the Coding Sandbox layout to lock the main container within the viewport (`overflow: hidden`), allowing Monaco Editor to stretch and scroll its content natively (`flex: 1`), and wrapped console logs and agent diagnostic results inside a collapsible tab sheet drawer.

### [TASK-010] ProctorGuard Anti-Cheat Multi-Layer Proctoring Wrapper
- **Status**: RESOLVED
- **Details**: Created the `ProctorGuard.jsx` security wrapper in React. Implemented: (a) focus-loss screen obfuscation with glassmorphism overlays and auto-triggering `FOCUS_LOST` telemetry logs; (b) dynamic repeating watermarks displaying live timestamp and student ID attributes; (c) browser shortcut interception blocking DevTools (F12, Inspect), printing (Ctrl+P), cloning (Ctrl+C, Ctrl+S), and right-clicks; and (d) CSS selections protection. Wrapped the three core testing/solving components in `App.jsx`.

---

## Error & Bug Ledger
| Error ID | Module | Description | Resolution Status |
| :--- | :--- | :--- | :--- |
| ERR-000 | System | Fresh Clone Setup Initialized | RESOLVED |
| ERR-001 | Database | Stale postgres_data volume caused `role "postgres" does not exist` connection error during local schema setup | RESOLVED (Pruned compose volumes via `docker compose down -v` and recreated containers) |
| ERR-002 | API Gateway | CORS blockages on Vercel deployment due to restrictive wildcards and missing credentials support | RESOLVED (Configured dynamic origin checking for Vercel subdomains and localhost with credentials support enabled) |
| ERR-003 | Database Connectors | Redis protocol automatically upgraded from redis:// to rediss:// for internal container hostname (redis), causing connection timeouts | RESOLVED (Added condition in both Node and Python connector scripts to bypass SSL upgrades if the hostname is 'redis') |
| ERR-004 | Testing | Integration test script failed due to referencing outdated placeholder concept nodes ('CS_DS_ARRAYS') | RESOLVED (Mapped test variables to actual seeded concepts with correct prerequisite relationships) |
