import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentTest.css';

const PaymentTest = () => {
    // Create axios instance with base URL
    const api = axios.create({
        baseURL: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
        timeout: 10000,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    // Request interceptor
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            
            console.log('📤 API Request:', {
                method: config.method?.toUpperCase(),
                url: config.url,
                fullUrl: config.baseURL + config.url,
                data: config.data
            });
            
            return config;
        },
        (error) => {
            console.error('❌ Request error:', error);
            return Promise.reject(error);
        }
    );

    // Response interceptor
    api.interceptors.response.use(
        (response) => {
            console.log('📥 API Response:', {
                status: response.status,
                url: response.config.url,
                data: response.data
            });
            return response;
        },
        (error) => {
            console.error('❌ Response error:', {
                message: error.message,
                status: error.response?.status,
                url: error.config?.url,
                data: error.response?.data
            });
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            
            return Promise.reject(error);
        }
    );

    // Payment state
    const [paymentData, setPaymentData] = useState({
        invoiceId: 12,
        amount: 1500000,
        description: 'Test Payment for Hotel Booking'
    });

    // QR and Transfer state
    const [qrCode, setQrCode] = useState('');
    const [qrData, setQrData] = useState(null);
    const [transferInfo, setTransferInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('Ready to Generate QR');
    const [paymentId, setPaymentId] = useState(null);
    const [expiryTime, setExpiryTime] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);

    // Refund state
    const [refunds, setRefunds] = useState([]);
    const [refundEligibility, setRefundEligibility] = useState(null);
    const [showRefundForm, setShowRefundForm] = useState(false);
    const [refundFormData, setRefundFormData] = useState({
        refundAmount: '',
        refundReason: 'Customer request',
        processedBy: 1
    });
    const [refundLoading, setRefundLoading] = useState(false);

    // Test section state
    const [testSection, setTestSection] = useState('payment'); // 'payment', 'refund'

    // Timer effect for countdown
    useEffect(() => {
        let interval = null;
        
        if (expiryTime) {
            interval = setInterval(() => {
                const now = new Date();
                const expiry = new Date(expiryTime);
                const diff = expiry - now;
                
                if (diff > 0) {
                    const minutes = Math.floor(diff / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);
                    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setTimeRemaining('Expired');
                    setPaymentStatus('QR Code Expired');
                    clearInterval(interval);
                }
            }, 1000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [expiryTime]);

    // Auto check payment status
    useEffect(() => {
        let autoCheckInterval = null;
        
        if (paymentId && paymentStatus === 'QR Generated' && timeRemaining !== 'Expired') {
            autoCheckInterval = setInterval(() => {
                checkPaymentStatus();
            }, 5000); // Check every 5 seconds
        }
        
        return () => {
            if (autoCheckInterval) clearInterval(autoCheckInterval);
        };
    }, [paymentId, paymentStatus, timeRemaining]);

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
                setExpiryTime(response.data.expiryTime);
                setPaymentStatus('QR Generated');
                
                console.log('✅ QR Generated:', response.data);
                await loadRefundEligibility(response.data.paymentId);
            } else {
                setPaymentStatus(`Error: ${response.data.error}`);
            }
        } catch (error) {
            console.error('QR Generation Error:', error);
            setPaymentStatus(`Error: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const checkPaymentStatus = async () => {
        if (!paymentId) return;
        
        try {
            const response = await api.get(`/api/payment/realtime/${paymentId}`);
            
            if (response.data.success) {
                const payment = response.data.payment;
                console.log('💳 Payment Status Check:', payment);
                
                if (payment.paymentStatus === 'completed') {
                    setPaymentStatus('Payment Completed! ✅');
                    await loadRefunds(paymentId);
                    await loadRefundEligibility(paymentId);
                } else if (response.data.autoVerified) {
                    setPaymentStatus('Payment Auto-Verified! ✅');
                    await loadRefunds(paymentId);
                    await loadRefundEligibility(paymentId);
                } else {
                    setPaymentStatus(`Status: ${payment.paymentStatus} (Checking...)`);
                }
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    };

    const manualVerify = async () => {
        if (!paymentId) return;
        
        try {
            setLoading(true);
            setPaymentStatus('Verifying Payment...');
            
            const mockTransactionId = `MANUAL_${Date.now()}`;
            
            const response = await api.post('/api/payment/vietqr/verify', {
                paymentId: paymentId,
                transactionId: mockTransactionId,
                amount: paymentData.amount,
                content: `HOTELHUB INV${paymentData.invoiceId}`,
                verificationMethod: 'manual'
            });
            
            if (response.data.success) {
                setPaymentStatus('Payment Verified Manually! ✅');
                await loadRefunds(paymentId);
                await loadRefundEligibility(paymentId);
            } else {
                setPaymentStatus(`Verification Failed: ${response.data.error}`);
            }
        } catch (error) {
            console.error('Manual verification error:', error);
            setPaymentStatus(`Verification Error: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const forceVerify = async () => {
        if (!paymentId) return;
        
        try {
            setLoading(true);
            setPaymentStatus('Force Verifying...');
            
            const response = await api.post(`/api/payment/force-verify/${paymentId}`);
            
            if (response.data.success) {
                setPaymentStatus('Payment Force Verified! ✅');
                await loadRefunds(paymentId);
                await loadRefundEligibility(paymentId);
            } else {
                setPaymentStatus(`Force Verification Failed: ${response.data.error}`);
            }
        } catch (error) {
            console.error('Force verification error:', error);
            setPaymentStatus(`Force Verification Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Load refund eligibility
    const loadRefundEligibility = async (paymentIdToCheck) => {
        try {
            const response = await api.get(`/api/payment/${paymentIdToCheck}/refund-eligibility`);
            if (response.data.success) {
                setRefundEligibility(response.data.data);
                
                console.log('💰 Refund Eligibility Debug:', {
                    totalAmount: response.data.data.totalAmount,
                    totalAmountType: typeof response.data.data.totalAmount,
                    formatted: response.data.data.totalAmount?.toLocaleString('vi-VN'),
                    paymentDataAmount: paymentData.amount,
                    paymentDataAmountType: typeof paymentData.amount
                });
                
                console.log('💰 Refund Eligibility:', response.data.data);
            }
        } catch (error) {
            console.error('Error loading refund eligibility:', error);
        }
    };

    // Load refunds for payment
    const loadRefunds = async (paymentIdToCheck) => {
        try {
            const response = await api.get(`/api/payment/${paymentIdToCheck}/refunds`);
            if (response.data.success) {
                setRefunds(response.data.data);
                console.log('💰 Refunds:', response.data.data);
            }
        } catch (error) {
            console.error('Error loading refunds:', error);
        }
    };

    // Create refund request
    const createRefund = async () => {
        if (!paymentId) return;
        
        try {
            setRefundLoading(true);
            
            const response = await api.post(`/api/payment/${paymentId}/refund`, {
                refundAmount: parseFloat(refundFormData.refundAmount) || undefined,
                refundReason: refundFormData.refundReason,
                processedBy: refundFormData.processedBy
            });
            
            if (response.data.success) {
                alert('Yêu cầu hoàn tiền được tạo thành công!');
                setShowRefundForm(false);
                await loadRefunds(paymentId);
                await loadRefundEligibility(paymentId);
                setRefundFormData({
                    refundAmount: '',
                    refundReason: 'Customer request',
                    processedBy: 1
                });
            } else {
                alert(`Lỗi tạo yêu cầu hoàn tiền: ${response.data.message}`);
            }
        } catch (error) {
            console.error('Create refund error:', error);
            alert(`Lỗi: ${error.response?.data?.message || error.message}`);
        } finally {
            setRefundLoading(false);
        }
    };

    // Get refund status color
    const getRefundStatusColor = (status) => {
        const colorMap = {
            'pending': '#ffc107',
            'processing': '#fd7e14', 
            'completed': '#28a745',
            'failed': '#dc3545',
            'cancelled': '#6c757d'
        };
        return colorMap[status] || '#6c757d';
    };

    // Load existing payment by ID for testing
    const loadExistingPayment = async () => {
        const inputPaymentId = prompt('Enter Payment ID to load:');
        if (!inputPaymentId) return;

        try {
            setLoading(true);
            
            const url = `/api/payment/status/${inputPaymentId}`;
            console.log('🔍 Loading payment from URL:', url);
            
            const response = await api.get(url);
            
            if (response.data.success) {
                const payment = response.data.payment;
                setPaymentId(payment.paymentId);
                setPaymentStatus(`Loaded Payment: ${payment.paymentStatus}`);
                
                // Update paymentData với thông tin từ payment
                setPaymentData(prev => ({
                    ...prev,
                    invoiceId: payment.invoiceId || prev.invoiceId,
                    amount: payment.amount || prev.amount,
                    description: payment.notes || prev.description
                }));
                
                if (payment.qrCodeUrl) {
                    setQrCode(payment.qrCodeUrl);
                }
                
                console.log('📥 Loading refund data for existing payment...');
                await loadRefunds(payment.paymentId);
                await loadRefundEligibility(payment.paymentId);
                
                console.log('✅ Loaded existing payment:', payment);
                
                if (payment.paymentStatus === 'completed') {
                    setTestSection('refund');
                    alert(`Payment loaded successfully!\nID: ${payment.paymentId}\nStatus: ${payment.paymentStatus}\nAmount: ${(payment.amount || 0).toLocaleString('vi-VN')}đ\n\n🎯 Switched to Refund Testing tab!`);
                } else {
                    alert(`Payment loaded successfully!\nID: ${payment.paymentId}\nStatus: ${payment.paymentStatus}\nAmount: ${(payment.amount || 0).toLocaleString('vi-VN')}đ\n\n💡 Use Force Verify to enable full refund testing.`);
                }
            } else {
                alert(`Payment not found: ${response.data.message}`);
            }
        } catch (error) {
            console.error('❌ Load payment error:', error);
            
            let errorMessage = 'Error loading payment';
            if (error.response?.status === 404) {
                errorMessage = `Payment ID ${inputPaymentId} not found in database`;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else {
                errorMessage = error.message;
            }
            
            alert(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Check available payments
    const checkAvailablePayments = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/payment/test/invoices');
            
            if (response.data.success) {
                const invoices = response.data.invoices;
                const invoiceList = invoices.map(inv => 
                    `Invoice ${inv.InvoiceID} - ${inv.TotalAmount?.toLocaleString('vi-VN')}đ - Status: ${inv.PaymentStatus}`
                ).join('\n');
                
                alert(`Available Invoices for Testing:\n\n${invoiceList}\n\nNote: Use these Invoice IDs to create payments, then you can load the Payment IDs.`);
            }
        } catch (error) {
            console.error('Error checking available payments:', error);
            alert('Error checking available payments: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Function để get amount từ nhiều nguồn
    const getDisplayAmount = () => {
        if (refundEligibility && refundEligibility.totalAmount) {
            return refundEligibility.totalAmount;
        }
        
        if (paymentData && paymentData.amount) {
            return paymentData.amount;
        }
        
        return 0;
    };

    // Function để get invoice ID từ nhiều nguồn  
    const getDisplayInvoiceId = () => {
        if (refundEligibility && refundEligibility.invoiceId) {
            return refundEligibility.invoiceId;
        }
        
        if (paymentData && paymentData.invoiceId) {
            return paymentData.invoiceId;
        }
        
        return 'N/A';
    };

    const reset = () => {
        setQrCode('');
        setQrData(null);
        setTransferInfo(null);
        setPaymentStatus('Ready to Generate QR');
        setPaymentId(null);
        setExpiryTime(null);
        setTimeRemaining(null);
        setRefunds([]);
        setRefundEligibility(null);
        setShowRefundForm(false);
        setRefundFormData({
            refundAmount: '',
            refundReason: 'Customer request',
            processedBy: 1
        });
    };

    return (
        <div className="payment-test-container">
            <div className="payment-test-header">
                <h1>🧪 Payment System Test</h1>
                <p>Test VietQR payment generation, verification, and refund functionality</p>
            </div>

            {/* Test Section Navigation */}
            <div className="test-section">
                <h2>🎯 Test Sections</h2>
                <div className="section-tabs">
                    <button 
                        className={`tab-btn ${testSection === 'payment' ? 'active' : ''}`}
                        onClick={() => setTestSection('payment')}
                    >
                        💳 Payment Testing
                    </button>
                    <button 
                        className={`tab-btn ${testSection === 'refund' ? 'active' : ''}`}
                        onClick={() => setTestSection('refund')}
                        disabled={!paymentId}
                    >
                        💰 Refund Testing
                    </button>
                </div>
                
                <div className="tab-status">
                    {!paymentId && (
                        <div className="alert alert-info">
                            <small>💡 Tạo payment trước để enable Refund Testing</small>
                        </div>
                    )}
                    {paymentId && !paymentStatus.includes('✅') && (
                        <div className="alert alert-warning">
                            <small>⚠️ Payment đã tạo. Verify payment để test đầy đủ chức năng refund</small>
                        </div>
                    )}
                    {paymentId && paymentStatus.includes('✅') && (
                        <div className="alert alert-success">
                            <small>✅ Payment completed! Có thể test đầy đủ chức năng refund</small>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Configuration */}
            {testSection === 'payment' && (
                <>
                    <div className="test-section">
                        <h2>📝 Payment Configuration</h2>
                        <div className="config-form">
                            <div className="form-group">
                                <label>Invoice ID:</label>
                                <input
                                    type="number"
                                    value={paymentData.invoiceId}
                                    onChange={(e) => setPaymentData({...paymentData, invoiceId: parseInt(e.target.value)})}
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Amount (VND):</label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({...paymentData, amount: parseInt(e.target.value)})}
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description:</label>
                                <input
                                    type="text"
                                    value={paymentData.description}
                                    onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="test-section">
                        <h2>⚡ Actions</h2>
                        <div className="action-buttons">
                            <button 
                                onClick={generateVietQR} 
                                disabled={loading}
                                className="btn btn-primary"
                            >
                                {loading ? '⏳ Generating...' : '🎯 Generate VietQR'}
                            </button>
                            
                            {paymentId && (
                                <>
                                    <button 
                                        onClick={checkPaymentStatus}
                                        disabled={loading}
                                        className="btn btn-info"
                                    >
                                        🔍 Check Status
                                    </button>
                                    <button 
                                        onClick={manualVerify}
                                        disabled={loading}
                                        className="btn btn-warning"
                                    >
                                        ✅ Manual Verify
                                    </button>
                                    <button 
                                        onClick={forceVerify}
                                        disabled={loading}
                                        className="btn btn-danger"
                                    >
                                        💪 Force Verify
                                    </button>
                                </>
                            )}
                            
                            <button 
                                onClick={loadExistingPayment}
                                disabled={loading}
                                className="btn btn-secondary"
                            >
                                📥 Load Payment
                            </button>

                            <button 
                                onClick={checkAvailablePayments}
                                disabled={loading}
                                className="btn btn-info"
                            >
                                📋 Check Available Invoices
                            </button>
                            
                            <button 
                                onClick={reset}
                                className="btn btn-secondary"
                            >
                                🔄 Reset
                            </button>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div className="test-section">
                        <h2>📊 Status</h2>
                        <div className="status-display">
                            <div className={`status-item ${paymentStatus.includes('✅') ? 'success' : paymentStatus.includes('Error') ? 'error' : 'info'}`}>
                                <strong>Payment Status:</strong> {paymentStatus}
                            </div>
                            {paymentId && (
                                <div className="status-item info">
                                    <strong>Payment ID:</strong> {paymentId}
                                </div>
                            )}
                            {timeRemaining && (
                                <div className={`status-item ${timeRemaining === 'Expired' ? 'error' : 'warning'}`}>
                                    <strong>Time Remaining:</strong> {timeRemaining}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QR Code Display */}
                    {qrCode && (
                        <div className="test-section">
                            <h2>📱 QR Code</h2>
                            <div className="qr-display">
                                <img src={qrCode} alt="VietQR Code" className="qr-image" />
                                <div className="qr-info">
                                    <p><strong>Scan this QR code with your banking app</strong></p>
                                    <p>QR will expire in: <span className="timer">{timeRemaining}</span></p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transfer Information */}
                    {transferInfo && (
                        <div className="test-section">
                            <h2>💳 Transfer Information</h2>
                            <div className="transfer-info">
                                <div className="info-row">
                                    <span className="label">Bank:</span>
                                    <span className="value">{transferInfo.bankName || 'MB Bank'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Account Number:</span>
                                    <span className="value">{transferInfo.accountNo}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Account Name:</span>
                                    <span className="value">{transferInfo.accountName}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Amount:</span>
                                    <span className="value amount">{transferInfo.amount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Content:</span>
                                    <span className="value content">{transferInfo.content}</span>
                                </div>
                                <div className="info-row note">
                                    <span className="label">Note:</span>
                                    <span className="value">{transferInfo.note}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Refund Testing Section */}
            {testSection === 'refund' && paymentId && (
                <div className="test-section">
                    <h2>💰 Refund Management</h2>
                    
                    {/* Payment Info Summary */}
                    <div className="payment-summary">
                        <h3>📋 Payment Information</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="label">Payment ID:</span>
                                <span className="value">{paymentId}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Status:</span>
                                <span className={`value ${paymentStatus.includes('✅') ? 'success' : 'warning'}`}>
                                    {paymentStatus}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="label">Amount:</span>
                                <span className="value">
                                    {getDisplayAmount().toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="label">Invoice ID:</span>
                                <span className="value">
                                    {getDisplayInvoiceId()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Refund Actions */}
                    <div className="refund-actions-section">
                        <h3>⚡ Refund Actions</h3>
                        <div className="action-buttons">
                            <button 
                                onClick={() => loadRefundEligibility(paymentId)}
                                className="btn btn-info"
                                disabled={refundLoading}
                            >
                                🔍 Check Refund Eligibility
                            </button>
                            
                            <button 
                                onClick={() => loadRefunds(paymentId)}
                                className="btn btn-info"
                                disabled={refundLoading}
                            >
                                📋 Load Refunds
                            </button>

                            {!paymentStatus.includes('✅') && (
                                <button 
                                    onClick={forceVerify}
                                    className="btn btn-warning"
                                    disabled={loading}
                                >
                                    💪 Force Verify (for testing)
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Refund Eligibility */}
                    {refundEligibility && (
                        <div className="refund-eligibility">
                            <h3>📋 Refund Eligibility</h3>
                            <div className="eligibility-info">
                                <div className="info-row">
                                    <span className="label">Can Refund:</span>
                                    <span className={`value ${refundEligibility.canRefund ? 'success' : 'error'}`}>
                                        {refundEligibility.canRefund ? '✅ Yes' : '❌ No'}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Reason:</span>
                                    <span className="value">{refundEligibility.eligibilityReason}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Total Amount:</span>
                                    <span className="value">
                                        {(refundEligibility.totalAmount || 0).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Total Refunded:</span>
                                    <span className="value">
                                        {(refundEligibility.totalRefunded || 0).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Available for Refund:</span>
                                    <span className="value amount">
                                        {(refundEligibility.availableRefundAmount || 0).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Refund Count:</span>
                                    <span className="value">{refundEligibility.refundCount || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Refund Actions */}
                    {refundEligibility?.canRefund && (
                        <div className="refund-actions">
                            <button 
                                onClick={() => setShowRefundForm(!showRefundForm)}
                                className="btn btn-warning"
                                disabled={refundLoading}
                            >
                                {showRefundForm ? '❌ Cancel Refund' : '💰 Request Refund'}
                            </button>
                        </div>
                    )}

                    {/* Refund Form */}
                    {showRefundForm && (
                        <div className="refund-form">
                            <h3>📝 Create Refund Request</h3>
                            <div className="form-group">
                                <label>Refund Amount (VND):</label>
                                <input
                                    type="number"
                                    value={refundFormData.refundAmount}
                                    onChange={(e) => setRefundFormData({
                                        ...refundFormData, 
                                        refundAmount: e.target.value
                                    })}
                                    placeholder={`Max: ${refundEligibility?.availableRefundAmount || 0}`}
                                    max={refundEligibility?.availableRefundAmount || 0}
                                    disabled={refundLoading}
                                />
                                <small>Leave empty to refund full available amount</small>
                            </div>
                            <div className="form-group">
                                <label>Refund Reason:</label>
                                <select
                                    value={refundFormData.refundReason}
                                    onChange={(e) => setRefundFormData({
                                        ...refundFormData, 
                                        refundReason: e.target.value
                                    })}
                                    disabled={refundLoading}
                                >
                                    <option value="Customer request">Customer request</option>
                                    <option value="Booking cancelled">Booking cancelled</option>
                                    <option value="System error">System error</option>
                                    <option value="Duplicate payment">Duplicate payment</option>
                                    <option value="Service not provided">Service not provided</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Processed By (User ID):</label>
                                <input
                                    type="number"
                                    value={refundFormData.processedBy}
                                    onChange={(e) => setRefundFormData({
                                        ...refundFormData, 
                                        processedBy: parseInt(e.target.value)
                                    })}
                                    disabled={refundLoading}
                                />
                            </div>
                            <div className="form-actions">
                                <button 
                                    onClick={createRefund}
                                    className="btn btn-primary"
                                    disabled={refundLoading}
                                >
                                    {refundLoading ? '⏳ Creating...' : '💰 Create Refund'}
                                </button>
                                <button 
                                    onClick={() => setShowRefundForm(false)}
                                    className="btn btn-secondary"
                                    disabled={refundLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Refunds List */}
                    {refunds.length > 0 && (
                        <div className="refunds-list">
                            <h3>📋 Refund History</h3>
                            <div className="refunds-table">
                                {refunds.map((refund, index) => (
                                    <div key={refund.refundId || index} className="refund-item">
                                        <div className="refund-header">
                                            <span className="refund-id">#{refund.refundId}</span>
                                            <span 
                                                className="refund-status"
                                                style={{ color: getRefundStatusColor(refund.refundStatus) }}
                                            >
                                                {refund.refundStatusDisplayName || refund.refundStatus}
                                            </span>
                                        </div>
                                        <div className="refund-details">
                                            <div className="info-row">
                                                <span className="label">Amount:</span>
                                                <span className="value amount">
                                                    {refund.refundAmount?.toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Reason:</span>
                                                <span className="value">{refund.refundReason}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Created:</span>
                                                <span className="value">
                                                    {new Date(refund.createdAt).toLocaleString('vi-VN')}
                                                </span>
                                            </div>
                                            {refund.refundDate && (
                                                <div className="info-row">
                                                    <span className="label">Refund Date:</span>
                                                    <span className="value">
                                                        {new Date(refund.refundDate).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                            )}
                                            {refund.refundTransactionId && (
                                                <div className="info-row">
                                                    <span className="label">Transaction ID:</span>
                                                    <span className="value">{refund.refundTransactionId}</span>
                                                </div>
                                            )}
                                            {refund.processedByName && (
                                                <div className="info-row">
                                                    <span className="label">Processed By:</span>
                                                    <span className="value">{refund.processedByName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No refunds message */}
                    {refunds.length === 0 && refundEligibility && (
                        <div className="no-refunds">
                            <div className="alert alert-info">
                                <p>📋 No refunds found for this payment.</p>
                                {refundEligibility.canRefund && (
                                    <p>You can create a refund request using the button above.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Debug Information */}
            {qrData && (
                <div className="test-section debug-section">
                    <h2>🔧 Debug Information</h2>
                    <div className="debug-info">
                        <h3>QR Data:</h3>
                        <pre>{JSON.stringify(qrData, null, 2)}</pre>
                        
                        {refundEligibility && (
                            <>
                                <h3>Refund Eligibility:</h3>
                                <pre>{JSON.stringify(refundEligibility, null, 2)}</pre>
                            </>
                        )}
                        
                        {refunds.length > 0 && (
                            <>
                                <h3>Refunds:</h3>
                                <pre>{JSON.stringify(refunds, null, 2)}</pre>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentTest;