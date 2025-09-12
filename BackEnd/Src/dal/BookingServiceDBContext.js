import mssql from 'mssql';
import DBContext from './DBContext.js';
import BookingService from '../model/BookingService.js';

class BookingServiceDBContext extends DBContext {
  constructor() {
    super();
  }

  // ✅ SỬA: Create multiple booking services theo schema thực tế
  async createMultiple(bookingID, bookingServices) {
    let transaction = null;
    
    try {
        const pool = await this.pool;
        transaction = new mssql.Transaction(pool);
        
        await transaction.begin();
        console.log(`➕ Creating ${bookingServices.length} booking services for booking: ${bookingID}`);
        
        // ✅ VALIDATE bookingServices array
        if (!Array.isArray(bookingServices) || bookingServices.length === 0) {
            console.log('ℹ️ No services to add');
            await transaction.commit();
            return {
                success: true,
                message: 'No services to add',
                data: []
            };
        }
        
        const createdServices = [];
        
        for (const service of bookingServices) {
            // ✅ SỬA: Enhanced validation cho service object
            console.log('🔍 Processing service:', service);
            
            // ✅ Check for serviceID field (not just service.id)
            let serviceID = null;
            if (service.serviceID) {
                serviceID = parseInt(service.serviceID);
            } else if (service.id) {
                serviceID = parseInt(service.id);
            } else if (typeof service === 'number') {
                serviceID = parseInt(service);
            } else if (typeof service === 'string') {
                serviceID = parseInt(service);
            }
            
            if (!serviceID || isNaN(serviceID) || serviceID <= 0) {
                console.warn(`⚠️ Skipping invalid service:`, {
                    received: service,
                    extractedServiceID: serviceID,
                    type: typeof service
                });
                continue;
            }
            
            console.log(`➕ Creating booking service: BookingID=${bookingID}, ServiceID=${serviceID}`);
            
            const query = `
                INSERT INTO BookingService (BookingID, ServiceID, CreateAt, UpdateAt)
                OUTPUT INSERTED.BookingID, INSERTED.ServiceID
                VALUES (@bookingID, @serviceID, @createAt, @updateAt)
            `;
            
            const request = new mssql.Request(transaction);
            request.input('bookingID', mssql.Int, bookingID);
            request.input('serviceID', mssql.Int, serviceID);
            request.input('createAt', mssql.DateTime, new Date());
            request.input('updateAt', mssql.DateTime, new Date());
            
            const result = await request.query(query);
            
            if (result.recordset && result.recordset.length > 0) {
                const createdService = {
                    bookingID: result.recordset[0].BookingID,
                    serviceID: result.recordset[0].ServiceID,
                    createAt: new Date(),
                    updateAt: new Date()
                };
                
                createdServices.push(createdService);
                console.log(`✅ Service ${serviceID} added to booking ${bookingID}`);
            } else {
                console.error(`❌ Failed to create booking service for ServiceID: ${serviceID}`);
            }
        }
        
        await transaction.commit();
        
        console.log(`✅ Created ${createdServices.length} booking services successfully`);
        
        return {
            success: true,
            message: `Tạo ${createdServices.length} booking services thành công`,
            data: createdServices
        };
        
    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('🔄 Transaction rolled back due to error');
            } catch (rollbackError) {
                console.error('❌ Error rolling back transaction:', rollbackError);
            }
        }
        
        console.error('❌ Error creating multiple booking services:', error);
        
