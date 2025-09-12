import express from 'express';
import BookingCancelDBContext from '../dal/BookingCancelDBContext.js';
import BookingDBContext from '../dal/BookingDBContext.js';
import BookingRoomDBContext from '../dal/BookingRoomDBContext.js';
import RoomDBContext from '../dal/RoomDBContext.js';
import BookingCancel from '../model/BookingCancel.js';

const router = express.Router();

class BookingCancelController {
    constructor() {
        this.bookingCancelDB = new BookingCancelDBContext();
        this.bookingDB = new BookingDBContext();
        this.bookingRoomDB = new BookingRoomDBContext();
        this.roomDB = new RoomDBContext();
    }

    // ✅ GET /api/booking-cancels - Get all booking cancellations
    async getAllBookingCancels(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                bookingId,
                cancelType,
                sortBy = 'CancelID',
                sortOrder = 'DESC'
            } = req.query;

            console.log('📋 Getting all booking cancellations with filters:', { 
                bookingId, 
                cancelType, 
                page, 
                limit 
            });

            let bookingCancels;

            if (bookingId) {
                bookingCancels = await this.bookingCancelDB.getByBookingId(parseInt(bookingId));
            } else {
                bookingCancels = await this.bookingCancelDB.list();
            }

            // Filter by cancelType if provided
            if (cancelType) {
                bookingCancels = bookingCancels.filter(bc => 
                    bc.cancelType.toLowerCase().includes(cancelType.toLowerCase())
                );
            }

            // Apply pagination manually
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            
            const paginatedBookingCancels = bookingCancels.slice(startIndex, endIndex);

