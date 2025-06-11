import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentTest.css'; // Add CSS file

const PaymentTest = () => {
    const [paymentData, setPaymentData] = useState({
        invoiceId: 1,
        amount: 100000,
        description: 'Test payment for hotel booking'
    });
    const [qrCode, setQrCode] = useState('');
    const [qrData, setQrData] = useState(null);
    const [transferInfo, setTransferInfo] = useState(null);
    const [paymentUrl, setPaymentUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentId, setPaymentId] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [autoCheckInterval, setAutoCheckInterval] = useState(null);

    // Configure axios base URL
    const api = axios.create({
        baseURL: 'http://localhost:3000'
    });

    const generateVietQR = async () => {
        try {
            setLoading(true);
            setPaymentStatus('Generating QR Code...');
            
            const response = await api.post('/api/payment/vietqr/generate', {
                invoiceId: paymentData.invoiceId,
                amount: paymentData.amount,
                description: paymentData.description,
                template: 'compact'
            });
            
            if (response.data.success) {
                setQrCode(response.data.qrUrl);
                setQrData(response.data.qrData);
                setTransferInfo(response.data.transferInfo);
                setPaymentId(response.data.paymentId);
                setPaymentStatus('QR Code generated successfully! Customer can scan to pay.');
                
                // Start auto-checking payment status
                startAutoCheck(response.data.paymentId);
                
                // Start countdown timer
                startCountdown(response.data.expiryTime);
                
                console.log('Payment ID:', response.data.paymentId);
                console.log('Transfer Info:', response.data.transferInfo);
            }
        } catch (error) {
            console.error('VietQR error:', error);
            setPaymentStatus(`Failed to generate QR code: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Cập nhật hàm startAutoCheck
    const startAutoCheck = (paymentId) => {
        console.log('🔄 Starting enhanced auto-check for payment:', paymentId);
        
        let checkCount = 0;
        const maxChecks = 60; // Check for 5 minutes (60 * 5 seconds)
        
        const interval = setInterval(async () => {
            try {
                checkCount++;
                console.log(`🔍 Auto-check attempt ${checkCount}/${maxChecks}...`);
                
                // Use the enhanced real-time endpoint
                const response = await api.get(`/api/payment/realtime/${paymentId}`);
                
                if (response.data.success) {
                    const payment = response.data.payment;
                    
                    if (payment.paymentStatus === 'completed') {
                        if (response.data.autoVerified) {
                            if (response.data.webhook) {
                                setPaymentStatus('✅ Payment completed via webhook simulation!');
                            } else {
                                setPaymentStatus('✅ Payment completed automatically! Transaction found in bank.');
                            }
                        } else {
                            setPaymentStatus('✅ Payment completed successfully!');
                        }
                        clearInterval(interval);
                        setAutoCheckInterval(null);
                        console.log('✅ Payment completed - stopping auto-check');
                        
                        // Show success message
                        if (response.data.transaction) {
                            console.log('Transaction details:', response.data.transaction);
                        }
                        
                    } else if (payment.paymentStatus === 'cancelled' || payment.paymentStatus === 'failed') {
                        setPaymentStatus(`❌ Payment ${payment.paymentStatus}`);
                        clearInterval(interval);
                        setAutoCheckInterval(null);
                        console.log(`❌ Payment ${payment.paymentStatus} - stopping auto-check`);
                        
                    } else {
                        // Still pending - update status with more info
                        const timeLeft = response.data.timeRemaining;
                        const minutesLeft = timeLeft ? Math.floor(timeLeft / 60000) : null;
                        
                        setPaymentStatus(`⏳ Payment pending - ${minutesLeft ? `${minutesLeft} minutes left` : 'Checking with bank...'} (${checkCount}/${maxChecks})`);
                        
                        // If we've checked many times, suggest manual verification
                        if (checkCount > 20) {
                            setPaymentStatus(`⏳ Payment pending - Try manual verification if you've completed the transfer (${checkCount}/${maxChecks})`);
                        }
                    }
                    
                    // Stop after max checks
                    if (checkCount >= maxChecks) {
                        setPaymentStatus('⏰ Auto-check timeout. Please use manual verification if you completed the transfer.');
                        clearInterval(interval);
                        setAutoCheckInterval(null);
                    }
                }
            } catch (error) {
                console.error('❌ Auto-check error:', error);
                checkCount++;
                
                if (checkCount >= maxChecks) {
                    setPaymentStatus('❌ Auto-check failed. Please use manual verification.');
                    clearInterval(interval);
                    setAutoCheckInterval(null);
                }
            }
        }, 5000); // Check every 5 seconds

        setAutoCheckInterval(interval);
    };

    const startCountdown = (expiryTime) => {
        const interval = setInterval(() => {
            const now = new Date();
            const expiry = new Date(expiryTime);
            const remaining = expiry - now;
            
            if (remaining <= 0) {
                setTimeRemaining('Expired');
                clearInterval(interval);
            } else {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);
    };

    const manualVerifyPayment = async () => {
        if (!paymentId) {
            alert('No payment to verify');
            return;
        }

        const transactionId = prompt('Enter bank transaction ID:');
        const transferAmount = prompt('Enter transfer amount:');
        const transferContent = prompt('Enter transfer content:');

        if (!transactionId || !transferAmount || !transferContent) {
            alert('All fields are required');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/api/payment/vietqr/verify', {
                paymentId: paymentId,
                transactionId: transactionId,
                amount: parseFloat(transferAmount),
                content: transferContent,
                verificationMethod: 'manual'
            });

            if (response.data.success) {
                setPaymentStatus('✅ Payment verified successfully!');
                // Stop auto-checking
                if (autoCheckInterval) {
                    clearInterval(autoCheckInterval);
                    setAutoCheckInterval(null);
                }
            }
        } catch (error) {
            console.error('Manual verification error:', error);
            setPaymentStatus(`❌ Verification failed: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Thêm nút Force Verify cho testing
    const forceVerifyPayment = async () => {
        if (!paymentId) {
            alert('No payment to verify');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(`/api/payment/force-verify/${paymentId}`);

            if (response.data.success) {
                setPaymentStatus('✅ Payment force verified for testing!');
                // Stop auto-checking
                if (autoCheckInterval) {
                    clearInterval(autoCheckInterval);
                    setAutoCheckInterval(null);
                }
            }
        } catch (error) {
            console.error('Force verification error:', error);
            setPaymentStatus(`❌ Force verification failed: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const checkPaymentStatus = async () => {
        if (!paymentId) {
            alert('No payment to check');
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(`/api/payment/status/${paymentId}`);
            
            if (response.data.success) {
                const payment = response.data.payment;
                const statusEmojis = {
                    'pending': '⏳',
                    'completed': '✅',
                    'failed': '❌',
                    'cancelled': '🚫'
                };
                
                setPaymentStatus(`${statusEmojis[payment.paymentStatus] || '❓'} Payment status: ${payment.paymentStatus} - Amount: ${payment.amount.toLocaleString()} VND`);
                
                if (response.data.logs && response.data.logs.length > 0) {
                    console.log('Payment logs:', response.data.logs);
                }
            }
        } catch (error) {
            console.error('Check status error:', error);
            setPaymentStatus(`Failed to check payment status: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const clearData = () => {
        setQrCode('');
        setQrData(null);
        setTransferInfo(null);
        setPaymentUrl('');
        setPaymentStatus('');
        setPaymentId(null);
        setTimeRemaining(null);
        
        // Clear intervals
        if (autoCheckInterval) {
            clearInterval(autoCheckInterval);
            setAutoCheckInterval(null);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoCheckInterval) {
                clearInterval(autoCheckInterval);
            }
        };
    }, [autoCheckInterval]);

    return (
        <div className="payment-test-container">
            <div className="payment-test-header">
                <h1>🏨 Hotel Payment System Test</h1>
                <p>Test VietQR and VNPay payment integration</p>
            </div>

            {/* Payment Form */}
            <div className="payment-form">
                <h3>📋 Payment Details</h3>
                <div className="form-group">
                    <label>Invoice ID:</label>
                    <input 
                        type="number" 
                        placeholder="Invoice ID"
                        value={paymentData.invoiceId}
                        onChange={(e) => setPaymentData({...paymentData, invoiceId: parseInt(e.target.value)})}
                    />
                </div>
                <div className="form-group">
                    <label>Amount (VND):</label>
                    <input 
                        type="number" 
                        placeholder="Amount in VND"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({...paymentData, amount: parseInt(e.target.value)})}
                    />
                </div>
                <div className="form-group">
                    <label>Description:</label>
                    <input 
                        type="text" 
                        placeholder="Payment description"
                        value={paymentData.description}
                        onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                    />
                </div>
            </div>

            {/* VietQR Payment */}
            <div className="payment-method">
                <h3>📱 VietQR Payment</h3>
                <p>Generate QR code for bank transfer</p>
                <button 
                    onClick={generateVietQR} 
                    disabled={loading}
                    className="btn btn-primary"
                >
                    {loading ? '⏳ Generating...' : '🏦 Generate VietQR Code'}
                </button>
                
                {qrCode && (
                    <div className="qr-code-section">
                        <div className="qr-header">
                            <h4>Scan this QR code to pay:</h4>
                            {timeRemaining && (
                                <div className="qr-timer">
                                    ⏰ Expires in: <strong>{timeRemaining}</strong>
                                </div>
                            )}
                        </div>
                        
                        <img src={qrCode} alt="QR Code" className="qr-image" />
                        
                        {transferInfo && (
                            <div className="transfer-info">
                                <h5>💳 Transfer Information:</h5>
                                <div className="info-row">
                                    <span>Bank:</span>
                                    <strong>{qrData?.bankName}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Account Number:</span>
                                    <strong>{transferInfo.accountNo}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Account Name:</span>
                                    <strong>{transferInfo.accountName}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Amount:</span>
                                    <strong className="amount">{transferInfo.amount}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Content:</span>
                                    <strong className="content">{transferInfo.content}</strong>
                                </div>
                                <div className="transfer-note">
                                    <small>⚠️ {transferInfo.note}</small>
                                </div>
                            </div>
                        )}

                        <div className="qr-actions">
                            <button 
                                onClick={manualVerifyPayment}
                                className="btn btn-success"
                                disabled={loading}
                            >
                                ✅ Manual Verify Payment
                            </button>
                            <button 
                                onClick={forceVerifyPayment}
                                className="btn btn-warning"
                                disabled={loading}
                            >
                                🚀 Force Verify (Testing)
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Status */}
            <div className="payment-status">
                <h3>📊 Payment Status</h3>
                <button 
                    onClick={checkPaymentStatus} 
                    disabled={loading || !paymentId}
                    className="btn btn-info"
                >
                    {loading ? '⏳ Checking...' : '🔍 Check Payment Status'}
                </button>
                <button 
                    onClick={clearData}
                    className="btn btn-secondary"
                >
                    🧹 Clear Data
                </button>
                
                {paymentStatus && (
                    <div className="status-message">
                        <p>{paymentStatus}</p>
                        {autoCheckInterval && (
                            <small>🔄 Auto-checking payment status every 10 seconds...</small>
                        )}
                    </div>
                )}
            </div>

            {/* Test Info */}
            <div className="test-info">
                <h3>ℹ️ Testing Instructions</h3>
                <div className="instruction-steps">
                    <div className="step">
                        <h4>📱 Step 1: Generate QR Code</h4>
                        <p>Click "Generate VietQR Code" to create a payment QR</p>
                    </div>
                    <div className="step">
                        <h4>🏦 Step 2: Bank Transfer</h4>
                        <p>Use your banking app to scan QR or transfer manually</p>
                        <ul>
                            <li>✅ Scan QR code with banking app</li>
                            <li>✅ Check transfer details automatically filled</li>
                            <li>✅ Confirm the transfer</li>
                        </ul>
                    </div>
                    <div className="step">
                        <h4>✅ Step 3: Verification</h4>
                        <p>Payment will be auto-verified or manually confirmed</p>
                        <ul>
                            <li>🔄 System checks automatically every 10 seconds</li>
                            <li>📱 Or use "Manual Verify" button</li>
                            <li>📋 Enter transaction details from your bank app</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentTest;