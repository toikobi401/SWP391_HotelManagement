import DBContext from './DBContext.js';
import Feedback from '../model/Feedback.js';
import mssql from 'mssql';

class FeedbackDBContext extends DBContext {
    constructor() {
        super();
        this.tableName = 'GuestFeedback';
    }

    // Lấy tất cả feedback
    async list() {
        try {
            const query = `
                SELECT 
                    f.FeedbackID,
                    f.OverallRating,
                    f.SeviceRating,
                    f.CleanlinessRating,
                    f.LocationRating,
                    f.BreakfastRating,
                    f.CreateAt,
                    f.CustomerID,
                    f.BookingID,
                    f.Comment,
                    f.Highlighted,
                    u.Fullname as CustomerName,
                    u.Username as CustomerUsername,
                    u.Email as CustomerEmail
                FROM ${this.tableName} f
                LEFT JOIN [User] u ON f.CustomerID = u.UserID
                ORDER BY f.CreateAt DESC
            `;

            const result = await this.query(query);
            
            return result.recordset.map(row => {
                const feedback = Feedback.fromDbResult(row);
                // ✅ SỬA: Ưu tiên Fullname, fallback về Username, cuối cùng là ẩn danh
                feedback.customerName = row.CustomerName && row.CustomerName.trim() 
                    ? row.CustomerName.trim()
                    : (row.CustomerUsername && row.CustomerUsername.trim() 
                        ? row.CustomerUsername.trim() 
                        : 'Khách hàng ẩn danh');
                feedback.customerUsername = row.CustomerUsername;
                feedback.customerEmail = row.CustomerEmail;
                return feedback;
            });
        } catch (error) {
            console.error('❌ Error listing feedbacks:', error);
            throw new Error('Failed to retrieve feedbacks: ' + error.message);
        }
    }

    // Lấy feedback theo ID
    async get(id) {
        try {
            const query = `
                SELECT 
                    f.FeedbackID,
                    f.OverallRating,
                    f.SeviceRating,
                    f.CleanlinessRating,
                    f.LocationRating,
                    f.BreakfastRating,
                    f.CreateAt,
                    f.CustomerID,
                    f.BookingID,
                    f.Comment,
                    f.Highlighted,
                    u.Fullname as CustomerName,
                    u.Username as CustomerUsername,
                    u.Email as CustomerEmail
                FROM ${this.tableName} f
                LEFT JOIN [User] u ON f.CustomerID = u.UserID
                WHERE f.FeedbackID = @id
            `;

            const parameters = [
                { name: 'id', type: mssql.Int, value: id }
            ];

            const result = await this.query(query, parameters);
            
            if (result.recordset.length === 0) {
                return null;
            }

            const row = result.recordset[0];
            const feedback = Feedback.fromDbResult(row);
            // ✅ SỬA: Ưu tiên Fullname, fallback về Username, cuối cùng là ẩn danh
            feedback.customerName = row.CustomerName && row.CustomerName.trim() 
                ? row.CustomerName.trim()
                : (row.CustomerUsername && row.CustomerUsername.trim() 
                    ? row.CustomerUsername.trim() 
                    : 'Khách hàng ẩn danh');
            feedback.customerUsername = row.CustomerUsername;
            feedback.customerEmail = row.CustomerEmail;
            
            return feedback;
        } catch (error) {
            console.error('❌ Error getting feedback:', error);
            throw new Error('Failed to retrieve feedback: ' + error.message);
        }
    }

    // Thêm feedback mới
    async insert(feedback) {
        try {
            if (!(feedback instanceof Feedback)) {
                throw new Error('Parameter must be an instance of Feedback');
            }

            feedback.validate();

            const query = `
                INSERT INTO ${this.tableName} 
                (OverallRating, SeviceRating, CleanlinessRating, LocationRating, BreakfastRating, CreateAt, CustomerID, BookingID, Comment, Highlighted)
                OUTPUT INSERTED.FeedbackID
                VALUES (@overallRating, @serviceRating, @cleanlinessRating, @locationRating, @breakfastRating, @createAt, @customerID, @bookingID, @comment, @highlighted)
            `;

            const parameters = [
                { name: 'overallRating', type: mssql.Float, value: feedback.overallRating },
                { name: 'serviceRating', type: mssql.Float, value: feedback.seviceRating },
                { name: 'cleanlinessRating', type: mssql.Float, value: feedback.cleanlinessRating },
                { name: 'locationRating', type: mssql.Float, value: feedback.locationRating },
                { name: 'breakfastRating', type: mssql.Float, value: feedback.breakfastRating },
                { name: 'createAt', type: mssql.DateTime, value: feedback.createAt },
                { name: 'customerID', type: mssql.Int, value: feedback.customerID },
                { name: 'bookingID', type: mssql.Int, value: feedback.bookingID },
                { name: 'comment', type: mssql.NVarChar, value: feedback.comment },
                { name: 'highlighted', type: mssql.Bit, value: feedback.highlighted } // ✅ THÊM: Highlighted parameter
            ];

            const result = await this.query(query, parameters);
            
            feedback.feedbackID = result.recordset[0].FeedbackID;
            
            return feedback;
        } catch (error) {
            console.error('❌ Error inserting feedback:', error);
            throw new Error('Failed to create feedback: ' + error.message);
        }
    }

    // Cập nhật feedback
    async update(feedback) {
        try {
            if (!(feedback instanceof Feedback)) {
                throw new Error('Parameter must be an instance of Feedback');
            }

            if (!feedback.feedbackID) {
                throw new Error('Feedback ID is required for update');
            }

            feedback.validate();

            const query = `
                UPDATE ${this.tableName}
                SET 
                    OverallRating = @overallRating,
                    SeviceRating = @serviceRating,
                    CleanlinessRating = @cleanlinessRating,
                    LocationRating = @locationRating,
                    BreakfastRating = @breakfastRating,
                    CustomerID = @customerID,
                    BookingID = @bookingID,
                    Comment = @comment,
                    Highlighted = @highlighted
                WHERE FeedbackID = @feedbackID
            `;

            const parameters = [
                { name: 'overallRating', type: mssql.Float, value: feedback.overallRating },
                { name: 'serviceRating', type: mssql.Float, value: feedback.seviceRating },
                { name: 'cleanlinessRating', type: mssql.Float, value: feedback.cleanlinessRating },
                { name: 'locationRating', type: mssql.Float, value: feedback.locationRating },
                { name: 'breakfastRating', type: mssql.Float, value: feedback.breakfastRating },
                { name: 'customerID', type: mssql.Int, value: feedback.customerID },
                { name: 'bookingID', type: mssql.Int, value: feedback.bookingID },
                { name: 'comment', type: mssql.NVarChar, value: feedback.comment },
                { name: 'highlighted', type: mssql.Bit, value: feedback.highlighted }, // ✅ THÊM: Highlighted parameter
                { name: 'feedbackID', type: mssql.Int, value: feedback.feedbackID }
            ];

            await this.query(query, parameters);
            
            return feedback;
        } catch (error) {
            console.error('❌ Error updating feedback:', error);
            throw new Error('Failed to update feedback: ' + error.message);
        }
    }

