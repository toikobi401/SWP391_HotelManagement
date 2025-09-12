import React, { useState, useEffect } from 'react';
import SimpleModal from '../../UI component/Modal/SimpleModal';

const ServiceUsageModal = ({ isOpen, onClose, serviceId, serviceName }) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && serviceId) {
      loadUsageData();
    }
  }, [isOpen, serviceId]);

  const loadUsageData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/services/${serviceId}/usage`);
      const result = await response.json();
      
      if (result.success) {
        setUsage(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Lỗi khi tải thông tin sử dụng');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa sử dụng';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="d-flex align-items-center">
          <i className="fas fa-chart-line me-2 text-info"></i>
          Thông tin sử dụng: {serviceName}
        </div>
      }
    >
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {usage && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card border-primary">
              <div className="card-body text-center">
                <h3 className="text-primary mb-1">{usage.usage.TotalBookings}</h3>
                <small className="text-muted">Tổng số lần đặt</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card border-success">
              <div className="card-body text-center">
                <h3 className="text-success mb-1">{usage.usage.UniqueBookings}</h3>
                <small className="text-muted">Booking duy nhất</small>
              </div>
            </div>
          </div>
          
          <div className="col-12">
            <div className="card border-warning">
              <div className="card-body text-center">
                <h3 className="text-warning mb-1">
                  {formatCurrency(usage.usage.TotalRevenue)}
                </h3>
                <small className="text-muted">Tổng doanh thu</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="fas fa-calendar-alt me-2 text-info"></i>
                  Lần đầu sử dụng
                </h6>
                <p className="mb-0">{formatDate(usage.usage.FirstUsed)}</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="fas fa-calendar-check me-2 text-success"></i>
                  Lần cuối sử dụng
                </h6>
                <p className="mb-0">{formatDate(usage.usage.LastUsed)}</p>
              </div>
            </div>
          </div>
          
          <div className="col-12">
            <div className={`alert ${usage.isInUse ? 'alert-warning' : 'alert-success'}`}>
              <i className={`fas ${usage.isInUse ? 'fa-exclamation-triangle' : 'fa-check-circle'} me-2`}></i>
              {usage.isInUse 
                ? 'Dịch vụ này đang được sử dụng trong các booking. Cần cân nhắc khi xóa.'
                : 'Dịch vụ này chưa được sử dụng. Có thể xóa an toàn.'
              }
            </div>
          </div>
        </div>
      )}
      
      <div className="d-flex justify-content-end mt-3">
        <button className="btn btn-secondary" onClick={onClose}>
          <i className="fas fa-times me-2"></i>
          Đóng
        </button>
      </div>
    </SimpleModal>
  );
};

export default ServiceUsageModal;