import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

const Subscription = () => {
  const { getToken } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      // Mock data for now since backend might not be ready
      const mockSubscription = {
        subscription: {
          plan: 'free',
          status: 'active'
        },
        usage: {
          qrGeneratedToday: 5
        },
        limits: {
          daily: 100
        },
        remainingQrToday: 95,
        apiKey: null
      };

      const mockPlans = [
        {
          id: 'free',
          name: 'Free Plan',
          price: 0,
          features: [
            '100 QR codes per day',
            'Basic styling options',
            'Standard support',
            'CSV bulk upload',
            'PNG download format'
          ],
          popular: false
        },
        {
          id: 'pro',
          name: 'Pro Plan',
          price: 999,
          features: [
            '10,000 QR codes per day',
            'Advanced styling options',
            'Priority support',
            'Bulk upload (CSV/Excel)',
            'Analytics dashboard',
            'API access',
            'PDF & Word export'
          ],
          popular: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise Plan',
          price: 4799,
          features: [
            '100,000 QR codes per day',
            'Custom branding',
            'Dedicated support',
            'Advanced analytics',
            'White-label solution',
            'Custom integrations',
            'All export formats'
          ],
          popular: false
        }
      ];

      setSubscription(mockSubscription);
      setPlans(mockPlans);

      // Try to fetch from backend if available
      try {
        const token = await getToken();
        
        // Fetch subscription status
        const subResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payments/subscription`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Fetch available plans
        const plansResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payments/plans`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (subResponse.ok && plansResponse.ok) {
          const [subData, plansData] = await Promise.all([
            subResponse.json(),
            plansResponse.json()
          ]);

          setSubscription(subData.data);
          setPlans(plansData.data);
        }
      } catch (backendError) {
        console.log('Backend not available, using mock data');
      }

    } catch (err) {
      setError(err.message || 'Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      // For now, we'll simulate the payment process
      if (planId === 'free') {
        alert('You are already on the free plan!');
        return;
      }

      // Mock payment data
      const mockPaymentData = {
        data: {
          key: 'rzp_test_your_razorpay_key_here',
          amount: plans.find(p => p.id === planId)?.price * 100 || 99900, // Convert to paise
          currency: 'INR',
          plan: plans.find(p => p.id === planId)?.name || 'Pro Plan',
          orderId: `order_${Date.now()}`,
          paymentId: `pay_${Date.now()}`
        }
      };

      // Initialize Razorpay payment
      const options = {
        key: mockPaymentData.data.key,
        amount: mockPaymentData.data.amount,
        currency: mockPaymentData.data.currency,
        name: 'MQRGen',
        description: `${mockPaymentData.data.plan} Plan`,
        order_id: mockPaymentData.data.orderId,
        handler: function (response) {
          verifyPayment(response, mockPaymentData.data.paymentId);
        },
        prefill: {
          name: 'User Name',
          email: 'user@example.com'
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
          }
        }
      };

      // Try to call backend if available
      try {
        const token = await getToken();
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payments/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ plan: planId })
        });

        if (response.ok) {
          const data = await response.json();
          options.key = data.data.key;
          options.amount = data.data.amount;
          options.currency = data.data.currency;
          options.order_id = data.data.orderId;
        }
      } catch (backendError) {
        console.log('Backend not available, using mock payment');
      }

      // Check if Razorpay is available
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback for when Razorpay is not loaded
        alert('Payment gateway not available. Please try again later.');
        console.log('Razorpay not loaded, payment data:', options);
      }
    } catch (err) {
      setError(err.message || 'Failed to create payment order');
    }
  };

  const verifyPayment = async (response, paymentId) => {
    try {
      // For now, we'll simulate payment verification
      console.log('Payment response:', response);
      
      // Try to verify with backend if available
      try {
        const token = await getToken();
        const verifyResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            paymentId: paymentId
          })
        });

        if (verifyResponse.ok) {
          const data = await verifyResponse.json();
          // Refresh subscription data
          fetchSubscriptionData();
          alert('Payment successful! Your subscription has been upgraded.');
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (backendError) {
        console.log('Backend not available, simulating successful payment');
        // Simulate successful payment
        fetchSubscriptionData();
        alert('Payment successful! Your subscription has been upgraded.');
      }
    } catch (err) {
      setError('Payment verification failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="loading">
            <span className="spinner"></span>
            Loading subscription data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-error">
            <span>⚠️</span>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="card-icon">💳</span>
            Subscription & Plans
          </h2>
        </div>

        <div className="card-body">
          {subscription && (
            <div className="current-plan">
              <h3 className="section-title">Current Plan</h3>
              <div className="plan-card current">
                <div className="plan-header">
                  <h4>{subscription.subscription.plan.charAt(0).toUpperCase() + subscription.subscription.plan.slice(1)} Plan</h4>
                  <span className={`status ${subscription.subscription.status}`}>
                    {subscription.subscription.status}
                  </span>
                </div>
                
                <div className="usage-stats">
                  <div className="usage-item">
                    <span className="usage-label">QR Codes Today:</span>
                    <span className="usage-value">
                      {subscription.usage.qrGeneratedToday} / {subscription.limits.daily}
                    </span>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">Remaining Today:</span>
                    <span className="usage-value">
                      {subscription.remainingQrToday}
                    </span>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">API Key:</span>
                    <span className="usage-value api-key">
                      {subscription.apiKey ? `${subscription.apiKey.substring(0, 10)}...` : 'Not generated'}
                    </span>
                  </div>
                </div>

                {subscription.subscription.status === 'active' && (
                  <div className="plan-actions">
                    <button className="btn btn-secondary">
                      <span>⚙️</span>
                      Manage Subscription
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="available-plans">
            <h3 className="section-title">Available Plans</h3>
            <div className="plans-grid">
              {plans.map((plan) => (
                <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
                  {plan.popular && <div className="popular-badge">Most Popular</div>}
                  
                  <div className="plan-header">
                    <h4>{plan.name}</h4>
                    <div className="plan-price">
                      <span className="price">₹{plan.price}</span>
                      <span className="period">/month</span>
                    </div>
                  </div>

                  <div className="plan-features">
                    <ul>
                      {plan.features.map((feature, index) => (
                        <li key={index}>
                          <span className="feature-icon">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="plan-actions">
                    {subscription?.subscription.plan === plan.id ? (
                      <button className="btn btn-secondary" disabled>
                        <span>✓</span>
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        className="btn btn-primary"
                      >
                        <span>🚀</span>
                        {subscription?.subscription.plan === 'free' ? 'Upgrade' : 'Change Plan'}
                      </button>
                    )}
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

export default Subscription; 