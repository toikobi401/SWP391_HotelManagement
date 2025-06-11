import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './sidebar.module.css';

const Sidebar = ({ 
    activeTab, 
    onTabChange, 
    isCollapsed, 
    onToggleCollapse,
    menuItems = [],
    bottomItems = []
}) => {
    const navigate = useNavigate();

    const handleProfileClick = () => {
        navigate('/profile');
    };

    // Default menu items nếu không được truyền vào
    const defaultMenuItems = [
        {
            id: 'rooms',
            title: 'Quản lý phòng',
            icon: 'fas fa-bed',
            onClick: () => onTabChange('rooms')
        },
        {
            id: 'booking',
            title: 'Đặt phòng mới',
            icon: 'fas fa-calendar-plus',
            onClick: () => onTabChange('booking')
        }
    ];

    // Default bottom items nếu không được truyền vào
    const defaultBottomItems = [
        {
            id: 'profile',
            title: 'Hồ sơ cá nhân',
            icon: 'fas fa-user',
            onClick: handleProfileClick
        }
    ];

    const items = menuItems.length > 0 ? menuItems : defaultMenuItems;
    const bottomItemsList = bottomItems.length > 0 ? bottomItems : defaultBottomItems;

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            {/* Header của sidebar */}
            <div className={styles.sidebar_header}>
                <h5 className={styles.sidebar_title}>
                    <i className="fas fa-cogs"></i>
                    {!isCollapsed && <span>Menu quản lý</span>}
                </h5>
                <button 
                    className={styles.sidebar_toggle}
                    onClick={onToggleCollapse}
                    title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                >
                    <i className={`fas ${isCollapsed ? 'fa-angle-right' : 'fa-angle-left'}`}></i>
                </button>
            </div>
            
            {/* Navigation */}
            <nav className={styles.sidebar_nav}>
                {/* Main navigation items */}
                <div className={styles.sidebar_nav_main}>
                    {items.map((item) => (
                        <button 
                            key={item.id}
                            className={`${styles.sidebar_nav_item} ${activeTab === item.id ? styles.active : ''}`}
                            onClick={item.onClick}
                            title={item.title}
                        >
                            <i className={item.icon}></i>
                            {!isCollapsed && <span>{item.title}</span>}
                        </button>
                    ))}
                </div>
                
                {/* Bottom navigation items */}
                <div className={styles.sidebar_nav_bottom}>
                    <div className={styles.sidebar_divider}></div>
                    {bottomItemsList.map((item) => (
                        <button 
                            key={item.id}
                            className={styles.sidebar_nav_item}
                            onClick={item.onClick}
                            title={item.title}
                        >
                            <i className={item.icon}></i>
                            {!isCollapsed && <span>{item.title}</span>}
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;