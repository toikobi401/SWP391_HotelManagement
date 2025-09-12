import express from 'express';
import ServiceDBContext from '../dal/ServiceDBContext.js';
import Service from '../model/Service.js';

const router = express.Router();
const serviceDB = new ServiceDBContext();

// GET /api/services - Get all services với pagination
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            category = '',
            isActive = '',
            sortBy = 'ServiceName',
            sortOrder = 'asc'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        console.log('📋 Getting services with pagination:', {
            page: pageNum, limit: limitNum, offset, search, category
        });

        // ✅ QUAN TRỌNG: Gọi method getAllWithPagination, KHÔNG PHẢI getAll()
        const result = await serviceDB.getAllWithPagination({
            page: pageNum,
            limit: limitNum,
            offset,
            search,
            category,
            isActive,
            sortBy,
            sortOrder
        });

        if (!result.success) {
            return sendResponse(res, 500, false, result.message || 'Lỗi khi lấy danh sách dịch vụ');
        }

        // ✅ Đảm bảo response có pagination info
        sendResponse(res, 200, true, 'Lấy danh sách dịch vụ thành công', 
            result.data, null, { 
                pagination: result.pagination,
                filters: { search, category, isActive, sortBy, sortOrder }
            });

    } catch (error) {
        console.error('❌ ServiceController error:', error);
        handleError(res, error, 'Lỗi khi lấy danh sách dịch vụ');
    }
});

// GET /api/services/active - Get active services only
router.get('/active', async (req, res) => {
    try {
        const services = await serviceDB.getActiveServices();
        res.json({
            success: true,
            data: services,
            count: services.length
        });
    } catch (error) {
        console.error('Error fetching active services:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching active services',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/services/popular - Get popular services
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const services = await serviceDB.getPopularServices(limit);
        res.json({
            success: true,
            data: services,
            limit: limit
        });
    } catch (error) {
        console.error('Error fetching popular services:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching popular services',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/services/statistics - Get service statistics
router.get('/statistics', async (req, res) => {
    try {
        console.log('📊 Getting service statistics');
        
        const stats = await serviceDB.getServiceStatistics();
        
        sendResponse(res, 200, true, 'Lấy thống kê dịch vụ thành công', stats);

    } catch (error) {
        handleError(res, error, 'Lỗi khi lấy thống kê dịch vụ');
    }
});

// GET /api/services/search - Search services
router.get('/search', async (req, res) => {
    try {
        const { q: searchTerm, minPrice, maxPrice, category } = req.query;
        
        let services = [];
        
        if (searchTerm) {
            services = await serviceDB.searchServicesByName(searchTerm);
        } else if (minPrice && maxPrice) {
            services = await serviceDB.getServicesByPriceRange(
                parseFloat(minPrice), 
                parseFloat(maxPrice)
            );
        } else if (category) {
            services = await serviceDB.getServicesByCategory(parseInt(category));
        } else {
            return res.status(400).json({
                success: false,
                message: 'Search term, price range, or category is required'
            });
        }

        res.json({
            success: true,
            data: services,
            searchParams: { searchTerm, minPrice, maxPrice, category }
        });
    } catch (error) {
        console.error('Error searching services:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching services',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/services/category/:categoryId - Get services by category
router.get('/category/:categoryId', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId);
        
        if (isNaN(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        const services = await serviceDB.getServicesByCategory(categoryId);
        res.json({
            success: true,
            data: services,
            categoryId: categoryId
        });
    } catch (error) {
        console.error('Error fetching services by category:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching services by category',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/services/:id - Get service by ID
router.get('/:id', async (req, res) => {
    try {
        const serviceId = parseInt(req.params.id);
        
        if (isNaN(serviceId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid service ID'
            });
        }

        const service = await serviceDB.getById(serviceId);
        
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }
        
        res.json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching service',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/services - Create new service
router.post('/', async (req, res) => {
    try {
        const {
            ServiceName,
            Description,
            Price,
            IsActive = true,
            CategoryID
        } = req.body;

        // Basic validation
        if (!ServiceName || !Description || Price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'ServiceName, Description, and Price are required'
            });
        }

        // Create service object
        const service = Service.fromDatabase({
            ServiceName: ServiceName.trim(),
            Description: Description.trim(),
            Price: parseFloat(Price),
            IsActive: Boolean(IsActive),
            CategoryID: CategoryID ? parseInt(CategoryID) : null,
            CreateAt: new Date(),
            UpdateAt: new Date()
        });

        // Validate service
        const validation = service.validate();
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        // Insert into database
        const serviceId = await serviceDB.insert(service);

        if (serviceId) {
            const createdService = await serviceDB.getById(serviceId);
            res.status(201).json({
                success: true,
                message: 'Service created successfully',
                serviceId: serviceId,
                data: createdService
            });
        } else {
            throw new Error('Failed to create service');
        }

    } catch (error) {
        console.error('Error creating service:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error creating service',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ✅ THÊM: Helper functions
const sendResponse = (res, status, success, message, data = null, errors = null, meta = null) => {
    return res.status(status).json({
        success,
        message,
        data,
        errors,
        meta,
        timestamp: new Date().toISOString()
    });
};

const handleError = (res, error, defaultMessage = 'Đã xảy ra lỗi không mong muốn') => {
    console.error('❌ Service Controller Error:', error);
    const message = error.message || defaultMessage;
    const status = error.status || 500;
    
    return sendResponse(res, status, false, message, null, 
        process.env.NODE_ENV === 'development' ? error.stack : null
    );
};

// ✅ THÊM: Valid categories
const VALID_CATEGORIES = [
    'Spa & Wellness', 'Ăn uống', 'Vận chuyển', 'Tour & Hoạt động',
    'Dịch vụ phòng', 'Giặt ủi', 'Dịch vụ doanh nghiệp', 'Giải trí',
    'Trẻ em & Gia đình', 'Sức khỏe & Thể thao', 'Mua sắm', 
    'Sự kiện đặc biệt', 'Khác'
];

// ✅ THÊM: Validation helper
const validateServiceData = (serviceData, isUpdate = false) => {
    const errors = [];
    
    if (!isUpdate || serviceData.ServiceName !== undefined) {
        if (!serviceData.ServiceName || serviceData.ServiceName.trim().length < 3) {
            errors.push('Tên dịch vụ phải có ít nhất 3 ký tự');
        }
        if (serviceData.ServiceName && serviceData.ServiceName.length > 100) {
            errors.push('Tên dịch vụ không được vượt quá 100 ký tự');
        }
    }
    
    if (!isUpdate || serviceData.Description !== undefined) {
        if (!serviceData.Description || serviceData.Description.trim().length < 10) {
            errors.push('Mô tả phải có ít nhất 10 ký tự');
        }
        if (serviceData.Description && serviceData.Description.length > 500) {
            errors.push('Mô tả không được vượt quá 500 ký tự');
        }
    }
    
    if (!isUpdate || serviceData.Price !== undefined) {
        const price = parseFloat(serviceData.Price);
        if (isNaN(price) || price <= 0) {
            errors.push('Giá dịch vụ phải lớn hơn 0');
        }
        if (price > 100000000) {
            errors.push('Giá dịch vụ không được vượt quá 100.000.000đ');
        }
    }
    
    if (!isUpdate || serviceData.Category !== undefined) {
        if (!serviceData.Category || !VALID_CATEGORIES.includes(serviceData.Category)) {
            errors.push('Danh mục dịch vụ không hợp lệ');
        }
    }
    
    if (!isUpdate || serviceData.Duration !== undefined) {
        const duration = parseInt(serviceData.Duration);
        if (isNaN(duration) || duration <= 0) {
            errors.push('Thời gian dịch vụ phải lớn hơn 0 phút');
        }
        if (duration > 1440) {
            errors.push('Thời gian dịch vụ không được vượt quá 24 giờ');
        }
    }
    
    if (!isUpdate || serviceData.MaxCapacity !== undefined) {
        const capacity = parseInt(serviceData.MaxCapacity);
        if (isNaN(capacity) || capacity <= 0) {
            errors.push('Sức chứa tối đa phải lớn hơn 0');
        }
        if (capacity > 1000) {
            errors.push('Sức chứa tối đa không được vượt quá 1000');
        }
    }
    
    return errors;
};

// ✅ THÊM: Enhanced PUT update service
router.put('/:id', async (req, res) => {
    try {
        const serviceId = parseInt(req.params.id);
        
        if (isNaN(serviceId) || serviceId <= 0) {
            return sendResponse(res, 400, false, 'ID dịch vụ không hợp lệ');
        }

        // Check if service exists
        const existingService = await serviceDB.getById(serviceId);
        if (!existingService) {
            return sendResponse(res, 404, false, 'Không tìm thấy dịch vụ');
        }

        // Validate input data
        const validationErrors = validateServiceData(req.body, true);
        if (validationErrors.length > 0) {
            return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validationErrors);
        }

        const {
            ServiceName,
            Description,
            Price,
            Category,
            IsActive,
            Duration,
            MaxCapacity,
            Image
        } = req.body;

        // Update service object
        const updatedService = Service.fromDatabase({
            ServiceID: serviceId,
            ServiceName: ServiceName !== undefined ? ServiceName.trim() : existingService.ServiceName,
            Description: Description !== undefined ? Description.trim() : existingService.Description,
            Price: Price !== undefined ? parseFloat(Price) : existingService.Price,
            Category: Category !== undefined ? Category : existingService.Category,
            IsActive: IsActive !== undefined ? Boolean(IsActive) : existingService.IsActive,
            Duration: Duration !== undefined ? parseInt(Duration) : existingService.Duration,
            MaxCapacity: MaxCapacity !== undefined ? parseInt(MaxCapacity) : existingService.MaxCapacity,
            CreateAt: existingService.CreateAt,
            UpdateAt: new Date(),
            Image: existingService.Image
        });

        // Handle image update
        if (Image !== undefined) {
            if (Image === null || Image === '') {
                updatedService.setImage(null);
            } else {
                try {
                    updatedService.setImageFromBase64(Image);
                } catch (imageError) {
                    return sendResponse(res, 400, false, 'Dữ liệu hình ảnh không hợp lệ');
                }
            }
        }

        // Validate updated service
        const validation = updatedService.validate();
        if (!validation.isValid) {
            return sendResponse(res, 400, false, 'Dữ liệu dịch vụ không hợp lệ', null, validation.errors);
        }

        const success = await serviceDB.update(updatedService);
        
        if (!success) {
            return sendResponse(res, 500, false, 'Không thể cập nhật dịch vụ');
        }

        const result = await serviceDB.getById(serviceId);
        sendResponse(res, 200, true, 'Cập nhật dịch vụ thành công', result);

    } catch (error) {
        handleError(res, error, 'Lỗi khi cập nhật dịch vụ');
    }
});

// ✅ THÊM: PATCH update service status
router.patch('/:id/status', async (req, res) => {
    try {
        const serviceId = parseInt(req.params.id);
        const { isActive } = req.body;
        
        if (isNaN(serviceId) || serviceId <= 0) {
            return sendResponse(res, 400, false, 'ID dịch vụ không hợp lệ');
        }

        if (typeof isActive !== 'boolean') {
            return sendResponse(res, 400, false, 'Trạng thái không hợp lệ');
        }

        const success = await serviceDB.updateStatus(serviceId, isActive);
        
        if (!success) {
            return sendResponse(res, 500, false, 'Không thể cập nhật trạng thái dịch vụ');
        }

        const statusText = isActive ? 'kích hoạt' : 'vô hiệu hóa';
        sendResponse(res, 200, true, `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} dịch vụ thành công`);

    } catch (error) {
        handleError(res, error, 'Lỗi khi cập nhật trạng thái dịch vụ');
    }
});

// ✅ THÊM: Enhanced DELETE service
router.delete('/:id', async (req, res) => {
    try {
        const serviceId = parseInt(req.params.id);
        const { force } = req.query;
        
        if (isNaN(serviceId) || serviceId <= 0) {
            return sendResponse(res, 400, false, 'ID dịch vụ không hợp lệ');
        }

        // Check if service exists
        const service = await serviceDB.getById(serviceId);
        if (!service) {
            return sendResponse(res, 404, false, 'Không tìm thấy dịch vụ');
        }

        // Check if service is in use (unless force delete)
        if (force !== 'true') {
            const isInUse = await serviceDB.isServiceInUse(serviceId);
            if (isInUse) {
                return sendResponse(res, 409, false, 
                    'Không thể xóa dịch vụ đang được sử dụng trong booking', 
                    null, null, { 
                        suggestion: 'Vô hiệu hóa dịch vụ thay vì xóa hoặc sử dụng force=true để xóa bắt buộc' 
                    });
            }
        }

        const success = await serviceDB.delete(serviceId);
        
        if (!success) {
            return sendResponse(res, 500, false, 'Không thể xóa dịch vụ');
        }

        sendResponse(res, 200, true, `Xóa dịch vụ "${service.ServiceName}" thành công`);

    } catch (error) {
        handleError(res, error, 'Lỗi khi xóa dịch vụ');
    }
});

// ✅ THÊM: GET /api/services/categories - Get all categories
router.get('/categories', async (req, res) => {
    try {
        console.log('📋 Getting all service categories');
        
        const categories = await serviceDB.getAllCategories();
        
        sendResponse(res, 200, true, 'Lấy danh sách danh mục thành công', {
            categories: categories,
            total: categories.length
        });

    } catch (error) {
        handleError(res, error, 'Lỗi khi lấy danh sách danh mục');
    }
});

// ✅ THÊM: POST /api/services/bulk - Bulk operations
router.post('/bulk', async (req, res) => {
    try {
        const { action, serviceIds, data } = req.body;
        
        if (!action || !Array.isArray(serviceIds) || serviceIds.length === 0) {
            return sendResponse(res, 400, false, 'Thiếu thông tin action hoặc serviceIds');
        }

        console.log(`🔄 Bulk operation: ${action} for ${serviceIds.length} services`);

        let result;
        switch (action) {
            case 'activate':
                result = await serviceDB.bulkUpdateStatus(serviceIds, true);
                break;
            case 'deactivate':
                result = await serviceDB.bulkUpdateStatus(serviceIds, false);
                break;
            case 'delete':
                result = await serviceDB.bulkDelete(serviceIds);
                break;
            case 'updateCategory':
                if (!data?.category) {
                    return sendResponse(res, 400, false, 'Thiếu thông tin category');
                }
                result = await serviceDB.bulkUpdateCategory(serviceIds, data.category);
                break;
            default:
                return sendResponse(res, 400, false, 'Action không hợp lệ');
        }

        sendResponse(res, 200, true, `Thực hiện ${action} thành công`, result);

    } catch (error) {
        handleError(res, error, 'Lỗi khi thực hiện bulk operation');
    }
});

// ✅ THÊM: GET /api/services/:id/usage - Check service usage
router.get('/:id/usage', async (req, res) => {
    try {
        const serviceId = parseInt(req.params.id);
        
        if (isNaN(serviceId) || serviceId <= 0) {
            return sendResponse(res, 400, false, 'ID dịch vụ không hợp lệ');
        }

        const usage = await serviceDB.getServiceUsage(serviceId);
        
        sendResponse(res, 200, true, 'Lấy thông tin sử dụng dịch vụ thành công', usage);

    } catch (error) {
        handleError(res, error, 'Lỗi khi kiểm tra sử dụng dịch vụ');
    }
});

export default router;