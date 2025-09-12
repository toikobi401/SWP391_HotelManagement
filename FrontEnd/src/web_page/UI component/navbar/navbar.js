import styles from './navbar.module.css'
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useRoleNavigation } from '../../../hooks/useRoleNavigation';
import { toast } from 'react-toastify';
import defaultAvatar from '../../../images/default-avatar.png';
import axios from 'axios';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [isAvatarLoading, setIsAvatarLoading] = useState(true);
    const navigate = useNavigate();
    const { isLoggedIn, user, logout, hasRole } = useAuth();
    const { navigateToSpecificRole, getAvailableRoutes } = useRoleNavigation();
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    // ✅ Function để lấy avatar từ API hoặc user data
    const loadUserAvatar = async (userId) => {
        try {
            setIsAvatarLoading(true);
            
            // ✅ Nếu user trong state đã có image, sử dụng luôn
            if (user?.Image) {
                const imageUrl = `data:image/jpeg;base64,${user.Image}`;
                setAvatarUrl(imageUrl);
                return;
            }
            
            // ✅ Nếu không có image trong state, fetch từ API
            const response = await axios.get(`http://localhost:3000/api/profile/${userId}`, {
                withCredentials: true
            });
            if (response.data.success && response.data.data.Image) {
                const imageUrl = `data:image/jpeg;base64,${response.data.data.Image}`;
                setAvatarUrl(imageUrl);
            } else {
                setAvatarUrl(defaultAvatar);
            }
        } catch (error) {
            console.error('Error loading user avatar:', error);
            setAvatarUrl(defaultAvatar);
        } finally {
            setIsAvatarLoading(false);
        }
    };

    // ✅ Load avatar khi user thay đổi
    useEffect(() => {
        if (user?.UserID) {
            loadUserAvatar(user.UserID);
        } else {
            setAvatarUrl(defaultAvatar);
            setIsAvatarLoading(false);
        }
    }, [user?.UserID]);

    const handleLogout = async () => {
        try {
            setIsLoading(true);
            await logout();
            toast.success('Đăng xuất thành công!');
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Có lỗi khi đăng xuất');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleNavigation = (roleId) => {
        const success = navigateToSpecificRole(roleId);
        if (success) {
            const roleNames = {
                1: 'Quản lý',
                2: 'Lễ tân',
                3: 'Khách hàng'
            };
            toast.success(`Chuyển đến trang ${roleNames[roleId]}`);
        }
    };

    const scrollToSection = (sectionId) => {
        const section = document.querySelector(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // ✅ THÊM DEBUG EFFECT CHO ROLES
    useEffect(() => {
        console.log('🔍 Navbar Debug:', {
            isLoggedIn,
            user: user ? {
                UserID: user.UserID,
                Username: user.Username,
                roles: user.roles,
                rolesLength: user.roles?.length || 0
            } : 'No user',
            hasRoleFunction: typeof hasRole,
            hasRole1: hasRole ? hasRole(1) : 'hasRole not available',
            hasRole2: hasRole ? hasRole(2) : 'hasRole not available',
            hasRole3: hasRole ? hasRole(3) : 'hasRole not available'
        });
    }, [user, isLoggedIn, hasRole]);

    console.log('Current user:', user);
    console.log('User roles:', user?.roles);
    console.log('Available routes:', getAvailableRoutes());

    return ( 
      <div className = {`${styles.navba}`} >
        <div className={`${styles.site_navbar_wrap} ${styles.js_site_navbar}`}>
      <div className={`${styles.bg_transparent} ${scrolled ? styles.scrolled : ''}` } >
        <div className="container">
          <div className={`${styles.site_navbar}`}>
            <div className="py-1">
              <div className="row align-items-center">
                <div className={`col-2 ${styles.logo_page}`}>
                  <h2 className={`mb-0 ${styles.site_logo}`}><Link to="/"> <a href="/">Hotel HUB</a> </Link></h2>
                </div>
                <div className="col-10 d-flex justify-content-between align-items-center">
                  <nav className={`${styles.site_navigation} text-right`} role="navigation">
                    <div className="container">
                      
                      <div className="d-inline-block d-lg-none  ml-md-0 mr-auto py-3"><a href="#" className="site-menu-toggle js-menu-toggle"><span className="icon-menu h3"></span></a></div>
                      <ul className={`${styles.site_menu} js-clone-nav d-none d-lg-block`}>
                      <Link to="/">
                        {/* <li className={`${styles.active}`}>
                          <a href="#">Trang chủ</a>
                        </li> */}
                        </Link>

                        {/* Role-based Navigation - Enhanced */}
                        {isLoggedIn && hasRole(1) && (
                            <li>
                                <button
                                    className="nav-link btn btn-link"
                                    onClick={() => handleRoleNavigation(1)}
                                    style={{ 
                                        color: '#ff6b6b', 
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        border: 'none',
                                        background: 'none',
                                        padding: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '.05em',
                                        fontSize: '14px'
                                    }}
                                >
                                    <i className="fas fa-shield-alt"></i> Nghiệp vụ quản lí
                                </button>
                            </li>
                        )}

                        {isLoggedIn && hasRole(2) && (
                            <li>
                                <button
                                    className="nav-link btn btn-link"
                                    onClick={() => handleRoleNavigation(2)}
                                    style={{ 
                                        color: '#ffd700', 
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        border: 'none',
                                        background: 'none',
                                        padding: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '.05em',
                                        fontSize: '14px'
                                    }}
                                >
                                    <i className="fas fa-concierge-bell"></i> Nghiệp vụ lễ tân
                                </button>
                            </li>
                        )}

                        {isLoggedIn && hasRole(3) && (
                            <li>
                                <button
                                    className="nav-link btn btn-link"
                                    onClick={() => handleRoleNavigation(3)}
                                    style={{ 
                                        color: '#4ecdc4', 
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        border: 'none',
                                        background: 'none',
                                        padding: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '.05em',
                                        fontSize: '14px'
                                    }}
                                >
                                    <i className="fas fa-user-circle"></i> Khách hàng
                                </button>
                            </li>
                        )}
                        
                        <li>
                            <Link to="/about">Thông tin</Link>
                        </li>
                        <li>
                            <Link to="/contact">Liên hệ</Link>
                        </li>

                      </ul>
                    </div>
                  </nav>
                  <div className="d-none d-lg-block ml-auto">
                    {!isLoggedIn ? (
                      <div className={styles.auth_buttons}>
                        <Link to="/login" className={styles.login_button}>
                            Đăng nhập
                        </Link>
                        <Link to="/register" className={styles.register_button}>
                            Đăng ký
                        </Link>
                      </div>
                    ) : (
                      <div className={styles.user_section}>
            <span className={styles.username}>
                <span className={styles.username_text}>Xin chào,</span>{' '}
                <span className={styles.fullname}>
                    {user?.Fullname || user?.fullname || 'Khách'}
                </span>
                {/* Hiển thị tất cả role badges với navigation */}
                {user?.roles?.map(role => (
                    <button
                        key={role.RoleID}
                        className={`${styles.role_badge} btn btn-sm`}
                        onClick={() => handleRoleNavigation(role.RoleID)}
                        style={{
                            cursor: 'pointer',
                            border: 'none',
                            margin: '0 2px',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 2px 4px rgba(255, 215, 0, 0.3)';
                        }}
                        title={`Chuyển đến trang ${role.RoleName}`}
                    >
                        {role.RoleName}
                    </button>
                ))}
            </span>
            <Link to="/profile" className={styles.profile_link}>
                <div className={styles.avatar_container}>
                    <img 
                        src={avatarUrl}
                        alt={user?.Fullname || user?.fullname || 'Profile'} 
                        className={`${styles.profile_avatar} ${isAvatarLoading ? styles.loading : ''}`}
                        onLoad={() => setIsAvatarLoading(false)}
                        onError={(e) => {
                            console.log('Error loading profile image, falling back to default avatar');
                            e.target.src = defaultAvatar;
                            setIsAvatarLoading(false);
                        }}
                    />
                    {isAvatarLoading && (
                        <div className={styles.avatar_loader}>
                            <i className="fas fa-spinner fa-spin"></i>
                        </div>
                    )}
                </div>
            </Link>
    <button 
        onClick={handleLogout}
        disabled={isLoading}
        className={styles.logout_button}
    >
        {isLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
    </button>
</div>
                    )}
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

export default Navbar;