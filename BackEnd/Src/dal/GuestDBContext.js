import mssql from 'mssql'; // ✅ THÊM import này nếu chưa có
import DBContext from './DBContext.js';
import Guest from '../model/Guest.js';

class GuestDBContext extends DBContext {
  constructor() {
    super();
  }

  // Override required abstract methods
  async list() {
    return await this.getAllGuests();
  }

  async get(phoneNumber) {
    return await this.getGuestByPhoneNumber(phoneNumber);
  }

  async insert(guestData) {
    return await this.createGuest(guestData);
  }

  async update(phoneNumber, updateData) {
    return await this.updateGuest(phoneNumber, updateData);
  }

  async delete(phoneNumber) {
    return await this.deleteGuest(phoneNumber);
  }

  // Get all walk-in guests with pagination and search
  async getAllGuests(page = 1, pageSize = 20, searchTerm = '') {
    try {
      const pool = await this.pool;
      const offset = (page - 1) * pageSize;
      
      let whereClause = '';
      let searchInput = '';
      
      if (searchTerm && searchTerm.trim().length > 0) {
        whereClause = `WHERE (
          wg.GuestName LIKE @searchTerm 
          OR wg.GuestPhoneNumber LIKE @searchTerm 
          OR wg.GuestEmail LIKE @searchTerm
        )`;
        searchInput = `%${searchTerm.trim()}%`;
      }
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as totalCount 
        FROM WalkInGuest wg 
        LEFT JOIN [User] u ON wg.ReceptionistID = u.UserID
        ${whereClause}
      `;
      
      const request = pool.request();
      if (searchInput) {
        request.input('searchTerm', mssql.NVarChar(100), searchInput);
      }
      
      const countResult = await request.query(countQuery);
      const totalCount = countResult.recordset[0].totalCount;
      
      // Get paginated results
      const query = `
        SELECT 
          wg.GuestPhoneNumber,
          wg.GuestName,
          wg.GuestEmail,
          wg.ReceptionistID,
          wg.CreateAt,
          wg.UpdateAt,
          u.Fullname as ReceptionistName
        FROM WalkInGuest wg
        LEFT JOIN [User] u ON wg.ReceptionistID = u.UserID
        ${whereClause}
        ORDER BY wg.CreateAt DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;
      
      const dataRequest = pool.request();
      if (searchInput) {
        dataRequest.input('searchTerm', mssql.NVarChar(100), searchInput);
      }
      dataRequest.input('offset', mssql.Int, offset);
      dataRequest.input('pageSize', mssql.Int, pageSize);
      
      const result = await dataRequest.query(query);
      
      const guests = result.recordset.map(row => ({
        guestPhoneNumber: row.GuestPhoneNumber?.trim(),
        guestName: row.GuestName,
        guestEmail: row.GuestEmail,
        receptionistID: row.ReceptionistID,
        receptionistName: row.ReceptionistName,
        createAt: row.CreateAt,
        updateAt: row.UpdateAt
      }));
      
      const totalPages = Math.ceil(totalCount / pageSize);
      
      return {
        success: true,
        data: guests,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting all guests:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy danh sách khách hàng',
        error: error.message
      };
    }
  }

  // Get guest by phone number
  async getGuestByPhoneNumber(phoneNumber) {
    try {
      console.log(`🔍 Getting guest by phone: ${phoneNumber}`);
      
      const pool = await this.pool;
      
      const query = `
        SELECT 
          wg.GuestPhoneNumber,
          wg.GuestName,
          wg.GuestEmail,
          wg.ReceptionistID,
          wg.CreateAt,
          wg.UpdateAt,
          u.Fullname as ReceptionistName
        FROM WalkInGuest wg
        LEFT JOIN [User] u ON wg.ReceptionistID = u.UserID
        WHERE wg.GuestPhoneNumber = @phoneNumber
      `;
      
      const result = await pool.request()
        .input('phoneNumber', mssql.NChar(10), phoneNumber)
        .query(query);
      
      if (result.recordset.length === 0) {
        console.log(`📝 Guest with phone ${phoneNumber} not found`);
        return {
          success: false,
          notFound: true,
          message: 'Không tìm thấy khách hàng'
        };
      }
      
      const guestData = result.recordset[0];
      const guest = {
        guestPhoneNumber: guestData.GuestPhoneNumber?.trim(),
        guestName: guestData.GuestName,
        guestEmail: guestData.GuestEmail,
        receptionistID: guestData.ReceptionistID,
        receptionistName: guestData.ReceptionistName,
        createAt: guestData.CreateAt,
        updateAt: guestData.UpdateAt
      };
      
      console.log(`✅ Found guest: ${guest.guestName}`);
      
      return {
        success: true,
        data: guest
      };
      
    } catch (error) {
      console.error('❌ Error getting guest by phone:', error);
      return {
        success: false,
        message: 'Lỗi khi tìm khách hàng',
        error: error.message
      };
    }
  }

