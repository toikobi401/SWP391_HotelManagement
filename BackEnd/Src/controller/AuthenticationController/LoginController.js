import express from 'express';
import UserDBContext from '../../dal/UserDBContext.js';
import path from 'path';

const router = express.Router();

// POST /login - handle login form submission
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userDB = new UserDBContext();
    try {
        const user = await userDB.getUserByUsernameAndPassword(username, password);
        if (user) {
            req.session.user = user;
            // Redirect to home page (index.html) in Frontend
            res.redirect('/index.html');
        } else {
            // Redirect back to login.html with error message
            res.redirect('/login.html?error=' + encodeURIComponent('Tên đăng nhập hoặc mật khẩu không đúng.'));
        }
    } catch (err) {
        res.redirect('/login.html?error=' + encodeURIComponent('Đã xảy ra lỗi khi đăng nhập.'));
    }
});

// GET /login.html - serve the static login page
router.get('/login.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'Frontend', 'login.html'));
});

// GET /index.html - serve the static index page
router.get('/index.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'Frontend', 'index.html'));
});

export default router;
