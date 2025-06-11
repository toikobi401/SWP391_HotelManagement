import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import CustomerChatBot from './CustomerChatBot';
import ReceptionistChatBot from './ReceptionistChatBot';
import ManagerChatBot from './ManagerChatBot';
import styles from './ChatBot.module.css';

const RoleBasedChatBot = () => {
    const { user, hasRole } = useAuth();
    const [activeRole, setActiveRole] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    // Debug user roles
    useEffect(() => {
        console.log('🐛 RoleBasedChatBot Debug:', {
            user: user ? {
                UserID: user.UserID,
                Username: user.Username,
                roles: user.roles
            } : 'No user',
            hasRole1: hasRole ? hasRole(1) : 'hasRole not available',
            hasRole2: hasRole ? hasRole(2) : 'hasRole not available',
            hasRole3: hasRole ? hasRole(3) : 'hasRole not available'
        });
    }, [user, hasRole]);

    // Xác định role chính của user
    useEffect(() => {
        if (user && user.roles && user.roles.length > 0) {
            // Ưu tiên: Manager > Receptionist > Customer
            if (hasRole && hasRole(1)) {
                setActiveRole('manager');
                console.log('✅ Setting role: manager');
            } else if (hasRole && hasRole(2)) {
                setActiveRole('receptionist');
                console.log('✅ Setting role: receptionist');
            } else if (hasRole && hasRole(3)) {
                setActiveRole('customer');
                console.log('✅ Setting role: customer');
            } else {
                setActiveRole('customer'); // Default
                console.log('✅ Setting role: customer (default fallback)');
            }
        } else {
            setActiveRole('customer'); // Guest user
            console.log('✅ Setting role: customer (guest user)');
        }
    }, [user, hasRole]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const getRoleIcon = () => {
        switch (activeRole) {
            case 'manager':
                return 'fas fa-shield-alt';
            case 'receptionist':
                // ✅ THAY ĐỔI ICON CHO RECEPTIONIST
                return 'fas fa-concierge-bell'; // Thay vì 'fas fa-cog'
            case 'customer':
            default:
                return 'fas fa-user-circle'; // Cũng cải thiện icon customer
        }
    };

    const getRoleColor = () => {
        switch (activeRole) {
            case 'manager':
                return '#ff6b6b';
            case 'receptionist':
                return '#ffd700';
            case 'customer':
            default:
                return '#4ecdc4';
        }
    };

    const getRoleName = () => {
        switch (activeRole) {
            case 'manager':
                return 'Quản lý';
            case 'receptionist':
                return 'Lễ tân';
            case 'customer':
            default:
                return 'Khách hàng';
        }
    };

    // Render appropriate chatbot based on role
    const renderChatBot = () => {
        const commonProps = {
            isOpen,
            onClose: () => setIsOpen(false),
            user
        };

        switch (activeRole) {
            case 'manager':
                return <ManagerChatBot {...commonProps} />;
            case 'receptionist':
                return <ReceptionistChatBot {...commonProps} />;
            case 'customer':
            default:
                return <CustomerChatBot {...commonProps} />;
        }
    };

    // Early return if no active role yet
    if (!activeRole) {
        return (
            <div 
                className={styles['chatbot-toggle']} 
                onClick={toggleChat}
                style={{
                    background: 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                    cursor: 'wait'
                }}
            >
                <i className="fas fa-spinner fa-spin"></i>
            </div>
        );
    }

    return (
        <>
            {/* Role-based Chat Toggle Button */}
            <div 
                className={`${styles['chatbot-toggle']} ${isOpen ? styles.active : ''}`} 
                onClick={toggleChat}
                style={{
                    background: isOpen 
                        ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
                        : `linear-gradient(135deg, ${getRoleColor()} 0%, ${getRoleColor()}dd 100%)`
                }}
            >
                {isOpen ? (
                    <i className="fas fa-times"></i>
                ) : (
                    <div className={styles['chat-icon']}>
                        <i className={getRoleIcon()}></i>
                        <div 
                            className={styles['chat-badge']}
                            style={{ 
                                background: `linear-gradient(135deg, ${getRoleColor()} 0%, ${getRoleColor()}cc 100%)` 
                            }}
                        >
                            {getRoleName().charAt(0)}
                        </div>
                    </div>
                )}
            </div>

            {/* Role Selector (if user has multiple roles) */}
            {isOpen && user && user.roles && user.roles.length > 1 && (
                <div className={styles['role-selector']}>
                    <div className={styles['role-selector-content']}>
                        <small>Chọn vai trò:</small>
                        <div className={styles['role-buttons']}>
                            {hasRole && hasRole(1) && (
                                <button
                                    className={`${styles['role-btn']} ${activeRole === 'manager' ? styles.active : ''}`}
                                    onClick={() => setActiveRole('manager')}
                                >
                                    <i className="fas fa-shield-alt"></i>
                                    Quản lý
                                </button>
                            )}
                            {hasRole && hasRole(2) && (
                                <button
                                    className={`${styles['role-btn']} ${activeRole === 'receptionist' ? styles.active : ''}`}
                                    onClick={() => setActiveRole('receptionist')}
                                >
                                    {/* ✅ CẬP NHẬT ICON Ở ĐÂY CŨNG */}
                                    <i className="fas fa-concierge-bell"></i>
                                    Lễ tân
                                </button>
                            )}
                            {hasRole && hasRole(3) && (
                                <button
                                    className={`${styles['role-btn']} ${activeRole === 'customer' ? styles.active : ''}`}
                                    onClick={() => setActiveRole('customer')}
                                >
                                    {/* ✅ CẢI THIỆN ICON CUSTOMER */}
                                    <i className="fas fa-user-circle"></i>
                                    Khách hàng
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Render Role-specific ChatBot */}
            {renderChatBot()}
        </>
    );
};

export default RoleBasedChatBot;