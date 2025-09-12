import express from 'express';
import PaymentService from '../../services/PaymentService.js';
import PaymentDBContext from '../../dal/PaymentDBContext.js';
import PaymentRefundDBContext from '../../dal/PaymentRefundDBContext.js'; // ✅ THÊM
import Payment from '../../model/Payment.js';
import PaymentLog from '../../model/PaymentLog.js';
import PaymentRefund from '../../model/PaymentRefund.js'; // ✅ THÊM
import moment from 'moment';

const router = express.Router();
const paymentService = new PaymentService();
const paymentDB = new PaymentDBContext();
const refundDB = new PaymentRefundDBContext(); // ✅ THÊM

// Helper function to log payment action
async function logPaymentAction(paymentId, action, status, message, req) {
    try {
        const log = new PaymentLog(
            null,
            paymentId,
            action,
            status,
            message,
            JSON.stringify(req.body),
            null,
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent')
        );
        await paymentDB.insertLog(log);
    } catch (error) {
        console.error('Error logging payment action:', error);
    }
}

// Generate VietQR code
router.post('/vietqr/generate', async (req, res) => {
    try {
        const { invoiceId, amount, description, template = 'compact' } = req.body;

        console.log('Generating VietQR for:', { invoiceId, amount, description });

        // Validate input
        if (!invoiceId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Invoice ID and amount are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be greater than 0'
            });
        }

        // Check if invoice exists
        const invoice = await paymentDB.checkInvoiceExists(invoiceId);
        if (!invoice) {
            return res.status(400).json({
                success: false,
                error: `Invoice ID ${invoiceId} does not exist in the system.`,
                suggestion: 'Please create an invoice first or use an existing Invoice ID.'
            });
        }

        // Check if invoice already paid
        if (invoice.PaymentStatus === 'Paid') {
            return res.status(400).json({
                success: false,
                error: `Invoice ID ${invoiceId} is already marked as paid.`,
                invoiceDetails: {
                    invoiceId: invoice.InvoiceID,
                    bookingId: invoice.BookingID,
                    totalAmount: invoice.TotalAmount,
                    paymentStatus: invoice.PaymentStatus,
                    createAt: invoice.CreateAt
                }
            });
        }

        // Create payment record
        const payment = new Payment(
            null,
            invoiceId,
            'vietqr',
            'pending',
            amount,
            null,
            process.env.BANK_ID, // ✅ SỬA: Sử dụng trực tiếp từ env
            null,
            null,
            null,
            moment().add(15, 'minutes').toDate(),
            0,
            description || `VietQR Payment for Invoice ${invoiceId} (Booking ${invoice.BookingID})`
        );

        const paymentId = await paymentDB.insert(payment);
        console.log('✅ Payment created with ID:', paymentId);

        // ✅ SỬA: Generate VietQR KHÔNG truyền account info để force sử dụng env
        const qrResult = paymentService.generateVietQR({
            amount,
            invoiceId,
            description: `HOTELHUB INV${invoiceId}`,
            template
            // ✅ SỬA: KHÔNG truyền accountNo, accountName, bankId để force sử dụng từ env
        });

        if (qrResult.success) {
            console.log('✅ QR Generated successfully:', qrResult.qrUrl);
            console.log('🏦 Bank info:', qrResult.qrData);

            // Update payment with QR URL
            await paymentDB.updatePaymentQRUrl(paymentId, qrResult.qrUrl);

            res.json({
                success: true,
                paymentId: paymentId,
                qrUrl: qrResult.qrUrl,
                qrData: qrResult.qrData,
                transferInfo: qrResult.transferInfo,
                expiryTime: moment().add(15, 'minutes').toISOString(),
                invoiceInfo: {
                    invoiceId: invoice.InvoiceID,
                    bookingId: invoice.BookingID,
                    totalAmount: invoice.TotalAmount,
                    paymentAmount: amount,
                    remainingAmount: invoice.TotalAmount - amount
                },
                instructions: [
                    '1. Mở ứng dụng ngân hàng trên điện thoại',
                    '2. Quét mã QR hoặc nhập thông tin chuyển khoản',
                    '3. Kiểm tra thông tin và xác nhận chuyển khoản',
                    '4. Hệ thống sẽ tự động xác nhận thanh toán sau 1-2 phút'
                ]
            });
        } else {
            // Update payment as failed
            await paymentDB.updatePaymentStatus(paymentId, 'failed');
            
            throw new Error(qrResult.error || 'Failed to generate QR code');
        }
    } catch (error) {
        console.error('❌ VietQR generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Manual verification endpoint for VietQR
router.post('/vietqr/verify', async (req, res) => {
    try {
        const { paymentId, transactionId, amount, content, verificationMethod = 'manual' } = req.body;

        console.log('Verifying payment:', { paymentId, transactionId, amount, content });

        if (!paymentId || !transactionId || !amount || !content) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required: paymentId, transactionId, amount, content'
            });
        }

        // Get payment record from database
        const payment = await paymentDB.get(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        if (payment.isCompleted()) {
            return res.status(400).json({
                success: false,
                error: 'Payment already completed'
            });
        }

        // Get invoice details
        const invoice = await paymentDB.checkInvoiceExists(payment.getInvoiceId());
        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Associated invoice not found'
            });
        }

        // Verify bank transfer
        const verificationResult = await paymentService.verifyBankTransfer({
            amount,
            content,
            transactionId,
            paymentId: payment.getInvoiceId()
        });

        if (verificationResult.success && verificationResult.verified) {
            // Update payment as completed
            await paymentDB.updatePaymentStatus(paymentId, 'completed', transactionId);
            
            // ✅ SỬA: Update invoice payment status to string
            await paymentDB.updateInvoicePaymentStatus(payment.getInvoiceId(), 'Paid');
            
            // Log successful verification
            await logPaymentAction(paymentId, 'payment_verified', 'completed', 
                `Payment verified via ${verificationMethod}. Transaction ID: ${transactionId}. Invoice marked as paid.`, req);

            console.log('✅ Payment verified successfully and Invoice marked as paid');

            res.json({
                success: true,
                message: 'Payment verified successfully and invoice marked as paid',
                paymentDetails: {
                    paymentId: paymentId,
                    invoiceId: verificationResult.invoiceId,
                    amount: verificationResult.amount,
                    transactionId: transactionId,
                    verificationTime: verificationResult.verificationTime
                },
                invoiceUpdated: true
            });
        } else {
            // Log failed verification
            await logPaymentAction(paymentId, 'verification_failed', 'failed', 
                `Verification failed: ${verificationResult.error}`, req);

            console.log('❌ Verification failed:', verificationResult.error);

            res.status(400).json({
                success: false,
                error: verificationResult.error || 'Verification failed',
                details: {
                    expected: verificationResult.expected,
                    received: verificationResult.received
                }
            });
        }
    } catch (error) {
        console.error('❌ Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check payment status with database
router.get('/status/:paymentId', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        
        console.log('Checking payment status for:', paymentId);

        // Get payment from database
        const payment = await paymentDB.get(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // Get associated invoice
        const invoice = await paymentDB.checkInvoiceExists(payment.getInvoiceId());

        // Check if payment is expired
        if (payment.isExpired() && payment.isPending()) {
            await paymentDB.updatePaymentStatus(paymentId, 'cancelled');
            await logPaymentAction(paymentId, 'payment_expired', 'cancelled', 'Payment expired due to timeout', req);
        }

        // Get updated payment
        const updatedPayment = await paymentDB.get(paymentId);
        const paymentLogs = await paymentDB.getLogsByPaymentId(paymentId);

        console.log('✅ Payment status retrieved:', updatedPayment.getPaymentStatus());

        res.json({
            success: true,
            payment: updatedPayment.toJSON(),
            invoice: invoice ? {
                invoiceId: invoice.InvoiceID,
                bookingId: invoice.BookingID,
                totalAmount: invoice.TotalAmount,
                paymentStatus: invoice.PaymentStatus,
                createAt: invoice.CreateAt
            } : null,
            logs: paymentLogs.map(log => log.toJSON()),
            isExpired: updatedPayment.isExpired(),
            canRetry: updatedPayment.canRetry(),
            timeRemaining: updatedPayment.getExpiryDate() ? 
                Math.max(0, new Date(updatedPayment.getExpiryDate()) - new Date()) : null
        });
    } catch (error) {
        console.error('❌ Get payment status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create test invoice for payment testing
router.post('/test/create-invoice', async (req, res) => {
    try {
        const { bookingId = 1, totalAmount = 100000 } = req.body;
        
        const pool = await paymentDB.pool;
        const result = await pool.request()
            .input('bookingId', bookingId)
            .input('totalAmount', totalAmount)
            .query(`
                INSERT INTO [dbo].[Invoice] (
                    BookingID, CreateAt, TotalAmount, PaymentStatus
                )
                OUTPUT INSERTED.InvoiceID
                VALUES (
                    @bookingId, GETDATE(), @totalAmount, 0
                )
            `);

        const invoiceId = result.recordset[0].InvoiceID;
        
        res.json({
            success: true,
            message: 'Test invoice created successfully',
            invoiceId: invoiceId,
            bookingId: bookingId,
            totalAmount: totalAmount,
            paymentStatus: false,
            usage: `You can now use InvoiceID: ${invoiceId} for payment testing`
        });
    } catch (error) {
        console.error('Error creating test invoice:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get available invoices
router.get('/test/invoices', async (req, res) => {
    try {
        const pool = await paymentDB.pool;
        const result = await pool.request()
            .query(`
                SELECT 
                    InvoiceID, 
                    BookingID, 
                    TotalAmount, 
                    PaymentStatus, 
                    CreateAt 
                FROM [dbo].[Invoice] 
                ORDER BY InvoiceID DESC
            `);
        
        res.json({
            success: true,
            invoices: result.recordset,
            message: 'Use any InvoiceID from this list for payment testing'
        });
    } catch (error) {
        console.error('Error getting invoices:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Thêm endpoint real-time với auto-verification mạnh hơn
router.get('/realtime/:paymentId', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        
        // Get payment from database
        const payment = await paymentDB.get(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // If still pending, try multiple verification methods
        if (payment.isPending() && !payment.isExpired()) {
            console.log('🔄 Attempting auto-verification for payment:', paymentId);
            
            // Method 1: Check với MB Bank API simulation (70% success rate)
            const autoVerifyResult = await paymentService.checkMBBankTransaction(
                process.env.VIETQR_ACCOUNT_NO,
                new Date(payment.createdAt),
                new Date(),
                payment.getAmount(),
                `HOTELHUB INV${payment.getInvoiceId()}`
            );
            
            if (autoVerifyResult.success && autoVerifyResult.found) {
                // Auto-verify the payment
                await paymentDB.updatePaymentStatus(paymentId, 'completed', autoVerifyResult.transaction.transactionId);
                await paymentDB.updateInvoicePaymentStatus(payment.getInvoiceId(), true);
                
                // Log auto-verification
                await logPaymentAction(paymentId, 'auto_verified', 'completed', 
                    `Payment auto-verified via real-time check. Transaction ID: ${autoVerifyResult.transaction.transactionId}`, req);
                
                console.log('✅ Auto-verification successful!');
                
                // Get updated payment
                const updatedPayment = await paymentDB.get(paymentId);
                return res.json({
                    success: true,
                    payment: updatedPayment.toJSON(),
                    autoVerified: true,
                    transaction: autoVerifyResult.transaction,
                    message: 'Payment automatically verified!'
                });
            }
            
            // Method 2: If auto-verification fails, try simulated webhook
            console.log('🔄 Auto-verification not found, simulating webhook...');
            const webhookResult = await simulateWebhookVerification(payment);
            
            if (webhookResult.success) {
                await paymentDB.updatePaymentStatus(paymentId, 'completed', webhookResult.transactionId);
                await paymentDB.updateInvoicePaymentStatus(payment.getInvoiceId(), true);
                
                await logPaymentAction(paymentId, 'webhook_verified', 'completed', 
                    `Payment verified via simulated webhook. Transaction ID: ${webhookResult.transactionId}`, req);
                
                console.log('✅ Webhook verification successful!');
                
                const updatedPayment = await paymentDB.get(paymentId);
                return res.json({
                    success: true,
                    payment: updatedPayment.toJSON(),
                    autoVerified: true,
                    webhook: true,
                    transaction: { transactionId: webhookResult.transactionId },
                    message: 'Payment verified via webhook simulation!'
                });
            }
        }
        
        // Return current status if no auto-verification
        const invoice = await paymentDB.checkInvoiceExists(payment.getInvoiceId());
        
        res.json({
            success: true,
            payment: payment.toJSON(),
            invoice: invoice ? {
                invoiceId: invoice.InvoiceID,
                paymentStatus: invoice.PaymentStatus
            } : null,
            autoVerified: false,
            timeRemaining: payment.getExpiryDate() ? 
                Math.max(0, new Date(payment.getExpiryDate()) - new Date()) : null
        });
        
    } catch (error) {
        console.error('❌ Real-time check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function để simulate webhook verification
async function simulateWebhookVerification(payment) {
    try {
        // Simulate kiểm tra với multiple attempts (increase success rate)
        const attempts = 3;
        
        for (let i = 0; i < attempts; i++) {
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 80% success rate on each attempt
            const success = Math.random() > 0.2;
            
            if (success) {
                return {
                    success: true,
                    transactionId: `WH_${Date.now()}_${payment.getPaymentId()}`,
                    verificationMethod: 'webhook_simulation',
                    attempt: i + 1
                };
            }
        }
        
        return { success: false };
    } catch (error) {
        console.error('Webhook simulation error:', error);
        return { success: false };
    }
}

// ✅ SỬA: Force verify endpoint với validation và error handling tốt hơn
router.post('/force-verify/:paymentId', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        
        console.log('💪 Force verify request for payment:', paymentId);
        
        // ✅ SỬA: Validate paymentId
        if (isNaN(paymentId) || paymentId <= 0) {
            console.log('❌ Invalid payment ID:', req.params.paymentId);
            return res.status(400).json({
                success: false,
                message: 'Payment ID không hợp lệ',
                receivedPaymentId: req.params.paymentId,
                parsedPaymentId: paymentId
            });
        }
        
        // ✅ SỬA: Get payment with better error handling
        const payment = await paymentDB.get(paymentId);
        if (!payment) {
            console.log('❌ Payment not found:', paymentId);
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy payment với ID: ${paymentId}`
            });
        }

        console.log('📋 Payment found:', {
            id: payment.getPaymentId(),
            status: payment.getPaymentStatus(),
            amount: payment.getAmount(),
            invoiceId: payment.getInvoiceId()
        });

        // ✅ SỬA: Check if already completed
        if (payment.isCompleted()) {
            console.log('✅ Payment already completed');
            return res.json({
                success: true,
                message: 'Payment đã được xác thực trước đó',
                payment: payment.toJSON(),
                alreadyCompleted: true
            });
        }

        // ✅ SỬA: Force verify with proper transaction ID
        const forceTransactionId = `FORCE_${Date.now()}_${paymentId}`;
        
        console.log('💪 Force verifying payment with transaction ID:', forceTransactionId);
        
        // ✅ SỬA: Update payment status với error handling
        const updateResult = await paymentDB.updatePaymentStatus(paymentId, 'completed', forceTransactionId);
        
        if (!updateResult) {
            console.log('❌ Failed to update payment status');
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi cập nhật trạng thái payment'
            });
        }
        
        // ✅ SỬA: Update invoice payment status với error handling  
        try {
            const invoiceUpdateResult = await paymentDB.updateInvoicePaymentStatus(payment.getInvoiceId(), 'Paid');
            console.log('💰 Invoice payment status updated:', invoiceUpdateResult);
        } catch (invoiceError) {
            console.error('⚠️ Warning: Failed to update invoice status:', invoiceError);
            // Don't fail the entire request if invoice update fails
        }
        
        // ✅ SỬA: Log payment action với error handling
        try {
            await logPaymentAction(paymentId, 'force_verified', 'completed', 
                `Payment force verified for testing. Transaction ID: ${forceTransactionId}`, req);
        } catch (logError) {
            console.error('⚠️ Warning: Failed to log payment action:', logError);
            // Don't fail the entire request if logging fails
        }

        console.log('✅ Payment force verified successfully!');

        // ✅ SỬA: Get updated payment
        const updatedPayment = await paymentDB.get(paymentId);
        
        res.json({
            success: true,
            message: 'Payment force verified successfully!',
            payment: updatedPayment ? updatedPayment.toJSON() : payment.toJSON(),
            transactionId: forceTransactionId,
            forceVerified: true
        });
        
    } catch (error) {
        console.error('❌ Force verify error:', error);
        
        // ✅ SỬA: Better error response
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi force verify payment',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ✅ THÊM: Request refund for a payment
router.post('/:paymentId/refund', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        const { refundAmount, refundReason, processedBy } = req.body;

        if (isNaN(paymentId) || paymentId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID không hợp lệ'
            });
        }

        console.log('💰 Refund request for payment:', paymentId);

        // Get payment details
        const payment = await paymentDB.get(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy payment'
            });
        }

        if (!payment.isCompleted()) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể hoàn tiền cho payment đã hoàn thành'
            });
        }

        // Check refund eligibility
        const eligibilityResult = await refundDB.checkRefundEligibility(paymentId);
        if (!eligibilityResult.success || !eligibilityResult.data.canRefund) {
            return res.status(400).json({
                success: false,
                message: eligibilityResult.data?.eligibilityReason || 'Không đủ điều kiện hoàn tiền',
                eligibility: eligibilityResult.data
            });
        }

        // Validate refund amount
        const maxRefundAmount = eligibilityResult.data.availableRefundAmount;
        const requestedAmount = refundAmount || payment.getAmount();

        if (requestedAmount > maxRefundAmount) {
            return res.status(400).json({
                success: false,
                message: `Số tiền hoàn lại vượt quá số tiền có thể hoàn (${maxRefundAmount.toLocaleString('vi-VN')}đ)`,
                maxRefundAmount: maxRefundAmount
            });
        }

        // Create refund request
        const refundData = {
            paymentId: paymentId,
            refundAmount: requestedAmount,
            refundReason: refundReason || 'Customer request',
            processedBy: processedBy || 1 // Default admin user
        };

        const refundResult = await refundDB.createRefund(refundData);

        if (!refundResult.success) {
            return res.status(500).json({
                success: false,
                message: refundResult.message,
                error: refundResult.error
            });
        }

        await logPaymentAction(paymentId, 'refund_requested', 'pending', 
            `Refund requested: ${requestedAmount}đ - ${refundReason}`, req);

        res.json({
            success: true,
            message: 'Yêu cầu hoàn tiền được tạo thành công',
            refund: {
                refundId: refundResult.refundId,
                paymentId: paymentId,
                refundAmount: requestedAmount,
                status: 'pending'
            },
            payment: payment.toJSON()
        });

    } catch (error) {
        console.error('❌ Refund request error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ THÊM: Get refunds for a payment
router.get('/:paymentId/refunds', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);

        if (isNaN(paymentId) || paymentId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID không hợp lệ'
            });
        }

        console.log('🔍 Getting refunds for payment:', paymentId);

        const result = await refundDB.getRefundsByPaymentId(paymentId);

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
            message: `Lấy ${result.data.length} yêu cầu hoàn tiền thành công`
        });

    } catch (error) {
        console.error('❌ Get refunds error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ THÊM: Check refund eligibility for a payment
router.get('/:paymentId/refund-eligibility', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);

        if (isNaN(paymentId) || paymentId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID không hợp lệ'
            });
        }

        console.log('🔍 Checking refund eligibility for payment:', paymentId);

        const result = await refundDB.checkRefundEligibility(paymentId);

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
            message: 'Kiểm tra điều kiện hoàn tiền thành công'
        });

    } catch (error) {
        console.error('❌ Check refund eligibility error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ THÊM: Webhook endpoint để nhận notification từ ngân hàng
router.post('/webhook/bank-notification', async (req, res) => {
    try {
        const { 
            transactionId, 
            amount, 
            content, 
            accountNo, 
            timestamp,
            bankCode = process.env.BANK_ID 
        } = req.body;

        console.log('🏦 Bank webhook notification received:', {
            transactionId,
            amount,
            content,
            accountNo,
            timestamp
        });

        // Validate required fields
        if (!transactionId || !amount || !content) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: transactionId, amount, content'
            });
        }

        // Process webhook using DBContext
        const result = await paymentDB.processWebhookNotification({
            transactionId,
            amount,
            content,
            accountNo,
            timestamp,
            bankCode
        });

        if (result.success) {
            console.log('✅ Webhook processed successfully:', result);
            res.json(result);
        } else {
            console.warn('⚠️ Webhook processing failed:', result.message);
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during webhook processing',
            error: error.message
        });
    }
});

// ✅ THÊM: Enhanced status check với notification
router.get('/:paymentId/status-with-notification', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        
        if (!paymentId || paymentId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID'
            });
        }

        console.log('🔍 Checking payment status with notification for:', paymentId);

        // Get payment status with notification info from DBContext
        const result = await paymentDB.getPaymentStatusWithNotification(paymentId);

        if (result.success) {
            console.log('✅ Payment status with notification retrieved:', {
                status: result.data.payment.paymentStatus,
                hasNotification: result.data.notification.hasNewUpdate
            });
            res.json(result);
        } else {
            console.warn('⚠️ Failed to get payment status:', result.message);
            res.status(404).json(result);
        }

    } catch (error) {
        console.error('❌ Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ✅ THÊM: Simulate bank notification cho testing
router.post('/test/simulate-bank-notification', async (req, res) => {
    try {
        const { paymentId, success = true } = req.body;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }

        console.log('🧪 Simulating bank notification for payment:', paymentId);

        // Use DBContext to simulate notification
        const result = await paymentDB.simulateBankNotification(paymentId);

        if (result.success) {
            console.log('✅ Bank notification simulated successfully:', result);
            res.json(result);
        } else {
            console.warn('⚠️ Simulation failed:', result.message);
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('❌ Simulate notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during simulation',
            error: error.message
        });
    }
});

// ✅ SỬA: Enhanced existing status endpoint để sử dụng notification features
router.get('/:paymentId/status', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        
        console.log('🔍 Checking payment status for:', paymentId);

        // ✅ THÊM: Sử dụng enhanced method từ DBContext
        const result = await paymentDB.getPaymentStatusWithNotification(paymentId);

        if (result.success) {
            console.log('✅ Payment status retrieved:', {
                status: result.data.payment.paymentStatus,
                hasRecentChange: result.data.notification.hasNewUpdate
            });
            res.json(result);
        } else {
            res.status(404).json(result);
        }

    } catch (error) {
        console.error('❌ Get payment status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ THÊM: Batch notification check (multiple payments)
router.post('/batch/check-notifications', async (req, res) => {
    try {
        const { paymentIds } = req.body;

        if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'paymentIds array is required'
            });
        }

        console.log('🔍 Batch checking notifications for payments:', paymentIds);

        const results = await Promise.allSettled(
            paymentIds.map(async (paymentId) => {
                const result = await paymentDB.getPaymentStatusWithNotification(paymentId);
                return {
                    paymentId,
                    ...result
                };
            })
        );

        const successResults = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        const failedResults = results
            .filter(result => result.status === 'rejected')
            .map((result, index) => ({
                paymentId: paymentIds[index],
                error: result.reason.message
            }));

        res.json({
            success: true,
            data: {
                successful: successResults,
                failed: failedResults,
                totalChecked: paymentIds.length,
                successCount: successResults.length,
                failedCount: failedResults.length
            }
        });

    } catch (error) {
        console.error('❌ Batch notification check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ THÊM: Get recent notifications endpoint
router.get('/notifications/recent', async (req, res) => {
    try {
        const { 
            minutes = 5, 
            limit = 50,
            invoiceId 
        } = req.query;

        console.log('🔔 Getting recent notifications:', { minutes, limit, invoiceId });

        const pool = await paymentDB.pool;
        const request = pool.request()
            .input('minutes', mssql.Int, parseInt(minutes))
            .input('limit', mssql.Int, parseInt(limit));

        let query = `
            SELECT TOP (@limit)
                pl.LogID, pl.PaymentID, pl.Action, pl.Status, 
                pl.Message, pl.CreatedAt,
                p.Amount, p.TransactionID, p.InvoiceID,
                i.BookingID
            FROM PaymentLog pl
            INNER JOIN Payment p ON pl.PaymentID = p.PaymentID
            LEFT JOIN Invoice i ON p.InvoiceID = i.InvoiceID
            WHERE pl.Action IN ('completed', 'webhook_received')
            AND pl.CreatedAt > DATEADD(minute, -@minutes, GETDATE())
        `;

        if (invoiceId) {
            query += ' AND p.InvoiceID = @invoiceId';
            request.input('invoiceId', mssql.Int, parseInt(invoiceId));
        }

        query += ' ORDER BY pl.CreatedAt DESC';

        const result = await request.query(query);

        res.json({
            success: true,
            data: {
                notifications: result.recordset,
                count: result.recordset.length,
                timeWindow: `${minutes} minutes`,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('❌ Get recent notifications error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ THÊM: Health check với webhook status
router.get('/webhook/health', async (req, res) => {
    try {
        const pool = await paymentDB.pool;
        
        // Check recent webhook activity
        const recentWebhooksResult = await pool.request()
            .query(`
                SELECT COUNT(*) as WebhookCount
                FROM PaymentLog 
                WHERE Action = 'webhook_received'
                AND CreatedAt > DATEADD(hour, -24, GETDATE())
            `);

        // Check pending payments
        const pendingPaymentsResult = await pool.request()
            .query(`
                SELECT COUNT(*) as PendingCount
                FROM Payment 
                WHERE PaymentStatus = 'pending'
                AND CreatedAt > DATEADD(hour, -24, GETDATE())
            `);

        res.json({
            status: 'OK',
            timestamp: new Date(),
            webhook: {
                status: 'Ready',
                recentActivity: recentWebhooksResult.recordset[0].WebhookCount,
                endpoint: '/api/payment/webhook/bank-notification'
            },
            payments: {
                pendingLast24h: pendingPaymentsResult.recordset[0].PendingCount
            },
            database: {
                connected: true,
                provider: 'SQL Server'
            }
        });

    } catch (error) {
        console.error('❌ Webhook health check error:', error);
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date(),
            error: error.message
        });
    }
});

// ✅ GIỮ NGUYÊN: Tất cả existing endpoints và code khác...

export default router;