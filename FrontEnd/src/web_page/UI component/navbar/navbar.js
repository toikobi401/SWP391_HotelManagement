import styles from './navbar.module.css'
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { isLoggedIn, user, logout } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            setIsLoading(true);
            const success = await logout();
            if (success) {
                toast.success('Đăng xuất thành công!');
                navigate('/', { replace: true });
            } else {
                toast.error('Đăng xuất thất bại');
            }
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Lỗi khi đăng xuất');
        } finally {
            setIsLoading(false);
        }
    };

    return ( 
      <div className = {`${styles.navba}`} >
        <div className={`${styles.site_navbar_wrap} ${styles.js_site_navbar}`}>
      <div className={`${styles.bg_transparent} ${scrolled ? styles.scrolled : ''}` } >
        <div className="container">
          <div className={`${styles.site_navbar}`}>
            <div className="py-1">
              <div className="row align-items-center">
                <div className={`col-2 ${styles.logo_page}`}>
                  <h2 className={`mb-0 ${styles.site_logo}`}><Link to="/"> <a href="/">Holtel HUB</a> </Link></h2>
                </div>
                <div className="col-10 d-flex justify-content-between align-items-center">
                  <nav className={`${styles.site_navigation} text-right`} role="navigation">
                    <div className="container">
                      
                      <div className="d-inline-block d-lg-none  ml-md-0 mr-auto py-3"><a href="#" className="site-menu-toggle js-menu-toggle"><span className="icon-menu h3"></span></a></div>
                      <ul className={`${styles.site_menu} js-clone-nav d-none d-lg-block`}>
                      <Link to="/">

                      
                        <li className={`${styles.active}`}>
                          <a href="#">Trang chủ</a>
                        </li>
                        </Link>

                        <li className={`${styles.has_children}`}>
                          <a href="#">Phòng </a>
                          <i className={`fas fa-caret-down ${styles.icon_color_white}`}></i>
                          <ul className={`${styles.dropdown} ${styles.arrow_top}`}>
                            <li><a href="#">Hiện có</a></li>
                            <li><a href="#">Phòng đơn</a></li>
                            <li><a href="#">Phòng đôi</a></li>
                            <li><a href="#">Phòng gia đình</a></li> 
                            <li className={`${styles.has_children}`}>
                            
                              <a href="#"> <i className={`fas fa-caret-down ${styles.icon_color_white}`}></i>Dịch vụ</a>
                              <ul className={`${styles.dropdown}`}>
                                <li><a href="#">Phòng cao cấp</a></li>
                                <li><a href="#">Tắm hơi</a></li>
                                <li><a href="#">Ăn uống</a></li> 
                                
                              </ul>
                            </li>
  
                          </ul>
                        </li>
                        <li><a href="#">Sự kiện</a></li>
                        <li><a href="#">Thông tin</a></li>
                        <li><a href="#">Liên hệ</a></li>
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
                            Xin chào, {user?.Username || user?.username}
                        </span>
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