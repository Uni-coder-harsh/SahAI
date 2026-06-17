import React, { useState } from 'react';
import { api } from '../services/api';
import { Settings, CheckCircle, GraduationCap, AlertCircle } from 'lucide-react';

export default function PersonalizeScreen({ user, onPersonalizeSuccess }) {
  const [domain, setDomain] = useState('CS');
  const [course, setCourse] = useState('B.Tech');
  const [semester, setSemester] = useState(1);
  const [syllabusTextOrLink, setSyllabusTextOrLink] = useState('');
  const [gateExam, setGateExam] = useState(false);
  const [gatePaper1, setGatePaper1] = useState('CS');
  const [gatePaper2, setGatePaper2] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setWarningMessage('');
    setLoading(true);

    try {
      const payload = {
        domain,
        course,
        semester: parseInt(semester, 10),
        syllabusTextOrLink,
        gateExam,
        gatePaper1: gateExam ? gatePaper1 : '',
        gatePaper2: gateExam ? gatePaper2 : '',
      };

      const res = await api.personalize(user.id, payload);

      if (res.status === 'progress') {
        setWarningMessage(res.message);
      } else if (res.status === 'success') {
        onPersonalizeSuccess(res.user);
      } else {
        throw new Error(res.error || 'Failed to personalize cognitive engine.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto 0 auto', padding: '0 16px' }}>
      <div className="glass-card animate-fade-in">
        <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Personalize Cognitive Engine</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Align our Bayesian algorithms with your academic goals.</p>
          </div>
        </div>

        <div className="glass-card-body" style={{ marginTop: '20px' }}>
          {errorMessage && (
            <div className="badge-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {warningMessage && (
            <div className="badge-warning" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.95rem', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', color: '#fbbf24', lineHeight: 1.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <AlertCircle size={20} />
                <span>Domain Support In Progress</span>
              </div>
              <span>{warningMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Academic Domain *</label>
              <select
                className="form-input form-select"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              >
                <option value="CS">Computer Science & Engineering (CS)</option>
                <option value="LAW">Legal Studies / Law</option>
                <option value="ARTS">Arts & Humanities</option>
                <option value="OTHER">Other Domains</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Course / Degree Level *</label>
              <select
                className="form-input form-select"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                required
              >
                <option value="B.Tech">B.Tech / B.E.</option>
                <option value="M.Tech">M.Tech / M.E.</option>
                <option value="MCA">MCA</option>
                <option value="B.Sc">B.Sc / BCA</option>
                <option value="PhD">PhD / Research</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Current Semester *</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="10"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Syllabus Text Reference or Drive Link</label>
              <textarea
                className="form-input"
                style={{ height: '80px', resize: 'vertical' }}
                placeholder="Paste your curriculum highlights or share a reference PDF syllabus link..."
                value={syllabusTextOrLink}
                onChange={(e) => setSyllabusTextOrLink(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '24px 0' }}>
              <input
                type="checkbox"
                id="gateExam"
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                checked={gateExam}
                onChange={(e) => setGateExam(e.target.checked)}
              />
              <label htmlFor="gateExam" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                Are you targeting the GATE Exam?
              </label>
            </div>

            {gateExam && (
              <div className="animate-fade-in" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GraduationCap size={16} /> GATE Target Papers
                </h4>
                <div className="form-group">
                  <label className="form-label">Primary GATE Paper *</label>
                  <select
                    className="form-input form-select"
                    value={gatePaper1}
                    onChange={(e) => setGatePaper1(e.target.value)}
                    required
                  >
                    <option value="CS">Computer Science & Information Technology (CS)</option>
                    <option value="DA">Data Science & Artificial Intelligence (DA)</option>
                    <option value="EC">Electronics & Communication (EC)</option>
                    <option value="EE">Electrical Engineering (EE)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Secondary GATE Paper (Optional)</label>
                  <select
                    className="form-input form-select"
                    value={gatePaper2}
                    onChange={(e) => setGatePaper2(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="CS">Computer Science & Information Technology (CS)</option>
                    <option value="DA">Data Science & Artificial Intelligence (DA)</option>
                    <option value="MA">Mathematics (MA)</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '48px', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? (
                <span>Personalizing Engine...</span>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Configure & Initialize</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
