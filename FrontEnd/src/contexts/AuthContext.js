import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    // Initialize auth state
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const userData = localStorage.getItem('user');
                const loginStatus = localStorage.getItem('isLoggedIn');
                
                if (userData && loginStatus === 'true') {
                    const parsedUser = JSON.parse(userData);
                    
                    // Verify user session with backend
                    const response = await fetch('http://localhost:3000/api/verify-session', {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const { user: serverUser } = await response.json();
                        // Update user data from server
                        setUser(serverUser || parsedUser);
                        setIsLoggedIn(true);
                        console.log('✅ Session verified, user restored');
                    } else {
                        // Session invalid, clear local storage
                        console.log('❌ Invalid session, clearing local storage');
                        clearAuthData();
                    }
                } else {
                    console.log('📝 No existing session found');
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                clearAuthData();
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const clearAuthData = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        setUser(null);
        setIsLoggedIn(false);
    };

    const login = (userData) => {
        try {
            console.log('🔐 Login attempt with user data:', userData);
            
            if (!userData) {
                throw new Error('Invalid user data');
            }

            // Store user data
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('isLoggedIn', 'true');
            
            setUser(userData);
            setIsLoggedIn(true);
            
            console.log('✅ Login successful:', {
                UserID: userData.UserID,
                Username: userData.Username,
                roles: userData.roles?.length || 0
            });
            
            return true;
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Lỗi đăng nhập: ' + error.message);
            return false;
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            
            // Call backend logout
            await fetch('http://localhost:3000/api/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            clearAuthData();
            console.log('✅ Logout successful');
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            // Clear local data even if backend call fails
            clearAuthData();
            return true; // Still return true to allow logout
        } finally {
            setLoading(false);
        }
    };

    const hasRole = (roleId) => {
        if (!user?.roles) {
            console.log('🚫 No roles found for user');
            return false;
        }

        const userHasRole = user.roles.some(role => role.RoleID === roleId);
        console.log(`🔍 Checking role ${roleId}:`, userHasRole);
        return userHasRole;
    };

    const hasAnyRole = (roleIds) => {
        return roleIds.some(roleId => hasRole(roleId));
    };

    const getUserRoles = () => {
        return user?.roles || [];
    };

    const getPrimaryRole = () => {
        if (!user?.roles?.length) return null;
        
        // Priority: Manager > Receptionist > Customer
        if (hasRole(1)) return { id: 1, name: 'Quản lý' };
        if (hasRole(2)) return { id: 2, name: 'Lễ tân' };
        if (hasRole(3)) return { id: 3, name: 'Khách hàng' };
        
        return user.roles[0]; // Fallback to first role
    };

    const updateUser = (userData) => {
        try {
            const updatedUser = { ...user, ...userData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            console.log('✅ User data updated');
            return true;
        } catch (error) {
            console.error('Update user error:', error);
            return false;
        }
    };

    const value = {
        user,
        isLoggedIn,
        loading,
        login,
        logout,
        hasRole,
        hasAnyRole,
        getUserRoles,
        getPrimaryRole,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};