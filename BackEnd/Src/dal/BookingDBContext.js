import mssql from 'mssql';
import DBContext from './DBContext.js';
import Booking from '../model/Booking.js';

// ✅ SỬA: Import sql types correctly using mssql directly
// Use mssql.Int, mssql.NVarChar, etc. instead of destructuring

class BookingDBContext extends DBContext {
  constructor() {
    super();
  }

  // ✅ SỬA: Create walk-in booking với import đúng
  async createWalkInBooking(bookingData) {
    let transaction = null;
    
    try {
      const pool = await this.pool;
      
      // ✅ SỬA: Sử dụng mssql.Transaction thay vì sql.Transaction
      transaction = new mssql.Transaction(pool);
      
      await transaction.begin();
      console.log('🚶‍♂️ Starting walk-in booking creation transaction...');
      
      // ✅ SỬA: Sử dụng mssql.Request thay vì sql.Request
      const request = new mssql.Request(transaction);
      
      // Insert theo đúng schema từ NoDataScript.sql
      const insertQuery = `
        INSERT INTO Booking (
          CustomerID, ReceptionistID, NumberOfGuest, SpecialRequest, 
          BookingType, BookingAt, GuestID, CreateAt, UpdateAt, 
          WalkInGuestPhoneNumber, BookingStatus
        )
        OUTPUT INSERTED.BookingID
        VALUES (
          @customerID, @receptionistID, @numberOfGuest, @specialRequest,
          @bookingType, @bookingAt, @guestID, @createAt, @updateAt,
          @walkInGuestPhoneNumber, @bookingStatus
        )
      `;
      
      // ✅ SỬA: Sử dụng mssql.Int, mssql.NVarChar, etc.
      request.input('customerID', mssql.Int, null);
      request.input('receptionistID', mssql.Int, bookingData.receptionistID);
      request.input('numberOfGuest', mssql.Int, bookingData.numberOfGuest);
      request.input('specialRequest', mssql.NVarChar(250), bookingData.specialRequest || null);
      request.input('bookingType', mssql.Bit, 0); // 0 = Walk-in
      request.input('bookingAt', mssql.DateTime, new Date());
      request.input('guestID', mssql.NChar(10), bookingData.guestID);
      request.input('createAt', mssql.DateTime, new Date());
      request.input('updateAt', mssql.DateTime, new Date());
      request.input('walkInGuestPhoneNumber', mssql.NChar(10), bookingData.walkInGuestPhoneNumber);
      request.input('bookingStatus', mssql.NVarChar(20), bookingData.bookingStatus || 'Pending');
      
      console.log('📝 Executing walk-in booking insert query with data:', {
        customerID: null,
        receptionistID: bookingData.receptionistID,
        numberOfGuest: bookingData.numberOfGuest,
        bookingType: 0,
        guestID: bookingData.guestID,
        walkInGuestPhoneNumber: bookingData.walkInGuestPhoneNumber
      });
      
      const result = await request.query(insertQuery);
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('Failed to create booking - no booking ID returned');
      }
      
      const bookingID = result.recordset[0].BookingID;
      console.log(`✅ Walk-in booking created with ID: ${bookingID}`);
      
      await transaction.commit();
      console.log('✅ Walk-in booking transaction committed successfully');
      
      return {
        success: true,
        bookingID,
        message: 'Walk-in booking created successfully'
      };
      
    } catch (error) {
      console.error('❌ Error creating walk-in booking:', error);
      
      if (transaction) {
        try {
          await transaction.rollback();
          console.log('🔄 Transaction rolled back successfully');
        } catch (rollbackError) {
          console.error('❌ Error rolling back transaction:', rollbackError);
        }
      }
      
      return {
        success: false,
        message: 'Lỗi khi tạo walk-in booking: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ SỬA: Get booking by ID với mssql import đúng
  async getBookingById(bookingID) {
    try {
      const pool = await this.pool;
      
      const query = `
        SELECT 
          b.BookingID,
          b.CustomerID,
          b.ReceptionistID,
          b.NumberOfGuest,
          b.SpecialRequest,
          b.BookingType,
          b.BookingAt,
          b.GuestID,
          b.CreateAt,
          b.UpdateAt,
          b.WalkInGuestPhoneNumber,
          b.BookingStatus,
          wg.GuestName,
          wg.GuestEmail,
          u.Fullname as ReceptionistName,
          -- ✅ THÊM: Check-in/Check-out dates từ BookingRoomType
          MIN(brt.CheckInAt) as CheckInDate,
          MAX(brt.CheckOutAt) as CheckOutDate
        FROM Booking b
        LEFT JOIN WalkInGuest wg ON b.WalkInGuestPhoneNumber = wg.GuestPhoneNumber
        LEFT JOIN [User] u ON b.ReceptionistID = u.UserID
        LEFT JOIN BookingRoomType brt ON b.BookingID = brt.BookingID
        WHERE b.BookingID = @bookingID
        GROUP BY 
          b.BookingID, b.CustomerID, b.ReceptionistID, b.NumberOfGuest,
          b.SpecialRequest, b.BookingType, b.BookingAt, b.GuestID,
          b.CreateAt, b.UpdateAt, b.WalkInGuestPhoneNumber, b.BookingStatus,
          wg.GuestName, wg.GuestEmail, u.Fullname
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return {
          success: false,
          notFound: true,
          message: 'Không tìm thấy booking'
        };
      }
      
      const bookingData = result.recordset[0];
      
      return {
        success: true,
        data: {
          bookingID: bookingData.BookingID,
          customerID: bookingData.CustomerID,
          receptionistID: bookingData.ReceptionistID,
          numberOfGuest: bookingData.NumberOfGuest,
          specialRequest: bookingData.SpecialRequest,
          bookingType: bookingData.BookingType,
          bookingAt: bookingData.BookingAt,
          guestID: bookingData.GuestID,
          createAt: bookingData.CreateAt,
          updateAt: bookingData.UpdateAt,
          walkInGuestPhoneNumber: bookingData.WalkInGuestPhoneNumber,
          bookingStatus: bookingData.BookingStatus,
          guestName: bookingData.GuestName,
          guestEmail: bookingData.GuestEmail,
          receptionistName: bookingData.ReceptionistName,
          // ✅ THÊM: Check-in/Check-out dates
          checkInDate: bookingData.CheckInDate,
          checkOutDate: bookingData.CheckOutDate
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting booking by ID:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy thông tin booking: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ SỬA: Update booking status với mssql import đúng
  async updateBookingStatus(bookingID, status) {
    try {
      const pool = await this.pool;
      
      const query = `
        UPDATE Booking 
        SET BookingStatus = @status, UpdateAt = @updateAt
        WHERE BookingID = @bookingID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      request.input('status', mssql.NVarChar(20), status);
      request.input('updateAt', mssql.DateTime, new Date());
      
      const result = await request.query(query);
      
      if (result.rowsAffected[0] === 0) {
        return {
          success: false,
          message: 'Không tìm thấy booking để cập nhật status'
        };
      }
      
      console.log(`✅ Updated booking ${bookingID} status to: ${status}`);
      
      return {
        success: true,
        message: `Cập nhật trạng thái booking thành ${status} thành công`
      };
      
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      return {
        success: false,
        message: 'Lỗi khi cập nhật trạng thái booking: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ THÊM: Create online booking method - moved from controller
  async createOnlineBooking(validatedData) {
    try {
      console.log('📝 Creating online booking record...');
      
      const bookingPayload = {
        customerID: validatedData.customerID,
        receptionistID: null, // Online booking không có receptionist
        numberOfGuest: validatedData.numberOfGuest,
        specialRequest: validatedData.specialRequest,
        bookingType: 1, // Online
        bookingAt: new Date(),
        guestID: null, // Online booking không cần guestID
        createAt: new Date(),
        updateAt: new Date(),
        walkInGuestPhoneNumber: null, // Online booking không cần
        bookingStatus: validatedData.bookingStatus || 'Pending'
      };
      
      const pool = await this.pool;
      
      const query = `
        INSERT INTO Booking (
          CustomerID, ReceptionistID, NumberOfGuest, SpecialRequest, 
          BookingType, BookingAt, GuestID, CreateAt, UpdateAt, 
          WalkInGuestPhoneNumber, BookingStatus
        )
        OUTPUT INSERTED.BookingID
        VALUES (
          @customerID, @receptionistID, @numberOfGuest, @specialRequest,
          @bookingType, @bookingAt, @guestID, @createAt, @updateAt,
          @walkInGuestPhoneNumber, @bookingStatus
        )
      `;
      
      const request = pool.request();
      request.input('customerID', mssql.Int, bookingPayload.customerID);
      request.input('receptionistID', mssql.Int, bookingPayload.receptionistID);
      request.input('numberOfGuest', mssql.Int, bookingPayload.numberOfGuest);
      request.input('specialRequest', mssql.NVarChar(250), bookingPayload.specialRequest);
      request.input('bookingType', mssql.Bit, bookingPayload.bookingType);
      request.input('bookingAt', mssql.DateTime, bookingPayload.bookingAt);
      request.input('guestID', mssql.NChar(10), bookingPayload.guestID);
      request.input('createAt', mssql.DateTime, bookingPayload.createAt);
      request.input('updateAt', mssql.DateTime, bookingPayload.updateAt);
      request.input('walkInGuestPhoneNumber', mssql.NChar(10), bookingPayload.walkInGuestPhoneNumber);
      request.input('bookingStatus', mssql.NVarChar(20), bookingPayload.bookingStatus);
      
      const result = await request.query(query);
      
      if (result.recordset && result.recordset.length > 0) {
        const bookingID = result.recordset[0].BookingID;
        console.log(`✅ Online booking created with ID: ${bookingID}`);
        
        return {
          success: true,
          bookingID: bookingID,
          message: 'Online booking created successfully'
        };
      } else {
        throw new Error('Failed to create booking record');
      }
      
    } catch (error) {
      console.error('❌ Error in createOnlineBooking:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo booking record: ' + error.message
      };
    }
  }

  // ✅ THÊM: Get online booking by ID
  async getOnlineBookingById(bookingID) {
    try {
      const pool = await this.pool;
      
      const query = `
        SELECT 
          b.BookingID,
          b.CustomerID,
          b.ReceptionistID,
          b.NumberOfGuest,
          b.SpecialRequest,
          b.BookingType,
          b.BookingAt,
          b.GuestID,
          b.CreateAt,
          b.UpdateAt,
          b.WalkInGuestPhoneNumber,
          b.BookingStatus,
          u.Fullname as CustomerName,
          u.Email as CustomerEmail,
          u.PhoneNumber as CustomerPhone,
          -- ✅ THÊM: Check-in/Check-out dates từ BookingRoomType
          MIN(brt.CheckInAt) as CheckInDate,
          MAX(brt.CheckOutAt) as CheckOutDate
        FROM Booking b
        LEFT JOIN [User] u ON b.CustomerID = u.UserID
        LEFT JOIN BookingRoomType brt ON b.BookingID = brt.BookingID
        WHERE b.BookingID = @bookingID AND b.BookingType = 1
        GROUP BY 
          b.BookingID, b.CustomerID, b.ReceptionistID, b.NumberOfGuest,
          b.SpecialRequest, b.BookingType, b.BookingAt, b.GuestID,
          b.CreateAt, b.UpdateAt, b.WalkInGuestPhoneNumber, b.BookingStatus,
          u.Fullname, u.Email, u.PhoneNumber
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return {
          success: false,
          message: 'Online booking không tồn tại'
        };
      }
      
      const bookingData = result.recordset[0];
      
      return {
        success: true,
        data: {
          bookingID: bookingData.BookingID,
          customerID: bookingData.CustomerID,
          receptionistID: bookingData.ReceptionistID,
          numberOfGuest: bookingData.NumberOfGuest,
          specialRequest: bookingData.SpecialRequest,
          bookingType: bookingData.BookingType,
          bookingAt: bookingData.BookingAt,
          guestID: bookingData.GuestID,
          createAt: bookingData.CreateAt,
          updateAt: bookingData.UpdateAt,
          walkInGuestPhoneNumber: bookingData.WalkInGuestPhoneNumber,
          bookingStatus: bookingData.BookingStatus,
          // ✅ THÊM: Check-in/Check-out dates
          checkInDate: bookingData.CheckInDate,
          checkOutDate: bookingData.CheckOutDate,
          customerInfo: {
            customerName: bookingData.CustomerName,
            customerEmail: bookingData.CustomerEmail,
            customerPhone: bookingData.CustomerPhone
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting online booking by ID:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy thông tin online booking: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ THÊM: Update online booking status
  async updateOnlineBookingStatus(bookingID, status) {
    try {
      const pool = await this.pool;
      
      const query = `
        UPDATE Booking 
        SET BookingStatus = @status, UpdateAt = @updateAt
        WHERE BookingID = @bookingID AND BookingType = 1
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      request.input('status', mssql.NVarChar(20), status);
      request.input('updateAt', mssql.DateTime, new Date());
      
      const result = await request.query(query);
      
      return {
        success: result.rowsAffected[0] > 0,
        message: result.rowsAffected[0] > 0 ? 'Cập nhật trạng thái thành công' : 'Không tìm thấy booking để cập nhật'
      };
      
    } catch (error) {
      console.error('❌ Error updating online booking status:', error);
      return {
        success: false,
        message: 'Lỗi khi cập nhật trạng thái booking: ' + error.message
      };
    }
  }

  // Abstract methods implementations
  async list() {
    return await this.getAllBookings();
  }

  async get(bookingID) {
    return await this.getBookingById(bookingID);
  }

  async insert(booking) {
    return await this.createBooking(booking);
  }

  async update(booking) {
    return await this.updateBooking(booking);
  }

  async delete(bookingID) {
    return await this.deleteBooking(bookingID);
  }

  // Get all bookings with detailed information
  async getAllBookings(page = 1, pageSize = 20, searchTerm = '', status = null, phoneFilter = '', nameFilter = '', checkInDate = '', checkOutDate = '') {
    try {
      console.log('🔍 Getting all bookings from database...');
      
      const pool = await this.pool;
      const request = pool.request();

      let query = `
        SELECT
          b.BookingID, b.CustomerID, b.ReceptionistID, b.NumberOfGuest,
          LTRIM(RTRIM(b.SpecialRequest)) as SpecialRequest, 
          b.BookingType, b.BookingAt, 
          LTRIM(RTRIM(b.GuestID)) as GuestID,
          b.CreateAt, b.UpdateAt, 
          LTRIM(RTRIM(b.WalkInGuestPhoneNumber)) as WalkInGuestPhoneNumber, 
          LTRIM(RTRIM(b.BookingStatus)) as BookingStatus,
          
          -- Customer info (online bookings) - with TRIM
          LTRIM(RTRIM(u.Fullname)) as CustomerName,
          LTRIM(RTRIM(u.Email)) as CustomerEmail,
          LTRIM(RTRIM(u.PhoneNumber)) as CustomerPhone,
          
          -- Guest info (walk-in bookings) - with TRIM
          LTRIM(RTRIM(g.GuestName)) as GuestName,
          LTRIM(RTRIM(g.GuestPhoneNumber)) as GuestPhoneNumber,
          LTRIM(RTRIM(g.GuestEmail)) as GuestEmail,
          
          -- Receptionist info - with TRIM
          LTRIM(RTRIM(r.Fullname)) as ReceptionistName,
          
          -- Room types aggregated
          STRING_AGG(CONCAT(rt.TypeName, ' (', brt.Quantity, ')'), ', ') as RoomTypesDisplay,
          
          -- ✅ THÊM: Check-in/Check-out dates từ BookingRoomType
          MIN(brt.CheckInAt) as CheckInDate,
          MAX(brt.CheckOutAt) as CheckOutDate
          
        FROM Booking b
        LEFT JOIN [User] u ON b.CustomerID = u.UserID
        LEFT JOIN WalkInGuest g ON b.GuestID = g.GuestPhoneNumber
        LEFT JOIN [User] r ON b.ReceptionistID = r.UserID
        LEFT JOIN BookingRoomType brt ON b.BookingID = brt.BookingID
        LEFT JOIN RoomType rt ON brt.RoomTypeID = rt.TypeId
        WHERE 1=1
      `;

      // Add search filter (general search)
      if (searchTerm && searchTerm.trim()) {
        query += ` AND (
          u.Fullname LIKE @searchTerm OR
          g.GuestName LIKE @searchTerm OR
          u.PhoneNumber LIKE @searchTerm OR
          g.GuestPhoneNumber LIKE @searchTerm OR
          b.WalkInGuestPhoneNumber LIKE @searchTerm
        )`;
        request.input('searchTerm', `%${searchTerm.trim()}%`);
      }

      // Add phone filter (specific phone search)
      if (phoneFilter && phoneFilter.trim()) {
        query += ` AND (
          u.PhoneNumber LIKE @phoneFilter OR
          g.GuestPhoneNumber LIKE @phoneFilter OR
          b.WalkInGuestPhoneNumber LIKE @phoneFilter
        )`;
        request.input('phoneFilter', `%${phoneFilter.trim()}%`);
      }

      // Add name filter (specific name search)
      if (nameFilter && nameFilter.trim()) {
        query += ` AND (
          u.Fullname LIKE @nameFilter OR
          g.GuestName LIKE @nameFilter
        )`;
        request.input('nameFilter', `%${nameFilter.trim()}%`);
      }

      // Add status filter
      if (status && status.trim()) {
        query += ` AND b.BookingStatus = @status`;
        request.input('status', status.trim());
      }

      // Add check-in date filter
      if (checkInDate && checkInDate.trim()) {
        query += ` AND CAST(brt.CheckInAt AS DATE) = @checkInDate`;
        request.input('checkInDate', checkInDate.trim());
      }

      // Add check-out date filter
      if (checkOutDate && checkOutDate.trim()) {
        query += ` AND CAST(brt.CheckOutAt AS DATE) = @checkOutDate`;
        request.input('checkOutDate', checkOutDate.trim());
      }

      // Group by all non-aggregated columns
      query += `
        GROUP BY 
          b.BookingID, b.CustomerID, b.ReceptionistID, b.NumberOfGuest,
          b.SpecialRequest, b.BookingType, b.BookingAt, b.GuestID,
          b.CreateAt, b.UpdateAt, b.WalkInGuestPhoneNumber, b.BookingStatus,
          u.Fullname, u.Email, u.PhoneNumber,
          g.GuestName, g.GuestPhoneNumber, g.GuestEmail,
          r.Fullname
        ORDER BY b.CreateAt DESC
      `;

      // Add pagination
      const offset = (page - 1) * pageSize;
      query += ` OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
      request.input('offset', offset);
      request.input('pageSize', pageSize);

      const result = await request.query(query);

      // Get total count for pagination
      const countRequest = pool.request();
      let countQuery = `SELECT COUNT(DISTINCT b.BookingID) as Total FROM Booking b`;
      
      // Build the count query with the same filters as main query
      const hasFilters = (searchTerm && searchTerm.trim()) || 
                        (phoneFilter && phoneFilter.trim()) || 
                        (nameFilter && nameFilter.trim()) || 
                        (status && status.trim()) ||
                        (checkInDate && checkInDate.trim()) ||
                        (checkOutDate && checkOutDate.trim());
      
      if (hasFilters) {
        countQuery += ` LEFT JOIN [User] u ON b.CustomerID = u.UserID
                       LEFT JOIN WalkInGuest g ON b.GuestID = g.GuestPhoneNumber
                       LEFT JOIN BookingRoomType brt ON b.BookingID = brt.BookingID
                       WHERE 1=1`;
        
        // Add same filters as main query
        if (searchTerm && searchTerm.trim()) {
          countQuery += ` AND (
            u.Fullname LIKE @searchTerm OR
            g.GuestName LIKE @searchTerm OR
            u.PhoneNumber LIKE @searchTerm OR
            g.GuestPhoneNumber LIKE @searchTerm OR
            b.WalkInGuestPhoneNumber LIKE @searchTerm
          )`;
          countRequest.input('searchTerm', `%${searchTerm.trim()}%`);
        }
        
        if (phoneFilter && phoneFilter.trim()) {
          countQuery += ` AND (
            u.PhoneNumber LIKE @phoneFilter OR
            g.GuestPhoneNumber LIKE @phoneFilter OR
            b.WalkInGuestPhoneNumber LIKE @phoneFilter
          )`;
          countRequest.input('phoneFilter', `%${phoneFilter.trim()}%`);
        }
        
        if (nameFilter && nameFilter.trim()) {
          countQuery += ` AND (
            u.Fullname LIKE @nameFilter OR
            g.GuestName LIKE @nameFilter
          )`;
          countRequest.input('nameFilter', `%${nameFilter.trim()}%`);
        }
        
        if (status && status.trim()) {
          countQuery += ` AND b.BookingStatus = @status`;
          countRequest.input('status', status.trim());
        }
        
        if (checkInDate && checkInDate.trim()) {
          countQuery += ` AND CAST(brt.CheckInAt AS DATE) = @checkInDate`;
          countRequest.input('checkInDate', checkInDate.trim());
        }
        
        if (checkOutDate && checkOutDate.trim()) {
          countQuery += ` AND CAST(brt.CheckOutAt AS DATE) = @checkOutDate`;
          countRequest.input('checkOutDate', checkOutDate.trim());
        }
      }

      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].Total;

      // Format the results - dữ liệu đã được trim trong SQL
      const bookings = result.recordset.map(row => {
        // Debug log to check BookingType values
        console.log(`🔍 Debug BookingID ${row.BookingID}: BookingType = ${row.BookingType} (type: ${typeof row.BookingType})`);
        
        return {
        bookingID: row.BookingID,
        customerID: row.CustomerID,
        receptionistID: row.ReceptionistID,
        numberOfGuest: row.NumberOfGuest,
        specialRequest: row.SpecialRequest,
        bookingType: row.BookingType,
        bookingAt: row.BookingAt,
        guestID: row.GuestID,
        createAt: row.CreateAt,
        updateAt: row.UpdateAt,
        walkInGuestPhoneNumber: row.WalkInGuestPhoneNumber,
        bookingStatus: row.BookingStatus,
        
        // Customer info - đã được trim trong SQL
        customerName: row.CustomerName,
        customerEmail: row.CustomerEmail,
        customerPhone: row.CustomerPhone,
        
        // Guest info - đã được trim trong SQL
        guestName: row.GuestName,
        guestPhoneNumber: row.GuestPhoneNumber,
        guestEmail: row.GuestEmail,
        
        // Receptionist info - đã được trim trong SQL
        receptionistName: row.ReceptionistName,
        
        // Room types display
        roomTypesDisplay: row.RoomTypesDisplay || 'Chưa có thông tin phòng',
        
        // ✅ THÊM: Check-in/Check-out dates từ BookingRoomType
        checkInDate: row.CheckInDate,
        checkOutDate: row.CheckOutDate,
        
        // Display fields for frontend  
        displayCustomerName: (() => {
          const result = row.BookingType === true 
            ? (row.CustomerName || 'Online Customer') 
            : (row.GuestName || 'Walk-in Guest');
          console.log(`🔍 BookingID ${row.BookingID}: BookingType=${row.BookingType} (${typeof row.BookingType}) → displayCustomerName="${result}" (CustomerName="${row.CustomerName}", GuestName="${row.GuestName}")`)
          return result;
        })(),
        displayCustomerPhone: (() => {
          const result = row.BookingType === true
            ? (row.CustomerPhone ? row.CustomerPhone.trim() : 'N/A')
            : (row.GuestPhoneNumber ? row.GuestPhoneNumber.trim() : (row.WalkInGuestPhoneNumber ? row.WalkInGuestPhoneNumber.trim() : 'N/A'));
          console.log(`📞 BookingID ${row.BookingID}: BookingType=${row.BookingType} → displayCustomerPhone="${result}" (CustomerPhone="${row.CustomerPhone}", GuestPhoneNumber="${row.GuestPhoneNumber}")`)
          return result;
        })(),
        
        // ✅ THÊM: Placeholder cho roomTypeDetails (sẽ được populate sau)
        roomTypeDetails: []
      };
      });

      // ✅ THÊM: Lấy chi tiết roomTypeDetails cho tất cả bookings
      console.log('🔍 Fetching room type details for all bookings...');
      for (let booking of bookings) {
        try {
          const roomTypeDetailsResult = await this.getBookingRoomTypeDetails(booking.bookingID);
          if (roomTypeDetailsResult.success) {
            booking.roomTypeDetails = roomTypeDetailsResult.data;
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch room type details for booking ${booking.bookingID}:`, error.message);
          booking.roomTypeDetails = [];
        }
      }

      console.log(`✅ Retrieved ${bookings.length} bookings from database`);

      return {
        success: true,
        data: bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / pageSize),
          totalItems: total,
          itemsPerPage: pageSize
        }
      };

    } catch (error) {
      console.error('❌ Error getting all bookings:', error);
      throw new Error('Failed to retrieve bookings: ' + error.message);
    }
  }

