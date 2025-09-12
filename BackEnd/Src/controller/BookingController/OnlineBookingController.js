import express from 'express';
// ✅ THÊM: Import mssql để sử dụng trong query
import mssql from 'mssql';
import BookingDBContext from '../../dal/BookingDBContext.js';
import BookingServiceDBContext from '../../dal/BookingServiceDBContext.js';
import BookingPromotionDBContext from '../../dal/BookingPromotionDBContext.js';
import BookingRoomTypeDBContext from '../../dal/BookingRoomTypeDBContext.js';
import InvoiceDBContext from '../../dal/InvoiceDBContext.js';
import UserDBContext from '../../dal/UserDBContext.js';

const router = express.Router();
const bookingDB = new BookingDBContext();
const bookingServiceDB = new BookingServiceDBContext();
const bookingPromotionDB = new BookingPromotionDBContext();
const bookingRoomTypeDB = new BookingRoomTypeDBContext();
const invoiceDB = new InvoiceDBContext();
const userDB = new UserDBContext();

// Helper functions
const sendResponse = (res, status, success, message, data = null, errors = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
    ...(errors && { errors })
  };
  
  res.status(status).json(response);
};

const handleError = (res, error, defaultMessage = 'Đã xảy ra lỗi không mong muốn') => {
  console.error('❌ Online Booking Controller Error:', error);
  
  if (error.name === 'ValidationError') {
    return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, error.errors);
  }
  
  sendResponse(res, 500, false, defaultMessage);
};

