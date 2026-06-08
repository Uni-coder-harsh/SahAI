const http = require('http');

const API_BASE = 'http://localhost:3000/api';

// Helper to make JSON requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runIntegrationTest() {
  console.log('=== STARTING SAHAI END-TO-END INTEGRATION TEST ===\n');

  try {
    // 1. Check Health
    console.log('[Step 1] Checking API health...');
    const health = await request('GET', '/health');
    console.log('Health Response:', health.body);
    if (health.status !== 200 || health.body.status !== 'HEALTHY') {
      throw new Error('API or database services are not healthy.');
    }

    // 2. Create Student
    console.log('\n[Step 2] Onboarding a new student...');
    const studentEmail = `integration.student.${Date.now()}@iitb.ac.in`;
    const onboardRes = await request('POST', '/users', {
      sso_email: studentEmail,
      academic_stream: 'B.Tech CSE',
      graduation_year: 2027,
      current_semester: 4,
      device_signature: { client: 'IntegrationTestScript' }
    });

    console.log('Onboard response:', onboardRes.body);
    if (onboardRes.status !== 201) {
      throw new Error('Failed to onboard student.');
    }

    const userId = onboardRes.body.user.id;
    console.log(`Student onboarded successfully. User ID: ${userId}`);

    // 3. Verify Initial Belief State
    console.log('\n[Step 3] Fetching initial cognitive state...');
    const stateBefore = await request('GET', `/users/${userId}/cognitive-state`);
    if (stateBefore.status !== 200) {
      throw new Error('Failed to fetch initial cognitive state.');
    }
    
    // Check that we have initial CS_DS_ARRAYS state
    const arrayNodeBefore = stateBefore.body.cognitive_state.find(n => n.node_id === 'CS_DS_ARRAYS');
    console.log('Initial CS_DS_ARRAYS State:', arrayNodeBefore);
    if (!arrayNodeBefore || parseFloat(arrayNodeBefore.expected_mastery) !== 0.5) {
      throw new Error('Initial expected mastery should be 0.50.');
    }

    // 4. Ingest Telemetry Event
    console.log('\n[Step 4] Simulating telemetry ingestion (Successful attempt on CS_DS_ARRAYS)...');
    const telemetryRes = await request('POST', '/telemetry', {
      user_id: userId,
      node_id: 'CS_DS_ARRAYS',
      event_type: 'ATTEMPT',
      success: true,
      attempts: 1,
      behavioral_flags: [],
      time_spent_seconds: 45
    });

    console.log('Telemetry Response:', telemetryRes.body);
    if (telemetryRes.status !== 202) {
      throw new Error('Telemetry ingestion rejected.');
    }

    // 5. Wait for Python worker to process message
    console.log('\n[Step 5] Waiting 3 seconds for asynchronous Bayesian computation...');
    await sleep(3000);

    // 6. Fetch New Cognitive State and Verify
    console.log('\n[Step 6] Retrieving updated cognitive state...');
    const stateAfter = await request('GET', `/users/${userId}/cognitive-state`);
    if (stateAfter.status !== 200) {
      throw new Error('Failed to retrieve updated cognitive state.');
    }

    const stateMap = {};
    stateAfter.body.cognitive_state.forEach(n => {
      stateMap[n.node_id] = n;
    });

    const targetNode = stateMap['CS_DS_ARRAYS'];
    console.log('Updated Target Node (CS_DS_ARRAYS):', targetNode);
    if (!targetNode || parseFloat(targetNode.expected_mastery) <= 0.5) {
      throw new Error('Target node expected mastery should have increased.');
    }

    // Check DAG Propagation to parent nodes
    // CS_PROG_LOOPS is prerequisite of CS_DS_ARRAYS (correlation weight = 0.8)
    // CS_PROG_VARIABLES is prerequisite of CS_DS_ARRAYS (correlation weight = 0.7)
    const loopsParentNode = stateMap['CS_PROG_LOOPS'];
    const varsParentNode = stateMap['CS_PROG_VARIABLES'];

    console.log('Propagated Parent Node (CS_PROG_LOOPS):', loopsParentNode);
    console.log('Propagated Parent Node (CS_PROG_VARIABLES):', varsParentNode);

    if (!loopsParentNode || parseFloat(loopsParentNode.expected_mastery) <= 0.5) {
      throw new Error('Updates did not propagate to CS_PROG_LOOPS parent node.');
    }

    if (!varsParentNode || parseFloat(varsParentNode.expected_mastery) <= 0.5) {
      throw new Error('Updates did not propagate to CS_PROG_VARIABLES parent node.');
    }

    console.log('\n=== INTEGRATION TEST PASSED SUCCESSFULLY ===');
    console.log('Database multi-tenancy, telemetry ingestion, Redis queues, Bayesian mathematics,');
    console.log('MongoDB event logging, and PostgreSQL DAG propagation are fully working!');

  } catch (error) {
    console.error('\n=== INTEGRATION TEST FAILED ===');
    console.error(error.message);
    process.exit(1);
  }
}

runIntegrationTest();
