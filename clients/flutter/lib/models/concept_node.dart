class ConceptNode {
  final String nodeId;
  final String conceptName;
  final double difficultyBaseline;
  final double alpha;
  final double beta;
  final double expectedMastery;
  final DateTime lastPracticed;

  ConceptNode({
    required this.nodeId,
    required this.conceptName,
    required this.difficultyBaseline,
    required this.alpha,
    required this.beta,
    required this.expectedMastery,
    required this.lastPracticed,
  });

  factory ConceptNode.fromJson(Map<String, dynamic> json) {
    return ConceptNode(
      nodeId: json['node_id'] ?? '',
      conceptName: json['concept_name'] ?? '',
      difficultyBaseline: double.parse((json['difficulty_baseline'] ?? 0.5).toString()),
      alpha: double.parse((json['alpha'] ?? 1.0).toString()),
      beta: double.parse((json['beta'] ?? 1.0).toString()),
      expectedMastery: double.parse((json['expected_mastery'] ?? 0.5).toString()),
      lastPracticed: json['last_practiced'] != null 
          ? DateTime.parse(json['last_practiced']) 
          : DateTime.now(),
    );
  }
}
