import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const BookingManager = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // ✅ SỬA: Tách biệt hoàn toàn các state
    const [formData, setFormData] = useState({
        guestID: '',
        walkInGuestPhoneNumber: '',
        numberOfGuest: 1,
        specialRequest: '',
        selectedRoomTypes: [], // ✅ Chỉ dùng cho room types selection
        selectedServices: [],
        selectedPromotions: []
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // ✅ Room assignment flow state - TÁCH BIỆT HOÀN TOÀN
    const [roomAssignmentState, setRoomAssignmentState] = useState({
        showRoomAssignmentStep: false,
        createdBookingData: null,
        availableRooms: [],
        selectedRoomsForAssignment: [], // ✅ Chỉ dùng cho room assignment
        isAssigningRooms: false,
        roomAssignmentCompleted: false
    });

    // ✅ SỬA: Handle room assignment với proper error handling
    const handleRoomAssignment = async () => {
        // ✅ Prevent double execution
        if (roomAssignmentState.isAssigningRooms || roomAssignmentState.roomAssignmentCompleted) {
            console.log('⚠️ Room assignment already in progress or completed');
            return;
        }

        try {
            setRoomAssignmentState(prev => ({
                ...prev,
                isAssigningRooms: true
            }));
            
            // ✅ Validation với proper state
            if (!roomAssignmentState.selectedRoomsForAssignment || 
                !Array.isArray(roomAssignmentState.selectedRoomsForAssignment) ||
                roomAssignmentState.selectedRoomsForAssignment.length === 0) {
                alert('Vui lòng chọn ít nhất một phòng để gán');
                return;
            }

            console.log('🏨 Assigning rooms to booking:', {
                bookingID: roomAssignmentState.createdBookingData?.bookingID,
                selectedRooms: roomAssignmentState.selectedRoomsForAssignment
            });

            const response = await axios.post(
                `/api/bookings/${roomAssignmentState.createdBookingData.bookingID}/assign-rooms`, 
                {
                    selectedRooms: roomAssignmentState.selectedRoomsForAssignment.map(room => ({
                        roomID: room.RoomID,
                        roomNumber: room.RoomNumber,
                        checkInAt: new Date().toISOString(),
                        checkOutAt: new Date(Date.now() + 24*60*60*1000).toISOString()
                    }))
                }
            );

            if (response.data.success) {
                console.log('✅ Rooms assigned successfully');
                
                // ✅ Update state properly
                setRoomAssignmentState(prev => ({
                    ...prev,
                    roomAssignmentCompleted: true
                }));
                
                alert(`Gán phòng thành công!\nĐã gán ${roomAssignmentState.selectedRoomsForAssignment.length} phòng cho booking ${roomAssignmentState.createdBookingData.bookingID}`);

                // ✅ Auto redirect after delay
                setTimeout(() => {
                    redirectToPayment();
                }, 1500);

            } else {
                throw new Error(response.data.message || 'Lỗi khi gán phòng');
            }

        } catch (error) {
            console.error('❌ Error assigning rooms:', error);
            alert('Lỗi khi gán phòng: ' + (error.response?.data?.message || error.message));
        } finally {
            setRoomAssignmentState(prev => ({
                ...prev,
                isAssigningRooms: false
            }));
        }
    };

    // ✅ SỬA: Handle room selection với proper state management
    const handleRoomSelection = (room) => {
        if (!room || !room.RoomID) {
            console.warn('Invalid room data:', room);
            return;
        }

        // ✅ Prevent selection if assignment completed
        if (roomAssignmentState.roomAssignmentCompleted) {
            console.log('⚠️ Room assignment already completed');
            return;
        }

        setRoomAssignmentState(prev => {
            const currentSelected = prev.selectedRoomsForAssignment || [];
            const isSelected = currentSelected.some(r => r.RoomID === room.RoomID);
            
            let newSelected;
            if (isSelected) {
                newSelected = currentSelected.filter(r => r.RoomID !== room.RoomID);
            } else {
                newSelected = [...currentSelected, room];
            }
            
            return {
                ...prev,
                selectedRoomsForAssignment: newSelected
            };
        });
    };

    // ✅ SỹA: Fetch available rooms cho assignment
    const fetchAvailableRoomsForAssignment = async (bookingData) => {
        try {
            console.log('🔍 Fetching available rooms for assignment...');
            
            const checkIn = new Date();
            checkIn.setHours(17, 0, 0, 0); // 5 PM today
            
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + 1);
            checkOut.setHours(16, 0, 0, 0); // 4 PM tomorrow
            
            const requestedRoomTypes = formData.selectedRoomTypes.map(room => ({
                roomTypeId: room.TypeID || room.id,
                quantity: room.quantity || 1,
                roomTypeName: room.TypeName || room.name,
                pricePerNight: room.CurrentPrice || room.price || 0
            }));

            const queryParams = new URLSearchParams({
                checkIn: checkIn.toISOString().slice(0, 16),
                checkOut: checkOut.toISOString().slice(0, 16),
                requestedRoomTypes: JSON.stringify(requestedRoomTypes)
            });

            const response = await axios.get(`/api/rooms/available-for-booking?${queryParams}`);

            if (response.data.success && response.data.data) {
                setRoomAssignmentState(prev => ({
                    ...prev,
                    availableRooms: response.data.data
                }));
                
                console.log(`✅ Found ${response.data.data.length} available rooms for assignment`);
            } else {
                throw new Error('Không có phòng trống phù hợp');
            }

        } catch (error) {
            console.error('❌ Error fetching available rooms:', error);
            alert('Lỗi khi lấy danh sách phòng: ' + (error.response?.data?.message || error.message));
            
            setRoomAssignmentState(prev => ({
                ...prev,
                availableRooms: []
            }));
        }
    };

    // ✅ SỬA: Redirect to payment với proper error handling
    const redirectToPayment = async () => {
        try {
            console.log('💳 Preparing invoice review data...');
            
            if (!roomAssignmentState.createdBookingData?.bookingID) {
                throw new Error('Không có thông tin booking để chuyển đến thanh toán');
            }

            if (!roomAssignmentState.selectedRoomsForAssignment || 
                roomAssignmentState.selectedRoomsForAssignment.length === 0) {
                throw new Error('Không có phòng nào được gán để thanh toán');
            }
            
            const invoiceReviewData = {
                bookingID: roomAssignmentState.createdBookingData.bookingID,
                numberOfGuest: formData.numberOfGuest,
                specialRequest: formData.specialRequest,
                bookingAt: new Date(),
                selectedRooms: roomAssignmentState.selectedRoomsForAssignment.map(room => ({
                    RoomID: room.RoomID,
                    RoomNumber: room.RoomNumber,
                    TypeName: room.TypeName || 'Standard',
                    CurrentPrice: room.CurrentPrice || 0
                })),
                selectedServices: formData.selectedServices,
                selectedPromotions: formData.selectedPromotions,
                guestName: 'Walk-in Guest',
                receptionistID: user?.UserID || 1
            };

            console.log('📋 Invoice review data prepared:', invoiceReviewData);

            // ✅ SỬA: Navigate to Invoice Review thay vì Payment
            navigate('/invoice-review', {
                state: {
                    bookingData: invoiceReviewData,
                    fromBooking: true
                }
            });
            
        } catch (error) {
            console.error('❌ Error preparing invoice review data:', error);
            alert('Lỗi khi chuẩn bị dữ liệu hóa đơn: ' + error.message);
        }
    };

    // ✅ SỬA: Handle booking submission - ĐẢM BẢO gửi đúng format
    const handleSubmitBooking = async () => {
        if (isSubmitting || invoiceCreating || invoiceCreatedRef.current) {
            console.log('⚠️ Submission already in progress, skipping...');
            return;
        }

        try {
            setIsSubmitting(true);
            console.log('📝 Starting booking submission process...');

            // ✅ Validate form trước
            if (!validateForm()) {
                toast.error('Vui lòng kiểm tra lại thông tin');
                return;
            }

            // ✅ Tạo hoặc update guest trước
            const guestData = await createOrUpdateGuest({
                phoneNumber: formData.walkInGuestPhoneNumber,
                customerName: formData.customerName,
                email: formData.email
            });

            if (!guestData) {
                throw new Error('Không thể tạo thông tin khách hàng');
            }

            // ✅ SỬA: Chuẩn bị data với requestedRoomTypes đúng format
            const bookingPayload = {
                receptionistID: user?.UserID,
                numberOfGuest: formData.numberOfGuest,
                specialRequest: formData.specialRequest || '',
                bookingType: 0, // Walk-in
                guestID: guestData.guestPhoneNumber,
                walkInGuestPhoneNumber: guestData.guestPhoneNumber,
                
                // ✅ QUAN TRỌNG: Thêm requestedRoomTypes với format đúng
                requestedRoomTypes: formData.selectedRoomTypes.map(roomType => ({
                    roomTypeId: parseInt(roomType.roomTypeId),
                    quantity: parseInt(roomType.quantity),
                    checkInDate: formData.checkIn,
                    checkOutDate: formData.checkOut
                })),
                
                // ✅ Services và promotions
                selectedServices: formData.selectedServices || [],
                selectedPromotions: formData.selectedPromotions || []
            };

            console.log('📤 Sending booking payload:', {
              ...bookingPayload,
              requestedRoomTypesCount: bookingPayload.requestedRoomTypes.length,
              selectedServicesCount: bookingPayload.selectedServices.length,
              selectedPromotionsCount: bookingPayload.selectedPromotions.length
            });

            // ✅ Gửi API request
            const response = await fetch('http://localhost:3000/api/bookings/walk-in', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(bookingPayload)
            });

            const result = await response.json();

            if (!response.ok) {
              console.error('❌ API Error:', result);
              throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (!result.success) {
              console.error('❌ Business logic error:', result);
              throw new Error(result.message || 'Booking creation failed');
            }

            console.log('✅ Booking created successfully:', result.data);
            
            // ✅ Lưu booking data và chuyển sang room assignment
            setCreatedBookingData(result.data);
            
            // ✅ Fetch available rooms cho assignment
            await fetchAvailableRoomsForAssignment(result.data);
            
            // ✅ Hiển thị room assignment step
            setRoomAssignmentState(prev => ({
              ...prev,
              showRoomAssignmentStep: true,
              createdBookingData: result.data
            }));

            toast.success('Tạo booking thành công! Hãy chọn phòng cụ thể.');

        } catch (error) {
            console.error('❌ Error in booking submission:', error);
            toast.error(`Lỗi tạo booking: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ✅ SỬA: Calculate functions với proper null checks
    const calculateSubtotal = () => {
        let total = 0;
        
        // Use assigned rooms if available
        if (roomAssignmentState.selectedRoomsForAssignment && 
            Array.isArray(roomAssignmentState.selectedRoomsForAssignment)) {
            roomAssignmentState.selectedRoomsForAssignment.forEach(room => {
                total += room.CurrentPrice || 0;
            });
        } else if (formData.selectedRoomTypes && Array.isArray(formData.selectedRoomTypes)) {
            formData.selectedRoomTypes.forEach(room => {
                const price = room.CurrentPrice || room.price || 0;
                const quantity = room.quantity || 1;
                total += price * quantity;
            });
        }
        
        // Add service prices
        if (formData.selectedServices && Array.isArray(formData.selectedServices)) {
            formData.selectedServices.forEach(service => {
                total += service.Price || service.price || 0;
            });
        }
        
        return total;
    };

    const calculateFinalTotal = () => {
        let subtotal = calculateSubtotal();
        
        // Apply promotions
        if (formData.selectedPromotions && Array.isArray(formData.selectedPromotions)) {
            formData.selectedPromotions.forEach(promotion => {
                const discountPercent = promotion.DiscountPercent || promotion.discountPercent || 0;
                const discount = subtotal * (discountPercent / 100);
                subtotal -= discount;
            });
        }
        
        return Math.max(0, subtotal);
    };

    // ✅ SỬA: Reset form
    const resetForm = () => {
        setFormData({
            guestID: '',
            walkInGuestPhoneNumber: '',
            numberOfGuest: 1,
            specialRequest: '',
            selectedRoomTypes: [],
            selectedServices: [],
            selectedPromotions: []
        });
        
        setRoomAssignmentState({
            showRoomAssignmentStep: false,
            createdBookingData: null,
            availableRooms: [],
            selectedRoomsForAssignment: [],
            isAssigningRooms: false,
            roomAssignmentCompleted: false
        });
    };

    // ✅ Cancel room assignment
    const cancelRoomAssignment = () => {
        setRoomAssignmentState({
            showRoomAssignmentStep: false,
            createdBookingData: null,
            availableRooms: [],
            selectedRoomsForAssignment: [],
            isAssigningRooms: false,
            roomAssignmentCompleted: false
        });
    };

    return (
        <div className="booking-manager">
            {/* Room Assignment Step */}
            {roomAssignmentState.showRoomAssignmentStep ? (
                <div className="room-assignment-step">
                    <div className="step-header">
                        <h2>🏨 Gán Phòng Cụ Thể</h2>
                        <p>Booking đã được tạo thành công. Hãy chọn phòng cụ thể để gán cho booking.</p>
                        
                        <div className="booking-info">
                            <div className="info-item">
                                <span>Booking ID:</span>
                                <strong>{roomAssignmentState.createdBookingData?.bookingID}</strong>
                            </div>
                            <div className="info-item">
                                <span>Số khách:</span>
                                <strong>{formData.numberOfGuest} người</strong>
                            </div>
                            <div className="info-item">
                                <span>Phòng cần gán:</span>
                                <strong>{formData.selectedRoomTypes?.length || 0} phòng</strong>
                            </div>
                            <div className="info-item">
                                <span>Trạng thái:</span>
                                <strong style={{ 
                                    color: roomAssignmentState.roomAssignmentCompleted ? '#28a745' : '#ffc107' 
                                }}>
                                    {roomAssignmentState.roomAssignmentCompleted ? '✅ Đã hoàn thành' : '⏳ Đang chờ gán phòng'}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="available-rooms">
                        <h3>Phòng có sẵn ({roomAssignmentState.availableRooms.length})</h3>
                        
                        {roomAssignmentState.availableRooms.length === 0 ? (
                            <div className="no-rooms">
                                <p>Không có phòng trống phù hợp</p>
                            </div>
                        ) : (
                            <div className="rooms-grid">
                                {roomAssignmentState.availableRooms.map((room, index) => (
                                    <div 
                                        key={room.RoomID || index}
                                        className={`room-card ${
                                            roomAssignmentState.selectedRoomsForAssignment?.some(r => r.RoomID === room.RoomID) ? 'selected' : ''
                                        } ${roomAssignmentState.roomAssignmentCompleted ? 'disabled' : ''}`}
                                        onClick={() => handleRoomSelection(room)}
                                    >
                                        <div className="room-header">
                                            <h4>Phòng {room.RoomNumber}</h4>
                                            <span className="room-type">{room.TypeName}</span>
                                        </div>
                                        <div className="room-details">
                                            <div className="room-price">
                                                {(room.CurrentPrice || 0).toLocaleString('vi-VN')}đ/đêm
                                            </div>
                                            <div className="room-capacity">
                                                Sức chứa: {room.Capacity || 2} người
                                            </div>
                                            <div className={`room-status ${room.Status?.toLowerCase()}`}>
                                                {room.Status || 'Available'}
                                            </div>
                                        </div>
                                        <div className="room-actions">
                                            <button 
                                                className={`btn ${
                                                    roomAssignmentState.selectedRoomsForAssignment?.some(r => r.RoomID === room.RoomID) 
                                                        ? 'btn-success' : 'btn-outline'
                                                }`}
                                                disabled={roomAssignmentState.roomAssignmentCompleted}
                                            >
                                                {roomAssignmentState.selectedRoomsForAssignment?.some(r => r.RoomID === room.RoomID) 
                                                    ? '✓ Đã chọn' : 'Chọn phòng'
                                                }
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="assignment-actions">
                        <div className="selected-summary">
                            <span>Đã chọn: {roomAssignmentState.selectedRoomsForAssignment?.length || 0} phòng</span>
                            {roomAssignmentState.selectedRoomsForAssignment?.length > 0 && (
                                <div className="selected-rooms-list">
                                    {roomAssignmentState.selectedRoomsForAssignment.map(room => (
                                        <span key={room.RoomID} className="selected-room-tag">
                                            Phòng {room.RoomNumber}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="action-buttons">
                            <button 
                                onClick={cancelRoomAssignment}
                                className="btn btn-secondary"
                                disabled={roomAssignmentState.isAssigningRooms}
                            >
                                ❌ Hủy
                            </button>
                            
                            {roomAssignmentState.roomAssignmentCompleted ? (
                                <button 
                                    onClick={redirectToPayment}
                                    className="btn btn-success"
                                >
                                    💳 Chuyển đến Thanh toán
                                </button>
                            ) : (
                                <button 
                                    onClick={handleRoomAssignment}
                                    className={`btn btn-primary ${roomAssignmentState.isAssigningRooms ? 'loading' : ''}`}
                                    disabled={
                                        !roomAssignmentState.selectedRoomsForAssignment?.length || 
                                        roomAssignmentState.isAssigningRooms
                                    }
                                >
                                    {roomAssignmentState.isAssigningRooms ? (
                                        <>
                                            <span className="spinner"></span>
                                            Đang gán phòng...
                                        </>
                                    ) : (
                                        `🏨 Gán ${roomAssignmentState.selectedRoomsForAssignment?.length || 0} phòng`
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // Original booking form (unchanged)
                <div className="booking-form">
                    {/* Your existing booking form JSX */}
                </div>
            )}

            {/* Loading overlay */}
            {roomAssignmentState.isAssigningRooms && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="spinner-large"></div>
                        <h3>Đang gán phòng...</h3>
                        <p>Vui lòng đợi trong giây lát</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingManager;