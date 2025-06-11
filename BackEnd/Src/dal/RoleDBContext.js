import DBContext from './DBContext.js';
import Role from '../model/Role.js';
import sql from 'mssql';

class RoleDBContext extends DBContext {
    async list() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query('SELECT RoleID, RoleName, Description FROM [Role]'); // Sửa query
            return result.recordset.map(record => Role.fromDatabase(record));
        } catch (error) {
            throw new Error('Error getting roles: ' + error.message);
        }
    }

    async get(id) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('id', id)
                .query('SELECT RoleID, RoleName, Description FROM [Role] WHERE RoleID = @id'); // Sửa query
            if (result.recordset.length === 0) return null;
            return Role.fromDatabase(result.recordset[0]);
        } catch (error) {
            throw new Error('Error getting role by ID: ' + error.message);
        }
    }

    async insert(role) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('roleName', role.RoleName) // Đổi từ roleURL thành roleName
                .input('description', role.Description)
                .query(`
                    INSERT INTO [Role] (RoleName, Description)
                    OUTPUT INSERTED.RoleID
                    VALUES (@roleName, @description)
                `);
            return result.recordset[0].RoleID;
        } catch (error) {
            throw new Error('Error inserting role: ' + error.message);
        }
    }

    async update(role) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('id', role.RoleID)
                .input('roleName', role.RoleName) // Đổi từ roleURL thành roleName
                .input('description', role.Description)
                .query(`
                    UPDATE [Role]
                    SET RoleName = @roleName,
                        Description = @description
                    WHERE RoleID = @id
                `);
            return true;
        } catch (error) {
            throw new Error('Error updating role: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('id', id)
                .query('DELETE FROM [Role] WHERE RoleID = @id');
            return true;
        } catch (error) {
            throw new Error('Error deleting role: ' + error.message);
        }
    }

    async addUserToRole(roleId, userId) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('RoleID', sql.Int, roleId)
                .input('UserID', sql.Int, userId)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM UserRole WHERE RoleID = @RoleID AND UserID = @UserID)
                    INSERT INTO UserRole (RoleID, UserID) VALUES (@RoleID, @UserID)
                `);
            return true;
        } catch (error) {
            console.error(`Error adding user ${userId} to role ${roleId}:`, error);
            throw error;
        }
    }

    async removeUserFromRole(roleId, userId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoleID', sql.Int, roleId)
                .input('UserID', sql.Int, userId)
                .query(`
                    DELETE FROM UserRole 
                    WHERE RoleID = @RoleID AND UserID = @UserID
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error removing user ${userId} from role ${roleId}:`, error);
            throw error;
        }
    }

    async getRoleWithUsers(roleId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoleID', sql.Int, roleId)
                .query(`
                    SELECT r.RoleID, r.RoleName, r.Description,
                           u.UserID, u.Username, u.Fullname, u.Email, u.PhoneNumber
                    FROM [Role] r
                    LEFT JOIN UserRole ur ON r.RoleID = ur.RoleID
                    LEFT JOIN [User] u ON ur.UserID = u.UserID
                    WHERE r.RoleID = @RoleID
                `);
            
            if (result.recordset.length === 0) return null;

            const role = Role.fromDatabase(result.recordset[0]);
            
            // Thêm users vào role
            result.recordset.forEach(record => {
                if (record.UserID) {
                    role.addUser({
                        UserID: record.UserID,
                        Username: record.Username,
                        Fullname: record.Fullname,
                        Email: record.Email,
                        PhoneNumber: record.PhoneNumber
                    });
                }
            });

            return role;
        } catch (error) {
            console.error(`Error getting role ${roleId} with users:`, error);
            throw error;
        }
    }

    async getRoleStats() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        r.RoleID,
                        r.RoleName,
                        r.Description,
                        COUNT(ur.UserID) as UserCount
                    FROM [Role] r
                    LEFT JOIN UserRole ur ON r.RoleID = ur.RoleID
                    GROUP BY r.RoleID, r.RoleName, r.Description
                    ORDER BY UserCount DESC, r.RoleName
                `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error getting role statistics:', error);
            throw error;
        }
    }
}

export default RoleDBContext;
