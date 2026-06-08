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
    sso_email VARCHAR(255) UNIQUE NOT NULL,
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
    PRIMARY KEY (source_node, target_node, context_domain)
);

-- 5. Student Cognitive State Cache (Belief State parameters)
CREATE TABLE IF NOT EXISTS user_cognitive_states (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    alpha DECIMAL(10, 4) DEFAULT 1.0,
    beta DECIMAL(10, 4) DEFAULT 1.0,
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

-- Seed Institutions
INSERT INTO institutions (id, name, domain_suffix, tier_classification, region, state) VALUES
('b3c7b2fa-90f7-4a0b-8d07-8bc8a9b23b1a', 'Indian Institute of Technology, Bombay', 'iitb.ac.in', 'Tier-1', 'West', 'Maharashtra'),
('c4c8b3fb-90f8-4b0c-8d08-8bc8a9b23b1b', 'Central University of Karnataka', 'cuk.ac.in', 'Tier-2', 'South', 'Karnataka')
ON CONFLICT (domain_suffix) DO NOTHING;

-- Seed Users
INSERT INTO users (id, institution_id, sso_email, phone_number, academic_stream, current_semester, graduation_year, current_cgpa, state_of_residence, primary_language) VALUES
('d5d9c4fc-90f9-4c0d-8d09-8bc8a9b23b1c', 'b3c7b2fa-90f7-4a0b-8d07-8bc8a9b23b1a', 'student@iitb.ac.in', 'ENC_9999999999', 'B.Tech CSE', 4, 2027, 8.75, 'Maharashtra', 'en'),
('e6ead5fd-90fa-4d0e-8d0a-8bc8a9b23b1d', 'c4c8b3fb-90f8-4b0c-8d08-8bc8a9b23b1b', 'student@cuk.ac.in', 'ENC_8888888888', 'B.Tech CSE', 4, 2027, 7.80, 'Karnataka', 'kn')
ON CONFLICT (sso_email) DO NOTHING;

-- Seed Concept Nodes (15-Node Computer Science Core)
-- Note: Embeddings are initialized as 1024-dimension zero vectors for seed structure
INSERT INTO concept_nodes (node_id, domain, concept_name, difficulty_baseline) VALUES
-- Programming Basics (Root Nodes)
('CS_PROG_SYNTAX', 'CS', 'Programming Syntax & Semantics', 0.3000),
('CS_PROG_VARIABLES', 'CS', 'Variables & Memory Allocation', 0.3500),
('CS_PROG_CONDITIONALS', 'CS', 'Control Flow: Conditionals', 0.4000),
('CS_PROG_LOOPS', 'CS', 'Control Flow: Loops', 0.4500),
-- Data Structures (Intermediate Nodes)
('CS_DS_ARRAYS', 'CS', 'Arrays & Lists', 0.5000),
('CS_DS_LINKED_LISTS', 'CS', 'Linked Lists', 0.6000),
('CS_DS_STACKS_QUEUES', 'CS', 'Stacks & Queues', 0.5500),
('CS_DS_TREES', 'CS', 'Binary Trees & BSTs', 0.7500),
('CS_DS_GRAPHS', 'CS', 'Graph Representations', 0.8500),
-- Algorithms (Advanced Nodes)
('CS_ALG_SEARCHING', 'CS', 'Binary & Linear Search', 0.5000),
('CS_ALG_SORTING', 'CS', 'Sorting Algorithms (Quick/Merge)', 0.6500),
('CS_ALG_RECURSION', 'CS', 'Recursion & Backtracking', 0.7800),
('CS_ALG_DYNAMIC_PROG', 'CS', 'Dynamic Programming', 0.9000),
-- Database Systems (Sub-Domain)
('CS_DBMS_RELATIONAL', 'CS', 'Relational Model', 0.5500),
('CS_DBMS_NORMALIZATION', 'CS', 'Normalization & Normal Forms', 0.7000)
ON CONFLICT (node_id) DO NOTHING;

-- Seed Advanced DAG Edges
INSERT INTO advanced_dag_edges (source_node, target_node, context_domain, edge_type, correlation_weight) VALUES
-- Syntax -> Variables
('CS_PROG_SYNTAX', 'CS_PROG_VARIABLES', 'CS', 'PREREQUISITE', 0.9000),
-- Variables -> Conditionals
('CS_PROG_VARIABLES', 'CS_PROG_CONDITIONALS', 'CS', 'PREREQUISITE', 0.8500),
-- Conditionals -> Loops
('CS_PROG_CONDITIONALS', 'CS_PROG_LOOPS', 'CS', 'PREREQUISITE', 0.8500),
-- Loops & Variables -> Arrays
('CS_PROG_LOOPS', 'CS_DS_ARRAYS', 'CS', 'PREREQUISITE', 0.8000),
('CS_PROG_VARIABLES', 'CS_DS_ARRAYS', 'CS', 'PREREQUISITE', 0.7000),
-- Arrays -> Linked Lists
('CS_DS_ARRAYS', 'CS_DS_LINKED_LISTS', 'CS', 'DIAGNOSTIC_INFERENCE', 0.6500),
-- Arrays -> Stacks & Queues
('CS_DS_ARRAYS', 'CS_DS_STACKS_QUEUES', 'CS', 'PREREQUISITE', 0.7500),
-- Linked Lists & Stacks -> Trees
('CS_DS_LINKED_LISTS', 'CS_DS_TREES', 'CS', 'PREREQUISITE', 0.8000),
('CS_DS_STACKS_QUEUES', 'CS_DS_TREES', 'CS', 'DIAGNOSTIC_INFERENCE', 0.5000),
-- Trees -> Graphs
('CS_DS_TREES', 'CS_DS_GRAPHS', 'CS', 'PREREQUISITE', 0.8500),
-- Arrays & Loops -> Searching
('CS_DS_ARRAYS', 'CS_ALG_SEARCHING', 'CS', 'PREREQUISITE', 0.7500),
-- Searching -> Sorting
('CS_ALG_SEARCHING', 'CS_ALG_SORTING', 'CS', 'DIAGNOSTIC_INFERENCE', 0.7000),
-- Recursion -> Trees
('CS_ALG_RECURSION', 'CS_DS_TREES', 'CS', 'PREREQUISITE', 0.7500),
-- Recursion -> Dynamic Programming
('CS_ALG_RECURSION', 'CS_ALG_DYNAMIC_PROG', 'CS', 'PREREQUISITE', 0.9000),
-- Relational -> Normalization
('CS_DBMS_RELATIONAL', 'CS_DBMS_NORMALIZATION', 'CS', 'PREREQUISITE', 0.8500)
ON CONFLICT (source_node, target_node, context_domain) DO NOTHING;
