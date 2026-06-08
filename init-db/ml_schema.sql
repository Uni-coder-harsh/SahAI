-- Global learned correlations between concept nodes (computed by ML model)
CREATE TABLE IF NOT EXISTS concept_correlations (
    source_node VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    target_node VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    correlation_coefficient DECIMAL(5, 4) DEFAULT 0.0000,
    sample_size INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (source_node, target_node)
);

-- Individual-specific skill correlations (student-specific cognitive linkage profiles)
CREATE TABLE IF NOT EXISTS user_concept_correlations (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_node VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    target_node VARCHAR(100) REFERENCES concept_nodes(node_id) ON DELETE CASCADE,
    correlation_weight DECIMAL(5, 4) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, source_node, target_node)
);

-- Indexing for high-speed individual mesh traversal
CREATE INDEX IF NOT EXISTS idx_user_concept_corr ON user_concept_correlations(user_id);
