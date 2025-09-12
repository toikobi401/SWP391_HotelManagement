import express from 'express';
import mssql from 'mssql'; // ✅ Giữ import này cho các method khác nếu cần
import InvoiceDBContext from '../dal/InvoiceDBContext.js';
import Invoice from '../model/Invoice.js';
import BookingDBContext from '../dal/BookingDBContext.js';

const router = express.Router();
const invoiceDB = new InvoiceDBContext();
const bookingDB = new BookingDBContext();

// ✅ GET ALL INVOICES - Loại bỏ pagination parameters
router.get('/', async (req, res) => {
    try {
        const { 
            search = '', 
            status = null 
        } = req.query;

        console.log('📋 Getting all invoices with params:', {
            search,
            status
        });

        const result = await invoiceDB.getAllInvoices(
            search,
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
            totalCount: result.totalCount,
            message: `Lấy ${result.data.length} hóa đơn thành công`,
            availableStatuses: ['Pending', 'Partial', 'Paid', 'Refunded', 'Cancelled']
        });

    } catch (error) {
        console.error('❌ Error in GET /invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách hóa đơn',
            error: error.message
        });
    }
});

// ✅ KIỂM TRA: Endpoint GET invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    console.log('🔍 GET /invoices/:id called with ID:', invoiceId);

    if (isNaN(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID hóa đơn không hợp lệ'
      });
    }

    const result = await invoiceDB.getInvoiceWithItems(invoiceId);

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

    // ✅ FIX: Đảm bảo log hiển thị đúng data
    console.log('✅ Invoice found and returning data:', {
      invoiceId: result.data?.InvoiceID,           // ✅ SỬA: Lấy từ result.data
      bookingId: result.data?.BookingID,           // ✅ THÊM: BookingID
      status: result.data?.PaymentStatus,          // ✅ SỬA: Lấy từ result.data
      totalAmount: result.data?.TotalAmount,       // ✅ SỬA: Lấy từ result.data
      itemsCount: result.data?.invoiceItems?.length || 0
    });

    res.json({
      success: true,
      data: result.data,
      message: 'Lấy thông tin hóa đơn thành công'
    });

  } catch (error) {
    console.error('❌ Error in GET /invoices/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin hóa đơn',
      error: error.message
    });
  }
});

// ✅ CREATE INVOICE FOR BOOKING
router.post('/create-for-booking', async (req, res) => {
    try {
        const { bookingId } = req.body;

        console.log('💾 Creating invoice for booking:', bookingId);

        // Validation
        if (!bookingId || bookingId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID không hợp lệ'
            });
        }

        // ✅ THÊM: Kiểm tra xem đã có invoice cho booking này chưa
        const existingInvoices = await invoiceDB.getAllInvoices('', null);
        const existingInvoice = existingInvoices.data?.find(inv => inv.BookingID === bookingId);
        
        if (existingInvoice) {
            console.log('⚠️ Invoice already exists for booking:', bookingId, 'InvoiceID:', existingInvoice.InvoiceID);
            
            // Trả về invoice hiện tại thay vì tạo mới
            const fullInvoiceResult = await invoiceDB.getInvoiceWithItems(existingInvoice.InvoiceID);
            
            return res.status(200).json({
                success: true,
                data: fullInvoiceResult.success ? fullInvoiceResult.data : existingInvoice,
                message: 'Hóa đơn đã tồn tại cho booking này',
                isExisting: true
            });
        }

        // ✅ SỬA: Kiểm tra tồn tại của booking TRƯỚC KHI tạo invoice
        const bookingResult = await bookingDB.getBookingById(bookingId);
        if (!bookingResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Booking không tồn tại'
            });
        }

        console.log('📊 Booking data for invoice:', {
            bookingID: bookingResult.data?.bookingID,  // ✅ FIX: Lấy từ data
            hasBookingData: !!bookingResult.data,
            bookingStatus: bookingResult.data?.bookingStatus
        });

        const result = await invoiceDB.createInvoiceForBooking(bookingId);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

        // ✅ FIX: Lấy invoice đầy đủ sau khi tạo
        const invoiceResult = await invoiceDB.getInvoiceWithItems(result.invoiceId);
        
        if (invoiceResult.success) {
            console.log(`✅ Invoice created and retrieved: ${result.invoiceId}`);
            res.status(201).json({
                success: true,
                data: invoiceResult.data,  // ✅ Trả về full invoice data
                message: 'Tạo hóa đơn thành công',
                isExisting: false
            });
        } else {
            // ✅ Fallback nếu không lấy được full data
            res.status(201).json({
                success: true,
                data: {
                    invoiceId: result.invoiceId,
                    totalAmount: result.totalAmount,
                    itemsCreated: result.itemsCreated
                },
                message: result.message,
                isExisting: false
            });
        }

    } catch (error) {
        console.error('❌ Error in POST /invoices/create-for-booking:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo hóa đơn cho booking',
            error: error.message
        });
    }
});

// ✅ DEBUG: Check booking data cho missing services/promotions
router.get('/debug/booking/:bookingId', async (req, res) => {
    try {
        const bookingId = parseInt(req.params.bookingId);
        
        if (isNaN(bookingId) || bookingId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }
        
        const result = await invoiceDB.debugBookingData(bookingId);
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                message: 'Booking debug data retrieved'
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Error in debug booking endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error debugging booking data: ' + error.message
        });
    }
});

// ✅ THÊM: CREATE INVOICE WITH PRICING DATA FROM FRONTEND
router.post('/create-with-pricing', async (req, res) => {
    try {
        const { bookingId, pricingData } = req.body;

        console.log('💰 Creating invoice with pricing data:', { bookingId, pricingData });

        // Validation
        if (!bookingId || bookingId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Booking ID không hợp lệ'
            });
        }

        if (!pricingData || !pricingData.finalTotal) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu pricing không hợp lệ'
            });
        }

        // ✅ Kiểm tra xem đã có invoice cho booking này chưa
        const existingInvoices = await invoiceDB.getAllInvoices('', null);
        const existingInvoice = existingInvoices.data?.find(inv => inv.BookingID === bookingId);
        
        if (existingInvoice) {
            console.log('⚠️ Invoice already exists for booking:', bookingId);
            const fullInvoiceResult = await invoiceDB.getInvoiceWithItems(existingInvoice.InvoiceID);
            
            return res.status(200).json({
                success: true,
                data: fullInvoiceResult.success ? fullInvoiceResult.data : existingInvoice,
                message: 'Hóa đơn đã tồn tại cho booking này',
                isExisting: true
            });
        }

        // ✅ Tạo invoice với pricing data từ frontend
        const result = await invoiceDB.createInvoiceWithPricingData(bookingId, pricingData);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

        // ✅ Lấy invoice đầy đủ sau khi tạo
        const invoiceResult = await invoiceDB.getInvoiceWithItems(result.invoiceId);
        
        if (invoiceResult.success) {
            console.log(`✅ Invoice created with pricing data: ${result.invoiceId}`);
            res.status(201).json({
                success: true,
                data: invoiceResult.data,
                message: 'Tạo hóa đơn với pricing data thành công',
                isExisting: false
            });
        } else {
            res.status(201).json({
                success: true,
                data: {
                    invoiceId: result.invoiceId,
                    totalAmount: result.totalAmount,
                    itemsCreated: result.itemsCreated
                },
                message: result.message,
                isExisting: false
            });
        }

    } catch (error) {
        console.error('❌ Error in POST /invoices/create-with-pricing:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo hóa đơn với pricing data',
            error: error.message
        });
    }
});

// ✅ UPDATE PAYMENT STATUS
router.patch('/:id/payment-status', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        const { paidAmount } = req.body;

        if (isNaN(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID hóa đơn không hợp lệ'
            });
        }

        if (paidAmount === undefined || paidAmount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền thanh toán không hợp lệ'
            });
        }

        console.log('🔄 Updating payment status for invoice:', invoiceId, 'with amount:', paidAmount);

        const result = await invoiceDB.updatePaymentStatus(invoiceId, parseFloat(paidAmount));

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }

        res.json({
            success: true,
            message: result.message,
            paymentStatus: result.paymentStatus
        });

    } catch (error) {
        console.error('❌ Error in PATCH /invoices/:id/payment-status:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái thanh toán',
            error: error.message
        });
    }
});

// ✅ GIỮ NGUYÊN: Existing imports và initialization

// ✅ CẬP NHẬT: POST /invoices/:id/deposit-payment - sử dụng PaymentDBContext thông qua InvoiceDBContext
router.post('/:id/deposit-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { depositAmount, paymentMethod = 'Cash', notes = '' } = req.body;

        console.log('💰 Processing deposit payment:', {
            invoiceId: id,
            depositAmount,
            paymentMethod
        });

        // Validation
        const invoiceId = parseInt(id);
        if (isNaN(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID hóa đơn không hợp lệ'
            });
        }

        if (!depositAmount || depositAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền cọc phải lớn hơn 0'
            });
        }

        // ✅ Process deposit payment
        const depositResult = await invoiceDB.processDepositPayment(invoiceId, depositAmount, paymentMethod);

        if (!depositResult.success) {
            return res.status(400).json({
                success: false,
                message: depositResult.message || 'Lỗi khi xử lý thanh toán cọc'
            });
        }

        // ✅ THÊM: Tạo payment record thông qua PaymentDBContext
        let paymentRecordId = null;
        try {
            const paymentData = {
                invoiceId: invoiceId,
                amount: depositAmount,
                paymentMethod: paymentMethod,
                status: 'Completed',
                notes: notes || `Thanh toán cọc ${depositAmount} bằng ${paymentMethod}`,
                paymentDate: new Date(),
                retryCount: 0
            };

            // ✅ Gọi thông qua InvoiceDBContext (đã delegate đến PaymentDBContext)
            const paymentRecord = await invoiceDB.createPaymentRecord(paymentData);
            
            if (paymentRecord.success) {
                paymentRecordId = paymentRecord.paymentId;
                console.log('✅ Payment record created:', paymentRecordId);
            } else {
                console.warn('⚠️ Failed to create payment record:', paymentRecord.message);
            }
        } catch (paymentError) {
            console.error('❌ Error creating payment record:', paymentError);
            // Continue without failing the whole operation
        }

        res.json({
            success: true,
            data: {
                invoiceId: depositResult.invoiceId,
                depositAmount: depositResult.depositAmount,
                paidAmount: depositResult.newPaidAmount,
                remainingAmount: depositResult.newRemainingAmount,
                paymentStatus: depositResult.newPaymentStatus,
                paymentRecordId: paymentRecordId
            },
            message: depositResult.message
        });

    } catch (error) {
        console.error('❌ Error in POST /invoices/:id/deposit-payment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý thanh toán cọc',
            error: error.message
        });
    }
});

