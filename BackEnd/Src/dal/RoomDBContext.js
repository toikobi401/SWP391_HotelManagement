import mssql from 'mssql';
import DBContext from './DBContext.js';
import Room from '../model/Room.js';

class RoomDBContext extends DBContext {
    async getAll() {
        try {
            const pool = await this.pool;
            
            console.log('🔍 Executing room query...');
            
            // ✅ SỬA: JOIN với TypeId đúng theo schema
            const result = await pool.request()
                .query(`
                    SELECT r.*, rt.TypeName, rt.BasePrice,
                           a.AmenityID, a.AmenityName, a.Description as AmenityDescription
                    FROM Room r
                    LEFT JOIN RoomType rt ON r.TypeID = rt.TypeId  -- ✅ rt.TypeId không phải rt.TypeID
                    LEFT JOIN RoomAmenity ra ON r.RoomID = ra.RoomID
                    LEFT JOIN Amenity a ON ra.AmenityID = a.AmenityID
                    ORDER BY r.Floor, r.RoomNumber
                `);

            console.log('📊 Query result:', {
                hasResult: !!result,
                hasRecordset: !!result?.recordset,
                recordsetLength: result?.recordset?.length,
                firstRecord: result?.recordset?.[0]
            });

            if (!result || !result.recordset || !Array.isArray(result.recordset)) {
                console.log('⚠️ No valid result from query, returning empty array');
                return [];
            }

            if (result.recordset.length === 0) {
                console.log('ℹ️ No rooms found in database');
                return [];
            }

            // Group amenities by room
            const roomMap = new Map();
            
            result.recordset.forEach((record) => {
                if (!roomMap.has(record.RoomID)) {
                    roomMap.set(record.RoomID, {
                        RoomID: record.RoomID,
                        RoomNumber: record.RoomNumber,
                        Floor: record.Floor,
                        CurrentPrice: record.CurrentPrice,
                        Description: record.Description,
                        Capacity: record.Capacity,
                        CreateAt: record.CreateAt,
                        UpdateAt: record.UpdateAt,
                        Status: record.Status,
                        TypeID: record.TypeID,  // ✅ Từ Room table
                        TypeName: record.TypeName,  // ✅ Từ RoomType table
                        BasePrice: record.BasePrice,  // ✅ Từ RoomType table
                        amenities: []
                    });
                }
                
                // Add amenity if exists
                if (record.AmenityID) {
                    roomMap.get(record.RoomID).amenities.push({
                        amenityId: record.AmenityID,
                        amenityName: record.AmenityName,
                        amenityDescription: record.AmenityDescription
                    });
                }
            });

            const roomsArray = Array.from(roomMap.values());
            
            console.log(`✅ RoomDBContext.getAll() processed ${roomsArray.length} rooms from ${result.recordset.length} records`);
            
            return roomsArray;
            
        } catch (error) {
            console.error('❌ Error getting all rooms:', error);
            return [];
        }
    }

