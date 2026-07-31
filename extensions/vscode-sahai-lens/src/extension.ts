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

// In-Memory lookup map for common LeetCode problem numbers to official title slugs
const COMMON_LEETCODE_MAP: Record<string, string> = {
  "1": "two-sum",
  "2": "add-two-numbers",
  "3": "longest-substring-without-repeating-characters",
  "4": "median-of-two-sorted-arrays",
  "5": "longest-palindromic-substring",
  "9": "palindrome-number",
  "11": "container-with-most-water",
  "13": "roman-to-integer",
  "14": "longest-common-prefix",
  "15": "3sum",
  "19": "remove-nth-node-from-end-of-list",
  "20": "valid-parentheses",
  "21": "merge-two-sorted-lists",
  "22": "generate-parentheses",
  "23": "merge-k-sorted-lists",
  "26": "remove-duplicates-from-sorted-array",
  "27": "remove-element",
  "33": "search-in-rotated-sorted-array",
  "34": "find-first-and-last-position-of-element-in-sorted-array",
  "35": "search-insert-position",
  "39": "combination-sum",
  "42": "trapping-rain-water",
  "46": "permutations",
  "48": "rotate-image",
  "49": "group-anagrams",
  "50": "powx-n",
  "53": "maximum-subarray",
  "55": "jump-game",
  "56": "merge-intervals",
  "70": "climbing-stairs",
  "72": "edit-distance",
  "74": "search-a-2d-matrix",
  "75": "sort-colors",
  "78": "subsets",
  "79": "word-search",
  "84": "largest-rectangle-in-histogram",
  "88": "merge-sorted-array",
  "94": "binary-tree-inorder-traversal",
  "98": "validate-binary-search-tree",
  "101": "symmetric-tree",
  "102": "binary-tree-level-order-traversal",
  "104": "maximum-depth-of-binary-tree",
  "121": "best-time-to-buy-and-sell-stock",
  "122": "best-time-to-buy-and-sell-stock-ii",
  "124": "binary-tree-maximum-path-sum",
  "125": "valid-palindrome",
  "128": "longest-consecutive-sequence",
  "136": "single-number",
  "138": "copy-list-with-random-pointer",
  "139": "word-break",
  "141": "linked-list-cycle",
  "142": "linked-list-cycle-ii",
  "146": "lru-cache",
  "155": "min-stack",
  "160": "intersection-of-two-linked-lists",
  "167": "two-sum-ii-input-array-is-sorted",
  "169": "majority-element",
  "189": "rotate-array",
  "198": "house-robber",
  "200": "number-of-islands",
  "206": "reverse-linked-list",
  "207": "course-schedule",
  "208": "implement-trie-prefix-tree",
  "215": "kth-largest-element-in-an-array",
  "217": "contains-duplicate",
  "226": "invert-binary-tree",
  "230": "kth-smallest-element-in-a-bst",
  "234": "palindrome-linked-list",
  "236": "lowest-common-ancestor-of-a-binary-tree",
  "238": "product-of-array-except-self",
  "239": "sliding-window-maximum",
  "242": "valid-anagram",
  "283": "move-zeroes",
  "295": "find-median-from-data-stream",
  "300": "longest-increasing-subsequence",
  "322": "coin-change",
  "344": "reverse-string",
  "347": "top-k-frequent-elements",
  "387": "first-unique-character-in-a-string",
  "412": "fizz-buzz",
  "438": "find-all-anagrams-in-a-string",
  "543": "diameter-of-binary-tree",
  "560": "subarray-sum-equals-k",
  "704": "binary-search",
  "739": "daily-temperatures",
  "977": "squares-of-a-sorted-array"
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-sahai-lens" is now active!');

  // 1. Initialize Profile Status Bar (Left side) - Clicking connects authentication
  profileStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  profileStatusBarItem.command = 'sahai.connect';
  context.subscriptions.push(profileStatusBarItem);

  // 2. Initialize Mastery Context Status Bar (Right side) - Clicking changes file problem target
  masteryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  masteryStatusBarItem.command = 'sahai.setProblemContext';
  context.subscriptions.push(masteryStatusBarItem);

  // Initial UI refresh
  updateStatusBar(context);

  // 3. Connect Auth handshakes Command
  const connectCommand = vscode.commands.registerCommand('sahai.connect', async () => {
    await promptForToken(context);
  });
  context.subscriptions.push(connectCommand);

  // 4. Verification warning check
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

  // 5. Command Contribution: Target Problem Context Binding (Per-File Basis)
  const setProblemContextCommand = vscode.commands.registerCommand(
    'sahai.setProblemContext',
    async () => {
      const apiToken = context.globalState.get<string>('SAHAI_API_TOKEN');
      if (!apiToken) {
        await promptForToken(context);
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage('Please open a code file first to set its target LeetCode problem context.');
        return;
      }

      const activePath = activeEditor.document.uri.fsPath;
      const problemMap = context.workspaceState.get<Record<string, string>>('SAHAI_PROBLEM_MAP') || {};
      const currentProblem = problemMap[activePath] || '';

      const input = await vscode.window.showInputBox({
        prompt: 'Enter Leetcode Problem (e.g. "1", "LC-1", "two-sum" or "Two Sum")',
        value: currentProblem,
        placeHolder: 'e.g., LC-1 or two-sum'
      });

      if (input !== undefined) {
        const cleaned = input.trim();
        if (cleaned) {
          let problemSlug = cleaned.toLowerCase().replace(/\s+/g, '-');

          // Check if it matches an integer pattern (like "1" or "lc-1" or "lc 1")
          const numMatch = problemSlug.match(/^(?:lc[- ]?)?(\d+)$/i);
          if (numMatch) {
            const num = numMatch[1];
            if (COMMON_LEETCODE_MAP[num]) {
              problemSlug = COMMON_LEETCODE_MAP[num];
              console.log(`[SahAI Lens] Mapping question number ${num} to slug: ${problemSlug}`);
            }
          }

          // Save the target slug to problem map for this specific file path
          problemMap[activePath] = problemSlug;
          await context.workspaceState.update('SAHAI_PROBLEM_MAP', problemMap);
          
          vscode.window.showInformationMessage(`🧠 SahAI: Mapped this file to [${problemSlug}]`);

          // Fetch context immediately & insert question comment
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `SahAI: Fetching metadata for ${problemSlug}...`,
            cancellable: false
          }, async () => {
            const contextData = await fetchProblemContextData(apiToken, problemSlug);
            if (contextData && contextData.description) {
              insertQuestionCommentHeader(activeEditor, contextData.title, contextData.description);
            }
          });

          await updateStatusBar(context);
        } else {
          // Clear mapped slug for this file
          delete problemMap[activePath];
          await context.workspaceState.update('SAHAI_PROBLEM_MAP', problemMap);
          vscode.window.showInformationMessage('🧠 SahAI: Target problem cleared for this file.');
          await updateStatusBar(context);
        }
      }
    }
  );
  context.subscriptions.push(setProblemContextCommand);

  // 6. Track Active Workspace Editor Document State & Active Timing
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
      updateStatusBar(context); // Update Status Bars immediately when active tab changes
    })
  );
  updateActiveTelemetry();

  // 7. In-Memory Time Tracker (Tick active seconds)
  activeInterval = setInterval(() => {
    if (activeDocumentPath && telemetryStore[activeDocumentPath]) {
      telemetryStore[activeDocumentPath].timeSpentSeconds += 1;
    }
  }, 1000);

  // 8. Empathetic Telemetry Text Change Event Listeners
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
      // (a) Deletions / Backspaces
      if (change.text === '' && change.rangeLength > 0) {
        metrics.backspaceCount += 1;
      }

      // (b) Empathetic paste nudges
      if (change.text.length > 100) {
        metrics.pasteCharCount += change.text.length;
        vscode.window.showInformationMessage(
          'Copy-pasting? Breaking down the logic yourself builds stronger long-term memory! 🌱'
        );
      }
    });
  });
  context.subscriptions.push(textChangeListener);

  // 9. Background Telemetry Ingest Sync Interval (Every 60 seconds)
  syncInterval = setInterval(async () => {
    const apiToken = context.globalState.get<string>('SAHAI_API_TOKEN');
    if (!apiToken) {
      return;
    }

    const config = vscode.workspace.getConfiguration('sahaiLens');
    const backendUrl = config.get<string>('backendUrl') || 'https://sahai-api-node-production-f2f3.up.railway.app';
    const problemMap = context.workspaceState.get<Record<string, string>>('SAHAI_PROBLEM_MAP') || {};

    let didSync = false;
    for (const path of Object.keys(telemetryStore)) {
      const metrics = telemetryStore[path];
      const problemId = problemMap[path] || 'general-dsa';

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
          // Reset metrics on successful transmission
          metrics.timeSpentSeconds = 0;
          metrics.backspaceCount = 0;
          metrics.pasteCharCount = 0;
          metrics.runCount = 0;
        } catch (err: any) {
          console.error('[SahAI Lens] Telemetry sync error: ', err.message);
        }
      }
    }

    if (didSync) {
      await updateStatusBar(context);
    }
  }, 60000);

  // 10. Socratic Diagnostics Hover Collections
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('sahai-socratic');
  context.subscriptions.push(diagnosticCollection);

  const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (!isSupportedLanguage(doc.languageId)) {
      return;
    }

    const path = doc.uri.fsPath;
    if (telemetryStore[path]) {
      telemetryStore[path].runCount += 1;
    }

    const problemMap = context.workspaceState.get<Record<string, string>>('SAHAI_PROBLEM_MAP') || {};
    const problemId = problemMap[path];
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

    await updateStatusBar(context);
  });
  context.subscriptions.push(saveListener);
}

