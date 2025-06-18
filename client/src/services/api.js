import { useAuth } from '@clerk/clerk-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getAuthToken() {
    try {
      const { getToken } = useAuth();
      return await getToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // QR Code Management
  async createQRCode(qrData) {
    return this.request('/api/qr/create', {
      method: 'POST',
      body: JSON.stringify(qrData),
    });
  }

  async getQRCodes(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    
    return this.request(`/api/qr/list?${params}`);
  }

  async getQRCodeById(id) {
    return this.request(`/api/qr/${id}`);
  }

  async updateQRCode(id, qrData) {
    return this.request(`/api/qr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(qrData),
    });
  }

  async deleteQRCode(id) {
    return this.request(`/api/qr/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateQRCodes(bulkData) {
    return this.request('/api/qr/bulk-create', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    });
  }

  async bulkUploadQRCodes(formData) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseURL}/api/qr/bulk-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Analytics
  async getAnalytics(timeRange = '30d') {
    return this.request(`/api/analytics?timeRange=${timeRange}`);
  }

  async getQRCodeAnalytics(qrCodeId) {
    return this.request(`/api/analytics/qr/${qrCodeId}`);
  }

  async getDashboardStats() {
    return this.request('/api/analytics/dashboard');
  }

  // Subscription Management
  async getSubscription() {
    return this.request('/api/subscription');
  }

  async createSubscription(planId) {
    return this.request('/api/subscription/create', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  async cancelSubscription() {
    return this.request('/api/subscription/cancel', {
      method: 'POST',
    });
  }

  async updateSubscription(planId) {
    return this.request('/api/subscription/update', {
      method: 'PUT',
      body: JSON.stringify({ planId }),
    });
  }

  async getSubscriptionPlans() {
    return this.request('/api/subscription/plans');
  }

  // Payment Integration
  async createPaymentOrder(amount, currency = 'INR') {
    return this.request('/api/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    });
  }

  async verifyPayment(paymentId, orderId, signature) {
    return this.request('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify({ paymentId, orderId, signature }),
    });
  }

  // User Management
  async getUserProfile() {
    return this.request('/api/user/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getUserUsage() {
    return this.request('/api/user/usage');
  }

  // Export/Download
  async exportQRCodes(format = 'pdf', qrCodeIds = []) {
    return this.request('/api/qr/export', {
      method: 'POST',
      body: JSON.stringify({ format, qrCodeIds }),
    });
  }

  async downloadQRCode(id, format = 'png') {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseURL}/api/qr/${id}/download?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download QR code: ${response.status}`);
    }

    return response.blob();
  }

  // Utility Methods
  async checkApiHealth() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getApiLimits() {
    return this.request('/api/limits');
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;

// Hook for using API service with auth context
export const useApiService = () => {
  const { getToken } = useAuth();
  
  const authenticatedRequest = async (endpoint, options = {}) => {
    const token = await getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  };

  return {
    // QR Code Management
    createQRCode: (qrData) => authenticatedRequest('/api/qr/create', {
      method: 'POST',
      body: JSON.stringify(qrData),
    }),
    
    getQRCodes: (page = 1, limit = 10, search = '') => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });
      return authenticatedRequest(`/api/qr/list?${params}`);
    },
    
    getQRCodeById: (id) => authenticatedRequest(`/api/qr/${id}`),
    
    updateQRCode: (id, qrData) => authenticatedRequest(`/api/qr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(qrData),
    }),
    
    deleteQRCode: (id) => authenticatedRequest(`/api/qr/${id}`, {
      method: 'DELETE',
    }),
    
    bulkCreateQRCodes: (bulkData) => authenticatedRequest('/api/qr/bulk-create', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    }),
    
    // Analytics
    getAnalytics: (timeRange = '30d') => authenticatedRequest(`/api/analytics?timeRange=${timeRange}`),
    
    getQRCodeAnalytics: (qrCodeId) => authenticatedRequest(`/api/analytics/qr/${qrCodeId}`),
    
    getDashboardStats: () => authenticatedRequest('/api/analytics/dashboard'),
    
    // Subscription
    getSubscription: () => authenticatedRequest('/api/subscription'),
    
    createSubscription: (planId) => authenticatedRequest('/api/subscription/create', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
    
    getSubscriptionPlans: () => authenticatedRequest('/api/subscription/plans'),
    
    // User
    getUserProfile: () => authenticatedRequest('/api/user/profile'),
    
    getUserUsage: () => authenticatedRequest('/api/user/usage'),
    
    // Utility
    checkApiHealth: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        return response.ok;
      } catch (error) {
        return false;
      }
    },
  };
}; 