"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
const telemetryStore = {};
let activeDocumentPath = null;
let activeInterval = null;
let syncInterval = null;
// Status bar item to display problem context
let statusBarItem;
function activate(context) {
    console.log('Congratulations, your extension "vscode-sahai-lens" is now active!');
    // Create status bar item for DSA tracking status
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'sahai.setProblemContext';
    context.subscriptions.push(statusBarItem);
    // Initialize and check status bar
    updateStatusBar(context);
    // 1. Auth Handshake Verification
    const checkAuthentication = async () => {
        const apiToken = context.globalState.get('SAHAI_API_TOKEN');
        if (!apiToken) {
            const connectChoice = await vscode.window.showWarningMessage('Connect to SahAI to track your DSA mastery.', 'Connect SahAI');
            if (connectChoice === 'Connect SahAI') {
                await promptForToken(context);
            }
        }
    };
    checkAuthentication();
    // 2. Command Contribution: Target Problem Context Binding
    const setProblemContextCommand = vscode.commands.registerCommand('sahai.setProblemContext', async () => {
        const currentProblem = context.workspaceState.get('SAHAI_PROBLEM_ID') || '';
        const input = await vscode.window.showInputBox({
            prompt: 'Enter Problem ID (e.g., LC-1 for Two Sum, or SAH-45)',
            value: currentProblem,
            placeHolder: 'e.g., LC-1'
        });
        if (input !== undefined) {
            const cleaned = input.trim();
            await context.workspaceState.update('SAHAI_PROBLEM_ID', cleaned);
            vscode.window.showInformationMessage(cleaned ? `🧠 SahAI: Target problem set to [${cleaned}]` : '🧠 SahAI: Target problem cleared');
            updateStatusBar(context);
        }
    });
    context.subscriptions.push(setProblemContextCommand);
    // 3. Track Active Workspace Editor Document State & Active Timing
    const updateActiveTelemetry = () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && isSupportedLanguage(editor.document.languageId)) {
            const path = editor.document.uri.fsPath;
            activeDocumentPath = path;
            if (!telemetryStore[path]) {
                telemetryStore[path] = {
                    timeSpentSeconds: 0,
                    runCount: 0,
                    backspaceCount: 0,
                    pasteCharCount: 0,
                    lastActiveTime: Date.now()
                };
            }
            telemetryStore[path].lastActiveTime = Date.now();
        }
        else {
            activeDocumentPath = null;
        }
    };
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        updateActiveTelemetry();
    }));
    updateActiveTelemetry();
    // 4. In-Memory Time Tracker (Tick active seconds)
    activeInterval = setInterval(() => {
        if (activeDocumentPath && telemetryStore[activeDocumentPath]) {
            telemetryStore[activeDocumentPath].timeSpentSeconds += 1;
        }
    }, 1000);
    // 5. Empathetic Telemetry Text Change Event Listeners
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const doc = event.document;
        if (!isSupportedLanguage(doc.languageId)) {
            return;
        }
        const path = doc.uri.fsPath;
        if (!telemetryStore[path]) {
            telemetryStore[path] = {
                timeSpentSeconds: 0,
                runCount: 0,
                backspaceCount: 0,
                pasteCharCount: 0,
                lastActiveTime: Date.now()
            };
        }
        const metrics = telemetryStore[path];
        event.contentChanges.forEach((change) => {
            // (a) Backspace Detection (empty input text replacing character ranges)
            if (change.text === '' && change.rangeLength > 0) {
                metrics.backspaceCount += 1;
            }
            // (b) Copy-Paste Detection (inserts exceeding 100 characters)
            if (change.text.length > 100) {
                metrics.pasteCharCount += change.text.length;
                vscode.window.showInformationMessage('Copy-pasting? Breaking down the logic yourself builds stronger long-term memory! 🌱');
            }
        });
    });
    context.subscriptions.push(textChangeListener);
    // 6. Background Telemetry Ingest Sync Interval (Every 60 seconds)
    syncInterval = setInterval(async () => {
        const apiToken = context.globalState.get('SAHAI_API_TOKEN');
        if (!apiToken) {
            return;
        }
        const config = vscode.workspace.getConfiguration('sahaiLens');
        const backendUrl = config.get('backendUrl') || 'https://sahai-api-node-production-f2f3.up.railway.app';
        for (const path of Object.keys(telemetryStore)) {
            const metrics = telemetryStore[path];
            const problemId = context.workspaceState.get('SAHAI_PROBLEM_ID') || 'GENERAL';
            // Send telemetry if they have actively spent time coding
            if (metrics.timeSpentSeconds > 0 || metrics.pasteCharCount > 0 || metrics.backspaceCount > 0) {
                try {
                    const payload = {
                        node_id: problemId,
                        time_spent_seconds: metrics.timeSpentSeconds,
                        attempts: metrics.runCount || 1,
                        backspace_count: metrics.backspaceCount,
                        paste_char_count: metrics.pasteCharCount,
                        behavioral_flags: metrics.pasteCharCount > 100 ? ['COPY_PASTE_WARNING'] : []
                    };
                    await axios_1.default.post(`${backendUrl}/api/telemetry/vscode`, payload, {
                        headers: {
                            'Authorization': `Bearer ${apiToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    // Reset accumulators on successful transmission
                    metrics.timeSpentSeconds = 0;
                    metrics.backspaceCount = 0;
                    metrics.pasteCharCount = 0;
                    metrics.runCount = 0;
                }
                catch (err) {
                    console.error('[SahAI Lens] Telemetry sync error: ', err.message);
                }
            }
        }
    }, 60000);
    // 7. Socratic Diagnostics Hover Collections (Anti-Copilot Inline Queries)
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('sahai-socratic');
    context.subscriptions.push(diagnosticCollection);
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
        if (!isSupportedLanguage(doc.languageId)) {
            return;
        }
        // Accumulate saves as run/submissions counts
        const path = doc.uri.fsPath;
        if (telemetryStore[path]) {
            telemetryStore[path].runCount += 1;
        }
        const problemId = context.workspaceState.get('SAHAI_PROBLEM_ID');
        if (!problemId) {
            // Clear old diagnostics if no context is set
            diagnosticCollection.set(doc.uri, []);
            return;
        }
        const config = vscode.workspace.getConfiguration('sahaiLens');
        const ollamaUrl = config.get('ollamaUrl') || 'http://localhost:11434';
        const codeContent = doc.getText();
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'SahAI Socratic: Reviewing code logic...',
            cancellable: false
        }, async () => {
            try {
                const response = await axios_1.default.post(`${ollamaUrl}/api/generate`, {
                    model: 'codegemma:2b',
                    prompt: `You are an empathetic DSA tutor. The student is solving problem ${problemId}. Here is their code:\n\n${codeContent}\n\nIdentify ONE logical flaw or optimization. DO NOT write code. Provide a 1-sentence Socratic question to make them think.`,
                    stream: false
                }, { timeout: 15000 });
                const socraticHint = response.data?.response?.trim() || 'What is the base case check value in your algorithm?';
                // Set diagnostics squiggly line on the first non-empty line of code
                let targetLine = 0;
                for (let i = 0; i < doc.lineCount; i++) {
                    if (doc.lineAt(i).text.trim().length > 0) {
                        targetLine = i;
                        break;
                    }
                }
                const range = new vscode.Range(targetLine, 0, targetLine, doc.lineAt(targetLine).text.length);
                const diagnostic = new vscode.Diagnostic(range, `💡 SahAI Socratic: ${socraticHint}`, vscode.DiagnosticSeverity.Warning);
                diagnostic.source = 'SahAI Socratic';
                diagnosticCollection.set(doc.uri, [diagnostic]);
            }
            catch (err) {
                console.warn('[SahAI Lens] Ollama local service not reachable: ', err.message);
                // Clear collection if offline or fails to prevent outdated warnings
                diagnosticCollection.set(doc.uri, []);
            }
        });
    });
    context.subscriptions.push(saveListener);
}
exports.activate = activate;
// 8. Auth Token Input Dialog Prompt
async function promptForToken(context) {
    const token = await vscode.window.showInputBox({
        prompt: 'Paste your Web API Token from the SahAI Dashboard to authenticate',
        ignoreFocusOut: true,
        password: true
    });
    if (token) {
        const cleaned = token.trim();
        await context.globalState.update('SAHAI_API_TOKEN', cleaned);
        vscode.window.showInformationMessage('🔑 SahAI Lens: Successfully connected!');
        updateStatusBar(context);
    }
    else {
        vscode.window.showErrorMessage('🔑 SahAI Lens: API Token input cancelled.');
    }
}
// Helper to determine status bar content state
function updateStatusBar(context) {
    const problemId = context.workspaceState.get('SAHAI_PROBLEM_ID');
    const apiToken = context.globalState.get('SAHAI_API_TOKEN');
    if (!apiToken) {
        statusBarItem.text = '$(key) SahAI: Connect Needed';
        statusBarItem.tooltip = 'Click to connect your SahAI Web API credentials';
        statusBarItem.show();
        return;
    }
    if (problemId) {
        statusBarItem.text = `🧠 SahAI: [${problemId}] Active`;
        statusBarItem.tooltip = `Currently tracking mastery telemetry on problem ${problemId}. Click to switch context.`;
    }
    else {
        statusBarItem.text = '🧠 SahAI: Select Problem';
        statusBarItem.tooltip = 'Click to map your coding session to a target DSA concept problem';
    }
    statusBarItem.show();
}
function isSupportedLanguage(langId) {
    const supported = ['python', 'cpp', 'java', 'javascript', 'typescript'];
    return supported.includes(langId.toLowerCase());
}
function deactivate() {
    if (activeInterval) {
        clearInterval(activeInterval);
    }
    if (syncInterval) {
        clearInterval(syncInterval);
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map