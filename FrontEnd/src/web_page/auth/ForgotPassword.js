import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ForgotPassword.module.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        identifier: '',
        method: 'email', // default to email
        otp: '',
        newPassword: '',
        confirmPassword: '',
        resetToken: ''
    });
    const [loading, setLoading] = useState(false);
    const [otpInfo, setOtpInfo] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Countdown timer for OTP expiry
    useEffect(() => {
        if (timeRemaining > 0) {
            const timer = setTimeout(() => {
                setTimeRemaining(timeRemaining - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [timeRemaining]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateIdentifier = () => {
        const { identifier, method } = formData;
        
        if (!identifier.trim()) {
            toast.error('Vui lòng nhập thông tin');
            return false;
        }

        if (method === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(identifier)) {
                toast.error('Email không hợp lệ');
                return false;
            }
        } else if (method === 'sms' || method === 'voice') {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(identifier)) {
                toast.error('Số điện thoại phải có 10 chữ số');
                return false;
            }
        }

        return true;
    };

    // Step 1: Request OTP
    const handleRequestOTP = async (e) => {
        e.preventDefault();
        
        if (!validateIdentifier()) return;

        setLoading(true);
        try {
            console.log('🚀 Requesting OTP:', { identifier: formData.identifier, method: formData.method });
            
            const response = await fetch('http://localhost:3000/api/forgot-password/request-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: formData.identifier,
                    method: formData.method
                })
            });

            const data = await response.json();
            console.log('📨 OTP Response:', data);

            if (response.ok && data.success) {
                setOtpInfo(data);
                setTimeRemaining(data.expiresIn);
                setStep(2);
                
                if (data.simulated) {
                    toast.success(`${data.message} - Kiểm tra console để lấy OTP`);
                } else {
                    const methodNames = {
                        email: 'email',
                        sms: 'tin nhắn SMS', 
                        voice: 'cuộc gọi thoại'
                    };
                    toast.success(`OTP đã được gửi qua ${methodNames[formData.method]}!`);
                }
            } else {
                toast.error(data.error || 'Không thể gửi OTP');
            }
        } catch (error) {
            console.error('Request OTP error:', error);
            toast.error('Lỗi kết nối đến máy chủ');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        
        if (!formData.otp.trim()) {
            toast.error('Vui lòng nhập mã OTP');
            return;
        }

        if (formData.otp.length !== 6) {
            toast.error('Mã OTP phải có 6 chữ số');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/forgot-password/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: formData.identifier,
                    otp: formData.otp
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setFormData(prev => ({
                    ...prev,
                    resetToken: data.resetToken
                }));
                setStep(3);
                toast.success(data.message);
            } else {
                toast.error(data.error || 'Mã OTP không đúng');
            }
        } catch (error) {
            console.error('Verify OTP error:', error);
            toast.error('Lỗi kết nối đến máy chủ');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        const { newPassword, confirmPassword } = formData;

        if (!newPassword || !confirmPassword) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        // if (newPassword.length < 6) {
        //     toast.error('Mật khẩu phải có ít nhất 6 ký tự');
        //     return;
        // }

        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/forgot-password/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: formData.identifier,
                    resetToken: formData.resetToken,
                    newPassword: formData.newPassword,
                    confirmPassword: formData.confirmPassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('Đặt lại mật khẩu thành công!');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                toast.error(data.error || 'Không thể đặt lại mật khẩu');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error('Lỗi kết nối đến máy chủ');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/forgot-password/request-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: formData.identifier,
                    method: formData.method
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setTimeRemaining(data.expiresIn);
                setFormData(prev => ({ ...prev, otp: '' }));
                
                if (data.simulated) {
                    toast.success('Đã gửi lại mã OTP - Kiểm tra console để lấy OTP');
                } else {
                    toast.success('Đã gửi lại mã OTP');
                }
            } else {
                toast.error(data.error || 'Không thể gửi lại OTP');
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            toast.error('Lỗi kết nối đến máy chủ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.forgot_password_bg}>
            <div className={styles.forgot_password_container}>
                <div className={styles.forgot_password_box}>
                    {/* <Link to="/" className={styles.site_logo}>Hotel HUB</Link>
                    <Link to="/login" className={`btn btn-outline-secondary ${styles.btn_back}`}>
                        ← Quay lại đăng nhập
                    </Link> */}

                    {/* Step 1: Request OTP */}
                    {step === 1 && (
                        <>
                            <div className={styles.forgot_password_title}>Quên mật khẩu</div>
                            <p className={styles.forgot_password_subtitle}>
                                Chọn phương thức nhận mã OTP khôi phục mật khẩu
                                <br />
                                <small style={{ color: '#888', fontSize: '12px' }}>
                                    💡 Tính năng cuộc gọi thoại tạm thời không khả dụng
                                </small>
                            </p>

                            <form onSubmit={handleRequestOTP}>
                                <div className={styles.method_selection}>
                                    <label className={styles.method_label}>Chọn phương thức nhận OTP:</label>
                                    <div className={styles.method_options}>
                                        <label className={styles.radio_option}>
                                            <input
                                                type="radio"
                                                name="method"
                                                value="email"
                                                checked={formData.method === 'email'}
                                                onChange={handleInputChange}
                                            />
                                            <span className={styles.radio_text}>📧 Email</span>
                                        </label>
                                        <label className={styles.radio_option}>
                                            <input
                                                type="radio"
                                                name="method"
                                                value="sms"
                                                checked={formData.method === 'sms'}
                                                onChange={handleInputChange}
                                            />
                                            <span className={styles.radio_text}>📱 Tin nhắn</span>
                                        </label>
                                        {/* 🔧 TẠM THỜI ẨN VOICE OPTION
                                        <label className={styles.radio_option}>
                                            <input
                                                type="radio"
                                                name="method"
                                                value="voice"
                                                checked={formData.method === 'voice'}
                                                onChange={handleInputChange}
                                            />
                                            <span className={styles.radio_text}>📞 Cuộc gọi</span>
                                        </label>
                                        */}
                                    </div>
                                </div>

                                <div className={styles.form_group}>
                                    <label htmlFor="identifier">
                                        {formData.method === 'email' ? 'Địa chỉ email' : 'Số điện thoại'}
                                    </label>
                                    <input
                                        type={formData.method === 'email' ? 'email' : 'tel'}
                                        id="identifier"
                                        name="identifier"
                                        value={formData.identifier}
                                        onChange={handleInputChange}
                                        placeholder={
                                            formData.method === 'email' 
                                                ? 'example@email.com' 
                                                : '0123456789'
                                        }
                                        required
                                        className="form-control"
                                    />
                                    {formData.method === 'voice' && (
                                        <small className="text-muted mt-1">
                                            💡 Bạn sẽ nhận được cuộc gọi tự động với mã OTP
                                        </small>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`btn btn-primary btn-block ${styles.btn_submit}`}
                                >
                                    {loading ? 'Đang gửi...' : 
                                     formData.method === 'email' ? 'Gửi mã qua Email' :
                                     formData.method === 'sms' ? 'Gửi mã qua SMS' :
                                     'Gọi điện thoại'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* Step 2: Verify OTP */}
                    {step === 2 && (
                        <>
                            <div className={styles.forgot_password_title}>Xác thực OTP</div>
                            <p className={styles.forgot_password_subtitle}>
                                Mã OTP đã được gửi {
                                    formData.method === 'email' ? 'qua email' :
                                    formData.method === 'sms' ? 'qua tin nhắn SMS' :
                                    'qua cuộc gọi thoại'
                                } đến {otpInfo?.identifier || formData.identifier}
                                <br />
                                <small style={{ color: '#888', fontSize: '12px' }}>
                                    💡 Nếu chưa cấu hình {
                                        formData.method === 'email' ? 'email' :
                                        formData.method === 'sms' ? 'SMS' :
                                        'voice call'
                                    }, hãy kiểm tra console để lấy mã OTP
                                </small>
                            </p>

                            {timeRemaining > 0 && (
                                <div className={styles.timer}>
                                    ⏰ Mã OTP sẽ hết hạn sau: <strong>{formatTime(timeRemaining)}</strong>
                                </div>
                            )}

                            <form onSubmit={handleVerifyOTP}>
                                <div className={styles.form_group}>
                                    <label htmlFor="otp">Mã OTP (6 chữ số)</label>
                                    <input
                                        type="text"
                                        id="otp"
                                        name="otp"
                                        value={formData.otp}
                                        onChange={handleInputChange}
                                        placeholder="123456"
                                        maxLength="6"
                                        required
                                        className={`form-control ${styles.otp_input}`}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`btn btn-primary btn-block ${styles.btn_submit}`}
                                >
                                    {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
                                </button>

                                <div className={styles.resend_section}>
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={loading || timeRemaining > 0}
                                        className={`btn btn-link ${styles.btn_resend}`}
                                    >
                                        {timeRemaining > 0 
                                            ? `Gửi lại sau ${formatTime(timeRemaining)}` 
                                            : `Gửi lại mã ${
                                                formData.method === 'email' ? 'qua Email' :
                                                formData.method === 'sms' ? 'qua SMS' :
                                                'qua cuộc gọi'
                                            }`
                                        }
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* Step 3: Reset Password */}
                    {step === 3 && (
                        <>
                            <div className={styles.forgot_password_title}>Đặt lại mật khẩu</div>
                            <p className={styles.forgot_password_subtitle}>
                                Nhập mật khẩu mới cho tài khoản của bạn
                            </p>

                            <form onSubmit={handleResetPassword}>
                                <div className={styles.form_group}>
                                    <label htmlFor="newPassword">Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        placeholder="Nhập mật khẩu mới"
                                        required
                                        className="form-control"
                                    />
                                </div>

                                <div className={styles.form_group}>
                                    <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Nhập lại mật khẩu mới"
                                        required
                                        className="form-control"
                                    />
                                </div>

                                {formData.newPassword && formData.confirmPassword && 
                                 formData.newPassword !== formData.confirmPassword && (
                                    <div className="alert alert-warning" style={{ fontSize: '14px', padding: '8px 12px' }}>
                                        ⚠️ Mật khẩu xác nhận không khớp
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || (formData.newPassword !== formData.confirmPassword)}
                                    className={`btn btn-primary btn-block ${styles.btn_submit}`}
                                >
                                    {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* Navigation Links */}
                    <div className={styles.links}>
                        <Link to="/login">
                            <i className="fas fa-sign-in-alt"></i> Đăng nhập
                        </Link>
                        <Link to="/register">
                            <i className="fas fa-user-plus"></i> Đăng ký
                        </Link>
                    </div>

                    {/* Step Indicator */}
                    <div className="mt-4 text-center">
                        <div className="d-flex justify-content-center align-items-center">
                            <div className={`step-indicator ${step >= 1 ? 'active' : ''}`}>1</div>
                            <div className="step-line"></div>
                            <div className={`step-indicator ${step >= 2 ? 'active' : ''}`}>2</div>
                            <div className="step-line"></div>
                            <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>3</div>
                        </div>
                        <div className="mt-2 small text-muted">
                            {step === 1 && 'Chọn phương thức'}
                            {step === 2 && 'Xác thực OTP'}
                            {step === 3 && 'Đặt lại mật khẩu'}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-indicator {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: #e9ecef;
                    color: #6c757d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }
                .step-indicator.active {
                    background: #667eea;
                    color: white;
                    transform: scale(1.1);
                }
                .step-line {
                    width: 40px;
                    height: 2px;
                    background: #e9ecef;
                    margin: 0 10px;
                    transition: all 0.3s ease;
                }
            `}</style>
        </div>
    );
};

export default ForgotPassword;