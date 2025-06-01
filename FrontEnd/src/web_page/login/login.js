import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import styles from './login.module.css';
import '../.././fonts/flaticon/font/flaticon.css';
import '../.././fonts/icomoon/style.css';
import Google from '../../images/Google__G__logo.svg.webp';

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                login(data.user);
                toast.success('Đăng nhập thành công!');
                navigate('/', { replace: true });
            } else {
                setError(data.message || 'Đăng nhập thất bại');
                toast.error(data.message || 'Đăng nhập thất bại');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Lỗi kết nối đến máy chủ');
            toast.error('Lỗi kết nối đến máy chủ');
        }
    };

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div>
            <div className={styles.login_bg}>
                <div className={styles.login_box}>
                    <Link to="/" className={styles.site_logo}>Hotel HUB</Link>
                    <button 
                        onClick={() => navigate('/')} 
                        className={`btn btn-outline-secondary ${styles.btn_back}`}
                    >
                        &larr; Quay lại trang chủ
                    </button>
                    <div className={styles.login_title}>Đăng nhập</div>
                    
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.form_group}>
                            <label htmlFor="username">Tên đăng nhập</label>
                            <input 
                                type="text" 
                                className="form-control mt-1" 
                                id="username" 
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required 
                            />
                        </div>
                        <div className={styles.form_group}>
                            <label className="mt-4" htmlFor="password">Mật khẩu</label>
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
                        <button 
                            type="submit" 
                            className={`btn btn-primary btn-block mt-3 ${styles.btn_submit}`}
                        >
                            Đăng nhập
                        </button>
                        <span className={`text-center my-3 d-block`}>Hoặc</span>

                        <div className={styles.social_login}>
                         

                          <a href="#" className={`btn btn-block py-2 btn-google ${styles.gg} ${styles.mauchu}`}>
                            <span> <img src={`${Google}`} /></span> Đăng nhập với Google
                          </a>

                          
                        </div>

                        <br />

                        <a href="/register">
                          <span className={`${styles.Huy} ${styles.mauchuden}`}>Bạn chưa có tài khoản?</span>
                          <span className={styles.Hai}>Đăng Ký</span>
                        </a>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;