        return {
            success: false,
            message: 'Lỗi khi tạo multiple booking services',
            error: error.message
        };
    }
  }

  // ✅ SỬA: Create single booking service theo schema thực tế
  async create(bookingService) {
    try {
      console.log('➕ Creating booking service:', {
        bookingID: bookingService.bookingID,
        serviceID: bookingService.serviceID
      });
      
      const pool = await this.pool;
      
      // ✅ SỬA: Query theo schema thực tế
      const query = `
        INSERT INTO BookingService (BookingID, ServiceID, CreateAt, UpdateAt)
        VALUES (@bookingID, @serviceID, @createAt, @updateAt)
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingService.bookingID);
      request.input('serviceID', mssql.Int, bookingService.serviceID);
      request.input('createAt', mssql.DateTime, new Date());
      request.input('updateAt', mssql.DateTime, new Date());
      
      const result = await request.query(query);
      
      if (result.rowsAffected[0] === 1) {
        console.log(`✅ Created booking service successfully`);
        
        return {
          success: true,
          message: 'Tạo booking service thành công',
          data: {
            bookingID: bookingService.bookingID,
            serviceID: bookingService.serviceID,
            createAt: new Date(),
            updateAt: new Date()
          }
        };
      } else {
        throw new Error('Failed to insert booking service');
      }
      
    } catch (error) {
      console.error('❌ Error creating booking service:', error);
      
      return {
        success: false,
        message: 'Lỗi khi tạo booking service',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Get booking services by booking ID theo schema thực tế
  async getByBookingId(bookingID) {
    try {
      console.log(`🔍 Getting booking services for booking: ${bookingID}`);
      
      const pool = await this.pool;
      
      // ✅ SỬA: JOIN với bảng Service để lấy thông tin chi tiết
      const query = `
        SELECT 
          bs.BookingID,
          bs.ServiceID,
          bs.CreateAt,
          bs.UpdateAt,
          s.ServiceName,
          s.Description as ServiceDescription,
          s.Price as ServicePrice
        FROM BookingService bs
        LEFT JOIN Service s ON bs.ServiceID = s.ServiceID
        WHERE bs.BookingID = @bookingID
        ORDER BY bs.CreateAt
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      const bookingServices = result.recordset.map(row => ({
        bookingID: row.BookingID,
        serviceID: row.ServiceID,
        createAt: row.CreateAt,
        updateAt: row.UpdateAt,
        serviceInfo: {
          serviceName: row.ServiceName,
          serviceDescription: row.ServiceDescription,
          servicePrice: row.ServicePrice
        }
      }));
      
      return {
        success: true,
        data: bookingServices
      };
      
    } catch (error) {
      console.error('❌ Error getting booking services by booking ID:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy dịch vụ theo booking',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Delete booking service by composite key
  async deleteBookingService(bookingID, serviceID) {
    try {
      console.log(`🗑️ Deleting booking service: Booking ${bookingID}, Service ${serviceID}`);
      
      const pool = await this.pool;
      
      const query = `
        DELETE FROM BookingService 
        WHERE BookingID = @bookingID AND ServiceID = @serviceID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      request.input('serviceID', mssql.Int, serviceID);
      
      const result = await request.query(query);
      
      if (result.rowsAffected[0] === 1) {
        console.log(`✅ Deleted booking service successfully`);
        
        return {
          success: true,
          message: 'Xóa booking service thành công'
        };
      } else {
        return {
          success: false,
          message: 'Không tìm thấy booking service để xóa'
        };
      }
      
    } catch (error) {
      console.error('❌ Error deleting booking service:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa booking service',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Delete all booking services for a booking
  async deleteByBookingId(bookingID) {
    try {
      console.log(`🗑️ Deleting all booking services for booking: ${bookingID}`);
      
      const pool = await this.pool;
      
      const query = `
        DELETE FROM BookingService WHERE BookingID = @bookingID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      console.log(`✅ Deleted ${result.rowsAffected[0]} booking services`);
      
      return {
        success: true,
        message: `Xóa ${result.rowsAffected[0]} booking services thành công`,
        deletedCount: result.rowsAffected[0]
      };
      
    } catch (error) {
      console.error('❌ Error deleting booking services by booking ID:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa booking services',
        error: error.message
      };
    }
  }

  // Abstract methods implementations
  async list() {
    return await this.getAllBookingServices();
  }

  async get(bookingID, serviceID) {
    return await this.getByIds(bookingID, serviceID);
  }

  async insert(bookingService) {
    return await this.create(bookingService);
  }

  async update(bookingService) {
    // ✅ SỬA: Không có field nào để update ngoài UpdateAt
    return { success: true, message: 'BookingService chỉ có thể tạo mới hoặc xóa' };
  }

  async delete(bookingID, serviceID = null) {
    if (serviceID) {
      return await this.deleteBookingService(bookingID, serviceID);
    } else {
      return await this.deleteByBookingId(bookingID);
    }
  }

  // ✅ THÊM: Get booking service by composite key
  async getByIds(bookingID, serviceID) {
    try {
      console.log(`🔍 Getting booking service: Booking ${bookingID}, Service ${serviceID}`);
      
      const pool = await this.pool;
      
      const query = `
        SELECT 
          bs.BookingID,
          bs.ServiceID,
          bs.CreateAt,
          bs.UpdateAt,
          s.ServiceName,
          s.Description as ServiceDescription,
          s.Price as ServicePrice
        FROM BookingService bs
        LEFT JOIN Service s ON bs.ServiceID = s.ServiceID
        WHERE bs.BookingID = @bookingID AND bs.ServiceID = @serviceID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      request.input('serviceID', mssql.Int, serviceID);
      
      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return {
          success: false,
          notFound: true,
          message: 'Không tìm thấy booking service'
        };
      }
      
      const row = result.recordset[0];
      const bookingService = {
        bookingID: row.BookingID,
        serviceID: row.ServiceID,
        createAt: row.CreateAt,
        updateAt: row.UpdateAt,
        serviceInfo: {
          serviceName: row.ServiceName,
          serviceDescription: row.ServiceDescription,
          servicePrice: row.ServicePrice
        }
      };
      
      return {
        success: true,
        data: bookingService
      };
      
    } catch (error) {
      console.error('❌ Error getting booking service by IDs:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy thông tin booking service',
        error: error.message
      };
    }
  }

  // Placeholder methods
  async getAllBookingServices() {
    return { success: true, data: [] };
  }
}

export default BookingServiceDBContext;