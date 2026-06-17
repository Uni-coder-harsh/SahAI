import React, { useState, useEffect } from 'react';
import { AlertOctagon, HelpCircle, CornerDownRight, CheckCircle2, Lightbulb, Trash2 } from 'lucide-react';

export default function FailureReportScreen({ user }) {
  const [failures, setFailures] = useState([]);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem(`failures_${user.id}`) || '[]');
    setFailures(list);
  }, [user.id]);

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear your local failure history logs?')) {
      localStorage.removeItem(`failures_${user.id}`);
      setFailures([]);
    }
  };

  const getRemedialTip = (misconceptionId) => {
    // Return friendly advice based on typical misconceptions
    const tips = {
      PY_SYNTAX_INDENT: "Always use exactly 4 spaces (or 1 tab) consistently for nested blocks. Mixing spaces and tabs triggers Python compilation errors.",
      PY_STRING_BOUNDS: "Python sequence indices are 0-based. Slicing with [start:end] includes the start index but excludes the end index.",
      PY_LIST_MUTABILITY: "Lists are mutable. Modifying a list in place (e.g. .append() or .sort()) returns None, rather than returning a new list.",
      PY_CONTROL_FLOW: "In loops, 'break' immediately exits the loop block, while 'continue' skips the rest of the current iteration and goes to the next.",
      PY_TUPLE_IMMUTABLE: "Tuples cannot be modified after creation. Attempting to assign elements like t[0] = x will raise a TypeError.",
      PY_DICT_KEYS: "Dictionary keys must be hashable immutable types (like strings, numbers, or tuples). Mutable objects like lists cannot be keys."
    };
    // Match prefix or exact misconception ID
    const matchKey = Object.keys(tips).find(key => misconceptionId.includes(key)) || '';
    return tips[matchKey] || "Review the basic definitions of this concept. Focus on coding sprints and execute similar examples in the Sandbox.";
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertOctagon style={{ color: 'var(--error)' }} />
            <span>Diagnostic Failure Logs</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review incorrect submissions and misconceptions logged during practice sprints.</p>
        </div>

        {failures.length > 0 && (
          <button className="btn btn-secondary" onClick={handleClearLogs} style={{ height: '40px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
            <Trash2 size={16} />
            <span>Clear Logs</span>
          </button>
        )}
      </div>

      {failures.length === 0 ? (
        <div className="glass-card animate-fade-in" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Clean Study Slate!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto' }}>
            You have no incorrect question records logged. Solve some recommended practice questions on the Dashboard to test your concepts.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {failures.map((fail, idx) => (
            <div key={`${fail.id}-${idx}`} className="glass-card">
              <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span className="badge badge-error">Concept Misconception Audited</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged: {new Date(fail.timestamp).toLocaleDateString()}</span>
              </div>

              <div className="glass-card-body">
                {/* Question Text */}
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <HelpCircle size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                  <span>{fail.question_text}</span>
                </h3>

                {/* Performance comparisons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '28px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem', color: 'var(--error)' }}>
                    <X size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Your Answer:</strong> Option {fail.chosen_option_letter}) {fail.chosen_option_text}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem', color: 'var(--success)' }}>
                    <CornerDownRight size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Correct Solution:</strong> Option {fail.correct_option_letter}) {fail.correct_option_text}</span>
                  </div>
                </div>

                {/* Misconceptions audit details */}
                {fail.misconceptions && fail.misconceptions.length > 0 && (
                  <div style={{ marginLeft: '28px', padding: '16px', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertOctagon size={14} /> Registered Misconceptions
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {fail.misconceptions.map((m) => (
                        <span key={m} className="badge badge-error" style={{ background: 'rgba(239, 68, 68, 0.08)', fontSize: '0.75rem' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remedial Advice */}
                <div style={{ marginLeft: '28px', padding: '16px', background: 'rgba(20, 184, 166, 0.03)', borderRadius: '12px', border: '1px solid rgba(20, 184, 166, 0.15)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Lightbulb size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Remedial Tip</h5>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {fail.misconceptions && fail.misconceptions.length > 0
                        ? getRemedialTip(fail.misconceptions[0])
                        : getRemedialTip('')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
