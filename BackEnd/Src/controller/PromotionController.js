import express from 'express';
import PromotionDBContext from '../dal/PromotionDBContext.js';
import Promotion from '../model/Promotion.js';

const router = express.Router();
const promotionDB = new PromotionDBContext();

// Middleware for logging requests
router.use((req, res, next) => {
  console.log(`🎯 Promotion API: ${req.method} ${req.path} - ${new Date().toISOString()}`);
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

// Valid status values
const VALID_STATUSES = ['Active', 'Inactive', 'Expired', 'Draft', 'Suspended', 'Deleted'];

// Helper function to validate promotion data
const validatePromotionData = (promotionData) => {
  const errors = [];
  
  if (!promotionData.promotionName || promotionData.promotionName.trim().length === 0) {
    errors.push({ field: 'promotionName', message: 'Tên khuyến mãi không được để trống' });
  } else if (promotionData.promotionName.length > 50) {
    errors.push({ field: 'promotionName', message: 'Tên khuyến mãi không được vượt quá 50 ký tự' });
  }
  
  if (promotionData.discountPercent === undefined || promotionData.discountPercent === null) {
    errors.push({ field: 'discountPercent', message: 'Phần trăm giảm giá không được để trống' });
  } else if (promotionData.discountPercent < 0 || promotionData.discountPercent > 100) {
    errors.push({ field: 'discountPercent', message: 'Phần trăm giảm giá phải từ 0 đến 100' });
  }
  
  if (!promotionData.startDate) {
    errors.push({ field: 'startDate', message: 'Ngày bắt đầu không được để trống' });
  }
  
  if (!promotionData.endDate) {
    errors.push({ field: 'endDate', message: 'Ngày kết thúc không được để trống' });
  }
  
  if (promotionData.startDate && promotionData.endDate) {
    const startDate = new Date(promotionData.startDate);
    const endDate = new Date(promotionData.endDate);
    
    if (startDate >= endDate) {
      errors.push({ field: 'dateRange', message: 'Ngày bắt đầu phải trước ngày kết thúc' });
    }
  }
  
  if (promotionData.description && promotionData.description.length > 255) {
    errors.push({ field: 'description', message: 'Mô tả không được vượt quá 255 ký tự' });
  }

  if (promotionData.status && !VALID_STATUSES.includes(promotionData.status)) {
    errors.push({ field: 'status', message: `Trạng thái phải là một trong: ${VALID_STATUSES.join(', ')}` });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// GET /api/promotions - Get all promotions
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting all promotions');
    
    const promotions = await promotionDB.list();
    
    console.log(`✅ Retrieved ${promotions.length} promotions`);
    
    sendResponse(res, 200, true, 'Lấy danh sách khuyến mãi thành công', promotions);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy danh sách khuyến mãi');
  }
});

// GET /api/promotions/active - Get active promotions only
router.get('/active', async (req, res) => {
  try {
    console.log('📋 Getting active promotions');
    
    const activePromotions = await promotionDB.getActivePromotions();
    
    console.log(`✅ Retrieved ${activePromotions.length} active promotions`);
    
    sendResponse(res, 200, true, 'Lấy danh sách khuyến mãi đang hoạt động thành công', activePromotions);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy khuyến mãi đang hoạt động');
  }
});

// GET /api/promotions/status/:status - Get promotions by status
router.get('/status/:status', async (req, res) => {
  try {
    const status = req.params.status;
    
    if (!VALID_STATUSES.includes(status)) {
      return sendResponse(res, 400, false, `Trạng thái không hợp lệ. Phải là một trong: ${VALID_STATUSES.join(', ')}`);
    }
    
    console.log(`📋 Getting promotions with status: ${status}`);
    
    const promotions = await promotionDB.getPromotionsByStatus(status);
    
    console.log(`✅ Retrieved ${promotions.length} promotions with status ${status}`);
    
    sendResponse(res, 200, true, `Lấy danh sách khuyến mãi với trạng thái ${status} thành công`, promotions);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy khuyến mãi theo trạng thái');
  }
});

// GET /api/promotions/statistics - Get promotion statistics
router.get('/statistics', async (req, res) => {
  try {
    console.log('📊 Getting promotion statistics');
    
    const stats = await promotionDB.getPromotionStats();
    
    console.log('✅ Retrieved promotion statistics');
    
    sendResponse(res, 200, true, 'Lấy thống kê khuyến mãi thành công', stats);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy thống kê khuyến mãi');
  }
});

// GET /api/promotions/search/:term - Search promotions by name
router.get('/search/:term', async (req, res) => {
  try {
    const searchTerm = req.params.term;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return sendResponse(res, 400, false, 'Từ khóa tìm kiếm không được để trống');
    }
    
    if (searchTerm.trim().length < 2) {
      return sendResponse(res, 400, false, 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự');
    }
    
    console.log(`🔍 Searching promotions with term: "${searchTerm}"`);
    
    const promotions = await promotionDB.searchPromotionsByName(searchTerm);
    
    console.log(`✅ Found ${promotions.length} promotions matching "${searchTerm}"`);
    
    sendResponse(res, 200, true, `Tìm thấy ${promotions.length} khuyến mãi`, promotions);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi tìm kiếm khuyến mãi');
  }
});

// GET /api/promotions/date-range - Get promotions by date range
router.get('/date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return sendResponse(res, 400, false, 'Vui lòng cung cấp startDate và endDate');
    }
    
    console.log(`📅 Getting promotions from ${startDate} to ${endDate}`);
    
    const promotions = await promotionDB.getPromotionsByDateRange(startDate, endDate);
    
    console.log(`✅ Retrieved ${promotions.length} promotions in date range`);
    
    sendResponse(res, 200, true, 'Lấy khuyến mãi theo khoảng thời gian thành công', promotions);
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy khuyến mãi theo khoảng thời gian');
  }
});

// GET /api/promotions/:id - Get promotion by ID
router.get('/:id', async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    
    if (isNaN(promotionId) || promotionId <= 0) {
      return sendResponse(res, 400, false, 'ID khuyến mãi không hợp lệ');
    }
    
    console.log(`🔍 Getting promotion by ID: ${promotionId}`);
    
    const promotion = await promotionDB.get(promotionId);
    
    if (!promotion) {
      return sendResponse(res, 404, false, 'Không tìm thấy khuyến mãi');
    }
    
    console.log('✅ Found promotion:', promotion.getPromotionName());
    
    sendResponse(res, 200, true, 'Lấy thông tin khuyến mãi thành công', promotion.toJSON());
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy thông tin khuyến mãi');
  }
});

// POST /api/promotions - Create new promotion
router.post('/', async (req, res) => {
  try {
    const promotionData = req.body;
    
    console.log('➕ Creating new promotion:', JSON.stringify({
      promotionName: promotionData.promotionName,
      discountPercent: promotionData.discountPercent,
      startDate: promotionData.startDate,
      endDate: promotionData.endDate,
      status: promotionData.status
    }, null, 2));
    
    if (!promotionData) {
      return sendResponse(res, 400, false, 'Dữ liệu khuyến mãi không được để trống');
    }
    
    const validation = validatePromotionData(promotionData);
    if (!validation.isValid) {
      return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validation.errors);
    }
    
    const promotion = new Promotion(
      null,
      promotionData.promotionName.trim(),
      parseFloat(promotionData.discountPercent),
      new Date(promotionData.startDate),
      new Date(promotionData.endDate),
      promotionData.description?.trim() || '',
      promotionData.status || 'Active'
    );
    
    if (!promotion.isValid()) {
      return sendResponse(res, 400, false, 'Dữ liệu khuyến mãi không hợp lệ');
    }
    
    const promotionId = await promotionDB.insert(promotion);
    
    if (promotionId) {
      console.log('✅ Promotion created successfully with ID:', promotionId);
      
      const createdPromotion = await promotionDB.get(promotionId);
      
      sendResponse(res, 201, true, 'Tạo khuyến mãi thành công', createdPromotion.toJSON());
    } else {
      throw new Error('Không thể tạo khuyến mãi');
    }
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi tạo khuyến mãi mới');
  }
});

// PUT /api/promotions/:id - Update promotion
router.put('/:id', async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    const updateData = req.body;
    
    if (isNaN(promotionId) || promotionId <= 0) {
      return sendResponse(res, 400, false, 'ID khuyến mãi không hợp lệ');
    }
    
    console.log(`🔄 Updating promotion ${promotionId}:`, JSON.stringify(updateData, null, 2));
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return sendResponse(res, 400, false, 'Dữ liệu cập nhật không được để trống');
    }
    
    const existingPromotion = await promotionDB.get(promotionId);
    if (!existingPromotion) {
      return sendResponse(res, 404, false, 'Không tìm thấy khuyến mãi');
    }
    
    const validation = validatePromotionData(updateData);
    if (!validation.isValid) {
      return sendResponse(res, 400, false, 'Dữ liệu cập nhật không hợp lệ', null, validation.errors);
    }
    
    const updatedPromotion = new Promotion(
      promotionId,
      updateData.promotionName.trim(),
      parseFloat(updateData.discountPercent),
      new Date(updateData.startDate),
      new Date(updateData.endDate),
      updateData.description?.trim() || '',
      updateData.status || existingPromotion.getStatus()
    );
    
    if (!updatedPromotion.isValid()) {
      return sendResponse(res, 400, false, 'Dữ liệu khuyến mãi cập nhật không hợp lệ');
    }
    
    const success = await promotionDB.update(updatedPromotion);
    
    if (success) {
      console.log('✅ Promotion updated successfully');
      
      const updated = await promotionDB.get(promotionId);
      
      sendResponse(res, 200, true, 'Cập nhật khuyến mãi thành công', updated.toJSON());
    } else {
      throw new Error('Không thể cập nhật khuyến mãi');
    }
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi cập nhật khuyến mãi');
  }
});

