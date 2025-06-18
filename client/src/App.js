import React from 'react';
import './App.css';
import { SignedIn, SignedOut, SignIn, SignUp, UserButton } from '@clerk/clerk-react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="App">
      <SignedOut>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1 className="auth-title">MQRGen</h1>
              <p className="auth-subtitle">Enterprise QR Code Generator</p>
            </div>
            <div className="auth-content">
              <SignIn routing="hash" />
              <div className="auth-divider">
                <span>or</span>
              </div>
              <SignUp routing="hash" />
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
        <Dashboard />
      </SignedIn>
    </div>
  );
}

export default App;
