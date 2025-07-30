import React, { useState, useEffect } from 'react';
import { useApi } from '../services/api';
import './Subscription.css';

const Subscription = () => {
  const { getSubscription, createPaymentOrder } = useApi();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Mock data for now
      const mockSubscription = {
        plan: 'free',
        status: 'active',
        qrGenerated: 45,
        qrLimit: 100,
        validUntil: '2024-12-31'
      };
      
      const mockPlans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          qrLimit: 100,
          features: ['Basic QR Generation', 'Standard Templates', 'Email Support']
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 999,
          qrLimit: 10000,
          features: ['Advanced QR Generation', 'Custom Templates', 'Bulk Upload', 'Priority Support', 'Analytics']
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 4799,
          qrLimit: 100000,
          features: ['Unlimited QR Generation', 'Custom Branding', 'API Access', 'Dedicated Support', 'Advanced Analytics', 'White-label Solutions']
        }
      ];

      setSubscription(mockSubscription);
      setPlans(mockPlans);
      
      // Try to fetch from backend if available
      try {
        const backendSubscription = await getSubscription();
        setSubscription(backendSubscription);
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
      setError('');
      
      if (planId === 'free') {
        alert('You are already on the free plan!');
        return;
      }

      const selectedPlan = plans.find(plan => plan.id === planId);
      if (!selectedPlan) {
        setError('Invalid plan selected');
        return;
      }

      // Mock payment data for development
      const mockPaymentData = {
        key: 'rzp_test_mock_key', // Use mock key to avoid 401 errors
        amount: selectedPlan.price * 100, // Convert to paise
        currency: 'INR',
        name: 'MQRGen',
        description: `${selectedPlan.name} Plan`,
        order_id: `order_${Date.now()}`,
        prefill: {
          name: 'Test User',
          email: 'test@example.com'
        },
        theme: {
          color: '#667eea'
        },
        handler: function (response) {
          console.log('Mock payment successful:', response);
          alert('Mock payment successful! Your plan has been upgraded.');
          fetchSubscriptionData(); // Refresh subscription data
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal dismissed');
          }
        }
      };

      // Try to get real payment data from backend
      try {
        const paymentData = await createPaymentOrder({ plan: planId });
        if (paymentData && paymentData.data) {
          const options = {
            key: paymentData.data.key,
            amount: paymentData.data.amount,
            currency: paymentData.data.currency,
            name: 'MQRGen',
            description: `${selectedPlan.name} Plan`,
            order_id: paymentData.data.orderId,
            prefill: {
              name: 'Test User',
              email: 'test@example.com'
            },
            theme: {
              color: '#667eea'
            },
            handler: function (response) {
              console.log('Payment successful:', response);
              alert('Payment successful! Your plan has been upgraded.');
              fetchSubscriptionData(); // Refresh subscription data
            }
          };
          
          if (window.Razorpay) {
            const rzp = new window.Razorpay(options);
            rzp.open();
          } else {
            setError('Payment gateway not available. Please try again later.');
          }
        }
      } catch (backendError) {
        console.log('Backend not available, using mock payment');
        // Use mock data if backend fails
        if (window.Razorpay) {
          try {
            const rzp = new window.Razorpay(mockPaymentData);
            rzp.open();
          } catch (razorpayError) {
            console.error('Razorpay error:', razorpayError);
            setError('Payment gateway error. Please try again later.');
          }
        } else {
          setError('Payment gateway not available. Please try again later.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create payment order');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Subscription Plans</h2>
        </div>
        <div className="card-body">
          <div className="spinner"></div>
          <p>Loading subscription data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {/* Current Plan */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Current Plan</h2>
        </div>
        <div className="card-body">
          <div className="current-plan">
            <h3>{subscription?.plan?.charAt(0).toUpperCase() + subscription?.plan?.slice(1)} Plan</h3>
            <p>Status: <span className="status-active">{subscription?.status}</span></p>
            <p>QR Codes Generated: {subscription?.qrGenerated} / {subscription?.qrLimit}</p>
            <p>Valid Until: {subscription?.validUntil}</p>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Available Plans</h2>
        </div>
        <div className="card-body">
          <div className="plans-grid">
            {plans.map((plan) => (
              <div key={plan.id} className={`plan-card ${subscription?.plan === plan.id ? 'current' : ''}`}>
                <div className="plan-header">
                  <h3>{plan.name}</h3>
                  <div className="plan-price">
                    {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                  </div>
                </div>
                <div className="plan-features">
                  <p><strong>QR Limit:</strong> {plan.qrLimit.toLocaleString()}</p>
                  <ul>
                    {plan.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <button
                  className={`btn ${subscription?.plan === plan.id ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={subscription?.plan === plan.id}
                >
                  {subscription?.plan === plan.id ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription; 