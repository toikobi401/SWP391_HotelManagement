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
            
            // ✅ THÊM DEBUG LOG CHO RESPONSE
            console.log('🔍 Login Response Debug:', {
                responseOk: response.ok,
                dataSuccess: data.success,
                userExists: !!data.user,
                userRoles: data.user?.roles,
                rolesLength: data.user?.roles?.length || 0,
                fullResponse: data
            });

            if (response.ok && data.success) {
                // ✅ VALIDATE USER DATA TRƯỚC KHI LOGIN
                if (!data.user) {
                    throw new Error('No user data in response');
                }

                if (!data.user.roles || !Array.isArray(data.user.roles)) {
                    console.warn('⚠️ Invalid roles in response, setting empty array');
                    data.user.roles = [];
                }

                console.log('✅ About to call login with:', {
                    UserID: data.user.UserID,
                    roles: data.user.roles,
                    rolesCount: data.user.roles.length
                });

                const loginSuccess = login(data.user);
                
                if (loginSuccess) {
                    toast.success('Đăng nhập thành công!');
                    
                    // ✅ NAVIGATE DỰA TRÊN ROLE
                    setTimeout(() => {
                        if (data.user.roles && data.user.roles.length > 0) {
                            const primaryRole = data.user.roles[0];
                            console.log('🎯 Navigating based on role:', primaryRole);
                            
                            switch (primaryRole.RoleID) {
                                case 1:
                                    navigate('/manager', { replace: true });
                                    break;
                                case 2:
                                    navigate('/receptionist', { replace: true });
                                    break;
                                case 3:
                                    navigate('/customer', { replace: true });
                                    break;
                                default:
                                    navigate('/', { replace: true });
                            }
                        } else {
                            navigate('/', { replace: true });
                        }
                    }, 100);
                }
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
                            <div style={{ textAlign: 'right', marginTop: '8px' }}>
                                <Link to="/forgot-password" style={{ 
                                    color: '#667eea', 
                                    fontSize: '14px', 
                                    textDecoration: 'none' 
                                }}>
                                    Quên mật khẩu?
                                </Link>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            className={`btn btn-primary btn-block mt-3 ${styles.btn_submit}`}
                        >
                            Đăng nhập
                        </button>
                        <span className={`text-center my-3 d-block`}>Hoặc</span>

                        <div className={styles.social_login}>
                         

                          <a 
                            href="http://localhost:3000/api/auth/google" 
                            className={`btn btn-block py-2 btn-google ${styles.gg} ${styles.mauchu}`}
                          >
                            <span><img src={Google} alt="Google" /></span> Đăng nhập với Google
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
