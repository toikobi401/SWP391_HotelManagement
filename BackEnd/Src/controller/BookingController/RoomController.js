import express from 'express';
import RoomDBContext from '../../dal/RoomDBContext.js';
import RoomAmenityService from '../../services/RoomAmenityService.js'; // Sửa đường dẫn

const router = express.Router();
const roomDB = new RoomDBContext();
const roomAmenityService = new RoomAmenityService();

// GET /api/rooms - Lấy tất cả phòng
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await roomDB.getAll();
        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching rooms',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/rooms/available - Lấy phòng còn trống
router.get('/rooms/available', async (req, res) => {
    try {
        const availableRooms = await roomDB.getAvailableRooms();
        res.json(availableRooms);
    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available rooms',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/rooms/:id - Lấy phòng theo ID
router.get('/rooms/:id', async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const room = await roomDB.getById(roomId);
        
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        
        res.json(room);
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching room',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/rooms/:roomId/amenities/:amenityId - Thêm amenity vào room
router.post('/rooms/:roomId/amenities/:amenityId', async (req, res) => {
    try {
        const { roomId, amenityId } = req.params;
        const result = await roomAmenityService.addAmenityToRoom(
            parseInt(roomId), 
            parseInt(amenityId)
        );
        
        res.json({
            success: true,
            message: 'Amenity added to room successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding amenity to room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add amenity to room',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/rooms/:roomId/amenities/:amenityId - Xóa amenity khỏi room
router.delete('/rooms/:roomId/amenities/:amenityId', async (req, res) => {
    try {
        const { roomId, amenityId } = req.params;
        const result = await roomAmenityService.removeAmenityFromRoom(
            parseInt(roomId), 
            parseInt(amenityId)
        );
        
        res.json({
            success: true,
            message: 'Amenity removed from room successfully',
            data: result
        });
    } catch (error) {
        console.error('Error removing amenity from room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove amenity from room',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/room-amenity/stats - Lấy thống kê
router.get('/room-amenity/stats', async (req, res) => {
    try {
        const stats = await roomAmenityService.getRoomAmenityStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics'
        });
    }
});

export default router;