import DBContext from './DBContext.js';
import mssql from 'mssql';

class ChatBotDBContext extends DBContext {
    constructor() {
        super();
        // Import các DBContext khác để sử dụng
        this.initializeContexts();
    }

    async initializeContexts() {
        try {
            // Import các DBContext khác
            const { default: UserDBContext } = await import('./UserDBContext.js');
            const { default: RoomDBContext } = await import('./RoomDBContext.js');
            const { default: RoomTypeDBContext } = await import('./RoomTypeDBContext.js');
            const { default: PromotionDBContext } = await import('./PromotionDBContext.js');
            const { default: AmenityDBContext } = await import('./AmenityDBContext.js');
            const { default: RoleDBContext } = await import('./RoleDBContext.js');
            const { default: PaymentDBContext } = await import('./PaymentDBContext.js');

            this.userDB = new UserDBContext();
            this.roomDB = new RoomDBContext();
            this.roomTypeDB = new RoomTypeDBContext();
            this.promotionDB = new PromotionDBContext();
            this.amenityDB = new AmenityDBContext();
            this.roleDB = new RoleDBContext();
            this.paymentDB = new PaymentDBContext();
        } catch (error) {
            console.error('⚠️ Error initializing DB contexts:', error.message);
        }
    }

    // ✅ ROOM TYPES WITH ENHANCED DATA
    async getRoomTypes() {
        try {
            // Kiểm tra cấu trúc bảng trước
            await this.checkTableStructure('RoomType');
            await this.checkTableStructure('Room');
            
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice,
                           COUNT(r.RoomID) as TotalRooms,
                           COUNT(CASE WHEN r.Status = 'Available' THEN 1 END) as AvailableRooms
                    FROM RoomType rt
                    LEFT JOIN Room r ON rt.TypeId = r.TypeID
                    GROUP BY rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice
                    ORDER BY rt.BasePrice ASC
                `);
            
            console.log('✅ RoomTypes fetched:', result.recordset.length, 'records');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching room types:', error);
            
            // Fallback query đơn giản hơn
            try {
                const pool = await this.pool;
                const fallbackResult = await pool.request()
                    .query(`SELECT TypeId, TypeName, Description, BasePrice FROM RoomType ORDER BY BasePrice ASC`);
                
                console.log('✅ RoomTypes fetched (fallback):', fallbackResult.recordset.length, 'records');
                return fallbackResult.recordset;
            } catch (fallbackError) {
                console.error('❌ Fallback room types query failed:', fallbackError);
                return [];
            }
        }
    }

    // ✅ AVAILABLE ROOMS WITH AMENITIES
    async getAvailableRooms() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT r.RoomID, r.RoomNumber, r.Floor, r.Status, r.Capacity,
                           rt.TypeName, rt.BasePrice, rt.Description as RoomTypeDescription
                    FROM Room r
                    INNER JOIN RoomType rt ON r.TypeID = rt.TypeId
                    WHERE r.Status IN ('Available', 'available', 'còn trống')
                    ORDER BY r.Floor, r.RoomNumber
                `);
            
            console.log('✅ Available rooms fetched:', result.recordset.length, 'records');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching available rooms:', error);
            return [];
        }
    }

    // ✅ PROMOTIONS WITH ENHANCED INFO
    async getPromotions() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT PromotionID, PromotionName, Description, 
                           DiscountPercent, StartDate, EndDate
                    FROM Promotion 
                    WHERE StartDate <= GETDATE() AND EndDate >= GETDATE()
                    ORDER BY DiscountPercent DESC
                `);
            
            console.log('✅ Promotions fetched:', result.recordset.length, 'records');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching promotions:', error);
            return [];
        }
    }

    // ✅ AMENITIES DATA
    async getAmenities() {
        try {
            if (this.amenityDB) {
                const amenities = await this.amenityDB.getAllAmenities();
                console.log('✅ Amenities fetched via AmenityDB:', amenities.length, 'records');
                return amenities;
            } else {
                const pool = await this.pool;
                const result = await pool.request()
                    .query(`
                        SELECT a.AmenityID, a.AmenityName, a.Description,
                               COUNT(ra.RoomID) as RoomCount
                        FROM Amenity a
                        LEFT JOIN RoomAmenity ra ON a.AmenityID = ra.AmenityID
                        GROUP BY a.AmenityID, a.AmenityName, a.Description
                        ORDER BY a.AmenityName
                    `);
                
                console.log('✅ Amenities fetched via direct query:', result.recordset.length, 'records');
                return result.recordset;
            }
        } catch (error) {
            console.error('❌ Error fetching amenities:', error);
            return [];
        }
    }

    // ✅ SERVICES DATA
    async getServices() {
        try {
            // Kiểm tra table Service có tồn tại không
            const pool = await this.pool;
            
            const tableCheck = await pool.request()
                .query(`
                    SELECT COUNT(*) as TableExists
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_NAME = 'Service'
                `);
            
            if (tableCheck.recordset[0].TableExists === 0) {
                console.log('⚠️ Service table does not exist, returning empty array');
                return [];
            }
            
            // Kiểm tra cấu trúc trước
            await this.checkTableStructure('Service');
            
            const result = await pool.request()
                .query(`
                    SELECT ServiceID, ServiceName, Description, Price
                    FROM Service
                    ORDER BY ServiceName
                `);
            
            console.log('✅ Services fetched:', result.recordset.length, 'records');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching services:', error.message);
            return [];
        }
    }

    // ✅ BOOKING STATISTICS
    async getBookingStats() {
        try {
            const pool = await this.pool;
            
            // Kiểm tra structure của Booking table trước
            console.log('🔍 Checking Booking table structure...');
            
            const structureResult = await pool.request()
                .query(`
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'Booking'
                    ORDER BY ORDINAL_POSITION
                `);
            
            console.log('📋 Booking table columns:', structureResult.recordset);
            
            // Query cơ bản với các cột có sẵn
            const result = await pool.request()
                .query(`
                    SELECT 
                        COUNT(*) as TotalBookings,
                        COUNT(CASE WHEN BookingType = 1 THEN 1 END) as OnlineBookings,
                        COUNT(CASE WHEN BookingType = 0 THEN 1 END) as WalkInBookings,
                        AVG(NumberOfGuest) as AverageGuests,
                        COUNT(CASE WHEN SpecialRequest IS NOT NULL THEN 1 END) as BookingsWithRequests
                    FROM Booking
                    WHERE CAST(CreateAt AS DATE) = CAST(GETDATE() AS DATE)
                `);
            
            console.log('✅ Booking stats fetched');
            return result.recordset[0];
        } catch (error) {
            console.error('❌ Error fetching booking stats:', error.message);
            
            // Fallback query nếu vẫn lỗi
            try {
                const pool = await this.pool;
                const fallbackResult = await pool.request()
                    .query(`SELECT COUNT(*) as TotalBookings FROM Booking`);
                
                return { 
                    TotalBookings: fallbackResult.recordset[0].TotalBookings,
                    OnlineBookings: 0,
                    WalkInBookings: 0,
                    AverageGuests: 0,
                    BookingsWithRequests: 0
                };
            } catch (fallbackError) {
                console.error('❌ Fallback query also failed:', fallbackError.message);
                return {};
            }
        }
    }

    // ✅ ROOM OCCUPANCY STATS
    async getRoomOccupancyStats() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        COUNT(*) as TotalRooms,
                         COUNT(CASE WHEN Status = 'Available' THEN 1 END) as AvailableRooms,
                        COUNT(CASE WHEN Status = 'Occupied' THEN 1 END) as OccupiedRooms,
                        COUNT(CASE WHEN Status = 'Reserved' THEN 1 END) as ReservedRooms,
                        COUNT(CASE WHEN Status = 'Maintenance' THEN 1 END) as MaintenanceRooms,
                        ROUND(
                            CAST(COUNT(CASE WHEN Status IN ('Occupied', 'Reserved') THEN 1 END) AS FLOAT) / 
                            CAST(COUNT(*) AS FLOAT) * 100, 2
                        ) as OccupancyRate
                    FROM Room
                `);
            
            console.log('✅ Room occupancy stats fetched');
            return result.recordset[0];
        } catch (error) {
            console.error('❌ Error fetching room occupancy stats:', error.message);
            return {};
        }
    }

    // ✅ POPULAR ROOM TYPES
    async getPopularRoomTypes() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT TOP 5
                        rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice,
                        COUNT(br.BookingRoomID) as BookingCount
                    FROM RoomType rt
                    LEFT JOIN Room r ON rt.TypeId = r.TypeID
                    LEFT JOIN BookingRoom br ON r.RoomID = br.RoomID
                    GROUP BY rt.TypeId, rt.TypeName, rt.Description, rt.BasePrice
                    ORDER BY COUNT(br.BookingRoomID) DESC
                `);
            
            console.log('✅ Popular room types fetched:', result.recordset.length, 'records');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching popular room types:', error.message);
            return [];
        }
    }

    // ✅ PAYMENT METHODS STATS
    async getPaymentMethodStats() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT 
                        PaymentMethod,
                        COUNT(*) as TransactionCount,
                        SUM(Amount) as TotalAmount,
                        AVG(Amount) as AverageAmount
                    FROM Payment
                    WHERE PaymentStatus = 'completed'
                    AND CAST(PaymentDate AS DATE) >= CAST(DATEADD(day, -30, GETDATE()) AS DATE)
                    GROUP BY PaymentMethod
                    ORDER BY COUNT(*) DESC
                `);
            
            console.log('✅ Payment method stats fetched:', result.recordset.length, 'records');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching payment method stats:', error.message);
            return [];
        }
    }

    // ✅ SEARCH ROOMS BY CRITERIA
    async searchRooms(criteria) {
        try {
            const pool = await this.pool;
            let query = `
                SELECT r.RoomID, r.RoomNumber, r.Floor, r.Status, r.Capacity, r.CurrentPrice,
                       rt.TypeName, rt.BasePrice, rt.Description as RoomTypeDescription,
                       STRING_AGG(a.AmenityName, ', ') as Amenities
                FROM Room r
                INNER JOIN RoomType rt ON r.TypeID = rt.TypeId
                LEFT JOIN RoomAmenity ra ON r.RoomID = ra.RoomID
                LEFT JOIN Amenity a ON ra.AmenityID = a.AmenityID
                WHERE r.Status = 'Available'
            `;

            const request = pool.request();

            if (criteria.roomType) {
                query += ` AND rt.TypeName LIKE @roomType`;
                request.input('roomType', mssql.NVarChar, `%${criteria.roomType}%`);
            }

            if (criteria.minPrice) {
                query += ` AND rt.BasePrice >= @minPrice`;
                request.input('minPrice', mssql.Float, criteria.minPrice);
            }

            if (criteria.maxPrice) {
                query += ` AND rt.BasePrice <= @maxPrice`;
                request.input('maxPrice', mssql.Float, criteria.maxPrice);
            }

            if (criteria.capacity) {
                query += ` AND r.Capacity >= @capacity`;
                request.input('capacity', mssql.Int, criteria.capacity);
            }

            if (criteria.floor) {
                query += ` AND r.Floor = @floor`;
                request.input('floor', mssql.Int, criteria.floor);
            }

            query += `
                GROUP BY r.RoomID, r.RoomNumber, r.Floor, r.Status, r.Capacity, r.CurrentPrice,
                         rt.TypeName, rt.BasePrice, rt.Description
                ORDER BY rt.BasePrice, r.Floor, r.RoomNumber
            `;

            const result = await request.query(query);
            console.log('✅ Room search completed:', result.recordset.length, 'results');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error searching rooms:', error);
            return [];
        }
    }

    // ✅ TEST DATABASE CONNECTION WITH ALL TABLES
    async testDatabaseConnection() {
        try {
            const pool = await this.pool;
            const tests = [];
            
            // Test basic connection
            tests.push({
                test: 'Database Connection',
                status: 'OK',
                message: 'Successfully connected to database'
            });
            
            // Test tables exist
            const tablesResult = await pool.request()
                .query(`
                    SELECT TABLE_NAME 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_TYPE = 'BASE TABLE'
                    ORDER BY TABLE_NAME
                `);
            
            const existingTables = tablesResult.recordset.map(row => row.TABLE_NAME);
            
            tests.push({
                test: 'Tables Discovery',
                status: 'OK',
                tables: existingTables,
                count: existingTables.length
            });
            
            // Test each table individually
            const tablesToTest = ['RoomType', 'Room', 'Promotion', 'Service', 'Amenity', 'Booking', 'Payment', 'User'];
            
            for (const tableName of tablesToTest) {
                if (existingTables.includes(tableName)) {
                    try {
                        const result = await pool.request().query(`SELECT COUNT(*) as count FROM ${tableName}`);
                        tests.push({ 
                            test: `Table ${tableName}`,
                            status: 'OK', 
                            count: result.recordset[0].count
                        });
                    } catch (error) {
                        tests.push({ 
                            test: `Table ${tableName}`,
                            status: 'ERROR', 
                            error: error.message 
                        });
                    }
                } else {
                    tests.push({ 
                        test: `Table ${tableName}`,
                        status: 'NOT_FOUND', 
                        message: 'Table does not exist in database'
                    });
                }
            }
            
            return tests;
        } catch (error) {
            console.error('❌ Database connection test failed:', error);
            throw error;
        }
    }

    // ✅ SAFE GET DATABASE COUNTS
    async getDatabaseCounts() {
        try {
            const pool = await this.pool;
            const counts = {};
            
            // Get list of existing tables first
            const tablesResult = await pool.request()
                .query(`
                    SELECT TABLE_NAME 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_TYPE = 'BASE TABLE'
                    ORDER BY TABLE_NAME
                `);
            
            const existingTables = tablesResult.recordset.map(row => row.TABLE_NAME);
            console.log('📋 Existing tables:', existingTables);
            
            // ✅ FIX: Use [User] instead of User to avoid SQL keyword conflict
            for (const tableName of existingTables) {
                try {
                    const tableNameEscaped = tableName === 'User' ? '[User]' : tableName;
                    const countResult = await pool.request()
                        .query(`SELECT COUNT(*) as Count FROM ${tableNameEscaped}`);
                    counts[tableName] = countResult.recordset[0].Count;
                    console.log(`✅ ${tableName}: ${counts[tableName]} records`);
                } catch (error) {
                    console.error(`❌ Error counting ${tableName}:`, error.message);
                    counts[tableName] = 0;
                }
            }
            
            return counts;
        } catch (error) {
            console.error('❌ Error getting database counts:', error);
            return {};
        }
    }

    // ✅ FIX PROMOTIONS QUERY - SỬA TÊN CỘT
    async getPromotions() {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .query(`
                    SELECT PromotionID, PromotionName, Description, 
                           DiscountPercent, StartDate, EndDate
                    FROM Promotion 
                    WHERE StartDate <= GETDATE() AND EndDate >= GETDATE()
                    ORDER BY DiscountPercent DESC
                `);
            
            console.log('✅ Promotions fetched:', result.recordset.length, 'records');
            return result.recordset;
        } catch (error) {
            console.error('❌ Error fetching promotions:', error);
            return [];
        }
    }

    // ✅ FIX BOOKING STATS QUERY - SỬA TÊN CỘT VÀ BẢNG
    async getBookingStats() {
        try {
            const pool = await this.pool;
            
            // Kiểm tra structure của Booking table trước
            console.log('🔍 Checking Booking table structure...');
            
            const structureResult = await pool.request()
                .query(`
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'Booking'
                    ORDER BY ORDINAL_POSITION
                `);
            
            console.log('📋 Booking table columns:', structureResult.recordset);
            
            // Query cơ bản với các cột có sẵn
            const result = await pool.request()
                .query(`
                    SELECT 
                        COUNT(*) as TotalBookings,
                        COUNT(CASE WHEN BookingType = 1 THEN 1 END) as OnlineBookings,
                        COUNT(CASE WHEN BookingType = 0 THEN 1 END) as WalkInBookings,
                        AVG(NumberOfGuest) as AverageGuests,
                        COUNT(CASE WHEN SpecialRequest IS NOT NULL THEN 1 END) as BookingsWithRequests
                    FROM Booking
                    WHERE CAST(CreateAt AS DATE) = CAST(GETDATE() AS DATE)
                `);
            
            console.log('✅ Booking stats fetched');
            return result.recordset[0];
        } catch (error) {
            console.error('❌ Error fetching booking stats:', error.message);
            
            // Fallback query nếu vẫn lỗi
            try {
                const pool = await this.pool;
                const fallbackResult = await pool.request()
                    .query(`SELECT COUNT(*) as TotalBookings FROM Booking`);
                
                return { 
                    TotalBookings: fallbackResult.recordset[0].TotalBookings,
                    OnlineBookings: 0,
                    WalkInBookings: 0,
                    AverageGuests: 0,
                    BookingsWithRequests: 0
                };
            } catch (fallbackError) {
                console.error('❌ Fallback query also failed:', fallbackError.message);
                return {};
            }
        }
    }

    // ✅ THÊM METHOD KIỂM TRA CẤU TRÚC DATABASE
    async checkTableStructure(tableName) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('tableName', tableName)
                .query(`
                    SELECT 
                        COLUMN_NAME as ColumnName,
                        DATA_TYPE as DataType,
                        IS_NULLABLE as IsNullable,
                        COLUMN_DEFAULT as DefaultValue
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = @tableName
                    ORDER BY ORDINAL_POSITION
                `);
            
            console.log(`📋 Table [${tableName}] structure:`, result.recordset);
            return result.recordset;
        } catch (error) {
            console.error(`❌ Error checking ${tableName} structure:`, error);
            return [];
        }
    }

    // Implement abstract methods
    async list() { return await this.getRoomTypes(); }
    async get(id) { return null; }
    async insert(model) { return null; }
    async update(model) { return null; }
    async delete(model) { return null; }
}

export default ChatBotDBContext;