import sql from 'mssql';
import DBContext from './DBContext.js';
import RoomType from '../model/RoomType.js';

class RoomTypeDBContext extends DBContext {
    constructor() {
        super();
    }

    // Get all room types
    async getAll() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        rt.TypeId,
                        rt.TypeName,
                        rt.Description,
                        rt.BasePrice,
                        COUNT(r.RoomID) as TotalRooms,
                        COUNT(CASE WHEN r.Status = 'available' OR r.Status = 'còn trống' THEN 1 END) as AvailableRooms
                    FROM RoomType rt
                    LEFT JOIN Room r ON rt.TypeId = r.TypeID
                    GROUP BY rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice
                    ORDER BY rt.TypeName ASC
                `);

            return result.recordset.map(row => {
                const roomType = RoomType.fromDatabase(row);
                // Thêm thông tin thống kê
                roomType.TotalRooms = row.TotalRooms;
                roomType.AvailableRooms = row.AvailableRooms;
                return roomType;
            });
        } catch (error) {
            console.error('Error getting all room types:', error);
            throw new Error('Failed to retrieve room types: ' + error.message);
        }
    }

    // Get room type by ID
    async getById(typeId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('TypeId', sql.Int, typeId)
                .query(`
                    SELECT 
                        rt.TypeId,
                        rt.TypeName,
                        rt.Description,
                        rt.BasePrice
                    FROM RoomType rt
                    WHERE rt.TypeId = @TypeId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const roomType = RoomType.fromDatabase(result.recordset[0]);

            // Lấy danh sách phòng thuộc loại này
            const roomsResult = await pool.request()
                .input('TypeId', sql.Int, typeId)
                .query(`
                    SELECT 
                        RoomID,
                        RoomNumber,
                        Floor,
                        Status,
                        CurrentPrice,
                        Capacity,
                        Description
                    FROM Room
                    WHERE TypeID = @TypeId
                    ORDER BY RoomNumber ASC
                `);

