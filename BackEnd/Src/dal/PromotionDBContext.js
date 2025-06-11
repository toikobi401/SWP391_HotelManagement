import DBContext from './DBContext.js';
import Promotion from '../model/Promotion.js';
import sql from 'mssql';

class PromotionDBContext extends DBContext {
    
    // Get all promotions
    async list() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query('SELECT * FROM Promotion ORDER BY StartDate DESC');
            
            return result.recordset.map(row => new Promotion(
                row.PromotionID,
                row.PromotionName,
                row.DiscountPercent,
                row.StartDate,
                row.EndDate,
                row.Description
            ));
        } catch (error) {
            console.error('Error getting all promotions:', error);
            throw new Error('Error getting all promotions: ' + error.message);
        }
    }

    // Get promotion by ID
    async get(promotionId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('PromotionID', sql.Int, promotionId)
                .query('SELECT * FROM Promotion WHERE PromotionID = @PromotionID');
            
            if (result.recordset.length > 0) {
                const row = result.recordset[0];
                return new Promotion(
                    row.PromotionID,
                    row.PromotionName,
                    row.DiscountPercent,
                    row.StartDate,
                    row.EndDate,
                    row.Description
                );
            }
            return null;
        } catch (error) {
            console.error('Error getting promotion by ID:', error);
            throw new Error('Error getting promotion by ID: ' + error.message);
        }
    }

    // Get active promotions
    async getActivePromotions() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`SELECT * FROM Promotion 
                        WHERE GETDATE() BETWEEN StartDate AND EndDate 
                        ORDER BY StartDate DESC`);
            
            return result.recordset.map(row => new Promotion(
                row.PromotionID,
                row.PromotionName,
                row.DiscountPercent,
                row.StartDate,
                row.EndDate,
                row.Description
            ));
        } catch (error) {
            console.error('Error getting active promotions:', error);
            throw new Error('Error getting active promotions: ' + error.message);
        }
    }

    // Insert new promotion
    async insert(promotion) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('PromotionName', sql.NVarChar(50), promotion.getPromotionName())
                .input('DiscountPercent', sql.Float, promotion.getDiscountPercent())
                .input('StartDate', sql.Date, promotion.getStartDate())
                .input('EndDate', sql.Date, promotion.getEndDate())
                .input('Description', sql.NVarChar(255), promotion.getDescription())
                .query(`INSERT INTO Promotion (PromotionName, DiscountPercent, StartDate, EndDate, Description) 
                        OUTPUT INSERTED.PromotionID
                        VALUES (@PromotionName, @DiscountPercent, @StartDate, @EndDate, @Description)`);
            
            return result.recordset[0].PromotionID;
        } catch (error) {
            console.error('Error creating promotion:', error);
            throw new Error('Error creating promotion: ' + error.message);
        }
    }

    // Update promotion
    async update(promotion) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('PromotionID', sql.Int, promotion.getPromotionID())
                .input('PromotionName', sql.NVarChar(50), promotion.getPromotionName())
                .input('DiscountPercent', sql.Float, promotion.getDiscountPercent())
                .input('StartDate', sql.Date, promotion.getStartDate())
                .input('EndDate', sql.Date, promotion.getEndDate())
                .input('Description', sql.NVarChar(255), promotion.getDescription())
                .query(`UPDATE Promotion 
                        SET PromotionName = @PromotionName,
                            DiscountPercent = @DiscountPercent,
                            StartDate = @StartDate,
                            EndDate = @EndDate,
                            Description = @Description
                        WHERE PromotionID = @PromotionID`);
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error updating promotion:', error);
            throw new Error('Error updating promotion: ' + error.message);
        }
    }

    // Delete promotion
    async delete(promotionId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('PromotionID', sql.Int, promotionId)
                .query('DELETE FROM Promotion WHERE PromotionID = @PromotionID');
            
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting promotion:', error);
            throw new Error('Error deleting promotion: ' + error.message);
        }
    }

    // Search promotions by name
    async searchPromotionsByName(searchTerm) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('SearchTerm', sql.NVarChar(50), `%${searchTerm}%`)
                .query('SELECT * FROM Promotion WHERE PromotionName LIKE @SearchTerm ORDER BY StartDate DESC');
            
            return result.recordset.map(row => new Promotion(
                row.PromotionID,
                row.PromotionName,
                row.DiscountPercent,
                row.StartDate,
                row.EndDate,
                row.Description
            ));
        } catch (error) {
            console.error('Error searching promotions by name:', error);
            throw new Error('Error searching promotions by name: ' + error.message);
        }
    }

    // Get promotions by date range
    async getPromotionsByDateRange(startDate, endDate) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('StartDate', sql.Date, startDate)
                .input('EndDate', sql.Date, endDate)
                .query(`SELECT * FROM Promotion 
                        WHERE (StartDate BETWEEN @StartDate AND @EndDate) 
                           OR (EndDate BETWEEN @StartDate AND @EndDate)
                           OR (StartDate <= @StartDate AND EndDate >= @EndDate)
                        ORDER BY StartDate DESC`);
            
            return result.recordset.map(row => new Promotion(
                row.PromotionID,
                row.PromotionName,
                row.DiscountPercent,
                row.StartDate,
                row.EndDate,
                row.Description
            ));
        } catch (error) {
            console.error('Error getting promotions by date range:', error);
            throw new Error('Error getting promotions by date range: ' + error.message);
        }
    }

    // Check if promotion is being used in bookings
    async isPromotionInUse(promotionId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('PromotionID', sql.Int, promotionId)
                .query('SELECT COUNT(*) as Count FROM BookingPromotion WHERE PromotionID = @PromotionID');
            
            return result.recordset[0].Count > 0;
        } catch (error) {
            console.error('Error checking if promotion is in use:', error);
            throw new Error('Error checking if promotion is in use: ' + error.message);
        }
    }

    // Get promotion statistics
    async getPromotionStats() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        p.PromotionID,
                        p.PromotionName,
                        p.DiscountPercent,
                        p.StartDate,
                        p.EndDate,
                        COUNT(bp.BookingID) as TimesUsed,
                        CASE 
                            WHEN GETDATE() < p.StartDate THEN 'Upcoming'
                            WHEN GETDATE() BETWEEN p.StartDate AND p.EndDate THEN 'Active'
                            ELSE 'Expired'
                        END as Status
                    FROM Promotion p
                    LEFT JOIN BookingPromotion bp ON p.PromotionID = bp.PromotionID
                    GROUP BY p.PromotionID, p.PromotionName, p.DiscountPercent, p.StartDate, p.EndDate
                    ORDER BY p.StartDate DESC
                `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error getting promotion statistics:', error);
            throw new Error('Error getting promotion statistics: ' + error.message);
        }
    }

    // Legacy methods for backward compatibility
    async getAllPromotions() {
        return await this.list();
    }

    async getPromotionById(promotionId) {
        return await this.get(promotionId);
    }

    async createPromotion(promotion) {
        return await this.insert(promotion);
    }

    async updatePromotion(promotion) {
        return await this.update(promotion);
    }

    async deletePromotion(promotionId) {
        return await this.delete(promotionId);
    }
}

export default PromotionDBContext;