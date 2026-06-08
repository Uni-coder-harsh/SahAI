# Flutter Client Integration Guide (SahAI)

This directory serves as the template/stub for the Flutter client (`sahai-client-flutter`). It provides the Dart models, HTTP service layer, and visualization blueprints to link the UI directly to our Node.js API Gateway.

---

## 📦 Dart Data Models

These models serialize data fetched from the API and map directly to the PostgreSQL/MongoDB cognitive states.

### 1. Concept Node Model (`concept_node.dart`)
```dart
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
      nodeId: json['node_id'],
      conceptName: json['concept_name'],
      difficultyBaseline: double.parse(json['difficulty_baseline'].toString()),
      alpha: double.parse(json['alpha'].toString()),
      beta: double.parse(json['beta'].toString()),
      expectedMastery: double.parse(json['expected_mastery'].toString()),
      lastPracticed: DateTime.parse(json['last_practiced']),
    );
  }
}
```

### 2. DAG Edge Model (`dag_edge.dart`)
```dart
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
      sourceNode: json['source_node'],
      targetNode: json['target_node'],
      edgeType: json['edge_type'],
      correlationWeight: double.parse(json['correlation_weight'].toString()),
    );
  }
}
```

---

## 🌐 HTTP Telemetry Service (`telemetry_service.dart`)

This class sends telemetry events asynchronously to the Node.js backend.

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class TelemetryService {
  static const String baseUrl = 'http://localhost:3000/api';

  // Ingests student behavioral telemetry (asynchronous queue backend)
  Future<bool> sendTelemetry({
    required String userId,
    required String nodeId,
    required String eventType, // 'ATTEMPT', 'RUN', 'OCR'
    required bool success,
    required int attempts,
    required String codeSnippet,
    required List<String> behavioralFlags, // e.g. ['COPY_PASTE_PRONE']
    required int timeSpentSeconds,
  }) async {
    final url = Uri.parse('$baseUrl/telemetry');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': userId,
          'node_id': nodeId,
          'event_type': eventType,
          'success': success,
          'attempts': attempts,
          'code_snippet': codeSnippet,
          'behavioral_flags': behavioralFlags,
          'time_spent_seconds': timeSpentSeconds,
        }),
      );
      
      // Node.js API returns 202 Accepted for queue buffer
      return response.statusCode == 202;
    } catch (e) {
      print('Telemetry transmission error: $e');
      return false;
    }
  }

  // Fetch current cognitive mastery levels for the student
  Future<List<ConceptNode>> fetchCognitiveState(String userId) async {
    final url = Uri.parse('$baseUrl/users/$userId/cognitive-state');
    final response = await http.get(url);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List list = data['cognitive_state'];
      return list.map((item) => ConceptNode.fromJson(item)).toList();
    } else {
      throw Exception('Failed to load cognitive state');
    }
  }
}
```

---

## 🎨 Skill Mesh Rendering (Flutter UI)

To draw the interactive, physics-based network graph:
1. Add the package `graphview` to `pubspec.yaml`:
```yaml
dependencies:
  graphview: ^1.2.0
```
2. Render nodes with dynamic colors representing expected mastery:
   - **Green:** Expected Mastery $\ge 0.75$
   - **Yellow/Orange:** Expected Mastery $0.50 \le E[K] < 0.75$
   - **Red:** Expected Mastery $< 0.50$
