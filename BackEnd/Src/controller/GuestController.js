import express from 'express';
import GuestDBContext from '../dal/GuestDBContext.js';
import Guest from '../model/Guest.js';

const router = express.Router();
const guestDB = new GuestDBContext();

// Middleware for logging requests
router.use((req, res, next) => {
  console.log(`🏨 Guest API: ${req.method} ${req.path} - ${new Date().toISOString()}`);
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

// GET /api/guests - Get all guests with pagination and search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100); // Max 100 items per page
    const searchTerm = req.query.search || '';
    
    console.log(`📋 Getting guests - Page: ${page}, Size: ${pageSize}, Search: "${searchTerm}"`);
    
    if (page < 1 || pageSize < 1) {
      return sendResponse(res, 400, false, 'Page và pageSize phải là số dương');
    }
    
    const result = await guestDB.getAllGuests(page, pageSize, searchTerm);
    
    if (!result.success) {
      return sendResponse(res, 500, false, result.message);
    }
    
    // Set pagination headers
    res.setHeader('X-Total-Count', result.pagination.totalCount);
    res.setHeader('X-Total-Pages', result.pagination.totalPages);
    res.setHeader('X-Current-Page', result.pagination.currentPage);
    res.setHeader('X-Page-Size', result.pagination.pageSize);
    
    sendResponse(res, 200, true, 'Lấy danh sách khách hàng thành công', result.data, null, result.pagination);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy danh sách khách hàng');
  }
});

// GET /api/guests/statistics/overview - Get guest statistics (must be before /:phoneNumber)
router.get('/statistics/overview', async (req, res) => {
  try {
    console.log('📊 Getting guest statistics');
    
    const result = await guestDB.getGuestStatistics();
    
    if (!result.success) {
      return sendResponse(res, 500, false, result.message);
    }
    
    sendResponse(res, 200, true, 'Lấy thống kê khách hàng thành công', result.data);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy thống kê khách hàng');
  }
});

// GET /api/guests/recent - Get recent guests (must be before /:phoneNumber)
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 guests
    
    console.log(`📋 Getting recent guests - Limit: ${limit}`);
    
    const result = await guestDB.getRecentGuests(limit);
    
    if (!result.success) {
      return sendResponse(res, 500, false, result.message);
    }
    
    sendResponse(res, 200, true, 'Lấy khách hàng gần đây thành công', result.data);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy khách hàng gần đây');
  }
});

// GET /api/guests/by-receptionist/:receptionistID - Get guests by receptionist
router.get('/by-receptionist/:receptionistID', async (req, res) => {
  try {
    const receptionistID = parseInt(req.params.receptionistID);
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
    
    if (!receptionistID || receptionistID <= 0) {
      return sendResponse(res, 400, false, 'ID nhân viên lễ tân không hợp lệ');
    }
    
    console.log(`👥 Getting guests by receptionist ${receptionistID} - Page: ${page}, Size: ${pageSize}`);
    
    const result = await guestDB.findGuestsByReceptionist(receptionistID, page, pageSize);
    
    if (!result.success) {
      return sendResponse(res, 500, false, result.message);
    }
    
    // Set pagination headers
    res.setHeader('X-Total-Count', result.pagination.totalCount);
    res.setHeader('X-Total-Pages', result.pagination.totalPages);
    res.setHeader('X-Current-Page', result.pagination.currentPage);
    res.setHeader('X-Page-Size', result.pagination.pageSize);
    
    sendResponse(res, 200, true, 'Lấy khách hàng theo nhân viên thành công', result.data, null, result.pagination);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy khách hàng theo nhân viên');
  }
});

// GET /api/guests/:phoneNumber - Get guest by phone number
router.get('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    console.log(`🔍 Getting guest by phone: ${phoneNumber}`);
    
    // Basic phone number validation
    const phoneValidation = Guest.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      return sendResponse(res, 400, false, phoneValidation.message);
    }
    
    const result = await guestDB.getGuestByPhoneNumber(phoneNumber);
    
    if (!result.success) {
      if (result.notFound) {
        return sendResponse(res, 404, false, result.message);
      }
      return sendResponse(res, 500, false, result.message);
    }
    
    sendResponse(res, 200, true, 'Lấy thông tin khách hàng thành công', result.data);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy thông tin khách hàng');
  }
});

// POST /api/guests - Create new guest
router.post('/', async (req, res) => {
  try {
    const guestData = req.body;
    
    console.log('➕ Creating new guest:', JSON.stringify({
      guestPhoneNumber: guestData.guestPhoneNumber,
      guestName: guestData.guestName,
      guestEmail: guestData.guestEmail,
      receptionistID: guestData.receptionistID
    }, null, 2));
    
    // Validate required fields
    if (!guestData) {
      return sendResponse(res, 400, false, 'Dữ liệu khách hàng không được để trống');
    }
    
    const requiredFields = ['guestPhoneNumber', 'guestName', 'receptionistID'];
    const missingFields = requiredFields.filter(field => !guestData[field]);
    
    if (missingFields.length > 0) {
      return sendResponse(res, 400, false, `Thiếu các trường bắt buộc: ${missingFields.join(', ')}`);
    }
    
    // Convert receptionistID to number if it's a string
    if (typeof guestData.receptionistID === 'string') {
      guestData.receptionistID = parseInt(guestData.receptionistID);
    }
    
    const result = await guestDB.createGuest(guestData);
    
    if (!result.success) {
      if (result.duplicate) {
        return sendResponse(res, 409, false, result.message);
      }
      if (result.errors) {
        return sendResponse(res, 400, false, result.message, null, result.errors);
      }
      if (result.invalidReceptionist) {
        return sendResponse(res, 400, false, result.message);
      }
      return sendResponse(res, 500, false, result.message);
    }
    
    sendResponse(res, 201, true, result.message, result.data);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi tạo khách hàng mới');
  }
});

