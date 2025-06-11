import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import styles from './login.module.css';

function LoginSuccess() {
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/check-auth', {
                    credentials: 'include'
                });
                const data = await response.json();
                
                if (data.authenticated && data.user) {
                    // Fetch full user details
                    const userResponse = await fetch(`http://localhost:3000/api/profile/${data.user.id}`, {
                        credentials: 'include'
                    });
                    const userData = await userResponse.json();

                    if (userResponse.ok) {
                        await login(userData);
                        toast.success('Đăng nhập với Google thành công!');
                        navigate('/', { replace: true });
                    } else {
                        throw new Error('Không thể lấy thông tin người dùng');
                    }
                } else {
                    throw new Error('Xác thực không thành công');
                }
            } catch (error) {
                console.error('Auth verification error:', error);
                toast.error('Đăng nhập thất bại');
                navigate('/login');
            }
        };

        verifyAuth();
    }, [login, navigate]);

    return (
        <div className={styles.login_bg}>
            <div className={styles.login_box}>
                <div className={styles.loading_container}>
                    <div className={styles.loading_spinner}></div>
                    <h2>Đang xác thực...</h2>
                    <p>Vui lòng đợi trong giây lát</p>
                </div>
            </div>
        </div>
    );
}

export default LoginSuccess;