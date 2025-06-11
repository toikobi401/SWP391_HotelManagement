class User {
    constructor() {
        this.UserID = 0;
        this.Username = '';
        this.Password = '';
        this.Email = '';
        this.Status = true;
        this.Image = null;
        this.PhoneNumber = '';
        this.Fullname = '';
        this.roles = []; // Thêm array roles
    }

    // Thêm methods để quản lý roles
    addRole(role) {
        if (!this.roles.find(r => r.RoleID === role.RoleID)) {
            this.roles.push(role);
        }
    }

    removeRole(roleId) {
        this.roles = this.roles.filter(r => r.RoleID !== roleId);
    }

    hasRole(roleId) {
        return this.roles.some(r => r.RoleID === roleId);
    }

    getRoleCount() {
        return this.roles.length;
    }

    static fromDatabase(data) {
        const user = new User();
        Object.assign(user, {
            UserID: data.UserID,
            Username: data.Username,
            Email: data.Email,
            Status: data.Status,
            Image: data.Image,
            PhoneNumber: data.PhoneNumber ? data.PhoneNumber.trim() : '',
            Fullname: data.Fullname || '',
            Password: data.Password || '',
            roles: [] // Khởi tạo roles array rỗng
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
            Fullname: this.Fullname,
            Image: this.Image,
            roles: this.roles, // Thêm roles vào JSON
            roleCount: this.getRoleCount()
        };
    }

    isActive() {
        return this.Status;
    }
}

export default User;
