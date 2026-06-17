import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Check, ShieldAlert, Award, ArrowRight, Hourglass, BarChart2 } from 'lucide-react';

export default function InitialTestScreen({ user, onTestComplete }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Diagnostic Stats
  const [timer, setTimer] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await api.fetchInitialQuestions();
        if (data && data.length > 0) {
          setQuestions(data);
        } else {
          // If no diagnostic questions found, immediately complete
          onTestComplete();
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch diagnostic questions.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  // Timer effect
  useEffect(() => {
    if (loading || completed || questions.length === 0) return;
    
    // Reset timer for new question
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, loading, completed, questions.length]);

  const handleOptionSelect = (optionId) => {
    if (submitting) return;
    setSelectedOptionId(optionId);
  };

  const handleNext = async () => {
    if (!selectedOptionId) return;

    setSubmitting(true);
    setError('');

    const currentQuestion = questions[currentIndex];
    const timeSpent = timer;

    try {
      // Submit answer to backend (which runs queue and updates Bayesian states)
      const res = await api.submitAnswer({
        user_id: user.id,
        question_id: currentQuestion.id,
        option_id: selectedOptionId,
        time_spent_seconds: timeSpent
      });

      if (res.success) {
        setCorrectAnswersCount((prev) => prev + 1);
      }

      // Check if finished
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOptionId('');
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        setCompleted(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Retrieving prior concept diagnostic bank...</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 16px' }}>
        <div className="glass-card animate-fade-in" style={{ borderColor: 'var(--error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--error)', marginBottom: '16px' }}>
            <ShieldAlert size={28} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Initialization Failure</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry Connection</button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={{ maxWidth: '550px', margin: '40px auto', padding: '0 16px' }}>
        <div className="glass-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', marginBottom: '24px' }}>
            <Award size={40} />
          </div>
          
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>Diagnostic Test Completed!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Excellent effort! Your cognitive responses have been processed by the Bayesian Inference Engine. We have successfully mapped your understanding of Python concepts.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{correctAnswersCount} / {questions.length}</div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Prior Curve</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>Beta(2.0, 2.0)</div>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', height: '48px' }} onClick={onTestComplete}>
            <span>Enter Personalized Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div style={{ maxWidth: '680px', margin: '40px auto', padding: '0 16px' }}>
      {/* Test Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <span className="badge badge-primary">Diagnostic Phase</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '8px', color: 'var(--text-secondary)' }}>
            Question {currentIndex + 1} of {questions.length}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--warning)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
          <Hourglass size={16} />
          <span>{timer}s</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '32px', overflow: 'hidden' }}>
        <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
      </div>

      <div className="glass-card">
        {error && (
          <div className="badge-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem' }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="glass-card-body">
          <div className="mcq-container">
            <h2 className="mcq-question" style={{ marginBottom: '24px' }}>{currentQuestion.question_text}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQuestion.options && currentQuestion.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`mcq-option ${selectedOptionId === opt.id ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(opt.id)}
                  disabled={submitting}
                >
                  <div className="option-badge">{opt.option_letter}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>{opt.option_text}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button
              className="btn btn-primary"
              disabled={!selectedOptionId || submitting}
              onClick={handleNext}
              style={{ minWidth: '160px', height: '44px' }}
            >
              {submitting ? (
                <span>Ingesting...</span>
              ) : currentIndex + 1 === questions.length ? (
                <>
                  <span>Submit Diagnostic</span>
                  <Check size={18} />
                </>
              ) : (
                <>
                  <span>Next Question</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
