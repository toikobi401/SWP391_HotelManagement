import DBContext from './DBContext.js';
import mssql from 'mssql';
import BookingRoomType from '../model/BookingRoomType.js';

class BookingRoomTypeDBContext extends DBContext {
    constructor() {
        super();
        console.log('BookingRoomTypeDBContext initialized');
    }

    // ✅ CREATE BOOKING ROOM TYPE
    async create(bookingRoomTypeData) {
        try {
            console.log('➕ Creating booking room type:', bookingRoomTypeData);
            
            const pool = await this.pool;
            
            // ✅ Validate data trước khi insert
            const validation = BookingRoomType.validateBookingRoomType(bookingRoomTypeData);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Dữ liệu booking room type không hợp lệ',
                    errors: validation.errors
                };
            }

            const validatedData = validation.validatedData;
            
            const query = `
                INSERT INTO BookingRoomType (BookingID, RoomTypeID, Quantity, CheckInAt, CheckOutAt)
                OUTPUT INSERTED.BookingRoomTypeID
                VALUES (@bookingID, @roomTypeID, @quantity, @checkInAt, @checkOutAt)
            `;
            
            const request = pool.request();
            request.input('bookingID', mssql.Int, validatedData.bookingID);
            request.input('roomTypeID', mssql.Int, validatedData.roomTypeID);
            request.input('quantity', mssql.Int, validatedData.quantity);
            request.input('checkInAt', mssql.DateTime, validatedData.checkInAt);
            request.input('checkOutAt', mssql.DateTime, validatedData.checkOutAt);
            
            const result = await request.query(query);
            const bookingRoomTypeID = result.recordset[0].BookingRoomTypeID;
            
            console.log(`✅ Booking room type created with ID: ${bookingRoomTypeID}`);
            
