import * as vscode from 'vscode';
import axios from 'axios';

// Telemetry state in memory
interface FileTelemetry {
  timeSpentSeconds: number;
  runCount: number;
  backspaceCount: number;
  pasteCharCount: number;
  lastActiveTime: number;
}

const telemetryStore: { [filePath: string]: FileTelemetry } = {};
let activeDocumentPath: string | null = null;
let activeInterval: NodeJS.Timeout | null = null;
let syncInterval: NodeJS.Timeout | null = null;

// Dual Status Bar Items for authenticated profile (Left) and Mastery context (Right)
let profileStatusBarItem: vscode.StatusBarItem;
let masteryStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-sahai-lens" is now active!');

  // 1. Initialize Profile Status Bar (Left side)
  profileStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  profileStatusBarItem.command = 'sahai.setProblemContext';
  context.subscriptions.push(profileStatusBarItem);

  // 2. Initialize Mastery Context Status Bar (Right side)
  masteryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  masteryStatusBarItem.command = 'sahai.setProblemContext';
  context.subscriptions.push(masteryStatusBarItem);

  // Initial Sync UI update
  updateStatusBar(context);

  // 3. Auth Handshake Verification
  const checkAuthentication = async () => {
    const apiToken = context.globalState.get<string>('SAHAI_API_TOKEN');
    if (!apiToken) {
      const connectChoice = await vscode.window.showWarningMessage(
        'Connect to SahAI to track your DSA mastery.',
        'Connect SahAI'
      );
      if (connectChoice === 'Connect SahAI') {
        await promptForToken(context);
      }
    }
  };
  checkAuthentication();

  // 4. Command Contribution: Target Problem Context Binding (with dynamic slug conversion & mastery checks)
  const setProblemContextCommand = vscode.commands.registerCommand(
    'sahai.setProblemContext',
    async () => {
      const apiToken = context.globalState.get<string>('SAHAI_API_TOKEN');
      if (!apiToken) {
        await promptForToken(context);
        return;
      }

      const currentProblem = context.workspaceState.get<string>('SAHAI_PROBLEM_ID') || '';
      const input = await vscode.window.showInputBox({
        prompt: 'Enter Leetcode Problem Title/Slug (e.g., "Two Sum" or "two-sum")',
        value: currentProblem,
        placeHolder: 'e.g., two-sum'
      });

      if (input !== undefined) {
        const cleaned = input.trim();
        if (cleaned) {
          // Convert to URL-friendly lowercase-dashed slug representation
          const problemSlug = cleaned.toLowerCase().replace(/\s+/g, '-');
          await context.workspaceState.update('SAHAI_PROBLEM_ID', problemSlug);
          
          vscode.window.showInformationMessage(`🧠 SahAI: Target problem set to [${problemSlug}]`);
          
          // Pull dynamic mastery mapping details immediately
          vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: 'SahAI: Fetching concept mastery...'
          }, async () => {
            await updateStatusBar(context);
          });
        } else {
          await context.workspaceState.update('SAHAI_PROBLEM_ID', '');
          vscode.window.showInformationMessage('🧠 SahAI: Target problem cleared');
          await updateStatusBar(context);
        }
      }
    }
  );
  context.subscriptions.push(setProblemContextCommand);

  // 5. Track Active Workspace Editor Document State & Active Timing
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
    } else {
      activeDocumentPath = null;
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateActiveTelemetry();
    })
  );
  updateActiveTelemetry();

  // 6. In-Memory Time Tracker (Tick active seconds)
  activeInterval = setInterval(() => {
    if (activeDocumentPath && telemetryStore[activeDocumentPath]) {
      telemetryStore[activeDocumentPath].timeSpentSeconds += 1;
    }
  }, 1000);

  // 7. Empathetic Telemetry Text Change Event Listeners
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
      // (a) Deletions / Backspace Detection
      if (change.text === '' && change.rangeLength > 0) {
        metrics.backspaceCount += 1;
      }

      // (b) Empathetic paste nudge triggers
      if (change.text.length > 100) {
        metrics.pasteCharCount += change.text.length;
        vscode.window.showInformationMessage(
          'Copy-pasting? Breaking down the logic yourself builds stronger long-term memory! 🌱'
        );
      }
    });
  });
  context.subscriptions.push(textChangeListener);

  // 8. Background Telemetry Ingest Sync Interval & Mastery Update (Every 60 seconds)
  syncInterval = setInterval(async () => {
    const apiToken = context.globalState.get<string>('SAHAI_API_TOKEN');
    if (!apiToken) {
      return;
    }

    const config = vscode.workspace.getConfiguration('sahaiLens');
    const backendUrl = config.get<string>('backendUrl') || 'https://sahai-api-node-production-f2f3.up.railway.app';

    let didSync = false;
    for (const path of Object.keys(telemetryStore)) {
      const metrics = telemetryStore[path];
      const problemId = context.workspaceState.get<string>('SAHAI_PROBLEM_ID') || 'general-dsa';

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

          await axios.post(`${backendUrl}/api/telemetry/vscode`, payload, {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            }
          });

          didSync = true;
          // Reset accumulators on successful transmission
          metrics.timeSpentSeconds = 0;
          metrics.backspaceCount = 0;
          metrics.pasteCharCount = 0;
          metrics.runCount = 0;
        } catch (err: any) {
          console.error('[SahAI Lens] Telemetry sync error: ', err.message);
        }
      }
    }

    // Refresh UI Status bar details with fresh mastery values if synchronized
    if (didSync) {
      await updateStatusBar(context);
    }
  }, 60000);

  // 9. Socratic Diagnostics Hover Collections
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

    const problemId = context.workspaceState.get<string>('SAHAI_PROBLEM_ID');
    if (!problemId) {
      diagnosticCollection.set(doc.uri, []);
      return;
    }

    const config = vscode.workspace.getConfiguration('sahaiLens');
    const ollamaUrl = config.get<string>('ollamaUrl') || 'http://localhost:11434';
    const codeContent = doc.getText();

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'SahAI Socratic: Reviewing code logic...',
      cancellable: false
    }, async () => {
      try {
        const response = await axios.post(`${ollamaUrl}/api/generate`, {
          model: 'codegemma:2b',
          prompt: `You are an empathetic DSA tutor. The student is solving problem ${problemId}. Here is their code:\n\n${codeContent}\n\nIdentify ONE logical flaw or optimization. DO NOT write code. Provide a 1-sentence Socratic question to make them think.`,
          stream: false
        }, { timeout: 15000 });

        const socraticHint = response.data?.response?.trim() || 'What is the base case check value in your algorithm?';

        let targetLine = 0;
        for (let i = 0; i < doc.lineCount; i++) {
          if (doc.lineAt(i).text.trim().length > 0) {
            targetLine = i;
            break;
          }
        }

        const range = new vscode.Range(targetLine, 0, targetLine, doc.lineAt(targetLine).text.length);
        const diagnostic = new vscode.Diagnostic(
          range,
          `💡 SahAI Socratic: ${socraticHint}`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'SahAI Socratic';

        diagnosticCollection.set(doc.uri, [diagnostic]);
      } catch (err: any) {
        console.warn('[SahAI Lens] Ollama local service not reachable: ', err.message);
        diagnosticCollection.set(doc.uri, []);
      }
    });

    // Refresh context mastery score on save
    await updateStatusBar(context);
  });
  context.subscriptions.push(saveListener);
}

