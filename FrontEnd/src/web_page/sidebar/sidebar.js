import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './sidebar.module.css';

const Sidebar = ({ 
    isCollapsed, 
    onToggleCollapse,
    menuItems = [],
    bottomItems = [],
    variant = "default",  // ✅ Thêm variant
    title = "Menu quản lý"  // ✅ Thêm title
}) => {
    const navigate = useNavigate();

    // Default menu items nếu không được truyền vào
    const defaultMenuItems = [
        {
            id: 'rooms',
            title: 'Quản lý phòng',
            icon: 'fas fa-bed',
            path: '/rooms'
        },
        {
            id: 'booking',
            title: 'Đặt phòng mới',
            icon: 'fas fa-calendar-plus',
            path: '/booking'
        }
    ];

    const defaultBottomItems = [
        {
            id: 'profile',
            title: 'Hồ sơ cá nhân',
            icon: 'fas fa-user',
            path: '/profile'
        }
    ];

    const items = menuItems.length > 0 ? menuItems : defaultMenuItems;
    const bottomItemsList = bottomItems.length > 0 ? bottomItems : defaultBottomItems;

    // ✅ Handle click với priority: onClick > path
    const handleItemClick = (item) => {
        console.log('🔗 Sidebar item clicked:', item);
        
        if (item.onClick && typeof item.onClick === 'function') {
            // Ưu tiên onClick nếu có
            item.onClick();
        } else if (item.path) {
            // Fallback sử dụng path
            navigate(item.path);
        } else {
            console.warn('⚠️ No onClick or path defined for item:', item);
        }
    };

    // ✅ Get sidebar title based on variant
    const getSidebarTitle = () => {
        const titleMap = {
            manager: 'Admin Manager',
            receptionist: 'Lễ tân',
            customer: 'Khách hàng',
            default: title
        };
        return titleMap[variant] || title;
    };

    // ✅ Get sidebar icon based on variant
    const getSidebarIcon = () => {
        const iconMap = {
            manager: 'fas fa-shield-alt',
            receptionist: 'fas fa-concierge-bell',
            customer: 'fas fa-user-circle',
            default: 'fas fa-cogs'
        };
        return iconMap[variant] || 'fas fa-cogs';
    };

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            {/* Header của sidebar */}
            <div className={styles.sidebar_header}>
                <h5 className={styles.sidebar_title}>
                    <i className={getSidebarIcon()}></i>
                    {!isCollapsed && <span>{getSidebarTitle()}</span>}
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
                            className={styles.sidebar_nav_item}
                            onClick={() => handleItemClick(item)}  // ✅ Sử dụng handleItemClick
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
                            onClick={() => handleItemClick(item)}  // ✅ Sử dụng handleItemClick
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