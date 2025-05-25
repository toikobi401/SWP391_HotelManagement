import DBContext from './DBContext.js';
import Role from '../model/Role.js';

class RoleDBContext extends DBContext {
    async list() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query('SELECT * FROM [Role]');
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
                .query('SELECT * FROM [Role] WHERE RoleID = @id');
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
                .input('roleURL', role.RoleURL)
                .input('description', role.Description)
                .query(`
                    INSERT INTO [Role] (RoleURL, Description)
                    OUTPUT INSERTED.RoleID
                    VALUES (@roleURL, @description)
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
                .input('roleURL', role.RoleURL)
                .input('description', role.Description)
                .query(`
                    UPDATE [Role]
                    SET RoleURL = @roleURL,
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
}

export default RoleDBContext;