  async createBooking(bookingData) {
    return await this.createWalkInBooking(bookingData);
  }

  async updateBooking(bookingID, updateData) {
    return { success: true, message: 'Update method not implemented yet' };
  }

  async deleteBooking(bookingID) {
    return { success: true, message: 'Delete method not implemented yet' };
  }

  // ✅ THÊM: Method để check xem booking đã được gán phòng chưa
  async isBookingRoomAssigned(bookingID) {
    try {
      const pool = await this.pool;
      
      const query = `
        SELECT 
          COUNT(*) as RoomCount,
          CASE 
            WHEN COUNT(*) > 0 THEN 1 
            ELSE 0 
          END as IsAssigned
        FROM BookingRoom 
        WHERE BookingID = @bookingID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      const result = await request.query(query);
      
      return {
        success: true,
        isAssigned: result.recordset[0].IsAssigned === 1,
        roomCount: result.recordset[0].RoomCount
      };
      
    } catch (error) {
      console.error('Error checking booking room assignment:', error);
      return {
        success: false,
        isAssigned: false,
        roomCount: 0,
        error: error.message
      };
    }
  }

  // ✅ THÊM: Method để lấy danh sách phòng đã được gán cho booking
  async getAssignedRooms(bookingID) {
    try {
      const pool = await this.pool;
      
      const query = `
        SELECT 
          br.BookingRoomID,
          br.RoomID,
          br.CheckInAt,
          br.CheckOutAt,
          r.RoomNumber,
          r.Status as RoomStatus,
          rt.TypeName,
          rt.TypeID
        FROM BookingRoom br
        INNER JOIN Room r ON br.RoomID = r.RoomID
        INNER JOIN RoomType rt ON r.TypeID = rt.TypeID
        WHERE br.BookingID = @bookingID
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      const result = await request.query(query);
      
      return {
        success: true,
        rooms: result.recordset.map(row => ({
          bookingRoomID: row.BookingRoomID,
          roomID: row.RoomID,
          roomNumber: row.RoomNumber,
          roomStatus: row.RoomStatus,
          typeID: row.TypeID,
          typeName: row.TypeName,
          checkInAt: row.CheckInAt,
          checkOutAt: row.CheckOutAt
        }))
      };
      
    } catch (error) {
      console.error('Error getting assigned rooms:', error);
      return {
        success: false,
        rooms: [],
        error: error.message
      };
    }
  }

