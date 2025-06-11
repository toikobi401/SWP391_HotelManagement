import express from 'express';
import PaymentService from '../../services/PaymentService.js';
import PaymentDBContext from '../../dal/PaymentDBContext.js';
import Payment from '../../model/Payment.js';
import PaymentLog from '../../model/PaymentLog.js';
import moment from 'moment';

const router = express.Router();
const paymentService = new PaymentService();
const paymentDB = new PaymentDBContext();

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

        // Check if invoice exists using actual Invoice table structure
        const invoice = await paymentDB.checkInvoiceExists(invoiceId);
        if (!invoice) {
            return res.status(400).json({
                success: false,
                error: `Invoice ID ${invoiceId} does not exist in the system.`,
                suggestion: 'Please create an invoice first or use an existing Invoice ID.'
            });
        }

        // Check if invoice already paid
        if (invoice.PaymentStatus === true || invoice.PaymentStatus === 1) {
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

        // Validate amount against invoice total
        if (amount > invoice.TotalAmount) {
            return res.status(400).json({
                success: false,
                error: `Payment amount (${amount}) cannot exceed invoice total (${invoice.TotalAmount}).`,
                invoiceDetails: {
                    invoiceId: invoice.InvoiceID,
                    totalAmount: invoice.TotalAmount,
                    requestedAmount: amount
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
            process.env.VIETQR_BANK_ID,
            null,
            null,
            null,
            moment().add(15, 'minutes').toDate(), // QR expires in 15 minutes
            0,
            description || `VietQR Payment for Invoice ${invoiceId} (Booking ${invoice.BookingID})`
        );

        // Insert payment to database
        const paymentId = await paymentDB.insert(payment);
        console.log('✅ Payment created with ID:', paymentId);

        // Generate VietQR
        const qrResult = paymentService.generateVietQR({
            amount,
            invoiceId,
            description: `HOTELHUB INV${invoiceId}`,
            template
        });

        if (qrResult.success) {
            // Update payment with QR URL
            await paymentDB.updatePaymentQRUrl(paymentId, qrResult.qrUrl);

            // Log the action
            await logPaymentAction(paymentId, 'qr_generated', 'pending', 
                `QR code generated for Invoice ${invoiceId}, Amount: ${amount}`, req);

            console.log('✅ QR generated successfully:', qrResult.qrUrl);

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
            await logPaymentAction(paymentId, 'qr_generation_failed', 'failed', qrResult.error, req);
            
            console.error('❌ QR generation failed:', qrResult.error);
            res.status(400).json({
                success: false,
                error: qrResult.error
            });
        }
    } catch (error) {
        console.error('❌ VietQR generation error:', error);
        
        if (error.message.includes('FOREIGN KEY constraint')) {
            res.status(400).json({
                success: false,
                error: 'Invoice ID does not exist in the system.',
                solution: 'Please create an invoice first or use an existing Invoice ID.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
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
            // Update payment status in database
            await paymentDB.updatePaymentStatus(paymentId, 'completed', transactionId);
            
            // Update Invoice PaymentStatus to true (paid)
            await paymentDB.updateInvoicePaymentStatus(payment.getInvoiceId(), true);
            
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

// Thêm endpoint để force verify payment (for testing)
router.post('/force-verify/:paymentId', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        
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

        // Force verify with simulated transaction
        const forceTransactionId = `FORCE_${Date.now()}_${paymentId}`;
        
        await paymentDB.updatePaymentStatus(paymentId, 'completed', forceTransactionId);
        await paymentDB.updateInvoicePaymentStatus(payment.getInvoiceId(), true);
        
        await logPaymentAction(paymentId, 'force_verified', 'completed', 
            `Payment force verified for testing. Transaction ID: ${forceTransactionId}`, req);

        console.log('✅ Payment force verified!');

        const updatedPayment = await paymentDB.get(paymentId);
        
        res.json({
            success: true,
            message: 'Payment force verified successfully!',
            payment: updatedPayment.toJSON(),
            transactionId: forceTransactionId
        });
        
    } catch (error) {
        console.error('❌ Force verify error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;