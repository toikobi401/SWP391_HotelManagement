import express from 'express';
import multer from 'multer';
import UserDBContext from '../../dal/UserDBContext.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Define the route explicitly
router.post('/register', upload.single('avatar'), async (req, res) => {
    try {
        const { fullname, username, email, phone, password } = req.body;
        
        console.log('Received registration data:', {
            fullname,
            username,
            email,
            phone,
            hasAvatar: !!req.file
        });

        const userDB = new UserDBContext();

        // Kiểm tra username
        const existingUser = await userDB.getUserByUsername(username);
        if (existingUser) {
            console.log('Username already exists:', username);
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập đã tồn tại',
                field: 'username'
            });
        }

        // Kiểm tra email
        const existingEmail = await userDB.getUserByEmail(email);
        if (existingEmail) {
            console.log('Email already exists:', email);
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng',
                field: 'email'
            });
        }

        // Kiểm tra số điện thoại
        const existingPhone = await userDB.getUserByPhone(phone);
        if (existingPhone) {
            console.log('Phone number already exists:', phone);
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại đã được sử dụng',
                field: 'phone'
            });
        }

        console.log('All validation passed, creating new user');

        const result = await userDB.insert({
            Username: username,
            Password: password,
            Email: email,
            Status: true,
            Image: req.file ? req.file.buffer : null,
            PhoneNumber: phone,
            Fullname: fullname
        });

        console.log('User created successfully with ID:', result);

        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            userId: result
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng ký: ' + error.message
        });
    }
});

export default router;