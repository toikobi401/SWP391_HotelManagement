import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleNavigation } from '../../hooks/useRoleNavigation';

const NotFoundPage = () => {
    const { isLoggedIn } = useAuth();
    const { navigateToRolePage } = useRoleNavigation();

    return (
        <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <div className="text-center">
                <div className="error-page">
                    <div className="error-code">
                        <i className="fas fa-question-circle text-info" style={{ fontSize: '8rem' }}></i>
                    </div>
                    <h1 className="display-4 fw-bold text-dark mb-4">404</h1>
                    <h2 className="h3 text-secondary mb-4">Trang không tìm thấy</h2>
                    <p className="lead text-muted mb-4">
                        Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
                    </p>
                    
                    <div className="d-flex flex-wrap justify-content-center gap-3">
                        {isLoggedIn && (
                            <button 
                                className="btn btn-primary px-4 py-2"
                                onClick={navigateToRolePage}
                            >
                                <i className="fas fa-user me-2"></i>
                                Trang cá nhân
                            </button>
                        )}
                        <Link to="/" className="btn btn-outline-primary px-4 py-2">
                            <i className="fas fa-home me-2"></i>
                            Về trang chủ
                        </Link>
                        <Link to="/contact" className="btn btn-outline-secondary px-4 py-2">
                            <i className="fas fa-envelope me-2"></i>
                            Liên hệ hỗ trợ
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;