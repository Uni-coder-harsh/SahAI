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

-- Seed Python Subtopics as Concept Nodes
INSERT INTO concept_nodes (node_id, domain, concept_name, difficulty_baseline) VALUES
('CS_PY_SYNTAX', 'CS', 'Python Syntax & Semantics', 0.2000),
('CS_PY_VARIABLES', 'CS', 'Variables & Memory Allocation', 0.2500),
('CS_PY_CONDITIONALS', 'CS', 'Control Flow: Conditionals', 0.3500),
('CS_PY_LOOPS', 'CS', 'Control Flow: Loops', 0.4500),
('CS_PY_FUNCTIONS', 'CS', 'Functions & Variable Scope', 0.5000),
('CS_PY_LISTS_DICTS', 'CS', 'Lists, Dictionaries & Sets', 0.5500),
('CS_PY_OOPS', 'CS', 'Object Oriented Programming (OOP)', 0.7500),
('CS_PY_EXCEPTIONS', 'CS', 'Exception Handling (Try-Except)', 0.6000),
('CS_PY_FILE_IO', 'CS', 'File Inputs & Outputs', 0.6500),
('CS_PY_LIBRARIES', 'CS', 'Modules, Packages & Imports', 0.5000)
ON CONFLICT (node_id) DO NOTHING;

-- Seed Python Subtopic DAG Correlations (Prerequisites & Inference)
INSERT INTO advanced_dag_edges (source_node, target_node, context_domain, edge_type, correlation_weight) VALUES
('CS_PY_SYNTAX', 'CS_PY_VARIABLES', 'CS', 'PREREQUISITE', 0.8500),
('CS_PY_SYNTAX', 'CS_PY_CONDITIONALS', 'CS', 'PREREQUISITE', 0.7000),
('CS_PY_VARIABLES', 'CS_PY_CONDITIONALS', 'CS', 'PREREQUISITE', 0.7500),
('CS_PY_CONDITIONALS', 'CS_PY_LOOPS', 'CS', 'PREREQUISITE', 0.8000),
('CS_PY_VARIABLES', 'CS_PY_LISTS_DICTS', 'CS', 'PREREQUISITE', 0.8500),
('CS_PY_LOOPS', 'CS_PY_LISTS_DICTS', 'CS', 'PREREQUISITE', 0.7800),
('CS_PY_FUNCTIONS', 'CS_PY_OOPS', 'CS', 'PREREQUISITE', 0.8200),
('CS_PY_SYNTAX', 'CS_PY_FUNCTIONS', 'CS', 'PREREQUISITE', 0.8000),
('CS_PY_OOPS', 'CS_PY_EXCEPTIONS', 'CS', 'DIAGNOSTIC_INFERENCE', 0.6500),
('CS_PY_FILE_IO', 'CS_PY_EXCEPTIONS', 'CS', 'DIAGNOSTIC_INFERENCE', 0.7000),
('CS_PY_FUNCTIONS', 'CS_PY_FILE_IO', 'CS', 'PREREQUISITE', 0.6000),
('CS_PY_SYNTAX', 'CS_PY_LIBRARIES', 'CS', 'PREREQUISITE', 0.5000),
('CS_PY_VARIABLES', 'CS_PY_OOPS', 'CS', 'DIAGNOSTIC_INFERENCE', 0.6000),
('CS_PY_LOOPS', 'CS_PY_OOPS', 'CS', 'DIAGNOSTIC_INFERENCE', 0.5500),
('CS_PY_FUNCTIONS', 'CS_PY_LIBRARIES', 'CS', 'PREREQUISITE', 0.7500)
ON CONFLICT (source_node, target_node, context_domain) DO NOTHING;

