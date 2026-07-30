# tests/test_gemma_orchestration.py
import os
import sys
import json

# Add engine path
sys.path.append(os.path.abspath("services/engine-python/src"))

from models.gemma_orchestrator import run_orchestration_loop

if __name__ == "__main__":
    print("=== TESTING SAHAI GEMMA 4 REASONING ORCHESTRATOR ===")
    
    mock_user_id = "3ad0e2a6-1e06-494f-b8d0-cc697d7bdbaa"
    mock_node_id = "PY_FUNC_10"
    mock_code = "def calculate_sum(items):\n    for i in items:\n        total = 0\n        total += i\n    return total"
    
    print(f"\n[Test 1] Executing Agentic Code Diagnosis for user {mock_user_id}...")
    result = run_orchestration_loop(
        user_id=mock_user_id,
        node_id=mock_node_id,
        prompt_context=f"Student submitted code:\n{mock_code}\nIt returns incorrect results for lists longer than 1 item."
    )
    
    print("\n--- Gemma Orchestrator Final JSON Output ---")
    print(json.dumps(result, indent=2))
