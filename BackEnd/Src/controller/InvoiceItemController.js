import express from 'express';
import InvoiceItemDBContext from '../dal/InvoiceItemDBContext.js';
import InvoiceItem from '../model/InvoiceItem.js';

const router = express.Router();
const invoiceItemDB = new InvoiceItemDBContext();

// ✅ GET ALL INVOICE ITEMS WITH PAGINATION
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            pageSize = 20, 
            invoiceId = null 
        } = req.query;

        console.log('📋 Getting invoice items with params:', {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            invoiceId: invoiceId ? parseInt(invoiceId) : null
        });

        const result = await invoiceItemDB.getAllInvoiceItems(
            parseInt(page),
            parseInt(pageSize),
            invoiceId ? parseInt(invoiceId) : null
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
            message: `Lấy ${result.data.length} mục hóa đơn thành công`
        });

    } catch (error) {
        console.error('❌ Error in GET /invoice-items:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách mục hóa đơn',
            error: error.message
        });
    }
});

// ✅ GET INVOICE ITEM BY ID
router.get('/:id', async (req, res) => {
    try {
        const invoiceItemId = parseInt(req.params.id);

        if (isNaN(invoiceItemId) || invoiceItemId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID mục hóa đơn không hợp lệ'
            });
        }

        console.log('🔍 Getting invoice item with ID:', invoiceItemId);

        const result = await invoiceItemDB.getInvoiceItemById(invoiceItemId);

        if (!result.success) {
            if (result.notFound) {
                return res.status(404).json({
                    success: false,
                    message: result.message
                });
            }
            return res.status(500).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data,
            message: 'Lấy thông tin mục hóa đơn thành công'
        });

    } catch (error) {
        console.error('❌ Error in GET /invoice-items/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin mục hóa đơn',
            error: error.message
        });
    }
});

// ✅ CREATE INVOICE ITEM
router.post('/', async (req, res) => {
    try {
        const { 
            invoiceID,
            itemType,
            itemID,
            itemName,
            quantity,
            unitPrice,
            description = ''
        } = req.body;

        console.log('💾 Creating invoice item:', {
            invoiceID,
            itemType,
            itemID,
            itemName,
            quantity,
            unitPrice
        });

        // Validation
        if (!invoiceID || invoiceID <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invoice ID không hợp lệ'
            });
        }

        if (!itemType || itemType.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Loại mục không được để trống'
            });
        }

        if (!itemName || itemName.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Tên mục không được để trống'
            });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn 0'
            });
        }

        if (unitPrice === undefined || unitPrice < 0) {
            return res.status(400).json({
                success: false,
                message: 'Đơn giá không hợp lệ'
            });
        }

        const invoiceItemData = {
            invoiceID: parseInt(invoiceID),
            itemType: itemType.trim(),
            itemID: itemID ? parseInt(itemID) : null,
            itemName: itemName.trim(),
            quantity: parseInt(quantity),
            unitPrice: parseFloat(unitPrice),
            subTotal: parseInt(quantity) * parseFloat(unitPrice),
            description: description.trim()
        };

        const result = await invoiceItemDB.createInvoiceItem(invoiceItemData);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

        res.status(201).json({
            success: true,
            data: {
                invoiceItemId: result.invoiceItemId
            },
            message: result.message
        });

    } catch (error) {
        console.error('❌ Error in POST /invoice-items:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo mục hóa đơn',
            error: error.message
        });
    }
});

export default router;