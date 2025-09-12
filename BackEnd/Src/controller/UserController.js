import express from 'express';
import UserDBContext from '../dal/UserDBContext.js';
import User from '../model/User.js';
import bcrypt from 'bcryptjs'; // ✅ Thay đổi này
import multer from 'multer';
import path from 'path';

const router = express.Router();
const userDB = new UserDBContext();

// Multer configuration for image upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware for logging requests
router.use((req, res, next) => {
    console.log(`👤 User API: ${req.method} ${req.path} - ${new Date().toISOString()}`);
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
    console.error('❌ UserController Error:', error);
    
    if (error.name === 'ValidationError') {
        return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, error.errors);
    }
    
    if (error.code === 'ECONNREFUSED') {
        return sendResponse(res, 503, false, 'Không thể kết nối đến cơ sở dữ liệu');
    }
    
    sendResponse(res, 500, false, defaultMessage);
};

// Helper function to validate user data
const validateUserData = (userData, isUpdate = false) => {
    const errors = [];
    
    if (!isUpdate || userData.Username) {
        if (!userData.Username || userData.Username.trim().length < 3) {
            errors.push('Username phải có ít nhất 3 ký tự');
        }
    }
    
    if (!isUpdate || userData.Email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userData.Email || !emailRegex.test(userData.Email)) {
            errors.push('Email không hợp lệ');
        }
    }
    
    if (!isUpdate || userData.PhoneNumber) {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!userData.PhoneNumber || !phoneRegex.test(userData.PhoneNumber)) {
            errors.push('Số điện thoại phải có 10-11 chữ số');
        }
    }
    
    if (!isUpdate || userData.Fullname) {
        if (!userData.Fullname || userData.Fullname.trim().length < 2) {
            errors.push('Họ tên phải có ít nhất 2 ký tự');
        }
    }
    
    if (!isUpdate && (!userData.Password || userData.Password.length < 6)) {
        errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// GET /api/users - Get all users with search and pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
        const search = req.query.search || '';
        
        console.log(`📋 Getting users - Page: ${page}, Size: ${pageSize}, Search: "${search}"`);
        
        if (page < 1 || pageSize < 1) {
            return sendResponse(res, 400, false, 'Page và pageSize phải là số dương');
        }
        
        let users;
        
        if (search.trim()) {
            users = await userDB.searchByName(search);
        } else {
            users = await userDB.list();
        }
        
        // Calculate pagination
        const totalCount = users.length;
        const totalPages = Math.ceil(totalCount / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedUsers = users.slice(startIndex, endIndex);
        
        const pagination = {
            currentPage: page,
            pageSize: pageSize,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1
        };
        
        // Set pagination headers
        res.setHeader('X-Total-Count', totalCount);
        res.setHeader('X-Total-Pages', totalPages);
        res.setHeader('X-Current-Page', page);
        res.setHeader('X-Page-Size', pageSize);
        
        sendResponse(res, 200, true, 'Lấy danh sách người dùng thành công', paginatedUsers, null, pagination);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi lấy danh sách người dùng');
    }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        console.log(`🔍 Getting user by ID: ${userId}`);
        
        const user = await userDB.get(userId);
        
        if (!user) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        sendResponse(res, 200, true, 'Lấy thông tin người dùng thành công', user);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi lấy thông tin người dùng');
    }
});

// GET /api/users/:id/with-roles - Get user with roles
router.get('/:id/with-roles', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        console.log(`🔍 Getting user with roles by ID: ${userId}`);
        
        const user = await userDB.getUserWithRoles(userId);
        
        if (!user) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        sendResponse(res, 200, true, 'Lấy thông tin người dùng và quyền thành công', user);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi lấy thông tin người dùng và quyền');
    }
});

// GET /api/users/username/:username - Get user by username
router.get('/username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username || username.trim().length === 0) {
            return sendResponse(res, 400, false, 'Username không được để trống');
        }
        
        console.log(`🔍 Getting user by username: ${username}`);
        
        const user = await userDB.getUserByUsername(username);
        
        if (!user) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        // Remove password from response
        const userResponse = User.fromDatabase(user);
        delete userResponse.Password;
        
        sendResponse(res, 200, true, 'Lấy thông tin người dùng thành công', userResponse);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi lấy thông tin người dùng');
    }
});

