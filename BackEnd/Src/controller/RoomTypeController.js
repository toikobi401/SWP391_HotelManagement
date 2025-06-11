import express from 'express';
import RoomTypeDBContext from '../dal/RoomTypeDBContext.js';
import RoomType from '../model/RoomType.js';

const router = express.Router();
const roomTypeDB = new RoomTypeDBContext();

// GET /api/room-types/test - Test database connection
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Testing RoomType database connection...');
        
        // Test connection
        const pool = await roomTypeDB.pool;
        console.log('✅ Database pool obtained');
        
        // Test simple query
        const testResult = await pool.request().query('SELECT 1 as test');
        console.log('✅ Test query successful:', testResult.recordset);
        
        // Check if RoomType table exists
        const tableCheckResult = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'RoomType'
        `);
        const roomTypeTableExists = tableCheckResult.recordset[0].count > 0;
        console.log('📋 RoomType table exists:', roomTypeTableExists);
        
        if (roomTypeTableExists) {
            // Get table schema
            const schemaResult = await pool.request().query(`
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    CHARACTER_MAXIMUM_LENGTH
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'RoomType'
                ORDER BY ORDINAL_POSITION
            `);
            console.log('📄 RoomType table schema:', schemaResult.recordset);
            
            // Try to get count
            const countResult = await pool.request().query('SELECT COUNT(*) as count FROM RoomType');
            console.log('📊 RoomType count:', countResult.recordset[0].count);
            
            // Try to get a few sample records
            const sampleResult = await pool.request().query('SELECT TOP 3 * FROM RoomType ORDER BY TypeId');
            console.log('📝 Sample RoomType records:', sampleResult.recordset);
        }
        
        res.json({
            success: true,
            message: 'Database connection and RoomType table test successful',
            data: {
                connectionStatus: 'Connected',
                testQuery: testResult.recordset[0],
                roomTypeTableExists: roomTypeTableExists,
                roomTypeCount: roomTypeTableExists ? 
                    (await pool.request().query('SELECT COUNT(*) as count FROM RoomType')).recordset[0].count : 0,
                schema: roomTypeTableExists ? 
                    (await pool.request().query(`
                        SELECT COLUMN_NAME, DATA_TYPE 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'RoomType'
                        ORDER BY ORDINAL_POSITION
                    `)).recordset : []
            }
        });
    } catch (error) {
        console.error('❌ RoomType test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection test failed',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/room-types - Get all room types
router.get('/', async (req, res) => {
    try {
        const roomTypes = await roomTypeDB.getAll();
        res.json({
            success: true,
            data: roomTypes,
            count: roomTypes.length
        });
    } catch (error) {
        console.error('Error fetching room types:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching room types',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/room-types/statistics - Get room type statistics
router.get('/statistics', async (req, res) => {
    try {
        const statistics = await roomTypeDB.getRoomTypeStatistics();
        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Error fetching room type statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching room type statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/room-types/popular - Get popular room types
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const popularRoomTypes = await roomTypeDB.getPopularRoomTypes(limit);
        res.json({
            success: true,
            data: popularRoomTypes
        });
    } catch (error) {
        console.error('Error fetching popular room types:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching popular room types',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/room-types/search - Search room types
router.get('/search', async (req, res) => {
    try {
        const { q: searchTerm, minPrice, maxPrice } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        const priceRange = {};
        if (minPrice) priceRange.min = parseFloat(minPrice);
        if (maxPrice) priceRange.max = parseFloat(maxPrice);

        const roomTypes = await roomTypeDB.search(searchTerm, Object.keys(priceRange).length > 0 ? priceRange : null);
        res.json({
            success: true,
            data: roomTypes,
            searchTerm: searchTerm,
            priceRange: priceRange
        });
    } catch (error) {
        console.error('Error searching room types:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching room types',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/room-types/:id - Get room type by ID
router.get('/:id', async (req, res) => {
    try {
        const typeId = parseInt(req.params.id);
        
        if (isNaN(typeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room type ID'
            });
        }

        const roomType = await roomTypeDB.getById(typeId);
        
        if (!roomType) {
            return res.status(404).json({
                success: false,
                message: 'Room type not found'
            });
        }
        
        res.json({
            success: true,
            data: roomType
        });
    } catch (error) {
        console.error('Error fetching room type:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching room type',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/room-types - Create new room type
router.post('/', async (req, res) => {
    try {
        const { TypeName, Description, BasePrice } = req.body;

        // Basic validation
        if (!TypeName || !Description || BasePrice === undefined) {
            return res.status(400).json({
                success: false,
                message: 'TypeName, Description, and BasePrice are required'
            });
        }

        // Create room type object
        const roomType = new RoomType(null, TypeName.trim(), Description.trim(), parseFloat(BasePrice));

        // Create in database
        const createdRoomType = await roomTypeDB.create(roomType);

        res.status(201).json({
            success: true,
            message: 'Room type created successfully',
            data: createdRoomType
        });
    } catch (error) {
        console.error('Error creating room type:', error);
        res.status(400).json({
            success: false,
            message: 'Error creating room type',
            error: error.message
        });
    }
});

// PUT /api/room-types/:id - Update room type
router.put('/:id', async (req, res) => {
    try {
        const typeId = parseInt(req.params.id);
        
        if (isNaN(typeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room type ID'
            });
        }

        const { TypeName, Description, BasePrice } = req.body;

        // Basic validation
        if (!TypeName || !Description || BasePrice === undefined) {
            return res.status(400).json({
                success: false,
                message: 'TypeName, Description, and BasePrice are required'
            });
        }

        // Create room type object
        const roomType = new RoomType(typeId, TypeName.trim(), Description.trim(), parseFloat(BasePrice));

        // Update in database
        const updatedRoomType = await roomTypeDB.update(typeId, roomType);

        res.json({
            success: true,
            message: 'Room type updated successfully',
            data: updatedRoomType
        });
    } catch (error) {
        console.error('Error updating room type:', error);
        res.status(400).json({
            success: false,
            message: 'Error updating room type',
            error: error.message
        });
    }
});

// DELETE /api/room-types/:id - Delete room type
router.delete('/:id', async (req, res) => {
    try {
        const typeId = parseInt(req.params.id);
        
        if (isNaN(typeId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room type ID'
            });
        }

        const deleted = await roomTypeDB.delete(typeId);

        if (deleted) {
            res.json({
                success: true,
                message: 'Room type deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete room type'
            });
        }
    } catch (error) {
        console.error('Error deleting room type:', error);
        res.status(400).json({
            success: false,
            message: 'Error deleting room type',
            error: error.message
        });
    }
});

export default router;