    // Xóa feedback
    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE FeedbackID = @id`;
            
            const parameters = [
                { name: 'id', type: mssql.Int, value: id }
            ];

            const result = await this.query(query, parameters);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('❌ Error deleting feedback:', error);
            throw new Error('Failed to delete feedback: ' + error.message);
        }
    }

    // Lấy feedback theo BookingID
    async getByBookingId(bookingId) {
        try {
            const query = `
                SELECT 
                    f.FeedbackID,
                    f.OverallRating,
                    f.SeviceRating,
                    f.CleanlinessRating,
                    f.LocationRating,
                    f.BreakfastRating,
                    f.CreateAt,
                    f.CustomerID,
                    f.BookingID,
                    f.Comment,
                    f.Highlighted,
                    u.Fullname as CustomerName
                FROM ${this.tableName} f
                LEFT JOIN [User] u ON f.CustomerID = u.UserID
                WHERE f.BookingID = @bookingId
                ORDER BY f.CreateAt DESC
            `;

            const parameters = [
                { name: 'bookingId', type: mssql.Int, value: bookingId }
            ];

            const result = await this.query(query, parameters);
            
            return result.recordset.map(row => {
                const feedback = Feedback.fromDbResult(row);
                // ✅ SỬA: Ưu tiên Fullname, fallback về Username, cuối cùng là ẩn danh  
                feedback.customerName = row.CustomerName && row.CustomerName.trim() 
                    ? row.CustomerName.trim()
                    : (row.CustomerUsername && row.CustomerUsername.trim() 
                        ? row.CustomerUsername.trim() 
                        : 'Khách hàng ẩn danh');
                feedback.customerUsername = row.CustomerUsername;
                feedback.customerEmail = row.CustomerEmail;
                return feedback;
            });
        } catch (error) {
            console.error('❌ Error getting feedbacks by booking ID:', error);
            throw new Error('Failed to retrieve feedbacks by booking ID: ' + error.message);
        }
    }

    // Lấy feedback theo CustomerID
    async getByCustomerId(customerId) {
        try {
            const query = `
                SELECT 
                    f.FeedbackID,
                    f.OverallRating,
                    f.SeviceRating,
                    f.CleanlinessRating,
                    f.LocationRating,
                    f.BreakfastRating,
                    f.CreateAt,
                    f.CustomerID,
                    f.BookingID,
                    f.Comment,
                    f.Highlighted,
                    u.Fullname as CustomerName
                FROM ${this.tableName} f
                LEFT JOIN [User] u ON f.CustomerID = u.UserID
                WHERE f.CustomerID = @customerId
                ORDER BY f.CreateAt DESC
            `;

            const parameters = [
                { name: 'customerId', type: mssql.Int, value: customerId }
            ];

            const result = await this.query(query, parameters);
            
            return result.recordset.map(row => {
                const feedback = Feedback.fromDbResult(row);
                // ✅ SỬA: Ưu tiên Fullname, fallback về Username, cuối cùng là ẩn danh
                feedback.customerName = row.CustomerName && row.CustomerName.trim() 
                    ? row.CustomerName.trim()
                    : (row.CustomerUsername && row.CustomerUsername.trim() 
                        ? row.CustomerUsername.trim() 
                        : 'Khách hàng ẩn danh');
                feedback.customerUsername = row.CustomerUsername;
                feedback.customerEmail = row.CustomerEmail;
                return feedback;
            });
        } catch (error) {
            console.error('❌ Error getting feedbacks by customer ID:', error);
            throw new Error('Failed to retrieve feedbacks by customer ID: ' + error.message);
        }
    }

    // ✅ SỬA: Cập nhật method getHighlightedFeedbacks với log chi tiết
    async getHighlightedFeedbacks() {
        console.log('🗄️ [DB] Starting getHighlightedFeedbacks query...');
        console.log('📅 [DB] Query time:', new Date().toISOString());
        
        try {
            const query = `
                SELECT 
                    f.FeedbackID,
                    f.OverallRating,
                    f.SeviceRating,
                    f.CleanlinessRating,
                    f.LocationRating,
                    f.BreakfastRating,
                    f.CreateAt,
                    f.CustomerID,
                    f.BookingID,
                    f.Comment,
                    f.Highlighted,
                    u.Fullname as CustomerName,
                    u.Image as CustomerImage