    async getById(roomId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('RoomID', mssql.Int, roomId)
                .query(`
                    SELECT r.*, rt.TypeName, rt.BasePrice 
                    FROM Room r
                    LEFT JOIN RoomType rt ON r.TypeID = rt.TypeID
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
                .input('RoomNumber', mssql.NVarChar(50), room.RoomNumber)
                .input('Floor', mssql.Int, room.Floor)
                .input('CurrentPrice', mssql.Float, room.CurrentPrice)
                .input('Description', mssql.NVarChar(mssql.MAX), room.Description)
                .input('Capacity', mssql.Int, room.Capacity)
                .input('CreateAt', mssql.DateTime, room.CreateAt)
                .input('UpdateAt', mssql.DateTime, room.UpdateAt)
                .input('Status', mssql.NVarChar(50), room.Status)
                .input('TypeID', mssql.Int, room.TypeID)
                .query(`
                    INSERT INTO Room (
                        RoomNumber, Floor, CurrentPrice, Description, 
                        Capacity, CreateAt, UpdateAt, Status, TypeID
                    )
                    OUTPUT INSERTED.RoomID
                    VALUES (
                        @RoomNumber, @Floor, @CurrentPrice, @Description,
                        @Capacity, @CreateAt, @UpdateAt, @Status, @TypeID
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
                .input('RoomID', mssql.Int, room.RoomID)
                .input('RoomNumber', mssql.NVarChar(50), room.RoomNumber)
                .input('Floor', mssql.Int, room.Floor)
                .input('CurrentPrice', mssql.Float, room.CurrentPrice)
                .input('Description', mssql.NVarChar(mssql.MAX), room.Description)
                .input('Capacity', mssql.Int, room.Capacity)
                .input('UpdateAt', mssql.DateTime, new Date())
                .input('Status', mssql.NVarChar(50), room.Status)
                .input('TypeID', mssql.Int, room.TypeID)
                .query(`
                    UPDATE Room SET
                        RoomNumber = @RoomNumber,
                        Floor = @Floor,
                        CurrentPrice = @CurrentPrice,
                        Description = @Description,
                        Capacity = @Capacity,
                        UpdateAt = @UpdateAt,
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
                .input('RoomID', mssql.Int, roomId)
                .input('Status', mssql.NVarChar(50), status)
                .input('UpdateAt', mssql.DateTime, new Date())
                .query(`
                    UPDATE Room SET
                        Status = @Status,
                        UpdateAt = @UpdateAt
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
                .input('RoomID', mssql.Int, roomId)
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
                .input('TypeID', mssql.Int, typeId)
                .query(`
                    SELECT r.*, rt.TypeName, rt.BasePrice 
                    FROM Room r
                    LEFT JOIN RoomType rt ON r.TypeID = rt.TypeID
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
                    LEFT JOIN RoomType rt ON r.TypeID = rt.TypeId
                    LEFT JOIN RoomAmenity ra ON r.RoomID = ra.RoomID
                    LEFT JOIN Amenity a ON ra.AmenityID = a.AmenityID
                    WHERE r.Status = N'available'
                    ORDER BY r.Floor, r.RoomNumber
                `);

            // ✅ SỬA: Kiểm tra result và recordset
            if (!result || !result.recordset) {
                console.warn('⚠️ No result or recordset from available rooms query');
                return []; // ✅ Trả về empty array
            }

            // Group amenities by room
            const roomMap = new Map();
            
            result.recordset.forEach(record => {
                const roomKey = record.RoomID;
                
                if (!roomMap.has(roomKey)) {
                    const room = Room.fromDatabase(record);
                    room.TypeName = record.TypeName;
                    room.BasePrice = record.BasePrice;
                    roomMap.set(roomKey, room);
                }
                
                if (record.AmenityID) {
                    roomMap.get(roomKey).addAmenity({
                        AmenityID: record.AmenityID,
                        AmenityName: record.AmenityName,
                        Description: record.AmenityDescription
                    });
                }
            });

            const availableRoomsArray = Array.from(roomMap.values());
            console.log(`✅ RoomDBContext.getAvailableRooms() returning ${availableRoomsArray.length} rooms`);
            return availableRoomsArray; // ✅ Luôn trả về array
            
        } catch (error) {
            console.error('❌ Error getting available rooms:', error);
            return []; // ✅ Trả về empty array thay vì throw error
        }
    }

    // ✅ SỬA: Get available rooms for booking theo room types và quantities thực tế
    async getAvailableRoomsForBooking(checkInDate, checkOutDate, requestedRoomTypes) {
      try {
        console.log('🔍 Getting available rooms for requested types:', requestedRoomTypes);
        
        const pool = await this.pool;
        
        // ✅ SỬA: Sử dụng TypeId thay vì TypeID
        const query = `
          SELECT DISTINCT
            r.RoomID,
            r.RoomNumber,
            r.Floor,
            r.CurrentPrice,
            r.Description as RoomDescription,
            r.Capacity,
            r.Status as RoomStatus,
            r.TypeID,
            rt.TypeName,
            rt.BasePrice,
            rt.Description as TypeDescription
          FROM Room r
          INNER JOIN RoomType rt ON r.TypeID = rt.TypeId  -- ✅ QUAN TRỌNG: rt.TypeId (không phải TypeID)
          WHERE r.TypeID IN (${requestedRoomTypes.map(rt => `'${rt.roomTypeId}'`).join(',')})
            AND r.Status IN ('Available', 'Trống', 'available')
            AND r.RoomID NOT IN (
              SELECT DISTINCT br.RoomID 
              FROM BookingRoom br
              INNER JOIN Booking b ON br.BookingID = b.BookingID
              WHERE b.BookingStatus NOT IN ('Cancelled', 'No-Show', 'Completed')
                AND (
                  (br.CheckInAt <= @checkOutDate AND br.CheckOutAt >= @checkInDate)
                  OR (b.BookingStatus = 'Pending' AND br.CheckInAt IS NULL)
                )
            )
          ORDER BY rt.TypeName, r.Floor, r.RoomNumber
        `;
        
        const request = pool.request();
        request.input('checkInDate', mssql.DateTime, new Date(checkInDate));
        request.input('checkOutDate', mssql.DateTime, new Date(checkOutDate));
        
        console.log('🔍 Executing room availability query for room types:', requestedRoomTypes.map(rt => rt.roomTypeId));
        
        const result = await request.query(query);
        
        if (!result.recordset || result.recordset.length === 0) {
          console.log('❌ No available rooms found');
          return [];
        }
        
        // ✅ SỬA: Transform data với field mapping đúng
        const transformedRooms = result.recordset.map(row => ({
          // ✅ Room info
          RoomID: row.RoomID,
          RoomNumber: row.RoomNumber,
          Floor: row.Floor,
          CurrentPrice: row.CurrentPrice || row.BasePrice,
          Description: row.RoomDescription,
          Capacity: row.Capacity,
          Status: row.RoomStatus,
          
          // ✅ Room Type info - Map từ database đúng
          TypeID: row.TypeID,  // Từ Room table
          TypeId: row.TypeID,  // Alternative field cho consistency
          TypeName: row.TypeName,  // Từ RoomType table
          BasePrice: row.BasePrice,  // Từ RoomType table
          TypeDescription: row.TypeDescription,  // Từ RoomType table
          
          // ✅ Computed fields cho frontend
          roomTypeId: String(row.TypeID),
          typeName: row.TypeName,
          typeID: row.TypeID,
          basePrice: row.BasePrice || row.CurrentPrice,
          
          // ✅ Availability info
          isAvailable: true,
          availabilityStatus: 'available'
        }));
        
        // ✅ VALIDATION: Kiểm tra từng room type có đủ số lượng không
        const availabilityReport = {};
        
        for (const reqType of requestedRoomTypes) {
          const typeRooms = transformedRooms.filter(room => 
            String(room.TypeID) === String(reqType.roomTypeId)
          );
          
          console.log(`🔍 Checking type ${reqType.roomTypeId} (${typeRooms[0]?.TypeName || 'Unknown'}): need ${reqType.quantity} rooms`);
          
          const available = typeRooms.length;
          const sufficient = available >= reqType.quantity;
          
          availabilityReport[reqType.roomTypeId] = {
            typeName: typeRooms[0]?.TypeName || `Type ${reqType.roomTypeId}`,
            requested: reqType.quantity,
            available,
            sufficient
          };
          
          if (sufficient) {
            console.log(`✅ Type ${reqType.roomTypeId}: sufficient rooms (${available}/${reqType.quantity})`);
          } else {
            console.log(`❌ Type ${reqType.roomTypeId}: insufficient rooms (${available}/${reqType.quantity})`);
          }
        }
        
        console.log('📊 Room availability report:', availabilityReport);
        console.log(`✅ RoomDBContext.getAvailableRoomsForBooking() returning ${transformedRooms.length} rooms`);
        
        return transformedRooms;
        
      } catch (error) {
        console.error('❌ Error getting available rooms for booking:', error);
        return [];
      }
    }
}


export default RoomDBContext;