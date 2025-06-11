import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';

import Header from './web_page/UI component/header/header';
import Home from './web_page/home/home';
import Login from './web_page/login/login';
import Register from './web_page/register/register';
import Profile from './web_page/profile/profile';
import Footer from './web_page/UI component/footer/footer';
import Contact from './web_page/contactUs/Contact';
import LoginSuccess from './web_page/login/LoginSuccess';
import Receptionist from './web_page/receptionist/receptionist';
import Manager from './web_page/manager/manager';
import Customer from './web_page/customer/customer';
import About from './web_page/AboutUs/About';
import PaymentTest from './web_page/payment/PaymentTest';
import ForgotPassword from './web_page/auth/ForgotPassword';
import RoleBasedChatBot from './web_page/UI component/ChatBot/RoleBasedChatBot';
import ProtectedRoute from './components/RouteProtection/ProtectedRoute';
import UnauthorizedPage from './web_page/error/UnauthorizedPage';
import NotFoundPage from './web_page/error/NotFoundPage';

function App() {
  return (
    <Router>
      <div className="App">
        <AuthProvider>
          <Header />

          <main>
            <Routes>
              {/* Public Routes */}
              <Route path='/' element={<Home />} />
              <Route path='/about' element={<About />} />
              <Route path='/contact' element={<Contact />} />
              
              {/* Auth Routes - Only for non-logged users */}
              <Route path='/login' element={
                <ProtectedRoute allowGuest={true}>
                  <Login />
                </ProtectedRoute>
              } />
              <Route path='/register' element={
                <ProtectedRoute allowGuest={true}>
                  <Register />
                </ProtectedRoute>
              } />
              <Route path='/forgot-password' element={
                <ProtectedRoute allowGuest={true}>
                  <ForgotPassword />
                </ProtectedRoute>
              } />
              <Route path='/login-success' element={
                <ProtectedRoute allowGuest={true}>
                  <LoginSuccess />
                </ProtectedRoute>
              } />

              {/* Protected Routes - Require Login */}
              <Route path='/profile' element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* Role-based Protected Routes */}
              
              {/* Manager Routes - Role ID: 1 */}
              <Route path='/manager' element={
                <ProtectedRoute requiredRoles={[1]}>
                  <Manager />
                </ProtectedRoute>
              } />

              {/* Receptionist Routes - Role ID: 2 */}
              <Route path='/receptionist' element={
                <ProtectedRoute requiredRoles={[2]}>
                  <Receptionist />
                </ProtectedRoute>
              } />

              {/* Customer Routes - Role ID: 3 */}
              <Route path='/customer' element={
                <ProtectedRoute requiredRoles={[3]}>
                  <Customer />
                </ProtectedRoute>
              } />

              {/* Multi-role Routes */}
              <Route path='/booking' element={
                <ProtectedRoute requiredRoles={[2, 3]}>
                  <div>Booking Page - For Receptionist and Customer</div>
                </ProtectedRoute>
              } />

              <Route path='/rooms' element={
                <ProtectedRoute requiredRoles={[1, 2]}>
                  <div>Room Management - For Manager and Receptionist</div>
                </ProtectedRoute>
              } />

              {/* Test Routes */}
              <Route path='/payment-test' element={
                <ProtectedRoute>
                  <PaymentTest />
                </ProtectedRoute>
              } />

              {/* Error Routes */}
              <Route path='/unauthorized' element={<UnauthorizedPage />} />
              <Route path='*' element={<NotFoundPage />} />
            </Routes>
          </main>

          <Footer />
          
          <RoleBasedChatBot />
        </AuthProvider>
        
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