// PUT /api/promotions/:id/status - Update only promotion status
router.put('/:id/status', async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(promotionId) || promotionId <= 0) {
      return sendResponse(res, 400, false, 'ID khuyến mãi không hợp lệ');
    }
    
    if (!status) {
      return sendResponse(res, 400, false, 'Trạng thái không được để trống');
    }
    
    if (!VALID_STATUSES.includes(status)) {
      return sendResponse(res, 400, false, `Trạng thái không hợp lệ. Phải là một trong: ${VALID_STATUSES.join(', ')}`);
    }
    
    console.log(`🔄 Updating promotion ${promotionId} status to: ${status}`);
    
    const existingPromotion = await promotionDB.get(promotionId);
    if (!existingPromotion) {
      return sendResponse(res, 404, false, 'Không tìm thấy khuyến mãi');
    }
    
    const success = await promotionDB.updateStatus(promotionId, status);
    
    if (success) {
      console.log('✅ Promotion status updated successfully');
      
      const updated = await promotionDB.get(promotionId);
      
      sendResponse(res, 200, true, 'Cập nhật trạng thái khuyến mãi thành công', updated.toJSON());
    } else {
      throw new Error('Không thể cập nhật trạng thái khuyến mãi');
    }
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi cập nhật trạng thái khuyến mãi');
  }
});

// ✅ HOÀN THIỆN: Enhanced DELETE endpoint
router.delete('/:id', async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    const { force = false, confirm = false } = req.query;
    
    if (isNaN(promotionId) || promotionId <= 0) {
      return sendResponse(res, 400, false, 'ID khuyến mãi không hợp lệ');
    }
    
    if (!confirm) {
      return sendResponse(res, 400, false, 'Vui lòng xác nhận việc xóa khuyến mãi');
    }
    
    console.log(`🗑️ Deleting promotion: ${promotionId}, force: ${force}`);
    
    // Check if promotion exists
    const existingPromotion = await promotionDB.get(promotionId);
    if (!existingPromotion) {
      return sendResponse(res, 404, false, 'Không tìm thấy khuyến mãi');
    }
    
    // Check if promotion is being used (only for hard delete)
    if (force === 'true') {
      const usageInfo = await promotionDB.isPromotionInUse(promotionId);
      if (usageInfo.isInUse) {
        return sendResponse(res, 400, false, 
          `Không thể xóa vĩnh viễn khuyến mãi đang được sử dụng trong ${usageInfo.totalReferences} bản ghi`, 
          { usage: usageInfo.usage }
        );
      }
    }
    
    const deleteType = force === 'true' ? 'hard' : 'soft';
    const success = await promotionDB.delete(promotionId, deleteType);
    
    if (success) {
      const action = deleteType === 'hard' ? 'xóa vĩnh viễn' : 'xóa';
      sendResponse(res, 200, true, `${action.charAt(0).toUpperCase() + action.slice(1)} khuyến mãi thành công`, {
        promotionId,
        deleteType,
        promotionName: existingPromotion.getPromotionName()
      });
    } else {
      sendResponse(res, 500, false, 'Không thể xóa khuyến mãi');
    }
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi xóa khuyến mãi');
  }
});

// ✅ THÊM: POST /api/promotions/:id/restore - Restore deleted promotion
router.post('/:id/restore', async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    
    if (isNaN(promotionId) || promotionId <= 0) {
      return sendResponse(res, 400, false, 'ID khuyến mãi không hợp lệ');
    }
    
    console.log(`🔄 Restoring promotion: ${promotionId}`);
    
    const success = await promotionDB.restore(promotionId);
    
    if (success) {
      sendResponse(res, 200, true, 'Khôi phục khuyến mãi thành công', { promotionId });
    } else {
      sendResponse(res, 404, false, 'Không tìm thấy khuyến mãi đã xóa hoặc khuyến mãi chưa bị xóa');
    }
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi khôi phục khuyến mãi');
  }
});