  // ✅ THÊM: Method để check-in booking đã được gán phòng (chỉ update status)
  async directCheckInAssignedBooking(bookingID) {
    let transaction = null;
    
    try {
      const pool = await this.pool;
      transaction = new mssql.Transaction(pool);
      await transaction.begin();

      // 1. Check if booking has assigned rooms
      const assignedRoomsCheck = await this.isBookingRoomAssigned(bookingID);
      if (!assignedRoomsCheck.success || !assignedRoomsCheck.isAssigned) {
        throw new Error('Booking này chưa được gán phòng');
      }

      // 2. Get assigned rooms
      const assignedRoomsResult = await this.getAssignedRooms(bookingID);
      if (!assignedRoomsResult.success) {
        throw new Error('Không thể lấy danh sách phòng đã gán');
      }

      // 3. Update room status to 'Occupied'
      for (const room of assignedRoomsResult.rooms) {
        const updateRoomQuery = `
          UPDATE Room 
          SET Status = 'Occupied', UpdateAt = @updateAt
          WHERE RoomID = @roomID
        `;
        
        const updateRequest = transaction.request();
        updateRequest.input('roomID', mssql.Int, room.roomID);
        updateRequest.input('updateAt', mssql.DateTime, new Date());
        
        await updateRequest.query(updateRoomQuery);
      }

      // 4. Update booking status to 'CheckedIn'
      const updateBookingQuery = `
        UPDATE Booking 
        SET BookingStatus = 'CheckedIn', UpdateAt = @updateAt
        WHERE BookingID = @bookingID
      `;
      
      const bookingUpdateRequest = transaction.request();
      bookingUpdateRequest.input('bookingID', mssql.Int, bookingID);
      bookingUpdateRequest.input('updateAt', mssql.DateTime, new Date());
      
      await bookingUpdateRequest.query(updateBookingQuery);

      await transaction.commit();
      
      console.log(`✅ Direct check-in successful for booking ${bookingID} with ${assignedRoomsResult.rooms.length} assigned rooms`);
      
      return {
        success: true,
        message: 'Check-in thành công cho booking đã được gán phòng',
        data: {
          bookingID,
          roomsUpdated: assignedRoomsResult.rooms.length,
          assignedRooms: assignedRoomsResult.rooms
        }
      };
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('❌ Error in direct check-in:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi check-in booking đã được gán phòng'
      };
    }
  }

