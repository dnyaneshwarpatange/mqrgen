import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import QRGenerator from './QRGenerator';
import BulkUpload from './BulkUpload';
import Analytics from './Analytics';
import Settings from './Settings';
import Subscription from './Subscription';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('generate');

  const tabs = [
    { id: 'generate', label: 'Generate QR', icon: '🔗' },
    { id: 'bulk', label: 'Bulk Upload', icon: '📁' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'subscription', label: 'Plans', icon: '💳' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'generate':
        return <QRGenerator />;
      case 'bulk':
        return <BulkUpload />;
      case 'analytics':
        return <Analytics />;
      case 'subscription':
        return <Subscription />;
      case 'settings':
        return <Settings />;
      default:
        return <QRGenerator />;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>MQRGen</h1>
          <span className="subtitle">Enterprise QR Generator</span>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span>Welcome, {user?.firstName || user?.username || 'User'}</span>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="dashboard-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="dashboard-main">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard; 