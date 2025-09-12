import React, { useState, useEffect, useCallback } from 'react';
import styles from './SubmittionPage.module.css';
import './BookingManagement.css';
import CancelBookingModal from './CancelBookingModal';
import RoomSelectionModalOnline from '../../onlinebooking/component/RoomSelectionModalOnline';
import { useBookingManagement } from '../useBookingManagement';
import { useAuth } from '../../../contexts/AuthContext';

const CheckInOutTable = () => {
  const { user } = useAuth();
  const {
    bookings,
    loading,
    error,
    pagination,
    fetchBookings,
    fetchAllBookings, // ✅ THÊM: Sử dụng method mới
    getBookingDetails,
    updateBookingStatus,
    cancelBooking,
    confirmBooking, // ✅ THÊM: Method để confirm booking
    checkInBooking, // ✅ THÊM: Method để check-in với gán phòng
    checkBookingRoomAssignment, // ✅ THÊM: Method để check room assignment
    directCheckInAssignedBooking, // ✅ THÊM: Method để direct check-in
    smartCheckInBooking, // ✅ THÊM: Method để smart check-in
    getAvailableRooms,
    assignRoomsToBooking,
    getPossibleStatusTransitions
  } = useBookingManagement();

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRoomAssignModal, setShowRoomAssignModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [checkInDateFilter, setCheckInDateFilter] = useState('');
  const [checkOutDateFilter, setCheckOutDateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState(''); // ✅ THÊM: Filter tìm kiếm theo tên
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [possibleTransitions, setPossibleTransitions] = useState([]);
  const bookingsPerPage = 10;

  // ✅ THÊM: Helper function để refresh data với current filters
  const refreshBookings = useCallback(() => {
    fetchBookings({
      page: currentPage,
      pageSize: bookingsPerPage,
      phoneFilter: phoneFilter.trim(),
      statusFilter: statusFilter,
      nameFilter: nameFilter.trim(),
      checkInDate: checkInDateFilter,
      checkOutDate: checkOutDateFilter
    });
  }, [currentPage, phoneFilter, statusFilter, nameFilter, checkInDateFilter, checkOutDateFilter, fetchBookings]);

  // ✅ SỬA: Sử dụng server-side pagination với fetchBookings thay vì fetchAllBookings
  useEffect(() => {
    console.log('🔄 CheckInOutTable: Loading bookings with pagination and filters...');
    refreshBookings();
  }, [refreshBookings]);

  // ✅ XÓA: Không cần client-side filtering nữa vì đã có server-side
  // Filter bookings client-side for phone, status, and dates
  // const filteredBookings = bookings.filter(booking => { ... });

  // ✅ SỬA: Sử dụng data trực tiếp từ server
  const currentBookings = bookings || [];
  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.totalItems || 0;

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // ✅ THÊM: Reset về trang 1 khi thay đổi filter
  const handleFilterChange = (filterType, value) => {
    setCurrentPage(1); // Reset về trang 1
    
    switch(filterType) {
      case 'phone':
        setPhoneFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
      case 'name':
        setNameFilter(value);
        break;
      case 'checkInDate':
        setCheckInDateFilter(value);
        break;
      case 'checkOutDate':
        setCheckOutDateFilter(value);
        break;
      default:
        break;
    }
  };

  const handleOpenActionModal = async (booking) => {
    try {
      // ✅ Debug logging để check booking structure
      console.log('🔍 CheckInOutTable - Opening modal for booking:', {
        bookingID: booking.bookingID || booking.BookingID,
        hasBookingID: !!(booking.bookingID || booking.BookingID),
        bookingKeys: Object.keys(booking)
      });

      // ✅ Sử dụng bookingID hoặc BookingID (case-insensitive)
      const bookingId = booking.bookingID || booking.BookingID;
      
      if (!bookingId) {
        console.error('❌ No booking ID found in booking object:', booking);
        alert('Lỗi: Không tìm thấy ID của booking');
        return;
      }

      // Get detailed booking information from API
      const detailedBookingData = await getBookingDetails(bookingId);
      
      // ✅ THÊM: Validation cho detailedBookingData
      if (!detailedBookingData) {
        console.error('❌ No booking details returned');
        alert('Lỗi: Không thể tải thông tin chi tiết booking');
        return;
      }
      
      if (!detailedBookingData.bookingStatus) {
        console.error('❌ Booking details missing bookingStatus:', detailedBookingData);
        alert('Lỗi: Thông tin booking không đầy đủ');
        return;
      }

      // ✅ THÊM: Merge booking data từ list với detailed data từ API
      const enrichedBooking = {
        // Dữ liệu cơ bản từ booking list
        ...booking,
        // Dữ liệu chi tiết từ API
        ...detailedBookingData,
        // Dữ liệu bổ sung từ API details endpoint
        rooms: detailedBookingData.rooms || [],
        services: detailedBookingData.services || [],
        promotions: detailedBookingData.promotions || [],
        summary: detailedBookingData.summary || {
          totalRooms: 0,
          totalServices: 0,
          totalPromotions: 0
        },
        // Preserve display fields from original booking list
        displayCustomerPhone: booking.displayCustomerPhone,
        displayStatus: booking.displayStatus,
        customerName: booking.customerName || detailedBookingData.customerName,
        customerEmail: booking.customerEmail || detailedBookingData.customerEmail,
        receptionistName: booking.receptionistName || detailedBookingData.receptionistName,
        roomTypes: booking.roomTypes || detailedBookingData.roomTypes || []
      };

      console.log('✅ Enriched booking data for modal:', enrichedBooking);
      
      setSelectedBooking(enrichedBooking);
      
      // Get possible status transitions
      const transitions = getPossibleStatusTransitions(enrichedBooking.bookingStatus);
      setPossibleTransitions(transitions);
      
      setShowActionModal(true);
    } catch (error) {
      console.error('Error loading booking details:', error);
      alert(`Lỗi khi tải thông tin booking: ${error.message}`);
    }
  };

  const handleCloseActionModal = () => {
    setShowActionModal(false);
    setSelectedBooking(null);
    setSelectedStatus('');
    setPossibleTransitions([]);
  };

  const handleOpenCancelModal = () => {
    setShowActionModal(false);
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
  };

  const handleOpenRoomAssignModal = async () => {
    try {
      // ✅ THÊM: Kiểm tra xem booking đã được gán phòng chưa
      console.log('🔍 Checking if booking already has assigned rooms...');
      const assignmentStatus = await checkBookingRoomAssignment(selectedBooking.bookingID);
      
      if (assignmentStatus.isAssigned) {
        console.log('📋 Booking already has assigned rooms, performing direct check-in');
        
        // Hiển thị thông báo và thực hiện direct check-in
        if (window.confirm(`Booking này đã được gán ${assignmentStatus.roomCount} phòng. Bạn có muốn check-in ngay không?`)) {
          const additionalData = {
            receptionistID: user?.UserID || 1,
            assignedBy: user?.Fullname || user?.Username || 'Receptionist'
          };
          
          await directCheckInAssignedBooking(selectedBooking.bookingID);
          alert('Check-in thành công! Các phòng đã được gán trước đó đã chuyển sang trạng thái đang sử dụng.');
          
          // Refresh bookings list
          refreshBookings();
          
          setShowActionModal(false);
          return;
        } else {
          setShowActionModal(false);
          return;
        }
      }
      
      // ✅ Nếu chưa được gán phòng, hiển thị modal gán phòng như cũ
      console.log('🆕 Booking needs room assignment, showing room selection modal');
      const rooms = await getAvailableRooms(selectedBooking.bookingID);
      setAvailableRooms(rooms);
      setShowActionModal(false);
      setShowRoomAssignModal(true);
      
    } catch (error) {
      console.error('Error handling room assignment:', error);
      alert(error.message || 'Lỗi khi xử lý room assignment');
    }
  };

  const handleCloseRoomAssignModal = () => {
    setShowRoomAssignModal(false);
    setSelectedRooms([]);
    setAvailableRooms([]);
  };

  const handleActionSubmit = async () => {
    if (!selectedStatus || !selectedBooking) return;

    try {
      // ✅ Xử lý các action theo transition mới
      const transitions = getPossibleStatusTransitions(selectedBooking.bookingStatus);
      const selectedTransition = transitions.find(t => t.value === selectedStatus);
      
      if (!selectedTransition) {
        throw new Error('Action không hợp lệ');
      }

      switch (selectedTransition.action) {
        case 'confirm':
          // Confirm booking (không gán phòng)
          await confirmBooking(selectedBooking.bookingID);
          alert('Xác nhận booking thành công!');
          break;
          
        case 'checkin':
          // Check-in with room assignment
          handleOpenRoomAssignModal();
          return; // Don't close modal yet
          
        case 'cancel':
          // Cancel booking
          handleOpenCancelModal();
          return; // Don't close modal yet
          
        case 'checkout':
          // Check-out
          await updateBookingStatus(selectedBooking.bookingID, selectedStatus);
          alert('Check-out thành công!');
          break;
          
        default:
          // Default status update
          await updateBookingStatus(selectedBooking.bookingID, selectedStatus);
          alert('Cập nhật trạng thái thành công!');
          break;
      }

      handleCloseActionModal();
      
      // Refresh bookings list
      refreshBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert(error.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleCancelBooking = useCallback(async () => {
    try {
      console.log('✅ Booking cancelled successfully, refreshing list...');
      
      // Refresh bookings list
      await fetchAllBookings();
      
      // Close modal
      handleCloseCancelModal();
      
    } catch (error) {
      console.error('Error refreshing bookings after cancel:', error);
    }
  }, [fetchAllBookings]); // ✅ Thêm dependency fetchAllBookings

  const handleRoomAssignment = async (assignmentData) => {
    try {
      console.log('🏨 Preparing check-in data for online booking:', assignmentData);
      
      // ✅ Extract data from assignmentData object
      const { booking, selectedRooms } = assignmentData;
      
      // ✅ Validate selectedRooms is an array
      if (!Array.isArray(selectedRooms)) {
        throw new Error('Selected rooms must be an array');
      }
      
      console.log('📋 Check-in details:', {
        bookingID: booking?.bookingID,
        roomCount: selectedRooms.length,
        selectedRooms: selectedRooms
      });
      
      // ✅ Prepare additional data for API
      const additionalData = {
        receptionistID: user?.UserID || 1,
        assignedBy: user?.Fullname || user?.Username || 'Receptionist'
      };
      
      // ✅ SỬA: Sử dụng checkInBooking để thực hiện check-in thực tế với gán phòng
      await checkInBooking(selectedBooking.bookingID, selectedRooms, additionalData);
      alert('Check-in thành công! Phòng đã được gán và chuyển sang trạng thái đang sử dụng.');
      handleCloseRoomAssignModal();
      
      // Refresh bookings list
      
      // Refresh bookings list  
      refreshBookings();
    } catch (error) {
      console.error('Error during check-in:', error);
      alert(error.message || 'Lỗi khi check-in');
    }
  };  return (
    <>
      <div className={styles.filterContainer}>
        <div className="row g-3">
          <div className="col-md-6 col-lg-3">
            <label className={styles.filterLabel}>Tìm kiếm theo tên</label>
            <input
              type="text"
              className={`form-control ${styles.formControl}`}
              placeholder="Nhập tên khách hàng..."
              value={nameFilter}
              onChange={(e) => handleFilterChange('name', e.target.value)}
            />
          </div>
          <div className="col-md-6 col-lg-2">
            <label className={styles.filterLabel}>Số điện thoại</label>
            <input
              type="text"
              className={`form-control ${styles.formControl}`}
              placeholder="Nhập SĐT..."
              value={phoneFilter}
              onChange={(e) => handleFilterChange('phone', e.target.value)}
            />
          </div>
          <div className="col-md-6 col-lg-2">
            <label className={styles.filterLabel}>Trạng thái</label>
            <select
              className={`form-select ${styles.formSelect}`}
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Đang chờ xử lý</option>
              <option value="Confirmed">Đã xác nhận</option>
              <option value="CheckedIn">Đã check-in</option>
              <option value="CheckedOut">Đã check-out</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
          <div className="col-md-6 col-lg-2">
            <label className={styles.filterLabel}>Ngày check-in</label>
            <input
              type="date"
              className={`form-control ${styles.formControl}`}
              value={checkInDateFilter}
              onChange={(e) => handleFilterChange('checkInDate', e.target.value)}
              title="Lọc theo ngày check-in chính xác"
            />
          </div>
          <div className="col-md-6 col-lg-2">
            <label className={styles.filterLabel}>Ngày check-out</label>
            <input
              type="date"
              className={`form-control ${styles.formControl}`}
              value={checkOutDateFilter}
              onChange={(e) => handleFilterChange('checkOutDate', e.target.value)}
              title="Lọc theo ngày check-out chính xác"
            />
          </div>
          <div className="col-md-6 col-lg-1 d-flex align-items-end">
            <button 
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setNameFilter('');
                setPhoneFilter('');
                setStatusFilter('');
                setCheckInDateFilter('');
                setCheckOutDateFilter('');
                setCurrentPage(1);
              }}
              title="Xóa tất cả bộ lọc"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        {/* ✅ THÊM: Hiển thị thông tin pagination */}
        <div className="row mt-2">
          <div className="col-12">
            <small className="text-muted">
              Hiển thị {currentBookings.length} trong tổng số {totalItems} booking
              {(nameFilter || phoneFilter || statusFilter || checkInDateFilter || checkOutDateFilter) && 
                ' (đã lọc)'
              }
            </small>
          </div>
        </div>
      </div>

      {loading && (
        <div className="d-flex justify-content-center my-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      )}

      {error && (
        <div className={`alert alert-danger ${styles.alert}`}>
          {error}
        </div>
      )}

      {!loading && currentBookings.length === 0 ? (
        <div className={`alert alert-info text-center ${styles.alert}`}>
          {(nameFilter || phoneFilter || statusFilter || checkInDateFilter || checkOutDateFilter) 
            ? 'Không có booking nào phù hợp với bộ lọc'
            : 'Không có booking nào'
          }
        </div>
      ) : (
        <>
          <table className={`table table-bordered table-hover ${styles.table}`}>
            <thead className={`table-dark ${styles.tableHead}`}>
              <tr>
                <th>Số điện thoại</th>
                <th>Tên khách</th>
                <th>Số người</th>
                <th>Ngày đặt</th>
                <th>Ngày check-in</th>
                <th>Ngày check-out</th>
                <th>Chi tiết Check-in/out</th>
                <th>Loại phòng</th>
                <th>Loại booking</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentBookings.map((booking, index) => {
                // ✅ Safe key generation - sử dụng bookingID hoặc fallback to index
                const safeKey = booking.bookingID || booking.BookingID || `booking-${index}`;
                
                return (
                  <tr key={safeKey}>
                    <td>{booking.displayCustomerPhone}</td>
                    <td>{booking.customerName || booking.walkInGuestName || 'Walk-in Guest'}</td>
                    <td>{booking.numberOfGuest}</td>
                    <td>{new Date(booking.createAt).toLocaleDateString('vi-VN')}</td>
                    <td>{new Date(booking.bookingAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      {booking.checkOutDate 
                        ? new Date(booking.checkOutDate).toLocaleDateString('vi-VN')
                        : 'Chưa xác định'
                      }
                    </td>
                    <td>
                      <div className="room-type-details">
                        {booking.roomTypeDetails && booking.roomTypeDetails.length > 0 ? (
                          booking.roomTypeDetails.map((roomDetail, idx) => (
                            <div key={idx} className="room-detail-item" style={{ marginBottom: '5px', fontSize: '0.85em' }}>
                              <strong>{roomDetail.roomTypeName}</strong> (x{roomDetail.quantity})
                              <br />
                              <small style={{ color: '#666' }}>
                                <i className="fas fa-sign-in-alt"></i> {roomDetail.checkInAt ? new Date(roomDetail.checkInAt).toLocaleString('vi-VN') : 'Chưa xác định'}
                              </small>
                              <br />
                              <small style={{ color: '#666' }}>
                                <i className="fas fa-sign-out-alt"></i> {roomDetail.checkOutAt ? new Date(roomDetail.checkOutAt).toLocaleString('vi-VN') : 'Chưa xác định'}
                              </small>
                            </div>
                          ))
                        ) : (
                          <small style={{ color: '#999' }}>Chưa có thông tin chi tiết</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="room-types-display">
                        {booking.roomTypesDisplay || 'Chưa có thông tin phòng'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${booking.bookingType === true ? 'bg-primary' : 'bg-secondary'}`}>
                        {booking.bookingType === true ? 'Online' : 'Walk-in'}
                      </span>
                    </td>
                    <td>
                      <div className="special-request" title={booking.specialRequest}>
                        {booking.specialRequest 
                          ? (booking.specialRequest.length > 50 
                             ? booking.specialRequest.substring(0, 50) + '...' 
                             : booking.specialRequest)
                          : 'Không có'
                        }
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(booking.bookingStatus)}`}>
                        {booking.displayStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm btn-primary ${styles.button}`}
                        onClick={() => handleOpenActionModal(booking)}
                        disabled={loading}
                      >
                        Action
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <nav aria-label="Booking pagination">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
                </li>
                {[...Array(totalPages).keys()].map(page => (
                  <li key={page + 1} className={`page-item ${currentPage === page + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(page + 1)}>{page + 1}</button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}

      {/* Action Modal */}
      {showActionModal && selectedBooking && (
        <div className={`modal fade show d-block ${styles.modal}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xxl">
            <div className={`modal-content ${styles.modalContent}`}>
              <div className={`modal-header ${styles.modalHeader}`}>
                <h5 className={`modal-title ${styles.modalTitle}`}>
                  <i className="fas fa-clipboard-list me-2"></i>
                  Chi tiết booking #{selectedBooking.bookingID}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseActionModal}></button>
              </div>
              <div className={`modal-body ${styles.modalBody}`}>
                {/* Thông tin cơ bản booking */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card border-primary">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0"><i className="fas fa-user me-2"></i>Thông tin khách hàng</h6>
                      </div>
                      <div className="card-body">
                        <p><strong>Booking ID:</strong> {selectedBooking.bookingID}</p>
                        <p><strong>Tên khách:</strong> {selectedBooking.customerName || selectedBooking.walkInGuestName || 'Walk-in Guest'}</p>
                        <p><strong>Email:</strong> {selectedBooking.customerEmail || 'N/A'}</p>
                        <p><strong>Số điện thoại:</strong> {selectedBooking.displayCustomerPhone}</p>
                        <p><strong>Số người:</strong> {selectedBooking.numberOfGuest}</p>
                        {selectedBooking.specialRequest && (
                          <p><strong>Yêu cầu đặc biệt:</strong> <span className="text-muted">{selectedBooking.specialRequest}</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-info">
                      <div className="card-header bg-info text-white">
                        <h6 className="mb-0"><i className="fas fa-calendar me-2"></i>Thông tin booking</h6>
                      </div>
                      <div className="card-body">
                        <p><strong>Ngày tạo:</strong> {new Date(selectedBooking.createAt).toLocaleString('vi-VN')}</p>
                        <p><strong>Ngày check-in:</strong> {new Date(selectedBooking.bookingAt).toLocaleDateString('vi-VN')}</p>
                        <p><strong>Loại booking:</strong> 
                          <span className={`badge ms-2 ${selectedBooking.bookingType === true ? 'bg-primary' : 'bg-secondary'}`}>
                            {selectedBooking.bookingType === true ? 'Online' : 'Walk-in'}
                          </span>
                        </p>
                        <p><strong>Trạng thái hiện tại:</strong> 
                          <span className={`badge ms-2 ${getStatusBadgeClass(selectedBooking.bookingStatus)}`}>
                            {selectedBooking.displayStatus || selectedBooking.bookingStatus}
                          </span>
                        </p>
                        <p><strong>Lễ tân:</strong> {selectedBooking.receptionistName || 'Chưa có'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thông tin rooms đã được assign */}
                {selectedBooking.rooms && selectedBooking.rooms.length > 0 && (
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="card border-success">
                        <div className="card-header bg-success text-white">
                          <h6 className="mb-0"><i className="fas fa-bed me-2"></i>Phòng đã được gán ({selectedBooking.rooms.length} phòng)</h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            {selectedBooking.rooms.map((room, index) => (
                              <div key={room.bookingRoomID || index} className="col-md-4 mb-2">
                                <div className="alert alert-success mb-2">
                                  <strong>Phòng {room.roomNumber || room.roomID}</strong><br/>
                                  <small>Check-in: {new Date(room.checkInAt).toLocaleDateString('vi-VN')}</small><br/>
                                  <small>Check-out: {new Date(room.checkOutAt).toLocaleDateString('vi-VN')}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thông tin room types yêu cầu */}
                {selectedBooking.roomTypes && selectedBooking.roomTypes.length > 0 && (
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="card border-warning">
                        <div className="card-header bg-warning text-dark">
                          <h6 className="mb-0"><i className="fas fa-home me-2"></i>Loại phòng yêu cầu</h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            {selectedBooking.roomTypes.map((roomType, index) => (
                              <div key={roomType.bookingRoomTypeID || index} className="col-md-6 mb-2">
                                <div className="alert alert-warning mb-2">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <strong>{roomType.typeName}</strong><br/>
                                      <span>Số lượng: {roomType.quantity} phòng</span>
                                    </div>
                                    <div className="text-end">
                                      <span className="badge bg-primary">{roomType.basePrice?.toLocaleString('vi-VN')} VNĐ/đêm</span>
                                    </div>
                                  </div>
                                  {roomType.checkInAt && roomType.checkOutAt && (
                                    <small className="text-muted">
                                      {new Date(roomType.checkInAt).toLocaleDateString('vi-VN')} - {new Date(roomType.checkOutAt).toLocaleDateString('vi-VN')}
                                    </small>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thông tin services */}
                {selectedBooking.services && selectedBooking.services.length > 0 && (
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="card border-info">
                        <div className="card-header bg-info text-white">
                          <h6 className="mb-0"><i className="fas fa-concierge-bell me-2"></i>Dịch vụ đặt thêm ({selectedBooking.services.length} dịch vụ)</h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            {selectedBooking.services.map((service, index) => (
                              <div key={service.serviceID || index} className="col-md-6 mb-3">
                                <div className="alert alert-info mb-2">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1">
                                        <i className="fas fa-concierge-bell me-2"></i>
                                        {service.serviceInfo?.serviceName || service.serviceName || 'Dịch vụ không xác định'}
                                      </h6>
                                      {(service.serviceInfo?.serviceDescription || service.serviceDescription) && (
                                        <p className="mb-2 text-muted small">
                                          {service.serviceInfo?.serviceDescription || service.serviceDescription}
                                        </p>
                                      )}
                                      <small className="text-muted">
                                        <i className="fas fa-calendar me-1"></i>
                                        Đặt lúc: {new Date(service.createAt).toLocaleString('vi-VN')}
                                      </small>
                                    </div>
                                    <div className="text-end">
                                      <span className="badge bg-success fs-6">
                                        {(service.serviceInfo?.servicePrice || service.servicePrice || 0).toLocaleString('vi-VN')} VNĐ
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thông tin promotions */}
                {selectedBooking.promotions && selectedBooking.promotions.length > 0 && (
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="card border-danger">
                        <div className="card-header bg-danger text-white">
                          <h6 className="mb-0"><i className="fas fa-tags me-2"></i>Khuyến mãi áp dụng ({selectedBooking.promotions.length} khuyến mãi)</h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            {selectedBooking.promotions.map((promotion, index) => (
                              <div key={promotion.promotionID || index} className="col-md-6 mb-3">
                                <div className="alert alert-danger mb-2">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1">
                                        <i className="fas fa-tags me-2"></i>
                                        {promotion.promotionInfo?.promotionName || promotion.promotionName || 'Khuyến mãi không xác định'}
                                      </h6>
                                      {(promotion.promotionInfo?.promotionDescription || promotion.promotionDescription) && (
                                        <p className="mb-2 text-muted small">
                                          {promotion.promotionInfo?.promotionDescription || promotion.promotionDescription}
                                        </p>
                                      )}
                                      {promotion.promotionInfo?.startDate && promotion.promotionInfo?.endDate && (
                                        <small className="text-muted">
                                          <i className="fas fa-calendar-alt me-1"></i>
                                          {new Date(promotion.promotionInfo.startDate).toLocaleDateString('vi-VN')} - {new Date(promotion.promotionInfo.endDate).toLocaleDateString('vi-VN')}
                                        </small>
                                      )}
                                    </div>
                                    <div className="text-end">
                                      <span className="badge bg-success fs-6">
                                        {promotion.promotionInfo?.discountPercent ? 
                                          `-${promotion.promotionInfo.discountPercent}%` : 
                                          (promotion.discountType === 'percentage' ? 
                                            `-${promotion.discountValue}%` : 
                                            `-${promotion.discountValue?.toLocaleString('vi-VN')} VNĐ`
                                          )
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tóm tắt thống kê */}
                {selectedBooking.summary && (
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="card border-dark">
                        <div className="card-header bg-dark text-white">
                          <h6 className="mb-0"><i className="fas fa-chart-bar me-2"></i>Tóm tắt</h6>
                        </div>
                        <div className="card-body">
                          <div className="row text-center">
                            <div className="col-md-4">
                              <div className="alert alert-secondary">
                                <h5 className="mb-1">{selectedBooking.summary.totalRooms || 0}</h5>
                                <small>Tổng phòng được gán</small>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="alert alert-secondary">
                                <h5 className="mb-1">{selectedBooking.summary.totalServices || 0}</h5>
                                <small>Tổng dịch vụ</small>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="alert alert-secondary">
                                <h5 className="mb-1">{selectedBooking.summary.totalPromotions || 0}</h5>
                                <small>Tổng khuyến mãi</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cập nhật trạng thái */}
                <div className="row">
                  <div className="col-12">
                    <div className="card border-primary">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0"><i className="fas fa-sync me-2"></i>Cập nhật trạng thái</h6>
                      </div>
                      <div className="card-body">
                        <div className="row align-items-end">
                          <div className="col-md-8">
                            <label className={`form-label ${styles.formLabel}`}>Chọn trạng thái mới:</label>
                            <select
                              className={`form-select ${styles.formSelect}`}
                              value={selectedStatus}
                              onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                              <option value="">-- Chọn hành động --</option>
                              {possibleTransitions.map(transition => (
                                <option key={transition.value} value={transition.value}>
                                  <i className={`fas ${transition.icon}`}></i> {transition.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-4">
                            <button
                              type="button"
                              className={`btn btn-primary w-100 ${styles.button}`}
                              onClick={handleActionSubmit}
                              disabled={!selectedStatus}
                            >
                              <i className="fas fa-check me-2"></i>
                              Thực hiện
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className={`btn btn-secondary ${styles.button}`}
                  onClick={handleCloseActionModal}
                >
                  <i className="fas fa-times me-2"></i>
                  Đóng
                </button>
                {selectedBooking.bookingStatus === 'Pending' && (
                  <button
                    type="button"
                    className={`btn btn-warning ${styles.button}`}
                    onClick={handleOpenCancelModal}
                  >
                    <i className="fas fa-ban me-2"></i>
                    Hủy booking
                  </button>
                )}
                {selectedBooking.bookingStatus === 'Confirmed' && (
                  <button
                    type="button"
                    className={`btn btn-info ${styles.button}`}
                    onClick={handleOpenRoomAssignModal}
                  >
                    <i className="fas fa-bed me-2"></i>
                    Gán phòng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedBooking && (
        <CancelBookingModal
          show={showCancelModal}
          onClose={handleCloseCancelModal}
          onSubmit={handleCancelBooking}
          selectedBooking={selectedBooking}
        />
      )}

      {/* Room Assignment Modal */}
      {showRoomAssignModal && selectedBooking && (
        <RoomSelectionModalOnline
          isOpen={showRoomAssignModal}
          onClose={handleCloseRoomAssignModal}
          isCheckIn={true} // ✅ THÊM: Đánh dấu đây là check-in thực tế
          bookingData={{
            bookingID: selectedBooking.bookingID,
            numberOfGuest: selectedBooking.numberOfGuest,
            customerName: selectedBooking.customerName || selectedBooking.guestName,
            checkIn: selectedBooking.checkInDate || selectedBooking.bookingAt,
            checkOut: selectedBooking.checkOutDate,
            specialRequest: selectedBooking.specialRequest,
            bookingStatus: selectedBooking.bookingStatus,
            roomTypes: selectedBooking.roomTypes || [],
            roomTypeRequirements: selectedBooking.roomTypeRequirements || []
          }}
          availableRooms={availableRooms}
          onRoomSelectionComplete={handleRoomAssignment}
          selectedRooms={selectedRooms}
          setSelectedRooms={setSelectedRooms}
        />
      )}
    </>
  );

  // Helper function to get status badge class
  function getStatusBadgeClass(status) {
    const statusClasses = {
      'Pending': 'bg-warning text-dark',
      'Confirmed': 'bg-success',
      'CheckedIn': 'bg-primary',
      'CheckedOut': 'bg-info',
      'Cancelled': 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
  }
};

export default CheckInOutTable;