import DBContext from './DBContext.js';
import User from '../model/User.js';

class UserDBContext extends DBContext {
    async searchByName(search) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('search', `%${search}%`)
                .query('SELECT * FROM [User] WHERE Username LIKE @search');
            return result.recordset.map(record => User.fromDatabase(record));
        } catch (error) {
            throw new Error('Error searching users by name: ' + error.message);
        }
    }

    async list() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query('SELECT * FROM [User]');
            return result.recordset.map(record => User.fromDatabase(record));
        } catch (error) {
            throw new Error('Error getting users: ' + error.message);
        }
    }

    async get(id) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('id', id)
                .query('SELECT * FROM [User] WHERE UserID = @id');
            if (result.recordset.length === 0) return null;
            return User.fromDatabase(result.recordset[0]);
        } catch (error) {
            throw new Error('Error getting user by ID: ' + error.message);
        }
    }

    async getUserByEmail(email) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('email', email)
                .query('SELECT * FROM [User] WHERE Email = @email');
            if (result.recordset.length === 0) return null;
            return User.fromDatabase(result.recordset[0]);
        } catch (error) {
            throw new Error('Error getting user by email: ' + error.message);
        }
    }

    async getUserByUsernameAndPassword(username, password) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('username', username)
                .input('password', password)
                .query('SELECT * FROM [User] WHERE Username = @username AND Password = @password');
            if (result.recordset.length === 0) return null;
            return User.fromDatabase(result.recordset[0]);
        } catch (error) {
            throw new Error('Error getting user by username and password: ' + error.message);
        }
    }

    async insert(user) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('username', user.Username)
                .input('password', user.Password)
                .input('email', user.Email)
                .input('status', user.Status)
                .input('image', user.Image)
                .input('phoneNumber', user.PhoneNumber)
                .query(`
                    INSERT INTO [User] (Username, Password, Email, Status, Image, PhoneNumber)
                    OUTPUT INSERTED.UserID
                    VALUES (@username, @password, @email, @status, @image, @phoneNumber)
                `);
            return result.recordset[0].UserID;
        } catch (error) {
            throw new Error('Error inserting user: ' + error.message);
        }
    }

    async update(user) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('id', user.UserID)
                .input('username', user.Username)
                .input('password', user.Password)
                .input('email', user.Email)
                .input('status', user.Status)
                .input('image', user.Image)
                .input('phoneNumber', user.PhoneNumber)
                .query(`
                    UPDATE [User]
                    SET Username = @username,
                        Password = @password,
                        Email = @email,
                        Status = @status,
                        Image = @image,
                        PhoneNumber = @phoneNumber
                    WHERE UserID = @id
                `);
            return true;
        } catch (error) {
            throw new Error('Error updating user: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('id', id)
                .query('DELETE FROM [User] WHERE UserID = @id');
            return true;
        } catch (error) {
            throw new Error('Error deleting user: ' + error.message);
        }
    }

    async updateStatus(id, status) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('id', id)
                .input('status', status)
                .query('UPDATE [User] SET Status = @status WHERE UserID = @id');
            return true;
        } catch (error) {
            throw new Error('Error updating user status: ' + error.message);
        }
    }
}

export default UserDBContext;