// ✅ SỬA: Đơn giản hóa validation - chỉ validate data, không check session
const validateOnlineBookingData = (bookingData) => {
  const errors = [];
  
  try {
    console.log('🔍 Validating online booking data:', {
      customerID: bookingData.customerID,
      numberOfGuest: bookingData.numberOfGuest,
      bookingType: bookingData.bookingType,
      hasSelectedRooms: !!bookingData.selectedRooms,
      roomsLength: bookingData.selectedRooms?.length || 0,
      hasCheckIn: !!bookingData.checkIn,
      hasCheckOut: !!bookingData.checkOut,
      totalAmount: bookingData.totalAmount
    });
    
    // ✅ Required fields validation - customerID từ frontend
    if (!bookingData.customerID || !Number.isInteger(bookingData.customerID) || bookingData.customerID <= 0) {
      errors.push({ field: 'customerID', message: 'Customer ID không hợp lệ' });
    }
    
    if (!bookingData.numberOfGuest || !Number.isInteger(bookingData.numberOfGuest) || bookingData.numberOfGuest < 1) {
      errors.push({ field: 'numberOfGuest', message: 'Số khách phải lớn hơn 0' });
    }
    
    if (bookingData.numberOfGuest > 50) {
      errors.push({ field: 'numberOfGuest', message: 'Số khách không được vượt quá 50' });
    }
    
    // BookingType validation
    if (bookingData.bookingType !== 1) {
      errors.push({ field: 'bookingType', message: 'BookingType phải là 1 (Online)' });
    }
    
    // Date validations
    if (!bookingData.checkIn) {
      errors.push({ field: 'checkIn', message: 'Ngày check-in không được để trống' });
    } else {
      const checkIn = new Date(bookingData.checkIn);
      if (isNaN(checkIn.getTime())) {
        errors.push({ field: 'checkIn', message: 'Ngày check-in không hợp lệ' });
      } else if (checkIn < new Date()) {
        errors.push({ field: 'checkIn', message: 'Ngày check-in không được trong quá khứ' });
      }
    }
    
    if (!bookingData.checkOut) {
      errors.push({ field: 'checkOut', message: 'Ngày check-out không được để trống' });
    } else {
      const checkOut = new Date(bookingData.checkOut);
      if (isNaN(checkOut.getTime())) {
        errors.push({ field: 'checkOut', message: 'Ngày check-out không hợp lệ' });
      }
    }
    
    if (bookingData.checkIn && bookingData.checkOut) {
      const checkIn = new Date(bookingData.checkIn);
      const checkOut = new Date(bookingData.checkOut);
      if (checkIn >= checkOut) {
        errors.push({ field: 'dateRange', message: 'Ngày check-out phải sau ngày check-in' });
      }
    }
    
    // ✅ THÊM: Special request validation
    if (bookingData.specialRequest && typeof bookingData.specialRequest === 'string') {
      if (bookingData.specialRequest.length > 250) {
        errors.push({ field: 'specialRequest', message: 'Yêu cầu đặc biệt không được vượt quá 250 ký tự' });
      }
      // Validate basic content (không cho phép chỉ có khoảng trắng)
      if (bookingData.specialRequest.trim().length === 0) {
        // Nếu chỉ có khoảng trắng, set về null
        bookingData.specialRequest = null;
      }
    }
    
    // Selected rooms validation
    if (!bookingData.selectedRooms || !Array.isArray(bookingData.selectedRooms) || bookingData.selectedRooms.length === 0) {
      errors.push({ field: 'selectedRooms', message: 'Phải chọn ít nhất một loại phòng' });
    } else {
      bookingData.selectedRooms.forEach((room, index) => {
        if (!room.roomTypeId) {
          errors.push({ field: `selectedRooms[${index}].roomTypeId`, message: 'Room Type ID không được để trống' });
        }
        if (!room.quantity || room.quantity <= 0) {
          errors.push({ field: `selectedRooms[${index}].quantity`, message: 'Số lượng phòng phải lớn hơn 0' });
        }
        // ✅ THÊM: Validate checkInAt và checkOutAt cho từng room
        if (room.checkInAt && isNaN(new Date(room.checkInAt).getTime())) {
          errors.push({ field: `selectedRooms[${index}].checkInAt`, message: 'Ngày check-in không hợp lệ' });
        }
        if (room.checkOutAt && isNaN(new Date(room.checkOutAt).getTime())) {
          errors.push({ field: `selectedRooms[${index}].checkOutAt`, message: 'Ngày check-out không hợp lệ' });
        }
      });
    }
    
    // Total amount validation
    if (!bookingData.totalAmount || bookingData.totalAmount <= 0) {
      errors.push({ field: 'totalAmount', message: 'Tổng tiền phải lớn hơn 0' });
    }
    
    // Selected services validation (optional)
    if (bookingData.selectedServices && Array.isArray(bookingData.selectedServices)) {
      bookingData.selectedServices.forEach((serviceId, index) => {
        if (!Number.isInteger(serviceId) || serviceId <= 0) {
          errors.push({ field: `selectedServices[${index}]`, message: 'Service ID không hợp lệ' });
        }
      });
    }
    
    // Selected promotion validation (optional)
    if (bookingData.selectedPromotion) {
      if (!bookingData.selectedPromotion.promotionID || !Number.isInteger(bookingData.selectedPromotion.promotionID)) {
        errors.push({ field: 'selectedPromotion.promotionID', message: 'Promotion ID không hợp lệ' });
      }
    }
    
  } catch (error) {
    console.error('❌ Error in validation:', error);
    errors.push({ field: 'general', message: 'Lỗi khi validate dữ liệu' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    validatedData: errors.length === 0 ? {
      customerID: bookingData.customerID,
      numberOfGuest: bookingData.numberOfGuest,
      specialRequest: bookingData.specialRequest || null,
      bookingType: 1, // Online
      bookingStatus: 'Pending',
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      selectedRooms: bookingData.selectedRooms.map(room => ({
        roomTypeId: parseInt(room.roomTypeId),
        quantity: parseInt(room.quantity),
        price: parseFloat(room.price || 0),
        name: room.name || '',
        // ✅ THÊM: Bao gồm checkInAt và checkOutAt
        checkInAt: room.checkInAt || bookingData.checkIn,
        checkOutAt: room.checkOutAt || bookingData.checkOut
      })),
      selectedServices: bookingData.selectedServices || [],
      selectedPromotion: bookingData.selectedPromotion || null,
      pricing: bookingData.pricing || {},
      totalAmount: parseFloat(bookingData.totalAmount),
      walkInGuestPhoneNumber: null,
      guestID: null,
      receptionistID: null
    } : null
  };
};

// ✅ SỬA: Debug endpoint (không cần authentication)
router.get('/debug/auth', (req, res) => {
  console.log('🔍 Debug auth endpoint called');
  
  res.json({
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated?.(),
    user: req.user ? {
      UserID: req.user.UserID,
      Username: req.user.Username,
      Email: req.user.Email
    } : null,
    session: req.session ? {
      hasPassport: !!req.session.passport,
      passportUser: req.session.passport?.user,
      sessionKeys: Object.keys(req.session)
    } : null,
    cookies: req.headers.cookie,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    }
  });
});

// ✅ THÊM: Debug endpoint để test session
router.get('/debug/session', (req, res) => {
  console.log('🔍 Session debug endpoint called');
  
  res.json({
    success: true,
    data: {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      isAuthenticated: req.isAuthenticated?.(),
      user: req.user ? {
        UserID: req.user.UserID,
        Username: req.user.Username,
        Email: req.user.Email
      } : null,
      session: {
        hasPassport: !!(req.session?.passport),
        passportUser: req.session?.passport?.user ? {
          UserID: req.session.passport.user.UserID,
          Username: req.session.passport.user.Username
        } : null
      },
      cookies: req.headers.cookie ? 'present' : 'missing',
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
      }
    }
  });
});

