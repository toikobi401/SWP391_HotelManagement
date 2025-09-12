import express from 'express';
import InvoiceDBContext from '../dal/InvoiceDBContext.js';

const router = express.Router();
const invoiceDB = new InvoiceDBContext();

// ✅ GET REVENUE REPORT BY PERIOD
router.get('/income-report', async (req, res) => {
    try {
        const { 
            period = 'week',  // week, month, quarter
            range = '',       // specific range value
            year = new Date().getFullYear()
        } = req.query;

        console.log('📊 Getting revenue report with params:', {
            period,
            range,
            year
        });

        const result = await invoiceDB.getRevenueReport(period, range, year);

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
            message: 'Lấy báo cáo doanh thu thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /revenue-report/income-report:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy báo cáo doanh thu',
            error: error.message
        });
    }
});

// ✅ GET DETAILED REVENUE REPORT
router.get('/report-detail', async (req, res) => {
    try {
        const { 
            startDate,
            endDate,
            groupBy = 'month' // week, month, quarter
        } = req.query;

        console.log('📊 Getting detailed revenue report with params:', {
            startDate,
            endDate,
            groupBy
        });

        const result = await invoiceDB.getDetailedRevenueReport(startDate, endDate, groupBy);

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
            message: 'Lấy báo cáo chi tiết thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /revenue-report/report-detail:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy báo cáo chi tiết',
            error: error.message
        });
    }
});

// ✅ GET REVENUE STATISTICS
router.get('/statistics', async (req, res) => {
    try {
        const { 
            startDate,
            endDate
        } = req.query;

        console.log('📊 Getting revenue statistics with params:', {
            startDate,
            endDate
        });

        const result = await invoiceDB.getRevenueStatistics(startDate, endDate);

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
            message: 'Lấy thống kê doanh thu thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /revenue-report/statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê doanh thu',
            error: error.message
        });
    }
});

// ✅ GET TOP PERFORMING ITEMS
router.get('/top-items', async (req, res) => {
    try {
        const { 
            startDate,
            endDate,
            limit = 10,
            itemType = 'all' // all, Room, Service
        } = req.query;

        console.log('📊 Getting top performing items with params:', {
            startDate,
            endDate,
            limit,
            itemType
        });

        const result = await invoiceDB.getTopPerformingItems(startDate, endDate, limit, itemType);

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
            message: 'Lấy danh sách item hiệu suất cao thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /revenue-report/top-items:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy top performing items',
            error: error.message
        });
    }
});

// ✅ GET MONTHLY COMPARISON
router.get('/monthly-comparison', async (req, res) => {
    try {
        const { 
            year = new Date().getFullYear(),
            compareWith = year - 1
        } = req.query;

        console.log('📊 Getting monthly comparison with params:', {
            year,
            compareWith
        });

        const result = await invoiceDB.getMonthlyComparison(year, compareWith);

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
            message: 'Lấy so sánh theo tháng thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /revenue-report/monthly-comparison:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy so sánh theo tháng',
            error: error.message
        });
    }
});

// ✅ THÊM: Debug endpoint để kiểm tra dữ liệu âm
router.get('/debug-negative', async (req, res) => {
    try {
    console.log('🔍 Debugging negative revenue data...');
    
    const result = await invoiceDB.getNegativeRevenueData();

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
            message: 'Debug dữ liệu âm thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /revenue-report/debug-negative:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi debug dữ liệu âm',
            error: error.message
        });
    }
});

// ✅ THÊM: Raw data endpoint để kiểm tra dữ liệu thô
router.get('/raw-data', async (req, res) => {
    try {
        const { 
            startDate,
            endDate,
            itemType = 'all'
        } = req.query;

        console.log('📋 Getting raw revenue data with params:', {
            startDate,
            endDate,
            itemType
        });

        const result = await invoiceDB.getRawInvoiceData(50);

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
            message: 'Lấy dữ liệu thô thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /revenue-report/raw-data:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu thô',
            error: error.message
        });
    }
});

export default router;
