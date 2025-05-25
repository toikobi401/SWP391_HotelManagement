class Role {
    constructor() {
        this.RoleID = 0;
        this.RoleURL = '';
        this.Description = '';
        this.users = [];
        this.features = [];
    }

    addUser(user) {
        this.users.push(user);
    }

    addFeature(feature) {
        this.features.push(feature);
    }

    static fromDatabase(data) {
        const role = new Role3();
        role.RoleID = data.RoleID;
        role.RoleURL = data.RoleURL;
        role.Description = data.Description || '';
        // users and features can be added later if needed
        return role;
    }
}

export default Role3;
