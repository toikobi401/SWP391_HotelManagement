import express from 'express';
import BookingDBContext from '../../dal/BookingDBContext.js';
import BookingRoomDBContext from '../../dal/BookingRoomDBContext.js';
import BookingServiceDBContext from '../../dal/BookingServiceDBContext.js';
import BookingPromotionDBContext from '../../dal/BookingPromotionDBContext.js';
import BookingCancelDBContext from '../../dal/BookingCancelDBContext.js'; // ✅ THÊM
import InvoiceDBContext from '../../dal/InvoiceDBContext.js';
import RoomDBContext from '../../dal/RoomDBContext.js';
import ServiceDBContext from '../../dal/ServiceDBContext.js';
import PromotionDBContext from '../../dal/PromotionDBContext.js';
import OnlineBookingController from './OnlineBookingController.js'; // ✅ THÊM import

const router = express.Router();
const bookingDB = new BookingDBContext();
const bookingRoomDB = new BookingRoomDBContext();
const bookingServiceDB = new BookingServiceDBContext();
const bookingPromotionDB = new BookingPromotionDBContext();
const bookingCancelDB = new BookingCancelDBContext(); // ✅ THÊM
const invoiceDB = new InvoiceDBContext();
const roomDB = new RoomDBContext();
const serviceDB = new ServiceDBContext();
const promotionDB = new PromotionDBContext();

// Middleware for logging requests
router.use((req, res, next) => {
  console.log(`📅 Booking API: ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Helper function for standardized responses
const sendResponse = (res, status, success, message, data = null, errors = null, pagination = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
    ...(errors && { errors }),
    ...(pagination && { pagination })
  };
  
  res.status(status).json(response);
};

// Helper function for error handling
const handleError = (res, error, defaultMessage = 'Đã xảy ra lỗi không mong muốn') => {
  console.error('❌ Controller Error:', error);
  
  if (error.name === 'ValidationError') {
    return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, error.errors);
  }
  
  if (error.code === 'ECONNREFUSED') {
    return sendResponse(res, 503, false, 'Không thể kết nối đến cơ sở dữ liệu');
  }
  
  sendResponse(res, 500, false, defaultMessage);
};

// Helper function để validate booking data
const validateBookingData = async (bookingData) => {
  const errors = [];
  
  try {
    // Validate required fields
    const requiredFields = ['guestID', 'receptionistID', 'checkInDate', 'checkOutDate', 'numberOfGuest', 'totalPrice'];
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      errors.push({ field: 'required', message: `Thiếu các trường bắt buộc: ${missingFields.join(', ')}` });
    }
    
    // Validate guest exists
    if (bookingData.guestID) {
      const guestResult = await guestDB.getGuestByPhoneNumber(bookingData.guestID);
      if (!guestResult.success) {
        errors.push({ field: 'guestID', message: 'Khách hàng không tồn tại trong hệ thống' });
      }
    }
    
    // Validate dates
    if (bookingData.checkInDate && bookingData.checkOutDate) {
      const checkIn = new Date(bookingData.checkInDate);
      const checkOut = new Date(bookingData.checkOutDate);
      
      if (checkIn >= checkOut) {
        errors.push({ field: 'dates', message: 'Ngày checkout phải sau ngày checkin' });
      }
      
      if (checkIn < new Date()) {
        errors.push({ field: 'checkInDate', message: 'Ngày checkin không được trong quá khứ' });
      }
    }
    
    // Validate rooms if provided
    if (bookingData.bookedRooms && Array.isArray(bookingData.bookedRooms)) {
      for (const room of bookingData.bookedRooms) {
        const roomValidation = BookingRoom.validateBookingRoom({
          bookingID: 1, // Temporary ID for validation
          roomID: room.roomID,
          quantity: room.quantity,
          pricePerNight: room.pricePerNight
        });
        
        if (!roomValidation.isValid) {
          errors.push(...roomValidation.errors.map(err => ({ 
            field: `room_${room.roomID}_${err.field}`, 
            message: err.message 
          })));
        }
      }
    }
    
    // Validate services if provided
    if (bookingData.bookedServices && Array.isArray(bookingData.bookedServices)) {
      for (const service of bookingData.bookedServices) {
        const serviceValidation = BookingService.validateBookingService({
          bookingID: 1, // Temporary ID for validation
          serviceID: service.serviceID,
          quantity: service.quantity,
          pricePerService: service.pricePerService
        });
        
        if (!serviceValidation.isValid) {
          errors.push(...serviceValidation.errors.map(err => ({ 
            field: `service_${service.serviceID}_${err.field}`, 
            message: err.message 
          })));
        }
      }
    }
    
    // Validate promotions if provided
    if (bookingData.appliedPromotions && Array.isArray(bookingData.appliedPromotions)) {
      for (const promotion of bookingData.appliedPromotions) {
        const promotionValidation = BookingPromotion.validateBookingPromotion({
          bookingID: 1, // Temporary ID for validation
          promotionID: promotion.promotionID,
          discountAmount: promotion.discountAmount
        });
        
        if (!promotionValidation.isValid) {
          errors.push(...promotionValidation.errors.map(err => ({ 
            field: `promotion_${promotion.promotionID}_${err.field}`, 
            message: err.message 
          })));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error in validation:', error);
    errors.push({ field: 'general', message: 'Lỗi khi validate dữ liệu' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ✅ THÊM: Helper function để validate walk-in booking data theo schema thực tế
const validateWalkInBookingData = async (bookingData) => {
  const errors = [];
  
  try {
    console.log('🔍 Validating walk-in booking data:', {
      receptionistID: bookingData.receptionistID,
      numberOfGuest: bookingData.numberOfGuest,
      bookingType: bookingData.bookingType,
      guestID: bookingData.guestID,
      walkInGuestPhoneNumber: bookingData.walkInGuestPhoneNumber,
      hasRequestedRoomTypes: !!bookingData.requestedRoomTypes,
      roomTypesLength: bookingData.requestedRoomTypes?.length || 0,
      hasCheckInDate: !!bookingData.checkInDate,
      hasCheckOutDate: !!bookingData.checkOutDate,
      hasSpecialRequest: !!bookingData.specialRequest
    });
    
    // ✅ REQUIRED FIELDS validation
    if (!bookingData.receptionistID || !Number.isInteger(bookingData.receptionistID) || bookingData.receptionistID <= 0) {
      errors.push({ field: 'receptionistID', message: 'Receptionist ID không hợp lệ' });
    }
    
    if (!bookingData.numberOfGuest || !Number.isInteger(bookingData.numberOfGuest) || bookingData.numberOfGuest < 1) {
      errors.push({ field: 'numberOfGuest', message: 'Số khách phải lớn hơn 0' });
    }
    
    if (bookingData.numberOfGuest > 50) {
      errors.push({ field: 'numberOfGuest', message: 'Số khách không được vượt quá 50' });
    }
    
    // ✅ BookingType validation
    if (bookingData.bookingType !== 0) {
      errors.push({ field: 'bookingType', message: 'BookingType phải là 0 cho walk-in' });
    }
    
    // ✅ Guest info validation
    if (!bookingData.guestID && !bookingData.walkInGuestPhoneNumber) {
      errors.push({ field: 'guestInfo', message: 'Cần có guestID hoặc walkInGuestPhoneNumber' });
    }
    
    // ✅ Phone validation
    if (bookingData.walkInGuestPhoneNumber) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(bookingData.walkInGuestPhoneNumber.replace(/\s/g, ''))) {
        errors.push({ field: 'walkInGuestPhoneNumber', message: 'Số điện thoại không hợp lệ' });
      }
    }
    
    // ✅ ENHANCED: requestedRoomTypes validation với debug detail
    if (bookingData.requestedRoomTypes && Array.isArray(bookingData.requestedRoomTypes)) {
      console.log('🏨 Validating requested room types...');
      
      for (let i = 0; i < bookingData.requestedRoomTypes.length; i++) {
        const roomType = bookingData.requestedRoomTypes[i];
        
        console.log(`🔍 Validating roomType[${i}]:`, {
          roomTypeId: roomType.roomTypeId,
          roomTypeIdType: typeof roomType.roomTypeId,
          quantity: roomType.quantity,
          quantityType: typeof roomType.quantity,
          isRoomTypeIdInteger: Number.isInteger(roomType.roomTypeId),
          isQuantityInteger: Number.isInteger(roomType.quantity)
        });
        
        // ✅ SỬA: Cố gắng parse nếu là string
        let roomTypeId = roomType.roomTypeId;
        if (typeof roomTypeId === 'string') {
          roomTypeId = parseInt(roomTypeId);
          console.log(`🔧 Parsed roomTypeId from string: ${roomType.roomTypeId} -> ${roomTypeId}`);
        }
        
        if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
          errors.push({ 
            field: `requestedRoomTypes[${i}].roomTypeId`, 
            message: `Room Type ID không hợp lệ: ${roomType.roomTypeId} (type: ${typeof roomType.roomTypeId})` 
          });
        }
        
        let quantity = roomType.quantity;
        if (typeof quantity === 'string') {
          quantity = parseInt(quantity);
          console.log(`🔧 Parsed quantity from string: ${roomType.quantity} -> ${quantity}`);
        }
        
        if (!Number.isInteger(quantity) || quantity <= 0) {
          errors.push({ 
            field: `requestedRoomTypes[${i}].quantity`, 
            message: `Số lượng phòng phải lớn hơn 0: ${roomType.quantity} (type: ${typeof roomType.quantity})` 
          });
        }
        
        if (quantity > 10) {
          errors.push({ 
            field: `requestedRoomTypes[${i}].quantity`, 
            message: 'Số lượng phòng không được vượt quá 10' 
          });
        }
      }
    } else {
      console.log('ℹ️ No room types provided - this is OK for walk-in booking creation step');
    }
    
    // ✅ OPTIONAL: Date validations
    if (bookingData.checkInDate) {
      const checkInDate = new Date(bookingData.checkInDate);
      if (isNaN(checkInDate.getTime())) {
        errors.push({ field: 'checkInDate', message: 'Check-in date không hợp lệ' });
      }
    }
    
    if (bookingData.checkOutDate) {
      const checkOutDate = new Date(bookingData.checkOutDate);
      if (isNaN(checkOutDate.getTime())) {
        errors.push({ field: 'checkOutDate', message: 'Check-out date không hợp lệ' });
      }
    }
    
    if (bookingData.checkInDate && bookingData.checkOutDate) {
      const checkInDate = new Date(bookingData.checkInDate);
      const checkOutDate = new Date(bookingData.checkOutDate);
      if (checkInDate >= checkOutDate) {
        errors.push({ field: 'dateRange', message: 'Check-out phải sau check-in' });
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
      receptionistID: bookingData.receptionistID,
      numberOfGuest: bookingData.numberOfGuest,
      specialRequest: bookingData.specialRequest || null,
      bookingType: 0, 
      guestID: bookingData.guestID || null,
      walkInGuestPhoneNumber: bookingData.walkInGuestPhoneNumber || null,
      bookingStatus: 'Pending',
      ...(bookingData.checkInDate && { checkInDate: bookingData.checkInDate }),
      ...(bookingData.checkOutDate && { checkOutDate: bookingData.checkOutDate }),
      requestedRoomTypes: bookingData.requestedRoomTypes || [],
      selectedServices: bookingData.selectedServices || [],
      selectedPromotions: bookingData.selectedPromotions || []
    } : null
  };
};

// ✅ Helper function để validate room assignment (nếu chưa có)
const validateRoomAssignment = async (bookingID, selectedRooms) => {
  const errors = [];
  
  try {
    console.log(`🔍 Validating room assignment for booking ${bookingID}:`, selectedRooms);
    
    // ✅ Validate input data
    if (!Array.isArray(selectedRooms) || selectedRooms.length === 0) {
      errors.push({ field: 'selectedRooms', message: 'Danh sách phòng không hợp lệ hoặc rỗng' });
      return { isValid: false, errors };
    }
    
    // ✅ Validate each selected room
    for (let i = 0; i < selectedRooms.length; i++) {
      const room = selectedRooms[i];
      console.log(`🔍 Validating room ${i + 1}:`, room);
      
      // ✅ Check room object structure
      if (!room || typeof room !== 'object') {
        errors.push({ 
          field: 'roomStructure', 
          message: `Phòng thứ ${i + 1}: Dữ liệu phòng không hợp lệ` 
        });
        continue;
      }
      
      // ✅ Check RoomID vs roomID (case sensitivity)
      const roomId = room.RoomID || room.roomID;
      if (!roomId) {
        errors.push({ 
          field: 'roomID', 
          message: `Phòng thứ ${i + 1}: Thiếu Room ID` 
        });
        continue;
      }
      
      console.log(`🔍 Checking room ID: ${roomId}`);
      
      // ✅ Check if room exists and is available
      try {
        const roomInfo = await roomDB.getById(roomId);
        console.log(`📄 Room info for ID ${roomId}:`, roomInfo);
        
        if (!roomInfo) {
          errors.push({ 
            field: 'roomExists', 
            message: `Phòng ID ${roomId} không tồn tại trong hệ thống` 
          });
          continue;
        }
        
        // ✅ Check room status
        const roomStatus = roomInfo.Status?.toLowerCase();
        console.log(`📊 Room ${roomId} status: ${roomStatus}`);
        
        if (roomStatus !== 'available' && roomStatus !== 'trống' && roomStatus !== 'còn trống') {
          errors.push({ 
            field: 'roomStatus', 
            message: `Phòng ${roomInfo.RoomNumber} không có sẵn (Trạng thái: ${roomInfo.Status})` 
          });
          continue;
        }
        
        // ✅ Check if room is already assigned to another active booking
        console.log(`🔍 Checking existing assignment for room ${roomId}`);
        
        try {
          const existingAssignment = await bookingRoomDB.getByRoomId(roomId);
          console.log(`📋 Existing assignment for room ${roomId}:`, existingAssignment);
          
          if (existingAssignment && existingAssignment.success && existingAssignment.data) {
            const assignedBookingID = existingAssignment.data.bookingID;
            
            // ✅ Only check if it's assigned to a different booking
            if (assignedBookingID && assignedBookingID !== bookingID) {
              console.log(`⚠️ Room ${roomId} is assigned to booking ${assignedBookingID}, checking status...`);
              
              try {
                const existingBooking = await bookingDB.getBookingById(assignedBookingID);
                console.log(`📋 Existing booking ${assignedBookingID} status:`, existingBooking?.data?.bookingStatus);
                
                if (existingBooking && existingBooking.success && existingBooking.data) {
                  const bookingStatus = existingBooking.data.bookingStatus;
                  
                  // ✅ Check if the existing booking is still active
                  if (!['Cancelled', 'No-Show', 'Completed'].includes(bookingStatus)) {
                    errors.push({ 
                      field: 'roomConflict', 
                      message: `Phòng ${roomInfo.RoomNumber} đã được gán cho booking ${assignedBookingID} (${bookingStatus})` 
                    });
                    continue;
                  } else {
                    console.log(`✅ Room ${roomId} conflict resolved - existing booking is ${bookingStatus}`);
                  }
                }
              } catch (bookingCheckError) {
                console.error(`❌ Error checking existing booking ${assignedBookingID}:`, bookingCheckError);
                console.log(`⚠️ Warning: Could not verify status of booking ${assignedBookingID}, proceeding...`);
              }
            }
          }
        } catch (assignmentCheckError) {
          console.error(`❌ Error checking room assignment for ${roomId}:`, assignmentCheckError);
          console.log(`⚠️ Warning: Could not verify existing assignments for room ${roomId}, proceeding...`);
        }
        
        // ✅ Validate price per night if provided
        if (room.pricePerNight !== undefined) {
          const pricePerNight = parseFloat(room.pricePerNight);
          if (isNaN(pricePerNight) || pricePerNight < 0) {
            errors.push({ 
              field: 'pricePerNight', 
              message: `Phòng ${roomInfo.RoomNumber}: Giá phòng không hợp lệ (${room.pricePerNight})` 
            });
            continue;
          }
          
          // ✅ Warn if price is significantly different from room's current price
          if (roomInfo.CurrentPrice && Math.abs(pricePerNight - roomInfo.CurrentPrice) > roomInfo.CurrentPrice * 0.1) {
            console.log(`⚠️ Warning: Price mismatch for room ${roomId}. Provided: ${pricePerNight}, Current: ${roomInfo.CurrentPrice}`);
          }
        }
        
        console.log(`✅ Room ${roomId} passed validation`);
        
      } catch (roomCheckError) {
        console.error(`❌ Error checking room ${roomId}:`, roomCheckError);
        errors.push({ 
          field: 'roomCheck', 
          message: `Lỗi khi kiểm tra phòng ${roomId}: ${roomCheckError.message}` 
        });
        continue;
      }
    }
    
    console.log(`✅ Room assignment validation completed. Total errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log(`❌ Validation errors:`, errors);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedRooms: selectedRooms.length,
      checkedRooms: selectedRooms.length - errors.length
    };
    
  } catch (error) {
    console.error('❌ Critical error in validateRoomAssignment:', error);
    return {
      isValid: false,
      errors: [{ 
        field: 'general', 
        message: 'Lỗi hệ thống khi validate room assignment: ' + error.message 
      }]
    };
  }
};

// ✅ THÊM: POST /api/bookings/walk-in - Enhanced promotion handling
router.post('/walk-in', async (req, res) => {
    try {
        const {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            specialRequest,
            receptionistID,
            selectedRooms = [],
            selectedServices = [],
            selectedPromotions = [] // ✅ Đảm bảo nhận được promotions
        } = req.body;

        console.log('🚶‍♂️ Creating walk-in booking with items:', {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            roomsCount: selectedRooms.length,
            servicesCount: selectedServices.length,
            promotionsCount: selectedPromotions.length,
            // ✅ THÊM: Enhanced promotion debugging
            promotionsData: selectedPromotions,
            hasPromotionData: selectedPromotions.length > 0,
            firstPromotion: selectedPromotions[0]
        });

        // ✅ Step 1: Validate booking data
        const validation = await validateWalkInBookingData(req.body);
        if (!validation.isValid) {
            return sendResponse(res, 400, false, 'Dữ liệu booking không hợp lệ', null, validation.errors);
        }

        // ✅ Step 2: Create booking
        const bookingData = {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            specialRequest,
            receptionistID,
            bookingStatus: 'Pending'
        };

        const bookingResult = await bookingDB.createWalkInBooking(bookingData);
        if (!bookingResult.success) {
            return sendResponse(res, 500, false, 'Lỗi khi tạo booking', null, [{ message: bookingResult.message }]);
        }

        const bookingID = bookingResult.bookingID;
        console.log('✅ Booking created with ID:', bookingID);

        // ✅ Step 3: Add services if any
        let servicesResult = { success: true, data: [] };
        if (selectedServices && selectedServices.length > 0) {
            console.log('🛎️ Adding services to booking...');
            servicesResult = await bookingServiceDB.createMultiple(bookingID, selectedServices);
            
            if (servicesResult.success) {
                console.log(`✅ Added ${servicesResult.data?.length || 0} services to booking`);
            } else {
                console.warn('⚠️ Failed to add some/all services:', servicesResult.message);
            }
        }

        // ✅ Step 4: Add promotions if any - ENHANCED LOGGING
        let promotionsResult = { success: true, data: [] };
        if (selectedPromotions && selectedPromotions.length > 0) {
            console.log('🏷️ Adding promotions to booking...', {
                promotionsToAdd: selectedPromotions.length,
                promotionDetails: selectedPromotions.map(p => ({
                    promotionID: p.promotionID,
                    promotionName: p.promotionName,
                    discountPercent: p.discountPercent
                }))
            });
            
            promotionsResult = await bookingPromotionDB.createMultiple(bookingID, selectedPromotions);
            
            if (promotionsResult.success) {
                console.log(`✅ Added ${promotionsResult.data?.length || 0} promotions to booking`);
            } else {
                console.warn('⚠️ Failed to add some/all promotions:', promotionsResult.message);
            }
        } else {
            console.log('ℹ️ No promotions to add to booking');
        }

        // ✅ Step 5: Assign rooms if any
        let roomAssignmentResult = { success: true, data: [] };
        if (selectedRooms && selectedRooms.length > 0) {
            console.log('🏨 Assigning rooms to booking...');
            roomAssignmentResult = await bookingRoomDB.assignRoomsToBooking(bookingID, selectedRooms);
            
            if (roomAssignmentResult.success) {
                console.log(`✅ Assigned ${selectedRooms.length} rooms to booking`);
                
                // ✅ Update booking status to Confirmed if rooms assigned
                await bookingDB.updateBookingStatus(bookingID, 'Confirmed');
            }
        }

        console.log('✅ Walk-in booking completed:', {
            bookingID,
            servicesAdded: servicesResult.data?.length || 0,
            promotionsAdded: promotionsResult.data?.length || 0,
            roomsAssigned: roomAssignmentResult.assignedRooms?.length || 0,
            finalStatus: selectedRooms.length > 0 ? 'Confirmed' : 'Pending'
        });

        // ✅ Return comprehensive result
        res.status(201).json({
            success: true,
            message: 'Tạo walk-in booking thành công với tất cả items',
            data: {
                bookingID: bookingID,
                bookingStatus: selectedRooms.length > 0 ? 'Confirmed' : 'Pending',
                itemsSummary: {
                    servicesAdded: servicesResult.data?.length || 0,
                    promotionsAdded: promotionsResult.data?.length || 0,
                    roomsAssigned: roomAssignmentResult.assignedRooms?.length || 0
                },
                results: {
                    booking: bookingResult,
                    services: servicesResult,
                    promotions: promotionsResult,
                    roomAssignment: roomAssignmentResult
                },
                nextSteps: selectedRooms.length === 0 ? [
                    'Assign rooms using /api/bookings/:id/assign-rooms',
                    'Create invoice using /api/invoices/create-for-booking'
                ] : [
                    'Create invoice using /api/invoices/create-for-booking'
                ]
            }
        });

    } catch (error) {
        console.error('❌ Error in walk-in booking creation:', error);
        return handleError(res, error, 'Lỗi khi tạo walk-in booking');
    }
});

// ✅ THÊM: POST /api/bookings/walk-in - Đảm bảo response format nhất quán
router.post('/walk-in', async (req, res) => {
  try {
    const {
      guestID,
      walkInGuestPhoneNumber,
      numberOfGuest,
      specialRequest,
      checkInDate,
      checkOutDate,
      receptionistID,
      requestedRoomTypes = [],
      selectedServices = [],
      selectedPromotions = []
    } = req.body;

    console.log('🚶‍♂️ Creating walk-in booking with items:', {
      guestID,
      walkInGuestPhoneNumber,
      numberOfGuest,
      roomsCount: requestedRoomTypes.length,
      servicesCount: selectedServices.length,
      promotionsCount: selectedPromotions.length,
      promotionsData: selectedPromotions,
      hasPromotionData: selectedPromotions.length > 0,
      firstPromotion: selectedPromotions[0] || null
    });

    // Enhanced validation
    const validationResult = await validateWalkInBookingData({
      guestID,
      walkInGuestPhoneNumber,
      numberOfGuest,
      specialRequest,
      checkInDate,
      checkOutDate,
      receptionistID,
      bookingType: 0,
      requestedRoomTypes,
      selectedServices,
      selectedPromotions
    });

    if (!validationResult.isValid) {
      console.log('❌ Validation errors found:', validationResult.errors);
      return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validationResult.errors);
    }

    // Step 1: Create booking
    const bookingResult = await bookingDB.createWalkInBooking(validationResult.validatedData);
    
    if (!bookingResult.success) {
      return sendResponse(res, 500, false, bookingResult.message, null, { error: bookingResult.error });
    }

    const bookingID = bookingResult.bookingID;
    console.log('✅ Booking created with ID:', bookingID);

    // Step 2: Add services
    let servicesAdded = 0;
    if (selectedServices.length > 0) {
      console.log('🛎️ Adding services to booking...');
      const servicesResult = await bookingServiceDB.createMultiple(bookingID, selectedServices);
      if (servicesResult.success) {
        servicesAdded = servicesResult.data.length;
        console.log('✅ Added', servicesAdded, 'services to booking');
      }
    }

    // Step 3: Add promotions
    let promotionsAdded = 0;
    if (selectedPromotions.length > 0) {
      console.log('🏷️ Adding promotions to booking...', {
        promotionsToAdd: selectedPromotions.length,
        promotionDetails: selectedPromotions.map(p => ({
          promotionID: p.promotionID,
          promotionName: p.promotionName,
          discountPercent: p.discountPercent
        }))
      });
      
      const promotionsResult = await bookingPromotionDB.createMultiple(bookingID, selectedPromotions);
      if (promotionsResult.success) {
        promotionsAdded = promotionsResult.data.length;
        console.log('✅ Added', promotionsAdded, 'promotions to booking');
      }
    }

    // ✅ FIX: Response format chuẩn với bookingID rõ ràng
    const responseData = {
      bookingID: bookingID,           // ✅ QUAN TRỌNG: bookingID ở top level
      servicesAdded,
      promotionsAdded,
      roomsAssigned: 0,
      finalStatus: 'Pending',
      
      // ✅ THÊM: Detailed booking info
      bookingInfo: {
        bookingID: bookingID,
        guestID,
        walkInGuestPhoneNumber,
        numberOfGuest,
        specialRequest,
        checkInDate,
        checkOutDate,
        receptionistID,
        bookingStatus: 'Pending',
        createdAt: new Date().toISOString()
      },
      
      // ✅ THÊM: Items info
      items: {
        services: selectedServices,
        promotions: selectedPromotions,
        roomTypes: requestedRoomTypes
      }
    };

    console.log('✅ Walk-in booking completed:', {
      bookingID,
      servicesAdded,
      promotionsAdded,
      roomsAssigned: 0,
      finalStatus: 'Pending'
    });

    // ✅ FIX: Sử dụng sendResponse với format nhất quán
    sendResponse(res, 201, true, 'Walk-in booking tạo thành công', responseData);

  } catch (error) {
    console.error('❌ Error creating walk-in booking:', error);
    sendResponse(res, 500, false, 'Lỗi khi tạo walk-in booking', null, { 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ THÊM: POST /api/bookings/walk-in - Đảm bảo lưu đầy đủ tất cả items
router.post('/walk-in', async (req, res) => {
    try {
        const {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            specialRequest,
            receptionistID,
            selectedRooms = [],
            selectedServices = [],
            selectedPromotions = []
        } = req.body;

        console.log('🚶‍♂️ Creating walk-in booking with items:', {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            roomsCount: selectedRooms.length,
            servicesCount: selectedServices.length,
            promotionsCount: selectedPromotions.length
        });

        // ✅ Step 1: Validate booking data
        const validation = await validateWalkInBookingData(req.body);
        if (!validation.isValid) {
            return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validation.errors);
        }

        // ✅ Step 2: Create booking
        const bookingData = {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            specialRequest,
            receptionistID,
            bookingStatus: 'Pending'
        };

        const bookingResult = await bookingDB.createWalkInBooking(bookingData);
        if (!bookingResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi tạo booking: ' + bookingResult.message
            });
        }

        const bookingID = bookingResult.bookingID;
        console.log('✅ Booking created with ID:', bookingID);

        // ✅ Step 3: Add services if any - SỬ DỤNG DBContext
        let servicesResult = { success: true, data: [] };
        if (selectedServices && selectedServices.length > 0) {
            console.log('🛎️ Adding services to booking...');
            servicesResult = await bookingServiceDB.createMultiple(bookingID, selectedServices);
            if (!servicesResult.success) {
                console.error('⚠️ Warning: Failed to add services:', servicesResult.message);
                // ✅ Không return error, chỉ log warning
            } else {
                console.log(`✅ Added ${servicesResult.data.length} services to booking`);
            }
        }

        // ✅ Step 4: Add promotions if any - SỬ DỤNG DBContext
        let promotionsResult = { success: true, data: [] };
        if (selectedPromotions && selectedPromotions.length > 0) {
            console.log('🎯 Adding promotions to booking...');
            promotionsResult = await bookingPromotionDB.createMultiple(bookingID, selectedPromotions);
            if (!promotionsResult.success) {
                console.error('⚠️ Warning: Failed to add promotions:', promotionsResult.message);
                // ✅ Không return error, chỉ log warning
            } else {
                console.log(`✅ Added ${promotionsResult.data.length} promotions to booking`);
            }
        }

        // ✅ Step 5: Assign rooms if any - SỬ DỤNG DBContext
        let roomAssignmentResult = { success: true, data: [] };
        if (selectedRooms && selectedRooms.length > 0) {
            console.log('🏨 Assigning rooms to booking...');
            roomAssignmentResult = await bookingRoomDB.assignRoomsToBooking(bookingID, selectedRooms);
            if (!roomAssignmentResult.success) {
                console.error('⚠️ Warning: Failed to assign rooms:', roomAssignmentResult.message);
            } else {
                console.log(`✅ Assigned ${selectedRooms.length} rooms to booking`);
                
                // ✅ Update booking status to Confirmed if rooms assigned
                await bookingDB.updateBookingStatus(bookingID, 'Confirmed');
            }
        }

        console.log('✅ Walk-in booking completed:', {
            bookingID,
            servicesAdded: servicesResult.data?.length || 0,
            promotionsAdded: promotionsResult.data?.length || 0,
            roomsAssigned: roomAssignmentResult.assignedRooms?.length || 0,
            finalStatus: selectedRooms.length > 0 ? 'Confirmed' : 'Pending'
        });

        // ✅ Return comprehensive result
        res.status(201).json({
            success: true,
            message: 'Tạo walk-in booking thành công với tất cả items',
            data: {
                bookingID: bookingID,
                bookingStatus: selectedRooms.length > 0 ? 'Confirmed' : 'Pending',
                itemsAdded: {
                    services: servicesResult.data?.length || 0,
                    promotions: promotionsResult.data?.length || 0,
                    rooms: roomAssignmentResult.assignedRooms?.length || 0
                },
                warnings: [
                    ...(servicesResult.success ? [] : [`Services: ${servicesResult.message}`]),
                    ...(promotionsResult.success ? [] : [`Promotions: ${promotionsResult.message}`]),
                    ...(roomAssignmentResult.success ? [] : [`Rooms: ${roomAssignmentResult.message}`])
                ],
                nextStep: selectedRooms.length > 0 ? 'payment' : 'room-assignment'
            }
        });

    } catch (error) {
        console.error('❌ Error creating walk-in booking:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo walk-in booking',
            error: error.message
        });
    }
});

// ✅ THÊM: Step 2 - Assign specific rooms to booking
router.post('/:id/assign-rooms', async (req, res) => {
    try {
        const bookingID = parseInt(req.params.id);
        const { selectedRooms = [] } = req.body;

        console.log('🏨 Assigning rooms to booking (Step 2):', {
            bookingID,
            roomsToAssign: selectedRooms.length
        });

        if (isNaN(bookingID) || bookingID <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID không hợp lệ'
            });
        }

        if (!selectedRooms || selectedRooms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Phải chọn ít nhất 1 phòng để gán'
            });
        }

        // ✅ Check booking exists and is in correct status
        const bookingResult = await bookingDB.getBookingById(bookingID);
        if (!bookingResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy booking'
            });
        }

        // ✅ Assign rooms to booking
        const roomAssignmentResult = await bookingRoomDB.assignRoomsToBooking(bookingID, selectedRooms);
        if (!roomAssignmentResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi gán phòng: ' + roomAssignmentResult.message
            });
        }

        // ✅ Update booking status to Confirmed after room assignment
        const statusUpdateResult = await bookingDB.updateBookingStatus(bookingID, 'Confirmed');
        if (!statusUpdateResult.success) {
            console.error('⚠️ Warning: Failed to update booking status to Confirmed');
        }

        console.log('✅ Room assignment (Step 2) completed:', {
            bookingID,
            roomsAssigned: roomAssignmentResult.assignedRooms,
            bookingStatus: 'Confirmed'
        });

        res.json({
            success: true,
            message: 'Gán phòng thành công',
            data: {
                bookingID: bookingID,
                roomsAssigned: roomAssignmentResult.assignedRooms,
                bookingStatus: 'Confirmed',
                readyForPayment: true
            },
            nextStep: {
                action: 'payment',
                message: 'Booking đã sẵn sàng cho thanh toán'
            }
        });

    } catch (error) {
        console.error('❌ Error assigning rooms (Step 2):', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi gán phòng',
            error: error.message
        });
    }
});

// ✅ THÊM: POST /api/bookings/:id/payment - Process payment (Placeholder)
router.post('/:id/payment', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    const { paymentAmount, paymentMethod = 'cash', paymentType = 'deposit' } = req.body;
    
    console.log(`💰 Processing payment for booking ${bookingID}:`, {
      amount: paymentAmount,
      method: paymentMethod,
      type: paymentType
    });
    
    if (isNaN(bookingID) || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }
    
    if (!paymentAmount || paymentAmount <= 0) {
      return sendResponse(res, 400, false, 'Số tiền thanh toán không hợp lệ');
    }
    
    // Check if booking exists and is in correct status
    const existingBooking = await bookingDB.getBookingById(bookingID);
    
    if (!existingBooking.success) {
      return sendResponse(res, 404, false, 'Không tìm thấy booking');
    }
    
    if (existingBooking.data.bookingStatus !== 'Confirmed') {
      return sendResponse(res, 400, false, 
        `Booking phải ở trạng thái Confirmed để thanh toán. Hiện tại: ${existingBooking.data.bookingStatus}`);
    }
    
    // ✅ PLACEHOLDER: Payment processing logic
    console.log('🔄 [PLACEHOLDER] Processing payment...');
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ✅ PLACEHOLDER: Update booking status to Paid
    const statusUpdate = await bookingDB.updateBookingStatus(bookingID, 'Paid');
    
    if (!statusUpdate.success) {
      return sendResponse(res, 500, false, 'Lỗi khi cập nhật trạng thái booking sau thanh toán');
    }
    
    console.log(`✅ Payment processed successfully for booking ${bookingID}`);
    
    sendResponse(res, 200, true, 'Thanh toán thành công', {
      bookingID,
      paymentAmount,
      paymentMethod,
      paymentType,
      newBookingStatus: 'Paid',
      paymentID: `PAY_${bookingID}_${Date.now()}`, // ✅ PLACEHOLDER payment ID
      nextSteps: {
        checkInRequired: true,
        message: 'Có thể thực hiện check-in khi khách đến'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error processing payment:`, error);
    handleError(res, error, 'Lỗi khi xử lý thanh toán');
  }
});

// ✅ THÊM: POST /api/bookings/:id/checkin - Process check-in (Placeholder)
router.post('/:id/checkin', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    const { actualCheckInTime, guestCount, specialNotes } = req.body;
    
    console.log(`🏨 Processing check-in for booking ${bookingID}:`, {
      checkInTime: actualCheckInTime || 'now',
      guests: guestCount,
      notes: specialNotes
    });
    
    if (isNaN(bookingID) || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }
    
    // Check if booking exists and is in correct status
    const existingBooking = await bookingDB.getBookingById(bookingID);
    
    if (!existingBooking.success) {
      return sendResponse(res, 404, false, 'Không tìm thấy booking');
    }
    
    if (existingBooking.data.bookingStatus !== 'Paid') {
      return sendResponse(res, 400, false, 
        `Booking phải đã thanh toán để check-in. Hiện tại: ${existingBooking.data.bookingStatus}`);
    }
    
    // ✅ PLACEHOLDER: Check-in processing logic
    console.log('🔄 [PLACEHOLDER] Processing check-in...');
    
    // Get assigned rooms
    const roomsResult = await bookingRoomDB.getByBookingId(bookingID);
    if (!roomsResult.success || !roomsResult.data.length) {
      return sendResponse(res, 400, false, 'Không tìm thấy phòng được gán cho booking này');
    }
    
    // ✅ Update room statuses to "occupied" (đang sử dụng)
    const roomStatusUpdates = [];
    for (const bookingRoom of roomsResult.data) {
      try {
        console.log(`🔄 Updating room ${bookingRoom.roomID} status to occupied...`);
        const updateResult = await roomDB.updateStatus(bookingRoom.roomID, 'occupied');
        roomStatusUpdates.push({
          roomId: bookingRoom.roomID,
          success: updateResult,
          status: updateResult ? 'occupied' : 'failed',
          statusText: updateResult ? 'Đang sử dụng' : 'Lỗi cập nhật'
        });
        
        if (updateResult) {
          console.log(`✅ Updated room ${bookingRoom.roomID} status to occupied (đang sử dụng)`);
        }
      } catch (statusError) {
        console.warn(`⚠️ Failed to update room ${bookingRoom.roomID} status:`, statusError);
        roomStatusUpdates.push({
          roomId: bookingRoom.roomID,
          success: false,
          error: statusError.message
        });
      }
    }
    
    // ✅ Update booking status to CheckedIn
    const statusUpdate = await bookingDB.updateBookingStatus(bookingID, 'CheckedIn');
    
    if (!statusUpdate.success) {
      return sendResponse(res, 500, false, 'Lỗi khi cập nhật trạng thái booking sau check-in');
    }
    
    console.log(`✅ Check-in processed successfully for booking ${bookingID}`);
    
    sendResponse(res, 200, true, 'Check-in thành công', {
      bookingID,
      checkInTime: actualCheckInTime || new Date().toISOString(),
      guestCount: guestCount || existingBooking.data.numberOfGuest,
      newBookingStatus: 'CheckedIn',
      roomStatus: 'occupied',
      assignedRooms: roomsResult.data.map(r => ({
        roomID: r.roomID,
        roomNumber: r.roomInfo?.roomNumber,
        status: 'occupied'
      })),
      roomStatusUpdates,
      specialNotes,
      checkInID: `CHK_${bookingID}_${Date.now()}`, // ✅ PLACEHOLDER check-in ID
      nextSteps: {
        message: 'Khách đã check-in thành công. Phòng đang được sử dụng.'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error processing check-in:`, error);
    handleError(res, error, 'Lỗi khi xử lý check-in');
  }
});

// ✅ THÊM: GET /api/bookings/:id/status - Get booking status and next actions
router.get('/:id/status', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    
    if (isNaN(bookingID) || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }
    
    // Get booking details
    const bookingResult = await bookingDB.getBookingById(bookingID);
    
    if (!bookingResult.success) {
      return sendResponse(res, 404, false, 'Không tìm thấy booking');
    }
    
    const booking = bookingResult.data;
    
    // Get assigned rooms
    const roomsResult = await bookingRoomDB.getByBookingId(bookingID);
    const assignedRooms = roomsResult.success ? roomsResult.data : [];
    
    // Determine next actions based on status
    let nextActions = [];
    let statusInfo = {};
    
    switch (booking.bookingStatus) {
      case 'Pending':
        nextActions = ['assign-rooms'];
        statusInfo = {
          message: 'Cần gán phòng cụ thể cho booking',
          icon: 'fa-clock',
          color: '#ffc107'
        };
        break;
        
      case 'Confirmed':
        nextActions = ['payment'];
        statusInfo = {
          message: 'Cần thanh toán tiền cọc',
          icon: 'fa-credit-card',
          color: '#17a2b8'
        };
        break;
        
      case 'Paid':
        nextActions = ['checkin'];
        statusInfo = {
          message: 'Sẵn sàng check-in',
          icon: 'fa-key',
          color: '#28a745'
        };
        break;
        
      case 'CheckedIn':
        nextActions = ['checkout']; // ✅ PLACEHOLDER cho tương lai
        statusInfo = {
          message: 'Khách đang lưu trú',
          icon: 'fa-home',
          color: '#007bff'
        };
        break;
        
      default:
        statusInfo = {
          message: 'Trạng thái không xác định',
          icon: 'fa-question',
          color: '#6c757d'
        };
    }
    
    sendResponse(res, 200, true, 'Lấy trạng thái booking thành công', {
      bookingID,
      currentStatus: booking.bookingStatus,
      statusInfo,
      nextActions,
      assignedRooms: assignedRooms.map(r => ({
        roomID: r.roomID,
        roomNumber: r.roomInfo?.roomNumber,
        checkInAt: r.checkInAt,
        checkOutAt: r.checkOutAt
      })),
      guest: {
        name: booking.guestName,
        phone: booking.walkInGuestPhoneNumber,
        email: booking.guestEmail
      },
      bookingDetails: {
        numberOfGuest: booking.numberOfGuest,
        specialRequest: booking.specialRequest,
        createAt: booking.createAt
      }
    });
    
  } catch (error) {
    console.error(`❌ Error getting booking status:`, error);
    handleError(res, error, 'Lỗi khi lấy trạng thái booking');
  }
});

// ✅ THÊM: POST /api/bookings/:id/status - Update booking status
router.post('/:id/status', async (req, res) => {
  try {
    const bookingID = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(bookingID) || bookingID <= 0) {
      return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
    }
    
    if (!status) {
      return sendResponse(res, 400, false, 'Status là bắt buộc');
    }
    
    // Validate status values
    const validStatuses = ['Pending', 'Confirmed', 'Paid', 'CheckedIn', 'CheckedOut', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, false, 'Status không hợp lệ', null, {
        validStatuses
      });
    }
    
    // Check if booking exists
    const bookingResult = await bookingDB.getBookingById(bookingID);
    if (!bookingResult.success) {
      return sendResponse(res, 404, false, 'Không tìm thấy booking');
    }
    
    const currentBooking = bookingResult.data;
    
    // Validate status transition
    const validTransitions = {
      'Pending': ['Confirmed', 'Cancelled'],
      'Confirmed': ['Paid', 'Cancelled'],
      'Paid': ['CheckedIn', 'Cancelled'],
      'CheckedIn': ['CheckedOut'],
      'CheckedOut': [], // Final state
      'Cancelled': [] // Final state
    };
    
    const allowedNextStatuses = validTransitions[currentBooking.bookingStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      return sendResponse(res, 400, false, 
        `Không thể chuyển từ trạng thái "${currentBooking.bookingStatus}" sang "${status}"`, 
        null, {
          currentStatus: currentBooking.bookingStatus,
          allowedNextStatuses
        }
      );
    }
    
    // Update booking status
    const updateResult = await bookingDB.updateBookingStatus(bookingID, status);
    
    if (!updateResult.success) {
      return sendResponse(res, 500, false, 'Lỗi khi cập nhật trạng thái booking', null, {
        error: updateResult.error
      });
    }
    
    // Get updated booking details
    const updatedBookingResult = await bookingDB.getBookingById(bookingID);
    
    sendResponse(res, 200, true, `Cập nhật trạng thái booking thành công từ "${currentBooking.bookingStatus}" sang "${status}"`, {
      bookingID,
      oldStatus: currentBooking.bookingStatus,
      newStatus: status,
      updatedAt: new Date(),
      booking: updatedBookingResult.success ? updatedBookingResult.data : null
    });
    
  } catch (error) {
    console.error(`❌ Error updating booking status:`, error);
    handleError(res, error, 'Lỗi khi cập nhật trạng thái booking');
  }
});

// ✅ CREATE WALK-IN BOOKING WITH ROOM ASSIGNMENT
router.post('/create-walkin', async (req, res) => {
    try {
        const {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            specialRequest,
            receptionistID,
            selectedRooms = [],
            selectedServices = [],
            selectedPromotions = []
        } = req.body;

        console.log('🚶‍♂️ Creating walk-in booking with data:', {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            roomsCount: selectedRooms.length,
            servicesCount: selectedServices.length,
            promotionsCount: selectedPromotions.length
        });

        // Validation
        if (!guestID && !walkInGuestPhoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Cần có Guest ID hoặc số điện thoại khách'
            });
        }

        if (!numberOfGuest || numberOfGuest <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số khách phải lớn hơn 0'
            });
        }

        if (!receptionistID) {
            return res.status(400).json({
                success: false,
                message: 'Cần có Receptionist ID'
            });
        }

        if (!selectedRooms || selectedRooms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Phải chọn ít nhất 1 phòng'
            });
        }

        // Step 1: Create booking
        const bookingData = {
            guestID,
            walkInGuestPhoneNumber,
            numberOfGuest,
            specialRequest,
            receptionistID,
            bookingStatus: 'Confirmed'
        };

        const bookingResult = await bookingDB.createWalkInBooking(bookingData);
        if (!bookingResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi tạo booking: ' + bookingResult.message
            });
        }

        const bookingID = bookingResult.bookingID;
        console.log('✅ Booking created with ID:', bookingID);

        // Step 2: Assign rooms to booking
        const roomAssignmentResult = await bookingRoomDB.assignRoomsToBooking(bookingID, selectedRooms);
        if (!roomAssignmentResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi gán phòng: ' + roomAssignmentResult.message
            });
        }

        // Step 3: Add services if any
        let servicesResult = { success: true, data: [] };
        if (selectedServices && selectedServices.length > 0) {
            servicesResult = await bookingServiceDB.createMultiple(bookingID, selectedServices);
            if (!servicesResult.success) {
                console.error('⚠️ Warning: Failed to add services:', servicesResult.message);
            }
        }

        // Step 4: Add promotions if any
        let promotionsResult = { success: true, data: [] };
        if (selectedPromotions && selectedPromotions.length > 0) {
            promotionsResult = await bookingPromotionDB.createMultiple(bookingID, selectedPromotions);
            if (!promotionsResult.success) {
                console.error('⚠️ Warning: Failed to add promotions:', promotionsResult.message);
            }
        }

        // ✅ THÊM: Step 5: Create invoice automatically
        let invoiceInfo = null;
        try {
            const invoiceResult = await invoiceDB.createInvoiceForBooking(bookingID);
            
            if (invoiceResult.success) {
                invoiceInfo = {
                    InvoiceID: invoiceResult.invoiceId,
                    BookingID: bookingID,
                    TotalAmount: invoiceResult.totalAmount,
                    PaymentStatus: 'Pending'
                };
                console.log('✅ Invoice created with ID:', invoiceResult.invoiceId);
            } else {
                console.error('⚠️ Warning: Failed to create invoice:', invoiceResult.message);
            }
        } catch (invoiceError) {
            console.error('❌ Error creating invoice:', invoiceError);
        }

        // ✅ THÊM: Prepare booking data for payment page
        const bookingForPayment = {
            bookingID: bookingID,
            numberOfGuest: numberOfGuest,
            specialRequest: specialRequest,
            bookingAt: new Date(),
            selectedRooms: roomDetails,
            selectedServices: serviceDetails,
            selectedPromotions: promotionDetails,
            totalAmount: finalAmount,
            totalDiscount: totalDiscount,
            guestName: 'Walk-in Guest', // Will be updated with actual guest name
            receptionistID: receptionistID
        };

        console.log('✅ Walk-in booking created successfully:', {
            bookingID,
            roomsAssigned: roomAssignmentResult.assignedRooms,
            servicesAdded: servicesResult.data?.length || 0,
            promotionsAdded: promotionsResult.data?.length || 0,
            totalAmount: finalAmount,
            invoiceCreated: !!invoiceInfo
        });

        // ✅ THÊM: Return data with payment redirect flag
        res.status(201).json({
            success: true,
            message: 'Tạo walk-in booking thành công',
            data: {
                bookingID: bookingID,
                bookingStatus: 'Confirmed',
                roomsAssigned: roomAssignmentResult.assignedRooms,
                servicesAdded: servicesResult.data?.length || 0,
                promotionsAdded: promotionsResult.data?.length || 0,
                totalAmount: finalAmount,
                invoice: invoiceInfo
            },
            // ✅ THÊM: Payment redirect information
            paymentRedirect: {
                shouldRedirect: true,
                bookingData: bookingForPayment,
                invoiceData: invoiceInfo
            }
        });

    } catch (error) {
        console.error('❌ Error creating walk-in booking:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo walk-in booking',
            error: error.message
        });
    }
});

// ✅ THÊM: GET BOOKING FOR PAYMENT
router.get('/:id/payment-data', async (req, res) => {
    try {
        const bookingID = parseInt(req.params.id);

        if (isNaN(bookingID) || bookingID <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID không hợp lệ'
            });
        }

        console.log('💳 Getting payment data for booking:', bookingID);

        // Get booking details
        const bookingResult = await bookingDB.getBookingById(bookingID);
        if (!bookingResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy booking'
            });
        }

        // Get rooms
        const roomsResult = await bookingRoomDB.getByBookingId(bookingID);
        const selectedRooms = roomsResult.success ? roomsResult.data : [];

        // Get services
        const servicesResult = await bookingServiceDB.getByBookingId(bookingID);
        const selectedServices = servicesResult.success ? servicesResult.data : [];

        // Get promotions
        const promotionsResult = await bookingPromotionDB.getByBookingId(bookingID);
        const selectedPromotions = promotionsResult.success ? promotionsResult.data : [];

        // Calculate totals
        let totalAmount = 0;
        selectedRooms.forEach(room => {
            totalAmount += room.roomInfo?.currentPrice || 0;
        });
        selectedServices.forEach(service => {
            totalAmount += service.serviceInfo?.servicePrice || 0;
        });

        let totalDiscount = 0;
        selectedPromotions.forEach(promotion => {
            const discountPercent = promotion.promotionInfo?.discountPercent || 0;
            totalDiscount += totalAmount * (discountPercent / 100);
        });

        const finalAmount = Math.max(0, totalAmount - totalDiscount);

        // Check for existing invoice
        let invoiceData = null;
        try {
            // This is a placeholder - you might need to add a method to get invoice by booking ID
            // const invoiceResult = await invoiceDB.getByBookingId(bookingID);
            // if (invoiceResult.success) {
            //     invoiceData = invoiceResult.data;
            // }
        } catch (error) {
            console.log('No existing invoice found');
        }

        const paymentData = {
            bookingID: bookingID,
            numberOfGuest: bookingResult.data.numberOfGuest,
            specialRequest: bookingResult.data.specialRequest,
            bookingAt: bookingResult.data.bookingAt,
            selectedRooms: selectedRooms.map(room => ({
                RoomID: room.roomID,
                RoomNumber: room.roomInfo?.roomNumber || 'N/A',
                TypeName: room.roomInfo?.roomTypeName || 'Standard',
                CurrentPrice: room.roomInfo?.currentPrice || 0
            })),
            selectedServices: selectedServices.map(service => ({
                ServiceID: service.serviceID,
                ServiceName: service.serviceInfo?.serviceName || 'Unknown Service',
                Price: service.serviceInfo?.servicePrice || 0
            })),
            selectedPromotions: selectedPromotions.map(promotion => ({
                PromotionID: promotion.promotionID,
                PromotionName: promotion.promotionInfo?.promotionName || 'Unknown Promotion',
                DiscountPercent: promotion.promotionInfo?.discountPercent || 0
            })),
            totalAmount: finalAmount,
            totalDiscount: totalDiscount,
            guestName: bookingResult.data.guestName || 'Walk-in Guest',
            receptionistID: bookingResult.data.receptionistID
        };

        res.json({
            success: true,
            data: {
                bookingData: paymentData,
                invoiceData: invoiceData
            },
            message: 'Lấy dữ liệu thanh toán thành công'
        });

    } catch (error) {
        console.error('❌ Error getting payment data:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu thanh toán',
            error: error.message
        });
    }
});

