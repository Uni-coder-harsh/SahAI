import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookOpen, TrendingUp, AlertTriangle, Play, HelpCircle, Check, X, ArrowRight } from 'lucide-react';

export default function DashboardScreen({ user, onTabChange }) {
  const [cognitiveState, setCognitiveState] = useState([]);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Practice Modal State
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  const loadDashboardData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const [stateRes, practiceRes] = await Promise.all([
        api.fetchCognitiveState(user.id),
        api.fetchPracticeQuestions(user.id)
      ]);
      setCognitiveState(stateRes);
      setPracticeQuestions(practiceRes);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load dashboard parameters.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user.id]);

  // Handle Practice popup timer
  useEffect(() => {
    if (activeQuestion && !submissionResult) {
      setTimer(0);
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) clearInterval(timerInterval);
    }
  }, [activeQuestion, submissionResult]);

  const handleOpenPractice = (question) => {
    setActiveQuestion(question);
    setSelectedOptionId('');
    setSubmissionResult(null);
    setTimer(0);
  };

  const handleClosePractice = () => {
    setActiveQuestion(null);
    setSelectedOptionId('');
    setSubmissionResult(null);
    // Reload state after practice completes to reflect Bayesian updates
    loadDashboardData(true);
  };

  const handleSubmitPractice = async () => {
    if (!selectedOptionId || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.submitAnswer({
        user_id: user.id,
        question_id: activeQuestion.id,
        option_id: selectedOptionId,
        time_spent_seconds: timer
      });
      setSubmissionResult(res);
      
      // Save attempt to local wrong responses if incorrect (for failure report)
      if (!res.success) {
        const localFailures = JSON.parse(localStorage.getItem(`failures_${user.id}`) || '[]');
        const exists = localFailures.some(f => f.question_id === activeQuestion.id);
        if (!exists) {
          const chosenOptText = activeQuestion.options.find(o => o.id === selectedOptionId)?.option_text || '';
          const correctOptText = activeQuestion.options.find(o => o.id === res.correct_option_id)?.option_text || '';
          const failureObj = {
            id: activeQuestion.id,
            question_id: activeQuestion.id,
            question_text: activeQuestion.question_text,
            chosen_option_letter: activeQuestion.options.find(o => o.id === selectedOptionId)?.option_letter || '',
            chosen_option_text: chosenOptText,
            correct_option_letter: activeQuestion.options.find(o => o.id === res.correct_option_id)?.option_letter || '',
            correct_option_text: correctOptText,
            misconceptions: res.misconceptions_detected || [],
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(`failures_${user.id}`, JSON.stringify([failureObj, ...localFailures]));
        }
      }
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Calculate Aggregates
  const totalConcepts = cognitiveState.length;
  const avgMastery = totalConcepts > 0 
    ? (cognitiveState.reduce((sum, n) => sum + parseFloat(n.expected_mastery), 0) / totalConcepts) * 100
    : 0;

  // Filter Weakest Concepts (mastery < 0.45 or lowest 5 nodes)
  const weakNodes = [...cognitiveState]
    .sort((a, b) => parseFloat(a.expected_mastery) - parseFloat(b.expected_mastery))
    .slice(0, 5);

  return (
    <div className="animate-fade-in">
      {/* Upper Dashboard Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome, {user.name || user.username}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Academic Stream: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{user.academic_stream || 'B.Tech CSE'}</span> | Semester {user.current_semester || 1}</p>
        </div>
        {refreshing && (
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500 }} className="badge">
            Syncing Bayesian variables...
          </span>
        )}
      </div>

      {error && (
        <div className="badge-error" style={{ display: 'flex', padding: '12px', borderRadius: '10px', marginBottom: '24px' }}>
          <AlertTriangle size={18} style={{ marginRight: '8px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Mastery Indicator */}
        <div className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={30} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Expected Mastery</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{avgMastery.toFixed(1)}%</div>
          </div>
        </div>

        {/* Total Nodes */}
        <div className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={30} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Nodes</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalConcepts}</div>
          </div>
        </div>

        {/* Weak Nodes Count */}
        <div className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={30} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Focus Areas</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {cognitiveState.filter(n => parseFloat(n.expected_mastery) < 0.45).length}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Practice Recommendations */}
        <div className="glass-card">
          <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Recommended Practice Sprints</h3>
          </div>
          <div className="glass-card-body" style={{ marginTop: '16px' }}>
            {practiceQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <p>No recommended questions. Try executing a mock build or view the Skill Mesh.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {practiceQuestions.map((q) => (
                  <div
                    key={q.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}
                  >
                    <div style={{ flex: 1, paddingRight: '16px' }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {q.question_text}
                      </p>
                      <span className={`badge ${parseFloat(q.difficulty_level) > 0.6 ? 'badge-error' : parseFloat(q.difficulty_level) > 0.35 ? 'badge-warning' : 'badge-success'}`}>
                        Difficulty: {parseFloat(q.difficulty_level).toFixed(2)}
                      </span>
                    </div>
                    <button className="btn btn-accent" onClick={() => handleOpenPractice(q)} style={{ height: '40px', padding: '0 16px', flexShrink: 0 }}>
                      <Play size={14} fill="currentColor" />
                      <span>Start</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Focus Subtopics */}
        <div className="glass-card">
          <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Weakest Concept Areas</h3>
          </div>
          <div className="glass-card-body" style={{ marginTop: '16px' }}>
            {weakNodes.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No weak concepts. Keep learning!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {weakNodes.map((node) => (
                  <div key={node.node_id} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{node.concept_name}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--error)' }}>{(parseFloat(node.expected_mastery) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${parseFloat(node.expected_mastery) * 100}%`, height: '100%', background: 'var(--error)', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-secondary" onClick={() => onTabChange('skill_mesh')} style={{ width: '100%', marginTop: '24px', height: '44px' }}>
              <span>View Full Skill Mesh</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Practice Question Modal popup */}
      {activeQuestion && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Practice Question</h3>
              </div>
              <button
                onClick={handleClosePractice}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="glass-card-body" style={{ marginTop: '20px' }}>
              {!submissionResult ? (
                <div className="mcq-container">
                  <p className="mcq-question">{activeQuestion.question_text}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    {activeQuestion.options && activeQuestion.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`mcq-option ${selectedOptionId === opt.id ? 'selected' : ''}`}
                        onClick={() => setSelectedOptionId(opt.id)}
                      >
                        <div className="option-badge">{opt.option_letter}</div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>{opt.option_text}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Timer: <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>{timer}s</span></span>
                    <button
                      className="btn btn-primary"
                      disabled={!selectedOptionId || submitting}
                      onClick={handleSubmitPractice}
                    >
                      {submitting ? 'Verifying...' : 'Submit Answer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', background: submissionResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: submissionResult.success ? 'var(--success)' : 'var(--error)', marginBottom: '20px' }}>
                    {submissionResult.success ? <Check size={32} /> : <X size={32} />}
                  </div>

                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
                    {submissionResult.success ? 'Correct Answer!' : 'Incorrect Answer'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
                    {submissionResult.message || (submissionResult.success ? 'Your mathematical mastery scores have improved!' : 'Your belief states have updated.')}
                  </p>

                  <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Inference Updates</h4>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                      <strong>Concepts evaluated:</strong> {submissionResult.concepts_evaluated?.join(', ') || 'N/A'}
                    </p>
                    {submissionResult.misconceptions_detected?.length > 0 && (
                      <p style={{ fontSize: '0.95rem', color: 'var(--error)' }}>
                        <strong>Misconceptions detected:</strong> {submissionResult.misconceptions_detected.join(', ')}
                      </p>
                    )}
                  </div>

                  <button className="btn btn-secondary" style={{ width: '100%', height: '44px' }} onClick={handleClosePractice}>
                    Close & Sync
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
