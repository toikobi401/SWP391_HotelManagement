import { useState, useCallback } from 'react';
import api from '../../config/axios';

export const useBookingManagement = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20
    });

    // Fetch bookings with filters and pagination
    const fetchBookings = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('🔄 Fetching bookings with filters:', filters);
            
            const params = {
                page: filters.page || 1,
                pageSize: filters.pageSize || 20,
                ...(filters.searchTerm && { searchTerm: filters.searchTerm }),
                ...(filters.status && { status: filters.status }),
                ...(filters.statusFilter && { status: filters.statusFilter }),
                ...(filters.phoneFilter && { phoneFilter: filters.phoneFilter }),
                ...(filters.nameFilter && { nameFilter: filters.nameFilter }),
                ...(filters.checkInDate && { checkInDate: filters.checkInDate }),
                ...(filters.checkOutDate && { checkOutDate: filters.checkOutDate })
            };
            
            const response = await api.get('/api/bookings', { params });
            
            if (response.data.success) {
                const { bookings: bookingData, pagination: paginationData } = response.data.data;
                
                const formattedBookings = bookingData.map(booking => ({
                    ...booking,
                    customerName: booking.displayCustomerName || booking.customerName || booking.guestName || 'N/A',
                    customerPhone: booking.displayCustomerPhone || booking.customerPhone.trim() || booking.guestPhoneNumber || booking.walkInGuestPhoneNumber || 'N/A',
                    roomTypesDisplay: booking.roomTypesDisplay || 'Chưa có thông tin phòng',
                    displayStatus: getDisplayStatus(booking.bookingStatus)
                }));
                
                setBookings(formattedBookings);
                setPagination(paginationData);
                
            } else {
                throw new Error(response.data.message || 'Failed to fetch bookings');
            }
            
        } catch (err) {
            console.error('❌ Error fetching bookings:', err);
            setError(err.response?.data?.message || err.message || 'Lỗi khi tải danh sách booking');
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, []);
    const fetchAllBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('🔄 Fetching all bookings from API...');
            
            const response = await api.get('/api/bookings', {
                params: {
                    page: 1,
                    pageSize: 100 // Get more records for management view
                }
            });
            
            console.log('📊 API Response:', response.data);
            
            if (response.data.success) {
                const { bookings: bookingData, pagination: paginationData, total } = response.data.data;
                
                console.log(`✅ Retrieved ${bookingData.length} bookings from API`);
                
                // Format booking data for display
                const formattedBookings = bookingData.map(booking => ({
                    ...booking,
                    // Ensure display fields
                    customerName: booking.displayCustomerName || booking.customerName || booking.guestName || 'N/A',
                    customerPhone: booking.displayCustomerPhone || booking.customerPhone || booking.guestPhoneNumber || booking.walkInGuestPhoneNumber || 'N/A',
                    roomTypesDisplay: booking.roomTypesDisplay || 'Chưa có thông tin phòng',
                    displayStatus: getDisplayStatus(booking.bookingStatus),
                    // ✅ THÊM: Đảm bảo roomTypeDetails được truyền xuống
                    roomTypeDetails: booking.roomTypeDetails || []
                }));
                
                setBookings(formattedBookings);
                setPagination({
                    currentPage: paginationData.currentPage,
                    totalPages: paginationData.totalPages,
                    totalItems: paginationData.totalItems,
                    itemsPerPage: paginationData.itemsPerPage
                });
                
                console.log('✅ Bookings loaded successfully:', {
                    count: formattedBookings.length,
                    pagination: paginationData
                });
                
            } else {
                throw new Error(response.data.message || 'Failed to fetch bookings');
            }
            
        } catch (err) {
            console.error('❌ Error fetching bookings:', err);
            setError(err.response?.data?.message || err.message || 'Lỗi khi tải danh sách booking');
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Helper function to get display status
    const getDisplayStatus = (status) => {
        const statusMap = {
            'Pending': 'Chờ xác nhận',
            'Confirmed': 'Đã xác nhận', 
            'CheckedIn': 'Đã check-in',
            'CheckedOut': 'Đã check-out',
            'Cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    };

    const getBookingDetails = useCallback(async (bookingId) => {
        try {
            console.log('getBookingDetails called with:', bookingId);
            
            const response = await api.get(`/api/bookings/${bookingId}/details`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get booking details');
            }
            
            console.log('✅ Booking details loaded successfully:', response.data.data);
            
            // ✅ Trả về toàn bộ data để có booking, rooms, services, promotions, summary
            const fullData = response.data.data;
            
            // ✅ Gộp booking data với các thông tin chi tiết
            return {
                ...fullData.booking,
                rooms: fullData.rooms || [],
                services: fullData.services || [],
                promotions: fullData.promotions || [],
                summary: fullData.summary || {
                    totalRooms: 0,
                    totalServices: 0,
                    totalPromotions: 0
                }
            };
            
        } catch (error) {
            console.error('❌ Error getting booking details:', error);
            throw error;
        }
    }, []);

    const updateBookingStatus = useCallback(async (bookingId, newStatus, additionalData = {}) => {
        try {
            console.log('updateBookingStatus called with:', { bookingId, newStatus, additionalData });
            
            let endpoint = '';
            let body = {};
            
            // Map status to appropriate endpoint
            switch (newStatus) {
                case 'CheckedIn':
                    endpoint = `/api/bookings/${bookingId}/checkin`;
                    body = {
                        actualCheckInTime: new Date().toISOString(),
                        guestCount: additionalData.guestCount,
                        specialNotes: additionalData.notes
                    };
                    break;
                case 'CheckedOut':
                    endpoint = `/api/bookings/online/${bookingId}/checkout`;
                    body = {
                        actualCheckOutTime: new Date().toISOString(),
                        notes: additionalData.notes || '',
                        receptionistID: additionalData.receptionistID || 1
                    };
                    break;
                case 'Confirmed':
                    endpoint = `/api/bookings/${bookingId}/assign-rooms`;
                    body = { selectedRooms: additionalData.selectedRooms || [] };
                    break;
                default:
                    throw new Error(`Status update for '${newStatus}' not implemented yet`);
            }
            
            const response = await api.post(endpoint, body);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to update booking status');
            }
            
            console.log('✅ Booking status updated successfully:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Error updating booking status:', error);
            throw error;
        }
    }, []);

    const cancelBooking = useCallback(async (bookingId, cancelData) => {
        try {
            console.log('cancelBooking called with:', { bookingId, cancelData });
            
            const response = await api.post('/api/booking-cancels', {
                bookingID: bookingId,
                cancelType: cancelData.reason || 'Customer Request',
                cancelReason: cancelData.note || ''
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to cancel booking');
            }
            
            console.log('✅ Booking cancelled successfully:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Error cancelling booking:', error);
            throw error;
        }
    }, []);

    const getAvailableRooms = useCallback(async (bookingId) => {
        try {
            console.log('getAvailableRooms called with:', bookingId);
            
            // First, get booking details to extract check-in/check-out dates and room requirements
            const bookingDetailsResponse = await api.get(`/api/bookings/${bookingId}/details`);
            
            if (!bookingDetailsResponse.data.success) {
                throw new Error('Failed to get booking details');
            }
            
            const booking = bookingDetailsResponse.data.data.booking;
            console.log('📋 Booking details for available rooms:', booking);
            
            // Extract dates and room requirements
            const checkIn = booking.checkInDate || booking.checkIn;
            const checkOut = booking.checkOutDate || booking.checkOut;
            
            if (!checkIn || !checkOut) {
                console.warn('⚠️ Missing check-in or check-out dates, using current date range');
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                checkIn = today.toISOString().split('T')[0];
                checkOut = tomorrow.toISOString().split('T')[0];
            }
            
            // Get room type requirements from booking
            let requestedRoomTypes = [];
            
            // Try to get room type requirements from the booking details
            const roomTypesResponse = await api.get(`/api/bookings/online/${bookingId}/room-types`);
            if (roomTypesResponse.data.success && roomTypesResponse.data.data && roomTypesResponse.data.data.roomTypeRequirements) {
                requestedRoomTypes = roomTypesResponse.data.data.roomTypeRequirements.map(rt => ({
                    roomTypeId: rt.roomTypeID,
                    quantity: rt.quantity,
                    roomTypeName: rt.roomTypeName
                }));
            }
            
            console.log('🔍 Requesting available rooms with:', {
                checkIn,
                checkOut,
                requestedRoomTypes
            });
            
            // Call the available rooms API
            const params = new URLSearchParams({
                checkIn: checkIn,
                checkOut: checkOut
            });
            
            if (requestedRoomTypes.length > 0) {
                params.append('requestedRoomTypes', JSON.stringify(requestedRoomTypes));
            }
            
            const response = await api.get(`/api/rooms/available-for-booking?${params.toString()}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get available rooms');
            }
            
            const availableRooms = response.data.data || [];
            console.log(`✅ Found ${availableRooms.length} available rooms for booking ${bookingId}`);
            
            return availableRooms;
            
        } catch (error) {
            console.error('❌ Error getting available rooms:', error);
            
            // Return empty array as fallback to prevent UI crashes
            return [];
        }
    }, []);

    // ✅ THÊM: Method để confirm booking (không gán phòng)
    const confirmBooking = useCallback(async (bookingId) => {
        try {
            console.log('📋 Confirming booking:', bookingId);
            
            const response = await api.post(`/api/bookings/online/${bookingId}/confirm`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to confirm booking');
            }
            
            console.log('✅ Booking confirmed successfully:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Error confirming booking:', error);
            throw error;
        }
    }, []);

    // ✅ THÊM: Method để check-in với gán phòng
    const checkInBooking = useCallback(async (bookingId, selectedRooms, additionalData = {}) => {
        try {
            console.log('🏨 Starting check-in process for booking:', bookingId);
            
            if (!Array.isArray(selectedRooms) || selectedRooms.length === 0) {
                throw new Error('Selected rooms must be a non-empty array');
            }

            const requestData = {
                selectedRooms: selectedRooms.map(room => ({
                    roomID: room.RoomID || room.roomId || room.id,
                    roomNumber: room.RoomNumber || room.roomNumber,
                    roomTypeID: room.TypeID || room.typeId || room.roomTypeID,
                    checkInAt: room.checkInAt || new Date().toISOString(),
                    checkOutAt: room.checkOutAt || new Date(Date.now() + 24*60*60*1000).toISOString()
                })),
                receptionistID: additionalData.receptionistID || 1,
                assignedBy: additionalData.assignedBy || 'System'
            };

            console.log('📤 Sending check-in request:', requestData);

            const response = await api.post(`/api/bookings/online/${bookingId}/checkin`, requestData);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to check-in');
            }
            
            console.log('✅ Check-in completed successfully:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Error during check-in:', error);
            throw error;
        }
    }, []);

    // ✅ THÊM: Method để check xem booking đã được gán phòng chưa
    const checkBookingRoomAssignment = useCallback(async (bookingId) => {
        try {
            console.log('🔍 Checking room assignment status for booking:', bookingId);
            
            const response = await api.get(`/api/bookings/online/${bookingId}/room-assignment-status`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to check room assignment status');
            }
            
            console.log('✅ Room assignment status:', response.data.data);
            return response.data.data;
            
        } catch (error) {
            console.error('❌ Error checking room assignment:', error);
            throw error;
        }
    }, []);

    // ✅ THÊM: Method để direct check-in cho booking đã được gán phòng
    const directCheckInAssignedBooking = useCallback(async (bookingId) => {
        try {
            console.log('🏨 Direct check-in for pre-assigned booking:', bookingId);
            
            const response = await api.post(`/api/bookings/online/${bookingId}/direct-checkin`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to direct check-in');
            }
            
            console.log('✅ Direct check-in completed:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Error during direct check-in:', error);
            throw error;
        }
    }, []);

    // ✅ THÊM: Method để xử lý check-in thông minh (auto-detect assigned rooms)
    const smartCheckInBooking = useCallback(async (bookingId, selectedRooms = null, additionalData = {}) => {
        try {
            console.log('🧠 Smart check-in process starting for booking:', bookingId);
            
            // 1. Check if booking already has assigned rooms
            const assignmentStatus = await checkBookingRoomAssignment(bookingId);
            
            if (assignmentStatus.isAssigned) {
                console.log('📋 Booking already has assigned rooms, direct check-in');
                return await directCheckInAssignedBooking(bookingId);
            } else {
                console.log('🆕 Booking needs room assignment, using regular check-in');
                if (!selectedRooms || selectedRooms.length === 0) {
                    throw new Error('Booking chưa được gán phòng và không có phòng được chọn');
                }
                return await checkInBooking(bookingId, selectedRooms, additionalData);
            }
            
        } catch (error) {
            console.error('❌ Error during smart check-in:', error);
            throw error;
        }
    }, [checkBookingRoomAssignment, directCheckInAssignedBooking, checkInBooking]);

    // ✅ THÊM: Method để check-out booking
    const checkOutBooking = useCallback(async (bookingId, additionalData = {}) => {
        try {
            console.log('🚪 Starting check-out process for booking:', bookingId);
            
            const requestData = {
                actualCheckOutTime: new Date().toISOString(),
                notes: additionalData.notes || '',
                receptionistID: additionalData.receptionistID || 1
            };

            console.log('📤 Sending check-out request:', requestData);

            const response = await api.post(`/api/bookings/online/${bookingId}/checkout`, requestData);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to check-out');
            }
            
            console.log('✅ Check-out completed successfully:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Error during check-out:', error);
            throw error;
        }
    }, []);

    const assignRoomsToBooking = useCallback(async (bookingId, selectedRooms, additionalData = {}) => {
        try {
            console.log('assignRoomsToBooking called with:', { bookingId, selectedRooms, additionalData });
            
            // ✅ Validate selectedRooms is an array
            if (!Array.isArray(selectedRooms)) {
                console.error('❌ selectedRooms is not an array:', typeof selectedRooms, selectedRooms);
                throw new Error('Selected rooms must be an array');
            }
            
            if (selectedRooms.length === 0) {
                throw new Error('No rooms selected for assignment');
            }
            
            // ✅ Use the correct online booking endpoint với required fields
            const requestData = {
                selectedRooms: selectedRooms.map(room => ({
                    roomID: room.roomID || room.RoomID || room.roomId,
                    roomNumber: room.roomNumber || room.RoomNumber,
                    roomTypeID: room.typeID || room.TypeID || room.typeId || room.roomTypeID,
                    checkInAt: room.checkInAt || new Date().toISOString(),
                    checkOutAt: room.checkOutAt || new Date(Date.now() + 24*60*60*1000).toISOString()
                })),
                receptionistID: additionalData.receptionistID || 1, // Default receptionist ID
                assignedBy: additionalData.assignedBy || 'System'
            };

            console.log('📤 Sending room assignment request:', requestData);

            // ✅ SỬA: Sử dụng endpoint checkin thay vì assign-rooms để thực hiện check-in thực tế
            const response = await api.post(`/api/bookings/online/${bookingId}/checkin`, requestData);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to assign rooms');
            }
            
            console.log('✅ Rooms assigned successfully:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ Error assigning rooms:', error);
            throw error;
        }
    }, []);

    const getPossibleStatusTransitions = useCallback((currentStatus) => {
        console.log('getPossibleStatusTransitions called with:', currentStatus);
        
        const statusTransitions = {
            'Pending': [
                { value: 'Confirmed', label: 'Xác nhận booking', icon: 'fa-check', color: 'success', action: 'confirm' },
                { value: 'Cancelled', label: 'Hủy booking', icon: 'fa-times', color: 'danger', action: 'cancel' }
            ],
            'Confirmed': [
                { value: 'CheckedIn', label: 'Check-in (Gán phòng)', icon: 'fa-key', color: 'primary', action: 'checkin' },
                { value: 'Cancelled', label: 'Hủy booking', icon: 'fa-times', color: 'danger', action: 'cancel' }
            ],
            'Paid': [
                { value: 'CheckedIn', label: 'Check-in (Gán phòng)', icon: 'fa-key', color: 'primary', action: 'checkin' },
                { value: 'Cancelled', label: 'Hủy booking', icon: 'fa-times', color: 'danger', action: 'cancel' }
            ],
            'CheckedIn': [
                { value: 'CheckedOut', label: 'Check-out', icon: 'fa-sign-out-alt', color: 'info', action: 'checkout' }
            ],
            'CheckedOut': [],
            'Cancelled': [],
            'No-Show': []
        };
        
        return statusTransitions[currentStatus] || [];
    }, []);



    const filterBookingsByStatus = useCallback((status) => {
        // Placeholder - to be implemented
        console.log('filterBookingsByStatus called with:', status);
        return [];
    }, []);

    return {
        bookings,
        loading,
        error,
        pagination,
        fetchBookings,
        fetchAllBookings,
        getBookingDetails,
        updateBookingStatus,
        cancelBooking,
        confirmBooking, // ✅ THÊM: Method để confirm booking
        checkInBooking, // ✅ THÊM: Method để check-in với gán phòng
        checkOutBooking, // ✅ THÊM: Method để check-out booking
        checkBookingRoomAssignment, // ✅ THÊM: Method để check xem booking đã được gán phòng chưa
        directCheckInAssignedBooking, // ✅ THÊM: Method để direct check-in cho booking đã gán phòng
        smartCheckInBooking, // ✅ THÊM: Method để check-in thông minh (auto-detect)
        getAvailableRooms,
        assignRoomsToBooking, // ✅ GIỮ LẠI: Backward compatibility
        getPossibleStatusTransitions,
        filterBookingsByStatus,
        getDisplayStatus
    };
};