// PUT /api/guests/:phoneNumber - Update guest information
router.put('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const updateData = req.body;
    
    console.log(`🔄 Updating guest ${phoneNumber}:`, JSON.stringify(updateData, null, 2));
    
    // Basic phone number validation
    const phoneValidation = Guest.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      return sendResponse(res, 400, false, phoneValidation.message);
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return sendResponse(res, 400, false, 'Dữ liệu cập nhật không được để trống');
    }
    
    // Validate that only allowed fields are being updated
    const allowedFields = ['guestName', 'guestEmail', 'receptionistID'];
    const invalidFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return sendResponse(res, 400, false, `Không thể cập nhật các trường: ${invalidFields.join(', ')}`);
    }
    
    // Convert receptionistID to number if it's provided as string
    if (updateData.receptionistID && typeof updateData.receptionistID === 'string') {
      updateData.receptionistID = parseInt(updateData.receptionistID);
    }
    
    const result = await guestDB.updateGuest(phoneNumber, updateData);
    
    if (!result.success) {
      if (result.notFound) {
        return sendResponse(res, 404, false, result.message);
      }
      if (result.errors) {
        return sendResponse(res, 400, false, result.message, null, result.errors);
      }
      if (result.invalidReceptionist) {
        return sendResponse(res, 400, false, result.message);
      }
      return sendResponse(res, 500, false, result.message);
    }
    
    sendResponse(res, 200, true, result.message, result.data);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi cập nhật thông tin khách hàng');
  }
});

// DELETE /api/guests/:phoneNumber - Delete guest
router.delete('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    console.log(`🗑️ Deleting guest: ${phoneNumber}`);
    
    // Basic phone number validation
    const phoneValidation = Guest.validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      return sendResponse(res, 400, false, phoneValidation.message);
    }
    
    const result = await guestDB.deleteGuest(phoneNumber);
    
    if (!result.success) {
      if (result.notFound) {
        return sendResponse(res, 404, false, result.message);
      }
      if (result.hasBookings) {
        return sendResponse(res, 409, false, result.message, { bookingCount: result.bookingCount });
      }
      return sendResponse(res, 500, false, result.message);
    }
    
    sendResponse(res, 200, true, result.message);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi xóa khách hàng');
  }
});

// POST /api/guests/validate - Validate guest data without creating
router.post('/validate', async (req, res) => {
  try {
    const guestData = req.body;
    
    console.log('✅ Validating guest data:', JSON.stringify({
      guestPhoneNumber: guestData.guestPhoneNumber,
      guestName: guestData.guestName,
      guestEmail: guestData.guestEmail,
      receptionistID: guestData.receptionistID
    }, null, 2));
    
    if (!guestData) {
      return sendResponse(res, 400, false, 'Dữ liệu khách hàng không được để trống');
    }
    
    // Convert receptionistID to number if it's a string
    if (typeof guestData.receptionistID === 'string') {
      guestData.receptionistID = parseInt(guestData.receptionistID);
    }
    
    const validation = Guest.validateGuest(guestData);
    
    if (!validation.isValid) {
      return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validation.errors);
    }
    
    // Check if guest already exists
    if (guestData.guestPhoneNumber) {
      const existingGuest = await guestDB.getGuestByPhoneNumber(guestData.guestPhoneNumber);
      if (existingGuest.success) {
        return sendResponse(res, 409, false, 'Khách hàng với số điện thoại này đã tồn tại', {
          duplicate: true,
          existingGuest: existingGuest.data
        });
      }
    }
    
    sendResponse(res, 200, true, 'Dữ liệu hợp lệ', {
      validatedData: validation.validatedData,
      isValid: true
    });
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi validate dữ liệu khách hàng');
  }
});

// GET /api/guests/search/:term - Search guests by name, phone, or email
router.get('/search/:term', async (req, res) => {
  try {
    const searchTerm = req.params.term;
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return sendResponse(res, 400, false, 'Từ khóa tìm kiếm không được để trống');
    }
    
    if (searchTerm.trim().length < 2) {
      return sendResponse(res, 400, false, 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự');
    }
    
    console.log(`🔍 Searching guests with term: "${searchTerm}" - Page: ${page}, Size: ${pageSize}`);
    
    const result = await guestDB.getAllGuests(page, pageSize, searchTerm);
    
    if (!result.success) {
      return sendResponse(res, 500, false, result.message);
    }
    
    // Set pagination headers
    res.setHeader('X-Total-Count', result.pagination.totalCount);
    res.setHeader('X-Total-Pages', result.pagination.totalPages);
    res.setHeader('X-Current-Page', result.pagination.currentPage);
    res.setHeader('X-Page-Size', result.pagination.pageSize);
    
    sendResponse(res, 200, true, `Tìm thấy ${result.data.length} khách hàng`, result.data, null, result.pagination);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi tìm kiếm khách hàng');
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ Unhandled error in Guest controller:', error);
  sendResponse(res, 500, false, 'Đã xảy ra lỗi không mong muốn');
});

// 404 handler for undefined routes
router.use('*', (req, res) => {
  sendResponse(res, 404, false, `Endpoint ${req.method} ${req.originalUrl} không tồn tại`);
});

export default router;