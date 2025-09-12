import DBContext from './DBContext.js';
import mssql from 'mssql';
import Promotion from '../model/Promotion.js';

class PromotionDBContext extends DBContext {
    
    // Get all promotions
    async list() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT PromotionID, PromotionName, DiscountPercent, StartDate, EndDate, Description, Status
                    FROM Promotion 
                    ORDER BY PromotionID DESC
                `);
            
            const promotions = result.recordset.map(row => Promotion.fromDbRow(row));
            
            return promotions;
        } catch (error) {
            console.error('Error listing promotions:', error);
            throw new Error('Lỗi khi lấy danh sách khuyến mãi: ' + error.message);
        }
    }

    // Get promotion by ID
    async get(promotionId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('promotionId', mssql.Int, promotionId)
                .query(`
                    SELECT PromotionID, PromotionName, DiscountPercent, StartDate, EndDate, Description, Status
                    FROM Promotion 
                    WHERE PromotionID = @promotionId
                `);
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            return Promotion.fromDbRow(result.recordset[0]);
        } catch (error) {
            console.error('Error getting promotion:', error);
            throw new Error('Lỗi khi lấy thông tin khuyến mãi: ' + error.message);
        }
    }

    // Get active promotions
    async getActivePromotions() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT PromotionID, PromotionName, DiscountPercent, StartDate, EndDate, Description, Status
                    FROM Promotion 
                    WHERE Status = 'Active' 
                    AND StartDate <= GETDATE() 
                    AND EndDate >= GETDATE()
                    ORDER BY PromotionID DESC
                `);
            
            const promotions = result.recordset.map(row => Promotion.fromDbRow(row));
            
            return promotions;
        } catch (error) {
            console.error('Error getting active promotions:', error);
            throw new Error('Lỗi khi lấy danh sách khuyến mãi đang hoạt động: ' + error.message);
        }
    }

    // Insert new promotion
    async insert(promotion) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('promotionName', mssql.NVarChar(255), promotion.promotionName)
                .input('discountPercent', mssql.Decimal(5,2), promotion.discountPercent)
                .input('startDate', mssql.Date, promotion.startDate)
                .input('endDate', mssql.Date, promotion.endDate)
                .input('description', mssql.NVarChar(mssql.MAX), promotion.description || null)
                .input('status', mssql.NVarChar(50), promotion.status || 'Active')
                .query(`
                    INSERT INTO Promotion (PromotionName, DiscountPercent, StartDate, EndDate, Description, Status)
                    OUTPUT INSERTED.PromotionID
                    VALUES (@promotionName, @discountPercent, @startDate, @endDate, @description, @status)
                `);
            
            return result.recordset[0].PromotionID;
        } catch (error) {
            console.error('Error inserting promotion:', error);
            throw new Error('Lỗi khi tạo khuyến mãi: ' + error.message);
        }
    }

    // Update promotion
    async update(promotion) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('promotionId', mssql.Int, promotion.promotionID)
                .input('promotionName', mssql.NVarChar(255), promotion.promotionName)
                .input('discountPercent', mssql.Decimal(5,2), promotion.discountPercent)
                .input('startDate', mssql.Date, promotion.startDate)
                .input('endDate', mssql.Date, promotion.endDate)
                .input('description', mssql.NVarChar(mssql.MAX), promotion.description || null)
                .input('status', mssql.NVarChar(50), promotion.status || 'Active')
                .query(`
                    UPDATE Promotion 
                    SET PromotionName = @promotionName,
                        DiscountPercent = @discountPercent,
                        StartDate = @startDate,
                        EndDate = @endDate,
                        Description = @description,
                        Status = @status
                    WHERE PromotionID = @promotionId
                `);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error updating promotion:', error);
            throw new Error('Lỗi khi cập nhật khuyến mãi: ' + error.message);
        }
    }

    // Update status method
    async updateStatus(promotionId, status) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('promotionId', mssql.Int, promotionId)
                .input('status', mssql.NVarChar(50), status)
                .query(`
                    UPDATE Promotion 
                    SET Status = @status
                    WHERE PromotionID = @promotionId
                `);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error updating promotion status:', error);
            throw new Error('Lỗi khi cập nhật trạng thái khuyến mãi: ' + error.message);
        }
    }

    // ✅ HOÀN THIỆN: Enhanced delete method với nhiều tùy chọn
    async delete(promotionId, deleteType = 'soft') {
        try {
            const pool = await this.pool;
            let query;
            let successMessage;

            switch (deleteType) {
                case 'hard':
                    // Hard delete - xóa vĩnh viễn khỏi database
                    query = `DELETE FROM Promotion WHERE PromotionID = @promotionId`;
                    successMessage = 'Xóa vĩnh viễn khuyến mãi';
                    break;
                
                case 'soft':
                default:
                    // Soft delete - chỉ thay đổi status thành 'Deleted'
                    query = `UPDATE Promotion SET Status = 'Deleted' WHERE PromotionID = @promotionId`;
                    successMessage = 'Đánh dấu khuyến mãi là đã xóa';
                    break;
            }

            const result = await pool.request()
                .input('promotionId', mssql.Int, promotionId)
                .query(query);
            
            console.log(`✅ ${successMessage} - Promotion ID: ${promotionId}`);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting promotion:', error);
            throw new Error('Lỗi khi xóa khuyến mãi: ' + error.message);
        }
    }

    // ✅ THÊM: Restore deleted promotion
    async restore(promotionId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('promotionId', mssql.Int, promotionId)
                .query(`
                    UPDATE Promotion 
                    SET Status = 'Inactive' 
                    WHERE PromotionID = @promotionId AND Status = 'Deleted'
                `);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error restoring promotion:', error);
            throw new Error('Lỗi khi khôi phục khuyến mãi: ' + error.message);
        }
    }

    // Get promotions by status
    async getPromotionsByStatus(status) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('status', mssql.NVarChar(50), status)
                .query(`
                    SELECT PromotionID, PromotionName, DiscountPercent, StartDate, EndDate, Description, Status
                    FROM Promotion 
                    WHERE Status = @status
                    ORDER BY PromotionID DESC
                `);
            
            return result.recordset.map(row => Promotion.fromDbRow(row));
        } catch (error) {
            console.error('Error getting promotions by status:', error);
            throw new Error('Lỗi khi lấy khuyến mãi theo trạng thái: ' + error.message);
        }
    }

    // Search promotions by name
    async searchPromotionsByName(searchTerm) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('searchTerm', mssql.NVarChar(255), `%${searchTerm}%`)
                .query(`
                    SELECT PromotionID, PromotionName, DiscountPercent, StartDate, EndDate, Description, Status
                    FROM Promotion 
                    WHERE PromotionName LIKE @searchTerm
                    ORDER BY PromotionID DESC
                `);
            
            return result.recordset.map(row => Promotion.fromDbRow(row));
        } catch (error) {
            console.error('Error searching promotions:', error);
            throw new Error('Lỗi khi tìm kiếm khuyến mãi: ' + error.message);
        }
    }

    // Get promotions by date range
    async getPromotionsByDateRange(startDate, endDate) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('startDate', mssql.Date, startDate)
                .input('endDate', mssql.Date, endDate)
                .query(`
                    SELECT PromotionID, PromotionName, DiscountPercent, StartDate, EndDate, Description, Status
                    FROM Promotion 
                    WHERE StartDate >= @startDate AND EndDate <= @endDate
                    ORDER BY PromotionID DESC
                `);
            
            return result.recordset.map(row => Promotion.fromDbRow(row));
        } catch (error) {
            console.error('Error getting promotions by date range:', error);
            throw new Error('Lỗi khi lấy khuyến mãi theo khoảng thời gian: ' + error.message);
        }
    }

    // Get promotion statistics
    async getPromotionStats() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        COUNT(*) as totalPromotions,
                        COUNT(CASE WHEN Status = 'Active' THEN 1 END) as activePromotions,
                        COUNT(CASE WHEN Status = 'Inactive' THEN 1 END) as inactivePromotions,
                        COUNT(CASE WHEN Status = 'Expired' THEN 1 END) as expiredPromotions,
                        COUNT(CASE WHEN Status = 'Draft' THEN 1 END) as draftPromotions,
                        COUNT(CASE WHEN Status = 'Deleted' THEN 1 END) as deletedPromotions,
                        AVG(DiscountPercent) as averageDiscount
                    FROM Promotion
                `);
            
            return result.recordset[0];
        } catch (error) {
            console.error('Error getting promotion stats:', error);
            throw new Error('Lỗi khi lấy thống kê khuyến mãi: ' + error.message);
        }
    }

    // ✅ HOÀN THIỆN: Enhanced usage check bao gồm BookingPromotion
    async isPromotionInUse(promotionId) {
        try {
            const pool = await this.pool;
            
            // Check in multiple tables that might reference promotions
            const checks = [
                {
                    table: 'Booking',
                    column: 'PromotionID',
                    description: 'đặt phòng'
                },
                {
                    table: 'BookingPromotion', // ✅ THÊM: Kiểm tra bảng BookingPromotion
                    column: 'PromotionID',
                    description: 'liên kết booking-promotion'
                },
                {
                    table: 'BookingRoom', 
                    column: 'PromotionID',
                    description: 'phòng đã đặt'
                },
                {
                    table: 'Invoice',
                    column: 'PromotionID', 
                    description: 'hóa đơn'
                }
            ];

            const usageResults = [];

            for (const check of checks) {
                try {
                    const result = await pool.request()
                        .input('promotionId', mssql.Int, promotionId)
                        .query(`
                            SELECT COUNT(*) as count
                            FROM ${check.table} 
                            WHERE ${check.column} = @promotionId
                        `);
                    
                    const count = result.recordset[0].count;
                    if (count > 0) {
                        usageResults.push({
                            table: check.table,
                            count: count,
                            description: check.description
                        });
                    }
                } catch (tableError) {
                    console.warn(`Could not check table ${check.table}:`, tableError.message);
                    // Continue checking other tables
                }
            }

            return {
                isInUse: usageResults.length > 0,
                usage: usageResults,
                totalReferences: usageResults.reduce((sum, result) => sum + result.count, 0)
            };
        } catch (error) {
            console.error('Error checking promotion usage:', error);
            // Return safe default if check fails
            return {
                isInUse: false,
                usage: [],
                totalReferences: 0,
                error: error.message
            };
        }
    }

    // ✅ HOÀN THIỆN: Enhanced delete method với kiểm tra nghiêm ngặt
    async delete(promotionId, deleteType = 'hard') {
        try {
            const pool = await this.pool;
            
            // ✅ LUÔN KIỂM TRA USAGE TRƯỚC KHI XÓA
            console.log(`🔍 Checking promotion ${promotionId} usage before deletion...`);
            const usageCheck = await this.isPromotionInUse(promotionId);
            
            if (usageCheck.isInUse) {
                const errorMessage = `Không thể xóa khuyến mãi đang được sử dụng trong ${usageCheck.totalReferences} bản ghi: ${usageCheck.usage.map(u => `${u.count} ${u.description}`).join(', ')}`;
                console.error('❌ Cannot delete promotion in use:', errorMessage);
                throw new Error(errorMessage);
            }
            
            let query;
            let successMessage;

            switch (deleteType) {
                case 'hard':
                    // Hard delete - xóa vĩnh viễn khỏi database
                    query = `DELETE FROM Promotion WHERE PromotionID = @promotionId`;
                    successMessage = 'Xóa vĩnh viễn khuyến mãi';
                    break;
                
                case 'soft':
                    // Soft delete - chỉ thay đổi status thành 'Deleted'
                    query = `UPDATE Promotion SET Status = 'Deleted' WHERE PromotionID = @promotionId`;
                    successMessage = 'Đánh dấu khuyến mãi là đã xóa';
                    break;
                
                default:
                    // Default to hard delete
                    query = `DELETE FROM Promotion WHERE PromotionID = @promotionId`;
                    successMessage = 'Xóa vĩnh viễn khuyến mãi';
                    break;
            }

            const result = await pool.request()
                .input('promotionId', mssql.Int, promotionId)
                .query(query);
            
            console.log(`✅ ${successMessage} - Promotion ID: ${promotionId}`);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting promotion:', error);
            throw error; // ✅ Throw original error để preserve error message
        }
    }

    // ✅ THÊM: Get detailed promotion usage information bao gồm BookingPromotion
    async getPromotionUsageDetails(promotionId) {
        try {
            const pool = await this.pool;
            const details = {
                bookings: [],
                bookingPromotions: [], // ✅ THÊM
                invoices: [],
                summary: {}
            };

            // Get booking details
            try {
                const bookingResult = await pool.request()
                    .input('promotionId', mssql.Int, promotionId)
                    .query(`
                        SELECT b.BookingID, b.CreateAt, u.Fullname, u.Email
                        FROM Booking b
                        LEFT JOIN [User] u ON b.UserID = u.UserID
                        WHERE b.PromotionID = @promotionId
                        ORDER BY b.CreateAt DESC
                    `);
                details.bookings = bookingResult.recordset;
            } catch (error) {
                console.warn('Could not fetch booking details:', error.message);
            }

            // ✅ THÊM: Get BookingPromotion details
            try {
                const bookingPromotionResult = await pool.request()
                    .input('promotionId', mssql.Int, promotionId)
                    .query(`
                        SELECT bp.BookingPromotionID, bp.BookingID, b.CreateAt, u.Fullname, u.Email
                        FROM BookingPromotion bp
                        LEFT JOIN Booking b ON bp.BookingID = b.BookingID
                        LEFT JOIN [User] u ON b.UserID = u.UserID
                        WHERE bp.PromotionID = @promotionId
                        ORDER BY b.CreateAt DESC
                    `);
                details.bookingPromotions = bookingPromotionResult.recordset;
            } catch (error) {
                console.warn('Could not fetch BookingPromotion details:', error.message);
            }

            // Get invoice details
            try {
                const invoiceResult = await pool.request()
                    .input('promotionId', mssql.Int, promotionId)
                    .query(`
                        SELECT InvoiceID, CreateAt, TotalAmount, Status
                        FROM Invoice
                        WHERE PromotionID = @promotionId
                        ORDER BY CreateAt DESC
                    `);
                details.invoices = invoiceResult.recordset;
            } catch (error) {
                console.warn('Could not fetch invoice details:', error.message);
            }

            // Generate summary
            details.summary = {
                totalBookings: details.bookings.length,
                totalBookingPromotions: details.bookingPromotions.length, // ✅ THÊM
                totalInvoices: details.invoices.length,
                totalReferences: details.bookings.length + details.bookingPromotions.length + details.invoices.length, // ✅ CẬP NHẬT
                canDelete: details.bookings.length === 0 && details.bookingPromotions.length === 0 && details.invoices.length === 0 // ✅ CẬP NHẬT
            };

            return details;
        } catch (error) {
            console.error('Error getting promotion usage details:', error);
            throw new Error('Lỗi khi lấy chi tiết sử dụng khuyến mãi: ' + error.message);
        }
    }

    // ✅ THÊM: Bulk delete với kiểm tra usage
    async bulkDelete(promotionIds, deleteType = 'soft') {
        try {
            const pool = await this.pool;
            
            // ✅ KIỂM TRA USAGE CHO TẤT CẢ PROMOTIONS
            console.log(`🔍 Checking usage for ${promotionIds.length} promotions...`);
            const usageChecks = await Promise.all(
                promotionIds.map(async id => {
                    const usage = await this.isPromotionInUse(id);
                    return { id, isInUse: usage.isInUse, usage: usage.usage, totalReferences: usage.totalReferences };
                })
            );
            
            const inUsePromotions = usageChecks.filter(check => check.isInUse);
            if (inUsePromotions.length > 0) {
                const errorDetails = inUsePromotions.map(p => 
                    `ID ${p.id}: ${p.totalReferences} tham chiếu (${p.usage.map(u => `${u.count} ${u.description}`).join(', ')})`
                ).join('; ');
                
                throw new Error(`Không thể xóa ${inUsePromotions.length} khuyến mãi đang được sử dụng: ${errorDetails}`);
            }
            
            // Build the query with proper parameter placeholders
            const paramPlaceholders = promotionIds.map((_, index) => `@param${index}`).join(',');

            const request = pool.request();
            promotionIds.forEach((id, index) => {
                request.input(`param${index}`, mssql.Int, id);
            });

            const result = await request.query(
                deleteType === 'hard' 
                    ? `DELETE FROM Promotion WHERE PromotionID IN (${paramPlaceholders})`
                    : `UPDATE Promotion SET Status = 'Deleted' WHERE PromotionID IN (${paramPlaceholders})`
            );
            
            return {
                success: true,
                affectedRows: result.rowsAffected[0],
                deletedCount: result.rowsAffected[0]
            };
        } catch (error) {
            console.error('Error bulk deleting promotions:', error);
            throw error; // ✅ Preserve original error
        }
    }
}

export default PromotionDBContext;