  // ✅ THÊM: Method để check-out booking và giải phóng phòng
  async checkOutOnlineBooking(bookingID, checkoutData = {}) {
    let transaction = null;
    
    try {
      const pool = await this.pool;
      transaction = new mssql.Transaction(pool);
      await transaction.begin();

      console.log(`🚪 Starting check-out process for booking ${bookingID}`);

      // 1. Validate booking is in CheckedIn status
      const bookingCheckQuery = `
        SELECT BookingID, BookingStatus 
        FROM Booking 
        WHERE BookingID = @bookingID AND BookingStatus = 'CheckedIn'
      `;
      
      const checkRequest = transaction.request();
      checkRequest.input('bookingID', mssql.Int, bookingID);
      const bookingResult = await checkRequest.query(bookingCheckQuery);
      
      if (bookingResult.recordset.length === 0) {
        throw new Error('Booking không tồn tại hoặc không ở trạng thái CheckedIn');
      }

      // 2. Get assigned rooms to release
      const assignedRoomsResult = await this.getAssignedRooms(bookingID);
      if (!assignedRoomsResult.success) {
        throw new Error('Không thể lấy danh sách phòng đã gán');
      }

      // 3. Update room status to 'Available'
      for (const room of assignedRoomsResult.rooms) {
        const updateRoomQuery = `
          UPDATE Room 
          SET Status = 'Available', UpdateAt = @updateAt
          WHERE RoomID = @roomID
        `;
        
        const updateRequest = transaction.request();
        updateRequest.input('roomID', mssql.Int, room.roomID);
        updateRequest.input('updateAt', mssql.DateTime, new Date());
        
        await updateRequest.query(updateRoomQuery);
        console.log(`✅ Room ${room.roomNumber} (ID: ${room.roomID}) status updated to Available`);
      }

      // 4. Update booking status to 'CheckedOut'
      const updateBookingQuery = `
        UPDATE Booking 
        SET BookingStatus = 'CheckedOut', UpdateAt = @updateAt
        WHERE BookingID = @bookingID
      `;
      
      const bookingUpdateRequest = transaction.request();
      bookingUpdateRequest.input('bookingID', mssql.Int, bookingID);
      bookingUpdateRequest.input('updateAt', mssql.DateTime, new Date());
      
      await bookingUpdateRequest.query(updateBookingQuery);

      await transaction.commit();
      
      console.log(`✅ Check-out successful for booking ${bookingID} - Released ${assignedRoomsResult.rooms.length} rooms`);
      
      return {
        success: true,
        message: 'Check-out thành công, phòng đã được giải phóng',
        data: {
          bookingID,
          roomsReleased: assignedRoomsResult.rooms.length,
          releasedRooms: assignedRoomsResult.rooms.map(room => ({
            roomID: room.roomID,
            roomNumber: room.roomNumber,
            roomType: room.typeName,
            newStatus: 'Available'
          })),
          checkOutTime: new Date().toISOString()
        }
      };
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('❌ Error in check-out:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi check-out booking'
      };
    }
  }

