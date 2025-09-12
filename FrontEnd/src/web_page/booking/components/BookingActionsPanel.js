import React, { useState } from 'react';
import { toast } from 'react-toastify';

const BookingActionsPanel = ({ booking, onStatusUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // ✅ Handle payment (Placeholder)
  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán hợp lệ');
      return;
    }

    setLoading(true);
    
    try {
      console.log('💰 Processing payment...');
      
      const response = await fetch(`http://localhost:3000/api/bookings/${booking.bookingID}/payment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentAmount: parseFloat(paymentAmount),
          paymentMethod,
          paymentType: 'deposit'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Thanh toán thành công!');
        onStatusUpdate && onStatusUpdate(result.data);
      } else {
        toast.error(result.message || 'Lỗi khi thanh toán');
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      toast.error('Lỗi kết nối khi thanh toán');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle check-in (Placeholder)
  const handleCheckIn = async () => {
    setLoading(true);
    
    try {
      console.log('🏨 Processing check-in...');
      
      const response = await fetch(`http://localhost:3000/api/bookings/${booking.bookingID}/checkin`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actualCheckInTime: new Date().toISOString(),
          guestCount: booking.numberOfGuest
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Check-in thành công!');
        onStatusUpdate && onStatusUpdate(result.data);
      } else {
        toast.error(result.message || 'Lỗi khi check-in');
      }
    } catch (error) {
      console.error('❌ Check-in error:', error);
      toast.error('Lỗi kết nối khi check-in');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    switch (booking.bookingStatus) {
      case 'Confirmed':
        return {
          title: 'Cần thanh toán tiền cọc',
          icon: 'fa-credit-card',
          color: '#17a2b8',
          action: 'payment'
        };
      case 'Paid':
        return {
          title: 'Sẵn sàng check-in',
          icon: 'fa-key',
          color: '#28a745',
          action: 'checkin'
        };
      case 'CheckedIn':
        return {
          title: 'Khách đang lưu trú',
          icon: 'fa-home',
          color: '#007bff',
          action: 'none'
        };
      default:
        return {
          title: 'Trạng thái không xác định',
          icon: 'fa-question',
          color: '#6c757d',
          action: 'none'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="card mt-3">
      <div className="card-header d-flex align-items-center">
        <i className={`fas ${statusInfo.icon} me-2`} style={{ color: statusInfo.color }}></i>
        <h6 className="mb-0">{statusInfo.title}</h6>
      </div>
      
      <div className="card-body">
        {/* Payment Section */}
        {statusInfo.action === 'payment' && (
          <div className="payment-section">
            <p className="text-muted mb-3">
              Booking đã được xác nhận và phòng đã được đặt. Vui lòng thu tiền cọc từ khách hàng.
            </p>
            
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Số tiền thanh toán</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={loading}
                  />
                  <span className="input-group-text">VNĐ</span>
                </div>
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Phương thức thanh toán</label>
                <select 
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="card">Thẻ ngân hàng</option>
                  <option value="transfer">Chuyển khoản</option>
                </select>
              </div>
            </div>
            
            <button
              className="btn btn-primary mt-3"
              onClick={handlePayment}
              disabled={loading || !paymentAmount}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fas fa-credit-card me-2"></i>
                  Xác nhận thanh toán
                </>
              )}
            </button>
          </div>
        )}

        {/* Check-in Section */}
        {statusInfo.action === 'checkin' && (
          <div className="checkin-section">
            <p className="text-muted mb-3">
              Thanh toán đã hoàn tất. Khách hàng có thể check-in và nhận phòng.
            </p>
            
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Thông tin check-in:</strong>
              <ul className="mb-0 mt-2">
                <li>Số khách: {booking.numberOfGuest} người</li>
                <li>Phòng đã đặt: {booking.assignedRooms?.length || 0} phòng</li>
                <li>Trạng thái phòng: Đã đặt → Sẽ chuyển thành "Đang sử dụng"</li>
              </ul>
            </div>
            
            <button
              className="btn btn-success"
              onClick={handleCheckIn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fas fa-key me-2"></i>
                  Xác nhận check-in
                </>
              )}
            </button>
          </div>
        )}

        {/* Completed Section */}
        {statusInfo.action === 'none' && booking.bookingStatus === 'CheckedIn' && (
          <div className="completed-section">
            <div className="alert alert-success">
              <i className="fas fa-check-circle me-2"></i>
              <strong>Check-in hoàn tất!</strong>
              <p className="mb-0 mt-2">
                Khách hàng đã check-in thành công. Phòng đang được sử dụng.
              </p>
            </div>
            
            <div className="mt-3">
              <small className="text-muted">
                <i className="fas fa-clock me-1"></i>
                Chức năng check-out và thanh toán cuối kỳ đang được phát triển...
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingActionsPanel;