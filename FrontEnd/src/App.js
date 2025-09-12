import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
import AdminManager from './web_page/manager/adminmanager';
import Customer from './web_page/customer/customer';
import About from './web_page/AboutUs/About';
import Payment from './web_page/payment/Payment';
import PaymentTest from './web_page/payment/PaymentTest';
import ForgotPassword from './web_page/auth/ForgotPassword';
import RoleBasedChatBot from './web_page/UI component/ChatBot/RoleBasedChatBot';
import ProtectedRoute from './components/RouteProtection/ProtectedRoute';
import UnauthorizedPage from './web_page/error/UnauthorizedPage';
import InvoiceReview from './web_page/invoice/InvoiceReview';
import BlogDetail from './web_page/blog/BlogDetail';
import BlogList from './web_page/blog/BlogList';

import TransactionHistory from './web_page/transactionHistory/TransactionHistory';
import OnlineBookingForm from './web_page/onlinebooking/OnlineBookingForm'; 


import FeedbackForm from './web_page/feedback/feedback';
// ✅ SỬA: Thêm NotFoundPage component
const NotFoundPage = () => (
  <div className="container text-center mt-5">
    <h1>404 - Không tìm thấy trang</h1>
    <p>Trang bạn đang tìm kiếm không tồn tại.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
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
      
      <Router>
        {/* ✅ HEADER ở ngoài để xuất hiện trên tất cả routes */}
        <Header />
        
        <main className="main-content">
          <Routes>
              {/* Public Routes */}
              <Route path='/' element={<Home />} />
              <Route path='/about' element={<About />} />
              <Route path='/contact' element={<Contact />} />
              <Route path='/customer-feedback' element={<FeedbackForm />} />
              
              {/* ✅ THÊM: Feedback route cho user đã đăng nhập */}
              <Route path='/feedback' element={
                <ProtectedRoute>
                  <FeedbackForm />
                </ProtectedRoute>
              } />
              
              {/* ✅ Blog routes */}
              <Route path='/blogs' element={<BlogList />} />
              <Route path='/blog/:id' element={<BlogDetail />} />
              <Route path='/blogs/category/:categoryId' element={<BlogList />} />
              
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

              {/* Protected Routes - Req  uire Login */}
              <Route path='/profile' element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              


              {/* ✅ THÊM: Transaction History Route - Chỉ cho người đã đăng nhập */}
              <Route path='/transaction-history' element={
                <ProtectedRoute>
                  <TransactionHistory />
                </ProtectedRoute>
              } />

              {/* Role-based Protected Routes */}
              
              {/* ✅ SỬA: Manager Routes - sử dụng AdminManager có sẵn */}
              <Route path='/manager/*' element={
                <ProtectedRoute requiredRoles={[1]}>
                  <AdminManager />
                </ProtectedRoute>
              } />

              {/* Receptionist Routes - Role ID: 2 */}
              <Route path='/receptionist/*' element={
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


              <Route path='/rooms' element={
                <ProtectedRoute requiredRoles={[1, 2]}>
                  <div>Room Management - For Manager and Receptionist</div>
                </ProtectedRoute>
              } />

              {/* Payment Routes */}
              <Route path='/payment' element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              } />
              
              <Route path='/payment-test' element={
                <ProtectedRoute>
                  <PaymentTest />
                </ProtectedRoute>
              } />

              {/* Invoice Review Route */}
              <Route path="/invoice-review" element={<InvoiceReview />} />

              {/* online booking routes */}
              <Route path ='/booking' element={
                <ProtectedRoute>
                  <OnlineBookingForm />
                </ProtectedRoute>
              } />
              
              
              {/* Error Routes */}
              <Route path='/unauthorized' element={<UnauthorizedPage />} />
              <Route path='*' element={<NotFoundPage />} />
            </Routes>
        </main>

        <Footer />
        
        <RoleBasedChatBot />
      </Router>
    </AuthProvider>
  );
}

export default App;
