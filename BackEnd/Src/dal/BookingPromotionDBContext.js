import mssql from 'mssql';
import DBContext from './DBContext.js';
import BookingPromotion from '../model/BookingPromotion.js';

class BookingPromotionDBContext extends DBContext {
  constructor() {
    super();
  }

  // ✅ SỬA: Create multiple booking promotions theo schema thực tế
  async createMultiple(bookingID, bookingPromotions) {
    let transaction = null;
    
    try {
        const pool = await this.pool;
        transaction = new mssql.Transaction(pool);
        
        await transaction.begin();
        console.log(`➕ Creating ${bookingPromotions.length} booking promotions for booking: ${bookingID}`);
        
        const createdPromotions = [];
        
        for (const promotion of bookingPromotions) {
            const request = new mssql.Request(transaction);
            
            // ✅ Validate promotion data
            if (!promotion.promotionID) {
                console.warn('⚠️ Skipping promotion without promotionID:', promotion);
                continue;
            }
            
            const insertQuery = `
                INSERT INTO BookingPromotion (BookingID, PromotionID)
                OUTPUT INSERTED.BookingPromotionID
                VALUES (@bookingID, @promotionID)
            `;
            
            request.input('bookingID', mssql.Int, bookingID);
            request.input('promotionID', mssql.Int, promotion.promotionID);
            
            const result = await request.query(insertQuery);
            const bookingPromotionID = result.recordset[0].BookingPromotionID;
            
            console.log(`✅ Added promotion ${promotion.promotionID} to booking ${bookingID} with ID: ${bookingPromotionID}`);
            
            createdPromotions.push({
                bookingPromotionID,
                bookingID: bookingID,
                promotionID: promotion.promotionID
            });
        }
        
        await transaction.commit();
        
        return {
            success: true,
            message: `Tạo ${createdPromotions.length} booking promotions thành công`,
            data: createdPromotions
        };
        
    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('🔄 BookingPromotion transaction rolled back');
            } catch (rollbackError) {
                console.error('❌ Error rolling back BookingPromotion transaction:', rollbackError);
            }
        }
        