// ✅ CẬP NHẬT: GET /invoices/:id/payment-history - sử dụng PaymentDBContext thông qua InvoiceDBContext
router.get('/:id/payment-history', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        
        if (isNaN(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID hóa đơn không hợp lệ'
            });
        }

        console.log('📋 Getting payment history for invoice:', invoiceId);

        // ✅ Gọi thông qua InvoiceDBContext (đã delegate đến PaymentDBContext)
        const result = await invoiceDB.getPaymentHistory(invoiceId);
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                message: 'Lấy lịch sử thanh toán thành công'
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('❌ Error in GET /invoices/:id/payment-history:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch sử thanh toán',
            error: error.message
        });
    }
});

// ✅ CẬP NHẬT: GET /invoices/:id/payment-statistics - sử dụng PaymentDBContext thông qua InvoiceDBContext  
router.get('/:id/payment-statistics', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        
        if (isNaN(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID hóa đơn không hợp lệ'
            });
        }

        console.log('📊 Getting payment statistics for invoice:', invoiceId);

        // ✅ Gọi thông qua InvoiceDBContext (đã delegate đến PaymentDBContext)
        const result = await invoiceDB.getPaymentStatistics(invoiceId);
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                message: 'Lấy thống kê thanh toán thành công'
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('❌ Error in GET /invoices/:id/payment-statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê thanh toán',
            error: error.message
        });
    }
});

// ✅ THÊM: Export invoice as PDF
router.get('/:id/pdf', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);

        if (isNaN(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID hóa đơn không hợp lệ'
            });
        }

        console.log('📄 Exporting invoice PDF:', invoiceId);

        const result = await invoiceDB.getInvoiceWithItems(invoiceId);

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

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=HoaDon_${invoiceId}_${new Date().toISOString().split('T')[0]}.pdf`);

        // For now, return the invoice data - PDF generation can be handled on frontend
        res.json({
            success: true,
            data: result.data,
            message: 'Dữ liệu hóa đơn để xuất PDF'
        });

    } catch (error) {
        console.error('❌ Error exporting invoice PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xuất PDF hóa đơn',
            error: error.message
        });
    }
});

// ✅ THÊM: Print invoice endpoint
router.get('/:id/print', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);

        if (isNaN(invoiceId) || invoiceId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID hóa đơn không hợp lệ'
            });
        }

        console.log('🖨️ Preparing invoice for print:', invoiceId);

        const result = await invoiceDB.getInvoiceWithItems(invoiceId);

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
            message: 'Dữ liệu hóa đơn để in'
        });

    } catch (error) {
        console.error('❌ Error preparing invoice for print:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi chuẩn bị in hóa đơn',
            error: error.message
        });
    }
});

// ✅ THÊM: CREATE INVOICE FROM BOOKING DATA (không qua database booking)
router.post('/create-from-booking-data', async (req, res) => {
    try {
        const { bookingData } = req.body;

        console.log('💾 Creating invoice from booking data:', {
            bookingID: bookingData?.bookingID,
            hasRoomTypes: !!bookingData?.selectedRooms,
            hasServices: !!bookingData?.selectedServices,
            hasPromotions: !!bookingData?.selectedPromotions
        });

        // ✅ Validation
        if (!bookingData || !bookingData.bookingID) {
            return res.status(400).json({
                success: false,
                message: 'Booking data không hợp lệ'
            });
        }

        const result = await invoiceDB.createInvoiceFromBookingData(bookingData);

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
                invoiceId: result.invoiceId,
                totalAmount: result.totalAmount,
                itemsCreated: result.itemsCreated
            },
            message: result.message
        });

    } catch (error) {
        console.error('❌ Error in POST /invoices/create-from-booking-data:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo hóa đơn từ booking data',
            error: error.message
        });
    }
});

export default router;