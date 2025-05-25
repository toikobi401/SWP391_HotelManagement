import express from 'express';
import session from 'express-session';
import path from 'path';
import LoginController from './controller/AuthenticationController/LoginController.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Serve static files from Frontend
app.use(express.static(path.join(process.cwd(), '../../FrontEnd')));

// Mount login controller
app.use('/', LoginController);

// Default route: redirect to login page if not logged in
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
