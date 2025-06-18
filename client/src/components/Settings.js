import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const Settings = () => {
  const { user } = useUser();
  const [settings, setSettings] = useState({
    defaultQrSize: 300,
    defaultQrColor: '#000000',
    defaultQrBackground: '#FFFFFF',
    notifications: {
      email: true,
      push: true
    }
  });

  const handleSettingChange = (key, value) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const saveSettings = async () => {
    // TODO: Implement settings save to backend
    alert('Settings saved successfully!');
  };

  return (
    <div className="settings">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Settings</h2>
        </div>

        <div className="settings-section">
          <h3>Account Information</h3>
          <div className="account-info">
            <div className="info-item">
              <label>Name:</label>
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{user?.emailAddresses[0]?.emailAddress}</span>
            </div>
            <div className="info-item">
              <label>Member Since:</label>
              <span>{new Date(user?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Default QR Settings</h3>
          <div className="form-group">
            <label className="form-label">Default QR Size (px)</label>
            <input
              type="number"
              value={settings.defaultQrSize}
              onChange={(e) => handleSettingChange('defaultQrSize', parseInt(e.target.value))}
              className="form-input"
              min="100"
              max="1000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default Foreground Color</label>
            <input
              type="color"
              value={settings.defaultQrColor}
              onChange={(e) => handleSettingChange('defaultQrColor', e.target.value)}
              className="form-input color-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default Background Color</label>
            <input
              type="color"
              value={settings.defaultQrBackground}
              onChange={(e) => handleSettingChange('defaultQrBackground', e.target.value)}
              className="form-input color-input"
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="notification-settings">
            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => handleSettingChange('notifications.email', e.target.checked)}
                />
                <span>Email Notifications</span>
              </label>
              <p className="setting-description">
                Receive email notifications about your QR code activity
              </p>
            </div>

            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={(e) => handleSettingChange('notifications.push', e.target.checked)}
                />
                <span>Push Notifications</span>
              </label>
              <p className="setting-description">
                Receive push notifications in your browser
              </p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>API Settings</h3>
          <div className="api-info">
            <p>Your API key for programmatic access to QR generation:</p>
            <div className="api-key-display">
              <code>mqr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
              <button className="btn btn-secondary btn-sm">
                Copy
              </button>
            </div>
            <p className="api-hint">
              Use this key in the X-API-Key header for API requests
            </p>
          </div>
        </div>

        <div className="settings-actions">
          <button onClick={saveSettings} className="btn btn-primary">
            Save Settings
          </button>
          <button className="btn btn-secondary">
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 