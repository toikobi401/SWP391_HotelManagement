import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ShowAvailableRoom from '../roomAvailability/ShowAvailableRoom';
import ReceptionistBookingForm from './ReceptionistBookingForm';
import Sidebar from '../sidebar/sidebar';
import './receptionist.css';

function Receptionist() {
    const [activeTab, setActiveTab] = useState('rooms');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const navigate = useNavigate();

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    // Định nghĩa menu items cho receptionist
    const menuItems = [
        {
            id: 'rooms',
            title: 'Quản lý phòng',
            icon: 'fas fa-bed',
            onClick: () => handleTabChange('rooms')
        },
        {
            id: 'booking',
            title: 'Đặt phòng mới',
            icon: 'fas fa-calendar-plus',
            onClick: () => handleTabChange('booking')
        }
    ];

    const bottomItems = [
        {
            id: 'profile',
            title: 'Hồ sơ cá nhân',
            icon: 'fas fa-user',
            onClick: () => navigate('/profile')
        }
    ];

    return (
        <div className="receptionist-page">
            <div className="receptionist-layout">
                {/* Sidebar Navigation - Sử dụng component Sidebar */}
                <Sidebar 
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={toggleSidebar}
                    menuItems={menuItems}
                    bottomItems={bottomItems}
                />

                {/* Main Content */}
                <div className={`receptionist-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                    <div className="content-wrapper">
                        {activeTab === 'rooms' && <ShowAvailableRoom />}
                        {activeTab === 'booking' && <ReceptionistBookingForm />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Receptionist;