            return {
                success: true,
                message: 'Tạo booking room type thành công',
                data: {
                    bookingRoomTypeID,
                    ...validatedData
                }
            };
            
        } catch (error) {
            console.error('❌ Error creating booking room type:', error);
            return {
                success: false,
                message: 'Lỗi khi tạo booking room type',
                error: error.message
            };
        }
    }

    // ✅ CREATE MULTIPLE BOOKING ROOM TYPES
    async createMultiple(bookingID, roomTypesData) {
        let transaction = null;
        
        try {
            const pool = await this.pool;
            transaction = new mssql.Transaction(pool);
            
            await transaction.begin();
            console.log(`➕ Creating ${roomTypesData.length} booking room types for booking: ${bookingID}`);
            
            // ✅ VALIDATE input data
            if (!Array.isArray(roomTypesData) || roomTypesData.length === 0) {
                throw new Error('RoomTypesData phải là array không rỗng');
            }
            
            const createdBookingRoomTypes = [];
            
            for (const roomTypeData of roomTypesData) {
                console.log('🔍 Processing room type:', {
                    bookingID,
                    roomTypeID: roomTypeData.roomTypeID,
                    quantity: roomTypeData.quantity,
                    rawData: roomTypeData
                });
                
                // ✅ SỬA: Improved data mapping với multiple field names support
                const bookingRoomTypeData = {
                    bookingID: bookingID,
                    roomTypeID: roomTypeData.roomTypeID || roomTypeData.roomTypeId || roomTypeData.id,
                    quantity: roomTypeData.quantity,
                    checkInAt: roomTypeData.checkInAt || null,
                    checkOutAt: roomTypeData.checkOutAt || null
                };
                
                console.log('🔄 Mapped booking room type data:', bookingRoomTypeData);
                
                const validation = BookingRoomType.validateBookingRoomType(bookingRoomTypeData);
                if (!validation.isValid) {
                    throw new Error(`Invalid room type data for booking ${bookingID}: ${validation.errors.map(e => e.message).join(', ')}`);
                }
                
                const validatedData = validation.validatedData;
                
                // ✅ Insert vào database
                const insertQuery = `
                    INSERT INTO BookingRoomType (BookingID, RoomTypeID, Quantity, CheckInAt, CheckOutAt)
                    OUTPUT INSERTED.BookingRoomTypeID
                    VALUES (@bookingID, @roomTypeID, @quantity, @checkInAt, @checkOutAt)
                `;
                
                const request = new mssql.Request(transaction);
                request.input('bookingID', mssql.Int, validatedData.bookingID);
                request.input('roomTypeID', mssql.Int, validatedData.roomTypeID);
                request.input('quantity', mssql.Int, validatedData.quantity);
                request.input('checkInAt', mssql.DateTime, validatedData.checkInAt);
                request.input('checkOutAt', mssql.DateTime, validatedData.checkOutAt);
                
                const result = await request.query(insertQuery);
                const bookingRoomTypeID = result.recordset[0].BookingRoomTypeID;
                
                const createdItem = {
                    bookingRoomTypeID,
                    bookingID: validatedData.bookingID,
                    roomTypeID: validatedData.roomTypeID,
                    quantity: validatedData.quantity,
                    // ✅ THÊM: Metadata cho debugging
                    roomTypeName: roomTypeData.name || `RoomType ${validatedData.roomTypeID}`,
                    roomTypePrice: roomTypeData.price || 0
                };
                
                createdBookingRoomTypes.push(createdItem);
                
                console.log(`✅ BookingRoomType ${bookingRoomTypeID} created: ${validatedData.quantity}x RoomType ${validatedData.roomTypeID}`);
            }
            
            await transaction.commit();
            
            console.log(`✅ Created ${createdBookingRoomTypes.length} booking room types successfully`);
            console.log('📊 Summary:', createdBookingRoomTypes.map(item => 
              `${item.quantity}x ${item.roomTypeName} (ID: ${item.roomTypeID})`
            ).join(', '));
            
            return {
                success: true,
                message: `Tạo ${createdBookingRoomTypes.length} booking room types thành công`,
                data: createdBookingRoomTypes
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
            
            console.error('❌ Error creating multiple booking room types:', error);
            
            return {
                success: false,
                message: 'Lỗi khi tạo multiple booking room types',
                error: error.message
            };
        }
    }

    // ✅ GET BOOKING ROOM TYPES BY BOOKING ID
    async getByBookingId(bookingID) {
        try {
            console.log(`🔍 Getting booking room types for booking: ${bookingID}`);
            
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
                    rt.BasePrice as RoomTypePrice,
                    rt.Description as RoomTypeDescription
                FROM BookingRoomType brt
                LEFT JOIN RoomType rt ON brt.RoomTypeID = rt.TypeId
                WHERE brt.BookingID = @bookingID
                ORDER BY brt.BookingRoomTypeID
            `;
            
            const request = pool.request();
            request.input('bookingID', mssql.Int, bookingID);
            
            const result = await request.query(query);
            
            const bookingRoomTypes = result.recordset.map(row => ({
                bookingRoomTypeID: row.BookingRoomTypeID,
                bookingID: row.BookingID,
                roomTypeID: row.RoomTypeID,
                quantity: row.Quantity,
                roomTypeInfo: {
                    typeName: row.RoomTypeName,
                    basePrice: row.RoomTypePrice,
                    description: row.RoomTypeDescription
                }
            }));
            
            console.log(`✅ Found ${bookingRoomTypes.length} booking room types for booking ${bookingID}`);
            
            return {
                success: true,
                data: bookingRoomTypes
            };
            
        } catch (error) {
            console.error('❌ Error getting booking room types by booking ID:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy booking room types theo booking ID',
                error: error.message
            };
        }
    }

    // ✅ GET BOOKING ROOM TYPE BY ID
    async getById(bookingRoomTypeID) {
        try {
            console.log(`🔍 Getting booking room type: ${bookingRoomTypeID}`);
            
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
                    rt.BasePrice as RoomTypePrice,
                    rt.Description as RoomTypeDescription
                FROM BookingRoomType brt
                LEFT JOIN RoomType rt ON brt.RoomTypeID = rt.TypeId
                WHERE brt.BookingRoomTypeID = @bookingRoomTypeID
            `;
            
            const request = pool.request();
            request.input('bookingRoomTypeID', mssql.Int, bookingRoomTypeID);
            
            const result = await request.query(query);
            
            if (result.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Booking room type không tồn tại'
                };
            }
            
            const row = result.recordset[0];
            const bookingRoomType = {
                bookingRoomTypeID: row.BookingRoomTypeID,
                bookingID: row.BookingID,
                roomTypeID: row.RoomTypeID,
                quantity: row.Quantity,
                roomTypeInfo: {
                    typeName: row.RoomTypeName,
                    basePrice: row.RoomTypePrice,
                    description: row.RoomTypeDescription
                }
            };
            
            console.log('✅ Booking room type found:', bookingRoomType);
            
            return {
                success: true,
                data: bookingRoomType
            };
            
        } catch (error) {
            console.error('❌ Error getting booking room type by ID:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy booking room type theo ID',
                error: error.message
            };
        }
    }

    // ✅ UPDATE BOOKING ROOM TYPE QUANTITY
    async updateQuantity(bookingRoomTypeID, newQuantity) {
        try {
            console.log(`🔄 Updating booking room type ${bookingRoomTypeID} quantity to: ${newQuantity}`);
            
            const pool = await this.pool;
            
            // ✅ Validate quantity
            const quantity = parseInt(newQuantity);
            if (quantity <= 0 || quantity > 100) {
                return {
                    success: false,
                    message: 'Số lượng phải từ 1 đến 100'
                };
            }
            
            const query = `
                UPDATE BookingRoomType 
                SET Quantity = @quantity
                WHERE BookingRoomTypeID = @bookingRoomTypeID
            `;
            
            const request = pool.request();
            request.input('quantity', mssql.Int, quantity);
            request.input('bookingRoomTypeID', mssql.Int, bookingRoomTypeID);
            
            const result = await request.query(query);
            
            if (result.rowsAffected[0] === 1) {
                console.log(`✅ Booking room type ${bookingRoomTypeID} quantity updated to ${quantity}`);
                return {
                    success: true,
                    message: 'Cập nhật số lượng thành công',
                    data: { bookingRoomTypeID, quantity }
                };
            } else {
                return {
                    success: false,
                    message: 'Booking room type không tồn tại hoặc không được cập nhật'
                };
            }
            
        } catch (error) {
            console.error('❌ Error updating booking room type quantity:', error);
            return {
                success: false,
                message: 'Lỗi khi cập nhật số lượng booking room type',
                error: error.message
            };
        }
    }

    // ✅ DELETE BOOKING ROOM TYPE
    async deleteById(bookingRoomTypeID) {
        try {
            console.log(`🗑️ Deleting booking room type: ${bookingRoomTypeID}`);
            
            const pool = await this.pool;
            
            const query = `
                DELETE FROM BookingRoomType 
                WHERE BookingRoomTypeID = @bookingRoomTypeID
            `;
            
            const request = pool.request();
            request.input('bookingRoomTypeID', mssql.Int, bookingRoomTypeID);
            
            const result = await request.query(query);
            
            if (result.rowsAffected[0] === 1) {
                console.log(`✅ Booking room type ${bookingRoomTypeID} deleted successfully`);
                return {
                    success: true,
                    message: 'Xóa booking room type thành công'
                };
            } else {
                return {
                    success: false,
                    message: 'Booking room type không tồn tại hoặc đã được xóa'
                };
            }
            
        } catch (error) {
            console.error('❌ Error deleting booking room type:', error);
            return {
                success: false,
                message: 'Lỗi khi xóa booking room type',
                error: error.message
            };
        }
    }

    // ✅ DELETE ALL BOOKING ROOM TYPES FOR A BOOKING
    async deleteByBookingId(bookingID) {
        try {
            console.log(`🗑️ Deleting all booking room types for booking: ${bookingID}`);
            
            const pool = await this.pool;
            
            const query = `
                DELETE FROM BookingRoomType 
                WHERE BookingID = @bookingID
            `;
            
            const request = pool.request();
            request.input('bookingID', mssql.Int, bookingID);
            
            const result = await request.query(query);
            
            console.log(`✅ Deleted ${result.rowsAffected[0]} booking room types for booking ${bookingID}`);
            
            return {
                success: true,
                message: `Xóa ${result.rowsAffected[0]} booking room types thành công`,
                data: { deletedCount: result.rowsAffected[0] }
            };
            
        } catch (error) {
            console.error('❌ Error deleting booking room types by booking ID:', error);
            return {
                success: false,
                message: 'Lỗi khi xóa booking room types theo booking ID',
                error: error.message
            };
        }
    }

    // ✅ GET ALL BOOKING ROOM TYPES WITH PAGINATION
    async getAllBookingRoomTypes(page = 1, pageSize = 20) {
        try {
            console.log(`🏨 Getting booking room types - Page: ${page}, Size: ${pageSize}`);
            
            const pool = await this.pool;
            const offset = (page - 1) * pageSize;
            
            // Count query
            const countRequest = pool.request();
            const countResult = await countRequest.query('SELECT COUNT(*) as total FROM BookingRoomType');
            const totalCount = countResult.recordset[0].total;
            
            // Main query
            const query = `
                SELECT 
                    brt.BookingRoomTypeID,
                    brt.BookingID,
                    brt.RoomTypeID,
                    brt.Quantity,
                    brt.CheckInAt,
                    brt.CheckOutAt,
                    rt.TypeName as RoomTypeName,
                    rt.BasePrice as RoomTypePrice,
                    b.BookingStatus,
                    b.CreateAt as BookingCreateAt
                FROM BookingRoomType brt
                LEFT JOIN RoomType rt ON brt.RoomTypeID = rt.TypeId
                LEFT JOIN Booking b ON brt.BookingID = b.BookingID
                ORDER BY brt.BookingRoomTypeID DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `;
            
            const request = pool.request();
            request.input('offset', mssql.Int, offset);
            request.input('pageSize', mssql.Int, pageSize);
            
            const result = await request.query(query);
            
            const bookingRoomTypes = result.recordset.map(row => ({
                bookingRoomTypeID: row.BookingRoomTypeID,
                bookingID: row.BookingID,
                roomTypeID: row.RoomTypeID,
                quantity: row.Quantity,
                roomTypeInfo: {
                    typeName: row.RoomTypeName,
                    basePrice: row.RoomTypePrice
                },
                bookingInfo: {
                    bookingStatus: row.BookingStatus,
                    createAt: row.BookingCreateAt
                }
            }));
            
            const totalPages = Math.ceil(totalCount / pageSize);
            
            return {
                success: true,
                data: bookingRoomTypes,
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
            console.error('❌ Error getting all booking room types:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy danh sách booking room types',
                error: error.message
            };
        }
    }

    // ✅ UPDATE CHECK-IN AND CHECK-OUT DATES
    async updateCheckInOutDates(bookingRoomTypeID, checkInAt, checkOutAt) {
        try {
            console.log(`🔄 Updating booking room type ${bookingRoomTypeID} check-in/check-out dates`);
            
            const pool = await this.pool;
            
            // Validate dates
            if (checkInAt && checkOutAt) {
                const checkIn = new Date(checkInAt);
                const checkOut = new Date(checkOutAt);
                if (checkOut <= checkIn) {
                    return {
                        success: false,
                        message: 'Ngày check-out phải sau ngày check-in'
                    };
                }
            }
            
            const query = `
                UPDATE BookingRoomType 
                SET CheckInAt = @checkInAt, CheckOutAt = @checkOutAt
                WHERE BookingRoomTypeID = @bookingRoomTypeID
            `;
            
            const request = pool.request();
            request.input('checkInAt', mssql.DateTime, checkInAt ? new Date(checkInAt) : null);
            request.input('checkOutAt', mssql.DateTime, checkOutAt ? new Date(checkOutAt) : null);
            request.input('bookingRoomTypeID', mssql.Int, bookingRoomTypeID);
            
            const result = await request.query(query);
            
            if (result.rowsAffected[0] === 1) {
                console.log(`✅ Booking room type ${bookingRoomTypeID} check-in/check-out dates updated`);
                return {
                    success: true,
                    message: 'Cập nhật ngày check-in/check-out thành công'
                };
            } else {
                return {
                    success: false,
                    message: 'Không tìm thấy booking room type để cập nhật'
                };
            }
            
        } catch (error) {
            console.error('❌ Error updating check-in/check-out dates:', error);
            return {
                success: false,
                message: 'Lỗi cập nhật ngày check-in/check-out',
                error: error.message
            };
        }
    }

    // ✅ Abstract methods implementations từ DBContext
    async list() {
        return await this.getAllBookingRoomTypes();
    }

    async get(id) {
        return await this.getById(id);
    }

    async insert(bookingRoomType) {
        return await this.create(bookingRoomType);
    }

    async update(bookingRoomType) {
        try {
            const pool = await this.pool;
            
            // Validate the booking room type data
            const validation = BookingRoomType.validateBookingRoomType(bookingRoomType);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Dữ liệu booking room type không hợp lệ',
                    errors: validation.errors
                };
            }

            const validatedData = validation.validatedData;
            
            const query = `
                UPDATE BookingRoomType 
                SET Quantity = @quantity, CheckInAt = @checkInAt, CheckOutAt = @checkOutAt
                WHERE BookingRoomTypeID = @bookingRoomTypeID
            `;
            
            const request = pool.request();
            request.input('quantity', mssql.Int, validatedData.quantity);
            request.input('checkInAt', mssql.DateTime, validatedData.checkInAt);
            request.input('checkOutAt', mssql.DateTime, validatedData.checkOutAt);
            request.input('bookingRoomTypeID', mssql.Int, bookingRoomType.bookingRoomTypeID);
            
            const result = await request.query(query);
            
            if (result.rowsAffected[0] === 1) {
                return {
                    success: true,
                    message: 'Cập nhật booking room type thành công',
                    data: validatedData
                };
            } else {
                return {
                    success: false,
                    message: 'Không tìm thấy booking room type để cập nhật'
                };
            }
            
        } catch (error) {
            console.error('❌ Error updating booking room type:', error);
            return {
                success: false,
                message: 'Lỗi cập nhật booking room type',
                error: error.message
            };
        }
    }

    async delete(id) {
        return await this.deleteById(id);
    }
}

export default BookingRoomTypeDBContext;