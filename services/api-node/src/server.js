const express = require('express');
const cors = require('cors');
const config = require('./config');
const { pgPool, connectMongo, getMongoDb } = require('./db');
const { publishTelemetry } = require('./producer');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Healthcheck Endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check PG Connection
    const pgRes = await pgPool.query('SELECT NOW()');
    
    // Check Mongo Connection
    const mongoDb = getMongoDb();
    const mongoRes = await mongoDb.command({ ping: 1 });
    
    res.json({
      status: 'HEALTHY',
      postgres: pgRes.rows[0].now ? 'CONNECTED' : 'DOWN',
      mongodb: mongoRes.ok ? 'CONNECTED' : 'DOWN',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'UNHEALTHY',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// 2. Onboard User & Initialize Prior Belief State
app.post('/api/users', async (req, res) => {
  const {
    sso_email,
    phone_number,
    academic_stream,
    current_semester,
    graduation_year,
    current_cgpa,
    state_of_residence,
    primary_language,
    institution_id,
    device_signature
  } = req.body;

  if (!sso_email || !academic_stream) {
    return res.status(400).json({ error: 'SSO Email and Academic Stream are required.' });
  }

  // Determine domain (e.g. CS from B.Tech CSE)
  let domain = 'CS';
  if (academic_stream.toLowerCase().includes('law')) {
    domain = 'LAW';
  } else if (academic_stream.toLowerCase().includes('arts')) {
    domain = 'ARTS';
  }

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // Create User record
    const userQuery = `
      INSERT INTO users (
        institution_id, sso_email, phone_number, academic_stream,
        current_semester, graduation_year, current_cgpa,
        state_of_residence, primary_language, device_signature
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, sso_email, academic_stream;
    `;
    const userVal = [
      institution_id || null, sso_email, phone_number || null, academic_stream,
      current_semester || 1, graduation_year || 2027, current_cgpa || null,
      state_of_residence || null, primary_language || 'en', JSON.stringify(device_signature || {})
    ];
    
    const userRes = await client.query(userQuery, userVal);
    const user = userRes.rows[0];

    // Fetch curriculum concept nodes for the domain
    const conceptsRes = await client.query(
      'SELECT node_id FROM concept_nodes WHERE domain = $1',
      [domain]
    );

    // Bootstrap Gaussian priors (alpha: 1.0, beta: 1.0, mastery: 0.5) for each concept
    if (conceptsRes.rows.length > 0) {
      const stateQueries = conceptsRes.rows.map(concept => {
        return client.query(`
          INSERT INTO user_cognitive_states (user_id, node_id, alpha, beta, expected_mastery)
          VALUES ($1, $2, 1.0, 1.0, 0.5000)
          ON CONFLICT (user_id, node_id) DO NOTHING;
        `, [user.id, concept.node_id]);
      });
      await Promise.all(stateQueries);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'User created and cognitive state initialized.',
      user: {
        id: user.id,
        email: user.sso_email,
        stream: user.academic_stream,
        domain
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during onboarding:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  } finally {
    client.release();
  }
});

// 3. Get User Cognitive State (for Skill Mesh)
app.get('/api/users/:user_id/cognitive-state', async (req, res) => {
  const { user_id } = req.params;

  try {
    const stateQuery = `
      SELECT ucs.node_id, cn.concept_name, cn.difficulty_baseline, 
             ucs.alpha, ucs.beta, ucs.expected_mastery, ucs.last_practiced
      FROM user_cognitive_states ucs
      JOIN concept_nodes cn ON ucs.node_id = cn.node_id
      WHERE ucs.user_id = $1
      ORDER BY ucs.expected_mastery DESC;
    `;
    const stateRes = await pgPool.query(stateQuery, [user_id]);

    if (stateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cognitive state not found for this user.' });
    }

    res.json({
      user_id,
      cognitive_state: stateRes.rows
    });
  } catch (error) {
    console.error('Error fetching cognitive state:', error);
    res.status(500).json({ error: 'Failed to retrieve cognitive state', details: error.message });
  }
});

// 4. Telemetry Ingestion (Event Sourcing to Mongo -> Queue to Redis)
app.post('/api/telemetry', async (req, res) => {
  const {
    user_id,
    node_id,
    event_type, // 'RUN', 'ATTEMPT', 'OCR', etc.
    success,
    attempts,
    code_snippet,
    behavioral_flags, // e.g. ["COPY_PASTE_PRONE", "SYNTAX_HESITANT"]
    time_spent_seconds
  } = req.body;

  if (!user_id || !node_id || !event_type) {
    return res.status(400).json({ error: 'user_id, node_id, and event_type are required.' });
  }

  try {
    const rawEvent = {
      event_id: crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID(),
      user_id,
      node_id,
      event_type,
      success: success !== undefined ? success : false,
      attempts: attempts || 1,
      code_snippet: code_snippet || null,
      behavioral_flags: behavioral_flags || [],
      time_spent_seconds: time_spent_seconds || 0,
      timestamp: new Date()
    };

    // Store in MongoDB (High-Velocity Event Logging)
    const mongoDb = getMongoDb();
    await mongoDb.collection('telemetry_raw').insertOne(rawEvent);

    // Push payload metadata onto Redis Queue for asynchronous processing
    await publishTelemetry(rawEvent);

    res.status(202).json({
      message: 'Telemetry event ingested successfully.',
      event_id: rawEvent.event_id
    });
  } catch (error) {
    console.error('Error ingesting telemetry:', error);
    res.status(500).json({ error: 'Failed to ingest telemetry', details: error.message });
  }
});

// 5. Get Curriculum Nodes and Edges (DAG topology)
app.get('/api/curriculum/:domain', async (req, res) => {
  const { domain } = req.params;

  try {
    // Fetch nodes
    const nodesQuery = 'SELECT node_id, concept_name, difficulty_baseline FROM concept_nodes WHERE domain = $1';
    const nodesRes = await pgPool.query(nodesQuery, [domain.toUpperCase()]);

    // Fetch edges
    const edgesQuery = 'SELECT source_node, target_node, edge_type, correlation_weight FROM advanced_dag_edges WHERE context_domain = $1';
    const edgesRes = await pgPool.query(edgesQuery, [domain.toUpperCase()]);

    res.json({
      domain: domain.toUpperCase(),
      nodes: nodesRes.rows,
      edges: edgesRes.rows
    });
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    res.status(500).json({ error: 'Failed to retrieve curriculum', details: error.message });
  }
});

// Bootstrap Server & DB Connections
async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongo();

    // Start listening
    app.listen(config.PORT, () => {
      console.log(`Node.js API Server running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Node.js API server:', error);
    process.exit(1);
  }
}

// Only run server if not imported by testing scripts
if (require.main === module) {
  startServer();
}

module.exports = app;
