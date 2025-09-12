import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../sidebar/sidebar';
import ShowAvailableRoom from '../roomAvailability/ShowAvailableRoom';
import ReceptionistBookingForm from '../receptionist/ReceptionistBookingForm';
import ReceptionistInvoiceList from '../invoice/receptionist/ReceptionistInvoiceList';
import Create from './manager_room/createRoom';
import WriteBlog from './create_blog/WriteBlog';
import EditRoomForm from './manager_room/EditRoomForm';
import RoleManagementPage from './manager_account/toggleAccount';
import ManageFeedback from './manager_feedback/ManageFeedback';
import PromotionList from './manager_promotion/PromotionList';
import AddPromotion from './manager_promotion/AddPromotion';
import ServiceList from './manager_service/ServiceList'; // ✅ CHỈ IMPORT ServiceList
import IncomeReport from './manager_revenuereport/IncomeReport';
import ReportDetail from './manager_revenuereport/ReportDetail';
import './adminmanager.css';

function AdminManager() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    useEffect(() => {
        if (location.pathname === '/manager' || location.pathname === '/manager/') {
            navigate('/manager/rooms');
        }
    }, [location.pathname, navigate]);

    const menuItems = [
        {
            id: 'rooms',
            title: 'Quản lý phòng',
            icon: 'fas fa-bed',
            path: '/manager/rooms'
        },
        {
            id: 'invoices',
            title: 'Quản lý hóa đơn',
            icon: 'fas fa-file-invoice-dollar',
            path: '/manager/invoices'
        },
        {
            id: 'create-room',
            title: 'Tạo phòng mới',
            icon: 'fas fa-plus-circle',
            path: '/manager/create-room'
        },
        {
            id: 'accounts',
            title: 'Quản lý tài khoản',
            icon: 'fas fa-users-cog',
            path: '/manager/accounts'
        },
        {
            id: 'feedback',
            title: 'Quản lý phản hồi',
            icon: 'fas fa-comments',
            path: '/manager/feedback'
        },
        {
            id: 'blog',
            title: 'Viết blog',
            icon: 'fas fa-edit',
            path: '/manager/blog'
        }, 
        {
            id: 'promotions',
            title: 'Quản lý khuyến mãi',
            icon: 'fas fa-tags',
            path: '/manager/promotions'
        },
        {
            id: 'services',
            title: 'Quản lý dịch vụ',
            icon: 'fas fa-concierge-bell',
            path: '/manager/service'
        },
        // {
        //     id: 'loyalty-points',
        //     title: 'Quản lý điểm thưởng',
        //     icon: 'fas fa-star',
        //     path: '/manager/loyalty-points'
        // },
        {
            id: 'income-report',
            title: 'Báo cáo doanh thu',
            icon: 'fas fa-chart-line',
            path: '/manager/income-report'  
        }
    ];

    const bottomItems = [
        {
            id: 'profile',
            title: 'Hồ sơ cá nhân',
            icon: 'fas fa-user',
            path: '/profile'
        }
    ];

    return (
        <div className="admin-manager-page">
            <Sidebar 
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={toggleSidebar}
                menuItems={menuItems}
                bottomItems={bottomItems}
                variant="manager"
                title="Quản lý"
            />
            
            <div className={`content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Routes>
                    <Route path="/" element={<ShowAvailableRoom />} />
                    <Route path="/rooms" element={<ShowAvailableRoom />} />
                    <Route path="/booking" element={<ReceptionistBookingForm />} />
                    <Route path="/invoices" element={<ReceptionistInvoiceList />} />
                    <Route path="/create-room" element={<Create />} />
                    <Route path="/edit-room/:roomId" element={<EditRoomForm />} />
                    <Route path="/accounts" element={<RoleManagementPage />} />
                    <Route path="/feedback" element={<ManageFeedback />} />
                    <Route path="/blog" element={<WriteBlog />} />
                    <Route path="/promotions" element={<PromotionList />} />
                    <Route path="/promotions/add" element={<AddPromotion />} /> 
                    <Route path="/service" element={<ServiceList />} />
                    {/* <Route path="/loyalty-points" element={<LoyaltyPoint />} /> */}
                    <Route path="/income-report" element={<IncomeReport />} />
                    <Route path="/report-detail" element={<ReportDetail />} />
                </Routes>
            </div>
        </div>
    );
}

export default AdminManager;