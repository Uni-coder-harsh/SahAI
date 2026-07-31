# SahAI Lens - Socratic DSA Tutor

**SahAI Lens** is a VS Code extension that acts as a Socratic DSA tutor. It silently gathers empathetic learning telemetry, maps coding problem targets dynamically, and queries local Ollama models to expose inline hover hints—preserving the core learning process without writing the code for you.

---

## 🚀 Core Features

### 👤 1. Authenticated Profile Syncing
* Displays user session information in the bottom-left status bar: `👤 SahAI: {UserName}`.
* Fetches user profile name and academic streams from the SahAI web gateway on successful authentication.

### 🧠 2. Per-File LeetCode Context Binding
* Allows students to bind individual LeetCode problems to specific code files (rather than the entire workspace).
* Supports question numbers (e.g., `1`, `lc-1`, `LC-20`) as well as slugs (e.g., `two-sum`, `valid-parentheses`).
* Automatically retrieves and inserts the official problem description as comments at the top of the file.

### 📈 3. Live Expected Mastery Tracker
* Renders current concept mastery in the bottom-right status bar: `🧠 [Two Sum] Mastery: 42%`.
* Recalculates expected mastery using Bayesian Knowledge Tracing (BKT) metrics on every save or sync interval.

### 💡 4. Local Socratic Hover Hints (The Anti-Copilot)
* Integrates with local Ollama (`codegemma:2b`) running at `http://localhost:11434`.
* On file save, analyzes the code structure and applies inline diagnostics warnings.
* Hovering over the diagnostic displays an empathetic, socratic guiding question to guide you to the solution without feeding you raw code.

### 📡 5. Empathetic Telemetry Aggregations
* Debounces backspaces and tracks active coding session timings.
* Intercepts massive code paste blocks and pops up a friendly nudge: *"Copy-pasting? Breaking down logic yourself builds stronger long-term memory! 🌱"*.
* Syncs telemetry asynchronously every 60 seconds to your dashboard database.

---

## 🛠️ Quick Start

### Step 1: Install Local Ollama (CodeGemma)
Make sure you have Ollama running locally with the CodeGemma model:
```bash
ollama run codegemma:2b
```

### Step 2: Install the Extension
1. Open VS Code and open the Extensions sidebar (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Click the `...` menu in the top-right corner.
3. Select **Install from VSIX...** and choose `vscode-sahai-lens-1.0.0.vsix`.

### Step 3: Authenticate
1. Go to your SahAI Web Dashboard and open **Profile**.
2. Click **Copy Token** under the VS Code Token panel.
3. In VS Code, click the `$(key) SahAI: Connect Needed` status bar item at the bottom left.
4. Paste the copied token and press Enter.

### Step 4: Map and Code!
1. Open a code file (e.g. `solution.py`).
2. Click the `$(brain) SahAI: Select Problem` status bar item.
3. Enter `lc 1` or `two-sum` and watch the problem description populate at the top of your file!
4. Write your solution. Hit **Save** (`Ctrl+S`) to retrieve Socratic hover hints.
