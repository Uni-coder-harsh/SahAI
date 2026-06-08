class DagEdge {
  final String sourceNode;
  final String targetNode;
  final String edgeType;
  final double correlationWeight;

  DagEdge({
    required this.sourceNode,
    required this.targetNode,
    required this.edgeType,
    required this.correlationWeight,
  });

  factory DagEdge.fromJson(Map<String, dynamic> json) {
    return DagEdge(
      sourceNode: json['source_node'] ?? '',
      targetNode: json['target_node'] ?? '',
      edgeType: json['edge_type'] ?? '',
      correlationWeight: double.parse((json['correlation_weight'] ?? 0.0).toString()),
    );
  }
}