// ✅ THÊM: POST /api/promotions/bulk-delete - Bulk delete promotions
router.post('/bulk-delete', async (req, res) => {
  try {
    const { promotionIds, force = false, confirm = false } = req.body;
    
    if (!Array.isArray(promotionIds) || promotionIds.length === 0) {
      return sendResponse(res, 400, false, 'Danh sách ID khuyến mãi không hợp lệ');
    }
    
    if (!confirm) {
      return sendResponse(res, 400, false, 'Vui lòng xác nhận việc xóa hàng loạt khuyến mãi');
    }
    
    // Validate all IDs
    const invalidIds = promotionIds.filter(id => isNaN(parseInt(id)) || parseInt(id) <= 0);
    if (invalidIds.length > 0) {
      return sendResponse(res, 400, false, `ID không hợp lệ: ${invalidIds.join(', ')}`);
    }
    
    console.log(`🗑️ Bulk deleting promotions: ${promotionIds.join(', ')}, force: ${force}`);
    
    // Check usage for hard delete
    if (force) {
      const usageChecks = await Promise.all(
        promotionIds.map(async id => {
          const usage = await promotionDB.isPromotionInUse(parseInt(id));
          return { id, isInUse: usage.isInUse, totalReferences: usage.totalReferences };
        })
      );
      
      const inUsePromotions = usageChecks.filter(check => check.isInUse);
      if (inUsePromotions.length > 0) {
        return sendResponse(res, 400, false, 
          `Không thể xóa vĩnh viễn các khuyến mãi đang được sử dụng: ${inUsePromotions.map(p => p.id).join(', ')}`,
          { inUsePromotions }
        );
      }
    }
    
    const deleteType = force ? 'hard' : 'soft';
    const result = await promotionDB.bulkDelete(promotionIds.map(id => parseInt(id)), deleteType);
    
    if (result.success) {
      const action = deleteType === 'hard' ? 'xóa vĩnh viễn' : 'xóa';
      sendResponse(res, 200, true, `${action.charAt(0).toUpperCase() + action.slice(1)} ${result.deletedCount} khuyến mãi thành công`, {
        deletedCount: result.deletedCount,
        deleteType,
        promotionIds
      });
    } else {
      sendResponse(res, 500, false, 'Không thể xóa khuyến mãi');
    }
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi xóa hàng loạt khuyến mãi');
  }
});

// GET /api/promotions/:id/usage - Get detailed usage information
router.get('/:id/usage', async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    
    if (isNaN(promotionId) || promotionId <= 0) {
      return sendResponse(res, 400, false, 'ID khuyến mãi không hợp lệ');
    }
    
    console.log(`🔍 Getting usage details for promotion: ${promotionId}`);
    
    const existingPromotion = await promotionDB.get(promotionId);
    if (!existingPromotion) {
      return sendResponse(res, 404, false, 'Không tìm thấy khuyến mãi');
    }
    
    const usageDetails = await promotionDB.getPromotionUsageDetails(promotionId);
    
    sendResponse(res, 200, true, 'Lấy thông tin sử dụng khuyến mãi thành công', {
      promotionId,
      promotionName: existingPromotion.getPromotionName(),
      ...usageDetails
    });
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi lấy thông tin sử dụng khuyến mãi');
  }
});

// POST /api/promotions/:id/check-usage - Check if promotion is being used
router.post('/:id/check-usage', async (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    
    if (isNaN(promotionId) || promotionId <= 0) {
      return sendResponse(res, 400, false, 'ID khuyến mãi không hợp lệ');
    }
    
    console.log(`🔍 Checking usage for promotion: ${promotionId}`);
    
    const existingPromotion = await promotionDB.get(promotionId);
    if (!existingPromotion) {
      return sendResponse(res, 404, false, 'Không tìm thấy khuyến mãi');
    }
    
    const usageInfo = await promotionDB.isPromotionInUse(promotionId);
    
    sendResponse(res, 200, true, 'Kiểm tra sử dụng khuyến mãi thành công', {
      promotionId,
      isInUse: usageInfo.isInUse,
      canDelete: !usageInfo.isInUse,
      canHardDelete: !usageInfo.isInUse,
      canSoftDelete: true,
      promotionName: existingPromotion.getPromotionName(),
      status: existingPromotion.getStatus(),
      totalReferences: usageInfo.totalReferences,
      usage: usageInfo.usage
    });
    
  } catch (error) {
    handleError(res, error, 'Lỗi khi kiểm tra sử dụng khuyến mãi');
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ Unhandled error in Promotion controller:', error);
  sendResponse(res, 500, false, 'Đã xảy ra lỗi không mong muốn');
});

// 404 handler for undefined routes
router.use('*', (req, res) => {
  sendResponse(res, 404, false, `Endpoint ${req.method} ${req.originalUrl} không tồn tại`);
});

export default router;