// ✅ THÊM: Endpoint để kiểm tra booking với all related items
router.get('/:id/details', async (req, res) => {
    try {
        const bookingID = parseInt(req.params.id);
        
        if (isNaN(bookingID) || bookingID <= 0) {
            return sendResponse(res, 400, false, 'Booking ID không hợp lệ');
        }
        
        // Get booking
        const booking = await bookingDB.getBookingById(bookingID);
        if (!booking.success) {
            return sendResponse(res, 404, false, 'Không tìm thấy booking');
        }
        
        // Get related items using existing DBContexts
        const [rooms, services, promotions] = await Promise.all([
            bookingRoomDB.getByBookingId(bookingID),
            bookingServiceDB.getByBookingId(bookingID), 
            bookingPromotionDB.getByBookingId(bookingID)
        ]);
        
        sendResponse(res, 200, true, 'Lấy chi tiết booking thành công', {
            booking: booking.data,
            rooms: rooms.success ? rooms.data : [],
            services: services.success ? services.data : [],
            promotions: promotions.success ? promotions.data : [],
            summary: {
                totalRooms: rooms.success ? rooms.data.length : 0,
                totalServices: services.success ? services.data.length : 0,
                totalPromotions: promotions.success ? promotions.data.length : 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error getting booking details:', error);
        handleError(res, error, 'Lỗi khi lấy chi tiết booking');
    }
});

// ✅ THÊM: Enhanced error response
router.post('/walk-in', async (req, res) => {
  try {
    console.log('🚶‍♂️ Walk-in booking request received:', {
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const validation = await validateWalkInBookingData(req.body);
    
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validation.errors,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Validation passed, creating booking...');
    
    // ✅ THÊM: Kiểm tra guest tồn tại trước (BƯỚC QUAN TRỌNG)
    const { walkInGuestPhoneNumber } = req.body;
    console.log('🔍 Checking if guest exists:', walkInGuestPhoneNumber);
    
    const guestExists = await guestDB.getGuestByPhoneNumber(walkInGuestPhoneNumber);
    if (!guestExists.success) {
      console.error('❌ Guest not found in database:', walkInGuestPhoneNumber);
      return sendResponse(res, 400, false, 
        `Khách hàng với số điện thoại ${walkInGuestPhoneNumber} chưa tồn tại. Vui lòng tạo thông tin khách hàng trước.`,
        null, 
        [{ field: 'walkInGuestPhoneNumber', message: 'Guest not found in WalkInGuest table' }]
      );
    }
    
    console.log('✅ Guest exists, proceeding with booking creation...');
    
    // ✅ Tiếp tục tạo booking...
    const bookingResult = await bookingDB.createWalkInBooking(validation.validatedData);
    
    if (!bookingResult.success) {
      throw new Error(bookingResult.message);
    }

    res.status(201).json({
      success: true,
      message: 'Walk-in booking created successfully',
      data: bookingResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Walk-in booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo booking',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ GET /api/bookings - Get all bookings for management
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting all bookings for management...');
    
    const {
      page = 1,
      pageSize = 20,
      searchTerm = '',
      status = null,
      phoneFilter = '',
      nameFilter = '',
      checkInDate = '',
      checkOutDate = ''
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));

    console.log('🔍 Booking query parameters:', {
      page: pageNum,
      pageSize: pageSizeNum,
      searchTerm,
      status,
      phoneFilter,
      nameFilter,
      checkInDate,
      checkOutDate
    });

    const result = await bookingDB.getAllBookings(
      pageNum,
      pageSizeNum,
      searchTerm,
      status,
      phoneFilter,
      nameFilter,
      checkInDate,
      checkOutDate
    );

    if (result.success) {
      console.log(`✅ Retrieved ${result.data.length} bookings successfully`);
      
      // ✅ THÊM: Lấy chi tiết CheckInAt/CheckOutAt cho từng booking
      const bookingsWithDetails = await Promise.all(
        result.data.map(async (booking) => {
          try {
            const roomTypeDetails = await bookingDB.getBookingRoomTypeDetails(booking.bookingID);
            return {
              ...booking,
              roomTypeDetails: roomTypeDetails.success ? roomTypeDetails.data : []
            };
          } catch (error) {
            console.error(`❌ Error getting room type details for booking ${booking.bookingID}:`, error);
            return {
              ...booking,
              roomTypeDetails: []
            };
          }
        })
      );
      
      sendResponse(res, 200, true, 'Lấy danh sách booking thành công', {
        bookings: bookingsWithDetails,
        pagination: result.pagination,
        total: result.pagination.totalItems
      });
    } else {
      console.log('❌ Failed to retrieve bookings');
      sendResponse(res, 500, false, 'Không thể lấy danh sách booking');
    }

  } catch (error) {
    console.error('❌ Error getting bookings:', error);
    handleError(res, error, 'Lỗi khi lấy danh sách booking');
  }
});

// ✅ THÊM: GET /api/bookings/user/:userID/history - Get booking history for a specific user
router.get('/user/:userID/history', async (req, res) => {
  try {
    const { userID } = req.params;
    const {
      page = 1,
      pageSize = 10,
      status = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    console.log('📋 Getting booking history for user:', {
      userID,
      page,
      pageSize,
      status,
      dateFrom,
      dateTo
    });

    // Validate userID
    const userIdNum = parseInt(userID);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return sendResponse(res, 400, false, 'UserID không hợp lệ');
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize)));

    const result = await bookingDB.getUserBookingHistory(
      userIdNum,
      pageNum,
      pageSizeNum,
      status,
      dateFrom,
      dateTo
    );

    if (result.success) {
      console.log(`✅ Retrieved ${result.data.length} booking history records for user ${userID}`);
      
      sendResponse(res, 200, true, 'Lấy lịch sử booking thành công', {
        bookings: result.data,
        pagination: result.pagination,
        total: result.pagination.totalItems,
        userID: userIdNum
      });
    } else {
      console.log('❌ Failed to retrieve booking history');
      sendResponse(res, 500, false, result.message || 'Không thể lấy lịch sử booking');
    }

  } catch (error) {
    console.error('❌ Error getting user booking history:', error);
    handleError(res, error, 'Lỗi khi lấy lịch sử booking của user');
  }
});

// ✅ THÊM: Route cho online booking
router.use('/online', OnlineBookingController);

// ... existing routes

export default router;