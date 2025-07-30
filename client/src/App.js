import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'

  return (
    <div className="App">
      <SignedOut>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1 className="auth-title">MQRGen</h1>
              <p className="auth-subtitle">Enterprise QR Code Generator</p>
            </div>
            
            {/* Auth Mode Tabs */}
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'signin' ? 'active' : ''}`}
                onClick={() => setAuthMode('signin')}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <div className="auth-content">
              {authMode === 'signin' ? (
                <SignIn routing="hash" />
              ) : (
                <SignUp routing="hash" />
              )}
            </div>

            <div className="auth-features">
              <div className="feature-item">
                <span className="feature-icon">🔗</span>
                <span>Generate Custom QR Codes</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📁</span>
                <span>Bulk Upload & Processing</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Analytics & Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Router>
      </SignedIn>
    </div>
  );
}

export default App;
