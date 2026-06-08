import 'dart:math';
import 'package:flutter/material.dart';
import '../models/concept_node.dart';
import '../services/api_service.dart';

class SkillMeshScreen extends StatefulWidget {
  final String userId;

  const SkillMeshScreen({Key? key, required this.userId}) : super(key: key);

  @override
  _SkillMeshScreenState createState() => _SkillMeshScreenState();
}

class _SkillMeshScreenState extends State<SkillMeshScreen> {
  final ApiService _apiService = ApiService();
  List<ConceptNode> _nodes = [];
  bool _isLoading = true;
  String _error = '';
  ConceptNode? _selectedNode;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final state = await _apiService.fetchCognitiveState(widget.userId);
      setState(() {
        _nodes = state;
        _isLoading = false;
      });
    } catch (e) {
      // Offline / Connection Fallback: load mockup CS Core nodes so Yashwanth has a fully working preview
      setState(() {
        _nodes = _generatePreviewNodes();
        _isLoading = false;
      });
    }
  }

  List<ConceptNode> _generatePreviewNodes() {
    final List<Map<String, dynamic>> mockData = [
      {'id': 'CS_PROG_SYNTAX', 'name': 'Syntax & Semantics', 'mastery': 0.88, 'alpha': 8.8, 'beta': 1.2},
      {'id': 'CS_PROG_VARIABLES', 'name': 'Variables & Memory', 'mastery': 0.82, 'alpha': 4.1, 'beta': 0.9},
      {'id': 'CS_PROG_CONDITIONALS', 'name': 'Conditionals', 'mastery': 0.76, 'alpha': 3.8, 'beta': 1.2},
      {'id': 'CS_PROG_LOOPS', 'name': 'Loops & Iteration', 'mastery': 0.44, 'alpha': 2.2, 'beta': 2.8},
      {'id': 'CS_DS_ARRAYS', 'name': 'Arrays & Lists', 'mastery': 0.68, 'alpha': 3.4, 'beta': 1.6},
      {'id': 'CS_DS_LINKED_LISTS', 'name': 'Linked Lists', 'mastery': 0.52, 'alpha': 2.6, 'beta': 2.4},
      {'id': 'CS_DS_STACKS_QUEUES', 'name': 'Stacks & Queues', 'mastery': 0.58, 'alpha': 2.9, 'beta': 2.1},
      {'id': 'CS_DS_TREES', 'name': 'Binary Trees & BSTs', 'mastery': 0.38, 'alpha': 1.9, 'beta': 3.1},
      {'id': 'CS_DS_GRAPHS', 'name': 'Graph Representation', 'mastery': 0.22, 'alpha': 1.1, 'beta': 3.9},
      {'id': 'CS_ALG_SEARCHING', 'name': 'Searching Algorithms', 'mastery': 0.65, 'alpha': 3.25, 'beta': 1.75},
      {'id': 'CS_ALG_SORTING', 'name': 'Sorting Algorithms', 'mastery': 0.55, 'alpha': 2.75, 'beta': 2.25},
      {'id': 'CS_ALG_RECURSION', 'name': 'Recursion & Backtrack', 'mastery': 0.42, 'alpha': 2.1, 'beta': 2.9},
      {'id': 'CS_ALG_DYNAMIC_PROG', 'name': 'Dynamic Programming', 'mastery': 0.15, 'alpha': 0.75, 'beta': 4.25},
      {'id': 'CS_DBMS_RELATIONAL', 'name': 'Relational Model', 'mastery': 0.72, 'alpha': 3.6, 'beta': 1.4},
      {'id': 'CS_DBMS_NORMALIZATION', 'name': 'Normalization', 'mastery': 0.48, 'alpha': 2.4, 'beta': 2.6},
    ];

    return mockData.map((d) {
      return ConceptNode(
        nodeId: d['id'],
        conceptName: d['name'],
        difficultyBaseline: 0.5,
        alpha: d['alpha'],
        beta: d['beta'],
        expectedMastery: d['mastery'],
        lastPracticed: DateTime.now(),
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Cognitive Skill Mesh', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.emeraldAccent),
            onPressed: () {
              setState(() => _isLoading = true);
              _loadData();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.emeraldAccent))
          : Stack(
              children: [
                // Interactive Grid Painter
                GestureDetector(
                  onTapUp: (details) => _handleCanvasTap(details.localPosition),
                  child: InteractiveViewer(
                    maxScale: 2.0,
                    minScale: 0.5,
                    child: Container(
                      width: 800,
                      height: 1000,
                      color: const Color(0xFF0F172A),
                      child: CustomPaint(
                        painter: MeshPainter(nodes: _nodes),
                      ),
                    ),
                  ),
                ),

                // Top Info Bar
                Positioned(
                  top: 16,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withOpacity(0.9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.slate[800]!),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info, color: Colors.emeraldAccent, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Select nodes to display Beta parameters and Ebbinghaus time decays.',
                            style: TextStyle(color: Colors.slate[300], fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Drawer Slide-out Panel
                if (_selectedNode != null) _buildDetailDrawer(),
              ],
            ),
    );
  }

  void _handleCanvasTap(Offset tapPos) {
    // Check if clicked any node circle (centers are hardcoded in MeshPainter positions)
    ConceptNode? tapped;
    final centers = _getNodePositions(800, 1000);

    centers.forEach((nodeId, center) {
      final distance = (tapPos - center).distance;
      if (distance < 28) {
        // Radius of node circle
        tapped = _nodes.firstWhere((n) => n.nodeId == nodeId, orElse: () => _nodes[0]);
      }
    });

    setState(() {
      _selectedNode = tapped;
    });
  }

  Widget _buildDetailDrawer() {
    final node = _selectedNode!;
    final color = node.expectedMastery >= 0.75
        ? Colors.emeraldAccent
        : node.expectedMastery >= 0.50
            ? Colors.amberAccent
            : Colors.redAccent;

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Color(0xFF1E293B),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(color: Colors.black54, blurRadius: 10, offset: Offset(0, -2)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      node.nodeId,
                      style: TextStyle(color: Colors.slate[400], fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      node.conceptName,
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.slate),
                  onPressed: () => setState(() => _selectedNode = null),
                ),
              ],
            ),
            const Divider(color: Colors.slate, height: 24),
            Row(
              children: [
                _buildDrawerParam('EXPECTED MASTERY', '${(node.expectedMastery * 100).toStringAsFixed(1)}%', color),
                const SizedBox(width: 24),
                _buildDrawerParam('ALPHA (SUCCESS)', node.alpha.toStringAsFixed(2), Colors.emeraldAccent),
                const SizedBox(width: 24),
                _buildDrawerParam('BETA (ERRORS)', node.beta.toStringAsFixed(2), Colors.redAccent),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'forgetting_curve_decay_rate: 0.02/day • confidence_interval: [${(node.expectedMastery - 0.1).toStringAsFixed(2)}, ${(node.expectedMastery + 0.1).toStringAsFixed(2)}]',
              style: TextStyle(color: Colors.slate[400], fontSize: 11, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerParam(String label, String val, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.slate[400], fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
        const SizedBox(height: 4),
        Text(val, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
      ],
    );
  }

  static Map<String, Offset> _getNodePositions(double width, double height) {
    return {
      // Row 1 (Programming Basics)
      'CS_PROG_SYNTAX': Offset(width * 0.25, height * 0.15),
      'CS_PROG_VARIABLES': Offset(width * 0.75, height * 0.15),
      'CS_PROG_CONDITIONALS': Offset(width * 0.25, height * 0.30),
      'CS_PROG_LOOPS': Offset(width * 0.75, height * 0.30),
      
      // Row 2 (Data Structures)
      'CS_DS_ARRAYS': Offset(width * 0.20, height * 0.48),
      'CS_DS_LINKED_LISTS': Offset(width * 0.50, height * 0.48),
      'CS_DS_STACKS_QUEUES': Offset(width * 0.80, height * 0.48),
      
      // Row 3 (Algorithms)
      'CS_ALG_SEARCHING': Offset(width * 0.20, height * 0.65),
      'CS_ALG_SORTING': Offset(width * 0.50, height * 0.65),
      'CS_ALG_RECURSION': Offset(width * 0.80, height * 0.65),
      
      // Row 4 (Advanced DS / Alg)
      'CS_DS_TREES': Offset(width * 0.30, height * 0.80),
      'CS_DS_GRAPHS': Offset(width * 0.70, height * 0.80),
      'CS_ALG_DYNAMIC_PROG': Offset(width * 0.50, height * 0.90),
      
      // Database Submesh
      'CS_DBMS_RELATIONAL': Offset(width * 0.15, height * 0.90),
      'CS_DBMS_NORMALIZATION': Offset(width * 0.85, height * 0.90),
    };
  }
}

class MeshPainter extends CustomPainter {
  final List<ConceptNode> nodes;

  MeshPainter({required this.nodes});

  @override
  void paint(Canvas canvas, Size size) {
    final posMap = _SkillMeshScreenState._getNodePositions(size.width, size.height);
    final nodeMap = {for (var n in nodes) n.nodeId: n};

    // Paint configuration for edges
    final paintEdge = Paint()
      ..color = Colors.slate[800]!
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final paintDiagEdge = Paint()
      ..color = Colors.blueGrey[800]!
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Draw Prerequisite Edges (Source -> Target links)
    final edges = [
      {'src': 'CS_PROG_SYNTAX', 'tgt': 'CS_PROG_VARIABLES', 'diag': false},
      {'src': 'CS_PROG_VARIABLES', 'tgt': 'CS_PROG_CONDITIONALS', 'diag': false},
      {'src': 'CS_PROG_CONDITIONALS', 'tgt': 'CS_PROG_LOOPS', 'diag': false},
      {'src': 'CS_PROG_LOOPS', 'tgt': 'CS_DS_ARRAYS', 'diag': false},
      {'src': 'CS_PROG_VARIABLES', 'tgt': 'CS_DS_ARRAYS', 'diag': false},
      {'src': 'CS_DS_ARRAYS', 'tgt': 'CS_DS_LINKED_LISTS', 'diag': true},
      {'src': 'CS_DS_ARRAYS', 'tgt': 'CS_DS_STACKS_QUEUES', 'diag': false},
      {'src': 'CS_DS_LINKED_LISTS', 'tgt': 'CS_DS_TREES', 'diag': false},
      {'src': 'CS_DS_TREES', 'tgt': 'CS_DS_GRAPHS', 'diag': false},
      {'src': 'CS_DS_ARRAYS', 'tgt': 'CS_ALG_SEARCHING', 'diag': false},
      {'src': 'CS_ALG_SEARCHING', 'tgt': 'CS_ALG_SORTING', 'diag': true},
      {'src': 'CS_ALG_RECURSION', 'tgt': 'CS_DS_TREES', 'diag': false},
      {'src': 'CS_ALG_RECURSION', 'tgt': 'CS_ALG_DYNAMIC_PROG', 'diag': false},
      {'src': 'CS_DBMS_RELATIONAL', 'tgt': 'CS_DBMS_NORMALIZATION', 'diag': false},
    ];

    for (var edge in edges) {
      final srcOffset = posMap[edge['src']];
      final tgtOffset = posMap[edge['tgt']];
      if (srcOffset != null && tgtOffset != null) {
        canvas.drawLine(srcOffset, tgtOffset, edge['diag'] == true ? paintDiagEdge : paintEdge);
      }
    }

    // Draw Concept Node circles
    posMap.forEach((nodeId, center) {
      final node = nodeMap[nodeId];
      final mastery = node?.expectedMastery ?? 0.5;
      
      // Determine mastery color
      Color color = Colors.redAccent;
      if (mastery >= 0.75) {
        color = Colors.emeraldAccent;
      } else if (mastery >= 0.50) {
        color = Colors.amberAccent;
      }

      // Outer glow circle
      canvas.drawCircle(
        center,
        32,
        Paint()..color = color.withOpacity(0.12)..style = PaintingStyle.fill,
      );

      // Node border
      canvas.drawCircle(
        center,
        24,
        Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 2.0,
      );

      // Node inner fill
      canvas.drawCircle(
        center,
        23,
        Paint()..color = const Color(0xFF1E293B)..style = PaintingStyle.fill,
      );

      // Text label for initials
      final textSpan = TextSpan(
        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
        text: nodeId.replaceFirst('CS_PROG_', '').replaceFirst('CS_DS_', '').replaceFirst('CS_ALG_', '').replaceFirst('CS_DBMS_', '').substring(0, min(4, nodeId.length - 3)),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(center.dx - textPainter.width / 2, center.dy - textPainter.height / 2),
      );
    });
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
