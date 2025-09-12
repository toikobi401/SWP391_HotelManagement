import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ShowAvailableRoom from '../roomAvailability/ShowAvailableRoom';
import ReceptionistBookingForm from './ReceptionistBookingForm';
import ReceptionistInvoiceList from '../invoice/receptionist/ReceptionistInvoiceList';
import Submittion from './submittion/SubmittionPage';
import Sidebar from '../sidebar/sidebar';
import './receptionist.css';

function Receptionist() {
    const [activeTab, setActiveTab] = useState('rooms');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    // ✅ SỬA: Định nghĩa menu items với path đầy đủ
    const menuItems = [
        {
            id: 'rooms',
            title: 'Quản lý phòng',
            icon: 'fas fa-bed',
            path: '/receptionist/rooms',
            onClick: () => {
                handleTabChange('rooms');
                navigate('/receptionist/rooms');
            }
        },
        {
            id: 'booking',
            title: 'Đặt phòng mới',
            icon: 'fas fa-calendar-plus',
            path: '/receptionist/booking',
            onClick: () => {
                handleTabChange('booking');
                navigate('/receptionist/booking');
            }
        },
        {
            id: 'invoices',
            title: 'Quản lý hóa đơn',
            icon: 'fas fa-file-invoice-dollar',
            path: '/receptionist/invoices',
            onClick: () => {
                handleTabChange('invoices');
                navigate('/receptionist/invoices');
            }
        },
        {
            id: 'submittion',
            title: 'CheckIn/CheckOut',
            icon: 'fas fa-money-check-alt',
            path: '/receptionist/submittion',
            onClick: () => {
                handleTabChange('submittion');
                navigate('/receptionist/submittion');
            }
        }
    ];

    const bottomItems = [
        {
            id: 'profile',
            title: 'Hồ sơ cá nhân',
            icon: 'fas fa-user',
            path: '/profile',
            onClick: () => navigate('/profile')
        }
    ];

    // ✅ THÊM: Determine active tab based on current path
    React.useEffect(() => {
        const currentPath = location.pathname;
        if (currentPath.includes('/invoices')) {
            setActiveTab('invoices');
        } else if (currentPath.includes('/booking')) {
            setActiveTab('booking');
        } else {
            setActiveTab('rooms');
        }
    }, [location.pathname]);

    // ✅ SỬA: Đảm bảo sidebar luôn được render
    return (
        <div className="receptionist-page">
            {/* ✅ SIDEBAR với top: 80px */}
            <Sidebar 
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                menuItems={menuItems}
                bottomItems={bottomItems}
                variant="receptionist"
                title="Lễ tân"
            />
            
            {/* ✅ CONTENT AREA với margin-top: 80px */}
            <div 
                className={`content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                style={{
                    marginTop: '80px', // ✅ Đảm bảo không che header
                    marginLeft: sidebarCollapsed ? '70px' : '280px'
                }}
            >
                <Routes>
                    <Route path="/" element={<ShowAvailableRoom />} />
                    <Route path="/rooms" element={<ShowAvailableRoom />} />
                    <Route path="/booking" element={<ReceptionistBookingForm />} />
                    <Route path="/invoices" element={<ReceptionistInvoiceList />} />
                    <Route path="/submittion" element={<Submittion />} />
                    <Route path="*" element={<ShowAvailableRoom />} />
                </Routes>
            </div>
        </div>
    );
}

export default Receptionist;