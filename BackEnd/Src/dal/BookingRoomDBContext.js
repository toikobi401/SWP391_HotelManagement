import mssql from 'mssql';
import DBContext from './DBContext.js';
import BookingRoom from '../model/BookingRoom.js';

class BookingRoomDBContext extends DBContext {
  constructor() {
    super();
  }

  // ✅ SỬA: Get booking room by room ID - sử dụng pool.request() thay vì executeQuery
  async getByRoomId(roomID) {
    try {
      console.log(`🔍 Getting booking room by room ID: ${roomID}`);
      
      const pool = await this.pool;
      
      const query = `
        SELECT 
          br.BookingRoomID,
          br.BookingID,
          br.RoomID,
          br.CheckInAt,
          br.CheckOutAt,
          b.BookingStatus
        FROM BookingRoom br
        INNER JOIN Booking b ON br.BookingID = b.BookingID
        WHERE br.RoomID = @roomID
          AND b.BookingStatus NOT IN ('Cancelled', 'No-Show', 'Completed')
        ORDER BY br.CheckInAt DESC
      `;
      
      // ✅ SỬA: Sử dụng pool.request() trực tiếp
      const request = pool.request();
      request.input('roomID', mssql.Int, roomID);
      
      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        console.log(`✅ No active booking found for room ${roomID}`);
        return {
          success: true,
          data: null,
          message: 'No active booking found for this room'
        };
      }
      
      const row = result.recordset[0];
      const bookingRoom = {
        bookingRoomID: row.BookingRoomID,
        bookingID: row.BookingID,
        roomID: row.RoomID,
        checkInAt: row.CheckInAt,
        checkOutAt: row.CheckOutAt,
        bookingStatus: row.BookingStatus
      };
      
      console.log(`✅ Found active booking for room ${roomID}:`, bookingRoom);
      
      return {
        success: true,
        data: bookingRoom
      };
      
    } catch (error) {
      console.error('❌ Error getting booking room by room ID:', error);
      return {
        success: false,
        message: 'Lỗi khi kiểm tra room assignment',
        error: error.message
      };
    }
  }

  // ✅ THÊM: Get all booking rooms with pagination - sử dụng pool.request()
  async getAllBookingRooms(page = 1, pageSize = 20) {
    try {
      console.log(`🏨 Getting booking rooms - Page: ${page}, Size: ${pageSize}`);
      
      const pool = await this.pool;
      const offset = (page - 1) * pageSize;
      
      // Count query
      const countRequest = pool.request();
      const countResult = await countRequest.query('SELECT COUNT(*) as total FROM BookingRoom');
      const totalCount = countResult.recordset[0].total;
      
      // Main query
      const query = `
        SELECT 
          br.BookingRoomID,
          br.BookingID,
          br.RoomID,
          br.CheckInAt,
          br.CheckOutAt,
          r.RoomNumber,
          rt.TypeName as RoomTypeName
        FROM BookingRoom br
        LEFT JOIN Room r ON br.RoomID = r.RoomID
        LEFT JOIN RoomType rt ON r.TypeID = rt.TypeId
        ORDER BY br.CheckInAt DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;
      
      const request = pool.request();
      request.input('offset', mssql.Int, offset);
      request.input('pageSize', mssql.Int, pageSize);
      
      const result = await request.query(query);
      
      const bookingRooms = result.recordset.map(row => ({
        ...BookingRoom.fromDatabase(row).toJSON(),
        roomInfo: {
          roomNumber: row.RoomNumber,
          roomTypeName: row.RoomTypeName
        }
      }));
      
      const totalPages = Math.ceil(totalCount / pageSize);
      
      return {
        success: true,
        data: bookingRooms,
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
      console.error('❌ Error getting booking rooms:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy danh sách phòng đặt',
        error: error.message
      };
    }
  }

  // ✅ SỬA: Get booking rooms by booking ID - sử dụng pool.request()
  async getByBookingId(bookingID) {
    try {
      console.log(`🔍 Getting booking rooms for booking: ${bookingID}`);
      
      const pool = await this.pool;
      
      const query = `
        SELECT 
          br.BookingRoomID,
          br.BookingID,
          br.RoomID,
          br.CheckInAt,
          br.CheckOutAt,
          r.RoomNumber,
          r.CurrentPrice,
          rt.TypeName as RoomTypeName
        FROM BookingRoom br
        LEFT JOIN Room r ON br.RoomID = r.RoomID
        LEFT JOIN RoomType rt ON r.TypeID = rt.TypeId
        WHERE br.BookingID = @bookingID
        ORDER BY br.CheckInAt
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      const bookingRooms = result.recordset.map(row => ({
        ...BookingRoom.fromDatabase(row).toJSON(),
        roomInfo: {
          roomNumber: row.RoomNumber,
          roomTypeName: row.RoomTypeName,
          currentPrice: row.CurrentPrice
        }
      }));
      
      return {
        success: true,
        data: bookingRooms
      };
      
    } catch (error) {
      console.error('❌ Error getting booking rooms by booking ID:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy phòng đặt theo booking',
        error: error.message
      };
    }
  }

  // ✅ THÊM: Get booking room by ID - sử dụng pool.request()
  async getById(bookingRoomID) {
    try {
      console.log(`🔍 Getting booking room: ${bookingRoomID}`);
      
      const pool = await this.pool;
      
      const query = `
        SELECT 
          br.BookingRoomID,
          br.BookingID,
          br.RoomID,
          br.CheckInAt,
          br.CheckOutAt,
          r.RoomNumber,
          rt.TypeName as RoomTypeName
        FROM BookingRoom br
        LEFT JOIN Room r ON br.RoomID = r.RoomID
        LEFT JOIN RoomType rt ON r.TypeID = rt.TypeId
        WHERE br.BookingRoomID = @bookingRoomID
      `;
      
      const request = pool.request();
      request.input('bookingRoomID', mssql.Int, bookingRoomID);
      
      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return {
          success: false,
          notFound: true,
          message: 'Không tìm thấy booking room'
        };
      }
      
      const row = result.recordset[0];
      const bookingRoom = {
        ...BookingRoom.fromDatabase(row).toJSON(),
        roomInfo: {
          roomNumber: row.RoomNumber,
          roomTypeName: row.RoomTypeName
        }
      };
      
      return {
        success: true,
        data: bookingRoom
      };
      
    } catch (error) {
      console.error('❌ Error getting booking room by ID:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy thông tin booking room',
        error: error.message
      };
    }
  }

  // ✅ Assign rooms to booking method (giữ nguyên - đã hoạt động tốt)
  async assignRoomsToBooking(bookingID, selectedRooms) {
    let transaction = null;
    
    try {
      const pool = await this.pool;
      transaction = new mssql.Transaction(pool);
      
      await transaction.begin();
      console.log(`🏨 Starting room assignment for booking ${bookingID}...`);
      
      // Lấy thông tin booking để có CheckInAt và CheckOutAt
      const bookingQuery = `
        SELECT BookingAt, NumberOfGuest 
        FROM Booking 
        WHERE BookingID = @bookingID
      `;
      
      const bookingRequest = new mssql.Request(transaction);
      bookingRequest.input('bookingID', mssql.Int, bookingID);
      const bookingResult = await bookingRequest.query(bookingQuery);
      
      if (bookingResult.recordset.length === 0) {
        throw new Error('Booking không tồn tại');
      }
      
      // Sử dụng BookingAt làm CheckInAt, và tính CheckOutAt (giả sử 1 đêm)
      const bookingAt = bookingResult.recordset[0].BookingAt || new Date();
      const checkInAt = new Date(bookingAt);
      const checkOutAt = new Date(checkInAt);
      checkOutAt.setDate(checkOutAt.getDate() + 1); // Thêm 1 ngày
      
      for (const roomData of selectedRooms) {
        const request = new mssql.Request(transaction);
        
        // ✅ SỬA: Query đúng theo schema thực tế
        const insertQuery = `
          INSERT INTO BookingRoom (
            BookingID, RoomID, CheckInAt, CheckOutAt
          )
          VALUES (
            @bookingID, @roomID, @checkInAt, @checkOutAt
          )
        `;
        
        request.input('bookingID', mssql.Int, bookingID);
        request.input('roomID', mssql.Int, roomData.RoomID || roomData.roomID);
        request.input('checkInAt', mssql.DateTime, checkInAt);
        request.input('checkOutAt', mssql.DateTime, checkOutAt);
        
        await request.query(insertQuery);
        console.log(`✅ Assigned room ${roomData.RoomID || roomData.roomID} to booking ${bookingID}`);
        
        // Update room status to "reserved" (đã đặt) thay vì "occupied"
        const updateRoomRequest = new mssql.Request(transaction);
        const updateRoomQuery = `
          UPDATE Room 
          SET Status = 'reserved', UpdateAt = @updateAt
          WHERE RoomID = @roomID
        `;
        
        updateRoomRequest.input('roomID', mssql.Int, roomData.RoomID || roomData.roomID);
        updateRoomRequest.input('updateAt', mssql.DateTime, new Date());
        
        await updateRoomRequest.query(updateRoomQuery);
        console.log(`✅ Updated room ${roomData.RoomID || roomData.roomID} status to reserved (đã đặt)`);
      }
      
      await transaction.commit();
      console.log('✅ Room assignment transaction committed successfully');
      
      return {
        success: true,
        message: `Đã gán ${selectedRooms.length} phòng cho booking ${bookingID}`,
        assignedRooms: selectedRooms.length,
        roomStatus: 'reserved', // ✅ Thông báo trạng thái phòng
        note: 'Phòng ở trạng thái "đã đặt". Cần thanh toán và check-in để chuyển sang "đang sử dụng".'
      };
      
    } catch (error) {
      console.error('❌ Error assigning rooms to booking:', error);
      
      if (transaction) {
        try {
          await transaction.rollback();
          console.log('🔄 Room assignment transaction rolled back');
        } catch (rollbackError) {
          console.error('❌ Error rolling back room assignment transaction:', rollbackError);
        }
      }
      
      return {
        success: false,
        message: 'Lỗi khi gán phòng cho booking: ' + error.message,
        error: error.message
      };
    }
  }

  // ✅ THÊM: Create new booking room - sử dụng pool.request()
  async create(bookingRoom) {
    try {
      const pool = await this.pool;
      
      const query = `
        INSERT INTO BookingRoom (BookingID, RoomID, CheckInAt, CheckOutAt)
        OUTPUT INSERTED.BookingRoomID
        VALUES (@bookingID, @roomID, @checkInAt, @checkOutAt)
      `;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingRoom.bookingID);
      request.input('roomID', mssql.Int, bookingRoom.roomID);
      request.input('checkInAt', mssql.DateTime, bookingRoom.checkInAt);
      request.input('checkOutAt', mssql.DateTime, bookingRoom.checkOutAt);
      
      const result = await request.query(query);
      
      return {
        success: true,
        bookingRoomID: result.recordset[0].BookingRoomID,
        message: 'Booking room created successfully'
      };
      
    } catch (error) {
      console.error('❌ Error creating booking room:', error);
      return {
        success: false,
        message: 'Lỗi khi tạo booking room',
        error: error.message
      };
    }
  }

  // ✅ THÊM: Delete all booking rooms for a booking - sử dụng pool.request()
  async deleteByBookingId(bookingID) {
    try {
      console.log(`🗑️ Deleting all booking rooms for booking: ${bookingID}`);
      
      const pool = await this.pool;
      
      const query = `DELETE FROM BookingRoom WHERE BookingID = @bookingID`;
      
      const request = pool.request();
      request.input('bookingID', mssql.Int, bookingID);
      
      const result = await request.query(query);
      
      return {
        success: true,
        message: `Xóa ${result.rowsAffected[0]} booking rooms thành công`,
        deletedCount: result.rowsAffected[0]
      };
      
    } catch (error) {
      console.error('❌ Error deleting booking rooms by booking ID:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa booking rooms',
        error: error.message
      };
    }
  }

  // Abstract methods implementations
  async list() {
    return await this.getAllBookingRooms();
  }

  async get(id) {
    return await this.getById(id);
  }

  async insert(bookingRoom) {
    return await this.create(bookingRoom);
  }

  async update(bookingRoom) {
    // Implementation for updating booking room
    return { success: true, message: 'Update method not implemented yet' };
  }

  async delete(id) {
    return await this.deleteBookingRoom(id);
  }

  // Placeholder method
  async deleteBookingRoom(bookingRoomID) {
    try {
      const pool = await this.pool;
      
      const query = `DELETE FROM BookingRoom WHERE BookingRoomID = @bookingRoomID`;
      
      const request = pool.request();
      request.input('bookingRoomID', mssql.Int, bookingRoomID);
      
      const result = await request.query(query);
      
      return {
        success: result.rowsAffected[0] > 0,
        message: result.rowsAffected[0] > 0 ? 'Xóa booking room thành công' : 'Không tìm thấy booking room để xóa'
      };
      
    } catch (error) {
      console.error('❌ Error deleting booking room:', error);
      return {
        success: false,
        message: 'Lỗi khi xóa booking room',
        error: error.message
      };
    }
  }
}

export default BookingRoomDBContext;