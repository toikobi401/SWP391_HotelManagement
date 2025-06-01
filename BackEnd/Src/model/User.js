class User {
    constructor() {
        this.UserID = 0;
        this.Username = '';
        this.Password = '';
        this.Email = '';
        this.Status = true;
        this.Image = null;
        this.PhoneNumber = '';
        this.RoleID = 0;
        this.roles = [];
    }

    addRole(role) {
        this.roles.push(role);
    }

    hasRole(roleName) {
        return this.roles.some(role => role.RoleName === roleName);
    }

    hasFeature(featureURL) {
        return this.roles.some(role => 
            role.features.some(feature => feature.FeatureURL === featureURL)
        );
    }

    static fromDatabase(data) {
        const user = new User();
        Object.assign(user, {
            UserID: data.UserID,
            Username: data.Username,
            Password: data.Password,
            Email: data.Email,
            Status: data.Status,
            Image: data.Image,
            PhoneNumber: data.PhoneNumber ? data.PhoneNumber.trim() : '', // Thêm kiểm tra null
            RoleID: data.RoleID
        });
        return user;
    }

    toJSON() {
        return {
            UserID: this.UserID,
            Username: this.Username,
            Email: this.Email,
            Status: this.Status,
            PhoneNumber: this.PhoneNumber,
            RoleID: this.RoleID,
            roles: this.roles
        };
    }

    isActive() {
        return this.Status;
    }

    hasAnyRole(roleNames) {
        return roleNames.some(roleName => this.hasRole(roleName));
    }
}

export default User;
