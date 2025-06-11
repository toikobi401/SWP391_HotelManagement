import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Manager = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="manager-page">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <div className="page-header bg-danger text-white p-4 mb-4">
                            <h1><i className="fas fa-shield-alt me-3"></i>Trang Quản Lý</h1>
                            <p className="mb-0">Xin chào {user?.Fullname || user?.Username}, chào mừng đến trang quản lý Hotel HUB</p>
                        </div>
                        
                        <div className="alert alert-info">
                            <h4><i className="fas fa-info-circle me-2"></i>Thông báo</h4>
                            <p className="mb-0">Trang quản lý đang được phát triển. Các tính năng sẽ được cập nhật sớm.</p>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <div className="card border-danger">
                                    <div className="card-body text-center">
                                        <i className="fas fa-chart-bar fa-3x text-danger mb-3"></i>
                                        <h5>Báo cáo & Thống kê</h5>
                                        <p>Xem báo cáo doanh thu và hiệu suất</p>
                                        <button className="btn btn-outline-danger" disabled>
                                            Đang phát triển
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-danger">
                                    <div className="card-body text-center">
                                        <i className="fas fa-users fa-3x text-danger mb-3"></i>
                                        <h5>Quản lý nhân sự</h5>
                                        <p>Quản lý đội ngũ và phân quyền</p>
                                        <button className="btn btn-outline-danger" disabled>
                                            Đang phát triển
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-danger">
                                    <div className="card-body text-center">
                                        <i className="fas fa-cog fa-3x text-danger mb-3"></i>
                                        <h5>Cài đặt hệ thống</h5>
                                        <p>Cấu hình và thiết lập khách sạn</p>
                                        <button className="btn btn-outline-danger" disabled>
                                            Đang phát triển
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Manager;