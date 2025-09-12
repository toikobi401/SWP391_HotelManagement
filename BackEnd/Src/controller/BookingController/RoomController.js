import express from 'express';
import RoomDBContext from '../../dal/RoomDBContext.js';
import RoomTypeDBContext from '../../dal/RoomTypeDBContext.js';
import RoomAmenityService from '../../services/RoomAmenityService.js';

const router = express.Router();
const roomDB = new RoomDBContext();
const roomTypeDB = new RoomTypeDBContext();
const roomAmenityService = new RoomAmenityService();

// ✅ THÊM LẠI: sendResponse function
const sendResponse = (res, status, success, message, data = null, errors = null, pagination = null) => {
    const response = {
        success,
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
        ...(errors && { errors }),
        ...(pagination && { pagination })
    };
    
    res.status(status).json(response);
};

// GET /api/rooms - Get all rooms
router.get('/', async (req, res) => {
    try {
        console.log('📋 Getting all rooms from database...');
        const rooms = await roomDB.getAll();
        
        const roomsArray = Array.isArray(rooms) ? rooms : [];
        console.log(`✅ Retrieved ${roomsArray.length} rooms from database`);
        
        const response = {
            success: true,
            data: roomsArray,
            count: roomsArray.length,
            message: 'Lấy danh sách phòng thành công'
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error fetching rooms:', error);
        
        const errorResponse = {
            success: false,
            data: [],
            count: 0,
            message: 'Lỗi khi lấy danh sách phòng',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        };
        
        res.status(500).json(errorResponse);
    }
});

// GET /api/rooms/available - Get available rooms
router.get('/available', async (req, res) => {
    try {
        console.log('📋 Getting available rooms...');
        const availableRooms = await roomDB.getAvailableRooms();
        
        const roomsArray = Array.isArray(availableRooms) ? availableRooms : [];
        console.log(`✅ Retrieved ${roomsArray.length} available rooms`);
        
        res.json({
            success: true,
            data: roomsArray,
            count: roomsArray.length,
            message: 'Lấy danh sách phòng trống thành công'
        });
    } catch (error) {
        console.error('❌ Error fetching available rooms:', error);
        
        res.status(500).json({
            success: false,
            data: [],
            count: 0,
            message: 'Lỗi khi lấy danh sách phòng trống',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/rooms/available-for-booking - Get rooms available for specific booking
router.get('/available-for-booking', async (req, res) => {
    try {
        const { checkIn, checkOut, requestedRoomTypes } = req.query;
        
        console.log('🔍 Fetching available rooms for booking:', {
            checkIn,
            checkOut,
            requestedRoomTypes,
            requestedRoomTypesLength: requestedRoomTypes?.length,
            rawQuery: req.query
        });
        
        // ✅ FIX: Enhanced date validation với decoding
        if (!checkIn || checkIn === 'undefined' || checkIn === 'null') {
            return sendResponse(res, 400, false, 'Check-in date is required');
        }
        
        if (!checkOut || checkOut === 'undefined' || checkOut === 'null') {
            return sendResponse(res, 400, false, 'Check-out date is required');
        }
        
        // ✅ FIX: Decode URL-encoded dates if needed
        let decodedCheckIn = checkIn;
        let decodedCheckOut = checkOut;
        
        try {
            // ✅ Handle potential double encoding
            if (checkIn.includes('%')) {
                decodedCheckIn = decodeURIComponent(checkIn);
                if (decodedCheckIn.includes('%')) {
                    decodedCheckIn = decodeURIComponent(decodedCheckIn);
                }
            }
            
            if (checkOut.includes('%')) {
                decodedCheckOut = decodeURIComponent(checkOut);
                if (decodedCheckOut.includes('%')) {
                    decodedCheckOut = decodeURIComponent(decodedCheckOut);
                }
            }
        } catch (decodeError) {
            console.error('❌ Error decoding dates:', decodeError);
            return sendResponse(res, 400, false, 'Invalid date encoding format');
        }
        
        console.log('🔄 Decoded dates:', {
            original: { checkIn, checkOut },
            decoded: { checkIn: decodedCheckIn, checkOut: decodedCheckOut }
        });
        
        // ✅ FIX: Enhanced requestedRoomTypes parsing với multiple fallback methods
        let parsedRoomTypes = [];
        
        if (requestedRoomTypes && requestedRoomTypes !== 'undefined' && requestedRoomTypes !== 'null') {
            try {
                console.log('🔍 Raw requestedRoomTypes:', {
                    value: requestedRoomTypes,
                    length: requestedRoomTypes.length,
                    first100Chars: requestedRoomTypes.substring(0, 100),
                    containsPercent: requestedRoomTypes.includes('%')
                });
                
                // ✅ FIX: Method 1 - Try direct parse first
                let jsonString = requestedRoomTypes;
                
                // ✅ FIX: Method 2 - Decode if URL encoded
                if (requestedRoomTypes.includes('%')) {
                    try {
                        jsonString = decodeURIComponent(requestedRoomTypes);
                        console.log('🔄 Decoded requestedRoomTypes:', jsonString);
                        
                        // ✅ Handle double encoding
                        if (jsonString.includes('%')) {
                            jsonString = decodeURIComponent(jsonString);
                            console.log('🔄 Double decoded requestedRoomTypes:', jsonString);
                        }
                    } catch (decodeErr) {
                        console.warn('⚠️ Failed to decode requestedRoomTypes, using original:', decodeErr.message);
                        jsonString = requestedRoomTypes;
                    }
                }
                
                // ✅ FIX: Method 3 - Clean up potential truncation or corruption
                jsonString = jsonString.trim();
                
                // ✅ FIX: Method 4 - Validate JSON structure before parsing
                if (!jsonString.startsWith('[') || !jsonString.endsWith(']')) {
                    throw new Error(`Invalid JSON structure: must start with [ and end with ]. Got: ${jsonString.substring(0, 50)}...`);
                }
                
                // ✅ FIX: Method 5 - Try parsing with enhanced error info
                try {
                    parsedRoomTypes = JSON.parse(jsonString);
                    console.log('✅ Successfully parsed room types:', parsedRoomTypes);
                } catch (parseErr) {
                    console.error('❌ JSON Parse Error Details:', {
                        error: parseErr.message,
                        position: parseErr.message.match(/position (\d+)/)?.[1],
                        jsonString: jsonString,
                        jsonLength: jsonString.length,
                        charAtError: parseErr.message.match(/position (\d+)/)?.[1] ? 
                            jsonString.charAt(parseInt(parseErr.message.match(/position (\d+)/)[1])) : 'N/A'
                    });
                    
                    // ✅ FIX: Fallback - Try to extract valid JSON manually
                    const fallbackMatch = jsonString.match(/\[[\s\S]*\]/);
                    if (fallbackMatch) {
                        try {
                            parsedRoomTypes = JSON.parse(fallbackMatch[0]);
                            console.log('✅ Fallback parsing successful:', parsedRoomTypes);
                        } catch (fallbackErr) {
                            throw new Error(`JSON parsing failed: ${parseErr.message}. Fallback also failed: ${fallbackErr.message}`);
                        }
                    } else {
                        throw new Error(`Invalid JSON format and no fallback available: ${parseErr.message}`);
                    }
                }
                
            } catch (parseError) {
                console.error('❌ Error parsing requestedRoomTypes:', parseError);
                return sendResponse(res, 400, false, `Invalid requestedRoomTypes format: ${parseError.message}. Must be valid JSON array.`);
            }
        } else {
            console.log('ℹ️ No requestedRoomTypes provided, fetching all available rooms');
        }
        
        // ✅ Validate requestedRoomTypes structure (keeping existing logic)
        const validatedRoomTypes = [];
        
        if (Array.isArray(parsedRoomTypes) && parsedRoomTypes.length > 0) {
            for (const roomType of parsedRoomTypes) {
                if (!roomType.roomTypeId || !roomType.quantity) {
                    return sendResponse(res, 400, false, 'Each room type must have roomTypeId and quantity');
                }
                
                const quantity = parseInt(roomType.quantity);
                if (isNaN(quantity) || quantity <= 0) {
                    return sendResponse(res, 400, false, 'Room quantity must be a positive number');
                }
                
                validatedRoomTypes.push({
                    roomTypeId: String(roomType.roomTypeId),
                    quantity: quantity
                });
            }
        }
        
        console.log('✅ Validation passed, fetching available rooms...');
        
        // ✅ FIX: Date validation với decoded dates (keeping existing logic)
        const checkInDate = new Date(decodedCheckIn);
        const checkOutDate = new Date(decodedCheckOut);
        
        if (isNaN(checkInDate.getTime())) {
            return sendResponse(res, 400, false, `Invalid check-in date format: ${decodedCheckIn}`);
        }
        
        if (isNaN(checkOutDate.getTime())) {
            return sendResponse(res, 400, false, `Invalid check-out date format: ${decodedCheckOut}`);
        }
        
        if (checkInDate >= checkOutDate) {
            return sendResponse(res, 400, false, 'Check-out date must be after check-in date');
        }
        
        // ✅ Get available rooms với decoded dates
        const availableRooms = await roomDB.getAvailableRoomsForBooking(
            checkInDate.toISOString(),
            checkOutDate.toISOString(),
            validatedRoomTypes
        );
        
        // ✅ Ensure availableRooms is array
        const roomsArray = Array.isArray(availableRooms) ? availableRooms : [];
        
        console.log(`✅ Found ${roomsArray.length} available rooms`);
        
        // ✅ FIX: Enhanced response với requestedRoomTypes info
        sendResponse(res, 200, true, `Found ${roomsArray.length} available rooms`, 
            roomsArray, null, { 
                searchCriteria: {
                    checkIn: checkInDate.toISOString(),
                    checkOut: checkOutDate.toISOString(),
                    requestedRoomTypes: validatedRoomTypes,
                    totalRequested: validatedRoomTypes.reduce((sum, rt) => sum + rt.quantity, 0)
                },
                roomRequirements: validatedRoomTypes  // ✅ THÊM: Để frontend biết requirements
            });
        
    } catch (error) {
        console.error('❌ Error fetching available rooms for booking:', error);
        
        sendResponse(res, 500, false, 'Lỗi khi tìm phòng trống cho booking', [], {
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/rooms/:id - Get room by ID
router.get('/:id', async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        
        if (isNaN(roomId) || roomId <= 0) {
            return sendResponse(res, 400, false, 'Invalid room ID');
        }
        
        const room = await roomDB.getById(roomId);
        
        if (!room) {
            return sendResponse(res, 404, false, 'Room not found');
        }
        
        sendResponse(res, 200, true, 'Room retrieved successfully', room);
        
    } catch (error) {
        console.error('❌ Error fetching room:', error);
        sendResponse(res, 500, false, 'Error fetching room');
    }
});

// POST /api/rooms - Create new room
router.post('/', async (req, res) => {
    try {
        const roomData = req.body;
        
        // Validate required fields
        const requiredFields = ['RoomNumber', 'Floor', 'CurrentPrice', 'Description', 'Capacity', 'TypeID'];
        const missingFields = requiredFields.filter(field => !roomData[field]);
        
        if (missingFields.length > 0) {
            return sendResponse(res, 400, false, 'Missing required fields', null, {
                missingFields
            });
        }
        
        const newRoomId = await roomDB.insert(roomData);
        
        sendResponse(res, 201, true, 'Room created successfully', {
            roomId: newRoomId
        });
        
    } catch (error) {
        console.error('❌ Error creating room:', error);
        sendResponse(res, 500, false, 'Error creating room');
    }
});

// PUT /api/rooms/:id - Update room
router.put('/:id', async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const updateData = req.body;
        
        if (isNaN(roomId) || roomId <= 0) {
            return sendResponse(res, 400, false, 'Invalid room ID');
        }
        
        const result = await roomDB.update(roomId, updateData);
        
        if (result) {
            sendResponse(res, 200, true, 'Room updated successfully');
        } else {
            sendResponse(res, 404, false, 'Room not found');
        }
        
    } catch (error) {
        console.error('❌ Error updating room:', error);
        sendResponse(res, 500, false, 'Error updating room');
    }
});

// DELETE /api/rooms/:id - Delete room
router.delete('/:id', async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        
        if (isNaN(roomId) || roomId <= 0) {
            return sendResponse(res, 400, false, 'Invalid room ID');
        }
        
        const result = await roomDB.delete(roomId);
        
        if (result) {
            sendResponse(res, 200, true, 'Room deleted successfully');
        } else {
            sendResponse(res, 404, false, 'Room not found');
        }
        
    } catch (error) {
        console.error('❌ Error deleting room:', error);
        sendResponse(res, 500, false, 'Error deleting room');
    }
});

export default router;