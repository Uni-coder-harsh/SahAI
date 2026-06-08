import 'dart:math';
import 'package:flutter/material.dart';
import '../models/concept_node.dart';
import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  final String userId;
  final VoidCallback onStartSandbox;

  const DashboardScreen({
    Key? key,
    required this.userId,
    required this.onStartSandbox,
  }) : super(key: key);

  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _apiService = ApiService();
  List<ConceptNode> _nodes = [];
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadState();
  }

  Future<void> _loadState() async {
    try {
      final data = await _apiService.fetchCognitiveState(widget.userId);
      setState(() {
        _nodes = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Connect your backend services to view active cognitive states.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final double avgMastery = _nodes.isEmpty
        ? 0.50
        : _nodes.map((e) => e.expectedMastery).reduce((a, b) => a + b) / _nodes.length;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Premium Slate Black
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Colors.emeraldAccent))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Welcome Banner
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Cognitive Hub',
                              style: TextStyle(
                                color: Colors.slate[400],
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Welcome back, Student',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ],
                        ),
                        CircleAvatar(
                          backgroundColor: Colors.emerald[800],
                          radius: 24,
                          child: const Text('ST', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    // Metrics Row
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricCard(
                            'EXPECTED MASTERY',
                            '${(avgMastery * 100).toStringAsFixed(1)}%',
                            Colors.emerald,
                            Icons.psychology,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildMetricCard(
                            'CONCEPT COUNT',
                            '${_nodes.isEmpty ? 15 : _nodes.length} Nodes',
                            Colors.blueAccent,
                            Icons.account_tree,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    // Skill Graph Chart / Radar Canvas
                    const Text(
                      'Cognitive Distribution Map',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _buildRadarMesh(avgMastery),
                    const SizedBox(height: 32),

                    // AI Curated Daily Sprint
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'AI-Curated Daily Sprint',
                          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'High Priority',
                          style: TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildDailySprintList(),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Dark slate secondary
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(color: Colors.slate[400], fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildRadarMesh(double avgMastery) {
    return Container(
      height: 240,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: CustomPaint(
          painter: RadarPainter(mastery: avgMastery),
          child: Center(
            child: _error.isNotEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Text(
                      _error,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.slate[400], fontSize: 12),
                    ),
                  )
                : Container(),
          ),
        ),
      ),
    );
  }

  Widget _buildDailySprintList() {
    final List<Map<String, dynamic>> sprintTasks = [
      {
        'node': 'CS_DS_ARRAYS',
        'title': 'Optimize Array Element Shifting',
        'desc': 'Prerequisite loop parameters require tuning. (Correlation weight: 0.80)',
        'type': 'Coding Challenge',
        'color': Colors.amberAccent
      },
      {
        'node': 'CS_PROG_LOOPS',
        'title': 'Resolve Loop Condition Drift',
        'desc': 'Recent telemetry signals syntactic hesitation in loop logic.',
        'type': 'OCR Note Upload',
        'color': Colors.blueAccent
      },
      {
        'node': 'CS_ALG_RECURSION',
        'title': 'Recursion Base-Case Deduction',
        'desc': 'Deep DAG update shows high correlation with Binary Tree traversal.',
        'type': 'Diagnostic Quiz',
        'color': Colors.purpleAccent
      }
    ];

    return Column(
      children: sprintTasks.map((task) {
        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.slate[800]!, width: 1),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 4,
                height: 60,
                decoration: BoxDecoration(
                  color: task['color'],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          task['type'],
                          style: TextStyle(color: task['color'], fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          task['node'],
                          style: TextStyle(color: Colors.slate[500], fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      task['title'],
                      style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      task['desc'],
                      style: TextStyle(color: Colors.slate[400], fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                icon: const Icon(Icons.arrow_forward_ios, color: Colors.emeraldAccent, size: 18),
                onPressed: widget.onStartSandbox,
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class RadarPainter extends CustomPainter {
  final double mastery;

  RadarPainter({required this.mastery});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) * 0.35;
    
    final paintGrid = Paint()
      ..color = Colors.slate[800]!
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final paintRadial = Paint()
      ..color = Colors.slate[800]!
      ..strokeWidth = 1.0;

    // Draw concentric circles
    for (int i = 1; i <= 4; i++) {
      canvas.drawCircle(center, radius * (i / 4.0), paintGrid);
    }

    // Draw radial axes
    const int numAxes = 6;
    final double angleStep = (2 * pi) / numAxes;
    for (int i = 0; i < numAxes; i++) {
      final angle = i * angleStep;
      final endpoint = Offset(
        center.dx + radius * cos(angle),
        center.dy + radius * sin(angle),
      );
      canvas.drawLine(center, endpoint, paintRadial);
    }

    // Draw student mastery polygon
    final path = Path();
    final masteryPoints = <Offset>[];
    
    // Create random-like but stable peaks matching mastery bounds for UI rendering
    final r = Random(42);
    for (int i = 0; i < numAxes; i++) {
      final angle = i * angleStep;
      final currentMastery = min(1.0, max(0.2, mastery + r.nextDouble() * 0.2 - 0.1));
      masteryPoints.add(Offset(
        center.dx + radius * currentMastery * cos(angle),
        center.dy + radius * currentMastery * sin(angle),
      ));
    }

    path.moveTo(masteryPoints[0].dx, masteryPoints[0].dy);
    for (int i = 1; i < numAxes; i++) {
      path.lineTo(masteryPoints[i].dx, masteryPoints[i].dy);
    }
    path.close();

    final paintPoly = Paint()
      ..color = Colors.emeraldAccent.withOpacity(0.2)
      ..style = PaintingStyle.fill;
      
    final paintBorder = Paint()
      ..color = Colors.emeraldAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    canvas.drawPath(path, paintPoly);
    canvas.drawPath(path, paintBorder);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
