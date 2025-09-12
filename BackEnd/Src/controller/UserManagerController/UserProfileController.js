import express from 'express';
import UserDBContext from '../../dal/UserDBContext.js';
import multer from 'multer';

const router = express.Router();
const userDB = new UserDBContext();

// Multer config for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload file ảnh'), false);
        }
    }
});

// Get user profile with roles
router.get('/:id', async (req, res) => {
    console.log('GET /profile/:id request received', {
        userId: req.params.id,
        headers: req.headers,
        cookies: req.cookies
    });

    try {
        const userId = req.params.id;
        console.log('Attempting to fetch user with ID:', userId);
        
        // Sử dụng getUserWithRoles thay vì get
        const user = await userDB.getUserWithRoles(userId);
        
        if (!user) {
            console.log('User not found for ID:', userId);
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        console.log('User found:', {
            id: user.UserID,
            username: user.Username,
            email: user.Email,
            hasImage: !!user.Image,
            rolesCount: user.roles?.length || 0
        });

        // Log thêm thông tin roles
        console.log('User found with roles:', {
            id: user.UserID,
            username: user.Username,
            email: user.Email,
            rolesCount: user.roles?.length || 0,
            roles: user.roles
        });

        // Convert image to base64 if exists
        const responseData = {
            ...user.toJSON(),
            Image: user.Image ? user.Image.toString('base64') : null,
            roles: user.roles || [] // Đảm bảo roles luôn có
        };

        res.json(responseData);
    } catch (error) {
        console.error('Profile fetch error:', {
            error: error.message,
            stack: error.stack,
            userId: req.params.id
        });
        res.status(500).json({ 
            message: 'Error fetching user profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update profile picture endpoint
router.put('/:id/image', upload.single('image'), async (req, res) => {
    try {
        const userId = req.params.id;
        
        // ✅ THÊM: Validate userId trước khi xử lý
        if (!userId || userId === 'undefined' || userId === 'null') {
            return res.status(400).json({
                success: false,
                message: 'User ID không hợp lệ'
            });
        }

        // ✅ THÊM: Validate userId là số
        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId) || numericUserId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'User ID phải là số nguyên dương'
            });
        }

        console.log('Updating profile image for user:', numericUserId);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Không có file ảnh được upload'
            });
        }

        // Validate file size
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: 'File ảnh quá lớn (tối đa 5MB)'
            });
        }

        // ✅ SỬA: Sử dụng numericUserId thay vì userId
        const result = await userDB.updateProfileImage(numericUserId, req.file.buffer);

        if (result) {
            res.json({
                success: true,
                message: 'Cập nhật ảnh đại diện thành công'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
    } catch (error) {
        console.error('Profile image update error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi cập nhật ảnh đại diện: ' + error.message
        });
    }
});

// Update profile information endpoint
router.put('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, fullname, email, phoneNumber, status } = req.body;

        console.log('Updating profile for user:', { userId, userData: req.body });

        // Basic validation
        if (!username || !fullname || !email) {
            return res.status(400).json({
                success: false,
                message: 'Username, Full Name and Email are required'
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Phone number format validation (optional)
        if (phoneNumber) {
            const phoneRegex = /^[0-9]{10,11}$/;
            if (!phoneRegex.test(phoneNumber)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
            }
        }

        // Check for duplicates
        const [existingUsername, existingEmail, existingPhone] = await Promise.all([
            userDB.getUserByUsername(username),
            userDB.getUserByEmail(email),
            phoneNumber ? userDB.getUserByPhone(phoneNumber) : null
        ]);

        // Check username
        if (existingUsername && existingUsername.UserID !== parseInt(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Username is already taken'
            });
        }

        // Check email
        if (existingEmail && existingEmail.UserID !== parseInt(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Email is already registered'
            });
        }

        // Check phone number
        if (existingPhone && existingPhone.UserID !== parseInt(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is already registered'
            });
        }

        // If all validations pass, update user data
        const result = await userDB.update(userId, {
            Username: username.trim(),
            Fullname: fullname.trim(),
            Email: email.trim(),
            PhoneNumber: phoneNumber ? phoneNumber.trim() : null,
            Status: Boolean(status)
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: result
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;