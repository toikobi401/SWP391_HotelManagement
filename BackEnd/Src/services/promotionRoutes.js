import express from 'express';
import PromotionDBContext from '../dal/PromotionDBContext.js';

const router = express.Router();
const promotionDB = new PromotionDBContext();

// Get active promotions
router.get('/active', async (req, res) => {
    try {
        console.log('Fetching active promotions...');
        const promotions = await promotionDB.getActivePromotions();
        console.log('Active promotions found:', promotions.length);
        res.json(promotions);
    } catch (error) {
        console.error('Error fetching active promotions:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Get all promotions
router.get('/', async (req, res) => {
    try {
        const promotions = await promotionDB.list();
        res.json(promotions);
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Get promotion by ID
router.get('/:id', async (req, res) => {
    try {
        const promotionId = parseInt(req.params.id);
        if (isNaN(promotionId)) {
            return res.status(400).json({ error: 'Invalid promotion ID' });
        }
        
        const promotion = await promotionDB.get(promotionId);
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        
        res.json(promotion);
    } catch (error) {
        console.error('Error fetching promotion by ID:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Search promotions by name
router.get('/search/:term', async (req, res) => {
    try {
        const searchTerm = req.params.term;
        const promotions = await promotionDB.searchPromotionsByName(searchTerm);
        res.json(promotions);
    } catch (error) {
        console.error('Error searching promotions:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Get promotion statistics
router.get('/stats/all', async (req, res) => {
    try {
        const stats = await promotionDB.getPromotionStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting promotion stats:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Create new promotion
router.post('/', async (req, res) => {
    try {
        const { promotionName, discountPercent, startDate, endDate, description } = req.body;
        
        // Basic validation
        if (!promotionName || !discountPercent || !startDate || !endDate || !description) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (discountPercent < 0 || discountPercent > 100) {
            return res.status(400).json({ error: 'Discount percent must be between 0 and 100' });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ error: 'Start date must be before end date' });
        }
        
        // Create promotion object with getter methods
        const promotion = {
            getPromotionName: () => promotionName,
            getDiscountPercent: () => discountPercent,
            getStartDate: () => startDate,
            getEndDate: () => endDate,
            getDescription: () => description
        };
        
        const promotionId = await promotionDB.insert(promotion);
        res.status(201).json({ 
            promotionId, 
            message: 'Promotion created successfully',
            promotion: {
                promotionId,
                promotionName,
                discountPercent,
                startDate,
                endDate,
                description
            }
        });
    } catch (error) {
        console.error('Error creating promotion:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update promotion
router.put('/:id', async (req, res) => {
    try {
        const promotionId = parseInt(req.params.id);
        const { promotionName, discountPercent, startDate, endDate, description } = req.body;
        
        if (isNaN(promotionId)) {
            return res.status(400).json({ error: 'Invalid promotion ID' });
        }

        // Basic validation
        if (!promotionName || !discountPercent || !startDate || !endDate || !description) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (discountPercent < 0 || discountPercent > 100) {
            return res.status(400).json({ error: 'Discount percent must be between 0 and 100' });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ error: 'Start date must be before end date' });
        }
        
        // Create promotion object with getter methods
        const promotion = {
            getPromotionID: () => promotionId,
            getPromotionName: () => promotionName,
            getDiscountPercent: () => discountPercent,
            getStartDate: () => startDate,
            getEndDate: () => endDate,
            getDescription: () => description
        };
        
        const success = await promotionDB.update(promotion);
        
        if (success) {
            res.json({ message: 'Promotion updated successfully' });
        } else {
            res.status(404).json({ error: 'Promotion not found' });
        }
    } catch (error) {
        console.error('Error updating promotion:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Delete promotion
router.delete('/:id', async (req, res) => {
    try {
        const promotionId = parseInt(req.params.id);
        
        if (isNaN(promotionId)) {
            return res.status(400).json({ error: 'Invalid promotion ID' });
        }

        // Check if promotion is in use
        const inUse = await promotionDB.isPromotionInUse(promotionId);
        if (inUse) {
            return res.status(400).json({ 
                error: 'Cannot delete promotion that is currently being used in bookings' 
            });
        }
        
        const success = await promotionDB.delete(promotionId);
        
        if (success) {
            res.json({ message: 'Promotion deleted successfully' });
        } else {
            res.status(404).json({ error: 'Promotion not found' });
        }
    } catch (error) {
        console.error('Error deleting promotion:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;