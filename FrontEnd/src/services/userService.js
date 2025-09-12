import axiosInstance from '../config/axios';

class UserService {
    // Get all users with pagination and search
    async getAllUsers(page = 1, pageSize = 20, search = '') {
        try {
            const response = await axiosInstance.get('/api/users', {
                params: { page, pageSize, search }
            });
            return {
                success: true,
                data: response.data.data,
                pagination: response.data.pagination,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi lấy danh sách người dùng'
            };
        }
    }

    // Get user by ID with roles
    async getUserWithRoles(userId) {
        try {
            const response = await axiosInstance.get(`/api/users/${userId}/with-roles`);
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi lấy thông tin người dùng'
            };
        }
    }

    // Add role to user
    async addRoleToUser(userId, roleId) {
        try {
            const response = await axiosInstance.post(`/api/users/${userId}/roles`, {
                roleId: roleId
            });
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi thêm quyền cho người dùng'
            };
        }
    }

    // Remove role from user
    async removeRoleFromUser(userId, roleId) {
        try {
            const response = await axiosInstance.delete(`/api/users/${userId}/roles/${roleId}`);
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi xóa quyền người dùng'
            };
        }
    }

    // Update user status
    async updateUserStatus(userId, status) {
        try {
            const response = await axiosInstance.patch(`/api/users/${userId}/status`, {
                status: status
            });
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi cập nhật trạng thái người dùng'
            };
        }
    }

    // Create new user
    async createUser(userData) {
        try {
            const response = await axiosInstance.post('/api/users', userData);
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi tạo người dùng mới',
                errors: error.response?.data?.errors
            };
        }
    }

    // Update user
    async updateUser(userId, userData) {
        try {
            const response = await axiosInstance.put(`/api/users/${userId}`, userData);
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi cập nhật người dùng',
                errors: error.response?.data?.errors
            };
        }
    }

    // Delete user
    async deleteUser(userId) {
        try {
            const response = await axiosInstance.delete(`/api/users/${userId}`);
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Lỗi khi xóa người dùng'
            };
        }
    }

    // Validate user data
    async validateUserData(userData) {
        try {
            const response = await axiosInstance.post('/api/users/validate', userData);
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Dữ liệu không hợp lệ',
                errors: error.response?.data?.errors
            };
        }
    }
}

export default new UserService();