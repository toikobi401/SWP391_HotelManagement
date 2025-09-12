import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import RoomSelectionModalOnline from '../../onlinebooking/component/RoomSelectionModalOnline';
import { useAuth } from '../../../contexts/AuthContext';
import './AssignRoomPage.css';

const AssignRoomPage = () => {
  const { user } = useAuth();
  const [onlineBookings, setOnlineBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // ✅ Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 5;
  
  // ✅ Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  
  // ✅ Room selection modal states
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [roomAssignmentLoading, setRoomAssignmentLoading] = useState(false);

  // ✅ Load online bookings từ database
  useEffect(() => {
    fetchOnlineBookings();
  }, [currentPage, statusFilter, customerNameFilter, roomTypeFilter]);

  const fetchOnlineBookings = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Fetching online bookings...');
      
      // ✅ Build query parameters
      const queryParams = new URLSearchParams({
        page: currentPage,
        pageSize: itemsPerPage,
        bookingType: 1, // Online bookings only
        ...(statusFilter && { status: statusFilter }),
        ...(customerNameFilter && { customerName: customerNameFilter }),
        ...(roomTypeFilter && { roomType: roomTypeFilter })
      });
      
      // ✅ SỬA: Đảm bảo endpoint đúng
      const response = await fetch(`http://localhost:3000/api/bookings/online?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Online bookings loaded:', data);
        
        if (data.success) {
          // ✅ SỬA: Đảm bảo lấy data đúng từ response structure
          setOnlineBookings(data.data.bookings || []);
          setTotalPages(data.data.pagination?.totalPages || 1);
        } else {
          throw new Error(data.message || 'Failed to load bookings');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch bookings`);
      }
    } catch (error) {
      console.error('❌ Error fetching online bookings:', error);
      setError(error.message);
      // ✅ Set fallback data cho demo
      setFallbackData();
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fallback data cho demo
  const setFallbackData = () => {
    const fallbackBookings = [...Array(12)].map((_, index) => ({
      bookingID: 1000 + index,
      customerName: `Khách hàng ${index + 1}`,
      customerEmail: `customer${index + 1}@example.com`,
      customerPhone: `090123456${index.toString().padStart(2, '0')}`,
      checkIn: '2025-07-23T12:00',
      checkOut: '2025-07-27T11:30',
      numberOfGuest: Math.floor(Math.random() * 4) + 1,
      bookingStatus: ['Pending', 'Paid', 'Confirmed'][index % 3],
      paymentStatus: ['Pending', 'Paid', 'Partial'][index % 3],
      totalAmount: 500000 + (index * 100000),
      specialRequest: index % 3 === 0 ? 'Phòng tầng cao, view đẹp' : null,
      createAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)),
      roomRequirements: [
        { roomTypeID: 1, roomTypeName: 'Phòng đơn', quantity: 1, price: 300000 },
        { roomTypeID: 2, roomTypeName: 'Phòng đôi', quantity: index % 2, price: 500000 }
      ].filter(r => r.quantity > 0),
      isRoomAssigned: index % 4 === 0, // 25% đã được gán phòng
      assignedRooms: index % 4 === 0 ? [
        { roomID: 101 + index, roomNumber: `${101 + index}`, roomTypeName: 'Phòng đơn' }
      ] : []
    }));
    
    setOnlineBookings(fallbackBookings);
    setTotalPages(Math.ceil(fallbackBookings.length / itemsPerPage));
    console.log('✅ Set fallback online bookings data');
  };

  // ✅ Load room requirements cho specific booking
  const fetchBookingRoomRequirements = async (bookingID) => {
    try {
      console.log(`🔍 Fetching room requirements for booking ${bookingID}...`);
      
      const response = await fetch(`http://localhost:3000/api/bookings/online/${bookingID}/room-types`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Room requirements loaded:', data);
        
        if (data.success) {
          return data.data.roomTypeRequirements || [];
        } else {
          throw new Error(data.message || 'Failed to load room requirements');
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch room requirements`);
      }
    } catch (error) {
      console.error('❌ Error fetching room requirements:', error);
      toast.warning('Không thể tải yêu cầu phòng từ database, sử dụng dữ liệu fallback');
      
      // ✅ Return fallback room requirements
      return [
        { roomTypeID: 1, roomTypeName: 'Phòng đơn', quantity: 1, roomTypePrice: 300000 },
        { roomTypeID: 2, roomTypeName: 'Phòng đôi', quantity: 1, roomTypePrice: 500000 }
      ];
    }
  };

  // ✅ Fetch available rooms cho booking using the correct API endpoint
  const fetchAvailableRooms = async (booking) => {
    try {
      console.log(`🏨 Fetching available rooms for booking ${booking.bookingID}...`);
      
      // ✅ Use the correct available-for-booking endpoint with URL parameters
      const params = new URLSearchParams({
        checkIn: booking.checkIn,
        checkOut: booking.checkOut
      });
      
      // ✅ First get room requirements for this booking
      try {
        const roomTypesResponse = await fetch(`http://localhost:3000/api/bookings/online/${booking.bookingID}/room-types`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (roomTypesResponse.ok) {
          const roomTypesData = await roomTypesResponse.json();
          if (roomTypesData.success && roomTypesData.data && roomTypesData.data.roomTypeRequirements) {
            const requestedRoomTypes = roomTypesData.data.roomTypeRequirements.map(rt => ({
              roomTypeId: rt.roomTypeID,
              quantity: rt.quantity,
              roomTypeName: rt.roomTypeName
            }));
            
            if (requestedRoomTypes.length > 0) {
              params.append('requestedRoomTypes', JSON.stringify(requestedRoomTypes));
            }
          }
        }
      } catch (roomTypesError) {
        console.warn('⚠️ Could not fetch room type requirements:', roomTypesError);
      }
      
      // ✅ Call the correct available rooms API endpoint
      const response = await fetch(`http://localhost:3000/api/rooms/available-for-booking?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Available rooms loaded from available-for-booking API:', data);
        
        if (data.success) {
          return data.data || [];
        } else {
          throw new Error(data.message || 'Failed to load available rooms');
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch available rooms`);
      }
    } catch (error) {
      console.error('❌ Error fetching available rooms:', error);
      toast.warning('Không thể tải phòng trống từ database, sử dụng dữ liệu fallback');
      
      // ✅ Return fallback available rooms
      return [
        { RoomID: 101, RoomNumber: '101', TypeID: 1, TypeName: 'Phòng đơn', Status: 'available', CurrentPrice: 300000, Floor: 1, Capacity: 1 },
        { RoomID: 102, RoomNumber: '102', TypeID: 1, TypeName: 'Phòng đơn', Status: 'available', CurrentPrice: 300000, Floor: 1, Capacity: 1 },
        { RoomID: 201, RoomNumber: '201', TypeID: 2, TypeName: 'Phòng đôi', Status: 'available', CurrentPrice: 500000, Floor: 2, Capacity: 2 },
        { RoomID: 202, RoomNumber: '202', TypeID: 2, TypeName: 'Phòng đôi', Status: 'available', CurrentPrice: 500000, Floor: 2, Capacity: 2 },
        { RoomID: 301, RoomNumber: '301', TypeID: 3, TypeName: 'Phòng gia đình', Status: 'available', CurrentPrice: 800000, Floor: 3, Capacity: 4 }
      ];
    }
  };

  // ✅ Handle assign rooms button click
  const handleAssignRooms = async (booking) => {
    try {
      console.log('🎯 Starting room assignment for booking:', booking.bookingID);
      
      // ✅ QUAN TRỌNG: Kiểm tra booking đã được gán phòng chưa (business rule)
      if (booking.isRoomAssigned || booking.assignedRoomsCount > 0) {
        toast.error('Booking này đã được gán phòng rồi. Mỗi booking chỉ có thể gán phòng 1 lần!');
        return;
      }
      
      // ✅ Check if booking is eligible for room assignment
      if (booking.paymentStatus !== 'Paid' && booking.bookingStatus !== 'Paid') {
        toast.error('Chỉ có thể gán phòng cho booking đã thanh toán');
        return;
      }
      
      setSelectedBooking(booking);
      setSelectedRooms([]);
      setRoomAssignmentLoading(true);
      
      // ✅ Load room requirements và available rooms parallel
      const [roomRequirements, availableRoomsData] = await Promise.all([
        fetchBookingRoomRequirements(booking.bookingID),
        fetchAvailableRooms(booking)
      ]);
      
      // ✅ Enhance booking data with room requirements
      const enhancedBooking = {
        ...booking,
        roomRequirements: roomRequirements,
        requestedRoomTypes: roomRequirements // Alias for compatibility
      };
      
      setSelectedBooking(enhancedBooking);
      setAvailableRooms(availableRoomsData);
      setShowRoomModal(true);
      
      console.log('✅ Room assignment modal opened with data:', {
        booking: enhancedBooking,
        availableRooms: availableRoomsData.length,
        roomRequirements: roomRequirements.length
      });
      
    } catch (error) {
      console.error('❌ Error preparing room assignment:', error);
      toast.error(`Không thể chuẩn bị gán phòng: ${error.message}`);
    } finally {
      setRoomAssignmentLoading(false);
    }
  };

  // ✅ Handle room selection completion
  const handleRoomSelectionComplete = async (completionData) => {
    try {
      console.log('🎉 Room selection completed:', completionData);
      setRoomAssignmentLoading(true);
      
      const { booking, selectedRooms } = completionData;
      
      // ✅ Call API để assign rooms - using correct online booking endpoint
      const response = await fetch(`http://localhost:3000/api/bookings/online/${booking.bookingID}/assign-rooms`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedRooms: selectedRooms.map(room => ({
            roomID: room.roomID || room.RoomID,
            roomNumber: room.roomNumber || room.RoomNumber,
            roomTypeID: room.typeID || room.TypeID
          })),
          receptionistID: user?.UserID,
          assignedBy: user?.Fullname || user?.Username
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Room assignment successful:', result);
        
        if (result.success) {
          toast.success(`Gán phòng thành công cho booking #${booking.bookingID}!`);
          
          // ✅ Update booking status in local state với room assignment info
          setOnlineBookings(prev => prev.map(b => 
            b.bookingID === booking.bookingID 
              ? { 
                  ...b, 
                  isRoomAssigned: true, // ✅ QUAN TRỌNG: Set để ẩn nút gán phòng
                  assignedRoomsCount: result.data.assignedRooms?.length || selectedRooms.length,
                  assignedRooms: result.data.assignedRooms || selectedRooms,
                  bookingStatus: 'Confirmed',
                  canAssignRooms: false // ✅ Không thể gán lại
                }
              : b
          ));
          
          // ✅ Close modal
          setShowRoomModal(false);
          setSelectedBooking(null);
          setSelectedRooms([]);
          
        } else {
          throw new Error(result.message || 'Room assignment failed');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign rooms');
      }
      
    } catch (error) {
      console.error('❌ Error completing room assignment:', error);
      toast.error(`Lỗi gán phòng: ${error.message}`);
    } finally {
      setRoomAssignmentLoading(false);
    }
  };

  // ✅ Handle modal close
  const handleCloseModal = () => {
    setShowRoomModal(false);
    setSelectedBooking(null);
    setSelectedRooms([]);
    setAvailableRooms([]);
  };

  // ✅ Filter bookings based on current filters
  const filteredBookings = onlineBookings.filter(booking => {
    const matchStatus = !statusFilter || booking.bookingStatus === statusFilter;
    const matchCustomer = !customerNameFilter || 
      booking.customerName.toLowerCase().includes(customerNameFilter.toLowerCase());
    const matchRoomType = !roomTypeFilter || 
      booking.roomRequirements?.some(req => req.roomTypeName.includes(roomTypeFilter));
    
    return matchStatus && matchCustomer && matchRoomType;
  });

  // ✅ Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // ✅ Get status badge class
  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'Pending': 'badge-warning',
      'Paid': 'badge-success',
      'Confirmed': 'badge-primary',
      'Completed': 'badge-info',
      'Cancelled': 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
  };

  // ✅ Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="assign-room-page container">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-3">Đang tải danh sách booking online...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assign-room-page">
      <div className="page-header mb-4">
        <h2 className="page-title">
          <i className="fas fa-bed me-2"></i>
          Gán phòng cho đơn booking online
        </h2>
        <p className="page-subtitle">
          Quản lý và gán phòng cụ thể cho các booking online đã thanh toán
        </p>
      </div>

      {/* ✅ Filters Section */}
      <div className="filters-section card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Trạng thái booking:</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="Paid">Đã thanh toán</option>
                <option value="Confirmed">Đã xác nhận</option>
                <option value="Completed">Hoàn thành</option>
              </select>
            </div>
            
            <div className="col-md-3">
              <label className="form-label">Tên khách hàng:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập tên khách hàng..."
                value={customerNameFilter}
                onChange={(e) => {
                  setCustomerNameFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="col-md-3">
              <label className="form-label">Loại phòng:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập loại phòng..."
                value={roomTypeFilter}
                onChange={(e) => {
                  setRoomTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setStatusFilter('');
                  setCustomerNameFilter('');
                  setRoomTypeFilter('');
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-times me-1"></i>
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Error State */}
      {error && (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* ✅ Bookings List */}
      <div className="bookings-list">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
            <h5>Không có booking online nào</h5>
            <p className="text-muted">Thử thay đổi bộ lọc hoặc kiểm tra lại sau.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.bookingID} className="booking-card card mb-3 shadow-sm">
              <div className="card-body">
                <div className="row">
                  {/* ✅ Booking Info */}
                  <div className="col-md-8">
                    <div className="booking-header mb-3">
                      <h5 className="booking-title mb-1">
                        <i className="fas fa-user me-2"></i>
                        {booking.customerName}
                        <span className={`badge ms-2 ${getStatusBadgeClass(booking.bookingStatus)}`}>
                          {booking.bookingStatus}
                        </span>
                        {booking.isRoomAssigned && (
                          <span className="badge bg-success ms-1">
                            <i className="fas fa-check me-1"></i>
                            Đã gán phòng
                          </span>
                        )}
                      </h5>
                      <p className="booking-id text-muted mb-0">
                        Booking #<strong>{booking.bookingID}</strong>
                      </p>
                    </div>
                    
                    <div className="booking-details row g-2">
                      <div className="col-sm-6">
                        <small className="text-muted">Nhận phòng:</small>
                        <div><strong>{formatDate(booking.checkIn)}</strong></div>
                      </div>
                      <div className="col-sm-6">
                        <small className="text-muted">Trả phòng:</small>
                        <div><strong>{formatDate(booking.checkOut)}</strong></div>
                      </div>
                      <div className="col-sm-6">
                        <small className="text-muted">Số khách:</small>
                        <div><strong>{booking.numberOfGuest} người</strong></div>
                      </div>
                      <div className="col-sm-6">
                        <small className="text-muted">Tổng tiền:</small>
                        <div><strong>{formatCurrency(booking.totalAmount)}</strong></div>
                      </div>
                    </div>
                    
                    {/* ✅ Room Requirements */}
                    <div className="room-requirements mt-3">
                      <small className="text-muted">Yêu cầu phòng:</small>
                      <div className="requirements-list mt-1">
                        {booking.roomRequirements?.map((req, index) => (
                          <span key={index} className="badge bg-light text-dark me-2">
                            {req.quantity}x {req.roomTypeName}
                          </span>
                        )) || (
                          <span className="text-muted">Chưa có thông tin</span>
                        )}
                      </div>
                    </div>
                    
                    {/* ✅ Assigned Rooms */}
                    {booking.isRoomAssigned && booking.assignedRooms?.length > 0 && (
                      <div className="assigned-rooms mt-3">
                        <small className="text-muted">Phòng đã gán:</small>
                        <div className="assigned-list mt-1">
                          {booking.assignedRooms.map((room, index) => (
                            <span key={index} className="badge bg-success me-2">
                              Phòng {room.roomNumber} ({room.roomTypeName})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* ✅ Special Request */}
                    {booking.specialRequest && (
                      <div className="special-request mt-3">
                        <small className="text-muted">Yêu cầu đặc biệt:</small>
                        <div className="mt-1">
                          <em>"{booking.specialRequest}"</em>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* ✅ Action Buttons */}
                  <div className="col-md-4 d-flex flex-column justify-content-center">
                    <div className="action-buttons text-end">
                      {/* ✅ QUAN TRỌNG: Kiểm tra isRoomAssigned từ backend để ẩn nút gán phòng */}
                      {booking.isRoomAssigned || booking.assignedRoomsCount > 0 ? (
                        <div className="text-center">
                          <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                          <div className="text-success fw-bold">Đã gán phòng</div>
                          <small className="text-muted">
                            {booking.assignedRoomsCount || booking.assignedRooms?.length || 0} phòng đã được gán
                          </small>
                          <div className="mt-2">
                            <span className="badge bg-success">
                              <i className="fas fa-lock me-1"></i>
                              Không thể gán lại
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* ✅ Chỉ hiển thị nút gán phòng khi chưa được gán và đủ điều kiện */}
                          {booking.paymentStatus === 'Paid' || booking.bookingStatus === 'Paid' ? (
                            <button
                              className="btn btn-primary btn-lg"
                              onClick={() => handleAssignRooms(booking)}
                              disabled={roomAssignmentLoading}
                              title="Gán phòng cho booking này"
                            >
                              {roomAssignmentLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Đang tải...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-bed me-2"></i>
                                  Gán phòng
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="text-center">
                              <i className="fas fa-credit-card fa-2x text-warning mb-2"></i>
                              <div className="text-warning fw-bold">
                                {booking.paymentStatus !== 'Paid' && booking.bookingStatus !== 'Paid' 
                                  ? 'Chưa thanh toán' 
                                  : 'Chưa xác nhận'}
                              </div>
                              <small className="text-muted">
                                {booking.paymentStatus !== 'Paid' && booking.bookingStatus !== 'Paid'
                                  ? 'Cần thanh toán trước khi gán phòng'
                                  : 'Cần xác nhận booking trước khi gán phòng'}
                              </small>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ✅ Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Booking pagination">
          <ul className="pagination justify-content-center mt-4">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-left"></i>
                Trước
              </button>
            </li>
            
            {[...Array(totalPages).keys()].map(page => (
              <li key={page + 1} className={`page-item ${currentPage === page + 1 ? 'active' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(page + 1)}
                >
                  {page + 1}
                </button>
              </li>
            ))}
            
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Sau
                <i className="fas fa-chevron-right ms-1"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* ✅ Room Selection Modal */}
      {showRoomModal && selectedBooking && (
        <RoomSelectionModalOnline
          isOpen={showRoomModal}
          onClose={handleCloseModal}
          bookingData={{
            bookingID: selectedBooking.bookingID,
            numberOfGuest: selectedBooking.numberOfGuest,
            customerName: selectedBooking.customerName,
            customerEmail: selectedBooking.customerEmail,
            customerPhone: selectedBooking.customerPhone,
            checkIn: selectedBooking.checkIn || selectedBooking.checkInDate,
            checkOut: selectedBooking.checkOut || selectedBooking.checkOutDate,
            specialRequest: selectedBooking.specialRequest,
            bookingStatus: selectedBooking.bookingStatus,
            roomTypeRequirements: selectedBooking.roomTypeRequirements || [],
            requestedRoomTypes: selectedBooking.requestedRoomTypes || [],
            guestName: selectedBooking.customerName,
            guest: {
              guestName: selectedBooking.customerName,
              guestEmail: selectedBooking.customerEmail,
              guestPhoneNumber: selectedBooking.customerPhone
            }
          }}
          availableRooms={availableRooms}
          onRoomSelectionComplete={handleRoomSelectionComplete}
          selectedRooms={selectedRooms}
          setSelectedRooms={setSelectedRooms}
        />
      )}
    </div>
  );
};

export default AssignRoomPage;
