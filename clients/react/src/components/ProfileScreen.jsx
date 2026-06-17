import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, LogOut, Globe, Check, GraduationCap, Link2, Shield } from 'lucide-react';

export default function ProfileScreen({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.fetchUserProfile(user.id);
        setProfile(data);
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    
    // Retrieve custom url
    setCustomUrl(localStorage.getItem('custom_api_url') || '');
  }, [user.id]);

  const handleSaveUrl = (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    if (customUrl.trim()) {
      localStorage.setItem('custom_api_url', customUrl.trim());
    } else {
      localStorage.removeItem('custom_api_url');
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Parse details inside device_signature
  const extraDetails = profile?.device_signature || {};
  const syllabusText = extraDetails.syllabus_referral || 'None provided';
  const targetingGate = extraDetails.targeting_gate || false;
  const gatePaper1 = extraDetails.gate_paper_1 || 'N/A';
  const gatePaper2 = extraDetails.gate_paper_2 || 'None';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User style={{ color: 'var(--primary)' }} />
            <span>Student Profile</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review your registration metadata and manage server connection parameters.</p>
        </div>
        <button className="btn btn-secondary" onClick={onLogout} style={{ height: '40px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Core Credentials Card */}
        <div className="glass-card">
          <div className="glass-card-header" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Academic Credentials</h3>
          </div>
          <div className="glass-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Full Name:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.name || user.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Username:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.username || user.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>SSO Email:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.sso_email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Phone Number:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.phone_number || 'Not provided'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Degree Course:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.academic_stream || 'B.Tech CSE'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Semester:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.current_semester || 1}</span>
            </div>
          </div>
        </div>

        {/* Learning Targets & Syllabus */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card">
            <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <GraduationCap size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>GATE Targets</h3>
            </div>
            <div className="glass-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Exam Tracking:</span>
                <span className={`badge ${targetingGate ? 'badge-success' : 'badge-primary'}`}>
                  {targetingGate ? 'Active' : 'Inactive'}
                </span>
              </div>
              {targetingGate && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Primary Paper:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{gatePaper1}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Secondary Paper:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{gatePaper2}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="glass-card">
            <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Link2 size={18} style={{ color: 'var(--primary)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Syllabus Referral</h4>
            </div>
            <div className="glass-card-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {syllabusText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Configuration settings card */}
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Gateway Configuration Settings</h3>
        </div>
        <div className="glass-card-body" style={{ marginTop: '16px' }}>
          <form onSubmit={handleSaveUrl}>
            <div className="form-group">
              <label className="form-label">Custom API Base URL (Override)</label>
              <input
                type="url"
                className="form-input"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="e.g. https://sahai-api-node-production.up.railway.app/api"
              />
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                Leave empty to use automatic host detection (defaults to current window domain suffix). Updates take effect immediately.
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" style={{ height: '40px', padding: '0 20px' }}>
                <Check size={16} />
                <span>Save Configuration</span>
              </button>
              {saveSuccess && (
                <span style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600 }}>
                  Configuration saved successfully!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