// ✅ THÊM: Helper function để gán customer role
const assignCustomerRole = async (userID) => {
  try {
    console.log('👤 Checking and assigning customer role for user:', userID);
    
    // Kiểm tra user có role customer chưa
    const hasCustomerRole = await userDB.checkUserRole(userID, 3); // RoleID = 3 (customer)
    
    if (hasCustomerRole) {
      console.log('✅ User already has customer role');
      return { success: true, message: 'User already has customer role' };
    }
    
    // Gán customer role cho user
    const roleAssignResult = await userDB.assignRoleToUser(userID, 3);
    
    if (roleAssignResult.success) {
      console.log('✅ Customer role assigned successfully to user:', userID);
      return { success: true, message: 'Customer role assigned successfully' };
    } else {
      console.warn('⚠️ Failed to assign customer role:', roleAssignResult.message);
      return { success: false, message: roleAssignResult.message };
    }
    
  } catch (error) {
    console.error('❌ Error assigning customer role:', error);
    return { success: false, message: 'Error assigning customer role', error: error.message };
  }
};

// ✅ POST /api/bookings/online/create - Create online booking
router.post('/create', async (req, res) => {
  try {
    console.log('🌐 Creating online booking with data:', req.body);
    
    // ✅ Lấy customerID trực tiếp từ request body (từ frontend AuthContext)
    const customerID = req.body.customerID;
    
    if (!customerID) {
      console.error('❌ No customerID provided in request body');
      return sendResponse(res, 400, false, 'CustomerID không được cung cấp. Vui lòng đăng nhập lại.', null, {
        requestBody: {
          hasCustomerID: !!req.body.customerID,
          bodyKeys: Object.keys(req.body)
        }
      });
    }
    
    console.log('🔐 Using customerID from request body:', customerID);
    
    // ✅ Prepare booking data với customerID từ request
    const bookingData = {
      ...req.body,
      customerID: customerID,
      bookingType: 1 // Online booking
    };
    
    // ✅ Validate booking data
    const validation = validateOnlineBookingData(bookingData);
    if (!validation.isValid) {
      return sendResponse(res, 400, false, 'Dữ liệu đặt phòng không hợp lệ', null, validation.errors);
    }
    
    const validatedData = validation.validatedData;
    
    // ✅ STEP 1: Create Booking record
    const bookingResult = await bookingDB.createOnlineBooking(validatedData);
    if (!bookingResult.success) {
      return sendResponse(res, 500, false, bookingResult.message);
    }
    
    const bookingID = bookingResult.bookingID;
    console.log(`✅ Booking created with ID: ${bookingID}`);
    
    // ✅ STEP 2: Create BookingRoomType records (NEW STEP)
    if (validatedData.selectedRooms && validatedData.selectedRooms.length > 0) {
      console.log('🏨 Creating booking room type records...');
      
      const bookingRoomTypesResult = await bookingRoomTypeDB.createMultiple(bookingID, validatedData.selectedRooms);
      
      if (!bookingRoomTypesResult.success) {
        console.warn('⚠️ Warning: Could not create booking room types:', bookingRoomTypesResult.message);
        // ⚠️ Không fail toàn bộ booking vì room types là metadata
      } else {
        console.log(`✅ Created ${bookingRoomTypesResult.data.length} booking room type records`);
        console.log('📊 Room type breakdown saved:', bookingRoomTypesResult.data.map(rt => 
          `${rt.quantity}x RoomType ${rt.roomTypeID}`
        ).join(', '));
      }
    } else {
      console.log('ℹ️ No room types selected - skipping BookingRoomType creation');
    }
    
    // ✅ STEP 3: Create BookingService records
    if (validatedData.selectedServices.length > 0) {
      console.log('🛎️ Creating booking service records...');
      
      const bookingServices = validatedData.selectedServices.map(serviceId => ({
        bookingID: bookingID,
        serviceID: parseInt(serviceId)
      }));
      
      const serviceResult = await bookingServiceDB.createMultiple(bookingID, bookingServices);
      if (!serviceResult.success) {
        console.warn('⚠️ Warning: Could not create booking services:', serviceResult.message);
      } else {
        console.log(`✅ Created ${serviceResult.data.length} booking service records`);
      }
    }
    
    // ✅ STEP 4: Create BookingPromotion record
    if (validatedData.selectedPromotion) {
      console.log('🎯 Creating booking promotion record...');
      
      const bookingPromotionData = {
        bookingID: bookingID,
        promotionID: validatedData.selectedPromotion.promotionID
      };
      
      const promotionResult = await bookingPromotionDB.create(bookingPromotionData);
      if (!promotionResult.success) {
        console.warn('⚠️ Warning: Could not create booking promotion:', promotionResult.message);
      } else {
        console.log('✅ Created booking promotion record');
      }
    }
    
    // ✅ STEP 5: Create Invoice
    let invoiceID = null;
    try {
      console.log('📋 Creating invoice for online booking...');
      
      const invoiceData = {
        bookingID: bookingID,
        customerID: validatedData.customerID,
        selectedRooms: validatedData.selectedRooms,
        selectedServices: validatedData.selectedServices,
        selectedPromotion: validatedData.selectedPromotion,
        pricing: validatedData.pricing,
        totalAmount: validatedData.totalAmount,
        checkIn: validatedData.checkIn,
        checkOut: validatedData.checkOut,
        numberOfGuest: validatedData.numberOfGuest
      };
      
      const invoiceResult = await invoiceDB.createInvoiceFromBookingData(invoiceData);
      if (invoiceResult.success) {
        invoiceID = invoiceResult.invoiceID;
        console.log(`✅ Invoice created with ID: ${invoiceID}`);
      } else {
        console.warn('⚠️ Warning: Could not create invoice:', invoiceResult.message);
      }
    } catch (invoiceError) {
      console.warn('⚠️ Invoice creation failed:', invoiceError.message);
    }
    
    // ✅ STEP 6: Assign Customer Role
    try {
      console.log('👤 Assigning customer role to user after successful booking...');
      const roleAssignResult = await assignCustomerRole(validatedData.customerID);
      
      if (roleAssignResult.success) {
        console.log('✅ Customer role assignment completed');
      } else {
        console.warn('⚠️ Warning: Could not assign customer role:', roleAssignResult.message);
      }
    } catch (roleError) {
      console.warn('⚠️ Role assignment error (non-critical):', roleError.message);
    }
    
    // ✅ SUCCESS RESPONSE
    console.log('🎉 Online booking created successfully!');
    
    sendResponse(res, 201, true, 'Đặt phòng online thành công', {
      bookingID: bookingID,
      invoiceID: invoiceID,
      customerID: validatedData.customerID,
      totalAmount: validatedData.totalAmount,
      bookingStatus: 'Pending',
      paymentStatus: invoiceID ? 'Pending' : 'Not Created',
      roomAssignmentStatus: 'Pending', // Specific rooms chưa được assign
      roomTypeRequirements: validatedData.selectedRooms, // ✅ THÊM: Room type requirements
      userRoleStatus: 'Customer role assigned',
      nextSteps: [
        'Thanh toán hóa đơn',
        'Chờ xác nhận từ khách sạn', 
        'Nhận phòng cụ thể từ lễ tân',
        'Check-in với phòng đã được assign'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error creating online booking:', error);
    handleError(res, error, 'Không thể tạo đặt phòng online');
  }
});

// ✅ GET /api/bookings/online/:id - Get online booking details
router.get('/:id', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    
    if (isNaN(bookingID)) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }
    
    // ✅ SỬA: Lấy customerID từ session (không cần validate vì đã protected)
    const customerID = req.user?.UserID || req.session?.passport?.user?.UserID;
    
    if (!customerID) {
      return sendResponse(res, 400, false, 'Không tìm thấy thông tin người dùng');
    }
    
    const bookingResult = await bookingDB.getOnlineBookingById(bookingID);
    if (!bookingResult.success) {
      return sendResponse(res, 404, false, bookingResult.message);
    }
    
    // Verify ownership
    if (bookingResult.data.customerID !== customerID) {
      return sendResponse(res, 403, false, 'Bạn không có quyền xem booking này');
    }
    
    const [roomsResult, servicesResult, promotionsResult] = await Promise.all([
      bookingRoomDB.getByBookingId(bookingID),
      bookingServiceDB.getByBookingId(bookingID),
      bookingPromotionDB.getByBookingId(bookingID)
    ]);
    
    const responseData = {
      ...bookingResult.data,
      rooms: roomsResult.success ? roomsResult.data : [],
      services: servicesResult.success ? servicesResult.data : [],
      promotions: promotionsResult.success ? promotionsResult.data : []
    };
    
    sendResponse(res, 200, true, 'Lấy thông tin booking thành công', responseData);
    
  } catch (error) {
    console.error('❌ Error getting online booking:', error);
    handleError(res, error, 'Không thể lấy thông tin booking');
  }
});

