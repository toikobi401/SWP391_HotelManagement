import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // ✅ Thêm dòng này
import axios from 'axios';
import styles from './profile.module.css';
import defaultAvatar from '../../images/default-avatar.png';
import BannerSlide from '../UI component/banner_slide/banner_slide';
import { FaCoins, FaHistory } from 'react-icons/fa';

function Profile() {
    const navigate = useNavigate();
    const { user, isLoggedIn } = useAuth(); // ✅ Thêm dòng này để kích hoạt AuthContext
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phoneNumber: '',
        fullname: '',
        status: true
    });
    const [avatar, setAvatar] = useState(defaultAvatar);
    const [alerts, setAlerts] = useState({ show: false, message: '', type: '' });

    // Check authentication status
    useEffect(() => {
        console.log('Auth Status:', { isLoggedIn, user });
        if (!isLoggedIn) {
            console.log('User not logged in, redirecting to login page');
            navigate('/login', { replace: true });
            return;
        }

        // Initialize form data with user info if available
        if (user) {
            console.log('Initializing form data with user:', user);
            setFormData({
                username: user.username || '',
                email: user.Email || '',
                phoneNumber: user.PhoneNumber || '',
                fullname: user.Fullname || '',
                status: user.Status || true
            });

            if (user.Image) {
                console.log('User has profile image');
                setAvatar(`data:image/jpeg;base64,${user.Image}`);
            } else {
                console.log('No profile image found, using default avatar');
                setAvatar(defaultAvatar);
            }
        } else {
            console.log('No user data available');
        }
    }, [isLoggedIn, user, navigate]);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            console.log('Starting fetchUserData, full user object:', user);
            // ✅ SỬA: Sử dụng UserID thay vì id
            if (!user?.UserID) {
                console.log('No user UserID available in user object:', user);
                return;
            }

            try {
                console.log('Attempting to fetch user data for UserID:', user.UserID);
                const response = await axios.get(`http://localhost:3000/api/profile/${user.UserID}`, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('Full API Response:', response);

                const userData = response.data;
                console.log('Parsed user data:', userData);

                setFormData({
                    username: userData.Username || user.username,
                    email: userData.Email || '',
                    phoneNumber: userData.PhoneNumber || '',
                    fullname: userData.Fullname || user.Fullname,
                    status: userData.Status || true
                });
                console.log('Updated form data:', formData);

                if (userData.Image) {
                    console.log('Setting user avatar from response');
                    setAvatar(`data:image/jpeg;base64,${userData.Image}`);
                } else {
                    console.log('No profile image in response, using default avatar');
                    setAvatar(defaultAvatar);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
    }, [user]);

    // Add logging to axios interceptors
    useEffect(() => {
        // Request interceptor
        const requestInterceptor = axios.interceptors.request.use(
            config => {
                console.log('Axios Request:', {
                    url: config.url,
                    method: config.method,
                    headers: config.headers,
                    data: config.data
                });
                return config;
            },
            error => {
                console.error('Axios Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        const responseInterceptor = axios.interceptors.response.use(
            response => {
                console.log('Axios Response:', {
                    status: response.status,
                    data: response.data,
                    headers: response.headers
                });
                return response;
            },
            error => {
                console.error('Axios Response Error:', {
                    message: error.message,
                    response: error.response,
                    request: error.request
                });
                return Promise.reject(error);
            }
        );

        // Cleanup interceptors
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    // Show alert message
    const showAlert = (message, type) => {
        console.log('Showing alert:', { message, type });
        setAlerts({ show: true, message, type });
        setTimeout(() => {
            console.log('Clearing alert');
            setAlerts({ show: false, message: '', type: '' });
        }, 5000);
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    // Handle avatar change
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // ✅ THÊM: Kiểm tra user.UserID trước khi upload
        if (!user?.UserID) {
            console.error('User UserID not available for avatar upload:', user);
            showAlert('Không tìm thấy thông tin người dùng', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showAlert('Vui lòng chọn file ảnh', 'error');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('File ảnh quá lớn (tối đa 5MB)', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            console.log('Uploading avatar for UserID:', user.UserID);

            // ✅ SỬA: Sử dụng user.UserID thay vì user.id
            const response = await axios.put(`http://localhost:3000/api/profile/${user.UserID}/image`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true
            });

            if (response.data.success) {
                // Update avatar preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    setAvatar(e.target.result);
                };
                reader.readAsDataURL(file);
                
                showAlert('Cập nhật ảnh đại diện thành công', 'success');
            } else {
                showAlert(response.data.message || 'Lỗi cập nhật ảnh đại diện', 'error');
            }
        } catch (error) {
            console.error('❌ Lỗi cập nhật ảnh:', error);
            showAlert(`Lỗi cập nhật ảnh: ${error.response?.data?.message || error.message}`, 'error');
        }
    };

    // Save profile changes
    const handleSave = async () => {
        try {
            const validationErrors = validateFormData(formData);
            if (validationErrors.length > 0) {
                showAlert(validationErrors[0], 'danger');
                return;
            }

            const response = await axios.put(
                `http://localhost:3000/api/profile/${user.id}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                showAlert('Profile updated successfully!', 'success');
                setIsEditing(false);
            } else {
                throw new Error(response.data.message || 'Update failed');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            const errorMessage = error.response?.data?.message || error.message;
            
            // Handle specific duplicate errors
            if (errorMessage.includes('Username is already taken')) {
                showAlert('This username is already in use. Please choose another.', 'danger');
            } else if (errorMessage.includes('Email is already registered')) {
                showAlert('This email is already registered. Please use another email.', 'danger');
            } else if (errorMessage.includes('Phone number is already registered')) {
                showAlert('This phone number is already registered. Please use another number.', 'danger');
            } else {
                showAlert('Error updating profile: ' + errorMessage, 'danger');
            }
        }
    };

    // Form data validation
    const validateFormData = (data) => {
        const errors = [];
        
        // Username validation
        if (!data.username?.trim()) {
            errors.push('Username is required');
        } else if (data.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }
        
        // Fullname validation
        if (!data.fullname?.trim()) {
            errors.push('Full name is required');
        }
        
        // Email validation
        if (!data.email?.trim()) {
            errors.push('Email is required');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email.trim())) {
                errors.push('Please enter a valid email address');
            }
        }
        
        // Phone number validation (optional)
        if (data.phoneNumber?.trim()) {
            const phoneRegex = /^[0-9]{10,11}$/;
            if (!phoneRegex.test(data.phoneNumber.trim())) {
                errors.push('Please enter a valid phone number (10-11 digits)');
            }
        }
        
        return errors;
    };

    // Reset form
    const handleReset = () => {
        if (user) {
            setFormData({
                username: user.Username || '',
                email: user.Email || '',
                phoneNumber: user.PhoneNumber || '',
                fullname: user.Fullname || '',
                status: user.Status || true
            });
            showAlert('Form has been reset', 'success');
        }
    };

    // Render profile information in view mode
    const renderProfileInfo = () => (
        <div className={styles.info_section}>
            <div className={styles.info_item}>
                <div className={styles.info_label}>Username</div>
                <div className={styles.info_value}>{formData.username}</div>
            </div>
            <div className={styles.info_item}>
                <div className={styles.info_label}>Full Name</div>
                <div className={styles.info_value}>{formData.fullname}</div>
            </div>
            <div className={styles.info_item}>
                <div className={styles.info_label}>Email</div>
                <div className={styles.info_value}>{formData.email}</div>
            </div>
            <div className={styles.info_item}>
                <div className={styles.info_label}>Phone Number</div>
                <div className={styles.info_value}>{formData.phoneNumber}</div>
            </div>
        </div>
    );

    // Render edit form
    const renderEditForm = () => (
        <form id="profileForm" className={styles.form_section}>
            <div className={styles.form_group}>
                <label className={styles.form_label}>Username</label>
                <input
                    type="text"
                    className={styles.form_control}
                    id="username"
                    value={formData.username}
                    onChange={handleInputChange}
                />
            </div>
            <div className={styles.form_group}>
                <label className={styles.form_label}>Full Name</label>
                <input
                    type="text"
                    className={styles.form_control}
                    id="fullname"
                    value={formData.fullname}
                    onChange={handleInputChange}
                />
            </div>
            <div className={styles.form_group}>
                <label className={styles.form_label}>Email</label>
                <input
                    type="email"
                    className={styles.form_control}
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                />
            </div>
            <div className={styles.form_group}>
                <label className={styles.form_label}>Phone Number</label>
                <input
                    type="tel"
                    className={styles.form_control}
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                />
            </div>
        </form>
    );

    // Navigate to member points page
    const handleViewPoints = () => {
        navigate('/loyaltypoint');
    };
    const handleViewDetails = () => {
        navigate('/loyaltypoint'); // Chuyển hướng đến trang /loyaltypoint
    };

    // Navigate to transaction history page
    const handleViewTransactions = () => {
        navigate('/transaction-history');
    };

    useEffect(() => {
        // Add profile-page class when component mounts
        document.body.classList.add('profile-page');
        
        // Remove the class when component unmounts
        return () => {
            document.body.classList.remove('profile-page');
        };
    }, []);

    // Thêm hàm xử lý click vào avatar
    const handleAvatarClick = () => {
        if (isEditing) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = (e) => {
                handleAvatarChange(e);
            };
            fileInput.click();
        }
    };

    return (
        <div className={`${styles.profile_bg}`} >
        <div className={styles.site_wrap}>
            <div className={`${styles.profile_page}`}>
                {/* Thêm div bọc với class để style khoảng cách
                <div style={{ marginBottom: '40px' }}>
                    <BannerSlide isProfilePage={true} />
                </div> */}
                {/* Main Content */}
                <div className={styles.content_wrapper}>
                    <div className="container">
                        <div className="row">
                            {/* Main Profile Section */}
                            <div className="col-lg-8">
                                {alerts.show && (
                                    <div className={`alert ${alerts.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                                        {alerts.message}
                                    </div>
                                )}

                                <div className={styles.profile_card}>
                                    {/* Profile Header */}
                                    <div className={styles.profile_header}>
                                        <div className={styles.avatar_container}>
                                            <div className={styles.avatar_wrapper}>
                                                <img 
                                                    src={avatar || defaultAvatar} 
                                                    alt="Profile" 
                                                    className={`${styles.profile_avatar} ${isEditing ? styles.editable : ''}`}
                                                    onClick={handleAvatarClick}
                                                    onError={(e) => {
                                                        console.log('Error loading image, using default avatar');
                                                        e.target.src = defaultAvatar;
                                                    }}
                                                />
                                                {isEditing && (
                                                    <div 
                                                        className={styles.avatar_overlay}
                                                        onClick={handleAvatarClick}
                                                    >
                                                        <i className="fas fa-camera"></i>
                                                        <span>Thay đổi ảnh</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className={styles.profile_name}>
                                          {formData.fullname}
                                        </h3>
                                        <p className={styles.profile_role}>Premium Member</p>
                                        <span className={`${styles.status_badge} ${styles.status_active}`}>
                                            Active
                                        </span>
                                    </div>

                                    {/* Profile Content */}
                                    {isEditing ? (
                                        // Edit Form
                                        renderEditForm()
                                    ) : (
                                        // View Mode
                                        renderProfileInfo()
                                    )}

                                    {/* Action Buttons */}
                                    <div className="text-center mt-4">
                                        {isEditing ? (
                                            <>
                                                <button className={`${styles.btn} ${styles.btn_primary}`} onClick={handleSave}>
                                                    Lưu thay đổi
                                                </button>
                                                <button className={`${styles.btn} ${styles.btn_outline}`} 
                                                        onClick={() => setIsEditing(false)}>
                                                    Hủy
                                                </button>
                                                <button className={`${styles.btn} ${styles.btn_danger}`} onClick={handleReset}>
                                                    Reset
                                                </button>
                                            </>
                                        ) : (
                                            <button className={`${styles.btn} ${styles.btn_primary}`} 
                                                    onClick={() => setIsEditing(true)}>
                                                Chỉnh sửa hồ sơ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="col-lg-4">
                                {/* Member Points Card
                                <div className={styles.sidebar_card}>
                                    <div className={styles.card_header}>
                                        <FaCoins className={styles.card_icon} />
                                        <h4>Điểm thành viên</h4>
                                    </div>
                                    <div className={styles.card_content}>
                                        <div className={styles.points_display}>
                                            <span className={styles.points_value}>1,234</span>
                                            <span className={styles.points_label}>điểm</span>
                                        </div>
                                        <button 
                                            className={`${styles.btn} ${styles.btn_secondary}`}
                                            onClick={handleViewPoints}
                                        >
                                            Xem chi tiết
                                        </button>
                                    </div>
                                </div> */}

                                {/* Transaction History Card */}
                                <div className={styles.sidebar_card}>
                                    <div className={styles.card_header}>
                                        <FaHistory className={styles.card_icon} />
                                        <h4>Lịch sử Đặt phòng</h4>
                                    </div>
                                    <div className={styles.card_content}>
                                        <div className={styles.transaction_summary}>
                                            <span className={styles.transaction_count}></span>
                                        </div>
                                        <button 
                                            className={`${styles.btn} ${styles.btn_secondary}`}
                                            onClick={handleViewTransactions}
                                        >
                                            Xem lịch sử
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}

export default Profile;