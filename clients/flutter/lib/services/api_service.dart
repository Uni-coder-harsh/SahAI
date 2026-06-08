import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/concept_node.dart';
import '../models/dag_edge.dart';

class ApiService {
  // Configured to map to local running Node.js server
  static const String baseUrl = 'http://localhost:3000/api';

  /// Register student and initialize Gaussian belief priors
  Future<Map<String, dynamic>> onboardUser({
    required String email,
    required String academicStream,
    int semester = 1,
    int gradYear = 2027,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/users'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'sso_email': email,
        'academic_stream': academicStream,
        'current_semester': semester,
        'graduation_year': gradYear,
        'device_signature': {'client': 'FlutterApp', 'os': 'Linux'}
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Onboarding failed: ${response.body}');
    }
  }

  /// Retrieve current cognitive parameters (alpha, beta, mastery)
  Future<List<ConceptNode>> fetchCognitiveState(String userId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/users/$userId/cognitive-state'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List list = data['cognitive_state'] ?? [];
      return list.map((item) => ConceptNode.fromJson(item)).toList();
    } else {
      throw Exception('Failed to fetch cognitive state: ${response.body}');
    }
  }

  /// Load concepts and edges for graph visualization
  Future<Map<String, dynamic>> fetchCurriculum(String domain) async {
    final response = await http.get(
      Uri.parse('$baseUrl/curriculum/$domain'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List rawNodes = data['nodes'] ?? [];
      final List rawEdges = data['edges'] ?? [];
      
      return {
        'nodes': rawNodes.map((n) => ConceptNode.fromJson(n)).toList(),
        'edges': rawEdges.map((e) => DagEdge.fromJson(e)).toList(),
      };
    } else {
      throw Exception('Failed to retrieve curriculum: ${response.body}');
    }
  }

  /// EnqueueTelemetry packet in Redis queue (asynchronous mathematical updating)
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
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/telemetry'),
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
      return response.statusCode == 202; // 202 Accepted
    } catch (e) {
      print('[ApiService] Connection error during telemetry transmission: $e');
      return false;
    }
  }
}