-- Question Bank Schema Setup
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY,
    question_text TEXT NOT NULL,
    correct_option_id UUID,                 -- Set as foreign key after options table
    difficulty_level DECIMAL(5,4) NOT NULL, -- 0.1 (easy) to 1.0 (hard)
    expected_time INT DEFAULT 60,           -- in seconds
    is_initial_test BOOLEAN DEFAULT FALSE,   -- diagnostic test question
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS options (
    id UUID PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_letter CHAR(1) NOT NULL,         -- 'A', 'B', 'C', 'D'
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complete circular foreign key reference
ALTER TABLE questions 
DROP CONSTRAINT IF EXISTS fk_correct_option;

ALTER TABLE questions
ADD CONSTRAINT fk_correct_option 
FOREIGN KEY (correct_option_id) REFERENCES options(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS question_concept_links (
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    node_id VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    weight DECIMAL(5,4) NOT NULL,           -- How strongly correct answer represents concept mastery
    PRIMARY KEY (question_id, node_id)
);

CREATE TABLE IF NOT EXISTS option_concept_misconceptions (
    option_id UUID REFERENCES options(id) ON DELETE CASCADE,
    node_id VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    weight DECIMAL(5,4) NOT NULL,           -- Weight of misunderstanding this concept if chosen
    PRIMARY KEY (option_id, node_id)
);

-- Seed 20 MCQ Questions (10 Initial Test, 10 Practice)
-- Initial Test Questions (1-10)
INSERT INTO questions (id, question_text, difficulty_level, expected_time, is_initial_test) VALUES
('e0000001-0000-0000-0000-000000000000', 'What is the output of print(2 ** 3) in Python?', 0.2000, 30, TRUE),
('e0000002-0000-0000-0000-000000000000', 'In Python, if a = [1, 2] and b = a, what happens to b when you call a.append(3)?', 0.4000, 45, TRUE),
('e0000003-0000-0000-0000-000000000000', 'What is the output of: x = 10; y = 20; print("y is larger" if y > x else "x is larger")', 0.3500, 30, TRUE),
('e0000004-0000-0000-0000-000000000000', 'How many times will this loop print hello? x = 0; while x < 5: print("hello"); x += 2', 0.4500, 45, TRUE),
('e0000005-0000-0000-0000-000000000000', 'What is the output of this code? x = 5; def func(): x = 10; func(); print(x)', 0.5000, 45, TRUE),
('e0000006-0000-0000-0000-000000000000', 'If d = {"a": 1, "b": 2}, what is the output of d.get("c", 3)?', 0.3000, 30, TRUE),
('e0000007-0000-0000-0000-000000000000', 'Which keyword is used to represent the current instance of a class in Python method definitions?', 0.5500, 30, TRUE),
('e0000008-0000-0000-0000-000000000000', 'Which block in a Python try-except statement is executed regardless of whether an exception is raised?', 0.6000, 30, TRUE),
('e0000009-0000-0000-0000-000000000000', 'What is the primary benefit of opening a file using the with statement in Python?', 0.4000, 40, TRUE),
('e0000010-0000-0000-0000-000000000000', 'Which function is used to import a module dynamically by name as a string?', 0.7000, 60, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Options for Initial Test Questions
INSERT INTO options (id, question_id, option_letter, option_text) VALUES
-- Q1 Options
('e0000001-a000-0000-0000-000000000000', 'e0000001-0000-0000-0000-000000000000', 'A', '6'),
('e0000001-b000-0000-0000-000000000000', 'e0000001-0000-0000-0000-000000000000', 'B', '8'), -- Correct
('e0000001-c000-0000-0000-000000000000', 'e0000001-0000-0000-0000-000000000000', 'C', '9'),
('e0000001-d000-0000-0000-000000000000', 'e0000001-0000-0000-0000-000000000000', 'D', '5'),
-- Q2 Options
('e0000002-a000-0000-0000-000000000000', 'e0000002-0000-0000-0000-000000000000', 'A', 'b remains [1, 2]'),
('e0000002-b000-0000-0000-000000000000', 'e0000002-0000-0000-0000-000000000000', 'B', 'b becomes [1, 2, 3]'), -- Correct
('e0000002-c000-0000-0000-000000000000', 'e0000002-0000-0000-0000-000000000000', 'C', 'b becomes [1, 2, [3]]'),
('e0000002-d000-0000-0000-000000000000', 'e0000002-0000-0000-0000-000000000000', 'D', 'Raises AttributeError'),
-- Q3 Options
('e0000003-a000-0000-0000-000000000000', 'e0000003-0000-0000-0000-000000000000', 'A', 'x is larger'),
('e0000003-b000-0000-0000-000000000000', 'e0000003-0000-0000-0000-000000000000', 'B', 'y is larger'), -- Correct
('e0000003-c000-0000-0000-000000000000', 'e0000003-0000-0000-0000-000000000000', 'C', 'None'),
('e0000003-d000-0000-0000-000000000000', 'e0000003-0000-0000-0000-000000000000', 'D', 'SyntaxError'),
-- Q4 Options
('e0000004-a000-0000-0000-000000000000', 'e0000004-0000-0000-0000-000000000000', 'A', '2'),
('e0000004-b000-0000-0000-000000000000', 'e0000004-0000-0000-0000-000000000000', 'B', '3'), -- Correct
('e0000004-c000-0000-0000-000000000000', 'e0000004-0000-0000-0000-000000000000', 'C', '5'),
('e0000004-d000-0000-0000-000000000000', 'e0000004-0000-0000-0000-000000000000', 'D', 'Infinite'),
-- Q5 Options
('e0000005-a000-0000-0000-000000000000', 'e0000005-0000-0000-0000-000000000000', 'A', '10'),
('e0000005-b000-0000-0000-000000000000', 'e0000005-0000-0000-0000-000000000000', 'B', '5'), -- Correct
('e0000005-c000-0000-0000-000000000000', 'e0000005-0000-0000-0000-000000000000', 'C', 'NameError'),
('e0000005-d000-0000-0000-000000000000', 'e0000005-0000-0000-0000-000000000000', 'D', 'None'),
-- Q6 Options
('e0000006-a000-0000-0000-000000000000', 'e0000006-0000-0000-0000-000000000000', 'A', 'KeyError'),
('e0000006-b000-0000-0000-000000000000', 'e0000006-0000-0000-0000-000000000000', 'B', '3'), -- Correct
('e0000006-c000-0000-0000-000000000000', 'e0000006-0000-0000-0000-000000000000', 'C', 'None'),
('e0000006-d000-0000-0000-000000000000', 'e0000006-0000-0000-0000-000000000000', 'D', '1'),
-- Q7 Options
('e0000007-a000-0000-0000-000000000000', 'e0000007-0000-0000-0000-000000000000', 'A', 'this'),
('e0000007-b000-0000-0000-000000000000', 'e0000007-0000-0000-0000-000000000000', 'B', 'self'), -- Correct
('e0000007-c000-0000-0000-000000000000', 'e0000007-0000-0000-0000-000000000000', 'C', 'instance'),
('e0000007-d000-0000-0000-000000000000', 'e0000007-0000-0000-0000-000000000000', 'D', 'cls'),
-- Q8 Options
('e0000008-a000-0000-0000-000000000000', 'e0000008-0000-0000-0000-000000000000', 'A', 'except'),
('e0000008-b000-0000-0000-000000000000', 'e0000008-0000-0000-0000-000000000000', 'B', 'else'),
('e0000008-c000-0000-0000-000000000000', 'e0000008-0000-0000-0000-000000000000', 'C', 'finally'), -- Correct
('e0000008-d000-0000-0000-000000000000', 'e0000008-0000-0000-0000-000000000000', 'D', 'catch'),
-- Q9 Options
('e0000009-a000-0000-0000-000000000000', 'e0000009-0000-0000-0000-000000000000', 'A', 'It automatically closes the file'), -- Correct
('e0000009-b000-0000-0000-000000000000', 'e0000009-0000-0000-0000-000000000000', 'B', 'It runs faster'),
('e0000009-c000-0000-0000-000000000000', 'e0000009-0000-0000-0000-000000000000', 'C', 'It locks the file'),
('e0000009-d000-0000-0000-000000000000', 'e0000009-0000-0000-0000-000000000000', 'D', 'It hides errors'),
-- Q10 Options
('e0000010-a000-0000-0000-000000000000', 'e0000010-0000-0000-0000-000000000000', 'A', 'import()'),
('e0000010-b000-0000-0000-000000000000', 'e0000010-0000-0000-0000-000000000000', 'B', '__import__()'), -- Correct
('e0000010-c000-0000-0000-000000000000', 'e0000010-0000-0000-0000-000000000000', 'C', 'load()'),
('e0000010-d000-0000-0000-000000000000', 'e0000010-0000-0000-0000-000000000000', 'D', 'require()')
ON CONFLICT (id) DO NOTHING;

-- Update questions with correct answers
UPDATE questions SET correct_option_id = 'e0000001-b000-0000-0000-000000000000' WHERE id = 'e0000001-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000002-b000-0000-0000-000000000000' WHERE id = 'e0000002-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000003-b000-0000-0000-000000000000' WHERE id = 'e0000003-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000004-b000-0000-0000-000000000000' WHERE id = 'e0000004-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000005-b000-0000-0000-000000000000' WHERE id = 'e0000005-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000006-b000-0000-0000-000000000000' WHERE id = 'e0000006-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000007-b000-0000-0000-000000000000' WHERE id = 'e0000007-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000008-c000-0000-0000-000000000000' WHERE id = 'e0000008-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000009-a000-0000-0000-000000000000' WHERE id = 'e0000009-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000010-b000-0000-0000-000000000000' WHERE id = 'e0000010-0000-0000-0000-000000000000';

-- Question to Concept Links (Initial Test)
INSERT INTO question_concept_links (question_id, node_id, weight) VALUES
('e0000001-0000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.9500),
('e0000001-0000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.2000),
('e0000002-0000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.9000),
('e0000002-0000-0000-0000-000000000000', 'CS_PY_LISTS_DICTS', 0.6000),
('e0000003-0000-0000-0000-000000000000', 'CS_PY_CONDITIONALS', 0.9500),
('e0000003-0000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.3000),
('e0000004-0000-0000-0000-000000000000', 'CS_PY_LOOPS', 0.9000),
('e0000004-0000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.3000),
('e0000005-0000-0000-0000-000000000000', 'CS_PY_FUNCTIONS', 0.9500),
('e0000005-0000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.5000),
('e0000006-0000-0000-0000-000000000000', 'CS_PY_LISTS_DICTS', 0.9500),
('e0000006-0000-0000-0000-000000000000', 'CS_PY_CONDITIONALS', 0.2000),
('e0000007-0000-0000-0000-000000000000', 'CS_PY_OOPS', 0.9500),
('e0000007-0000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.2000),
('e0000008-0000-0000-0000-000000000000', 'CS_PY_EXCEPTIONS', 0.9500),
('e0000008-0000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.2000),
('e0000009-0000-0000-0000-000000000000', 'CS_PY_FILE_IO', 0.9500),
('e0000009-0000-0000-0000-000000000000', 'CS_PY_EXCEPTIONS', 0.4000),
('e0000010-0000-0000-0000-000000000000', 'CS_PY_LIBRARIES', 0.9500),
('e0000010-0000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.3000)
ON CONFLICT (question_id, node_id) DO NOTHING;

-- Option Misconception Links (Initial Test)
INSERT INTO option_concept_misconceptions (option_id, node_id, weight) VALUES
-- Q1: option A (6) represents confusing exponentiation with multiplication (Syntax issue)
('e0000001-a000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.8000),
-- Q2: option A (b remains [1,2]) represents misunderstanding variable references / list mutability
('e0000002-a000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.8500),
('e0000002-a000-0000-0000-000000000000', 'CS_PY_LISTS_DICTS', 0.5000),
-- Q3: option D (SyntaxError) shows lack of ternary syntax understanding
('e0000003-d000-0000-0000-000000000000', 'CS_PY_CONDITIONALS', 0.7500),
('e0000003-d000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.6000),
-- Q4: option D (Infinite) represents not tracing loop termination condition correctly
('e0000004-d000-0000-0000-000000000000', 'CS_PY_LOOPS', 0.8000),
-- Q5: option A (10) represents misunderstanding variable scope inside functions (Local vs Global)
('e0000005-a000-0000-0000-000000000000', 'CS_PY_FUNCTIONS', 0.9000),
('e0000005-a000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.4000),
-- Q7: option A (this) represents confusing python OOPS with Java OOPS
('e0000007-a000-0000-0000-000000000000', 'CS_PY_OOPS', 0.7000),
-- Q8: option B (else) represents misunderstanding control flow of exceptions
('e0000008-b000-0000-0000-000000000000', 'CS_PY_EXCEPTIONS', 0.8000)
ON CONFLICT (option_id, node_id) DO NOTHING;


-- Practice Questions (11-20)
INSERT INTO questions (id, question_text, difficulty_level, expected_time, is_initial_test) VALUES
('e0000011-0000-0000-0000-000000000000', 'Which of the following is NOT a valid variable name (identifier) in Python?', 0.2500, 30, FALSE),
('e0000012-0000-0000-0000-000000000000', 'What is the type of the value returned by the expression 10 / 2 in Python?', 0.3000, 30, FALSE),
('e0000013-0000-0000-0000-000000000000', 'What will be printed by this statement: x = True; y = False; print(x or y and not x)', 0.4500, 40, FALSE),
('e0000014-0000-0000-0000-000000000000', 'What is the output of: print([i for i in range(3) if i % 2 == 0])?', 0.5000, 45, FALSE),
('e0000015-0000-0000-0000-000000000000', 'What value is returned by a Python function that has no explicit return statement?', 0.3500, 30, FALSE),
('e0000016-0000-0000-0000-000000000000', 'How do you slice a list lst to obtain all elements except for the first element?', 0.4000, 30, FALSE),
('e0000017-0000-0000-0000-000000000000', 'How do you call the constructor (__init__) of a parent class in a Python child class?', 0.6500, 45, FALSE),
('e0000018-0000-0000-0000-000000000000', 'What built-in exception is raised when you divide a number by zero in Python?', 0.3000, 30, FALSE),
('e0000019-0000-0000-0000-000000000000', 'Which mode string should you use with open() to open a file for writing and append content to the end?', 0.4500, 30, FALSE),
('e0000020-0000-0000-0000-000000000000', 'How do you import only the sqrt function from the math module in Python?', 0.3500, 30, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Options for Practice Questions
INSERT INTO options (id, question_id, option_letter, option_text) VALUES
-- Q11 Options
('e0000011-a000-0000-0000-000000000000', 'e0000011-0000-0000-0000-000000000000', 'A', '_var'),
('e0000011-b000-0000-0000-000000000000', 'e0000011-0000-0000-0000-000000000000', 'B', 'var_1'),
('e0000011-c000-0000-0000-000000000000', 'e0000011-0000-0000-0000-000000000000', 'C', '1_var'), -- Correct
('e0000011-d000-0000-0000-000000000000', 'e0000011-0000-0000-0000-000000000000', 'D', 'var'),
-- Q12 Options
('e0000012-a000-0000-0000-000000000000', 'e0000012-0000-0000-0000-000000000000', 'A', 'int'),
('e0000012-b000-0000-0000-000000000000', 'e0000012-0000-0000-0000-000000000000', 'B', 'float'), -- Correct
('e0000012-c000-0000-0000-000000000000', 'e0000012-0000-0000-0000-000000000000', 'C', 'double'),
('e0000012-d000-0000-0000-000000000000', 'e0000012-0000-0000-0000-000000000000', 'D', 'decimal'),
-- Q13 Options
('e0000013-a000-0000-0000-000000000000', 'e0000013-0000-0000-0000-000000000000', 'A', 'True'), -- Correct
('e0000013-b000-0000-0000-000000000000', 'e0000013-0000-0000-0000-000000000000', 'B', 'False'),
('e0000013-c000-0000-0000-000000000000', 'e0000013-0000-0000-0000-000000000000', 'C', 'None'),
('e0000013-d000-0000-0000-000000000000', 'e0000013-0000-0000-0000-000000000000', 'D', 'SyntaxError'),
-- Q14 Options
('e0000014-a000-0000-0000-000000000000', 'e0000014-0000-0000-0000-000000000000', 'A', '[0, 2]'), -- Correct
('e0000014-b000-0000-0000-000000000000', 'e0000014-0000-0000-0000-000000000000', 'B', '[0, 1, 2]'),
('e0000014-c000-0000-0000-000000000000', 'e0000014-0000-0000-0000-000000000000', 'C', '[2]'),
('e0000014-d000-0000-0000-000000000000', 'e0000014-0000-0000-0000-000000000000', 'D', '[1]'),
-- Q15 Options
('e0000015-a000-0000-0000-000000000000', 'e0000015-0000-0000-0000-000000000000', 'A', '0'),
('e0000015-b000-0000-0000-000000000000', 'e0000015-0000-0000-0000-000000000000', 'B', 'None'), -- Correct
('e0000015-c000-0000-0000-000000000000', 'e0000015-0000-0000-0000-000000000000', 'C', 'False'),
('e0000015-d000-0000-0000-000000000000', 'e0000015-0000-0000-0000-000000000000', 'D', 'void'),
-- Q16 Options
('e0000016-a000-0000-0000-000000000000', 'e0000016-0000-0000-0000-000000000000', 'A', 'lst[0]'),
('e0000016-b000-0000-0000-000000000000', 'e0000016-0000-0000-0000-000000000000', 'B', 'lst[1:]'), -- Correct
('e0000016-c000-0000-0000-000000000000', 'e0000016-0000-0000-0000-000000000000', 'C', 'lst[:-1]'),
('e0000016-d000-0000-0000-000000000000', 'e0000016-0000-0000-0000-000000000000', 'D', 'lst[1:-1]'),
-- Q17 Options
('e0000017-a000-0000-0000-000000000000', 'e0000017-0000-0000-0000-000000000000', 'A', 'super().__init__()'), -- Correct
('e0000017-b000-0000-0000-000000000000', 'e0000017-0000-0000-0000-000000000000', 'B', 'parent().__init__()'),
('e0000017-c000-0000-0000-000000000000', 'e0000017-0000-0000-0000-000000000000', 'C', 'this.__init__()'),
('e0000017-d000-0000-0000-000000000000', 'e0000017-0000-0000-0000-000000000000', 'D', 'base().__init__()'),
-- Q18 Options
('e0000018-a000-0000-0000-000000000000', 'e0000018-0000-0000-0000-000000000000', 'A', 'ZeroDivisionError'), -- Correct
('e0000018-b000-0000-0000-000000000000', 'e0000018-0000-0000-0000-000000000000', 'B', 'ArithmeticError'),
('e0000018-c000-0000-0000-000000000000', 'e0000018-0000-0000-0000-000000000000', 'C', 'DivisionByZeroException'),
('e0000018-d000-0000-0000-000000000000', 'e0000018-0000-0000-0000-000000000000', 'D', 'ValueError'),
-- Q19 Options
('e0000019-a000-0000-0000-000000000000', 'e0000019-0000-0000-0000-000000000000', 'A', '"w"'),
('e0000019-b000-0000-0000-000000000000', 'e0000019-0000-0000-0000-000000000000', 'B', '"a"'), -- Correct
('e0000019-c000-0000-0000-000000000000', 'e0000019-0000-0000-0000-000000000000', 'C', '"r"'),
('e0000019-d000-0000-0000-000000000000', 'e0000019-0000-0000-0000-000000000000', 'D', '"x"'),
-- Q20 Options
('e0000020-a000-0000-0000-000000000000', 'e0000020-0000-0000-0000-000000000000', 'A', 'import sqrt from math'),
('e0000020-b000-0000-0000-000000000000', 'e0000020-0000-0000-0000-000000000000', 'B', 'from math import sqrt'), -- Correct
('e0000020-c000-0000-0000-000000000000', 'e0000020-0000-0000-0000-000000000000', 'C', 'import math.sqrt'),
('e0000020-d000-0000-0000-000000000000', 'e0000020-0000-0000-0000-000000000000', 'D', 'from math use sqrt')
ON CONFLICT (id) DO NOTHING;

-- Update practice questions with correct answers
UPDATE questions SET correct_option_id = 'e0000011-c000-0000-0000-000000000000' WHERE id = 'e0000011-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000012-b000-0000-0000-000000000000' WHERE id = 'e0000012-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000013-a000-0000-0000-000000000000' WHERE id = 'e0000013-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000014-a000-0000-0000-000000000000' WHERE id = 'e0000014-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000015-b000-0000-0000-000000000000' WHERE id = 'e0000015-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000016-b000-0000-0000-000000000000' WHERE id = 'e0000016-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000017-a000-0000-0000-000000000000' WHERE id = 'e0000017-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000018-a000-0000-0000-000000000000' WHERE id = 'e0000018-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000019-b000-0000-0000-000000000000' WHERE id = 'e0000019-0000-0000-0000-000000000000';
UPDATE questions SET correct_option_id = 'e0000020-b000-0000-0000-000000000000' WHERE id = 'e0000020-0000-0000-0000-000000000000';

-- Question to Concept Links (Practice)
INSERT INTO question_concept_links (question_id, node_id, weight) VALUES
('e0000011-0000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.9500),
('e0000012-0000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.9500),
('e0000012-0000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.4000),
('e0000013-0000-0000-0000-000000000000', 'CS_PY_CONDITIONALS', 0.9500),
('e0000014-0000-0000-0000-000000000000', 'CS_PY_LOOPS', 0.8000),
('e0000014-0000-0000-0000-000000000000', 'CS_PY_LISTS_DICTS', 0.8000),
('e0000015-0000-0000-0000-000000000000', 'CS_PY_FUNCTIONS', 0.9500),
('e0000016-0000-0000-0000-000000000000', 'CS_PY_LISTS_DICTS', 0.9500),
('e0000017-0000-0000-0000-000000000000', 'CS_PY_OOPS', 0.9500),
('e0000018-0000-0000-0000-000000000000', 'CS_PY_EXCEPTIONS', 0.9500),
('e0000019-0000-0000-0000-000000000000', 'CS_PY_FILE_IO', 0.9500),
('e0000020-0000-0000-0000-000000000000', 'CS_PY_LIBRARIES', 0.9500)
ON CONFLICT (question_id, node_id) DO NOTHING;

-- Option Misconception Links (Practice)
INSERT INTO option_concept_misconceptions (option_id, node_id, weight) VALUES
-- Q11: option D represents not knowing basic variable naming limits
('e0000011-d000-0000-0000-000000000000', 'CS_PY_SYNTAX', 0.5000),
-- Q12: option A (int) represents confusing division return types (classic Python 3 float division detail)
('e0000012-a000-0000-0000-000000000000', 'CS_PY_VARIABLES', 0.8000),
-- Q17: option C (this) represents confusing with Java/JS OOP
('e0000017-c000-0000-0000-000000000000', 'CS_PY_OOPS', 0.8000),
-- Q17: option D (base) represents confusing with C# OOP
('e0000017-d000-0000-0000-000000000000', 'CS_PY_OOPS', 0.6000)
ON CONFLICT (option_id, node_id) DO NOTHING;