  // ✅ THÊM: Method để lấy chi tiết CheckInAt và CheckOutAt cho từng BookingRoomType  
  async getBookingRoomTypeDetails(bookingID) {
    try {
      const pool = await this.pool;
      
      const query = `
        SELECT 
          brt.BookingRoomTypeID,
          brt.BookingID,
          brt.RoomTypeID,
          brt.Quantity,
          brt.CheckInAt,
          brt.CheckOutAt,
          rt.TypeName as RoomTypeName,
          rt.BasePrice
        FROM BookingRoomType brt
        INNER JOIN RoomType rt ON brt.RoomTypeID = rt.TypeId
        WHERE brt.BookingID = @bookingID
        ORDER BY brt.CheckInAt ASC
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      const roomTypeDetails = result.recordset.map(row => ({
        bookingRoomTypeID: row.BookingRoomTypeID,
        bookingID: row.BookingID,
        roomTypeID: row.RoomTypeID,
        roomTypeName: row.RoomTypeName,
        quantity: row.Quantity,
        price: row.BasePrice,
        checkInAt: row.CheckInAt,
        checkOutAt: row.CheckOutAt
      }));
      
      return {
        success: true,
        data: roomTypeDetails
      };
      
    } catch (error) {
      console.error('❌ Error getting booking room type details:', error);
      throw new Error('Failed to retrieve booking room type details: ' + error.message);
    }
  }

  // ✅ THÊM: Assign rooms to online booking method
  // ✅ THÊM: Method để confirm booking (chỉ chuyển trạng thái, không gán phòng)
  async confirmOnlineBooking(bookingID) {
    try {
      console.log('🔄 Confirming online booking (no room assignment):', bookingID);

      const pool = await this.pool;
      const request = new mssql.Request(pool);

      // Validate booking exists and is in pending status
      const bookingCheckQuery = `
        SELECT BookingID, BookingStatus, BookingType
        FROM Booking 
        WHERE BookingID = @bookingID AND BookingType = 1 AND BookingStatus = 'Pending'
      `;
      
      request.input('bookingID', mssql.Int, bookingID);
      const bookingResult = await request.query(bookingCheckQuery);
      
      if (bookingResult.recordset.length === 0) {
        throw new Error('Booking không tồn tại, không phải online booking, hoặc không ở trạng thái Pending');
      }

      // Update booking status to 'Confirmed'
      const updateQuery = `
        UPDATE Booking 
        SET BookingStatus = 'Confirmed', UpdateAt = @updateAt
        WHERE BookingID = @bookingID
      `;
      
      const updateRequest = new mssql.Request(pool);
      updateRequest.input('bookingID', mssql.Int, bookingID);
      updateRequest.input('updateAt', mssql.DateTime, new Date());
      
      await updateRequest.query(updateQuery);

      console.log('✅ Online booking confirmed successfully');

      return {
        success: true,
        message: 'Xác nhận booking thành công',
        data: {
          bookingID,
          newStatus: 'Confirmed'
        }
      };

    } catch (error) {
      console.error('❌ Error confirming online booking:', error);
      return {
        success: false,
        message: 'Lỗi khi xác nhận booking: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ SỬA: Rename method để rõ ràng hơn - đây là check-in thực tế
  async checkInOnlineBooking(bookingID, assignmentData) {
    let transaction = null;
    
    try {
      const { selectedRooms, receptionistID, assignedBy } = assignmentData;
      
      console.log('🔄 Starting check-in process for online booking:', {
        bookingID,
        roomsToAssign: selectedRooms?.length || 0,
        receptionistID,
        assignedBy
      });

      const pool = await this.pool;
      transaction = new mssql.Transaction(pool);
      await transaction.begin();

      // 1. Validate booking exists and is confirmed (ready for check-in)
      const bookingCheckQuery = `
        SELECT BookingID, BookingStatus, BookingType, NumberOfGuest
        FROM Booking 
        WHERE BookingID = @bookingID AND BookingType = 1 AND BookingStatus = 'Confirmed'
      `;
      
      const bookingRequest = transaction.request();
      bookingRequest.input('bookingID', mssql.Int, bookingID);
      const bookingResult = await bookingRequest.query(bookingCheckQuery);
      
      if (bookingResult.recordset.length === 0) {
        throw new Error('Booking không tồn tại, không phải online booking, hoặc không ở trạng thái Confirmed');
      }

      const booking = bookingResult.recordset[0];
      
      // 2. Check if booking already has room assignments
      const existingRoomsQuery = `SELECT COUNT(*) as RoomCount FROM BookingRoom WHERE BookingID = @bookingID`;
      const existingRoomsRequest = transaction.request();
      existingRoomsRequest.input('bookingID', mssql.Int, bookingID);
      const existingRoomsResult = await existingRoomsRequest.query(existingRoomsQuery);
      
      if (existingRoomsResult.recordset[0].RoomCount > 0) {
        throw new Error('Booking này đã được gán phòng và check-in rồi');
      }

      // 3. Insert room assignments for check-in
      const assignedRooms = [];
      
      // ✅ DEBUG: Log selectedRooms structure
      console.log('🔍 DEBUG selectedRooms structure:', JSON.stringify(selectedRooms, null, 2));
      
      for (const room of selectedRooms) {
        // ✅ DEBUG: Log individual room structure
        console.log('🔍 DEBUG individual room:', JSON.stringify(room, null, 2));
        
        // ✅ SỬA: Tìm roomID từ roomNumber nếu chỉ có roomNumber
        let roomID = room.roomID || room.RoomID || room.id || room.ID;
        
        if (!roomID && room.roomNumber) {
          // Query để tìm roomID từ roomNumber
          console.log(`🔍 Looking up roomID for roomNumber: ${room.roomNumber}`);
          const roomLookupQuery = `SELECT RoomID FROM Room WHERE RoomNumber = @roomNumber`;
          const roomLookupRequest = transaction.request();
          roomLookupRequest.input('roomNumber', mssql.NVarChar, room.roomNumber);
          const roomLookupResult = await roomLookupRequest.query(roomLookupQuery);
          
          if (roomLookupResult.recordset.length > 0) {
            roomID = roomLookupResult.recordset[0].RoomID;
            console.log(`✅ Found roomID ${roomID} for roomNumber ${room.roomNumber}`);
          }
        }
        
        if (!roomID) {
          console.error('❌ ERROR: Cannot find roomID in room object:', room);
          throw new Error(`Room object thiếu roomID và không thể tìm từ roomNumber: ${JSON.stringify(room)}`);
        }
        
        console.log(`🏨 Assigning room ${roomID} to booking ${bookingID}`);
        
        const insertRoomQuery = `
          INSERT INTO BookingRoom (BookingID, RoomID, CheckInAt, CheckOutAt)
          VALUES (@bookingID, @roomID, @checkInAt, @checkOutAt)
        `;
        
        const insertRequest = transaction.request();
        insertRequest.input('bookingID', mssql.Int, bookingID);
        insertRequest.input('roomID', mssql.Int, roomID);
        insertRequest.input('checkInAt', mssql.DateTime, room.checkInAt || new Date());
        insertRequest.input('checkOutAt', mssql.DateTime, room.checkOutAt || new Date());
        
        await insertRequest.query(insertRoomQuery);

        // 4. Update room status to 'occupied' (đang sử dụng) since this is actual check-in
        const updateRoomStatusQuery = `
          UPDATE Room 
          SET Status = 'Occupied', UpdateAt = @updateAt
          WHERE RoomID = @roomID
        `;
        
        const updateRoomRequest = transaction.request();
        updateRoomRequest.input('roomID', mssql.Int, roomID); // ✅ SỬA: Sử dụng roomID đã validate
        updateRoomRequest.input('updateAt', mssql.DateTime, new Date());
        
        await updateRoomRequest.query(updateRoomStatusQuery);

        assignedRooms.push({
          roomID: roomID, // ✅ SỬA: Sử dụng roomID đã validate
          roomNumber: room.roomNumber || room.RoomNumber || `Room ${roomID}`,
          checkInAt: room.checkInAt || new Date(),
          checkOutAt: room.checkOutAt || new Date()
        });
      }

      // 5. Update booking status to 'CheckedIn' (indicating actual check-in completed)
      const updateBookingQuery = `
        UPDATE Booking 
        SET BookingStatus = 'CheckedIn', ReceptionistID = @receptionistID, UpdateAt = @updateAt
        WHERE BookingID = @bookingID
      `;
      
      const updateBookingRequest = transaction.request();
      updateBookingRequest.input('bookingID', mssql.Int, bookingID);
      updateBookingRequest.input('receptionistID', mssql.Int, receptionistID);
      updateBookingRequest.input('updateAt', mssql.DateTime, new Date());
      
      await updateBookingRequest.query(updateBookingQuery);

      await transaction.commit();

      console.log('✅ Online booking check-in completed successfully');

      return {
        success: true,
        message: 'Check-in thành công - Đã gán phòng và chuyển sang trạng thái đang sử dụng',
        data: {
          bookingID,
          assignedRooms,
          newStatus: 'CheckedIn',
          totalRooms: assignedRooms.length
        }
      };

    } catch (error) {
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('❌ Error rolling back transaction:', rollbackError);
        }
      }
      
      console.error('❌ Error during online booking check-in:', error);
      return {
        success: false,
        message: 'Lỗi khi check-in: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ THÊM: Get online bookings for management với check room assignment status
  async getOnlineBookingsForManagement(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 10,
        status,
        customerName,
        roomType,
        dateFrom,
        dateTo
      } = options;

      console.log('🔍 Getting online bookings for management with room assignment status...');

      const pool = await this.pool;
      const request = new mssql.Request(pool);

      // Build WHERE conditions
      let whereConditions = ['b.BookingType = 1']; // Online bookings only
      let paramIndex = 1;

      // Status filter
      if (status) {
        whereConditions.push(`b.BookingStatus = @status${paramIndex}`);
        request.input(`status${paramIndex}`, mssql.NVarChar(50), status);
        paramIndex++;
      }

      // Customer name filter
      if (customerName) {
        whereConditions.push(`u.Fullname LIKE @customerName${paramIndex}`);
        request.input(`customerName${paramIndex}`, mssql.NVarChar(255), `%${customerName}%`);
        paramIndex++;
      }

      // Date range filters
      if (dateFrom) {
        whereConditions.push(`b.CheckInDate >= @dateFrom${paramIndex}`);
        request.input(`dateFrom${paramIndex}`, mssql.DateTime, new Date(dateFrom));
        paramIndex++;
      }

      if (dateTo) {
        whereConditions.push(`b.CheckOutDate <= @dateTo${paramIndex}`);
        request.input(`dateTo${paramIndex}`, mssql.DateTime, new Date(dateTo));
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // ✅ QUAN TRỌNG: Query với check room assignment status
      const mainQuery = `
        SELECT 
          b.BookingID,
          b.CustomerID,
          b.ReceptionistID,
          b.NumberOfGuest,
          b.SpecialRequest,
          b.BookingType,
          b.BookingStatus,
          b.BookingAt,
          b.CheckInDate,
          b.CheckOutDate,
          b.CreateAt,
          b.UpdateAt,
          u.Fullname as CustomerName,
          u.Email as CustomerEmail,
          u.PhoneNumber as CustomerPhone,
          -- ✅ THÊM: Check room assignment status
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM BookingRoom br 
              WHERE br.BookingID = b.BookingID
            ) THEN 1 
            ELSE 0 
          END as IsRoomAssigned,
          -- Count assigned rooms
          (
            SELECT COUNT(*) FROM BookingRoom br 
            WHERE br.BookingID = b.BookingID
          ) as AssignedRoomsCount
        FROM Booking b
        LEFT JOIN [User] u ON b.CustomerID = u.UserID
        ${whereClause}
        ORDER BY b.CreateAt DESC
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `;

      // Pagination parameters
      const offset = (page - 1) * pageSize;
      request.input('offset', mssql.Int, offset);
      request.input('pageSize', mssql.Int, pageSize);

      console.log('📄 Executing online bookings query with room assignment check...');
      const result = await request.query(mainQuery);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as TotalCount
        FROM Booking b
        LEFT JOIN [User] u ON b.CustomerID = u.UserID
        ${whereClause}
      `;

      const countRequest = new mssql.Request(pool);
      // Re-add parameters for count query
      paramIndex = 1;
      if (status) {
        countRequest.input(`status${paramIndex}`, mssql.NVarChar(50), status);
        paramIndex++;
      }
      if (customerName) {
        countRequest.input(`customerName${paramIndex}`, mssql.NVarChar(255), `%${customerName}%`);
        paramIndex++;
      }
      if (dateFrom) {
        countRequest.input(`dateFrom${paramIndex}`, mssql.DateTime, new Date(dateFrom));
        paramIndex++;
      }
      if (dateTo) {
        countRequest.input(`dateTo${paramIndex}`, mssql.DateTime, new Date(dateTo));
        paramIndex++;
      }

      const countResult = await countRequest.query(countQuery);
      const totalCount = countResult.recordset[0].TotalCount;

      // Format bookings data
      const bookings = result.recordset.map(booking => ({
        ...booking,
        // ✅ THÊM: Room assignment status fields
        isRoomAssigned: Boolean(booking.IsRoomAssigned),
        assignedRoomsCount: booking.AssignedRoomsCount || 0,
        canAssignRooms: !Boolean(booking.IsRoomAssigned), // Can only assign if not already assigned
        displayCustomerName: booking.CustomerName || 'N/A',
        displayCustomerPhone: booking.CustomerPhone || 'N/A'
      }));

      console.log(`✅ Found ${bookings.length} online bookings, ${bookings.filter(b => b.isRoomAssigned).length} with rooms assigned`);

      return {
        success: true,
        data: {
          bookings,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / pageSize),
            totalItems: totalCount,
            itemsPerPage: pageSize
          }
        }
      };

    } catch (error) {
      console.error('❌ Error getting online bookings for management:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy danh sách booking online: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ THÊM: Get booking history for a specific user
  async getUserBookingHistory(userID, page = 1, pageSize = 10, statusFilter = '', dateFrom = '', dateTo = '') {
    try {
      console.log(`🔍 Getting booking history for user ${userID}...`);
      
      const pool = await this.pool;
      const request = pool.request();

      let query = `
        SELECT
          b.BookingID, b.CustomerID, b.ReceptionistID, b.NumberOfGuest,
          LTRIM(RTRIM(b.SpecialRequest)) as SpecialRequest, 
          b.BookingType, b.BookingAt, 
          b.CreateAt, b.UpdateAt, 
          LTRIM(RTRIM(b.BookingStatus)) as BookingStatus,
          
          -- Customer info - with TRIM
          LTRIM(RTRIM(u.Fullname)) as CustomerName,
          LTRIM(RTRIM(u.Email)) as CustomerEmail,
          LTRIM(RTRIM(u.PhoneNumber)) as CustomerPhone,
          
          -- Receptionist info - with TRIM
          LTRIM(RTRIM(r.Fullname)) as ReceptionistName,
          
          -- Room types aggregated
          STRING_AGG(CONCAT(rt.TypeName, ' (', brt.Quantity, ')'), ', ') as RoomTypesDisplay,
          
          -- Check-in/Check-out dates từ BookingRoomType
          MIN(brt.CheckInAt) as CheckInDate,
          MAX(brt.CheckOutAt) as CheckOutDate
          
        FROM Booking b
        LEFT JOIN [User] u ON b.CustomerID = u.UserID
        LEFT JOIN [User] r ON b.ReceptionistID = r.UserID
        LEFT JOIN BookingRoomType brt ON b.BookingID = brt.BookingID
        LEFT JOIN RoomType rt ON brt.RoomTypeID = rt.TypeId
        WHERE b.CustomerID = @userID AND b.BookingType = 1
      `;

      // ✅ SỬA: Sử dụng mssql.Int đúng cách
      request.input('userID', mssql.Int, userID);

      // Add status filter
      if (statusFilter && statusFilter.trim()) {
        query += ` AND b.BookingStatus = @statusFilter`;
        request.input('statusFilter', mssql.NVarChar(50), statusFilter.trim());
      }

      // Add date range filters
      if (dateFrom && dateFrom.trim()) {
        query += ` AND CAST(b.CreateAt AS DATE) >= @dateFrom`;
        request.input('dateFrom', mssql.Date, dateFrom.trim());
      }

      if (dateTo && dateTo.trim()) {
        query += ` AND CAST(b.CreateAt AS DATE) <= @dateTo`;
        request.input('dateTo', mssql.Date, dateTo.trim());
      }

      // Group by all non-aggregated columns
      query += `
        GROUP BY 
          b.BookingID, b.CustomerID, b.ReceptionistID, b.NumberOfGuest,
          b.SpecialRequest, b.BookingType, b.BookingAt,
          b.CreateAt, b.UpdateAt, b.BookingStatus,
          u.Fullname, u.Email, u.PhoneNumber,
          r.Fullname
        ORDER BY b.CreateAt DESC
      `;

      // Add pagination
      const offset = (page - 1) * pageSize;
      query += ` OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
      request.input('offset', offset);
      request.input('pageSize', pageSize);

      const result = await request.query(query);

      // Get total count for pagination
      const countRequest = pool.request();
      let countQuery = `SELECT COUNT(DISTINCT b.BookingID) as Total FROM Booking b WHERE b.CustomerID = @userID AND b.BookingType = 1`;
      
      // ✅ SỬA: Sử dụng mssql.Int đúng cách
      countRequest.input('userID', mssql.Int, userID);

      if (statusFilter && statusFilter.trim()) {
        countQuery += ` AND b.BookingStatus = @statusFilter`;
        countRequest.input('statusFilter', mssql.NVarChar(50), statusFilter.trim());
      }

      if (dateFrom && dateFrom.trim()) {
        countQuery += ` AND CAST(b.CreateAt AS DATE) >= @dateFrom`;
        countRequest.input('dateFrom', mssql.Date, dateFrom.trim());
      }

      if (dateTo && dateTo.trim()) {
        countQuery += ` AND CAST(b.CreateAt AS DATE) <= @dateTo`;
        countRequest.input('dateTo', mssql.Date, dateTo.trim());
      }

      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].Total;

      // Format the results
      const bookings = result.recordset.map(row => ({
        bookingID: row.BookingID,
        customerID: row.CustomerID,
        receptionistID: row.ReceptionistID,
        numberOfGuest: row.NumberOfGuest,
        specialRequest: row.SpecialRequest,
        bookingType: row.BookingType,
        bookingAt: row.BookingAt,
        createAt: row.CreateAt,
        updateAt: row.UpdateAt,
        bookingStatus: row.BookingStatus,
        
        // Customer info
        customerName: row.CustomerName,
        customerEmail: row.CustomerEmail,
        customerPhone: row.CustomerPhone,
        
        // Receptionist info
        receptionistName: row.ReceptionistName,
        
        // Room and payment info
        roomTypesDisplay: row.RoomTypesDisplay || 'Chưa có thông tin phòng',
        checkInDate: row.CheckInDate,
        checkOutDate: row.CheckOutDate,
        totalPaid: row.TotalPaid || 0,
        assignedRoomsCount: row.AssignedRoomsCount || 0,
        
        // Status indicators
        isRoomAssigned: (row.AssignedRoomsCount || 0) > 0,
        canCancel: row.BookingStatus === 'Pending' || row.BookingStatus === 'Confirmed',
        canCheckIn: row.BookingStatus === 'Confirmed' && (row.AssignedRoomsCount || 0) > 0
      }));

      // Get detailed room type information for each booking
      for (let booking of bookings) {
        try {
          const roomTypeDetailsResult = await this.getBookingRoomTypeDetails(booking.bookingID);
          if (roomTypeDetailsResult.success) {
            booking.roomTypeDetails = roomTypeDetailsResult.data;
            
            // ✅ ADD: Map roomTypeDetails to RoomTypes for frontend compatibility
            booking.RoomTypes = roomTypeDetailsResult.data.map(rt => ({
              TypeName: rt.roomTypeName,
              Quantity: rt.quantity,
              Price: rt.price
            }));
          } else {
            booking.roomTypeDetails = [];
            booking.RoomTypes = [];
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch room type details for booking ${booking.bookingID}:`, error.message);
          booking.roomTypeDetails = [];
          booking.RoomTypes = [];
        }

        // ✅ ADD: Map field names to match frontend expectations
        booking.BookingID = booking.bookingID;
        booking.BookingStatus = booking.bookingStatus;
        booking.CreateAt = booking.createAt;
        booking.CustomerID = booking.customerID;
      }

      console.log(`✅ Retrieved ${bookings.length} booking history records for user ${userID}`);

      return {
        success: true,
        data: bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / pageSize),
          totalItems: total,
          itemsPerPage: pageSize
        }
      };

    } catch (error) {
      console.error('❌ Error getting user booking history:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        userID,
        parameters: { page, pageSize, statusFilter, dateFrom, dateTo }
      });
      return {
        success: false,
        message: 'Lỗi khi lấy lịch sử booking: ' + error.message,
        error: error.message
      };
    }
  }
}

export default BookingDBContext;