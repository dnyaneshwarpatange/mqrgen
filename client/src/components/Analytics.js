import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import './Analytics.css';

const Analytics = () => {
  const { getToken } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      // Try to fetch from backend first
      try {
        const token = await getToken();
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/analytics?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.data);
          return;
        }
      } catch (backendError) {
        console.log('Backend not available, using mock data');
      }

      // Mock analytics data
      const mockAnalytics = generateMockAnalytics();
      setAnalytics(mockAnalytics);
    } catch (err) {
      setError('Failed to load analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = () => {
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
    
    // Generate mock data for the selected time range
    const qrCodes = [];
    const scans = [];
    const dates = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString());
      
      // Random QR codes created per day
      const qrCount = Math.floor(Math.random() * 10) + 1;
      qrCodes.push(qrCount);
      
      // Random scans per day (more than QR codes created)
      const scanCount = Math.floor(Math.random() * 50) + qrCount;
      scans.push(scanCount);
    }

    return {
      overview: {
        totalQrCodes: qrCodes.reduce((a, b) => a + b, 0),
        totalScans: scans.reduce((a, b) => a + b, 0),
        averageScansPerQr: Math.round((scans.reduce((a, b) => a + b, 0) / qrCodes.reduce((a, b) => a + b, 0)) * 100) / 100,
        mostScannedQr: {
          title: 'Product Landing Page',
          scans: 245,
          content: 'https://example.com/product'
        }
      },
      charts: {
        qrCodesCreated: {
          labels: dates,
          data: qrCodes
        },
        qrCodeScans: {
          labels: dates,
          data: scans
        }
      },
      topQrCodes: [
        { title: 'Product Landing Page', scans: 245, content: 'https://example.com/product' },
        { title: 'Contact Information', scans: 189, content: 'https://example.com/contact' },
        { title: 'Social Media Profile', scans: 156, content: 'https://instagram.com/username' },
        { title: 'WiFi Network', scans: 134, content: 'WIFI:T:WPA;S:MyNetwork;P:password123;;' },
        { title: 'Business Card', scans: 98, content: 'https://example.com/business-card' }
      ],
      recentActivity: [
        { type: 'qr_created', title: 'New Product QR', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
        { type: 'qr_scanned', title: 'Contact QR Scanned', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
        { type: 'qr_created', title: 'Event QR Code', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
        { type: 'qr_scanned', title: 'WiFi QR Scanned', timestamp: new Date(Date.now() - 1000 * 60 * 180) },
        { type: 'qr_created', title: 'Social Media QR', timestamp: new Date(Date.now() - 1000 * 60 * 240) }
      ]
    };
  };

  const renderChart = (data, title, color = '#3b82f6') => {
    if (!data || !data.labels || !data.data) return null;

    const maxValue = Math.max(...data.data);
    const chartHeight = 200;

    return (
      <div className="chart-container">
        <h4 className="chart-title">{title}</h4>
        <div className="chart" style={{ height: chartHeight }}>
          {data.data.map((value, index) => {
            const height = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
            return (
              <div key={index} className="chart-bar-container">
                <div
                  className="chart-bar"
                  style={{
                    height: `${height}px`,
                    backgroundColor: color
                  }}
                  title={`${data.labels[index]}: ${value}`}
                />
                <span className="chart-label">{data.labels[index]}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="analytics">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">📊</span>
              Analytics
            </h2>
          </div>
          <div className="card-body">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">📊</span>
              Analytics
            </h2>
          </div>
          <div className="card-body">
            <div className="alert alert-error">
              <span>⚠️</span>
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">📊</span>
            Analytics Dashboard
          </h2>
          <div className="time-range-selector">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-select"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>

        <div className="card-body">
          {/* Overview Stats */}
          <div className="overview-stats">
            <div className="stat-card">
              <div className="stat-icon">🔗</div>
              <div className="stat-content">
                <h3 className="stat-value">{analytics.overview.totalQrCodes}</h3>
                <p className="stat-label">Total QR Codes</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👁️</div>
              <div className="stat-content">
                <h3 className="stat-value">{analytics.overview.totalScans}</h3>
                <p className="stat-label">Total Scans</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <h3 className="stat-value">{analytics.overview.averageScansPerQr}</h3>
                <p className="stat-label">Avg Scans per QR</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-content">
                <h3 className="stat-value">{analytics.overview.mostScannedQr.scans}</h3>
                <p className="stat-label">Most Scanned QR</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-section">
            <div className="charts-grid">
              {renderChart(analytics.charts.qrCodesCreated, 'QR Codes Created', '#10b981')}
              {renderChart(analytics.charts.qrCodeScans, 'QR Code Scans', '#3b82f6')}
            </div>
          </div>

          {/* Top QR Codes */}
          <div className="top-qr-codes">
            <h3 className="section-title">Top Performing QR Codes</h3>
            <div className="qr-codes-list">
              {analytics.topQrCodes.map((qr, index) => (
                <div key={index} className="qr-code-item">
                  <div className="qr-rank">#{index + 1}</div>
                  <div className="qr-info">
                    <h4 className="qr-title">{qr.title}</h4>
                    <p className="qr-content">{qr.content}</p>
                  </div>
                  <div className="qr-stats">
                    <span className="scan-count">{qr.scans} scans</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity">
            <h3 className="section-title">Recent Activity</h3>
            <div className="activity-list">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className={`activity-icon ${activity.type}`}>
                    {activity.type === 'qr_created' ? '🔗' : '👁️'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-text">
                      {activity.type === 'qr_created' ? 'Created' : 'Scanned'}: {activity.title}
                    </p>
                    <span className="activity-time">
                      {activity.timestamp.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 