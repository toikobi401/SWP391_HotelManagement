import express from 'express';
import FeedbackDBContext from '../dal/FeedbackDBContext.js';
import Feedback from '../model/Feedback.js';

const router = express.Router();

class FeedbackController {
    constructor() {
        this.feedbackDB = new FeedbackDBContext();
    }

    // ✅ GET /api/feedbacks - Get all feedbacks
    async getAllFeedbacks(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                customerId,
                bookingId,
                highlighted,
                sortBy = 'CreateAt',
                sortOrder = 'DESC'
            } = req.query;

            console.log('📋 Getting all feedbacks with filters:', { customerId, bookingId, highlighted });

            let feedbacks;

            if (highlighted === 'true') {
                feedbacks = await this.feedbackDB.getHighlightedFeedbacks();
            } else if (customerId) {
                feedbacks = await this.feedbackDB.getByCustomerId(parseInt(customerId));
            } else if (bookingId) {
                feedbacks = await this.feedbackDB.getByBookingId(parseInt(bookingId));
            } else {
                feedbacks = await this.feedbackDB.list();
            }

            // Apply pagination manually since we don't have complex pagination in DBContext
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            
            const paginatedFeedbacks = feedbacks.slice(startIndex, endIndex);

            // ✅ DEBUG: Log sample feedback data
            if (paginatedFeedbacks.length > 0) {
                console.log('🔍 [DEBUG] Sample feedback from DB:', {
                    feedbackID: paginatedFeedbacks[0].feedbackID,
                    customerName: paginatedFeedbacks[0].customerName,
                    customerUsername: paginatedFeedbacks[0].customerUsername,
                    customerID: paginatedFeedbacks[0].customerID
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Feedbacks retrieved successfully',
                data: paginatedFeedbacks.map(feedback => ({
                    ...feedback.toJSON(),
                    // ✅ THÊM: Bao gồm thông tin khách hàng
                    customerName: feedback.customerName,
                    customerUsername: feedback.customerUsername,
                    customerEmail: feedback.customerEmail
                })),
                pagination: {
                    current: pageNum,
                    limit: limitNum,
                    total: feedbacks.length,
                    totalPages: Math.ceil(feedbacks.length / limitNum)
                }
            });

        } catch (error) {
            console.error('❌ Error in FeedbackController.getAllFeedbacks:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/feedbacks/:id - Get feedback by ID
    async getFeedbackById(req, res) {
        try {
            const feedbackId = parseInt(req.params.id);
            
            if (!feedbackId || feedbackId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid feedback ID provided'
                });
            }

            console.log(`📖 Fetching feedback with ID: ${feedbackId}`);
            
            const feedback = await this.feedbackDB.get(feedbackId);
            
            if (feedback) {
                console.log('✅ Feedback fetched successfully:', feedback.feedbackID);
                
                return res.status(200).json({
                    success: true,
                    data: {
                        ...feedback.toJSON(),
                        // ✅ THÊM: Thông tin khách hàng
                        customerName: feedback.customerName,
                        customerUsername: feedback.customerUsername,
                        customerEmail: feedback.customerEmail,
                        formattedDate: this.formatDate(feedback.createAt),
                        ratingDistribution: this.getRatingDistribution(feedback)
                    },
                    message: 'Feedback retrieved successfully'
                });
            } else {
                console.log('❌ Feedback not found:', feedbackId);
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found'
                });
            }

        } catch (error) {
            console.error('❌ Error in FeedbackController.getFeedbackById:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ POST /api/feedbacks - Create new feedback
    async createFeedback(req, res) {
        try {
            const {
                overallRating,
                seviceRating,
                cleanlinessRating,
                locationRating,
                breakfastRating,
                customerID,
                bookingID,
                comment,
                highlighted // ✅ THÊM: Highlighted field
            } = req.body;

            // Get CustomerID from authenticated user if not provided
            const customerId = customerID || req.user?.UserID;

            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required',
                    data: null
                });
            }

            if (!bookingID) {
                return res.status(400).json({
                    success: false,
                    message: 'Booking ID is required',
                    data: null
                });
            }

            console.log('📝 Creating new feedback:', { customerID: customerId, bookingID, highlighted });

            // Create new feedback instance
            const newFeedback = new Feedback({
                overallRating,
                seviceRating,
                cleanlinessRating,
                locationRating,
                breakfastRating,
                customerID: customerId,
                bookingID,
                comment,
                highlighted, // ✅ THÊM: Highlighted
                createAt: new Date()
            });

            const createdFeedback = await this.feedbackDB.insert(newFeedback);

            return res.status(201).json({
                success: true,
                message: 'Feedback created successfully',
                data: createdFeedback.toJSON()
            });

        } catch (error) {
            console.error('❌ Error in FeedbackController.createFeedback:', error);
            
            // Handle validation errors
            if (error.message.includes('Validation failed') || error.message.includes('must be between 1 and 5')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    data: null
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ PUT /api/feedbacks/:id - Update feedback
    async updateFeedback(req, res) {
        try {
            const { id } = req.params;
            const feedbackId = parseInt(id);

            if (isNaN(feedbackId) || feedbackId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid feedback ID is required',
                    data: null
                });
            }

            // Get existing feedback
            const existingFeedback = await this.feedbackDB.get(feedbackId);
            if (!existingFeedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found',
                    data: null
                });
            }

            const {
                overallRating,
                seviceRating,
                cleanlinessRating,
                locationRating,
                breakfastRating,
                customerID,
                bookingID,
                comment,
                highlighted // ✅ THÊM: Highlighted field
            } = req.body;

            console.log('📝 Updating feedback:', feedbackId);

            // Update feedback properties
            if (overallRating !== undefined) existingFeedback.overallRating = existingFeedback.validateRating(overallRating, 'OverallRating');
            if (seviceRating !== undefined) existingFeedback.seviceRating = existingFeedback.validateRating(seviceRating, 'ServiceRating');
            if (cleanlinessRating !== undefined) existingFeedback.cleanlinessRating = existingFeedback.validateRating(cleanlinessRating, 'CleanlinessRating');
            if (locationRating !== undefined) existingFeedback.locationRating = existingFeedback.validateRating(locationRating, 'LocationRating', false);
            if (breakfastRating !== undefined) existingFeedback.breakfastRating = existingFeedback.validateRating(breakfastRating, 'BreakfastRating', false);
            if (customerID !== undefined) existingFeedback.customerID = customerID;
            if (bookingID !== undefined) existingFeedback.bookingID = bookingID;
            if (comment !== undefined) existingFeedback.comment = comment;
            if (highlighted !== undefined) existingFeedback.highlighted = Boolean(highlighted); // ✅ THÊM: Update highlighted

            const updatedFeedback = await this.feedbackDB.update(existingFeedback);

            return res.status(200).json({
                success: true,
                message: 'Feedback updated successfully',
                data: updatedFeedback.toJSON()
            });

        } catch (error) {
            console.error('❌ Error in FeedbackController.updateFeedback:', error);
            
            // Handle validation errors
            if (error.message.includes('must be between 1 and 5')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    data: null
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ DELETE /api/feedbacks/:id - Delete feedback
    async deleteFeedback(req, res) {
        try {
            const { id } = req.params;
            const feedbackId = parseInt(id);

            if (isNaN(feedbackId) || feedbackId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid feedback ID is required',
                    data: null
                });
            }

            console.log('🗑️ Deleting feedback:', feedbackId);

            const deleted = await this.feedbackDB.delete(feedbackId);

            if (deleted) {
                return res.status(200).json({
                    success: true,
                    message: 'Feedback deleted successfully',
                    data: { feedbackId }
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found',
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in FeedbackController.deleteFeedback:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ THÊM: PATCH /api/feedbacks/:id/highlight - Toggle highlight status
    async toggleHighlight(req, res) {
        try {
            const { id } = req.params;
            const feedbackId = parseInt(id);

            if (isNaN(feedbackId) || feedbackId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid feedback ID is required',
                    data: null
                });
            }

            console.log('⭐ Toggling highlight for feedback:', feedbackId);

            const updatedFeedback = await this.feedbackDB.toggleHighlighted(feedbackId);

            return res.status(200).json({
                success: true,
                message: `Feedback ${updatedFeedback.highlighted ? 'highlighted' : 'unhighlighted'} successfully`,
                data: updatedFeedback.toJSON()
            });

        } catch (error) {
            console.error('❌ Error in FeedbackController.toggleHighlight:', error);
            
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found',
                    data: null
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/feedbacks/highlighted - Get highlighted feedbacks for testimonials với log chi tiết
    async getHighlightedFeedbacks(req, res) {
        console.log('='.repeat(50));
        console.log('⭐ [CONTROLLER] GET /api/feedbacks/highlighted called');
        console.log('📅 [CONTROLLER] Request time:', new Date().toISOString());
        console.log('🔍 [CONTROLLER] Request headers:', req.headers);
        console.log('📝 [CONTROLLER] Request query:', req.query);
        
        try {
            console.log('💾 [CONTROLLER] Calling database method: getHighlightedFeedbacks()');
            
            const feedbacks = await this.feedbackDB.getHighlightedFeedbacks();
            
            console.log('📊 [CONTROLLER] Database response received:', {
                isArray: Array.isArray(feedbacks),
                count: feedbacks ? feedbacks.length : 0,
                type: typeof feedbacks
            });
            
            if (feedbacks && feedbacks.length > 0) {
                console.log('✅ [CONTROLLER] Feedbacks found:', feedbacks.length);
                
                // Log chi tiết từng feedback
                feedbacks.forEach((feedback, index) => {
                    console.log(`📋 [CONTROLLER] Feedback ${index + 1}:`, {
                        feedbackID: feedback.feedbackID,
                        customerName: feedback.customerName,
                        customerUsername: feedback.customerUsername,
                        highlighted: feedback.highlighted,
                        comment: feedback.comment ? feedback.comment.substring(0, 50) + '...' : null,
                        overallRating: feedback.overallRating,
                        bookingID: feedback.bookingID,
                        createAt: feedback.createAt
                    });
                });
                
                const responseData = feedbacks.map(feedback => ({
                    ...feedback.toJSON(),
                    customerName: feedback.customerName,
                    customerImage: feedback.customerImage
                }));
                
                console.log('📤 [CONTROLLER] Sending response data:', {
                    success: true,
                    dataCount: responseData.length,
                    sampleData: responseData[0] // Log first item as sample
                });
                
                return res.status(200).json({
                    success: true,
                    message: 'Highlighted feedbacks retrieved successfully',
                    data: responseData
                });
            } 
            
            if (!feedbacks || feedbacks.length === 0) {
                console.log('⚠️ [CONTROLLER] No highlighted feedbacks found');
                console.log('📤 [CONTROLLER] Sending empty response');
                
                return res.status(200).json({
                    success: true,
                    message: 'No highlighted feedbacks found',
                    data: []
                });
            }

        } catch (error) {
            console.error('❌ [CONTROLLER] Error in getHighlightedFeedbacks:', {
                errorMessage: error.message,
                errorStack: error.stack,
                errorName: error.name
            });
            
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            console.log('🏁 [CONTROLLER] getHighlightedFeedbacks method completed');
            console.log('='.repeat(50));
        }
    }

    // ✅ GET /api/feedbacks/booking/:bookingId - Get feedbacks by booking ID
    async getFeedbacksByBooking(req, res) {
        try {
            const { bookingId } = req.params;
            const bookingIdInt = parseInt(bookingId);

            if (isNaN(bookingIdInt) || bookingIdInt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid booking ID is required',
                    data: null
                });
            }

            console.log('📋 Getting feedbacks by booking:', bookingIdInt);

            const feedbacks = await this.feedbackDB.getByBookingId(bookingIdInt);

            return res.status(200).json({
                success: true,
                message: 'Feedbacks retrieved successfully',
                data: feedbacks.map(feedback => ({
                    ...feedback.toJSON(),
                    // ✅ THÊM: Thông tin khách hàng
                    customerName: feedback.customerName,
                    customerUsername: feedback.customerUsername,
                    customerEmail: feedback.customerEmail
                })),
                count: feedbacks.length
            });

        } catch (error) {
            console.error('❌ Error in FeedbackController.getFeedbacksByBooking:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/feedbacks/customer/:customerId - Get feedbacks by customer ID
    async getFeedbacksByCustomer(req, res) {
        try {
            const { customerId } = req.params;
            const customerIdInt = parseInt(customerId);

            if (isNaN(customerIdInt) || customerIdInt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid customer ID is required',
                    data: null
                });
            }

            console.log('📋 Getting feedbacks by customer:', customerIdInt);

            const feedbacks = await this.feedbackDB.getByCustomerId(customerIdInt);

            return res.status(200).json({
                success: true,
                message: 'Feedbacks retrieved successfully',
                data: feedbacks.map(feedback => ({
                    ...feedback.toJSON(),
                    // ✅ THÊM: Thông tin khách hàng
                    customerName: feedback.customerName,
                    customerUsername: feedback.customerUsername,
                    customerEmail: feedback.customerEmail
                })),
                count: feedbacks.length
            });

        } catch (error) {
            console.error('❌ Error in FeedbackController.getFeedbacksByCustomer:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/feedbacks/statistics/averages - Get average ratings statistics
    async getAverageRatings(req, res) {
        try {
            console.log('📊 Getting average ratings statistics');

            const stats = await this.feedbackDB.getAverageRatings();

            const formattedStats = {
                overallRating: parseFloat(stats.AvgOverallRating || 0).toFixed(1),
                serviceRating: parseFloat(stats.AvgServiceRating || 0).toFixed(1),
                cleanlinessRating: parseFloat(stats.AvgCleanlinessRating || 0).toFixed(1),
                locationRating: parseFloat(stats.AvgLocationRating || 0).toFixed(1),
                breakfastRating: parseFloat(stats.AvgBreakfastRating || 0).toFixed(1),
                totalFeedbacks: stats.TotalFeedbacks || 0,
                highlightedFeedbacks: stats.HighlightedFeedbacks || 0, // ✅ THÊM: Highlighted count
                averageOverall: parseFloat(
                    ((parseFloat(stats.AvgOverallRating || 0) + 
                      parseFloat(stats.AvgServiceRating || 0) + 
                      parseFloat(stats.AvgCleanlinessRating || 0) + 
                      parseFloat(stats.AvgLocationRating || 0) + 
                      parseFloat(stats.AvgBreakfastRating || 0)) / 5) || 0
                ).toFixed(1)
            };

            return res.status(200).json({
                success: true,
                message: 'Average ratings retrieved successfully',
                data: formattedStats
            });

        } catch (error) {
            console.error('❌ Error in FeedbackController.getAverageRatings:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ Helper methods
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Không xác định';
        }
    }

    getRatingDistribution(feedback) {
        return {
            overall: feedback.overallRating || 0,
            service: feedback.seviceRating || 0,
            cleanliness: feedback.cleanlinessRating || 0,
            location: feedback.locationRating || 0,
            breakfast: feedback.breakfastRating || 0,
            average: parseFloat(feedback.getAverageRating()),
            highlighted: feedback.highlighted // ✅ THÊM: Highlighted status
        };
    }
}

const feedbackController = new FeedbackController();

// ✅ Routes
router.get('/', feedbackController.getAllFeedbacks.bind(feedbackController));
router.get('/highlighted', feedbackController.getHighlightedFeedbacks.bind(feedbackController)); // ✅ THÊM: Highlighted route
router.get('/statistics/averages', feedbackController.getAverageRatings.bind(feedbackController));
router.get('/booking/:bookingId', feedbackController.getFeedbacksByBooking.bind(feedbackController));
router.get('/customer/:customerId', feedbackController.getFeedbacksByCustomer.bind(feedbackController));
router.get('/:id', feedbackController.getFeedbackById.bind(feedbackController));
router.post('/', feedbackController.createFeedback.bind(feedbackController));
router.put('/:id', feedbackController.updateFeedback.bind(feedbackController));
router.patch('/:id/highlight', feedbackController.toggleHighlight.bind(feedbackController)); // ✅ THÊM: Toggle highlight route
router.delete('/:id', feedbackController.deleteFeedback.bind(feedbackController));

// ✅ THÊM: Debug route để test
router.get('/test', (req, res) => {
    console.log('🧪 [FEEDBACK CONTROLLER] Test route called');
    res.json({
        success: true,
        message: 'FeedbackController test route working',
        timestamp: new Date().toISOString(),
        routes: [
            'GET /api/feedbacks',
            'GET /api/feedbacks/highlighted',
            'GET /api/feedbacks/test'
        ]
    });
});

// ✅ ĐẢM BẢO: Export được đặt ở cuối file
export default router;