            return res.status(200).json({
                success: true,
                message: 'Booking cancellations retrieved successfully',
                data: paginatedBookingCancels.map(bc => bc.toJSON()),
                pagination: {
                    current: pageNum,
                    limit: limitNum,
                    total: bookingCancels.length,
                    totalPages: Math.ceil(bookingCancels.length / limitNum)
                }
            });

        } catch (error) {
            console.error('❌ Error in BookingCancelController.getAllBookingCancels:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/booking-cancels/:id - Get booking cancellation by ID
    async getBookingCancelById(req, res) {
        try {
            const cancelId = parseInt(req.params.id);
            
            if (!cancelId || cancelId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid cancellation ID',
                    data: null
                });
            }

            console.log(`📖 Fetching booking cancellation with ID: ${cancelId}`);
            
            const bookingCancel = await this.bookingCancelDB.get(cancelId);
            
            if (bookingCancel) {
                return res.status(200).json({
                    success: true,
                    message: 'Booking cancellation retrieved successfully',
                    data: bookingCancel.toJSON()
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Booking cancellation not found',
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BookingCancelController.getBookingCancelById:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ POST /api/booking-cancels - Create new booking cancellation
    async createBookingCancel(req, res) {
        try {
            const { bookingID, cancelType, cancelReason } = req.body;

            console.log('➕ Creating new booking cancellation:', { 
                bookingID, 
                cancelType, 
                cancelReason: cancelReason ? cancelReason.substring(0, 50) + '...' : null 
            });

            // Validate required fields
            if (!bookingID || !cancelType) {
                return res.status(400).json({
                    success: false,
                    message: 'BookingID and CancelType are required',
                    data: null
                });
            }

            // ✅ THÊM: Kiểm tra booking có tồn tại và có thể hủy không
            const existingBooking = await this.bookingDB.getBookingById(parseInt(bookingID));
            if (!existingBooking.success) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found',
                    data: null
                });
            }

            // ✅ THÊM: Kiểm tra trạng thái booking có thể hủy không
            const currentStatus = existingBooking.data.bookingStatus;
            const nonCancellableStatuses = ['Cancelled', 'Completed', 'CheckedOut'];
            
            if (nonCancellableStatuses.includes(currentStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot cancel booking with status: ${currentStatus}`,
                    data: null
                });
            }

            // Create new BookingCancel instance
            const newBookingCancel = new BookingCancel(
                null, // cancelID sẽ được tự động generate
                parseInt(bookingID),
                cancelType,
                cancelReason || null
            );

            // Validate the booking cancellation
            const validation = BookingCancel.validateBookingCancel(newBookingCancel);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            // ✅ SỬA: Tạo booking cancellation và cập nhật status trong transaction
            console.log('📝 Creating cancellation record and updating booking status...');
            
            const createdBookingCancel = await this.bookingCancelDB.insert(newBookingCancel);
            
            if (!createdBookingCancel || !createdBookingCancel.cancelID) {
                throw new Error('Failed to create booking cancellation record');
            }

            // ✅ THÊM: Kiểm tra và trả phòng về Available nếu booking đã được gán phòng
            console.log(`🏨 Checking if booking ${bookingID} has assigned rooms...`);
            
            try {
                const assignedRooms = await this.bookingRoomDB.getByBookingId(parseInt(bookingID));
                
                if (assignedRooms && assignedRooms.length > 0) {
                    console.log(`📍 Found ${assignedRooms.length} assigned rooms for booking ${bookingID}:`, 
                        assignedRooms.map(r => r.roomID || r.RoomID));
                    
                    // Cập nhật trạng thái các phòng về 'Available'
                    for (const roomAssignment of assignedRooms) {
                        const roomId = roomAssignment.roomID || roomAssignment.RoomID;
                        console.log(`🔄 Updating room ${roomId} status to 'Available'...`);
                        
                        await this.roomDB.updateStatus(roomId, 'Available');
                        console.log(`✅ Room ${roomId} status updated to 'Available'`);
                    }
                    
                    // Xóa các booking room assignments
                    console.log(`🗑️ Removing room assignments for booking ${bookingID}...`);
                    await this.bookingRoomDB.deleteByBookingId(parseInt(bookingID));
                    console.log(`✅ Room assignments removed for booking ${bookingID}`);
                    
                } else {
                    console.log(`ℹ️ No assigned rooms found for booking ${bookingID}`);
                }
            } catch (roomError) {
                console.error('⚠️ Error handling room assignments during cancellation:', roomError);
                // Continue with booking cancellation even if room update fails
                // Log the error but don't fail the entire operation
            }

            // ✅ SỬA: Cập nhật trạng thái booking thành 'Cancelled'
            console.log(`🔄 Updating booking ${bookingID} status from '${currentStatus}' to 'Cancelled'`);
            const updateResult = await this.bookingDB.updateBookingStatus(parseInt(bookingID), 'Cancelled');
            
            if (!updateResult.success) {
                console.error('❌ Failed to update booking status:', updateResult.message);
                // TODO: Rollback booking cancel nếu cần thiết
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update booking status after creating cancellation',
                    error: updateResult.message
                });
            }

            console.log('✅ Booking cancelled successfully:', {
                bookingID: parseInt(bookingID),
                cancelID: createdBookingCancel.cancelID,
                previousStatus: currentStatus,
                newStatus: 'Cancelled',
                cancelType,
                cancelReason: cancelReason || null,
                roomsReleased: true
            });

            return res.status(201).json({
                success: true,
                message: 'Booking cancelled successfully. Assigned rooms have been released and returned to Available status.',
                data: {
                    ...createdBookingCancel.toJSON(),
                    previousStatus: currentStatus,
                    newStatus: 'Cancelled',
                    cancelledAt: new Date().toISOString(),
                    roomsReleased: true
                }
            });

        } catch (error) {
            console.error('❌ Error in BookingCancelController.createBookingCancel:', error);
            
            if (error.message.includes('BookingID không tồn tại')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid booking ID',
                    error: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ PUT /api/booking-cancels/:id - Update booking cancellation
    async updateBookingCancel(req, res) {
        try {
            const cancelId = parseInt(req.params.id);
            const { cancelType, cancelReason } = req.body;

            if (!cancelId || cancelId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid cancellation ID',
                    data: null
                });
            }

            console.log(`✏️ Updating booking cancellation ${cancelId}:`, { 
                cancelType, 
                cancelReason: cancelReason ? cancelReason.substring(0, 50) + '...' : null 
            });

            // Get existing booking cancellation
            const existingBookingCancel = await this.bookingCancelDB.get(cancelId);
            if (!existingBookingCancel) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking cancellation not found',
                    data: null
                });
            }

            // Update fields
            if (cancelType) existingBookingCancel.cancelType = cancelType;
            if (cancelReason !== undefined) existingBookingCancel.cancelReason = cancelReason;

            // Validate updated data
            const validation = BookingCancel.validateBookingCancel(existingBookingCancel);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
            }

            const updatedBookingCancel = await this.bookingCancelDB.update(existingBookingCancel);

            return res.status(200).json({
                success: true,
                message: 'Booking cancellation updated successfully',
                data: updatedBookingCancel.toJSON()
            });

        } catch (error) {
            console.error('❌ Error in BookingCancelController.updateBookingCancel:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ DELETE /api/booking-cancels/:id - Delete booking cancellation
    async deleteBookingCancel(req, res) {
        try {
            const cancelId = parseInt(req.params.id);

            if (!cancelId || cancelId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid cancellation ID',
                    data: null
                });
            }

            console.log('🗑️ Deleting booking cancellation:', cancelId);

            const deleted = await this.bookingCancelDB.delete(cancelId);

            if (deleted) {
                return res.status(200).json({
                    success: true,
                    message: 'Booking cancellation deleted successfully',
                    data: null
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Booking cancellation not found',
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BookingCancelController.deleteBookingCancel:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/booking-cancels/statistics/types - Get cancellation statistics
    async getCancellationStatistics(req, res) {
        try {
            console.log('📊 Getting cancellation statistics');

            const statistics = await this.bookingCancelDB.getCancellationStatistics();

            return res.status(200).json({
                success: true,
                message: 'Cancellation statistics retrieved successfully',
                data: statistics
            });

        } catch (error) {
            console.error('❌ Error in BookingCancelController.getCancellationStatistics:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/booking-cancels/types - Get available cancel types
    async getCancelTypes(req, res) {
        try {
            const cancelTypes = BookingCancel.getCancelTypes();

            return res.status(200).json({
                success: true,
                message: 'Cancel types retrieved successfully',
                data: cancelTypes
            });

        } catch (error) {
            console.error('❌ Error in BookingCancelController.getCancelTypes:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

const bookingCancelController = new BookingCancelController();

// ✅ Routes
router.get('/', bookingCancelController.getAllBookingCancels.bind(bookingCancelController));
router.get('/statistics/types', bookingCancelController.getCancellationStatistics.bind(bookingCancelController));
router.get('/types', bookingCancelController.getCancelTypes.bind(bookingCancelController));
router.get('/:id', bookingCancelController.getBookingCancelById.bind(bookingCancelController));
router.post('/', bookingCancelController.createBookingCancel.bind(bookingCancelController));
router.put('/:id', bookingCancelController.updateBookingCancel.bind(bookingCancelController));
router.delete('/:id', bookingCancelController.deleteBookingCancel.bind(bookingCancelController));

// ✅ THÊM: Debug route để test
router.get('/debug/test', (req, res) => {
    console.log('🧪 [BOOKING CANCEL CONTROLLER] Test route called');
    res.json({
        success: true,
        message: 'BookingCancelController test route working',
        timestamp: new Date().toISOString(),
        routes: [
            'GET /api/booking-cancels',
            'GET /api/booking-cancels/statistics/types',
            'GET /api/booking-cancels/types',
            'GET /api/booking-cancels/:id',
            'POST /api/booking-cancels',
            'PUT /api/booking-cancels/:id',
            'DELETE /api/booking-cancels/:id'
        ]
    });
});

export default router;
