import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './register.module.css'
import '../.././fonts/flaticon/font/flaticon.css';
import '../.././fonts/icomoon/style.css';

import Google from '../../images/Google__G__logo.svg.webp'
import PropTypes from 'prop-types';

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullname: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        avatar: null
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'file' ? files[0] : value
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Kiểm tra các trường bắt buộc
        if (!formData.fullname.trim()) newErrors.fullname = 'Vui lòng nhập họ và tên';
        if (!formData.username.trim()) newErrors.username = 'Vui lòng nhập tên đăng nhập';
        if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email';
        if (!formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại';
        if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu';
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';

        // Kiểm tra định dạng email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
        }

        // Kiểm tra định dạng số điện thoại
        const phoneRegex = /^[0-9]{10}$/;
        if (formData.phone && !phoneRegex.test(formData.phone)) {
            newErrors.phone = 'Số điện thoại phải có 10 chữ số';
        }

        // Kiểm tra mật khẩu trùng khớp
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); // Reset errors

        if (validateForm()) {
            try {
                const formDataToSend = new FormData();
                Object.keys(formData).forEach(key => {
                    if (key === 'avatar' && formData[key]) {
                        formDataToSend.append(key, formData[key]);
                    } else if (key !== 'avatar') {
                        formDataToSend.append(key, formData[key]);
                    }
                });

                console.log('Sending registration request...');

                const response = await fetch('http://localhost:3000/api/register', {
                    method: 'POST',
                    body: formDataToSend
                });

                const data = await response.json();
                console.log('Server response:', data);

                if (!response.ok) {
                    // Xử lý các loại lỗi cụ thể
                    if (data.field === 'username') {
                        setErrors(prev => ({
                            ...prev,
                            username: data.message
                        }));
                    } else if (data.field === 'email') {
                        setErrors(prev => ({
                            ...prev,
                            email: data.message
                        }));
                    } else if (data.field === 'phone') {
                        setErrors(prev => ({
                            ...prev,
                            phone: data.message
                        }));
                    }
                    
                    toast.error(data.message);
                    return;
                }

                toast.success('Đăng ký thành công!');
                navigate('/login');

            } catch (error) {
                console.error('Registration error:', error);
                toast.error('Có lỗi xảy ra, vui lòng thử lại sau');
            }
        } else {
            toast.error('Vui lòng kiểm tra lại thông tin đã nhập');
        }
    };

    return (
        <div>
            <div className={styles.register_bg}>
                <div className={styles.register_box}>
                    <Link to="/" className={styles.site_logo}>Holtel HUB</Link>
                    <Link to="/" className={`btn btn-outline-secondary ${styles.btn_back}`}>
                        &larr; Quay lại trang chủ
                    </Link>
                    <div className={styles.register_title}>Đăng ký</div>
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        <div className={styles.form_group}>
                            <label htmlFor="fullname">
                                Họ và tên <span className={styles.required}>*</span>
                            </label>
                            <input 
                                type="text" 
                                className={`form-control mt-1 ${errors.fullname ? styles.error : ''}`}
                                id="fullname" 
                                name="fullname" 
                                value={formData.fullname}
                                onChange={handleChange}
                                required 
                            />
                            {errors.fullname && <div className={styles.error_message}>{errors.fullname}</div>}
                        </div>

                        <div className={styles.form_group}>
                            <label htmlFor="username">
                                Tên đăng nhập <span className={styles.required}>*</span>
                            </label>
                            <input 
                                type="text" 
                                className={`form-control mt-1 ${errors.username ? styles.error : ''}`}
                                id="username" 
                                name="username" 
                                value={formData.username}
                                onChange={handleChange}
                                required 
                            />
                            {errors.username && <div className={styles.error_message}>{errors.username}</div>}
                        </div>

                        <div className={styles.form_group}>
                            <label htmlFor="email">Email</label><span className={styles.required}>*</span>
                            <input 
                                type="email" 
                                className="form-control mt-1" 
                                id="email" 
                                name="email" 
                                value={formData.email}
                                onChange={handleChange}
                                required 
                            />
                        </div>

                        <div className={styles.form_group}>
                            <label htmlFor="phone">Số điện thoại</label><span className={styles.required}>*</span>
                            <input 
                                type="tel" 
                                className="form-control mt-1" 
                                id="phone" 
                                name="phone"
                                pattern="[0-9]{10}" 
                                value={formData.phone}
                                onChange={handleChange}
                                required 
                            />
                        </div>

                        <div className={styles.form_group}>
                            <label className="mt-4" htmlFor="password">Mật khẩu</label><span className={styles.required}>*</span>
                            <input 
                                type="password" 
                                className="form-control mt-1" 
                                id="password" 
                                name="password" 
                                value={formData.password}
                                onChange={handleChange}
                                required 
                            />
                        </div>

                        <div className={styles.form_group}>
                            <label className="mt-4" htmlFor="confirmPassword">Xác nhận mật khẩu</label><span className={styles.required}>*</span>
                            <input 
                                type="password" 
                                className="form-control mt-1" 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required 
                            />
                        </div>

                        <div className={styles.form_group}>
                            <label className="mt-4" htmlFor="avatar">Ảnh đại diện</label>
                            <input 
                                type="file" 
                                className="form-control mt-1" 
                                id="avatar" 
                                name="avatar"
                                accept="image/*"
                                onChange={handleChange}
                            />
                        </div>

                        <button type="submit" className={`btn btn-primary btn-block mt-4 ${styles.btn_submit}`}>
                            Đăng ký
                        </button>
                        <span className={`text-center my-3 d-block`}>Hoặc</span>

                        <div className={styles.social_register}>
                            <button 
                                type="button"
                                onClick={() => {/* Google login logic */}} 
                                className={styles.google_btn}
                            >
                                <div className={styles.google_icon_wrapper}>
                                    <img className={styles.google_icon} 
                                        src={Google} 
                                        alt="Google sign-in" 
                                    />
                                </div>
                                <p className={styles.btn_text}>
                                    <b>Đăng nhập với Google</b>
                                </p>
                            </button>
                        </div>

                        <br />

                        <Link to="/login" className={styles.Hai}>
                            Đăng Nhập
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
}

Register.propTypes = {
    // Add any props if needed
};

export default Register;