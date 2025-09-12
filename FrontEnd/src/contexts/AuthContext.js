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

    // ✅ Helper function để tối ưu user data trước khi lưu vào localStorage
    const optimizeUserDataForStorage = (userData) => {
        if (!userData) return null;
        
        // Tạo bản copy và loại bỏ image để tiết kiệm dung lượng
        const optimizedUser = {
            ...userData,
            // Chỉ lưu thông tin cần thiết
            UserID: userData.UserID,
            Username: userData.Username,
            Email: userData.Email,
            Fullname: userData.Fullname,
            PhoneNumber: userData.PhoneNumber,
            Status: userData.Status,
            roles: userData.roles || [],
            // ✅ KHÔNG lưu Image vào localStorage
            Image: null
        };
        
        return optimizedUser;
    };

    // ✅ Helper function để lấy full user data (bao gồm image) từ API
    const getFullUserData = async (userId) => {
        try {
            const response = await api.get(`/api/profile/${userId}`);
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching full user data:', error);
            return null;
        }
    };

    // Initialize auth state
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                const savedUser = localStorage.getItem('user');
                
                console.log('🔍 Initializing auth...', { 
                    hasToken: !!token, 
                    hasSavedUser: !!savedUser 
                });

                if (token && savedUser) {
                    try {
                        const userData = JSON.parse(savedUser);
                        console.log('✅ Found saved user data');
                        
                        // ✅ Lấy full user data từ API (bao gồm image)
                        const fullUserData = await getFullUserData(userData.UserID);
                        
                        if (fullUserData) {
                            setUser(fullUserData);
                            setIsLoggedIn(true);
                            console.log('✅ Auth initialized with full user data');
                        } else {
                            // Fallback to saved user data nếu API call thất bại
                            setUser(userData);
                            setIsLoggedIn(true);
                            console.log('✅ Auth initialized with saved user data');
                        }
                    } catch (error) {
                        console.error('❌ Error parsing saved user data:', error);
                        clearAuthData();
                    }
                } else {
                    console.log('❌ No token or saved user found');
                    clearAuthData();
                }
            } catch (error) {
                console.error('❌ Auth initialization error:', error);
                clearAuthData();
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const clearAuthData = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsLoggedIn(false);
    };

    const login = async (userData) => {
        try {
            console.log('🔑 Login called with user data:', {
                userId: userData?.UserID,
                username: userData?.Username,
                hasImage: !!userData?.Image,
                imageSize: userData?.Image ? userData.Image.length : 0
            });

            // ✅ Tối ưu user data trước khi lưu
            const optimizedUserData = optimizeUserDataForStorage(userData);
            
            // ✅ Kiểm tra kích thước trước khi lưu
            const userDataString = JSON.stringify(optimizedUserData);
            const sizeInBytes = new Blob([userDataString]).size;
            const sizeInMB = sizeInBytes / (1024 * 1024);
            
            console.log('📊 Optimized user data size:', {
                bytes: sizeInBytes,
                mb: sizeInMB.toFixed(2),
                hasImage: !!optimizedUserData?.Image
            });

            // ✅ Lưu optimized user data vào localStorage
            try {
                localStorage.setItem('user', userDataString);
                console.log('✅ User data saved to localStorage successfully');
            } catch (storageError) {
                console.error('❌ LocalStorage error:', storageError);
                
                // ✅ Fallback: Thử lưu user data tối thiểu nhất
                const minimalUserData = {
                    UserID: userData.UserID,
                    Username: userData.Username,
                    Email: userData.Email,
                    roles: userData.roles || []
                };
                
                try {
                    localStorage.setItem('user', JSON.stringify(minimalUserData));
                    console.log('✅ Minimal user data saved as fallback');
                } catch (minimalError) {
                    console.error('❌ Even minimal user data failed to save:', minimalError);
                    // Vẫn có thể đăng nhập mà không lưu vào localStorage
                }
            }

            // ✅ Set full user data vào state (bao gồm image)
            setUser(userData);
            setIsLoggedIn(true);
            
            console.log('✅ Login successful');
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('🚪 Logging out...');
            
            // Call logout API
            await api.post('/api/logout');
            
            clearAuthData();
            console.log('✅ Logout successful');
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Even if API call fails, still clear local data
            clearAuthData();
        }
    };

    const updateUser = (userData) => {
        try {
            console.log('🔄 Updating user data...');
            
            // ✅ Update state với full user data
            setUser(userData);
            
            // ✅ Update localStorage với optimized data
            const optimizedUserData = optimizeUserDataForStorage(userData);
            try {
                localStorage.setItem('user', JSON.stringify(optimizedUserData));
                console.log('✅ User data updated in localStorage');
            } catch (storageError) {
                console.warn('⚠️ Could not update localStorage:', storageError);
                // Không throw error, chỉ log warning
            }
        } catch (error) {
            console.error('❌ Error updating user:', error);
        }
    };

    // ✅ Các helper functions khác giữ nguyên
    const hasRole = (roleId) => {
        if (!user || !user.roles) return false;
        return user.roles.some(role => role.RoleID === roleId);
    };

    const hasAnyRole = (roleIds) => {
        if (!user || !user.roles || !Array.isArray(roleIds)) return false;
        return roleIds.some(roleId => hasRole(roleId));
    };

    const getUserRoles = () => {
        return user?.roles || [];
    };

    const getPrimaryRole = () => {
        const roles = getUserRoles();
        if (roles.length === 0) return null;
        
        // Priority: Manager > Receptionist > Customer
        const priority = { 1: 3, 2: 2, 3: 1 };
        return roles.sort((a, b) => 
            (priority[b.RoleID] || 0) - (priority[a.RoleID] || 0)
        )[0];
    };

    const hasPermission = (permission) => {
        const userRoles = getUserRoles();
        return userRoles.some(role => 
            role.permissions && role.permissions.includes(permission)
        );
    };

    const isStaff = () => hasAnyRole([1, 2]);
    const isManager = () => hasRole(1);
    const isReceptionist = () => hasRole(2);
    const isCustomer = () => hasRole(3);

    const value = {
        user,
        isLoggedIn,
        loading,
        login,
        logout,
        updateUser,
        hasRole,
        hasAnyRole,
        getUserRoles,
        getPrimaryRole,
        hasPermission,
        isStaff,
        isManager,
        isReceptionist,
        isCustomer
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};