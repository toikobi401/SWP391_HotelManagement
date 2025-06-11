import sql from 'mssql';
import DBContext from './DBContext.js';

class AmenityDBContext extends DBContext {
    async getAllAmenities() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT a.AmenityID, a.AmenityName, a.Description,
                           r.RoomID, r.RoomNumber, r.Floor, r.Status
                    FROM Amenity a
                    LEFT JOIN RoomAmenity ra ON a.AmenityID = ra.AmenityID
                    LEFT JOIN Room r ON ra.RoomID = r.RoomID
                    ORDER BY a.AmenityName, r.Floor, r.RoomNumber
                `);

            // Group rooms by amenity
            const amenityMap = new Map();
            
            result.recordset.forEach(record => {
                if (!amenityMap.has(record.AmenityID)) {
                    const amenity = {
                        AmenityID: record.AmenityID,
                        AmenityName: record.AmenityName,
                        Description: record.Description,
                        rooms: []
                    };
                    amenityMap.set(record.AmenityID, amenity);
                }
                
                if (record.RoomID) {
                    const amenity = amenityMap.get(record.AmenityID);
                    amenity.rooms.push({
                        RoomID: record.RoomID,
                        RoomNumber: record.RoomNumber,
                        Floor: record.Floor,
                        Status: record.Status
                    });
                }
            });

            return Array.from(amenityMap.values());
        } catch (error) {
            console.error('Error getting all amenities:', error);
            throw error;
        }
    }

    async getById(amenityId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('AmenityID', sql.Int, amenityId)
                .query(`
                    SELECT a.AmenityID, a.AmenityName, a.Description,
                           r.RoomID, r.RoomNumber, r.Floor, r.Status
                    FROM Amenity a
                    LEFT JOIN RoomAmenity ra ON a.AmenityID = ra.AmenityID
                    LEFT JOIN Room r ON ra.RoomID = r.RoomID
                    WHERE a.AmenityID = @AmenityID
                    ORDER BY r.Floor, r.RoomNumber
                `);
            
            if (result.recordset.length === 0) {
                return null;
            }

            const amenity = {
                AmenityID: result.recordset[0].AmenityID,
                AmenityName: result.recordset[0].AmenityName,
                Description: result.recordset[0].Description,
                rooms: []
            };

            result.recordset.forEach(record => {
                if (record.RoomID) {
                    amenity.rooms.push({
                        RoomID: record.RoomID,
                        RoomNumber: record.RoomNumber,
                        Floor: record.Floor,
                        Status: record.Status
                    });
                }
            });

            return amenity;
        } catch (error) {
            console.error(`Error getting amenity ${amenityId}:`, error);
            throw error;
        }
    }

    async insert(amenity) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('AmenityName', sql.NVarChar(255), amenity.AmenityName)
                .input('Description', sql.NVarChar(sql.MAX), amenity.Description)
                .query(`
                    INSERT INTO Amenity (AmenityName, Description)
                    OUTPUT INSERTED.AmenityID
                    VALUES (@AmenityName, @Description)
                `);
            return result.recordset[0].AmenityID;
        } catch (error) {
            console.error('Error inserting amenity:', error);
            throw error;
        }
    }

    async update(amenity) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('AmenityID', sql.Int, amenity.AmenityID)
                .input('AmenityName', sql.NVarChar(255), amenity.AmenityName)
                .input('Description', sql.NVarChar(sql.MAX), amenity.Description)
                .query(`
                    UPDATE Amenity SET
                        AmenityName = @AmenityName,
                        Description = @Description
                    WHERE AmenityID = @AmenityID
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error updating amenity ${amenity.AmenityID}:`, error);
            throw error;
        }
    }

    async delete(amenityId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('AmenityID', sql.Int, amenityId)
                .query(`
                    DELETE FROM RoomAmenity WHERE AmenityID = @AmenityID;
                    DELETE FROM Amenity WHERE AmenityID = @AmenityID;
                `);
            return result.rowsAffected[1] > 0; // Check Amenity table deletion
        } catch (error) {
            console.error(`Error deleting amenity ${amenityId}:`, error);
            throw error;
        }
    }

    // Lấy amenities của một room cụ thể
    async getAmenitiesByRoomId(roomId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', sql.Int, roomId)
                .query(`
                    SELECT a.AmenityID, a.AmenityName, a.Description
                    FROM Amenity a
                    INNER JOIN RoomAmenity ra ON a.AmenityID = ra.AmenityID
                    WHERE ra.RoomID = @RoomID
                    ORDER BY a.AmenityName
                `);
            
            return result.recordset;
        } catch (error) {
            console.error(`Error getting amenities for room ${roomId}:`, error);
            throw error;
        }
    }

    // Thêm amenity vào room
    async addAmenityToRoom(roomId, amenityId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', sql.Int, roomId)
                .input('AmenityID', sql.Int, amenityId)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM RoomAmenity WHERE RoomID = @RoomID AND AmenityID = @AmenityID)
                    INSERT INTO RoomAmenity (RoomID, AmenityID) VALUES (@RoomID, @AmenityID)
                `);
            return true;
        } catch (error) {
            console.error(`Error adding amenity ${amenityId} to room ${roomId}:`, error);
            throw error;
        }
    }

    // Xóa amenity khỏi room
    async removeAmenityFromRoom(roomId, amenityId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', sql.Int, roomId)
                .input('AmenityID', sql.Int, amenityId)
                .query(`
                    DELETE FROM RoomAmenity 
                    WHERE RoomID = @RoomID AND AmenityID = @AmenityID
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error removing amenity ${amenityId} from room ${roomId}:`, error);
            throw error;
        }
    }
}

export default AmenityDBContext;