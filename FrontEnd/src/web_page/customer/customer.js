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
                            {/* ✅ THÊM: Feedback Card */}
                            <div className="col-md-6">
                                <div className="card border-info mb-4">
                                    <div className="card-body text-center">
                                        <i className="fas fa-star fa-3x text-info mb-3"></i>
                                        <h5>Đánh giá dịch vụ</h5>
                                        <p>Chia sẻ trải nghiệm và đánh giá dịch vụ khách sạn</p>
                                        <Link to="/customer-feedback" className="btn btn-info">
                                            Gửi đánh giá
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-info mb-4">
                                    <div className="card-body text-center">
                                        <i className="fas fa-coins fa-3x text-info mb-3"></i>
                                        <h5>Điểm thưởng</h5>
                                        <p>Xem và sử dụng điểm tích lũy</p>
                                        <Link to="/loyaltypoint" className="btn btn-info">
                                            Xem điểm thưởng
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-info mb-4">
                                    <div className="card-body text-center">
                                        <i className="fas fa-receipt fa-3x text-info mb-3"></i>
                                        <h5>Lịch sử giao dịch</h5>
                                        <p>Theo dõi các giao dịch thanh toán</p>
                                        <Link to="/transaction-history" className="btn btn-info">
                                            Xem lịch sử
                                        </Link>
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

                        {/* ✅ THÊM: Quick Stats Section */}
                        <div className="row mt-4">
                            <div className="col-12">
                                <h4><i className="fas fa-chart-line me-2 text-info"></i>Thống kê nhanh</h4>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-light border-info mb-3">
                                    <div className="card-body text-center">
                                        <h5 className="text-info">0</h5>
                                        <small>Lần đặt phòng</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-light border-info mb-3">
                                    <div className="card-body text-center">
                                        <h5 className="text-info">0</h5>
                                        <small>Đánh giá đã gửi</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-light border-info mb-3">
                                    <div className="card-body text-center">
                                        <h5 className="text-info">0</h5>
                                        <small>Điểm thưởng</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-light border-info mb-3">
                                    <div className="card-body text-center">
                                        <h5 className="text-info">Đồng</h5>
                                        <small>Hạng thành viên</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ✅ THÊM: Quick Actions */}
                        <div className="row mt-4">
                            <div className="col-12">
                                <h4><i className="fas fa-bolt me-2 text-info"></i>Thao tác nhanh</h4>
                            </div>
                            <div className="col-md-4">
                                <div className="list-group">
                                    <Link to="/booking" className="list-group-item list-group-item-action d-flex align-items-center">
                                        <i className="fas fa-plus-circle text-info me-3"></i>
                                        <div>
                                            <h6 className="mb-1">Đặt phòng mới</h6>
                                            <small>Tìm và đặt phòng phù hợp</small>
                                        </div>
                                    </Link>
                                    <Link to="/customer-feedback" className="list-group-item list-group-item-action d-flex align-items-center">
                                        <i className="fas fa-comment-alt text-info me-3"></i>
                                        <div>
                                            <h6 className="mb-1">Gửi phản hồi</h6>
                                            <small>Chia sẻ trải nghiệm của bạn</small>
                                        </div>
                                    </Link>
                                    <Link to="/profile" className="list-group-item list-group-item-action d-flex align-items-center">
                                        <i className="fas fa-user-edit text-info me-3"></i>
                                        <div>
                                            <h6 className="mb-1">Cập nhật hồ sơ</h6>
                                            <small>Chỉnh sửa thông tin cá nhân</small>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                            <div className="col-md-8">
                                <div className="card border-info">
                                    <div className="card-header bg-info text-white">
                                        <h6 className="mb-0"><i className="fas fa-bell me-2"></i>Thông báo mới nhất</h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="alert alert-light mb-2">
                                            <i className="fas fa-info-circle text-info me-2"></i>
                                            <small>Chào mừng bạn đến với hệ thống khách sạn!</small>
                                        </div>
                                        <div className="alert alert-light mb-2">
                                            <i className="fas fa-gift text-warning me-2"></i>
                                            <small>Ưu đãi đặc biệt cho khách hàng mới - Giảm 10% cho lần đặt đầu tiên</small>
                                        </div>
                                        <div className="alert alert-light mb-0">
                                            <i className="fas fa-star text-success me-2"></i>
                                            <small>Hãy để lại đánh giá sau khi sử dụng dịch vụ để nhận điểm thưởng</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="alert alert-light border-info mt-4">
                            <h5><i className="fas fa-phone me-2 text-info"></i>Liên hệ hỗ trợ</h5>
                            <p className="mb-0">
                                Hotline: <strong>0865.124.996</strong> (24/7)<br />
                                Email: <strong>datltthe194235@gmail.com</strong><br />
                                <small className="text-muted">Chúng tôi luôn sẵn sàng hỗ trợ bạn!</small>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Customer;