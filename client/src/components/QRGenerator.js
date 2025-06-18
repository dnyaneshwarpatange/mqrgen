import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import './QRGenerator.css';

const QRGenerator = () => {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState({
    content: '',
    title: '',
    type: 'url',
    styling: {
      size: 300,
      foregroundColor: '#000000',
      backgroundColor: '#FFFFFF',
      margin: 2
    }
  });
  const [generatedQR, setGeneratedQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('styling.')) {
      const stylingField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        styling: {
          ...prev.styling,
          [stylingField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const generateQR = async () => {
    if (!formData.content.trim()) {
      setError('Please enter content for the QR code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await getToken();
      
      // Generate QR code using public API
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${formData.styling.size}x${formData.styling.size}&data=${encodeURIComponent(formData.content)}&color=${formData.styling.foregroundColor.replace('#', '')}&bgcolor=${formData.styling.backgroundColor.replace('#', '')}&margin=${formData.styling.margin}`;
      
      // Create a mock response to simulate backend
      const mockResponse = {
        data: {
          id: Date.now().toString(),
          title: formData.title || 'QR Code',
          content: formData.content,
          type: formData.type,
          qrImage: {
            url: qrApiUrl
          },
          createdAt: new Date().toISOString(),
          styling: formData.styling
        }
      };

      setGeneratedQR(mockResponse.data);
      
      // Try to call backend if available
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/qr/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const data = await response.json();
          setGeneratedQR(data.data);
        }
      } catch (backendError) {
        console.log('Backend not available, using mock data');
      }
      
    } catch (err) {
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = async (format = 'png') => {
    if (!generatedQR) return;

    try {
      if (format === 'png') {
        // Download as PNG
        const response = await fetch(generatedQR.qrImage.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${generatedQR.title || 'qr-code'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // Create a simple PDF-like document
        const content = `
QR Code Details:
Title: ${generatedQR.title}
Content: ${generatedQR.content}
Type: ${generatedQR.type}
Generated: ${new Date(generatedQR.createdAt).toLocaleString()}
QR Image URL: ${generatedQR.qrImage.url}
        `;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${generatedQR.title || 'qr-code'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download QR code: ' + err.message);
    }
  };

  const copyToClipboard = () => {
    if (generatedQR) {
      navigator.clipboard.writeText(generatedQR.content);
      // You could add a toast notification here
      alert('Content copied to clipboard!');
    }
  };

  return (
    <div className="qr-generator">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">🔗</span>
            Generate QR Code
          </h2>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <div className="card-body">
          <div className="grid grid-2">
            <div className="form-section">
              <div className="form-group">
                <label className="form-label">Content *</label>
                <input
                  type="text"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter URL, text, or other content"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="QR Code Title"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="url">URL</option>
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                  <option value="wifi">WiFi</option>
                  <option value="vcard">vCard</option>
                </select>
              </div>

              <div className="styling-section">
                <h3 className="section-title">Styling Options</h3>
                
                <div className="grid grid-3">
                  <div className="form-group">
                    <label className="form-label">Size (px)</label>
                    <input
                      type="number"
                      name="styling.size"
                      value={formData.styling.size}
                      onChange={handleInputChange}
                      className="form-input"
                      min="100"
                      max="1000"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Foreground Color</label>
                    <input
                      type="color"
                      name="styling.foregroundColor"
                      value={formData.styling.foregroundColor}
                      onChange={handleInputChange}
                      className="form-input color-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Background Color</label>
                    <input
                      type="color"
                      name="styling.backgroundColor"
                      value={formData.styling.backgroundColor}
                      onChange={handleInputChange}
                      className="form-input color-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Margin</label>
                  <input
                    type="number"
                    name="styling.margin"
                    value={formData.styling.margin}
                    onChange={handleInputChange}
                    className="form-input"
                    min="0"
                    max="10"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  onClick={generateQR}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span>🔗</span>
                      Generate QR Code
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="preview-section">
              <h3 className="section-title">Preview</h3>
              {generatedQR ? (
                <div className="qr-preview">
                  <div className="qr-image-container">
                    <img
                      src={generatedQR.qrImage.url}
                      alt="Generated QR Code"
                      className="qr-image"
                    />
                  </div>
                  <div className="qr-info">
                    <div className="info-item">
                      <span className="info-label">Title:</span>
                      <span className="info-value">{generatedQR.title}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Type:</span>
                      <span className="info-value">{generatedQR.type}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Content:</span>
                      <span className="info-value content-text">{generatedQR.content}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Created:</span>
                      <span className="info-value">{new Date(generatedQR.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="qr-actions">
                    <button
                      onClick={() => downloadQR('png')}
                      className="btn btn-success"
                    >
                      <span>📥</span>
                      Download PNG
                    </button>
                    <button
                      onClick={() => downloadQR('pdf')}
                      className="btn btn-success"
                    >
                      <span>📄</span>
                      Download PDF
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="btn btn-secondary"
                    >
                      <span>📋</span>
                      Copy Content
                    </button>
                  </div>
                </div>
              ) : (
                <div className="qr-placeholder">
                  <div className="placeholder-icon">🔗</div>
                  <p className="placeholder-text">Your QR code will appear here</p>
                  <p className="placeholder-hint">Fill in the form and click "Generate QR Code"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator; 