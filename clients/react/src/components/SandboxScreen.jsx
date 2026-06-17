import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Code, Terminal, Play, Image, Upload, Smartphone, Laptop, CheckCircle, ShieldAlert } from 'lucide-react';

const STARTER_SNIPPETS = {
  PY_SYNTAX: `# Basic Python Syntax Practice\nprint("Hello SahAI!")\n\n# Indentation is key in Python\nif True:\n    print("Indented block executed successfully")\n`,
  PY_DATA: `# Numbers, floats, and numeric operators\na = 10\nb = 3.5\nresult = a * b\nprint(f"Product: {result}")\nprint(type(result))\n`,
  PY_STRING: `# String manipulation and slicing\ntext = "Advanced Agentic Coding"\nprint(text[0:8])  # Slicing out first word\nprint(text.upper())\n`,
  PY_CONTROL: `# Conditional structures and loops\nfor i in range(5):\n    if i % 2 == 0:\n        print(f"{i} is Even")\n    else:\n        print(f"{i} is Odd")\n`,
  PY_LIST: `# Lists operations and list comprehensions\nnumbers = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in numbers]\nprint(f"Original: {numbers}")\nprint(f"Squares: {squares}")\n`,
  DEFAULT: `# Write your Python script here\nprint("Prior masteries syncing...")\n`
};

