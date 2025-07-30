// Mock data service for development when MongoDB is not available
class MockDataService {
  constructor() {
    this.users = new Map();
    this.qrCodes = new Map();
    this.payments = new Map();
  }

  // Mock user data
  createMockUser(clerkId, userData) {
    const user = {
      _id: `mock_user_${Date.now()}`,
      clerkId,
      email: userData.email || 'user@example.com',
      firstName: userData.firstName || 'User',
      lastName: userData.lastName || 'Name',
      subscription: {
        plan: 'free',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      usage: {
        qrGeneratedToday: 0,
        qrGeneratedTotal: 0,
        lastResetDate: new Date(),
        apiCallsToday: 0,
        apiCallsTotal: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(clerkId, user);
    return user;
  }

  getMockUser(clerkId) {
    return this.users.get(clerkId);
  }

  // Mock QR code data
  createMockQRCode(userId, qrData) {
    const qrCode = {
      _id: `mock_qr_${Date.now()}`,
      userId,
      title: qrData.title || 'QR Code',
      content: qrData.content,
      type: qrData.type || 'url',
      qrImage: {
        url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.content)}&color=000000&bgcolor=FFFFFF&margin=2`
      },
      styling: qrData.styling || {},
      analytics: {
        scans: 0,
        lastScanned: null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.qrCodes.set(qrCode._id, qrCode);
    return qrCode;
  }

  getMockQRCodes(userId) {
    return Array.from(this.qrCodes.values()).filter(qr => qr.userId === userId);
  }

  // Mock payment data
  createMockPayment(userId, paymentData) {
    const payment = {
      _id: `mock_payment_${Date.now()}`,
      userId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      plan: paymentData.plan,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.payments.set(payment._id, payment);
    return payment;
  }

  getMockPayments(userId) {
    return Array.from(this.payments.values()).filter(payment => payment.userId === userId);
  }

  // Mock analytics data
  getMockAnalytics(userId) {
    const userQRCodes = this.getMockQRCodes(userId);
    const totalScans = userQRCodes.reduce((sum, qr) => sum + (qr.analytics.scans || 0), 0);
    
    return {
      totalQRCodes: userQRCodes.length,
      totalScans,
      averageScans: userQRCodes.length > 0 ? Math.round(totalScans / userQRCodes.length) : 0,
      recentActivity: userQRCodes
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    };
  }
}

module.exports = new MockDataService(); 