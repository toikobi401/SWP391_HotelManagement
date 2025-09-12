import DBContext from './DBContext.js';
import BookingCancel from '../model/BookingCancel.js';
import mssql from 'mssql';

class BookingCancelDBContext extends DBContext {
    constructor() {
        super();
        this.tableName = 'BookingCancel';
    }

    // Lấy tất cả booking cancellations
    async list() {
        try {
            const query = `
                SELECT 
                    bc.CancelID,
                    bc.BookingID,
                    bc.CancelType,
                    bc.CancelReason,
                    b.BookingAt,
                    b.BookingStatus,
                    b.NumberOfGuest
                FROM ${this.tableName} bc
                LEFT JOIN Booking b ON bc.BookingID = b.BookingID
                ORDER BY bc.CancelID DESC
            `;

            const result = await this.query(query);
            
            return result.recordset.map(row => {
                const bookingCancel = BookingCancel.fromDbResult(row);
                // Thêm thông tin booking liên quan
                bookingCancel.bookingInfo = {
                    bookingAt: row.BookingAt,
                    bookingStatus: row.BookingStatus,
                    numberOfGuest: row.NumberOfGuest
                };
                return bookingCancel;
            });
        } catch (error) {
            console.error('❌ Error listing booking cancellations:', error);
            throw new Error('Failed to retrieve booking cancellations: ' + error.message);
        }
    }

    // Lấy booking cancellation theo ID
    async get(cancelID) {
        try {
            const query = `
                SELECT 
                    bc.CancelID,
                    bc.BookingID,
                    bc.CancelType,
                    bc.CancelReason,
                    b.BookingAt,
                    b.BookingStatus,
                    b.NumberOfGuest,
                    b.SpecialRequest
                FROM ${this.tableName} bc
                LEFT JOIN Booking b ON bc.BookingID = b.BookingID
                WHERE bc.CancelID = @cancelID
            `;

            const parameters = [
                { name: 'cancelID', type: mssql.Int, value: cancelID }
            ];

            const result = await this.query(query, parameters);
            
            if (result.recordset.length === 0) {
                return null;
            }

            const row = result.recordset[0];
            const bookingCancel = BookingCancel.fromDbResult(row);
            
            // Thêm thông tin booking liên quan
            bookingCancel.bookingInfo = {
                bookingAt: row.BookingAt,
                bookingStatus: row.BookingStatus,
                numberOfGuest: row.NumberOfGuest,
                specialRequest: row.SpecialRequest
            };
            
            return bookingCancel;
        } catch (error) {
            console.error('❌ Error getting booking cancellation:', error);
            throw new Error('Failed to retrieve booking cancellation: ' + error.message);
        }
    }

    // Thêm booking cancellation mới
    async insert(bookingCancel) {
        try {
            if (!(bookingCancel instanceof BookingCancel)) {
                throw new Error('Invalid BookingCancel object');
            }

            bookingCancel.validate();

            // Kiểm tra BookingID có tồn tại không
            const bookingExists = await this.checkBookingExists(bookingCancel.bookingID);
            if (!bookingExists) {
                throw new Error('BookingID không tồn tại');
            }

            const query = `
                INSERT INTO ${this.tableName} 
                (BookingID, CancelType, CancelReason)
                OUTPUT INSERTED.CancelID
                VALUES (@bookingID, @cancelType, @cancelReason)
            `;

            const parameters = [
                { name: 'bookingID', type: mssql.Int, value: bookingCancel.bookingID },
                { name: 'cancelType', type: mssql.NVarChar(50), value: bookingCancel.cancelType },
                { name: 'cancelReason', type: mssql.NVarChar(255), value: bookingCancel.cancelReason }
            ];

            const result = await this.query(query, parameters);
            
            bookingCancel.cancelID = result.recordset[0].CancelID;
            
            return bookingCancel;
        } catch (error) {
            console.error('❌ Error inserting booking cancellation:', error);
            throw new Error('Failed to create booking cancellation: ' + error.message);
        }
    }

    // Cập nhật booking cancellation
    async update(bookingCancel) {
        try {
            if (!(bookingCancel instanceof BookingCancel)) {
                throw new Error('Invalid BookingCancel object');
            }

            if (!bookingCancel.cancelID) {
                throw new Error('CancelID is required for update');
            }

            bookingCancel.validate();

            const query = `
                UPDATE ${this.tableName} 
                SET 
                    CancelType = @cancelType,
                    CancelReason = @cancelReason
                WHERE CancelID = @cancelID
            `;

            const parameters = [
                { name: 'cancelID', type: mssql.Int, value: bookingCancel.cancelID },
                { name: 'cancelType', type: mssql.NVarChar(50), value: bookingCancel.cancelType },
                { name: 'cancelReason', type: mssql.NVarChar(255), value: bookingCancel.cancelReason }
            ];

            const result = await this.query(query, parameters);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('BookingCancel not found or no changes made');
            }
            
            return bookingCancel;
        } catch (error) {
            console.error('❌ Error updating booking cancellation:', error);
            throw new Error('Failed to update booking cancellation: ' + error.message);
        }
    }

    // Xóa booking cancellation
    async delete(cancelID) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE CancelID = @cancelID`;
            
            const parameters = [
                { name: 'cancelID', type: mssql.Int, value: cancelID }
            ];

            const result = await this.query(query, parameters);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('❌ Error deleting booking cancellation:', error);
            throw new Error('Failed to delete booking cancellation: ' + error.message);
        }
    }

    // Lấy booking cancellations theo BookingID
    async getByBookingId(bookingID) {
        try {
            const query = `
                SELECT 
                    bc.CancelID,
                    bc.BookingID,
                    bc.CancelType,
                    bc.CancelReason
                FROM ${this.tableName} bc
                WHERE bc.BookingID = @bookingID
                ORDER BY bc.CancelID DESC
            `;

            const parameters = [
                { name: 'bookingID', type: mssql.Int, value: bookingID }
            ];

            const result = await this.query(query, parameters);
            
            return result.recordset.map(row => BookingCancel.fromDbResult(row));
        } catch (error) {
            console.error('❌ Error getting booking cancellations by booking ID:', error);
            throw new Error('Failed to retrieve booking cancellations by booking ID: ' + error.message);
        }
    }

    // Lấy thống kê cancellation theo type
    async getCancellationStatistics() {
        try {
            const query = `
                SELECT 
                    CancelType,
                    COUNT(*) as Count,
                    CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ${this.tableName}) AS DECIMAL(5,2)) as Percentage
                FROM ${this.tableName}
                GROUP BY CancelType
                ORDER BY Count DESC
            `;

            const result = await this.query(query);
            
            return result.recordset;
        } catch (error) {
            console.error('❌ Error getting cancellation statistics:', error);
            throw new Error('Failed to retrieve cancellation statistics: ' + error.message);
        }
    }

    // Helper method để kiểm tra BookingID có tồn tại không
    async checkBookingExists(bookingID) {
        try {
            const query = `SELECT COUNT(*) as Count FROM Booking WHERE BookingID = @bookingID`;
            
            const parameters = [
                { name: 'bookingID', type: mssql.Int, value: bookingID }
            ];

            const result = await this.query(query, parameters);
            
            return result.recordset[0].Count > 0;
        } catch (error) {
            console.error('❌ Error checking booking exists:', error);
            throw new Error('Failed to check booking existence: ' + error.message);
        }
    }
}

export default BookingCancelDBContext;
