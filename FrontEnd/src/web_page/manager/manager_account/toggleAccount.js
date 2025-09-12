import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import UserService from '../../../services/userService';
import { useAuth } from '../../../contexts/AuthContext';
import Portal from '../../../components/Portal/Portal'; // ✅ THÊM Portal
import './toggleAccount.css';

function RoleManagementPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [pagination, setPagination] = useState({});
    const [selectedUser, setSelectedUser] = useState(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [processingUser, setProcessingUser] = useState(null);

    // Role definitions
    const roleDefinitions = {
        1: { name: 'Manager', color: 'danger', icon: 'fas fa-crown' },
        2: { name: 'Receptionist', color: 'success', icon: 'fas fa-user-tie' },
        3: { name: 'Customer', color: 'info', icon: 'fas fa-user' }
    };

    // ✅ THÊM: useEffect để xử lý ESC key và prevent body scroll
    useEffect(() => {
        if (showRoleModal) {
            // Prevent body scroll khi modal mở
            document.body.style.overflow = 'hidden';
            
            // Handle ESC key
            const handleEscKey = (event) => {
                if (event.keyCode === 27) {
                    setShowRoleModal(false);
                }
            };
            
            document.addEventListener('keydown', handleEscKey);
            
            return () => {
                document.body.style.overflow = 'unset';
                document.removeEventListener('keydown', handleEscKey);
            };
        }
    }, [showRoleModal]);

    // Load users when component mounts or filters change
    useEffect(() => {
        loadUsers();
    }, [currentPage, searchName]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            console.log('🔍 Loading users...', { currentPage, searchName });
            
            const result = await UserService.getAllUsers(currentPage, pageSize, searchName);
            
            if (result.success) {
                // Get detailed user info with roles for each user
                const usersWithRoles = await Promise.all(
                    result.data.map(async (user) => {
                        try {
                            const userWithRoles = await UserService.getUserWithRoles(user.UserID);
                            return userWithRoles.success ? userWithRoles.data : user;
                        } catch (error) {
                            console.error(`Error loading roles for user ${user.UserID}:`, error);
                            return { ...user, roles: [] };
                        }
                    })
                );
                
                setUsers(usersWithRoles);
                setPagination(result.pagination || {});
                console.log('✅ Users loaded successfully:', usersWithRoles.length);
            } else {
                toast.error(result.message);
                setUsers([]);
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            toast.error('Lỗi khi tải danh sách người dùng');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter users based on current filters
    const filteredUsers = users.filter((user) => {
        // Exclude current manager from role changes
        if (user.UserID === currentUser?.UserID) return false;
        
        // Filter by role
        if (filterRole) {
            const hasFilterRole = user.roles?.some(role => role.RoleID === parseInt(filterRole));
            if (!hasFilterRole) return false;
        }
        
        // Filter by status
        if (filterStatus !== '') {
            const isActive = filterStatus === 'true';
            if (user.Status !== isActive) return false;
        }
        
        // Filter by date (if user has creation date)
        if (filterDate && user.CreateAt) {
            const userDate = new Date(user.CreateAt).toISOString().split('T')[0];
            if (userDate !== filterDate) return false;
        }
        
        return true;
    });

    // Get user's primary role for display
    const getUserPrimaryRole = (user) => {
        if (!user.roles || user.roles.length === 0) return { id: 3, name: 'Customer' };
        
        // Priority: Manager > Receptionist > Customer
        const roleIds = user.roles.map(r => r.RoleID);
        if (roleIds.includes(1)) return { id: 1, name: 'Manager' };
        if (roleIds.includes(2)) return { id: 2, name: 'Receptionist' };
        return { id: 3, name: 'Customer' };
    };

    // Handle role toggle
    const handleRoleToggle = async (user, targetRoleId) => {
        if (user.UserID === currentUser?.UserID) {
            toast.warning('Không thể thay đổi quyền của chính mình');
            return;
        }

        try {
            setProcessingUser(user.UserID);
            console.log(`🔄 Toggling role for user ${user.UserID} to role ${targetRoleId}`);
            
            const currentRoles = user.roles || [];
            const hasTargetRole = currentRoles.some(role => role.RoleID === targetRoleId);
            
            let result;
            if (hasTargetRole) {
                // Remove role
                result = await UserService.removeRoleFromUser(user.UserID, targetRoleId);
                if (result.success) {
                    toast.success(`Đã xóa quyền ${roleDefinitions[targetRoleId]?.name} khỏi ${user.Username}`);
                }
            } else {
                // Add role
                result = await UserService.addRoleToUser(user.UserID, targetRoleId);
                if (result.success) {
                    toast.success(`Đã thêm quyền ${roleDefinitions[targetRoleId]?.name} cho ${user.Username}`);
                }
            }
            
            if (result.success) {
                // Reload users to reflect changes
                await loadUsers();
                
                // ✅ THÊM: Cập nhật selectedUser nếu đang mở modal
                if (selectedUser && selectedUser.UserID === user.UserID) {
                    const updatedUserResult = await UserService.getUserWithRoles(user.UserID);
                    if (updatedUserResult.success) {
                        setSelectedUser(updatedUserResult.data);
                    }
                }
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('❌ Error toggling role:', error);
            toast.error('Lỗi khi thay đổi quyền người dùng');
        } finally {
            setProcessingUser(null);
        }
    };

    // Handle status toggle
    const handleStatusToggle = async (user) => {
        if (user.UserID === currentUser?.UserID) {
            toast.warning('Không thể thay đổi trạng thái của chính mình');
            return;
        }

        try {
            setProcessingUser(user.UserID);
            const newStatus = !user.Status;
            
            const result = await UserService.updateUserStatus(user.UserID, newStatus);
            
            if (result.success) {
                toast.success(`Đã ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản ${user.Username}`);
                await loadUsers();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('❌ Error toggling status:', error);
            toast.error('Lỗi khi thay đổi trạng thái người dùng');
        } finally {
            setProcessingUser(null);
        }
    };

    // Handle search
    const handleSearch = (event) => {
        if (event.key === 'Enter') {
            setCurrentPage(1);
            loadUsers();
        }
    };

    // Clear filters
    const clearFilters = () => {
        setSearchName('');
        setFilterRole('');
        setFilterDate('');
        setFilterStatus('');
        setCurrentPage(1);
    };

    // Show role management modal
    const showRoleManagement = (user) => {
        console.log('🔍 Opening role management for user:', user);
        setSelectedUser(user);
        setShowRoleModal(true);
    };

    // ✅ SỬA: Close modal function
    const closeRoleModal = () => {
        console.log('🔒 Closing role management modal');
        setShowRoleModal(false);
        setSelectedUser(null);
    };

    // ✅ SỬA: Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closeRoleModal();
        }
    };

    // ✅ SỬA: Role management modal component với Portal
    const RoleManagementModal = () => {
        if (!selectedUser) return null;

        const userRoles = selectedUser.roles || [];
        
        return (
            <Portal>
                <div 
                    className="modal fade show d-block" 
                    tabIndex="-1" 
                    style={{ zIndex: 1055 }}
                    onClick={handleBackdropClick}
                >
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
                    <div className="modal-dialog modal-lg" style={{ zIndex: 1060 }}>
                        <div className="modal-content" style={{ zIndex: 1061 }}>
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-user-cog me-2"></i>
                                    Quản lý quyền: {selectedUser.Username}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={closeRoleModal}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body" style={{ zIndex: 1062 }}>
                                <div className="user-info mb-4">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <strong>Họ tên:</strong> {selectedUser.Fullname}
                                        </div>
                                        <div className="col-md-6">
                                            <strong>Email:</strong> {selectedUser.Email}
                                        </div>
                                        <div className="col-md-6">
                                            <strong>SĐT:</strong> {selectedUser.PhoneNumber}
                                        </div>
                                        <div className="col-md-6">
                                            <strong>Trạng thái:</strong> 
                                            <span className={`badge ms-2 ${selectedUser.Status ? 'bg-success' : 'bg-danger'}`}>
                                                {selectedUser.Status ? 'Hoạt động' : 'Vô hiệu hóa'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <h6>Quyền hiện tại:</h6>
                                <div className="current-roles mb-3">
                                    {userRoles.length > 0 ? (
                                        <div className="d-flex gap-2 flex-wrap">
                                            {userRoles.map(role => (
                                                <span 
                                                    key={role.RoleID} 
                                                    className={`badge bg-${roleDefinitions[role.RoleID]?.color || 'secondary'}`}
                                                >
                                                    <i className={`${roleDefinitions[role.RoleID]?.icon || 'fas fa-user'} me-1`}></i>
                                                    {roleDefinitions[role.RoleID]?.name || role.RoleName}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-muted">Chưa có quyền nào</span>
                                    )}
                                </div>
                                
                                <h6>Thay đổi quyền:</h6>
                                <div className="role-actions">
                                    {Object.entries(roleDefinitions).map(([roleId, roleDef]) => {
                                        const hasRole = userRoles.some(role => role.RoleID === parseInt(roleId));
                                        const isProcessing = processingUser === selectedUser.UserID;
                                        
                                        return (
                                            <div key={roleId} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                                <div>
                                                    <i className={`${roleDef.icon} me-2`}></i>
                                                    {roleDef.name}
                                                </div>
                                                <button
                                                    className={`btn btn-sm ${hasRole ? 'btn-danger' : 'btn-success'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRoleToggle(selectedUser, parseInt(roleId));
                                                    }}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? (
                                                        <span className="spinner-border spinner-border-sm me-1"></span>
                                                    ) : (
                                                        <i className={`fas ${hasRole ? 'fa-minus' : 'fa-plus'} me-1`}></i>
                                                    )}
                                                    {hasRole ? 'Xóa quyền' : 'Thêm quyền'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={closeRoleModal}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Portal>
        );
    };

    return (
        <div className="role-management-page">
            <div className="container-fluid mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3>
                        <i className="fas fa-users-cog me-2"></i>
                        Quản lý phân quyền người dùng
                    </h3>
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-outline-secondary"
                            onClick={clearFilters}
                        >
                            <i className="fas fa-eraser me-1"></i>
                            Xóa bộ lọc
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={loadUsers}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm me-1"></span>
                            ) : (
                                <i className="fas fa-sync-alt me-1"></i>
                            )}
                            Làm mới
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-3">
                                <label className="form-label">Tìm kiếm:</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Tên, email, username..."
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    onKeyPress={handleSearch}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Lọc theo quyền:</label>
                                <select
                                    className="form-select"
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                >
                                    <option value="">Tất cả quyền</option>
                                    {Object.entries(roleDefinitions).map(([roleId, roleDef]) => (
                                        <option key={roleId} value={roleId}>{roleDef.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Trạng thái:</label>
                                <select
                                    className="form-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="">Tất cả</option>
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Vô hiệu hóa</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Ngày tạo:</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card bg-primary text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>Tổng người dùng</h5>
                                        <h3>{users.length}</h3>
                                    </div>
                                    <i className="fas fa-users fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-danger text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>Manager</h5>
                                        <h3>{users.filter(u => u.roles?.some(r => r.RoleID === 1)).length}</h3>
                                    </div>
                                    <i className="fas fa-crown fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-success text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>Receptionist</h5>
                                        <h3>{users.filter(u => u.roles?.some(r => r.RoleID === 2)).length}</h3>
                                    </div>
                                    <i className="fas fa-user-tie fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-info text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>Customer</h5>
                                        <h3>{users.filter(u => !u.roles?.some(r => [1, 2].includes(r.RoleID))).length}</h3>
                                    </div>
                                    <i className="fas fa-user fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">Danh sách người dùng ({filteredUsers.length})</h5>
                    </div>
                    <div className="card-body">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border" role="status">
                                    <span className="visually-hidden">Đang tải...</span>
                                </div>
                                <p className="mt-2">Đang tải danh sách người dùng...</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-bordered table-hover">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Họ tên</th>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Số điện thoại</th>
                                            <th>Quyền hiện tại</th>
                                            <th>Trạng thái</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-4">
                                                    <i className="fas fa-users fa-3x text-muted mb-3"></i>
                                                    <p className="text-muted">Không có người dùng phù hợp</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user) => {
                                                const primaryRole = getUserPrimaryRole(user);
                                                const isProcessing = processingUser === user.UserID;
                                                const isCurrentUser = user.UserID === currentUser?.UserID;
                                                
                                                return (
                                                    <tr key={user.UserID} className={isCurrentUser ? 'table-warning' : ''}>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="avatar-sm bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                                                    {user.Fullname?.charAt(0) || user.Username?.charAt(0) || 'U'}
                                                                </div>
                                                                <div>
                                                                    <strong>{user.Fullname || 'N/A'}</strong>
                                                                    {isCurrentUser && (
                                                                        <span className="badge bg-warning text-dark ms-2">Bạn</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{user.Username}</td>
                                                        <td>{user.Email}</td>
                                                        <td>{user.PhoneNumber}</td>
                                                        <td>
                                                            <div className="d-flex gap-1 flex-wrap">
                                                                {user.roles && user.roles.length > 0 ? (
                                                                    user.roles.map(role => (
                                                                        <span 
                                                                            key={role.RoleID}
                                                                            className={`badge bg-${roleDefinitions[role.RoleID]?.color || 'secondary'}`}
                                                                        >
                                                                            <i className={`${roleDefinitions[role.RoleID]?.icon || 'fas fa-user'} me-1`}></i>
                                                                            {roleDefinitions[role.RoleID]?.name || role.RoleName}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="badge bg-secondary">
                                                                        <i className="fas fa-user me-1"></i>
                                                                        Customer
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${user.Status ? 'bg-success' : 'bg-danger'}`}>
                                                                {user.Status ? 'Hoạt động' : 'Vô hiệu hóa'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="btn-group" role="group">
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        showRoleManagement(user);
                                                                    }}
                                                                    disabled={isProcessing || isCurrentUser}
                                                                    title="Quản lý quyền"
                                                                >
                                                                    <i className="fas fa-user-cog"></i>
                                                                </button>
                                                                <button
                                                                    className={`btn btn-sm ${user.Status ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleStatusToggle(user);
                                                                    }}
                                                                    disabled={isProcessing || isCurrentUser}
                                                                    title={user.Status ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                                >
                                                                    {isProcessing ? (
                                                                        <span className="spinner-border spinner-border-sm"></span>
                                                                    ) : (
                                                                        <i className={`fas ${user.Status ? 'fa-ban' : 'fa-check'}`}></i>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <nav className="d-flex justify-content-center mt-4">
                                <ul className="pagination">
                                    <li className={`page-item ${!pagination.hasPrevious ? 'disabled' : ''}`}>
                                        <button 
                                            className="page-link"
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            disabled={!pagination.hasPrevious}
                                        >
                                            Trước
                                        </button>
                                    </li>
                                    
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                                        <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                                            <button 
                                                className="page-link"
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        </li>
                                    ))}
                                    
                                    <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
                                        <button 
                                            className="page-link"
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            disabled={!pagination.hasNext}
                                        >
                                            Sau
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ SỬA: Role Management Modal sử dụng Portal */}
            {showRoleModal && <RoleManagementModal />}
        </div>
    );
}

export default RoleManagementPage;