export default function SandboxScreen({ user }) {
  const [concepts, setConcepts] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('CS_PY_SYNTAX');
  const [code, setCode] = useState(STARTER_SNIPPETS.PY_SYNTAX);
  
  // Terminal Logs & Statuses
  const [consoleLogs, setConsoleLogs] = useState('// Console initialized. Select a concept and click Run.');
  const [isRunning, setIsRunning] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [timer, setTimer] = useState(0);

  // Layout View (IDE / OCR Mobile Mode)
  const [viewMode, setViewMode] = useState('desktop'); // desktop or mobile (OCR)

  // OCR state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState('');

  const timerIntervalRef = useRef(null);

  // Fetch nodes to populate concept list
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const state = await api.fetchCognitiveState(user.id);
        if (state && state.length > 0) {
          setConcepts(state);
          setSelectedNodeId(state[0].node_id);
        }
      } catch (err) {
        console.error('Failed to load concepts for sandbox:', err);
      }
    };
    fetchNodes();
  }, [user.id]);

  // Handle snippet selection
  const handleConceptSelect = (nodeId) => {
    setSelectedNodeId(nodeId);
    
    // Pick match snippet
    const key = nodeId.split('_').slice(1, 3).join('_'); // e.g. PY_SYNTAX
    setCode(STARTER_SNIPPETS[key] || STARTER_SNIPPETS.DEFAULT);
    setAttempts(1);
    setTimer(0);
  };

  // Sandbox Timer
  useEffect(() => {
    setTimer(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    timerIntervalRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [selectedNodeId]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setConsoleLogs('> Initializing sandboxed environment...\n> Spawning Python interpreter process...\n');

    setTimeout(async () => {
      // Mock code compilation checks
      let output = '';
      let success = true;
      const cleanCode = code.trim();

      if (cleanCode.includes('SyntaxError') || cleanCode.includes('indent') && cleanCode.includes('if True:\nprint')) {
        output = '  File "main.py", line 4\n    print("Indented block...")\n    ^\nIndentationError: expected an indented block';
        success = false;
      } else {
        // Mock stdout execution outputs based on snippet contents
        if (cleanCode.includes('SahAI')) {
          output = 'Hello SahAI!\nIndented block executed successfully\n\nProcess completed successfully with exit code 0.';
        } else if (cleanCode.includes('Product')) {
          output = 'Product: 35.0\n<class \'float\'>\n\nProcess completed successfully with exit code 0.';
        } else if (cleanCode.includes('Slicing')) {
          output = 'Advanced\nADVANCED AGENTIC CODING\n\nProcess completed successfully with exit code 0.';
        } else if (cleanCode.includes('Odd')) {
          output = '0 is Even\n1 is Odd\n2 is Even\n3 is Odd\n4 is Even\n\nProcess completed successfully with exit code 0.';
        } else if (cleanCode.includes('Squares')) {
          output = 'Original: [1, 2, 3, 4, 5]\nSquares: [1, 4, 9, 16, 25]\n\nProcess completed successfully with exit code 0.';
        } else {
          output = 'Prior masteries syncing...\nProcess completed successfully with exit code 0.';
        }
      }

      setConsoleLogs(prev => prev + `> Executing script...\n\n${output}`);
      setIsRunning(false);

      // Trigger asynchronous telemetry to update student-specific graph state
      try {
        await api.sendTelemetry({
          user_id: user.id,
          node_id: selectedNodeId,
          event_type: 'RUN',
          success: success,
          attempts: attempts,
          code_snippet: code,
          behavioral_flags: success ? [] : ['SYNTAX_ERROR_TRIGGERED'],
          time_spent_seconds: timer
        });
        setAttempts(prev => prev + 1);
      } catch (err) {
        console.error('Failed to submit sandbox telemetry:', err);
      }
    }, 1500);
  };

  // OCR simulation triggers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOcrScan = () => {
    if (!selectedImage) return;

    setOcrScanning(true);
    setOcrResult('');

    setTimeout(async () => {
      // Mock Tesseract/Vision OCR OCR mapping
      const resultText = `# Handwriting OCR Scan Result\n# Concept: ${selectedNodeId}\n# Date: ${new Date().toLocaleDateString()}\n\nprint("OCR Node note parsed successfully")\nx = [i for i in range(10) if i % 2 == 0]\nprint("Sub-concept coverage established.")\n`;
      
      setOcrResult(resultText);
      setOcrScanning(false);

      // Submit OCR Telemetry
      try {
        await api.sendTelemetry({
          user_id: user.id,
          node_id: selectedNodeId,
          event_type: 'OCR',
          success: true,
          attempts: 1,
          code_snippet: resultText,
          behavioral_flags: ['HANDWRITING_OCR_PARSED'],
          time_spent_seconds: 15
        });
      } catch (err) {
        console.error('Failed to submit OCR telemetry:', err);
      }
    }, 2500);
  };

  return (
    <div className="animate-fade-in">
      {/* Upper header with layouts toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Code style={{ color: 'var(--primary)' }} />
            <span>Interactive Sandbox</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Experiment with code syntax or scan offline handwriting notes to sync knowledge.</p>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setViewMode('desktop')}
            className={`btn ${viewMode === 'desktop' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <Laptop size={14} />
            <span>Desktop IDE</span>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`btn ${viewMode === 'mobile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <Smartphone size={14} />
            <span>Handwriting OCR</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Concepts Picker Sidebar */}
        <div className="glass-card" style={{ padding: '16px', maxHeight: '550px', overflowY: 'auto' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Practiced Concept</h4>
          <div style={{ display: 'flex', flexTheme: 'column', flexDirection: 'column', gap: '6px' }}>
            {concepts.map((concept) => (
              <button
                key={concept.node_id}
                onClick={() => handleConceptSelect(concept.node_id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedNodeId === concept.node_id ? 'var(--primary-glow)' : 'transparent',
                  color: selectedNodeId === concept.node_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: selectedNodeId === concept.node_id ? 600 : 500,
                  fontSize: '0.85rem',
                  borderLeft: selectedNodeId === concept.node_id ? '3px solid var(--primary)' : 'none',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {concept.concept_name}
              </button>
            ))}
          </div>
        </div>

        {/* View Layout Main Window */}
        {viewMode === 'desktop' ? (
          /* IDE Mode */
          <div className="sandbox-grid">
            {/* Editor Card */}
            <div className="glass-card">
              <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge badge-primary">python_editor.py</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attempt: #{attempts}</span>
              </div>
              <div className="glass-card-body">
                <textarea
                  className="editor-textarea"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="# Write code here"
                />
                <button
                  className="btn btn-primary"
                  onClick={handleRunCode}
                  disabled={isRunning}
                  style={{ width: '100%', marginTop: '16px', height: '44px' }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>{isRunning ? 'Compiling...' : 'Run Code snippet'}</span>
                </button>
              </div>
            </div>

            {/* Console Output Card */}
            <div className="glass-card">
              <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Terminal size={18} style={{ color: 'var(--accent)' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Console logs</h4>
              </div>
              <div className="glass-card-body">
                <div className="console-output">{consoleLogs}</div>
              </div>
            </div>
          </div>
        ) : (
          /* Mobile Handwriting Note Scanning OCR Mode */
          <div className="sandbox-grid">
            {/* Upload Scan card */}
            <div className="glass-card">
              <div className="glass-card-header" style={{ marginBottom: '16px' }}>
                <span className="badge badge-success">Local OCR Vision Engine</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '8px' }}>Handwriting Note Scanner</h3>
              </div>
              <div className="glass-card-body">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '30px 20px', background: 'rgba(0,0,0,0.1)', cursor: 'pointer', position: 'relative', marginBottom: '16px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Handwriting Scan" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', objectFit: 'contain' }} />
                  ) : (
                    <>
                      <Upload size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Upload note scan image</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG or JPEG up to 10MB</span>
                    </>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleOcrScan}
                  disabled={!selectedImage || ocrScanning}
                  style={{ width: '100%', height: '44px' }}
                >
                  <Image size={16} />
                  <span>{ocrScanning ? 'Scanning Text OCR...' : 'Process Note Scan'}</span>
                </button>
              </div>
            </div>

            {/* OCR vision parser result output */}
            <div className="glass-card">
              <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <CheckCircle size={18} style={{ color: 'var(--accent)' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Parsed Note Code</h4>
              </div>
              <div className="glass-card-body">
                {ocrScanning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
                    <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--accent)', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Extracting text from notebook margins...</p>
                  </div>
                ) : ocrResult ? (
                  <div className="animate-fade-in">
                    <pre style={{ background: '#0d0e12', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', color: '#14b8a6', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', height: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                      {ocrResult}
                    </pre>
                    <div className="badge-success" style={{ display: 'flex', gap: '8px', padding: '12px', borderRadius: '10px', marginTop: '16px', fontSize: '0.85rem' }}>
                      <CheckCircle size={16} style={{ flexShrink: 0 }} />
                      <span>Note parsed! Cognitive prior mastery models adjusted asynchronously.</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                    <Smartphone size={32} style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '0.85rem' }}>Upload an image of your handwritten notes on the left and run the parser to see results.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
