import React, { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import './BulkUpload.css';

// Helper to convert image URL to base64
const getBase64FromUrl = async (url) => {
  const data = await fetch(url, {mode: 'cors'});
  const blob = await data.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const BulkUpload = () => {
  const { getToken } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedContentColumn, setSelectedContentColumn] = useState('');
  const [selectedTitleColumn, setSelectedTitleColumn] = useState('');
  const [rowLimit, setRowLimit] = useState(10);
  const [styling, setStyling] = useState({
    size: 300,
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    margin: 2
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please select a valid CSV or Excel file');
      return;
    }
    setFile(selectedFile);
    setError('');
    setSuccess('');
    setUploadResult(null);
    parseFile(selectedFile);
  };

  const parseFile = (file) => {
    if (file.type === 'text/csv') {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
          parseCSV(e.target.result);
        } catch (err) {
          setError('Error parsing CSV file: ' + err.message);
        }
      };
      reader.readAsText(file);
        } else {
      // Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          parseExcel(e.target.result);
        } catch (err) {
          setError('Error parsing Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      }
  };

  const parseCSV = (content) => {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    setColumns(headers);
    setFileData(data);
    setSelectedContentColumn(headers[0] || '');
    setSelectedTitleColumn(headers[1] || headers[0] || '');
  };

  const parseExcel = (content) => {
    try {
      const workbook = XLSX.read(content, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length === 0) {
        setError('Excel file is empty');
        return;
      }
      const headers = jsonData[0].map(h => h?.toString().trim() || '');
      const data = jsonData.slice(1).filter(row => row.some(cell => cell)).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index]?.toString() || '';
        });
        return rowData;
      });
      setColumns(headers);
      setFileData(data);
      setSelectedContentColumn(headers[0] || '');
      setSelectedTitleColumn(headers[1] || headers[0] || '');
    } catch (err) {
      setError('Error parsing Excel file: ' + err.message);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedContentColumn) {
      setError('Please select a file and content column');
      return;
    }
    // Check plan limits (mock data for now)
    const planLimits = {
      free: 100,
      pro: 10000,
      enterprise: 100000
    };
    const currentPlan = 'free'; // This should come from user's subscription
    const limit = planLimits[currentPlan];
    const dataToProcess = fileData.slice(0, rowLimit);
    if (dataToProcess.length > limit) {
      setError(`Your ${currentPlan} plan allows maximum ${limit} QR codes. Please upgrade your plan or reduce the number of rows.`);
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      // For now, we'll simulate bulk QR generation since backend might not be ready
      const mockResults = dataToProcess.map((row, index) => {
        const content = row[selectedContentColumn];
        const title = row[selectedTitleColumn] || `QR Code ${index + 1}`;
        if (!content) return { success: false, error: 'Empty content' };
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${styling.size}x${styling.size}&data=${encodeURIComponent(content)}&color=${styling.foregroundColor.replace('#', '')}&bgcolor=${styling.backgroundColor.replace('#', '')}&margin=${styling.margin}`;
        return {
          success: true,
          qrCode: {
            _id: `qr_${Date.now()}_${index}`,
            title: title,
            content: content,
            qrImage: { url: qrApiUrl },
            createdAt: new Date().toISOString()
          }
        };
      });
      const successfulCount = mockResults.filter(r => r.success).length;
      const failedCount = mockResults.filter(r => !r.success).length;
      const mockUploadResult = {
        totalProcessed: dataToProcess.length,
        successful: successfulCount,
        failed: failedCount,
        results: mockResults
      };
      setUploadResult(mockUploadResult);
      setSuccess(`Successfully generated ${successfulCount} QR codes!`);
      // Try to call backend if available
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
        formData.append('contentColumn', selectedContentColumn);
        formData.append('titleColumn', selectedTitleColumn);
      formData.append('styling', JSON.stringify(styling));
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/qr/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
        if (response.ok) {
      const data = await response.json();
          setUploadResult(data.data);
          setSuccess(`Successfully generated ${data.data.successful} QR codes!`);
        }
      } catch (backendError) {
        console.log('Backend not available, using mock data');
      }
    } catch (err) {
      setError(err.message || 'Failed to process file');
    } finally {
      setUploading(false);
    }
  };

  const downloadBatch = async (format) => {
    if (!uploadResult) return;
    
    try {
      setLoading(true);
      const successfulQrs = uploadResult.results.filter(r => r.success);
      
      if (format === 'pdf') {
        // Download all QR images as base64 first
        const qrWithBase64 = await Promise.all(successfulQrs.map(async (qr) => {
          let base64 = '';
          try {
            base64 = await getBase64FromUrl(qr.qrCode.qrImage.url);
          } catch (e) {
            console.error('Failed to convert QR to base64:', e);
            base64 = '';
          }
          return { ...qr, qrBase64: base64 };
        }));
        
        // Create PDF using html2pdf.js
        const pdfContent = document.createElement('div');
        pdfContent.style.padding = '20px';
        pdfContent.style.fontFamily = 'Arial, sans-serif';
        pdfContent.style.backgroundColor = '#ffffff';
        
        // Header
        const header = document.createElement('div');
        header.innerHTML = `
          <h1 style="color: #333; margin-bottom: 10px; font-size: 24px;">Generated by MQRGen</h1>
          <p style="color: #666; margin-bottom: 5px;">Generated on: ${new Date().toLocaleString()}</p>
          <p style="color: #666; margin-bottom: 20px;">Total QR Codes: ${qrWithBase64.length}</p>
          <hr style="border: 1px solid #ddd; margin-bottom: 20px;">
        `;
        pdfContent.appendChild(header);
        
        // QR Codes
        qrWithBase64.forEach((qr, index) => {
          const qrSection = document.createElement('div');
          qrSection.style.marginBottom = '30px';
          qrSection.style.pageBreakInside = 'avoid';
          qrSection.style.border = '1px solid #eee';
          qrSection.style.padding = '15px';
          qrSection.style.borderRadius = '8px';
          
          qrSection.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 20px;">
              <div style="flex: 1;">
                <h3 style="color: #333; margin-bottom: 10px; font-size: 18px;">${index + 1}. ${qr.qrCode.title}</h3>
                <p style="color: #666; margin-bottom: 5px;"><strong>Content:</strong> ${qr.qrCode.content}</p>
                <p style="color: #666; margin-bottom: 5px;"><strong>Generated:</strong> ${new Date(qr.qrCode.createdAt).toLocaleString()}</p>
              </div>
              <div style="text-align: center;">
                <img src="${qr.qrBase64}" alt="QR Code" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
            </div>
          `;
          pdfContent.appendChild(qrSection);
        });
        
        document.body.appendChild(pdfContent);
        
        const opt = {
          margin: 15,
          filename: `mqrgen-bulk-qr-codes-${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        await html2pdf().set(opt).from(pdfContent).save();
        document.body.removeChild(pdfContent);
        
      } else if (format === 'excel') {
        // Create Excel file using XLSX
        const workbook = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const excelData = successfulQrs.map((qr, index) => ({
          'S.No': index + 1,
          'Name': qr.qrCode.title,
          'Content': qr.qrCode.content,
          'QR Image URL': qr.qrCode.qrImage.url,
          'Generated Date': new Date(qr.qrCode.createdAt).toLocaleString(),
          'QR Code Type': 'URL'
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'QR Codes');
        
        // Auto-size columns
        const colWidths = [
          { wch: 5 },  // S.No
          { wch: 30 }, // Name
          { wch: 50 }, // Content
          { wch: 60 }, // QR Image URL
          { wch: 20 }, // Generated Date
          { wch: 15 }  // QR Code Type
        ];
        worksheet['!cols'] = colWidths;
        
        // Save the file
        XLSX.writeFile(workbook, `mqrgen-bulk-qr-codes-${Date.now()}.xlsx`);
        
      } else if (format === 'word') {
        let content = `MQRGen - Bulk QR Codes Document\n`;
        content += `==========================================\n\n`;
        content += `Generated on: ${new Date().toLocaleString()}\n`;
        content += `Total QR Codes: ${successfulQrs.length}\n`;
        content += `==========================================\n\n`;
        
        successfulQrs.forEach((qr, index) => {
          content += `QR CODE ${index + 1}\n`;
          content += `Name: ${qr.qrCode.title}\n`;
          content += `Embedded Link: ${qr.qrCode.content}\n`;
          content += `QR Image URL: ${qr.qrCode.qrImage.url}\n`;
          content += `Generated: ${new Date(qr.qrCode.createdAt).toLocaleString()}\n`;
          content += `------------------------------------------\n\n`;
        });
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mqrgen-bulk-qr-codes-${Date.now()}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
      } else if (format === 'individual') {
        // Download individual QR codes
        for (let i = 0; i < successfulQrs.length; i++) {
          const qr = successfulQrs[i];
          try {
            const response = await fetch(qr.qrCode.qrImage.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${qr.qrCode.title || `qr-code-${i + 1}`}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            // Add small delay to prevent browser blocking multiple downloads
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Failed to download QR code ${i + 1}:`, error);
          }
        }
      }
      
      setSuccess(`Successfully exported ${successfulQrs.length} QR codes in ${format.toUpperCase()} format!`);
    } catch (err) {
      setError('Failed to download batch: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileData([]);
    setColumns([]);
    setSelectedContentColumn('');
    setSelectedTitleColumn('');
    setRowLimit(10);
    setUploadResult(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bulk-upload-modern">
      <div className="card-modern">
        <div className="card-header-modern">
          <h2 className="card-title-modern">
            <span className="card-icon-modern">📁</span>
            Bulk QR Generation
          </h2>
        </div>
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <span>✅</span>
            {success}
          </div>
        )}
        <div className="card-body-modern">
          <div className="upload-section-modern">
            <div className="file-upload-area-modern">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
                className="file-input-modern"
              />
              <div className="upload-placeholder-modern">
                <div className="upload-icon-modern">📁</div>
                <p className="upload-text-modern">Click to select CSV or Excel file</p>
                <p className="upload-hint-modern">Supported formats: .csv, .xlsx, .xls</p>
              </div>
            </div>
            {file && (
              <div className="file-info-modern">
                <div className="info-item-modern">
                  <span className="info-label-modern">File:</span>
                  <span className="info-value-modern">{file.name}</span>
                </div>
                <div className="info-item-modern">
                  <span className="info-label-modern">Size:</span>
                  <span className="info-value-modern">{(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <div className="info-item-modern">
                  <span className="info-label-modern">Total Rows:</span>
                  <span className="info-value-modern">{fileData.length}</span>
          </div>
            </div>
          )}
        </div>
        {columns.length > 0 && (
            <div className="column-selection-modern">
              <h3 className="section-title-modern">Select Columns</h3>
              <div className="column-selection-grid-modern">
                <div className="form-group-modern">
                  <label className="form-label-modern">Content Column *</label>
                  <select
                    value={selectedContentColumn}
                    onChange={(e) => setSelectedContentColumn(e.target.value)}
                    className="form-select-modern"
                  >
                    {columns.map((column, index) => (
                      <option key={index} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                  <small className="form-hint-modern">This column will contain the URL/data to embed in QR codes</small>
                </div>
                <div className="form-group-modern">
                  <label className="form-label-modern">Title Column</label>
              <select
                    value={selectedTitleColumn}
                    onChange={(e) => setSelectedTitleColumn(e.target.value)}
                    className="form-select-modern"
              >
                {columns.map((column, index) => (
                  <option key={index} value={column}>
                    {column}
                  </option>
                ))}
              </select>
                  <small className="form-hint-modern">This column will be used as the QR code title (optional)</small>
                </div>
                <div className="form-group-modern">
                  <label className="form-label-modern">Rows to Process</label>
                  <input
                    type="number"
                    value={rowLimit}
                    onChange={(e) => setRowLimit(Math.min(parseInt(e.target.value) || 1, fileData.length))}
                    className="form-input-modern"
                    min="1"
                    max={fileData.length}
                  />
                  <small className="form-hint-modern">Number of rows to process (max: {fileData.length})</small>
                </div>
            </div>
              <div className="data-preview-modern">
                <h4 className="preview-title-modern">Data Preview (First {Math.min(rowLimit, 10)} rows)</h4>
                <div className="preview-table-container-modern">
                  <table className="preview-table-modern">
                  <thead>
                    <tr>
                      {columns.map((column, index) => (
                          <th key={index} className={
                            column === selectedContentColumn ? 'selected-content-column-modern' : 
                            column === selectedTitleColumn ? 'selected-title-column-modern' : ''
                          }>
                            {column}
                          </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                      {fileData.slice(0, Math.min(rowLimit, 10)).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {columns.map((column, colIndex) => (
                            <td key={colIndex} className={
                              column === selectedContentColumn ? 'selected-content-column-modern' : 
                              column === selectedTitleColumn ? 'selected-title-column-modern' : ''
                            }>
                            {row[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
              <div className="styling-options-modern">
                <h4 className="section-title-modern">Styling Options</h4>
                <div className="grid-modern grid-3-modern">
                  <div className="form-group-modern">
                    <label className="form-label-modern">Size (px)</label>
                  <input
                    type="number"
                    value={styling.size}
                    onChange={(e) => setStyling(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                      className="form-input-modern"
                    min="100"
                    max="1000"
                  />
                </div>
                  <div className="form-group-modern">
                    <label className="form-label-modern">Foreground Color</label>
                  <input
                    type="color"
                    value={styling.foregroundColor}
                    onChange={(e) => setStyling(prev => ({ ...prev, foregroundColor: e.target.value }))}
                      className="form-input-modern color-input-modern"
                  />
                </div>
                  <div className="form-group-modern">
                    <label className="form-label-modern">Background Color</label>
                  <input
                    type="color"
                    value={styling.backgroundColor}
                    onChange={(e) => setStyling(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="form-input-modern color-input-modern"
                  />
                  </div>
                </div>
              </div>
              <div className="upload-actions-modern">
              <button
                onClick={handleUpload}
                disabled={uploading}
                  className="btn-modern btn-primary-modern"
              >
                {uploading ? (
                  <>
                    <span className="spinner"></span>
                    Generating QR Codes...
                  </>
                ) : (
                    <>
                      <span>🔗</span>
                      Generate QR Codes ({rowLimit} rows)
                    </>
                )}
              </button>
              <button
                onClick={resetForm}
                  className="btn-modern btn-secondary-modern"
              >
                  <span>🔄</span>
                Reset
              </button>
            </div>
          </div>
        )}
        {uploadResult && (
            <div className="upload-result-modern">
              <h3 className="section-title-modern">Upload Results</h3>
              <div className="result-stats-modern">
                <div className="stat-item-modern">
                  <span className="stat-label-modern">Total Processed:</span>
                  <span className="stat-value-modern">{uploadResult.totalProcessed}</span>
                </div>
                <div className="stat-item-modern">
                  <span className="stat-label-modern">Successful:</span>
                  <span className="stat-value-modern success">{uploadResult.successful}</span>
              </div>
                <div className="stat-item-modern">
                  <span className="stat-label-modern">Failed:</span>
                  <span className="stat-value-modern error">{uploadResult.failed}</span>
              </div>
              </div>
              <div className="download-options-modern">
                <h4 className="section-title-modern">Download Options</h4>
                <div className="download-buttons-modern">
                <button
                  onClick={() => downloadBatch('pdf')}
                    className="btn-modern btn-success-modern"
                    disabled={loading}
                >
                    <span>📄</span>
                    {loading ? 'Preparing PDF...' : 'Download as PDF'}
                </button>
                <button
                  onClick={() => downloadBatch('excel')}
                    className="btn-modern btn-success-modern"
                    disabled={loading}
                >
                    <span>📊</span>
                    {loading ? 'Preparing Excel...' : 'Download as Excel'}
                </button>
                <button
                  onClick={() => downloadBatch('word')}
                    className="btn-modern btn-success-modern"
                >
                    <span>📝</span>
                  Download as Word
                </button>
                  <button
                    onClick={() => downloadBatch('individual')}
                    className="btn-modern btn-success-modern"
                  >
                    <span>📁</span>
                    Download All QR Codes
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
      </div>
    </div>
  );
};

export default BulkUpload; 