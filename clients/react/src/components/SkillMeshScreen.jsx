import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Network, Award, Zap, HelpCircle } from 'lucide-react';

const CATEGORY_NAMES = {
  PY_SYNTAX: "Basic Syntax",
  PY_DATA: "Data Types & Operators",
  PY_STRING: "Strings & Regex",
  PY_CONTROL: "Control Flow",
  PY_LIST: "Lists",
  PY_TUPLE: "Tuples",
  PY_DICT: "Dictionaries",
  PY_SET: "Sets",
  PY_FUNC: "Functions",
  PY_SCOPE: "Scope & Closures",
  PY_MODULE: "Modules",
  PY_FILE: "File I/O",
  PY_EXC: "Exceptions",
  PY_OOP: "OOP Principles",
  PY_ITER: "Iterators & Gen",
  PY_FP: "Functional Programming",
  PY_TYPE: "Type System",
  PY_CONC: "Concurrency",
  PY_MEMORY: "Memory Management",
  PY_ADV: "Advanced Features"
};

export default function SkillMeshScreen({ user }) {
  const [curriculum, setCurriculum] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const data = await api.fetchCurriculum('CS', user.id);
        setCurriculum(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch skill mesh.');
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, [user.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // 1. Group the raw nodes by their category prefixes
  const groups = {};
  curriculum.nodes.forEach(node => {
    const prefix = node.node_id.split('_').slice(0, 2).join('_');
    if (!groups[prefix]) {
      groups[prefix] = {
        id: prefix,
        name: CATEGORY_NAMES[prefix] || prefix,
        nodes: [],
        avgMastery: 0,
        avgAlpha: 0,
        avgBeta: 0,
        avgDiff: 0
      };
    }
    groups[prefix].nodes.push(node);
  });

  // Calculate averages for each group
  Object.keys(groups).forEach(key => {
    const g = groups[key];
    const len = g.nodes.length;
    const totalMastery = g.nodes.reduce((sum, n) => sum + parseFloat(n.expected_mastery || 0.5), 0);
    const totalAlpha = g.nodes.reduce((sum, n) => sum + parseFloat(n.alpha || 2.0), 0);
    const totalBeta = g.nodes.reduce((sum, n) => sum + parseFloat(n.beta || 2.0), 0);
    const totalDiff = g.nodes.reduce((sum, n) => sum + parseFloat(n.difficulty_baseline || 0.5), 0);
    
    g.avgMastery = totalMastery / len;
    g.avgAlpha = totalAlpha / len;
    g.avgBeta = totalBeta / len;
    g.avgDiff = totalDiff / len;
  });

  const groupList = Object.values(groups);

  // 2. Position group nodes in a gorgeous circle
  const width = 800;
  const height = 550;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = 300;
  const radiusY = 200;

  const groupCoords = {};
  groupList.forEach((g, idx) => {
    const angle = (idx / groupList.length) * 2 * Math.PI - Math.PI / 2;
    groupCoords[g.id] = {
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle)
    };
  });

  // 3. Resolve group edges (edges between categories)
  const groupEdges = [];
  const edgeSeen = new Set();

  curriculum.edges.forEach(edge => {
    const srcGroup = edge.source_node.split('_').slice(0, 2).join('_');
    const tgtGroup = edge.target_node.split('_').slice(0, 2).join('_');

    if (srcGroup !== tgtGroup && groups[srcGroup] && groups[tgtGroup]) {
      const key = `${srcGroup}->${tgtGroup}`;
      if (!edgeSeen.has(key)) {
        edgeSeen.add(key);
        groupEdges.push({
          source: srcGroup,
          target: tgtGroup,
          weight: parseFloat(edge.correlation_weight || 0.5)
        });
      }
    }
  });

  const getMasteryColor = (mastery) => {
    if (mastery > 0.7) return '#10b981'; // Green
    if (mastery > 0.45) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network style={{ color: 'var(--primary)' }} />
            <span>Curriculum Skill Mesh</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real-time visualization of subtopic mastery and prerequisite Bayesian dependencies. Click nodes to view metadata.
          </p>
        </div>
      </div>

      {error && (
        <div className="badge-error" style={{ display: 'flex', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* SVG Skill Mesh Canvas */}
        <div className="skill-mesh-container">
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
            {/* Defs for gradients/glowing filters */}
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Draw Prerequisite Edges */}
            {groupEdges.map((edge, idx) => {
              const start = groupCoords[edge.source];
              const end = groupCoords[edge.target];
              if (!start || !end) return null;
              
              return (
                <line
                  key={`edge-${idx}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="url(#edgeGrad)"
                  strokeWidth={2 + edge.weight * 2}
                  className="skill-mesh-edge"
                  style={{
                    animationDuration: `${30 - edge.weight * 20}s`
                  }}
                />
              );
            })}

            {/* Draw Category Nodes */}
            {groupList.map((g) => {
              const coord = groupCoords[g.id];
              const color = getMasteryColor(g.avgMastery);
              const isSelected = selectedGroup?.id === g.id;

              return (
                <g
                  key={g.id}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  className="skill-mesh-node"
                  onClick={() => setSelectedGroup(g)}
                >
                  {/* Glowing halo for selected node */}
                  {isSelected && (
                    <circle r="26" fill="none" stroke="var(--primary)" strokeWidth="3" opacity="0.8" />
                  )}
                  {/* Core circle */}
                  <circle
                    r="18"
                    fill="#1e1b4b"
                    stroke={color}
                    strokeWidth="3"
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                  />
                  {/* Label background for legibility */}
                  <rect
                    x="-65"
                    y="24"
                    width="130"
                    height="18"
                    rx="4"
                    fill="rgba(10, 10, 12, 0.85)"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  {/* Shortened Label */}
                  <text
                    y="36"
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize="9px"
                    fontWeight="600"
                    fontFamily="var(--font-sans)"
                  >
                    {g.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Concept Group Inspector */}
        <div className="glass-card" style={{ height: '550px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {selectedGroup ? (
            <div style={{ overflowY: 'auto' }}>
              <div className="glass-card-header" style={{ marginBottom: '16px' }}>
                <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Category Info</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedGroup.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: {selectedGroup.id}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {/* Mastery Indicator Card */}
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Avg Mastery</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: getMasteryColor(selectedGroup.avgMastery) }}>
                    {(selectedGroup.avgMastery * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Mathematical distribution info */}
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Bayesian Belief Distribution</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>α (Successes)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedGroup.avgAlpha.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>β (Failures)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedGroup.avgBeta.toFixed(2)}</span>
                  </div>
                </div>

                {/* Difficulty Baseline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>Baseline Difficulty:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedGroup.avgDiff.toFixed(2)}</span>
                </div>

                {/* Count of sub-concepts */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Subconcepts Checked</h4>
                  <ul style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '0.875rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {selectedGroup.nodes.map((node) => (
                      <li key={node.node_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <span style={{ color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }} title={node.concept_name}>{node.concept_name}</span>
                        <span style={{ color: getMasteryColor(parseFloat(node.expected_mastery)), fontWeight: 600 }}>{(parseFloat(node.expected_mastery) * 100).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              <HelpCircle size={40} style={{ marginBottom: '16px', strokeWidth: 1.5 }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>No Category Selected</h3>
              <p style={{ fontSize: '0.85rem' }}>Select any circular subtopic node on the left graph to audit its cognitive beliefs and details.</p>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Strong (>70%)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Developing</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Critical (&lt;45%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
