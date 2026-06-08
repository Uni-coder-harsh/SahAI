import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'failure_report_screen.dart';

class SandboxScreen extends StatefulWidget {
  final String userId;

  const SandboxScreen({Key? key, required this.userId}) : super(key: key);

  @override
  _SandboxScreenState createState() => _SandboxScreenState();
}

class _SandboxScreenState extends State<SandboxScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _codeController = TextEditingController(
    text: 'def shift_elements(arr):\n    # TODO: Write shifting logic\n    pass\n'
  );

  int _runCount = 0;
  bool _success = true;
  bool _didPaste = false;
  bool _isTransmitting = false;
  String _consoleOutput = 'Console initialized. Ready to execute code.';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Practice Sandbox', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
      ),
      body: Row(
        children: [
          // Left Pane: Code Editor Area
          Expanded(
            flex: 6,
            child: Container(
              padding: const EdgeInsets.all(20),
              color: const Color(0xFF0F172A),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'MODE A: CODE EDITING',
                        style: TextStyle(color: Colors.slate, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                      ),
                      Row(
                        children: [
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.indigo,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.paste, size: 16),
                            label: const Text('Mock Paste'),
                            onPressed: () {
                              setState(() {
                                _codeController.text = 'def shift_elements(arr):\n    # Pasted snippet\n    n = len(arr)\n    temp = arr[n-1]\n    for i in range(n-1, 0, -1):\n        arr[i] = arr[i-1]\n    arr[0] = temp\n    return arr\n';
                                _didPaste = true;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.emerald,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.play_arrow, size: 16),
                            label: const Text('Run Code'),
                            onPressed: _runCode,
                          ),
                        ],
                      )
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Code input field
                  Expanded(
                    flex: 5,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.slate[800]!),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: TextField(
                        controller: _codeController,
                        maxLines: null,
                        keyboardType: TextInputType.multiline,
                        style: const TextStyle(color: Colors.emeraldAccent, fontFamily: 'monospace', fontSize: 13),
                        decoration: const InputDecoration(border: InputBorder.none),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('CONSOLE OUTPUT', style: TextStyle(color: Colors.slate, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  // Mock compiler console
                  Expanded(
                    flex: 2,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _consoleOutput,
                        style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 11),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Vertical divider
          Container(width: 1, color: Colors.slate[900]),

          // Right Pane: OCR Scan / Submit
          Expanded(
            flex: 4,
            child: Container(
              padding: const EdgeInsets.all(20),
              color: const Color(0xFF1E293B),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'MODE B: OCR SCAN & INGESTION',
                    style: TextStyle(color: Colors.slate, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                  ),
                  const SizedBox(height: 20),
                  // Scanned notes area
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.slate[800]!),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.camera_alt, color: Colors.slate[600], size: 48),
                          const SizedBox(height: 12),
                          const Text('Snapping handwritten notes...', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24.0),
                            child: Text(
                              'Converts notebook derivations into cognitive triggers locally ($0 operating cost).',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.slate[400], fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Telemetry parameters overview
                  _buildStatusRow('Compilation Runs:', '$_runCount attempts'),
                  _buildStatusRow('Copy-Paste Flagged:', _didPaste ? 'TRUE' : 'FALSE', _didPaste ? Colors.redAccent : Colors.slate),
                  const Spacer(),
                  // Submit buttons
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.emeraldAccent[700],
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _isTransmitting ? null : _submitTelemetry,
                      child: _isTransmitting
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              'Submit to Cognitive Engine',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  void _runCode() {
    setState(() {
      _runCount++;
      _consoleOutput = 'Compiling sandbox...\nExecuting test suite...\nTest 1/3: Array Shifting - PASSED\nTest 2/3: Bound Handling - PASSED\nExecution completed successfully.';
    });
  }

  Widget _buildStatusRow(String label, String val, [Color color = Colors.white]) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.slate[400], fontSize: 13)),
          Text(val, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Future<void> _submitTelemetry() async {
    setState(() => _isTransmitting = true);

    final List<String> flags = [];
    if (_didPaste) flags.add('COPY_PASTE_PRONE');

    // Post telemetry to backend
    final ok = await _apiService.sendTelemetry(
      userId: widget.userId,
      nodeId: 'CS_DS_ARRAYS',
      eventType: 'ATTEMPT',
      success: _success,
      attempts: _runCount == 0 ? 1 : _runCount,
      codeSnippet: _codeController.text,
      behavioralFlags: flags,
      timeSpentSeconds: 120,
    );

    if (ok) {
      // Let Python worker consume
      await Future.delayed(const Duration(milliseconds: 1500));
      
      // Redirect to Failure DNA page
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => FailureReportScreen(
              userId: widget.userId,
              targetNodeId: 'CS_DS_ARRAYS',
              didPaste: _didPaste,
            ),
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Submission rejected. Is your API Gateway running?')),
      );
    }
    setState(() => _isTransmitting = false);
  }
}
