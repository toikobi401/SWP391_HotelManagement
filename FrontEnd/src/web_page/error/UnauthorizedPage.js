import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleNavigation } from '../../hooks/useRoleNavigation';

const UnauthorizedPage = () => {
    const { user, isLoggedIn } = useAuth();
    const { getAvailableRoutes, navigateToRolePage } = useRoleNavigation();
    
    const availableRoutes = getAvailableRoutes();

    return (
        <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <div className="text-center">
                <div className="error-page">
                    <div className="error-code">
                        <i className="fas fa-shield-alt text-warning" style={{ fontSize: '8rem' }}></i>
                    </div>
                    <h1 className="display-4 fw-bold text-dark mb-4">403</h1>
                    <h2 className="h3 text-secondary mb-4">Không có quyền truy cập</h2>
                    
                    {isLoggedIn ? (
                        <div>
                            <p className="lead text-muted mb-4">
                                Xin chào <strong>{user?.Fullname || user?.Username}</strong>,<br />
                                Bạn không có quyền truy cập trang này.
                            </p>
                            
                            {availableRoutes.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-secondary mb-3">Các trang bạn có thể truy cập:</h5>
                                    <div className="d-flex flex-wrap justify-content-center gap-3">
                                        {availableRoutes.map((route) => (
                                            <Link
                                                key={route.path}
                                                to={route.path}
                                                className="btn btn-outline-primary d-flex align-items-center gap-2 px-4 py-2"
                                                style={{ 
                                                    borderColor: route.color,
                                                    color: route.color 
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = route.color;
                                                    e.target.style.color = 'white';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = 'transparent';
                                                    e.target.style.color = route.color;
                                                }}
                                            >
                                                <i className={route.icon}></i>
                                                {route.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="d-flex flex-wrap justify-content-center gap-3">
                                {availableRoutes.length > 0 && (
                                    <button 
                                        className="btn btn-primary px-4 py-2"
                                        onClick={navigateToRolePage}
                                    >
                                        <i className="fas fa-home me-2"></i>
                                        Đi đến trang chính
                                    </button>
                                )}
                                <Link to="/" className="btn btn-outline-secondary px-4 py-2">
                                    <i className="fas fa-arrow-left me-2"></i>
                                    Về trang chủ
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="lead text-muted mb-4">
                                Bạn cần đăng nhập để truy cập trang này.
                            </p>
                            <div className="d-flex justify-content-center gap-3">
                                <Link to="/login" className="btn btn-primary px-4 py-2">
                                    <i className="fas fa-sign-in-alt me-2"></i>
                                    Đăng nhập
                                </Link>
                                <Link to="/" className="btn btn-outline-secondary px-4 py-2">
                                    <i className="fas fa-home me-2"></i>
                                    Trang chủ
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;