        console.error('❌ Error creating multiple booking promotions:', error);
        return {
            success: false,
            message: 'Lỗi khi tạo multiple booking promotions',
            error: error.message
        };
    }
  }

  // ✅ SỬA: Create single booking promotion theo schema thực tế
  async create(bookingPromotion) {
    try {
      console.log('➕ Creating booking promotion:', bookingPromotion);
      
      const pool = await this.pool;
      
      const query = `
        INSERT INTO BookingPromotion (BookingID, PromotionID)
        OUTPUT INSERTED.BookingPromotionID
        VALUES (@bookingID, @promotionID)
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingPromotion.bookingID);
      request.input('promotionID', mssql.Int, bookingPromotion.promotionID);
      
      const result = await request.query(query);
      const bookingPromotionID = result.recordset[0].BookingPromotionID;
      
      return {
        success: true,
        message: 'Tạo booking promotion thành công',
        bookingPromotionID,
        data: {
          bookingPromotionID,
          bookingID: bookingPromotion.bookingID,
          promotionID: bookingPromotion.promotionID
        }
      };
      
    } catch (error) {
      console.error('❌ Error creating booking promotion:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo booking promotion',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Get booking promotions by booking ID theo schema thực tế
  async getByBookingId(bookingID) {
    try {
      console.log(`🔍 Getting booking promotions for booking: ${bookingID}`);
      
      const pool = await this.pool;
      
      const query = `
        SELECT 
          bp.BookingPromotionID,
          bp.BookingID,
          bp.PromotionID,
          p.PromotionName,
          p.DiscountPercent,
          p.Description as PromotionDescription,
          p.StartDate,
          p.EndDate
        FROM BookingPromotion bp
        LEFT JOIN Promotion p ON bp.PromotionID = p.PromotionID
        WHERE bp.BookingID = @bookingID
        ORDER BY bp.BookingPromotionID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      const bookingPromotions = result.recordset.map(row => ({
        bookingPromotionID: row.BookingPromotionID,
        bookingID: row.BookingID,
        promotionID: row.PromotionID,
        promotionInfo: {
          promotionName: row.PromotionName,
          discountPercent: row.DiscountPercent,
          promotionDescription: row.PromotionDescription,
          startDate: row.StartDate,
          endDate: row.EndDate
        }
      }));
      
      return {
        success: true,
        data: bookingPromotions
      };
      
    } catch (error) {
      console.error('❌ Error getting booking promotions by booking ID:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy khuyến mãi theo booking',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Get booking promotion by ID
  async getById(bookingPromotionID) {
    try {
      console.log(`🔍 Getting booking promotion: ${bookingPromotionID}`);
      
      const pool = await this.pool;
      
      const query = `
        SELECT 
          bp.BookingPromotionID,
          bp.BookingID,
          bp.PromotionID,
          p.PromotionName,
          p.DiscountPercent,
          p.Description as PromotionDescription,
          p.StartDate,
          p.EndDate
        FROM BookingPromotion bp
        LEFT JOIN Promotion p ON bp.PromotionID = p.PromotionID
        WHERE bp.BookingPromotionID = @bookingPromotionID
      `;
      
      const request = pool.request();
      request.input('bookingPromotionID', mssql.Int, bookingPromotionID);
      
      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return {
          success: false,
          notFound: true,
          message: 'Không tìm thấy booking promotion'
        };
      }
      
      const row = result.recordset[0];
      const bookingPromotion = {
        bookingPromotionID: row.BookingPromotionID,
        bookingID: row.BookingID,
        promotionID: row.PromotionID,
        promotionInfo: {
          promotionName: row.PromotionName,
          discountPercent: row.DiscountPercent,
          promotionDescription: row.PromotionDescription,
          startDate: row.StartDate,
          endDate: row.EndDate
        }
      };
      
      return {
        success: true,
        data: bookingPromotion
      };
      
    } catch (error) {
      console.error('❌ Error getting booking promotion by ID:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy thông tin booking promotion',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Delete booking promotion
  async delete(bookingPromotionID) {
    try {
      console.log(`🗑️ Deleting booking promotion: ${bookingPromotionID}`);
      
      const pool = await this.pool;
      
      const query = `
        DELETE FROM BookingPromotion 
        WHERE BookingPromotionID = @bookingPromotionID
      `;
      
      const request = pool.request();
      request.input('bookingPromotionID', mssql.Int, bookingPromotionID);
      
      const result = await request.query(query);
      
      if (result.rowsAffected[0] === 1) {
        console.log(`✅ Deleted booking promotion successfully`);
        
        return {
          success: true,
          message: 'Xóa booking promotion thành công'
        };
      } else {
        return {
          success: false,
          message: 'Không tìm thấy booking promotion để xóa'
        };
      }
      
    } catch (error) {
      console.error('❌ Error deleting booking promotion:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa booking promotion',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Delete all booking promotions for a booking
  async deleteByBookingId(bookingID) {
    try {
      console.log(`🗑️ Deleting all booking promotions for booking: ${bookingID}`);
      
      const pool = await this.pool;
      
      const query = `
        DELETE FROM BookingPromotion WHERE BookingID = @bookingID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      console.log(`✅ Deleted ${result.rowsAffected[0]} booking promotions`);
      
      return {
        success: true,
        message: `Xóa ${result.rowsAffected[0]} booking promotions thành công`,
        deletedCount: result.rowsAffected[0]
      };
      
    } catch (error) {
      console.error('❌ Error deleting booking promotions by booking ID:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa booking promotions',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Get all booking promotions with pagination
  async getAllBookingPromotions(page = 1, pageSize = 20) {
    try {
      console.log(`🎯 Getting booking promotions - Page: ${page}, Size: ${pageSize}`);
      
      const pool = await this.pool;
      const offset = (page - 1) * pageSize;
      
      const countQuery = 'SELECT COUNT(*) as total FROM BookingPromotion';
      const countResult = await pool.request().query(countQuery);
      const totalCount = countResult.recordset[0].total;
      
      const query = `
        SELECT 
          bp.BookingPromotionID,
          bp.BookingID,
          bp.PromotionID,
          p.PromotionName,
          p.DiscountPercent,
          p.Description as PromotionDescription,
          p.StartDate,
          p.EndDate
        FROM BookingPromotion bp
        LEFT JOIN Promotion p ON bp.PromotionID = p.PromotionID
        ORDER BY bp.BookingPromotionID DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;
      
      const request = pool.request();
      request.input('offset', mssql.Int, offset);
      request.input('pageSize', mssql.Int, pageSize);
      
      const result = await request.query(query);
      
      const bookingPromotions = result.recordset.map(row => ({
        bookingPromotionID: row.BookingPromotionID,
        bookingID: row.BookingID,
        promotionID: row.PromotionID,
        promotionInfo: {
          promotionName: row.PromotionName,
          discountPercent: row.DiscountPercent,
          promotionDescription: row.PromotionDescription,
          startDate: row.StartDate,
          endDate: row.EndDate
        }
      }));
      
      const totalPages = Math.ceil(totalCount / pageSize);
      
      return {
        success: true,
        data: bookingPromotions,
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
      console.error('❌ Error getting booking promotions:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy danh sách khuyến mãi đặt phòng',
        error: error.message
      };
    }
  }

  // Abstract methods implementations
  async list() {
    return await this.getAllBookingPromotions();
  }

  async get(id) {
    return await this.getById(id);
  }

  async insert(bookingPromotion) {
    return await this.create(bookingPromotion);
  }

  async update(bookingPromotion) {
    return { success: true, message: 'BookingPromotion chỉ có thể tạo mới hoặc xóa' };
  }

  async delete(id) {
    return await this.delete(id);
  }
}

export default BookingPromotionDBContext;