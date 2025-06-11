import sql from 'mssql';
import DBContext from './DBContext.js';
import Room from '../model/Room.js';

class RoomDBContext extends DBContext {
    async getAll() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT r.*, rt.TypeName, rt.BasePrice,
                           a.AmenityID, a.AmenityName, a.Description as AmenityDescription
                    FROM Room r
                    JOIN RoomType rt ON r.TypeID = rt.TypeId
                    LEFT JOIN RoomAmenity ra ON r.RoomID = ra.RoomID
                    LEFT JOIN Amenity a ON ra.AmenityID = a.AmenityID
                    ORDER BY r.Floor, r.RoomNumber
                `);

            // Group amenities by room
            const roomMap = new Map();
            
            result.recordset.forEach(record => {
                if (!roomMap.has(record.RoomID)) {
                    const room = Room.fromDatabase(record);
                    room.amenities = [];
                    roomMap.set(record.RoomID, room);
                }
                
                if (record.AmenityID) {
                    const room = roomMap.get(record.RoomID);
                    room.addAmenity({
                        AmenityID: record.AmenityID,
                        AmenityName: record.AmenityName,
                        Description: record.AmenityDescription
                    });
                }
            });

            return Array.from(roomMap.values());
        } catch (error) {
            console.error('Error getting all rooms:', error);
            throw error;
        }
    }

    async getById(roomId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', sql.Int, roomId)
                .query(`
                    SELECT r.*, rt.TypeName, rt.BasePrice 
                    FROM Room r
                    JOIN RoomType rt ON r.TypeID = rt.TypeId
                    WHERE r.RoomID = @RoomID
                `);
            
            if (result.recordset.length === 0) {
                return null;
            }
            return Room.fromDatabase(result.recordset[0]);
        } catch (error) {
            console.error(`Error getting room ${roomId}:`, error);
            throw error;
        }
    }

    async insert(room) {
        try {
            room.validate();
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomNumber', sql.NVarChar(50), room.RoomNumber)
                .input('Floor', sql.Int, room.Floor)
                .input('CurrentPrice', sql.Float, room.CurrentPrice)
                .input('Description', sql.NVarChar(sql.MAX), room.Description)
                .input('Capacity', sql.Int, room.Capacity)
                .input('CreateAt', sql.DateTime, room.CreateAt)
                .input('UpadateAt', sql.DateTime, room.UpadateAt)
                .input('Status', sql.NVarChar(50), room.Status)
                .input('TypeID', sql.Int, room.TypeID)
                .query(`
                    INSERT INTO Room (
                        RoomNumber, Floor, CurrentPrice, Description, 
                        Capacity, CreateAt, UpadateAt, Status, TypeID
                    )
                    OUTPUT INSERTED.RoomID
                    VALUES (
                        @RoomNumber, @Floor, @CurrentPrice, @Description,
                        @Capacity, @CreateAt, @UpadateAt, @Status, @TypeID
                    )
                `);
            return result.recordset[0].RoomID;
        } catch (error) {
            console.error('Error inserting room:', error);
            throw error;
        }
    }

    async update(room) {
        try {
            room.validate();
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', sql.Int, room.RoomID)
                .input('RoomNumber', sql.NVarChar(50), room.RoomNumber)
                .input('Floor', sql.Int, room.Floor)
                .input('CurrentPrice', sql.Float, room.CurrentPrice)
                .input('Description', sql.NVarChar(sql.MAX), room.Description)
                .input('Capacity', sql.Int, room.Capacity)
                .input('UpadateAt', sql.DateTime, new Date())
                .input('Status', sql.NVarChar(50), room.Status)
                .input('TypeID', sql.Int, room.TypeID)
                .query(`
                    UPDATE Room SET
                        RoomNumber = @RoomNumber,
                        Floor = @Floor,
                        CurrentPrice = @CurrentPrice,
                        Description = @Description,
                        Capacity = @Capacity,
                        UpadateAt = @UpadateAt,
                        Status = @Status,
                        TypeID = @TypeID
                    WHERE RoomID = @RoomID
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error updating room ${room.RoomID}:`, error);
            throw error;
        }
    }

    async updateStatus(roomId, status) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', sql.Int, roomId)
                .input('Status', sql.NVarChar(50), status)
                .input('UpadateAt', sql.DateTime, new Date())
                .query(`
                    UPDATE Room SET
                        Status = @Status,
                        UpadateAt = @UpadateAt
                    WHERE RoomID = @RoomID
                `);
            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error(`Error updating room ${roomId} status:`, error);
            throw error;
        }
    }

    async delete(roomId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', sql.Int, roomId)
                .query(`
                    DELETE FROM RoomAmenity WHERE RoomID = @RoomID;
                    DELETE FROM RoomImage WHERE RoomId = @RoomID;
                    DELETE FROM BookingRoom WHERE RoomID = @RoomID;
                    DELETE FROM Room WHERE RoomID = @RoomID;
                `);
            return result.rowsAffected[3] > 0; // Check Room table deletion
        } catch (error) {
            console.error(`Error deleting room ${roomId}:`, error);
            throw error;
        }
    }

    async getRoomsByType(typeId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('TypeID', sql.Int, typeId)
                .query(`
                    SELECT r.*, rt.TypeName, rt.BasePrice 
                    FROM Room r
                    JOIN RoomType rt ON r.TypeID = rt.TypeId
                    WHERE r.TypeID = @TypeID
                    ORDER BY r.Floor, r.RoomNumber
                `);
            return result.recordset.map(record => Room.fromDatabase(record));
        } catch (error) {
            console.error(`Error getting rooms by type ${typeId}:`, error);
            throw error;
        }
    }

    async getAvailableRooms() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT r.*, rt.TypeName, rt.BasePrice,
                           a.AmenityID, a.AmenityName, a.Description as AmenityDescription
                    FROM Room r
                    JOIN RoomType rt ON r.TypeID = rt.TypeId
                    LEFT JOIN RoomAmenity ra ON r.RoomID = ra.RoomID
                    LEFT JOIN Amenity a ON ra.AmenityID = a.AmenityID
                    WHERE r.Status = N'available'
                    ORDER BY r.Floor, r.RoomNumber
                `);

            // Group amenities by room
            const roomMap = new Map();
            
            result.recordset.forEach(record => {
                if (!roomMap.has(record.RoomID)) {
                    const room = Room.fromDatabase(record);
                    room.amenities = [];
                    roomMap.set(record.RoomID, room);
                }
                
                if (record.AmenityID) {
                    const room = roomMap.get(record.RoomID);
                    room.addAmenity({
                        AmenityID: record.AmenityID,
                        AmenityName: record.AmenityName,
                        Description: record.AmenityDescription
                    });
                }
            });

            return Array.from(roomMap.values());
        } catch (error) {
            console.error('Error getting available rooms:', error);
            throw error;
        }
    }
}

export default RoomDBContext;