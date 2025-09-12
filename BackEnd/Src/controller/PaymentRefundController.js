import express from 'express';
import PaymentRefundDBContext from '../dal/PaymentRefundDBContext.js';
import PaymentDBContext from '../dal/PaymentDBContext.js';
import PaymentRefund from '../model/PaymentRefund.js';

const router = express.Router();
const refundDB = new PaymentRefundDBContext();
const paymentDB = new PaymentDBContext();

// ✅ GET ALL REFUNDS WITH PAGINATION
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            pageSize = 20, 
            status = null 
        } = req.query;

        console.log('💰 Getting refunds with params:', {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            status
        });

        const result = await refundDB.getAllRefunds(
            parseInt(page),
            parseInt(pageSize),
            status
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            message: `Lấy ${result.data.length} yêu cầu hoàn tiền thành công`,
            availableStatuses: Object.values(PaymentRefund.REFUND_STATUS)
        });

    } catch (error) {
        console.error('❌ Error in GET /refunds:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách hoàn tiền',
            error: error.message
        });
    }
});

export default router;