// 10. Auth Token Input Dialog Prompt
async function promptForToken(context: vscode.ExtensionContext) {
  const token = await vscode.window.showInputBox({
    prompt: 'Paste your Web API Token from the SahAI Dashboard to authenticate',
    ignoreFocusOut: true,
    password: true
  });

  if (token) {
    const cleaned = token.trim();
    await context.globalState.update('SAHAI_API_TOKEN', cleaned);
    vscode.window.showInformationMessage('🔑 SahAI Lens: Successfully connected!');
    await updateStatusBar(context);
  } else {
    vscode.window.showErrorMessage('🔑 SahAI Lens: API Token input cancelled.');
  }
}

// 11. Async Status Bar Refresher (Fetches user details and expected mastery aggregates)
async function updateStatusBar(context: vscode.ExtensionContext) {
  const problemSlug = context.workspaceState.get<string>('SAHAI_PROBLEM_ID');
  const apiToken = context.globalState.get<string>('SAHAI_API_TOKEN');

  const config = vscode.workspace.getConfiguration('sahaiLens');
  const backendUrl = config.get<string>('backendUrl') || 'https://sahai-api-node-production-f2f3.up.railway.app';

  // State 1: Disconnected
  if (!apiToken) {
    profileStatusBarItem.text = '$(key) SahAI: Connect Needed';
    profileStatusBarItem.tooltip = 'Click to connect your SahAI Web API credentials';
    profileStatusBarItem.show();

    masteryStatusBarItem.hide();
    return;
  }

  // State 2: Fetch profile details & update user profile status bar
  try {
    const profileRes = await axios.get(`${backendUrl}/api/users/${apiToken}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    const userName = profileRes.data?.name || profileRes.data?.username || 'Student';
    profileStatusBarItem.text = `$(account) SahAI: ${userName}`;
    profileStatusBarItem.tooltip = `Logged in as ${userName} (${profileRes.data?.academic_stream || 'DSA Program'})`;
    profileStatusBarItem.show();
  } catch (err) {
    profileStatusBarItem.text = '$(account) SahAI: Authenticated';
    profileStatusBarItem.tooltip = 'Click to reconnect your credentials';
    profileStatusBarItem.show();
  }

  // State 3: Fetch Mastery calculations
  if (problemSlug) {
    try {
      const contextRes = await axios.get(`${backendUrl}/api/telemetry/vscode-context/${problemSlug}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      const title = contextRes.data?.title || problemSlug;
      const masteryValue = contextRes.data?.average_mastery !== undefined ? contextRes.data.average_mastery : 0.5;
      const displayPercentage = Math.round(masteryValue * 100);

      masteryStatusBarItem.text = `$(brain) [${title}] Mastery: ${displayPercentage}%`;
      masteryStatusBarItem.tooltip = `Concept mapping tracks: ${contextRes.data?.mapped_nodes?.join(', ') || 'General'}`;
      masteryStatusBarItem.show();
    } catch (err) {
      masteryStatusBarItem.text = `$(brain) [${problemSlug}] Active`;
      masteryStatusBarItem.tooltip = 'Unable to sync mastery values from remote gateway.';
      masteryStatusBarItem.show();
    }
  } else {
    masteryStatusBarItem.text = '$(brain) SahAI: Select Problem';
    masteryStatusBarItem.tooltip = 'Click to target a LeetCode problem slug';
    masteryStatusBarItem.show();
  }
}

function isSupportedLanguage(langId: string): boolean {
  const supported = ['python', 'cpp', 'java', 'javascript', 'typescript'];
  return supported.includes(langId.toLowerCase());
}

export function deactivate() {
  if (activeInterval) {
    clearInterval(activeInterval);
  }
  if (syncInterval) {
    clearInterval(syncInterval);
  }
}
