class Role {
    constructor() {
        this.RoleID = 0;
        this.RoleName = ''; // Đổi từ RoleURL thành RoleName
        this.Description = '';
        this.users = [];
        this.features = [];
    }

    addUser(user) {
        // Kiểm tra trùng lặp trước khi thêm
        if (!this.users.find(u => u.UserID === user.UserID)) {
            this.users.push(user);
        }
    }

    addFeature(feature) {
        // Kiểm tra trùng lặp trước khi thêm
        if (!this.features.find(f => f.FeatureID === feature.FeatureID)) {
            this.features.push(feature);
        }
    }

    // Thêm các method để quản lý users
    removeUser(userId) {
        this.users = this.users.filter(u => u.UserID !== userId);
    }

    hasUser(userId) {
        return this.users.some(u => u.UserID === userId);
    }

    getUserCount() {
        return this.users.length;
    }

    // Thêm các method để quản lý features
    removeFeature(featureId) {
        this.features = this.features.filter(f => f.FeatureID !== featureId);
    }

    hasFeature(featureId) {
        return this.features.some(f => f.FeatureID === featureId);
    }

    getFeatureCount() {
        return this.features.length;
    }

    static fromDatabase(data) {
        const role = new Role();
        role.RoleID = data.RoleID;
        role.RoleName = data.RoleName; // Đổi từ RoleURL thành RoleName
        role.Description = data.Description || '';
        // users and features can be added later if needed
        return role;
    }

    toJSON() {
        return {
            RoleID: this.RoleID,
            RoleName: this.RoleName, // Đổi từ RoleURL thành RoleName
            Description: this.Description,
            users: this.users,
            features: this.features,
            userCount: this.getUserCount(),
            featureCount: this.getFeatureCount()
        };
    }
}

export default Role;
