const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const JSZip = require('jszip');

class QRService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async generateQRCode(data, options = {}) {
    try {
      const {
        size = 300,
        foregroundColor = '#000000',
        backgroundColor = '#FFFFFF',
        margin = 2
      } = options;

      // Generate QR code as data URL
      const qrDataURL = await QRCode.toDataURL(data, {
        width: size,
        margin: margin,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        },
        errorCorrectionLevel: 'M'
      });

      // Generate unique filename
      const filename = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
      const filepath = path.join(this.uploadDir, filename);

      // Convert data URL to buffer and save
      const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(filepath, buffer);

      return {
        filename,
        filepath,
        dataURL: qrDataURL,
        url: `/uploads/${filename}`
      };
    } catch (error) {
      throw new Error(`QR generation failed: ${error.message}`);
    }
  }

  async generateBulkQRCodes(dataArray, options = {}) {
    const results = [];
    const zip = new JSZip();

    for (let i = 0; i < dataArray.length; i++) {
      try {
        const qrResult = await this.generateQRCode(dataArray[i].content, options);
        
        // Add to zip
        const qrBuffer = Buffer.from(qrResult.dataURL.replace(/^data:image\/png;base64,/, ''), 'base64');
        zip.file(`qr_${i + 1}_${dataArray[i].title || 'code'}.png`, qrBuffer);

        results.push({
          success: true,
          index: i,
          data: dataArray[i],
          qrCode: {
            _id: `temp_${Date.now()}_${i}`,
            title: dataArray[i].title,
            content: dataArray[i].content,
            type: dataArray[i].type || 'url',
            qrImage: {
              url: qrResult.url,
              filename: qrResult.filename
            },
            createdAt: new Date()
          }
        });
      } catch (error) {
        results.push({
          success: false,
          index: i,
          data: dataArray[i],
          error: error.message
        });
      }
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFilename = `bulk_qr_${Date.now()}.zip`;
    const zipPath = path.join(this.uploadDir, zipFilename);
    await fs.writeFile(zipPath, zipBuffer);

    return {
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalProcessed: dataArray.length,
      zipFile: {
        filename: zipFilename,
        path: zipPath,
        url: `/uploads/${zipFilename}`
      }
    };
  }

  async createPDF(qrCodes) {
    // For now, return a simple HTML file that can be converted to PDF
    // In production, you might want to use a service like Puppeteer or a PDF service
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-item { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }
            .qr-image { max-width: 200px; }
            .qr-info { margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>QR Codes Report</h1>
          ${qrCodes.map(qr => `
            <div class="qr-item">
              <h3>${qr.title || 'Untitled'}</h3>
              <img src="${qr.qrImage.url}" class="qr-image" alt="QR Code">
              <div class="qr-info">
                <p><strong>Content:</strong> ${qr.content}</p>
                <p><strong>Type:</strong> ${qr.type}</p>
                <p><strong>Created:</strong> ${new Date(qr.createdAt).toLocaleString()}</p>
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const filename = `qr_report_${Date.now()}.html`;
    const filepath = path.join(this.uploadDir, filename);
    await fs.writeFile(filepath, html);

    return {
      filename,
      filepath,
      url: `/uploads/${filename}`
    };
  }

  async createWordDocument(qrCodes) {
    // For now, return a simple text file
    // In production, you might want to use a library like docx
    const content = `
QR Codes Report
Generated on: ${new Date().toLocaleString()}

${qrCodes.map((qr, index) => `
${index + 1}. ${qr.title || 'Untitled'}
   Content: ${qr.content}
   Type: ${qr.type}
   Created: ${new Date(qr.createdAt).toLocaleString()}
   Image URL: ${qr.qrImage.url}
`).join('\n')}
    `;

    const filename = `qr_report_${Date.now()}.txt`;
    const filepath = path.join(this.uploadDir, filename);
    await fs.writeFile(filepath, content);

    return {
      filename,
      filepath,
      url: `/uploads/${filename}`
    };
  }

  async deleteQRFile(filename) {
    try {
      const filepath = path.join(this.uploadDir, filename);
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
}

module.exports = new QRService(); 