// ✅ SỬA: Sử dụng method có sẵn từ BookingDBContext
// GET /api/bookings/online - Get all online bookings for management
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      status,
      customerName,
      roomType,
      dateFrom,
      dateTo
    } = req.query;

    console.log('🔍 Getting online bookings for management:', {
      page,
      pageSize,
      status,
      customerName,
      roomType
    });

    // ✅ Sử dụng method có sẵn từ BookingDBContext thay vì viết query mới
    const result = await bookingDB.getOnlineBookingsForManagement({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      customerName,
      roomType,
      dateFrom,
      dateTo
    });

    if (!result.success) {
      return sendResponse(res, 400, false, result.message);
    }

    console.log(`✅ Found ${result.data.bookings.length} online bookings (page ${page}/${result.data.pagination.totalPages})`);

    sendResponse(res, 200, true, 'Lấy danh sách booking online thành công', result.data);

  } catch (error) {
    console.error('❌ Error getting online bookings:', error);
    handleError(res, error, 'Không thể lấy danh sách booking online');
  }
});

// ✅ SỬA: Sử dụng method có sẵn từ BookingRoomTypeDBContext  
// GET /api/bookings/online/:id/room-types - Get room type requirements
router.get('/:id/room-types', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    
    if (!bookingID || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }
    
    console.log(`🔍 Getting room type requirements for booking: ${bookingID}`);
    
    // ✅ Sử dụng method có sẵn từ BookingRoomTypeDBContext
    const roomTypesResult = await bookingRoomTypeDB.getByBookingId(bookingID);
    
    if (!roomTypesResult.success) {
      return sendResponse(res, 404, false, 'Không tìm thấy yêu cầu loại phòng cho booking này');
    }
    
    console.log(`✅ Found ${roomTypesResult.data.length} room type requirements`);
    
    sendResponse(res, 200, true, 'Lấy yêu cầu loại phòng thành công', {
      bookingID: bookingID,
      roomTypeRequirements: roomTypesResult.data,
      totalRoomTypes: roomTypesResult.data.length,
      totalRooms: roomTypesResult.data.reduce((sum, rt) => sum + rt.quantity, 0)
    });
    
  } catch (error) {
    console.error('❌ Error getting room type requirements:', error);
    handleError(res, error, 'Không thể lấy yêu cầu loại phòng');
  }
});

