import React, { useState, useEffect } from 'react';
import './QRPaymentModal.css';

const QRPaymentModal = ({ 
    isOpen, 
    onClose, 
    paymentAmount, 
    paymentMethod,
    onPaymentSuccess,
    invoiceId
}) => {
    // ✅ SỬA: LUÔN KHAI BÁO TẤT CẢ HOOKS Ở ĐẦU, KHÔNG CONDITIONAL
    const [qrCode, setQrCode] = useState('');
    const [qrData, setQrData] = useState(null);
    const [transferInfo, setTransferInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [paymentId, setPaymentId] = useState(null);
    const [expiryTime, setExpiryTime] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);

    // ✅ SỬA: Debug effect - LUÔN CHẠY
    useEffect(() => {
        console.log('🔧 QRPaymentModal props changed:', {
            isOpen,
            paymentAmount,
            paymentMethod,
            invoiceId
        });
    }, [isOpen, paymentAmount, paymentMethod, invoiceId]);

    // ✅ SỬA: Generate QR Code sử dụng PaymentService backend
    const generateQRCode = async () => {
        if (!paymentAmount || !invoiceId) {
            console.error('❌ Missing required data for QR generation');
            setError('Thiếu thông tin cần thiết để tạo mã QR');
            return;
        }

        try {
            setLoading(true);
            setError('');
            console.log('🔄 Generating VietQR code...');

            const response = await fetch('http://localhost:3000/api/payment/vietqr/generate', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    invoiceId: invoiceId,
                    amount: paymentAmount,
                    description: `Thanh toan hoa don ${invoiceId}`,
                    template: 'compact'
                })
            });

            const result = await response.json();
            console.log('📡 QR generation response:', result);

            if (response.ok && result.success) {
                setQrCode(result.qrUrl);
                setQrData(result.qrData);
                setTransferInfo(result.transferInfo);
                setPaymentId(result.paymentId);
                
                if (result.expiryTime) {
                    setExpiryTime(result.expiryTime);
                    startCountdown(result.expiryTime);
                }
                
                console.log('✅ QR code generated successfully');
            } else {
                throw new Error(result.error || 'Không thể tạo mã QR');
            }
        } catch (error) {
            console.error('❌ QR generation failed:', error);
            setError('Không thể tạo mã QR: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ SỬA: Countdown timer function
    const startCountdown = (expiryTimeISO) => {
        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiryTimeISO).getTime();
            const difference = expiry - now;

            if (difference > 0) {
                setTimeRemaining(difference);
                setTimeout(updateTimer, 1000);
            } else {
                setTimeRemaining(0);
                setPaymentStatus('expired');
            }
        };
        updateTimer();
    };

    // ✅ SỬA: Auto check payment status
    const checkPaymentStatus = async () => {
        if (!paymentId) return;

        try {
            const response = await fetch(`http://localhost:3000/api/payment/status/${paymentId}`, {
                method: 'GET',
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const payment = result.payment;
                
                if (payment.paymentStatus === 'completed') {
                    setPaymentStatus('completed');
                    handlePaymentComplete();
                } else if (payment.isExpired) {
                    setPaymentStatus('expired');
                }
            }
        } catch (error) {
            console.error('❌ Error checking payment status:', error);
        }
    };

    // ✅ SỬA: Force verify payment (for testing)
    const forceVerifyPayment = async () => {
        if (!paymentId) return;

        try {
            setLoading(true);
            
            const response = await fetch(`http://localhost:3000/api/payment/force-verify/${paymentId}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setPaymentStatus('completed');
                handlePaymentComplete();
            } else {
                setError(result.message || 'Không thể xác minh thanh toán');
            }
        } catch (error) {
            console.error('❌ Force verify error:', error);
            setError('Lỗi khi xác minh thanh toán');
        } finally {
            setLoading(false);
        }
    };

    // ✅ SỬA: Enhanced copy to clipboard
    const copyToClipboard = (text, buttonElement) => {
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="fas fa-check"></i> Đã copy';
                buttonElement.classList.add('copied');
                
                setTimeout(() => {
                    buttonElement.innerHTML = originalText;
                    buttonElement.classList.remove('copied');
                }, 2000);
            }
        }).catch(err => {
            console.error('Copy failed:', err);
        });
    };

    // ✅ SỬA: Handle payment completion
    const handlePaymentComplete = () => {
        if (onPaymentSuccess) {
            onPaymentSuccess({
                paymentId: paymentId,
                amount: paymentAmount,
                method: paymentMethod,
                status: 'completed',
                completedAt: new Date()
            });
        }
    };

    // ✅ Format time remaining
    const formatTimeRemaining = (milliseconds) => {
        if (!milliseconds || milliseconds <= 0) return '00:00';
        
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // ✅ SỬA: Auto-generate QR when modal opens - LUÔN CHẠY
    useEffect(() => {
        if (isOpen && paymentMethod === 'VietQR' && paymentAmount && invoiceId) {
            // Reset states khi mở modal
            setQrCode('');
            setQrData(null);
            setTransferInfo(null);
            setError('');
            setPaymentStatus('pending');
            setPaymentId(null);
            setExpiryTime(null);
            setTimeRemaining(null);
            
            // Generate QR code
            generateQRCode();
        }
    }, [isOpen, paymentMethod, paymentAmount, invoiceId]);

    // ✅ SỬA: Auto-check payment status periodically - LUÔN CHẠY
    useEffect(() => {
        let interval;
        
        if (paymentId && paymentStatus === 'pending') {
            interval = setInterval(checkPaymentStatus, 10000); // Check every 10 seconds
        }
        
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [paymentId, paymentStatus]);

    // ✅ SỬA: KIỂM TRA isOpen SAU KHI KHAI BÁO TẤT CẢ HOOKS
    if (!isOpen) {
        return null;
    }

    console.log('🔧 QRPaymentModal rendering modal content...');

    return (
        <div className="qr-modal-overlay" onClick={onClose}>
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="qr-modal-header">
                    <h3>
                        <i className="fas fa-qrcode"></i>
                        Thanh toán VietQR
                    </h3>
                    <button
                        type="button"
                        className="qr-modal-close"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="qr-modal-body">
                    {loading && (
                        <div className="qr-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Đang tạo mã QR...</p>
                        </div>
                    )}

                    {error && (
                        <div className="qr-error">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>{error}</p>
                            <button 
                                className="btn btn-primary"
                                onClick={generateQRCode}
                                disabled={loading}
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {!loading && !error && qrCode && (
                        <>
                            {/* Payment Status */}
                            <div className={`payment-status ${paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
                                {paymentStatus === 'completed' ? (
                                    <>
                                        <i className="fas fa-check-circle"></i>
                                        <p>Thanh toán thành công!</p>
                                    </>
                                ) : paymentStatus === 'expired' ? (
                                    <>
                                        <i className="fas fa-clock"></i>
                                        <p>Mã QR đã hết hạn</p>
                                        <small>Vui lòng tạo mã mới</small>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-clock"></i>
                                        <p>Đang chờ thanh toán...</p>
                                        {timeRemaining && (
                                            <small>Thời gian còn lại: {formatTimeRemaining(timeRemaining)}</small>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* QR Code Display */}
                            {paymentStatus !== 'completed' && (
                                <div className="qr-code-container">
                                    <div className="qr-code-wrapper">
                                        <img 
                                            src={qrCode} 
                                            alt="VietQR Code" 
                                            className="qr-code-image"
                                        />
                                    </div>
                                    <p className="qr-instruction">
                                        Quét mã QR bằng ứng dụng ngân hàng để thanh toán
                                    </p>
                                </div>
                            )}

                            {/* Bank Information */}
                            {transferInfo && paymentStatus !== 'completed' && (
                                <div className="bank-info">
                                    <h4>
                                        <i className="fas fa-university"></i>
                                        Thông tin chuyển khoản
                                    </h4>
                                    <div className="bank-details">
                                        <div className="bank-detail-item">
                                            <span className="label">Ngân hàng:</span>
                                            <div className="value">
                                                {transferInfo.bankName}
                                            </div>
                                        </div>
                                        <div className="bank-detail-item">
                                            <span className="label">Số tài khoản:</span>
                                            <div className="value">
                                                {transferInfo.accountNo}
                                                <button 
                                                    className="copy-btn"
                                                    onClick={(e) => copyToClipboard(transferInfo.accountNo, e.target)}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bank-detail-item">
                                            <span className="label">Chủ tài khoản:</span>
                                            <div className="value">{transferInfo.accountName}</div>
                                        </div>
                                        <div className="bank-detail-item highlight">
                                            <span className="label">Số tiền:</span>
                                            <div className="value amount">
                                                {transferInfo.amount}
                                                <button 
                                                    className="copy-btn"
                                                    onClick={(e) => copyToClipboard(paymentAmount.toString(), e.target)}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bank-detail-item highlight">
                                            <span className="label">Nội dung:</span>
                                            <div className="value">
                                                {transferInfo.content}
                                                <button 
                                                    className="copy-btn"
                                                    onClick={(e) => copyToClipboard(transferInfo.content, e.target)}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="qr-modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        <i className="fas fa-times"></i>
                        Đóng
                    </button>
                    
                    {paymentId && paymentStatus === 'pending' && (
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={forceVerifyPayment}
                            disabled={loading}
                        >
                            <i className="fas fa-check"></i>
                            Xác minh thanh toán
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRPaymentModal;