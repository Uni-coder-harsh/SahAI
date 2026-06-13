-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. B2B2C Institutional Multi-Tenancy
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain_suffix VARCHAR(100) UNIQUE,     -- e.g., 'cuk.ac.in', 'iitb.ac.in'
    tier_classification VARCHAR(50),       -- 'Tier-1', 'Tier-2', 'Tier-3', 'Rural'
    region VARCHAR(100),
    state VARCHAR(100),
    active_subscription BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Profiles & Academic Metadata
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    username VARCHAR(100) UNIQUE,
    name VARCHAR(255),
    sso_email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone_number VARCHAR(100),             -- Encrypted at rest in production
    academic_stream VARCHAR(100),          -- e.g., 'B.Tech CSE', 'BA LLB'
    current_semester INT,                  -- e.g., 4
    graduation_year INT,                   -- e.g., 2027
    current_cgpa DECIMAL(3,2),
    state_of_residence VARCHAR(100),
    primary_language VARCHAR(50) DEFAULT 'en',
    device_signature JSONB,                -- Hardware specs for UI optimization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Advanced Domain-Specific DAG (Curriculum Nodes)
CREATE TABLE IF NOT EXISTS concept_nodes (
    node_id VARCHAR(100) PRIMARY KEY,      -- e.g., 'CS_DS_ARRAY', 'CS_TOC_AUTOMATA'
    domain VARCHAR(50) NOT NULL,           -- 'CS', 'LAW', 'ARTS'
    concept_name VARCHAR(255) NOT NULL,
    vector_embedding VECTOR(1024),         -- 1024-dimensional embeddings
    difficulty_baseline DECIMAL(5,4) DEFAULT 0.5000
);

-- 4. Advanced DAG Edges (with correlation weights context-specific)
CREATE TABLE IF NOT EXISTS advanced_dag_edges (
    source_node VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    target_node VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    context_domain VARCHAR(50) NOT NULL,   -- e.g. 'CS'
    edge_type VARCHAR(50),                 -- 'PREREQUISITE', 'DIAGNOSTIC_INFERENCE'
    correlation_weight DECIMAL(5,4) NOT NULL,
    w_pre DECIMAL(5,4) DEFAULT 0.0000,
    w_diag DECIMAL(5,4) DEFAULT 0.0000,
    PRIMARY KEY (source_node, target_node, context_domain)
);

-- 5. Student Cognitive State Cache (Belief State parameters)
CREATE TABLE IF NOT EXISTS user_cognitive_states (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    alpha DECIMAL(10, 4) DEFAULT 2.0,
    beta DECIMAL(10, 4) DEFAULT 2.0,
    expected_mastery DECIMAL(5, 4) DEFAULT 0.5000,
    last_practiced TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, node_id)
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_user ON user_cognitive_states(user_id);

-- ==========================================
-- SEED DATA SETUP
-- ==========================================

-- 6. Student Question Performance Logs
CREATE TABLE IF NOT EXISTS user_question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_id UUID REFERENCES options(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