// ✅ SỬA: Sử dụng method có sẵn từ BookingDBContext
// POST /api/bookings/online/:id/confirm - Confirm online booking (no room assignment)
router.post('/:id/confirm', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);

    if (!bookingID || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }

    console.log(`📋 Confirming online booking ${bookingID}`);

    const result = await bookingDB.confirmOnlineBooking(bookingID);

    if (!result.success) {
      return sendResponse(res, 400, false, result.message);
    }

    console.log('✅ Booking confirmation successful');
    sendResponse(res, 200, true, 'Xác nhận booking thành công', result.data);

  } catch (error) {
    console.error('❌ Error confirming booking:', error);
    handleError(res, error, 'Không thể xác nhận booking');
  }
});

// POST /api/bookings/online/:id/checkin - Check-in online booking with room assignment
router.post('/:id/checkin', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    const { selectedRooms, receptionistID, assignedBy } = req.body;

    if (!bookingID || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }

    if (!selectedRooms || !Array.isArray(selectedRooms) || selectedRooms.length === 0) {
      return sendResponse(res, 400, false, 'Danh sách phòng không hợp lệ');
    }

    console.log(`🏨 Check-in booking ${bookingID} with ${selectedRooms.length} rooms`);

    const result = await bookingDB.checkInOnlineBooking(bookingID, {
      selectedRooms,
      receptionistID,
      assignedBy
    });

    if (!result.success) {
      return sendResponse(res, 400, false, result.message);
    }

    console.log('✅ Check-in successful');
    sendResponse(res, 200, true, 'Check-in thành công', result.data);

  } catch (error) {
    console.error('❌ Error during check-in:', error);
    handleError(res, error, 'Không thể check-in');
  }
});