                FROM ${this.tableName} f
                INNER JOIN [User] u ON f.CustomerID = u.UserID
                WHERE f.Highlighted = 1
                ORDER BY f.CreateAt DESC
            `;

            console.log('📝 [DB] Executing query:', query);
            console.log('🎯 [DB] Table name:', this.tableName);
            
            const result = await this.query(query);
            
            console.log('📊 [DB] Raw query result:', {
                hasRecordset: !!result.recordset,
                recordCount: result.recordset ? result.recordset.length : 0,
                rowsAffected: result.rowsAffected
            });
            
            if (result.recordset && result.recordset.length > 0) {
                console.log('📋 [DB] Raw database records:');
                result.recordset.forEach((row, index) => {
                    console.log(`   Row ${index + 1}:`, {
                        FeedbackID: row.FeedbackID,
                        CustomerName: row.CustomerName,
                        Highlighted: row.Highlighted,
                        OverallRating: row.OverallRating,
                        Comment: row.Comment ? row.Comment.substring(0, 50) + '...' : null,
                        BookingID: row.BookingID
                    });
                });
            } else {
                console.log('⚠️ [DB] No records found in database');
                console.log('🔍 [DB] Possible reasons:');
                console.log('   - No feedbacks exist with Highlighted = 1');
                console.log('   - Table name incorrect:', this.tableName);
                console.log('   - Join condition failed (no matching users)');
                
                // ✅ THÊM: Kiểm tra bảng có tồn tại không
                try {
                    const checkTableQuery = `SELECT COUNT(*) as TotalCount FROM ${this.tableName}`;
                    const checkResult = await this.query(checkTableQuery);
                    console.log('📊 [DB] Total records in table:', checkResult.recordset[0].TotalCount);
                    
                    const checkHighlightedQuery = `SELECT COUNT(*) as HighlightedCount FROM ${this.tableName} WHERE Highlighted = 1`;
                    const highlightedResult = await this.query(checkHighlightedQuery);
                    console.log('⭐ [DB] Highlighted records in table:', highlightedResult.recordset[0].HighlightedCount);
                    
                } catch (checkError) {
                    console.error('❌ [DB] Error checking table:', checkError.message);
                }
            }
            
            const feedbacks = result.recordset.map(row => {
                console.log('🔄 [DB] Converting row to Feedback object:', row.FeedbackID);
                
                const feedback = Feedback.fromDbResult(row);
                // ✅ SỬA: Ưu tiên Fullname, fallback về Username, cuối cùng là ẩn danh
                feedback.customerName = row.CustomerName && row.CustomerName.trim() 
                    ? row.CustomerName.trim()
                    : (row.CustomerUsername && row.CustomerUsername.trim() 
                        ? row.CustomerUsername.trim() 
                        : 'Khách hàng ẩn danh');

                feedback.customerImage = row.CustomerImage;
                feedback.customerUsername = row.CustomerUsername;
                
                console.log('✅ [DB] Feedback object created:', {
                    feedbackID: feedback.feedbackID,
                    customerName: feedback.customerName,
                    highlighted: feedback.highlighted
                });
                
                return feedback;
            });
            
            console.log('🎯 [DB] Final feedbacks array:', {
                count: feedbacks.length,
                isArray: Array.isArray(feedbacks)
            });
            
            return feedbacks;
            
        } catch (error) {
            console.error('❌ [DB] Error getting highlighted feedbacks:', {
                errorMessage: error.message,
                errorStack: error.stack,
                tableName: this.tableName
            });
            throw new Error('Failed to retrieve highlighted feedbacks: ' + error.message);
        } finally {
            console.log('🏁 [DB] getHighlightedFeedbacks query completed');
        }
    }

    // ✅ THÊM: Toggle highlighted status cho feedback
    async toggleHighlighted(id) {
        try {
            const feedback = await this.get(id);
            if (!feedback) {
                throw new Error('Feedback not found');
            }

            const newHighlightedStatus = !feedback.highlighted;
            
            const query = `
                UPDATE ${this.tableName}
                SET Highlighted = @highlighted
                WHERE FeedbackID = @feedbackID
            `;

            const parameters = [
                { name: 'highlighted', type: mssql.Bit, value: newHighlightedStatus },
                { name: 'feedbackID', type: mssql.Int, value: id }
            ];

            await this.query(query, parameters);
            
            feedback.highlighted = newHighlightedStatus;
            return feedback;
        } catch (error) {
            console.error('❌ Error toggling feedback highlight:', error);
            throw new Error('Failed to toggle feedback highlight: ' + error.message);
        }
    }

    // Lấy thống kê rating trung bình
    async getAverageRatings() {
        try {
            const query = `
                SELECT 
                    AVG(OverallRating) as AvgOverallRating,
                    AVG(SeviceRating) as AvgServiceRating,
                    AVG(CleanlinessRating) as AvgCleanlinessRating,
                    AVG(LocationRating) as AvgLocationRating,
                    AVG(BreakfastRating) as AvgBreakfastRating,
                    COUNT(*) as TotalFeedbacks,
                    COUNT(CASE WHEN Highlighted = 1 THEN 1 END) as HighlightedFeedbacks
                FROM ${this.tableName}
            `;

            const result = await this.query(query);
            
            return result.recordset[0];
        } catch (error) {
            console.error('❌ Error getting average ratings:', error);
            throw new Error('Failed to calculate average ratings: ' + error.message);
        }
    }
}

export default FeedbackDBContext;