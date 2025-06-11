import DBContext from './DBContext.js';
import User from '../model/User.js';
import sql from 'mssql';

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

    async getUserByUsername(username) {
        try {
            console.log('Checking username:', username);
            const pool = await this.pool;
            const result = await pool.request()
                .input('username', sql.NVarChar(150), username)
                .query('SELECT * FROM [User] WHERE Username = @username');
            return result.recordset[0];
        } catch (error) {
            console.error('Error checking username:', error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            console.log('Checking email:', email);
            const pool = await this.pool;
            const result = await pool.request()
                .input('email', sql.NVarChar(150), email)
                .query('SELECT * FROM [User] WHERE Email = @email');
            return result.recordset[0];
        } catch (error) {
            console.error('Error checking email:', error);
            throw error;
        }
    }

    async getUserByPhone(phone) {
        try {
            console.log('Checking phone:', phone);
            const pool = await this.pool;
            const result = await pool.request()
                .input('phoneNumber', sql.NChar(50), phone)
                .query('SELECT * FROM [User] WHERE PhoneNumber = @phoneNumber');
            return result.recordset[0];
        } catch (error) {
            console.error('Error checking phone:', error);
            throw error;
        }
    }

    async getUserByUsernameAndPassword(username, password) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('username', username)
                .input('password', password)
                .query(`
                    SELECT 
                        UserID, 
                        Username, 
                        Email,    
                        Status, 
                        Image, 
                        PhoneNumber,
                        Fullname
                    FROM [User] 
                    WHERE Username = @username 
                    AND Password = @password
                `);
            
            if (result.recordset.length === 0) return null;
            const user = User.fromDatabase(result.recordset[0]);
            console.log('User data retrieved:', user);
            return user;
        } catch (error) {
            console.error('Database error:', error);
            throw new Error('Error getting user by username and password: ' + error.message);
        }
    }

    async insert(user) {
        try {
            console.log('Attempting database connection for user insertion');
            const pool = await this.pool;
            
            console.log('Preparing database query with parameters:', {
                username: user.Username,
                email: user.Email,
                phoneNumber: user.PhoneNumber,
                fullname: user.Fullname,
                hasImage: !!user.Image
            });

            // Convert null to SQL NULL for image if not provided
            const imageValue = user.Image || null;

            const result = await pool.request()
                .input('username', sql.NVarChar(150), user.Username)
                .input('password', sql.NVarChar(150), user.Password)
                .input('email', sql.NVarChar(150), user.Email)
                .input('status', sql.Bit, user.Status)
                .input('image', sql.VarBinary(sql.MAX), imageValue)
                .input('phoneNumber', sql.NChar(50), user.PhoneNumber)
                .input('fullname', sql.NVarChar(150), user.Fullname)
                .query(`
                    INSERT INTO [User] (
                        Username, 
                        Password, 
                        Email, 
                        Status, 
                        Image, 
                        PhoneNumber, 
                        Fullname
                    )
                    OUTPUT INSERTED.UserID
                    VALUES (
                        @username,
                        @password,
                        @email,
                        @status,
                        @image,
                        @phoneNumber,
                        @fullname
                    )
                `);

            console.log('Database query executed successfully');
            return result.recordset[0].UserID;
        } catch (error) {
            console.error('Database error during user insertion:', error);
            console.error('Stack trace:', error.stack);
            throw new Error(`Error inserting user: ${error.message}`);
        }
    }

    async updateProfileImage(userId, imageBuffer) {
        try {
            console.log('Updating profile image for user:', userId);
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('UserID', sql.Int, userId)
                .input('Image', sql.VarBinary(sql.MAX), imageBuffer)
                .query(`
                    UPDATE [User]
                    SET Image = @Image
                    WHERE UserID = @UserID;
                    
                    SELECT * FROM [User] WHERE UserID = @UserID;
                `);

            if (result.recordset.length === 0) {
                throw new Error('User not found after image update');
            }

            return User.fromDatabase(result.recordset[0]);
        } catch (error) {
            console.error('Database image update error:', error);
            throw new Error(`Error updating user image: ${error.message}`);
        }
    }

    async update(userId, userData) {
        try {
            console.log('Updating user data:', { userId, userData });
            const pool = await this.pool;
            
            // QUAN TRỌNG: Trim PhoneNumber để loại bỏ spaces
            const trimmedPhoneNumber = userData.PhoneNumber ? userData.PhoneNumber.trim() : null;
            
            const result = await pool.request()
                .input('UserID', sql.Int, userId)
                .input('Username', sql.NVarChar(150), userData.Username)
                .input('Fullname', sql.NVarChar(150), userData.Fullname)
                .input('Email', sql.NVarChar(150), userData.Email)
                .input('PhoneNumber', sql.NChar(50), trimmedPhoneNumber)
                .input('Status', sql.Bit, userData.Status)
                .input('Password', sql.NVarChar(150), userData.Password) // THÊM PARAMETER PASSWORD
                .query(`
                    UPDATE [User]
                    SET Username = @Username,
                        Fullname = @Fullname,
                        Email = @Email,
                        PhoneNumber = @PhoneNumber,
                        Status = @Status,
                        Password = @Password
                    WHERE UserID = @UserID;
                    
                    SELECT * FROM [User] WHERE UserID = @UserID;
                `);

        if (result.recordset.length === 0) {
            throw new Error('User not found after update');
        }

        console.log('✅ User updated successfully:', {
            UserID: result.recordset[0].UserID,
            Username: result.recordset[0].Username,
            PasswordUpdated: !!result.recordset[0].Password
        });

        return User.fromDatabase(result.recordset[0]);
    } catch (error) {
        console.error('Database update error:', error);
        throw new Error(`Error updating user: ${error.message}`);
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

    // THÊM CÁC METHODS MỚI CHO USER-ROLE
    async addRoleToUser(userId, roleId) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('UserID', sql.Int, userId)
                .input('RoleID', sql.Int, roleId)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM UserRole WHERE UserID = @UserID AND RoleID = @RoleID)
                    INSERT INTO UserRole (UserID, RoleID) VALUES (@UserID, @RoleID)
                `);
            return true;
        } catch (error) {
            console.error(`Error adding role ${roleId} to user ${userId}:`, error);
            throw error;
        }
    }

    async removeRoleFromUser(userId, roleId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('UserID', sql.Int, userId)
                .input('RoleID', sql.Int, roleId)
                .query(`
                    DELETE FROM UserRole 
                    WHERE UserID = @UserID AND RoleID = @RoleID
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error removing role ${roleId} from user ${userId}:`, error);
            throw error;
        }
    }

    async getUserWithRoles(userId) {
        try {
            console.log('Getting user with roles for UserID:', userId);
            const pool = await this.pool;
            
            // Query để lấy user và roles - sửa RoleURL thành RoleName
            const result = await pool.request()
                .input('UserID', sql.Int, userId)
                .query(`
                    SELECT u.UserID, u.Username, u.Email, u.Status, u.Image, u.PhoneNumber, u.Fullname, u.Password,
                           r.RoleID, r.RoleName, r.Description as RoleDescription
                    FROM [User] u
                    LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                    LEFT JOIN [Role] r ON ur.RoleID = r.RoleID
                    WHERE u.UserID = @UserID
                `);
            
            console.log('Raw query result:', result.recordset);
            
            if (result.recordset.length === 0) {
                console.log('No user found with ID:', userId);
                return null;
            }

            // Tạo user object từ record đầu tiên
            const firstRecord = result.recordset[0];
            const user = User.fromDatabase(firstRecord);
            
            console.log('User created from first record:', {
                UserID: user.UserID,
                Username: user.Username,
                rolesArrayLength: user.roles.length
            });
            
            // Thêm tất cả roles vào user
            result.recordset.forEach((record, index) => {
                console.log(`Processing record ${index}:`, {
                    RoleID: record.RoleID,
                    RoleName: record.RoleName, // Đổi từ RoleURL thành RoleName
                    RoleDescription: record.RoleDescription
                });
                
                if (record.RoleID) {
                    const roleToAdd = {
                        RoleID: record.RoleID,
                        RoleName: record.RoleName, // Sử dụng RoleName
                        Description: record.RoleDescription
                    };
                    
                    console.log('Adding role to user:', roleToAdd);
                    user.addRole(roleToAdd);
                }
            });

            console.log('Final user with roles:', {
                UserID: user.UserID,
                Username: user.Username,
                rolesCount: user.roles.length,
                roles: user.roles
            });

            return user;
        } catch (error) {
            console.error(`Error getting user ${userId} with roles:`, error);
            throw error;
        }
    }

    // Cập nhật method debug để sử dụng RoleName
    async getUserRolesDebug(userId) {
        try {
            const pool = await this.pool;
            
            // Kiểm tra user tồn tại
            const userCheck = await pool.request()
                .input('UserID', sql.Int, userId)
                .query('SELECT * FROM [User] WHERE UserID = @UserID');
            
            console.log('User exists:', userCheck.recordset.length > 0);
            
            // Kiểm tra UserRole
            const roleCheck = await pool.request()
                .input('UserID', sql.Int, userId)
                .query('SELECT * FROM UserRole WHERE UserID = @UserID');
            
            console.log('UserRole records:', roleCheck.recordset);
            
            // Kiểm tra Role table - sửa RoleURL thành RoleName
            const allRoles = await pool.request()
                .query('SELECT RoleID, RoleName, Description FROM [Role]');
            
            console.log('All roles in system:', allRoles.recordset);
            
            // Join query với debug - sửa RoleURL thành RoleName
            const joinResult = await pool.request()
                .input('UserID', sql.Int, userId)
                .query(`
                    SELECT u.UserID, u.Username, ur.RoleID, r.RoleName, r.Description
                    FROM [User] u
                    LEFT JOIN UserRole ur ON u.UserID = ur.UserID
                    LEFT JOIN [Role] r ON ur.RoleID = r.RoleID
                    WHERE u.UserID = @UserID
                `);
            
            console.log('Join query result:', joinResult.recordset);
            
            return {
                userExists: userCheck.recordset.length > 0,
                userRoles: roleCheck.recordset,
                allRoles: allRoles.recordset,
                joinResult: joinResult.recordset
            };
        } catch (error) {
            console.error('Debug error:', error);
            throw error;
        }
    }
}

export default UserDBContext;
