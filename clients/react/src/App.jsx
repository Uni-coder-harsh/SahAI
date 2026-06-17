import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import AuthScreen from './components/AuthScreen';
import PersonalizeScreen from './components/PersonalizeScreen';
import InitialTestScreen from './components/InitialTestScreen';
import DashboardScreen from './components/DashboardScreen';
import SkillMeshScreen from './components/SkillMeshScreen';
import SandboxScreen from './components/SandboxScreen';
import FailureReportScreen from './components/FailureReportScreen';
import ProfileScreen from './components/ProfileScreen';

import { 
  LayoutDashboard, 
  Network, 
  Code, 
  AlertOctagon, 
  User, 
  LogOut,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Progression States
  const [needsPersonalization, setNeedsPersonalization] = useState(false);
  const [needsInitialTest, setNeedsInitialTest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setToken(savedToken);
      api.setToken(savedToken);
      
      // Check progression requirements
      checkProgression(parsedUser);
    } else {
      setLoading(false);
    }
  }, []);

  const checkProgression = (usr) => {
    if (!usr.academic_stream) {
      setNeedsPersonalization(true);
      setNeedsInitialTest(false);
    } else {
      setNeedsPersonalization(false);
      // Check if diagnostic test completed in local storage
      const completed = localStorage.getItem(`initial_test_complete_${usr.id}`);
      setNeedsInitialTest(!completed);
    }
    setLoading(false);
  };

  const handleAuthSuccess = (loggedUser) => {
    setUser(loggedUser);
    setToken(api.token);
    localStorage.setItem('auth_user', JSON.stringify(loggedUser));
    checkProgression(loggedUser);
  };

  const handlePersonalizeSuccess = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    setNeedsPersonalization(false);
    
    // Once personalized, we need to take the initial test
    setNeedsInitialTest(true);
  };

  const handleTestComplete = () => {
    localStorage.setItem(`initial_test_complete_${user.id}`, 'true');
    setNeedsInitialTest(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    api.setToken(null);
    setUser(null);
    setToken(null);
    setNeedsPersonalization(false);
    setNeedsInitialTest(false);
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // 1. Auth Gate
  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // 2. Personalization Gate
  if (needsPersonalization) {
    return <PersonalizeScreen user={user} onPersonalizeSuccess={handlePersonalizeSuccess} />;
  }

  // 3. Diagnostic Initial MCQ Test Gate
  if (needsInitialTest) {
    return <InitialTestScreen user={user} onTestComplete={handleTestComplete} />;
  }

  // 4. Main Application Workspace Layout
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen user={user} onTabChange={setActiveTab} />;
      case 'skill_mesh':
        return <SkillMeshScreen user={user} />;
      case 'sandbox':
        return <SandboxScreen user={user} />;
      case 'failure_report':
        return <FailureReportScreen user={user} />;
      case 'profile':
        return <ProfileScreen user={user} onLogout={handleLogout} />;
      default:
        return <DashboardScreen user={user} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        {/* Brand details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <Sparkles size={24} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
            SahAI Core
          </span>
        </div>

        {/* User preview */}
        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
            {user.name ? user.name[0].toUpperCase() : user.username[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user.name || user.username}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {user.academic_stream ? 'B.Tech CSE' : 'Student'}
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="nav-menu">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textTransform: 'none', fontFamily: 'inherit' }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('skill_mesh')}
            className={`nav-link ${activeTab === 'skill_mesh' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textTransform: 'none', fontFamily: 'inherit' }}
          >
            <Network size={18} />
            <span>Skill Mesh</span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`nav-link ${activeTab === 'sandbox' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textTransform: 'none', fontFamily: 'inherit' }}
          >
            <Code size={18} />
            <span>Code Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('failure_report')}
            className={`nav-link ${activeTab === 'failure_report' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textTransform: 'none', fontFamily: 'inherit' }}
          >
            <AlertOctagon size={18} />
            <span>Failure Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', width: '100%', textTransform: 'none', fontFamily: 'inherit' }}
          >
            <User size={18} />
            <span>My Profile</span>
          </button>
        </nav>

        {/* Quick logout button at bottom */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'none', border: 'none', color: '#f87171', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Contents */}
      <main className="main-content">
        {renderActiveScreen()}
      </main>
    </div>
  );
}