// GET /api/users/email/:email - Get user by email
router.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!email || email.trim().length === 0) {
            return sendResponse(res, 400, false, 'Email không được để trống');
        }
        
        console.log(`🔍 Getting user by email: ${email}`);
        
        const user = await userDB.getUserByEmail(email);
        
        if (!user) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        // Remove password from response
        const userResponse = User.fromDatabase(user);
        delete userResponse.Password;
        
        sendResponse(res, 200, true, 'Lấy thông tin người dùng thành công', userResponse);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi lấy thông tin người dùng');
    }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
    try {
        const userData = req.body;
        
        console.log('➕ Creating new user:', JSON.stringify({
            Username: userData.Username,
            Email: userData.Email,
            PhoneNumber: userData.PhoneNumber,
            Fullname: userData.Fullname
        }, null, 2));
        
        // Validate user data
        const validation = validateUserData(userData);
        if (!validation.isValid) {
            return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validation.errors);
        }
        
        // Check for existing username
        const existingUsername = await userDB.getUserByUsername(userData.Username);
        if (existingUsername) {
            return sendResponse(res, 409, false, 'Username đã tồn tại');
        }
        
        // Check for existing email
        const existingEmail = await userDB.getUserByEmail(userData.Email);
        if (existingEmail) {
            return sendResponse(res, 409, false, 'Email đã tồn tại');
        }
        
        // Check for existing phone
        const existingPhone = await userDB.getUserByPhone(userData.PhoneNumber);
        if (existingPhone) {
            return sendResponse(res, 409, false, 'Số điện thoại đã tồn tại');
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.Password, saltRounds);
        
        // Create user object
        const user = new User();
        user.Username = userData.Username.trim();
        user.Password = hashedPassword;
        user.Email = userData.Email.trim();
        user.PhoneNumber = userData.PhoneNumber.trim();
        user.Fullname = userData.Fullname.trim();
        user.Status = userData.Status !== undefined ? userData.Status : true;
        user.Image = userData.Image || null;
        
        const userId = await userDB.insert(user);
        
        // Get the created user
        const createdUser = await userDB.get(userId);
        delete createdUser.Password; // Remove password from response
        
        sendResponse(res, 201, true, 'Tạo người dùng mới thành công', createdUser);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi tạo người dùng mới');
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const updateData = req.body;
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        console.log(`🔄 Updating user ${userId}:`, JSON.stringify(updateData, null, 2));
        
        // Check if user exists
        const existingUser = await userDB.get(userId);
        if (!existingUser) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        // Validate update data
        const validation = validateUserData(updateData, true);
        if (!validation.isValid) {
            return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validation.errors);
        }
        
        // Check for duplicate username (if changed)
        if (updateData.Username && updateData.Username !== existingUser.Username) {
            const existingUsername = await userDB.getUserByUsername(updateData.Username);
            if (existingUsername) {
                return sendResponse(res, 409, false, 'Username đã tồn tại');
            }
        }
        
        // Check for duplicate email (if changed)
        if (updateData.Email && updateData.Email !== existingUser.Email) {
            const existingEmail = await userDB.getUserByEmail(updateData.Email);
            if (existingEmail) {
                return sendResponse(res, 409, false, 'Email đã tồn tại');
            }
        }
        
        // Check for duplicate phone (if changed)
        if (updateData.PhoneNumber && updateData.PhoneNumber !== existingUser.PhoneNumber.trim()) {
            const existingPhone = await userDB.getUserByPhone(updateData.PhoneNumber);
            if (existingPhone) {
                return sendResponse(res, 409, false, 'Số điện thoại đã tồn tại');
            }
        }
        
        // Prepare update data
        const userData = {
            Username: updateData.Username || existingUser.Username,
            Fullname: updateData.Fullname || existingUser.Fullname,
            Email: updateData.Email || existingUser.Email,
            PhoneNumber: updateData.PhoneNumber || existingUser.PhoneNumber,
            Status: updateData.Status !== undefined ? updateData.Status : existingUser.Status,
            Password: existingUser.Password // Keep existing password unless changed
        };
        
        // Hash new password if provided
        if (updateData.Password) {
            const saltRounds = 10;
            userData.Password = await bcrypt.hash(updateData.Password, saltRounds);
        }
        
        const updatedUser = await userDB.update(userId, userData);
        delete updatedUser.Password; // Remove password from response
        
        sendResponse(res, 200, true, 'Cập nhật người dùng thành công', updatedUser);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi cập nhật người dùng');
    }
});

// PATCH /api/users/:id/status - Update user status
router.patch('/:id/status', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        if (typeof status !== 'boolean') {
            return sendResponse(res, 400, false, 'Status phải là boolean');
        }
        
        console.log(`🔄 Updating user ${userId} status to: ${status}`);
        
        // Check if user exists
        const existingUser = await userDB.get(userId);
        if (!existingUser) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        const success = await userDB.updateStatus(userId, status);
        
        if (!success) {
            return sendResponse(res, 500, false, 'Không thể cập nhật trạng thái người dùng');
        }
        
        sendResponse(res, 200, true, `${status ? 'Kích hoạt' : 'Vô hiệu hóa'} người dùng thành công`);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi cập nhật trạng thái người dùng');
    }
});

// POST /api/users/:id/image - Upload user profile image
router.post('/:id/image', upload.single('image'), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        if (!req.file) {
            return sendResponse(res, 400, false, 'Không có file ảnh được tải lên');
        }
        
        console.log(`📷 Uploading image for user ${userId}`);
        
        // Check if user exists
        const existingUser = await userDB.get(userId);
        if (!existingUser) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        const updatedUser = await userDB.updateProfileImage(userId, req.file.buffer);
        delete updatedUser.Password; // Remove password from response
        
        sendResponse(res, 200, true, 'Cập nhật ảnh đại diện thành công', updatedUser);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi cập nhật ảnh đại diện');
    }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        console.log(`🗑️ Deleting user: ${userId}`);
        
        // Check if user exists
        const existingUser = await userDB.get(userId);
        if (!existingUser) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        const success = await userDB.delete(userId);
        
        if (!success) {
            return sendResponse(res, 500, false, 'Không thể xóa người dùng');
        }
        
        sendResponse(res, 200, true, 'Xóa người dùng thành công');
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi xóa người dùng');
    }
});