// POST /api/bookings/:id/assign-rooms - DEPRECATED: Use /checkin instead  
router.post('/:id/assign-rooms', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    const { selectedRooms, receptionistID, assignedBy } = req.body;

    if (!bookingID || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }

    if (!selectedRooms || !Array.isArray(selectedRooms) || selectedRooms.length === 0) {
      return sendResponse(res, 400, false, 'Danh sách phòng không hợp lệ');
    }

    console.log(`🏨 Assigning ${selectedRooms.length} rooms to booking ${bookingID}`);

    // ✅ DEPRECATED: Sử dụng checkInOnlineBooking thay vì assignRoomsToOnlineBooking
    const result = await bookingDB.checkInOnlineBooking(bookingID, {
      selectedRooms,
      receptionistID,
      assignedBy
    });

    if (!result.success) {
      return sendResponse(res, 400, false, result.message);
    }

    console.log('✅ Room assignment successful');
    sendResponse(res, 200, true, 'Gán phòng thành công', result.data);

  } catch (error) {
    console.error('❌ Error assigning rooms:', error);
    handleError(res, error, 'Không thể gán phòng');
  }
});

// ✅ THÊM: POST /:id/direct-checkin - Direct check-in for already assigned bookings
router.post('/:id/direct-checkin', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);

    if (!bookingID || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }

    console.log(`🏨 Direct check-in for pre-assigned booking ${bookingID}`);

    const result = await bookingDB.directCheckInAssignedBooking(bookingID);

    if (!result.success) {
      return sendResponse(res, 400, false, result.message);
    }

    console.log('✅ Direct check-in successful');
    sendResponse(res, 200, true, result.message, result.data);

  } catch (error) {
    console.error('❌ Error during direct check-in:', error);
    handleError(res, error, 'Không thể check-in booking đã được gán phòng');
  }
});

// ✅ THÊM: GET /:id/room-assignment-status - Check if booking has assigned rooms
router.get('/:id/room-assignment-status', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);

    if (!bookingID || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }

    console.log(`🔍 Checking room assignment status for booking ${bookingID}`);

    const assignmentStatus = await bookingDB.isBookingRoomAssigned(bookingID);
    const assignedRooms = assignmentStatus.isAssigned ? 
      await bookingDB.getAssignedRooms(bookingID) : 
      { success: true, rooms: [] };

    if (!assignmentStatus.success) {
      return sendResponse(res, 500, false, 'Không thể kiểm tra trạng thái gán phòng');
    }

    const responseData = {
      bookingID,
      isAssigned: assignmentStatus.isAssigned,
      roomCount: assignmentStatus.roomCount,
      assignedRooms: assignedRooms.rooms || []
    };

    console.log('✅ Room assignment status retrieved:', responseData);
    sendResponse(res, 200, true, 'Lấy trạng thái gán phòng thành công', responseData);

  } catch (error) {
    console.error('❌ Error checking room assignment status:', error);
    handleError(res, error, 'Không thể kiểm tra trạng thái gán phòng');
  }
});

// ✅ THÊM: POST /:id/checkout - Check-out booking and release rooms
router.post('/:id/checkout', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    const { actualCheckOutTime, notes, receptionistID } = req.body;

    if (!bookingID || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }

    console.log(`🚪 Check-out booking ${bookingID}`);

    const result = await bookingDB.checkOutOnlineBooking(bookingID, {
      actualCheckOutTime: actualCheckOutTime || new Date().toISOString(),
      notes: notes || '',
      receptionistID: receptionistID || null
    });

    if (!result.success) {
      return sendResponse(res, 400, false, result.message);
    }

    console.log('✅ Check-out successful');
    sendResponse(res, 200, true, result.message, result.data);

  } catch (error) {
    console.error('❌ Error during check-out:', error);
    handleError(res, error, 'Không thể check-out booking');
  }
});

export default router;