  // Create new guest
  async createGuest(guestData) {
    try {
      console.log('💾 Creating new guest:', {
        phone: guestData.guestPhoneNumber,
        name: guestData.guestName,
        email: guestData.guestEmail,
        receptionistID: guestData.receptionistID
      });
      
      // Validate guest data
      const validation = Guest.validateGuest(guestData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: validation.errors
        };
      }
      
      const pool = await this.pool;
      
      // Check if guest already exists
      const existingGuest = await this.getGuestByPhoneNumber(guestData.guestPhoneNumber);
      if (existingGuest.success) {
        return {
          success: false,
          message: 'Khách hàng đã tồn tại',
          conflict: true,
          data: existingGuest.data
        };
      }
      
      const query = `
        INSERT INTO WalkInGuest (
          GuestPhoneNumber, GuestName, GuestEmail, 
          ReceptionistID, CreateAt, UpdateAt
        )
        VALUES (
          @phoneNumber, @name, @email, 
          @receptionistID, @createAt, @updateAt
        )
      `;
      
      const now = new Date();
      await pool.request()
        .input('phoneNumber', mssql.NChar(10), validation.validatedData.guestPhoneNumber)
        .input('name', mssql.NVarChar(100), validation.validatedData.guestName)
        .input('email', mssql.NVarChar(100), validation.validatedData.guestEmail)
        .input('receptionistID', mssql.Int, validation.validatedData.receptionistID)
        .input('createAt', mssql.DateTime, now)
        .input('updateAt', mssql.DateTime, now)
        .query(query);
      
      console.log('✅ Guest created successfully');
      
      // Return the created guest data
      const createdGuest = await this.getGuestByPhoneNumber(validation.validatedData.guestPhoneNumber);
      
      return {
        success: true,
        message: 'Tạo khách hàng thành công',
        data: createdGuest.data
      };
      
    } catch (error) {
      console.error('❌ Error creating guest:', error);
      
      if (error.number === 2627 || error.number === 2601) { // Duplicate key error
        return {
          success: false,
          message: 'Khách hàng đã tồn tại',
          conflict: true
        };
      }
      
      return {
        success: false,
        message: 'Lỗi khi tạo khách hàng',
        error: error.message
      };
    }
  }

  // Update guest information
  async updateGuest(phoneNumber, updateData) {
    try {
      console.log(`🔄 Updating guest ${phoneNumber}:`, updateData);
      
      // Check if guest exists
      const existingGuest = await this.getGuestByPhoneNumber(phoneNumber);
      if (!existingGuest.success) {
        return {
          success: false,
          message: 'Không tìm thấy khách hàng để cập nhật',
          notFound: true
        };
      }
      
      // Validate update data
      const mergedData = {
        ...existingGuest.data,
        ...updateData,
        guestPhoneNumber: phoneNumber // Ensure phone number doesn't change
      };
      
      const validation = Guest.validateGuest(mergedData);
      if (!validation.isValid) {
        return {
          success: false,
          message: 'Dữ liệu cập nhật không hợp lệ',
          errors: validation.errors
        };
      }
      
      const pool = await this.pool;
      
      const query = `
        UPDATE WalkInGuest 
        SET 
          GuestName = @name,
          GuestEmail = @email,
          ReceptionistID = @receptionistID,
          UpdateAt = @updateAt
        WHERE GuestPhoneNumber = @phoneNumber
      `;
      
      const result = await pool.request()
        .input('phoneNumber', mssql.NChar(10), phoneNumber)
        .input('name', mssql.NVarChar(100), validation.validatedData.guestName)
        .input('email', mssql.NVarChar(100), validation.validatedData.guestEmail)
        .input('receptionistID', mssql.Int, validation.validatedData.receptionistID)
        .input('updateAt', mssql.DateTime, new Date())
        .query(query);
      
      if (result.rowsAffected[0] === 0) {
        return {
          success: false,
          message: 'Không tìm thấy khách hàng để cập nhật'
        };
      }
      
      console.log('✅ Guest updated successfully');
      
      // Return updated guest data
      const updatedGuest = await this.getGuestByPhoneNumber(phoneNumber);
      
      return {
        success: true,
        message: 'Cập nhật khách hàng thành công',
        data: updatedGuest.data
      };
      
    } catch (error) {
      console.error('❌ Error updating guest:', error);
      return {
        success: false,
        message: 'Lỗi khi cập nhật khách hàng',
        error: error.message
      };
    }
  }

  // Delete guest
  async deleteGuest(phoneNumber) {
    try {
      console.log(`🗑️ Deleting guest: ${phoneNumber}`);
      
      const pool = await this.pool;
      
      const query = `
        DELETE FROM WalkInGuest 
        WHERE GuestPhoneNumber = @phoneNumber
      `;
      
      const result = await pool.request()
        .input('phoneNumber', mssql.NChar(10), phoneNumber)
        .query(query);
      
      if (result.rowsAffected[0] === 0) {
        return {
          success: false,
          message: 'Không tìm thấy khách hàng để xóa',
          notFound: true
        };
      }
      
      console.log('✅ Guest deleted successfully');
      
      return {
        success: true,
        message: 'Xóa khách hàng thành công'
      };
      
    } catch (error) {
      console.error('❌ Error deleting guest:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa khách hàng',
        error: error.message
      };
    }
  }

  // Get guest statistics
  async getGuestStatistics() {
    try {
      const pool = await this.pool;
      
      const query = `
        SELECT 
          COUNT(*) as totalGuests,
          COUNT(CASE WHEN CreateAt >= DATEADD(month, -1, GETDATE()) THEN 1 END) as newGuestsThisMonth,
          COUNT(CASE WHEN CreateAt >= DATEADD(week, -1, GETDATE()) THEN 1 END) as newGuestsThisWeek,
          COUNT(CASE WHEN GuestEmail IS NOT NULL AND GuestEmail != '' THEN 1 END) as guestsWithEmail
        FROM WalkInGuest
      `;
      
      const result = await pool.request().query(query);
      
      return {
        success: true,
        data: result.recordset[0]
      };
      
    } catch (error) {
      console.error('❌ Error getting guest statistics:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy thống kê khách hàng',
        error: error.message
      };
    }
  }

  // Get recent guests
  async getRecentGuests(limit = 10) {
    try {
      const pool = await this.pool;
      
      const query = `
        SELECT TOP (@limit)
          wg.GuestPhoneNumber,
          wg.GuestName,
          wg.GuestEmail,
          wg.CreateAt,
          u.Fullname as ReceptionistName
        FROM WalkInGuest wg
        LEFT JOIN [User] u ON wg.ReceptionistID = u.UserID
        ORDER BY wg.CreateAt DESC
      `;
      
      const result = await pool.request()
        .input('limit', mssql.Int, limit)
        .query(query);
      
      const guests = result.recordset.map(row => ({
        guestPhoneNumber: row.GuestPhoneNumber?.trim(),
        guestName: row.GuestName,
        guestEmail: row.GuestEmail,
        createAt: row.CreateAt,
        receptionistName: row.ReceptionistName
      }));
      
      return {
        success: true,
        data: guests
      };
      
    } catch (error) {
      console.error('❌ Error getting recent guests:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy khách hàng gần đây',
        error: error.message
      };
    }
  }

  // Find guests by receptionist
  async findGuestsByReceptionist(receptionistID, page = 1, pageSize = 20) {
    try {
      const pool = await this.pool;
      const offset = (page - 1) * pageSize;
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as totalCount 
        FROM WalkInGuest 
        WHERE ReceptionistID = @receptionistID
      `;
      
      const countResult = await pool.request()
        .input('receptionistID', mssql.Int, receptionistID)
        .query(countQuery);
      
      const totalCount = countResult.recordset[0].totalCount;
      
      // Get paginated results
      const query = `
        SELECT 
          wg.GuestPhoneNumber,
          wg.GuestName,
          wg.GuestEmail,
          wg.CreateAt,
          wg.UpdateAt,
          u.Fullname as ReceptionistName
        FROM WalkInGuest wg
        LEFT JOIN [User] u ON wg.ReceptionistID = u.UserID
        WHERE wg.ReceptionistID = @receptionistID
        ORDER BY wg.CreateAt DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;
      
      const result = await pool.request()
        .input('receptionistID', mssql.Int, receptionistID)
        .input('offset', mssql.Int, offset)
        .input('pageSize', mssql.Int, pageSize)
        .query(query);
      
      const guests = result.recordset.map(row => ({
        guestPhoneNumber: row.GuestPhoneNumber?.trim(),
        guestName: row.GuestName,
        guestEmail: row.GuestEmail,
        createAt: row.CreateAt,
        updateAt: row.UpdateAt,
        receptionistName: row.ReceptionistName
      }));
      
      const totalPages = Math.ceil(totalCount / pageSize);
      
      return {
        success: true,
        data: guests,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      console.error('❌ Error finding guests by receptionist:', error);
      return {
        success: false,
        message: 'Lỗi khi tìm khách hàng theo nhân viên',
        error: error.message
      };
    }
  }
}

export default GuestDBContext;