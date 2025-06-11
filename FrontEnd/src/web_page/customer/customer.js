import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Customer = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('services');

    return (
        <div className="customer-page">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <div className="page-header bg-info text-white p-4 mb-4">
                            <h1><i className="fas fa-user-circle me-3"></i>Trang Khách Hàng</h1>
                            <p className="mb-0">Xin chào {user?.Fullname || user?.Username}, chào mừng đến với Hotel HUB</p>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="card border-info mb-4">
                                    <div className="card-body text-center">
                                        <i className="fas fa-bed fa-3x text-info mb-3"></i>
                                        <h5>Đặt phòng</h5>
                                        <p>Đặt phòng dễ dàng với nhiều lựa chọn</p>
                                        <Link to="/booking" className="btn btn-info">
                                            Đặt phòng ngay
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-info mb-4">
                                    <div className="card-body text-center">
                                        <i className="fas fa-history fa-3x text-info mb-3"></i>
                                        <h5>Lịch sử đặt phòng</h5>
                                        <p>Xem lại các đặt phòng trước đây</p>
                                        <button className="btn btn-outline-info" disabled>
                                            Đang phát triển
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-info mb-4">
                                    <div className="card-body text-center">
                                        <i className="fas fa-star fa-3x text-info mb-3"></i>
                                        <h5>Dịch vụ VIP</h5>
                                        <p>Trải nghiệm dịch vụ cao cấp</p>
                                        <button className="btn btn-outline-info" disabled>
                                            Đang phát triển
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-info mb-4">
                                    <div className="card-body text-center">
                                        <i className="fas fa-gift fa-3x text-info mb-3"></i>
                                        <h5>Ưu đãi đặc biệt</h5>
                                        <p>Khám phá các ưu đãi hấp dẫn</p>
                                        <button className="btn btn-outline-info" disabled>
                                            Đang phát triển
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="alert alert-light border-info">
                            <h5><i className="fas fa-phone me-2 text-info"></i>Liên hệ hỗ trợ</h5>
                            <p className="mb-0">
                                Hotline: <strong>0865.124.996</strong> (24/7)<br />
                                Email: <strong>datltthe194235@gmail.com</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Customer;