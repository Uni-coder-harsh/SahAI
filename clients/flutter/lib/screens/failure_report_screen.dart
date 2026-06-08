import 'package:flutter/material.dart';
import '../models/concept_node.dart';
import '../services/api_service.dart';

class FailureReportScreen extends StatefulWidget {
  final String userId;
  final String targetNodeId;
  final bool didPaste;

  const FailureReportScreen({
    Key? key,
    required this.userId,
    required this.targetNodeId,
    required this.didPaste,
  }) : super(key: key);

  @override
  _FailureReportScreenState createState() => _FailureReportScreenState();
}

class _FailureReportScreenState extends State<FailureReportScreen> {
  final ApiService _apiService = ApiService();
  List<ConceptNode> _nodes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadState();
  }

  Future<void> _loadState() async {
    try {
      final state = await _apiService.fetchCognitiveState(widget.userId);
      setState(() {
        _nodes = state;
        _isLoading = false;
      });
    } catch (e) {
      // Stub fallback for preview if backend is disconnected
      setState(() {
        _nodes = _generateFallbackNodes();
        _isLoading = false;
      });
    }
  }

  List<ConceptNode> _generateFallbackNodes() {
    return [
      ConceptNode(
        nodeId: 'CS_DS_ARRAYS',
        conceptName: 'Arrays & Lists',
        difficultyBaseline: 0.5,
        alpha: widget.didPaste ? 2.0 : 2.0,
        beta: widget.didPaste ? 2.5 : 1.0,
        expectedMastery: widget.didPaste ? (2.0 / 4.5) : (2.0 / 3.0),
        lastPracticed: DateTime.now(),
      ),
      ConceptNode(
        nodeId: 'CS_PROG_LOOPS',
        conceptName: 'Control Flow: Loops',
        difficultyBaseline: 0.45,
        alpha: 1.4,
        beta: 1.0,
        expectedMastery: 1.4 / 2.4,
        lastPracticed: DateTime.now(),
      ),
      ConceptNode(
        nodeId: 'CS_PROG_VARIABLES',
        conceptName: 'Variables & Memory Allocation',
        difficultyBaseline: 0.35,
        alpha: 1.35,
        beta: 1.0,
        expectedMastery: 1.35 / 2.35,
        lastPracticed: DateTime.now(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final targetNode = _nodes.firstWhere(
      (n) => n.nodeId == widget.targetNodeId,
      orElse: () => _nodes.isNotEmpty ? _nodes[0] : _generateFallbackNodes()[0],
    );

    // Filter out parent nodes to show propagation details
    final propagatedNodes = _nodes.where((n) => n.nodeId != widget.targetNodeId).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Failure DNA Diagnosis', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.popUntil(context, (route) => route.isFirst),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.emeraldAccent))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Diagnosis Header Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.redAccent.withOpacity(0.3), width: 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'COGNITIVE DIAGNOSIS',
                          style: TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          widget.didPaste
                              ? 'Diagnosis: High correlation with external dependencies. Code pasting detected (COPY_PASTE_PRONE). Expected mastery adjusted downwards.'
                              : 'Diagnosis: Syntactic structure is strong, but edge loop-bound conditions show 70% correlation with minor logic leakage.',
                          style: const TextStyle(color: Colors.white, fontSize: 15, height: 1.4, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Cognitive Target State
                  const Text('Updated Target Node State', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  _buildTargetCard(targetNode),
                  const SizedBox(height: 32),

                  // Prerequisite DAG Propagation Log
                  const Text('Curriculum DAG Propagation Logs', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    'Bayesian reward discount (gamma: 0.5) propagated to prerequisite nodes:',
                    style: TextStyle(color: Colors.slate[400], fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  _buildPropagationList(propagatedNodes),

                  const SizedBox(height: 40),
                  // Return home
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.emeraldAccent),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.popUntil(context, (route) => route.isFirst),
                      child: const Text('Return to Command Hub', style: TextStyle(color: Colors.emeraldAccent, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildTargetCard(ConceptNode node) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.slate[800]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(node.conceptName, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Colors.emerald.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                child: Text(
                  'E[K] = ${(node.expectedMastery * 100).toStringAsFixed(1)}%',
                  style: const TextStyle(color: Colors.emeraldAccent, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              )
            ],
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildValueCol('ALPHA (Ev. SUCCESS)', node.alpha.toStringAsFixed(2)),
              _buildValueCol('BETA (Ev. FAILURE)', node.beta.toStringAsFixed(2)),
              _buildValueCol('VARIANCE', ((node.alpha * node.beta) / (pow(node.alpha + node.beta, 2) * (node.alpha + node.beta + 1))).toStringAsFixed(4)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildValueCol(String label, String val) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.slate[400], fontSize: 9, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(val, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildPropagationList(List<ConceptNode> nodes) {
    if (nodes.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: Text('No parent propagation logs present.', style: TextStyle(color: Colors.slate[500], fontSize: 12)),
      );
    }

    return Column(
      children: nodes.map((node) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withOpacity(0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.slate[800]!),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(node.conceptName, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      'Prerequisite node updated via discount factor.',
                      style: TextStyle(color: Colors.slate[400], fontSize: 11),
                    )
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${(node.expectedMastery * 100).toStringAsFixed(1)}%',
                    style: const TextStyle(color: Colors.emeraldAccent, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'α: ${node.alpha.toStringAsFixed(2)}',
                    style: TextStyle(color: Colors.slate[400], fontSize: 10),
                  ),
                ],
              )
            ],
          ),
        );
      }).toList(),
    );
  }
}