// 11. Fetch Context data helper
async function fetchProblemContextData(apiToken: string, problemSlug: string): Promise<any | null> {
  const config = vscode.workspace.getConfiguration('sahaiLens');
  const backendUrl = config.get<string>('backendUrl') || 'https://sahai-api-node-production-f2f3.up.railway.app';
  try {
    const response = await axios.get(`${backendUrl}/api/telemetry/vscode-context/${problemSlug}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    return response.data;
  } catch (err) {
    console.error('[SahAI Lens] Failed to fetch problem details: ', err);
    return null;
  }
}

// 12. Format and insert question markdown description as comments at top of file
function insertQuestionCommentHeader(editor: vscode.TextEditor, title: string, description: string) {
  const doc = editor.document;
  const langId = doc.languageId;
  let commentPrefix = '#';
  if (['javascript', 'typescript', 'cpp', 'java', 'go', 'rust'].includes(langId.toLowerCase())) {
    commentPrefix = '//';
  }

  // Clear tags and decode common XML entities
  let cleanDesc = description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();

  // Split and format lines
  const lines = cleanDesc.split('\n');
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 ? `${commentPrefix} ${trimmed}` : commentPrefix;
  });

  const header = `${commentPrefix} ==========================================\n` +
                 `${commentPrefix} LeetCode Problem: ${title}\n` +
                 `${commentPrefix} ==========================================\n` +
                 formattedLines.join('\n') + '\n' +
                 `${commentPrefix} ==========================================\n\n`;

  editor.edit(editBuilder => {
    editBuilder.insert(new vscode.Position(0, 0), header);
  });
}

// 13. Auth Token Input Dialog Prompt
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

// 14. Async Status Bar Refresher (Updates per-file context and user details)
async function updateStatusBar(context: vscode.ExtensionContext) {
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

  // State 2: Fetch and display User profile details (Left side)
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
    profileStatusBarItem.tooltip = 'Click to reconnect credentials';
    profileStatusBarItem.show();
  }

  // State 3: Fetch and display active file problem expected mastery (Right side)
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const activePath = activeEditor.document.uri.fsPath;
    const problemMap = context.workspaceState.get<Record<string, string>>('SAHAI_PROBLEM_MAP') || {};
    const problemSlug = problemMap[activePath];

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
      masteryStatusBarItem.tooltip = 'Click to target a LeetCode problem slug for this file';
      masteryStatusBarItem.show();
    }
  } else {
    masteryStatusBarItem.hide();
  }
}

function isSupportedLanguage(langId: string): boolean {
  const supported = ['python', 'cpp', 'java', 'javascript', 'typescript', 'go', 'rust'];
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