// POST /api/users/:id/roles - Add role to user
router.post('/:id/roles', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { roleId } = req.body;
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        if (!roleId || roleId <= 0) {
            return sendResponse(res, 400, false, 'ID vai trò không hợp lệ');
        }
        
        console.log(`➕ Adding role ${roleId} to user ${userId}`);
        
        // Check if user exists
        const existingUser = await userDB.get(userId);
        if (!existingUser) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        const success = await userDB.addRoleToUser(userId, roleId);
        
        if (!success) {
            return sendResponse(res, 500, false, 'Không thể thêm vai trò cho người dùng');
        }
        
        // Get updated user with roles
        const updatedUser = await userDB.getUserWithRoles(userId);
        delete updatedUser.Password;
        
        sendResponse(res, 200, true, 'Thêm vai trò cho người dùng thành công', updatedUser);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi thêm vai trò cho người dùng');
    }
});

// DELETE /api/users/:id/roles/:roleId - Remove role from user
router.delete('/:id/roles/:roleId', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const roleId = parseInt(req.params.roleId);
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        if (!roleId || roleId <= 0) {
            return sendResponse(res, 400, false, 'ID vai trò không hợp lệ');
        }
        
        console.log(`➖ Removing role ${roleId} from user ${userId}`);
        
        // Check if user exists
        const existingUser = await userDB.get(userId);
        if (!existingUser) {
            return sendResponse(res, 404, false, 'Không tìm thấy người dùng');
        }
        
        const success = await userDB.removeRoleFromUser(userId, roleId);
        
        if (!success) {
            return sendResponse(res, 404, false, 'Người dùng không có vai trò này hoặc không thể xóa');
        }
        
        // Get updated user with roles
        const updatedUser = await userDB.getUserWithRoles(userId);
        delete updatedUser.Password;
        
        sendResponse(res, 200, true, 'Xóa vai trò khỏi người dùng thành công', updatedUser);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi xóa vai trò khỏi người dùng');
    }
});

// GET /api/users/:id/roles/debug - Debug user roles
router.get('/:id/roles/debug', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (!userId || userId <= 0) {
            return sendResponse(res, 400, false, 'ID người dùng không hợp lệ');
        }
        
        console.log(`🔍 Debug roles for user ${userId}`);
        
        const debugInfo = await userDB.getUserRolesDebug(userId);
        
        sendResponse(res, 200, true, 'Debug thông tin vai trò người dùng', debugInfo);
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi debug vai trò người dùng');
    }
});

// POST /api/users/validate - Validate user data without creating
router.post('/validate', async (req, res) => {
    try {
        const userData = req.body;
        
        console.log('✅ Validating user data:', JSON.stringify({
            Username: userData.Username,
            Email: userData.Email,
            PhoneNumber: userData.PhoneNumber,
            Fullname: userData.Fullname
        }, null, 2));
        
        // Validate user data
        const validation = validateUserData(userData);
        if (!validation.isValid) {
            return sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, validation.errors);
        }
        
        // Check for existing username
        const existingUsername = await userDB.getUserByUsername(userData.Username);
        if (existingUsername) {
            return sendResponse(res, 409, false, 'Username đã tồn tại', {
                duplicate: true,
                field: 'username'
            });
        }
        
        // Check for existing email
        const existingEmail = await userDB.getUserByEmail(userData.Email);
        if (existingEmail) {
            return sendResponse(res, 409, false, 'Email đã tồn tại', {
                duplicate: true,
                field: 'email'
            });
        }
        
        // Check for existing phone
        const existingPhone = await userDB.getUserByPhone(userData.PhoneNumber);
        if (existingPhone) {
            return sendResponse(res, 409, false, 'Số điện thoại đã tồn tại', {
                duplicate: true,
                field: 'phone'
            });
        }
        
        sendResponse(res, 200, true, 'Dữ liệu hợp lệ', {
            isValid: true,
            validatedData: {
                Username: userData.Username.trim(),
                Email: userData.Email.trim(),
                PhoneNumber: userData.PhoneNumber.trim(),
                Fullname: userData.Fullname.trim()
            }
        });
        
    } catch (error) {
        handleError(res, error, 'Lỗi khi validate dữ liệu người dùng');
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('❌ Unhandled error in User controller:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return sendResponse(res, 400, false, 'File ảnh quá lớn (tối đa 5MB)');
        }
        return sendResponse(res, 400, false, 'Lỗi upload file: ' + error.message);
    }
    
    sendResponse(res, 500, false, 'Đã xảy ra lỗi không mong muốn');
});

// 404 handler for undefined routes
router.use('*', (req, res) => {
    sendResponse(res, 404, false, `Endpoint ${req.method} ${req.originalUrl} không tồn tại`);
});

export default router;