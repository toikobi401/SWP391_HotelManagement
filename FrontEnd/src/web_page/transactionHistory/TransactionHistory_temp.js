import React, { useState, useEffect } from 'react';
import { FaSearch, FaFileExcel, FaEye, FaCalendarAlt, FaBed, FaUser, FaClock } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './TransactionHistory.css';

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Get user info from localStorage or context
  const [userID, setUserID] = useState(null);

  const { isLoggedIn, user, loading: authLoading } = useAuth();

  // ✅ Kiểm tra user đã đăng nhập và có UserID
  useEffect(() => {
    if (!authLoading) {
      if (!isLoggedIn || !user?.UserID) {
        setError('Vui lòng đăng nhập để xem lịch sử booking');
        setLoading(false);
        return;
      }
      setUserID(user.UserID);
    }
  }, [isLoggedIn, user, authLoading]);

  // ✅ Render loading state
  if (authLoading) {
    return (
      <div className="transaction-history-page">
        <div className="transaction-container">
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Đang tải thông tin người dùng...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Render login required
  if (!isLoggedIn || !user?.UserID) {
    return (
      <div className="transaction-history-page">
        <div className="transaction-container">
          <div className="text-center p-5">
            <FaUser size={64} className="text-muted mb-3" />
            <h4 className="text-muted">Yêu cầu đăng nhập</h4>
            <p className="text-muted">Vui lòng đăng nhập để xem lịch sử booking của bạn</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/login'}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (userID) {
      fetchBookingHistory();
    }
  }, [userID, currentPage, statusFilter, dateFrom, dateTo]);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        pageSize,
        status: statusFilter,
        dateFrom,
        dateTo
      };

      console.log('🔍 Fetching booking history with params:', params);

      const response = await axios.get(`http://localhost:3000/api/bookings/user/${userID}/history`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setBookings(response.data.data.bookings || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
        setTotalItems(response.data.data.pagination?.totalItems || 0);
        console.log('✅ Booking history fetched successfully:', response.data.data);
      } else {
        setError(response.data.message || 'Không thể tải lịch sử booking');
      }
    } catch (error) {
      console.error('❌ Error fetching booking history:', error);
      setError('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getStatusText = (status) => {
    const statusMap = {
      'Pending': 'Chờ xác nhận',
      'Confirmed': 'Đã xác nhận',
      'CheckedIn': 'Đã check-in',
      'CheckedOut': 'Đã check-out',
      'Cancelled': 'Đã hủy',
      'Refunded': 'Đã hoàn tiền'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'Pending': 'bg-warning text-dark',
      'Confirmed': 'bg-info text-white',
      'CheckedIn': 'bg-primary text-white',
      'CheckedOut': 'bg-success text-white',
      'Cancelled': 'bg-danger text-white',
      'Refunded': 'bg-secondary text-white'
    };
    return colorMap[status] || 'bg-secondary text-white';
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchBookingHistory();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Calculate statistics
  const stats = {
    all: bookings.length,
    completed: bookings.filter(b => b.BookingStatus === 'CheckedOut').length,
    pending: bookings.filter(b => ['Pending', 'Confirmed'].includes(b.BookingStatus)).length,
    refund: bookings.filter(b => ['Cancelled', 'Refunded'].includes(b.BookingStatus)).length
  };

  return (
    <div className="transaction-history-page">
      <div className="transaction-container">
        {/* Header */}
        <div className="transaction-header">
          <h1>
            <FaBed className="me-3" />
            Lịch sử booking của tôi
          </h1>
          <p>Xem và quản lý tất cả các đơn booking bạn đã tạo</p>
        </div>

        {/* Statistics */}
        <div className="stats-grid">
          <div className="stat-card all">
            <div className="stat-icon">
              <FaBed />
            </div>
            <div className="stat-info">
              <h3>{stats.all}</h3>
              <p>Tổng booking</p>
            </div>
          </div>
          <div className="stat-card completed">
            <div className="stat-icon">
              <FaUser />
            </div>
            <div className="stat-info">
              <h3>{stats.completed}</h3>
              <p>Đã hoàn thành</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <FaClock />
            </div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Đang xử lý</p>
            </div>
          </div>
          <div className="stat-card refund">
            <div className="stat-icon">
              <FaFileExcel />
            </div>
            <div className="stat-info">
              <h3>{stats.refund}</h3>
              <p>Đã hủy/Hoàn</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="search-section">
          <div className="search-controls">
            <div className="search-group">
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm theo mã booking..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FaSearch className="search-icon" />
            </div>
            <select
              className="search-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ xác nhận</option>
              <option value="Confirmed">Đã xác nhận</option>
              <option value="CheckedIn">Đã check-in</option>
              <option value="CheckedOut">Đã check-out</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
            <input
              type="date"
              className="search-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Từ ngày"
            />
            <input
              type="date"
              className="search-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Đến ngày"
            />
            <button
              className="search-button"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? 'Đang tải...' : 'Cập nhật danh sách'}
            </button>
            <button className="export-button">
              <FaFileExcel className="me-2" />
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="table-responsive">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Mã booking</th>
                <th>Ngày tạo</th>
                <th>Loại phòng</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center p-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-4">
                    <FaBed size={48} className="text-muted mb-3 d-block mx-auto" />
                    <p className="text-muted mb-0">Chưa có booking nào được tạo</p>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.BookingID}>
                    <td>
                      <strong>#{booking.BookingID}</strong>
                    </td>
                    <td>{formatDate(booking.CreateAt)}</td>
                    <td>
                      {booking.RoomTypes?.length > 0 ? (
                        <div>
                          {booking.RoomTypes.map((rt, idx) => (
                            <div key={idx} className="mb-1">
                              <strong>{rt.TypeName}</strong>
                              <small className="text-muted d-block">
                                Số lượng: {rt.Quantity} phòng
                              </small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">Chưa xác định</span>
                      )}
                    </td>
                    <td>
                      {booking.RoomTypes?.length > 0 && booking.RoomTypes[0].CheckInAt 
                        ? formatDate(booking.RoomTypes[0].CheckInAt)
                        : <span className="text-muted">Chưa xác định</span>
                      }
                    </td>
                    <td>
                      {booking.RoomTypes?.length > 0 && booking.RoomTypes[0].CheckOutAt
                        ? formatDate(booking.RoomTypes[0].CheckOutAt)
                        : <span className="text-muted">Chưa xác định</span>
                      }
                    </td>
                    <td className="amount-cell">
                      <strong>{formatCurrency(booking.TotalAmount)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(booking.BookingStatus)}`}>
                        {getStatusText(booking.BookingStatus)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {/* TODO: View booking details */}}
                      >
                        <FaEye className="me-1" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span>Trang {currentPage} / {totalPages} (Tổng: {totalItems} đơn)</span>
          <div>
            <button 
              className="pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {'<'}
            </button>
            <button 
              className="pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {'>'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingHistory;