            roomType.rooms = roomsResult.recordset;
            return roomType;
        } catch (error) {
            console.error('Error getting room type by ID:', error);
            throw new Error('Failed to retrieve room type: ' + error.message);
        }
    }

    // Get room type by name
    async getByName(typeName) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('TypeName', sql.NVarChar(50), typeName)
                .query(`
                    SELECT 
                        TypeId,
                        TypeName,
                        Description,
                        BasePrice
                    FROM RoomType
                    WHERE TypeName = @TypeName
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return RoomType.fromDatabase(result.recordset[0]);
        } catch (error) {
            console.error('Error getting room type by name:', error);
            throw new Error('Failed to retrieve room type by name: ' + error.message);
        }
    }

    // Create new room type
    async create(roomType) {
        try {
            // Validate input
            const validation = roomType.validate();
            if (!validation.isValid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            // Check if room type name already exists
            const existingRoomType = await this.getByName(roomType.TypeName);
            if (existingRoomType) {
                throw new Error('Room type name already exists');
            }

            const pool = await this.pool;
            const result = await pool.request()
                .input('TypeName', sql.NVarChar(50), roomType.TypeName)
                .input('Description', sql.NVarChar(255), roomType.Description)
                .input('BasePrice', sql.Float, roomType.BasePrice)
                .query(`
                    INSERT INTO RoomType (TypeName, Description, BasePrice)
                    OUTPUT INSERTED.TypeId, INSERTED.TypeName, INSERTED.Description, INSERTED.BasePrice
                    VALUES (@TypeName, @Description, @BasePrice)
                `);

            if (result.recordset.length > 0) {
                return RoomType.fromDatabase(result.recordset[0]);
            }

            throw new Error('Failed to create room type');
        } catch (error) {
            console.error('Error creating room type:', error);
            throw new Error('Failed to create room type: ' + error.message);
        }
    }

    // Update room type
    async update(typeId, roomType) {
        try {
            // Validate input
            const validation = roomType.validate();
            if (!validation.isValid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            // Check if room type exists
            const existingRoomType = await this.getById(typeId);
            if (!existingRoomType) {
                throw new Error('Room type not found');
            }

            // Check if new name conflicts with other room types
            const roomTypeWithSameName = await this.getByName(roomType.TypeName);
            if (roomTypeWithSameName && roomTypeWithSameName.TypeId !== typeId) {
                throw new Error('Room type name already exists');
            }

            const pool = await this.pool;
            const result = await pool.request()
                .input('TypeId', sql.Int, typeId)
                .input('TypeName', sql.NVarChar(50), roomType.TypeName)
                .input('Description', sql.NVarChar(255), roomType.Description)
                .input('BasePrice', sql.Float, roomType.BasePrice)
                .query(`
                    UPDATE RoomType
                    SET TypeName = @TypeName,
                        Description = @Description,
                        BasePrice = @BasePrice
                    OUTPUT INSERTED.TypeId, INSERTED.TypeName, INSERTED.Description, INSERTED.BasePrice
                    WHERE TypeId = @TypeId
                `);

            if (result.recordset.length > 0) {
                return RoomType.fromDatabase(result.recordset[0]);
            }

            throw new Error('Failed to update room type');
        } catch (error) {
            console.error('Error updating room type:', error);
            throw new Error('Failed to update room type: ' + error.message);
        }
    }

    // Delete room type
    async delete(typeId) {
        try {
            // Check if room type exists
            const existingRoomType = await this.getById(typeId);
            if (!existingRoomType) {
                throw new Error('Room type not found');
            }

            // Check if there are rooms using this room type
            const pool = await this.pool;
            const roomCountResult = await pool.request()
                .input('TypeId', sql.Int, typeId)
                .query('SELECT COUNT(*) as RoomCount FROM Room WHERE TypeID = @TypeId');

            if (roomCountResult.recordset[0].RoomCount > 0) {
                throw new Error('Cannot delete room type: There are rooms using this room type');
            }

            // Delete room type
            const result = await pool.request()
                .input('TypeId', sql.Int, typeId)
                .query('DELETE FROM RoomType WHERE TypeId = @TypeId');

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting room type:', error);
            throw new Error('Failed to delete room type: ' + error.message);
        }
    }

    // Get room types with room statistics
    async getRoomTypeStatistics() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        rt.TypeId,
                        rt.TypeName,
                        rt.Description,
                        rt.BasePrice,
                        COUNT(r.RoomID) as TotalRooms,
                        COUNT(CASE WHEN r.Status = 'available' OR r.Status = 'còn trống' THEN 1 END) as AvailableRooms,
                        COUNT(CASE WHEN r.Status = 'occupied' OR r.Status = 'đang sử dụng' THEN 1 END) as OccupiedRooms,
                        COUNT(CASE WHEN r.Status = 'reserved' OR r.Status = 'đã đặt' THEN 1 END) as ReservedRooms,
                        COUNT(CASE WHEN r.Status = 'maintenance' OR r.Status = 'bảo trì' THEN 1 END) as MaintenanceRooms,
                        AVG(r.CurrentPrice) as AverageCurrentPrice,
                        MIN(r.CurrentPrice) as MinCurrentPrice,
                        MAX(r.CurrentPrice) as MaxCurrentPrice
                    FROM RoomType rt
                    LEFT JOIN Room r ON rt.TypeId = r.TypeID
                    GROUP BY rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice
                    ORDER BY rt.TypeName ASC
                `);

            return result.recordset.map(row => ({
                ...RoomType.fromDatabase(row).toJSON(),
                Statistics: {
                    TotalRooms: row.TotalRooms,
                    AvailableRooms: row.AvailableRooms,
                    OccupiedRooms: row.OccupiedRooms,
                    ReservedRooms: row.ReservedRooms,
                    MaintenanceRooms: row.MaintenanceRooms,
                    OccupancyRate: row.TotalRooms > 0 ? 
                        Math.round(((row.OccupiedRooms + row.ReservedRooms) / row.TotalRooms) * 100) : 0,
                    AverageCurrentPrice: row.AverageCurrentPrice || 0,
                    MinCurrentPrice: row.MinCurrentPrice || 0,
                    MaxCurrentPrice: row.MaxCurrentPrice || 0
                }
            }));
        } catch (error) {
            console.error('Error getting room type statistics:', error);
            throw new Error('Failed to retrieve room type statistics: ' + error.message);
        }
    }

    // Get popular room types (based on booking frequency)
    async getPopularRoomTypes(limit = 5) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('Limit', sql.Int, limit)
                .query(`
                    SELECT TOP(@Limit)
                        rt.TypeId,
                        rt.TypeName,
                        rt.Description,
                        rt.BasePrice,
                        COUNT(br.BookingRoomID) as BookingCount
                    FROM RoomType rt
                    LEFT JOIN Room r ON rt.TypeId = r.TypeID
                    LEFT JOIN BookingRoom br ON r.RoomID = br.RoomID
                    GROUP BY rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice
                    ORDER BY COUNT(br.BookingRoomID) DESC
                `);

            return result.recordset.map(row => ({
                ...RoomType.fromDatabase(row).toJSON(),
                BookingCount: row.BookingCount
            }));
        } catch (error) {
            console.error('Error getting popular room types:', error);
            throw new Error('Failed to retrieve popular room types: ' + error.message);
        }
    }

    // Search room types
    async search(searchTerm, priceRange = null) {
        try {
            const pool = await this.pool;
            let query = `
                SELECT 
                    rt.TypeId,
                    rt.TypeName,
                    rt.Description,
                    rt.BasePrice,
                    COUNT(r.RoomID) as TotalRooms,
                    COUNT(CASE WHEN r.Status = 'available' OR r.Status = 'còn trống' THEN 1 END) as AvailableRooms
                FROM RoomType rt
                LEFT JOIN Room r ON rt.TypeId = r.TypeID
                WHERE (rt.TypeName LIKE @SearchTerm OR rt.Description LIKE @SearchTerm)
            `;

            const request = pool.request()
                .input('SearchTerm', sql.NVarChar, `%${searchTerm}%`);

            if (priceRange) {
                if (priceRange.min !== undefined) {
                    query += ' AND rt.BasePrice >= @MinPrice';
                    request.input('MinPrice', sql.Float, priceRange.min);
                }
                if (priceRange.max !== undefined) {
                    query += ' AND rt.BasePrice <= @MaxPrice';
                    request.input('MaxPrice', sql.Float, priceRange.max);
                }
            }

            query += `
                GROUP BY rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice
                ORDER BY rt.TypeName ASC
            `;

            const result = await request.query(query);

            return result.recordset.map(row => {
                const roomType = RoomType.fromDatabase(row);
                roomType.TotalRooms = row.TotalRooms;
                roomType.AvailableRooms = row.AvailableRooms;
                return roomType;
            });
        } catch (error) {
            console.error('Error searching room types:', error);
            throw new Error('Failed to search room types: ' + error.message);
        }
    }

    // Implement abstract methods from DBContext
    async list() {
        return await this.getAll();
    }

    async get(id) {
        return await this.getById(id);
    }

    async insert(model) {
        return await this.create(model);
    }

    async update(model) {
        if (!model.TypeId) {
            throw new Error('TypeId is required for update');
        }
        return await this.update(model.TypeId, model);
    }

    async delete(model) {
        if (typeof model === 'object' && model.TypeId) {
            return await this.delete(model.TypeId);
        } else if (typeof model === 'number') {
            return await this.delete(model);
        } else {
            throw new Error('Invalid model for delete operation');
        }
    }
}

export default RoomTypeDBContext;