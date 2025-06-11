import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import './contact.css';

function Contact() {
    const { user, isLoggedIn } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isLoggedIn && user) {
            // Chỉ lấy một email
            const userEmail = user.Email || user.email;
            setFormData(prev => ({
                ...prev,
                name: user.Fullname || user.fullname || '',
                email: userEmail || '' // Sử dụng một email duy nhất
            }));
        }
    }, [isLoggedIn, user]);

    // Trong hàm handleChange, thêm console.log để debug
    const handleChange = (e) => {
        const { name, value } = e.target;
        console.log(`Updating ${name}:`, value);
        
        if (!isLoggedIn || name === 'message') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('http://localhost:3000/api/contact/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Email đã được gửi thành công!');
                setFormData(prev => ({
                    ...prev,
                    message: ''
                }));
            } else {
                toast.error(data.message || 'Không thể gửi email');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Có lỗi xảy ra, vui lòng thử lại sau');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact_bg">
            <section className="formcarry-container">
                <h2 className="contact-title">Liên hệ với chúng tôi</h2>
                <form onSubmit={handleSubmit}>
                    <div className="formcarry-block">
                        <label htmlFor="name">Họ và tên</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            placeholder="Nhập họ và tên của bạn"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            disabled={isLoggedIn}
                            className={isLoggedIn ? 'disabled-input' : ''}
                        />
                    </div>

                    <div className="formcarry-block">
                        <label htmlFor="email">Địa chỉ email</label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            placeholder="example@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={isLoggedIn}
                            className={isLoggedIn ? 'disabled-input' : ''}
                        />
                    </div>

                    <div className="formcarry-block">
                        <label htmlFor="message">Nội dung</label>
                        <textarea
                            name="message"
                            id="message"
                            placeholder="Nhập nội dung tin nhắn..."
                            value={formData.message}
                            onChange={handleChange}
                            required
                        ></textarea>
                    </div>

                    <div className="formcarry-block">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default Contact;