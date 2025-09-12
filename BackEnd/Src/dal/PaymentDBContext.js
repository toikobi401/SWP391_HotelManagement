// Tạo file: BackEnd/Src/dal/PaymentDBContext.js
import DBContext from './DBContext.js';
import Payment from '../model/Payment.js';
import PaymentLog from '../model/PaymentLog.js';
import mssql from 'mssql';

class PaymentDBContext extends DBContext {
    constructor() {
        super();
        console.log('PaymentDBContext initialized with real database connection');
    }

    // ✅ CẬP NHẬT: Insert method với schema đúng
    async insert(paymentData) {
        try {
            const pool = await this.pool;
            
            console.log('💰 Creating payment record:', paymentData);
            
            const query = `
                INSERT INTO Payment (
                    InvoiceID, PaymentMethod, PaymentStatus, Amount, 
                    TransactionID, BankCode, PaymentGatewayResponse, QRCodeUrl,
                    PaymentDate, ExpiryDate, RetryCount, Notes, CreatedAt, UpdatedAt
                )
                OUTPUT INSERTED.PaymentID
                VALUES (
                    @invoiceId, @paymentMethod, @paymentStatus, @amount,
                    @transactionId, @bankCode, @paymentGatewayResponse, @qrCodeUrl,
                    @paymentDate, @expiryDate, @retryCount, @notes, @createdAt, @updatedAt
                )
            `;
            
            const request = pool.request();
            request.input('invoiceId', mssql.Int, paymentData.invoiceId);
            request.input('paymentMethod', mssql.NVarChar(20), paymentData.paymentMethod || 'Cash');
            request.input('paymentStatus', mssql.NVarChar(20), paymentData.status || 'Completed');
            request.input('amount', mssql.Float, paymentData.amount);
            request.input('transactionId', mssql.NVarChar(100), paymentData.transactionId || null);
            request.input('bankCode', mssql.NVarChar(20), paymentData.bankCode || null);
            request.input('paymentGatewayResponse', mssql.NVarChar, paymentData.paymentGatewayResponse || null);
            request.input('qrCodeUrl', mssql.NVarChar(500), paymentData.qrCodeUrl || null);
            request.input('paymentDate', mssql.DateTime, paymentData.paymentDate || new Date());
            request.input('expiryDate', mssql.DateTime, paymentData.expiryDate || null);
            request.input('retryCount', mssql.Int, paymentData.retryCount || 0);
            request.input('notes', mssql.NVarChar(500), paymentData.notes || '');
            request.input('createdAt', mssql.DateTime, new Date());
            request.input('updatedAt', mssql.DateTime, new Date());
            
            const result = await request.query(query);
            
            if (result.recordset.length > 0) {
                const paymentId = result.recordset[0].PaymentID;
                
                console.log('✅ Payment record created successfully:', paymentId);
                
                return {
                    success: true,
                    paymentId: paymentId,
                    message: 'Tạo bản ghi thanh toán thành công'
                };
            } else {
                throw new Error('Không thể tạo bản ghi thanh toán');
            }
            
        } catch (error) {
            console.error('❌ Error creating payment record:', error);
            return {
                success: false,
                message: `Lỗi khi tạo bản ghi thanh toán: ${error.message}`,
                error: error.message
            };
        }
    }

    // ✅ CẬP NHẬT: Get payment by ID với schema đúng
    async get(paymentId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT * FROM Payment 
                    WHERE PaymentID = @paymentId
                `);
            
            if (result.recordset.length > 0) {
                return Payment.fromDatabase(result.recordset[0]);
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting payment:', error);
            throw error;
        }
    }

    // ✅ CẬP NHẬT: Update payment status với schema đúng
    async updatePaymentStatus(paymentId, status, transactionId = null) {
        try {
            console.log('🔄 Updating payment status:', {
                paymentId,
                status,
                transactionId
            });
            
            const pool = await this.pool;
            
            // ✅ VALIDATION
            if (!paymentId || paymentId <= 0) {
                throw new Error('PaymentID không hợp lệ');
            }
            
            const validStatus = String(status).trim();
            if (!validStatus) {
                throw new Error('Status không được để trống');
            }
            
            const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
            if (!validStatuses.includes(validStatus.toLowerCase())) {
                throw new Error(`Status không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(', ')}`);
            }

            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .input('status', mssql.NVarChar(20), validStatus)
                .input('transactionId', mssql.NVarChar(100), transactionId)
                .query(`
                    UPDATE Payment 
                    SET PaymentStatus = @status,
                        TransactionID = @transactionId,
                        PaymentDate = CASE WHEN @status = 'completed' THEN GETDATE() ELSE PaymentDate END,
                        UpdatedAt = GETDATE()
                    WHERE PaymentID = @paymentId
                `);

            console.log('✅ Payment status update result:', {
                rowsAffected: result.rowsAffected[0],
                paymentId,
                newStatus: validStatus
            });
            
            return result.rowsAffected[0] > 0;

        } catch (error) {
            console.error('❌ Error updating payment status:', error);
            throw new Error(`Failed to update payment status: ${error.message}`);
        }
    }

    // ✅ CẬP NHẬT: Get payments by invoice ID với schema đúng
    async getByInvoiceId(invoiceId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('invoiceId', mssql.Int, invoiceId)
                .query(`
                    SELECT * FROM Payment 
                    WHERE InvoiceID = @invoiceId
                    ORDER BY CreatedAt DESC
                `);
            
            return result.recordset.map(row => Payment.fromDatabase(row));
        } catch (error) {
            console.error('❌ Error getting payments by invoice:', error);
            throw error;
        }
    }

    // ✅ GIỮ NGUYÊN: Existing methods với schema đúng
    async updateInvoicePaymentStatus(invoiceId, paymentStatus = 'Paid') {
        try {
            console.log('💰 Updating invoice payment status:', {
                invoiceId,
                paymentStatus
            });
            
            const pool = await this.pool;
            
            // ✅ SỬA: Validate inputs
            if (!invoiceId || invoiceId <= 0) {
                throw new Error('Invalid invoice ID');
            }
            
            const validStatus = String(paymentStatus).trim();
            if (!validStatus) {
                throw new Error('Payment status cannot be empty');
            }
            
            const validStatuses = ['Pending', 'Partial', 'Paid', 'Refunded', 'Cancelled'];
            if (!validStatuses.includes(validStatus)) {
                throw new Error(`Invalid invoice payment status: ${validStatus}. Must be one of: ${validStatuses.join(', ')}`);
            }

            const result = await pool.request()
                .input('invoiceId', mssql.Int, invoiceId)
                .input('paymentStatus', mssql.NVarChar(20), validStatus)
                .query(`
                    UPDATE [dbo].[Invoice] 
                    SET PaymentStatus = @paymentStatus
                    WHERE InvoiceID = @invoiceId
                `);
            
            console.log('✅ Invoice payment status update result:', {
                rowsAffected: result.rowsAffected[0],
                invoiceId,
                newStatus: validStatus
            });
            
            return result.rowsAffected[0] > 0;
            
        } catch (error) {
            console.error('❌ Error updating invoice payment status:', error);
            throw new Error(`Failed to update invoice payment status: ${error.message}`);
        }
    }

    async checkInvoiceExists(invoiceId) {
        try {
            const pool = await this.pool;
            const result = await pool.request()
                .input('invoiceId', mssql.Int, invoiceId)
                .query(`
                    SELECT 
                        InvoiceID, 
                        BookingID, 
                        TotalAmount, 
                        PaymentStatus,
                        CreateAt
                    FROM [dbo].[Invoice] 
                    WHERE InvoiceID = @invoiceId
                `);
            
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            console.error('❌ Error checking invoice:', error);
            throw error;
        }
    }

    async updatePaymentQRUrl(paymentId, qrUrl) {
        try {
            // ✅ SỬA: Nếu paymentId là object, lấy paymentId property
            const id = typeof paymentId === 'object' && paymentId !== null && paymentId.paymentId
                ? paymentId.paymentId
                : paymentId;

            if (!id || isNaN(Number(id))) {
                throw new Error('Invalid paymentId for updatePaymentQRUrl');
            }

            const pool = await this.pool;
            const request = pool.request();
            request.input('paymentId', mssql.Int, Number(id));
            request.input('qrUrl', mssql.NVarChar(500), qrUrl);

            const result = await request.query(`
                UPDATE Payment SET QRCodeUrl = @qrUrl, UpdatedAt = GETDATE()
                WHERE PaymentID = @paymentId
            `);

            return result.rowsAffected[0] === 1;
        } catch (error) {
            console.error('❌ Error updating QR URL:', error);
            throw error;
        }
    }

    // ✅ GIỮ NGUYÊN: Các methods khác đã có sẵn
    async insertLog(paymentLog) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentLog.getPaymentId())
                .input('action', mssql.NVarChar(50), paymentLog.getAction())
                .input('status', mssql.NVarChar(20), paymentLog.getStatus())
                .input('message', mssql.NVarChar(500), paymentLog.getMessage())
                .input('requestData', mssql.NVarChar(mssql.MAX), paymentLog.getRequestData())
                .input('responseData', mssql.NVarChar(mssql.MAX), paymentLog.getResponseData())
                .input('ipAddress', mssql.NVarChar(50), paymentLog.getIPAddress())
                .input('userAgent', mssql.NVarChar(500), paymentLog.getUserAgent())
                .query(`
                    INSERT INTO [dbo].[PaymentLog] (
                        [PaymentID], [Action], [Status], [Message], 
                        [RequestData], [ResponseData], [IPAddress], 
                        [UserAgent], [CreatedAt]
                    )
                    OUTPUT INSERTED.LogID
                    VALUES (
                        @paymentId, @action, @status, @message,
                        @requestData, @responseData, @ipAddress,
                        @userAgent, GETDATE()
                    )
                `);

            const logId = result.recordset[0].LogID;
            console.log('✅ Payment log inserted with ID:', logId);
            return logId;

        } catch (error) {
            console.error('❌ Error inserting payment log:', error);
            throw error;
        }
    }

    async getLogsByPaymentId(paymentId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT * FROM [dbo].[PaymentLog] 
                    WHERE PaymentID = @paymentId
                    ORDER BY CreatedAt DESC
                `);
            
            return result.recordset.map(row => PaymentLog.fromDatabase(row));
        } catch (error) {
            console.error('❌ Error getting payment logs:', error);
            throw error;
        }
    }

    // Tách biệt phương thức xử lý webhook
    async processWebhookNotification({ transactionId, amount, content, accountNo, timestamp, bankCode }) {
        let transaction = null;
        
        try {
            const pool = await this.pool;
            transaction = new mssql.Transaction(pool);
            
            await transaction.begin();
            console.log('🏦 Processing webhook notification:', { transactionId, amount, content });

            // Parse content để lấy invoice/payment ID
            const contentPattern = /HOTELHUB\s+INV(\d+)/i;
            const match = content?.match(contentPattern);
            
            if (!match) {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Invalid content format - missing HOTELHUB INV pattern'
                };
            }

            const invoiceId = parseInt(match[1]);
            
            // Tìm payment pending cho invoice này
            const findPaymentRequest = new mssql.Request(transaction);
            const pendingPaymentResult = await findPaymentRequest
                .input('invoiceId', mssql.Int, invoiceId)
                .input('amount', mssql.Float, amount)
                .query(`
                    SELECT TOP 1 PaymentID, PaymentStatus, Amount
                    FROM Payment 
                    WHERE InvoiceID = @invoiceId 
                    AND PaymentStatus = 'pending'
                    AND ABS(Amount - @amount) < 1000
                    ORDER BY CreatedAt DESC
                `);

            if (pendingPaymentResult.recordset.length === 0) {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'No matching pending payment found'
                };
            }

            const pendingPayment = pendingPaymentResult.recordset[0];
            const paymentId = pendingPayment.PaymentID;

            // ✅ Cập nhật payment status
            const updatePaymentRequest = new mssql.Request(transaction);
            await updatePaymentRequest
                .input('paymentId', mssql.Int, paymentId)
                .input('status', mssql.NVarChar(20), 'completed')
                .input('transactionId', mssql.NVarChar(100), transactionId)
                .query(`
                    UPDATE Payment 
                    SET PaymentStatus = @status,
                        TransactionID = @transactionId,
                        PaymentDate = GETDATE(),
                        UpdatedAt = GETDATE()
                    WHERE PaymentID = @paymentId
                `);

            // ✅ Cập nhật invoice payment status
            const updateInvoiceRequest = new mssql.Request(transaction);
            await updateInvoiceRequest
                .input('invoiceId', mssql.Int, invoiceId)
                .input('paymentStatus', mssql.NVarChar(20), 'Partial')
                .query(`
                    UPDATE Invoice 
                    SET PaymentStatus = @paymentStatus
                    WHERE InvoiceID = @invoiceId
                `);

            // ✅ Log webhook action
            const logRequest = new mssql.Request(transaction);
            await logRequest
                .input('paymentId', mssql.Int, paymentId)
                .input('action', mssql.NVarChar(50), 'webhook_received')
                .input('status', mssql.NVarChar(20), 'completed')
                .input('message', mssql.NVarChar(500), `Bank notification: ${transactionId} - Amount: ${amount}`)
                .input('requestData', mssql.NVarChar(mssql.MAX), JSON.stringify({ transactionId, amount, content, accountNo, timestamp, bankCode }))
                .input('responseData', mssql.NVarChar(mssql.MAX), JSON.stringify({ success: true, paymentId }))
                .input('ipAddress', mssql.NVarChar(50), 'webhook')
                .input('userAgent', mssql.NVarChar(500), 'Bank-Webhook')
                .query(`
                    INSERT INTO PaymentLog (
                        PaymentID, Action, Status, Message, 
                        RequestData, ResponseData, IPAddress, 
                        UserAgent, CreatedAt
                    )
                    VALUES (
                        @paymentId, @action, @status, @message,
                        @requestData, @responseData, @ipAddress,
                        @userAgent, GETDATE()
                    )
                `);

            await transaction.commit();
            
            console.log('✅ Webhook processed successfully:', {
                paymentId,
                transactionId,
                amount
            });

            return {
                success: true,
                message: 'Payment verified successfully via webhook',
                paymentId: paymentId,
                transactionId: transactionId
            };

        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }
            console.error('❌ Webhook processing error:', error);
            return {
                success: false,
                message: 'Failed to process webhook',
                error: error.message
            };
        }
    }

    // ✅ THÊM: Get payment status with notification check
    async getPaymentStatusWithNotification(paymentId) {
        try {
            const pool = await this.pool;
            
            // Get payment basic info
            const paymentResult = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT 
                        p.PaymentID, p.InvoiceID, p.PaymentStatus, p.Amount,
                        p.TransactionID, p.PaymentMethod, p.PaymentDate,
                        p.ExpiryDate, p.CreatedAt, p.UpdatedAt,
                        i.InvoiceID, i.BookingID, i.TotalAmount, i.PaymentStatus as InvoicePaymentStatus
                    FROM Payment p
                    LEFT JOIN Invoice i ON p.InvoiceID = i.InvoiceID
                    WHERE p.PaymentID = @paymentId
                `);

            if (paymentResult.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Payment not found'
                };
            }

            const payment = Payment.fromDatabase(paymentResult.recordset[0]);
            const invoice = paymentResult.recordset[0];

            // ✅ Check for recent status changes (for notification)
            const recentStatusChangeResult = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT TOP 1 Action, CreatedAt, Message
                    FROM PaymentLog 
                    WHERE PaymentID = @paymentId 
                    AND Action IN ('completed', 'webhook_received')
                    AND CreatedAt > DATEADD(minute, -2, GETDATE())
                    ORDER BY CreatedAt DESC
                `);

            const hasRecentStatusChange = recentStatusChangeResult.recordset.length > 0;
            const recentChange = hasRecentStatusChange ? recentStatusChangeResult.recordset[0] : null;

            // Get payment logs
            const paymentLogs = await this.getLogsByPaymentId(paymentId);

            return {
                success: true,
                data: {
                    payment: payment.toJSON(),
                    invoice: invoice ? {
                        invoiceId: invoice.InvoiceID,
                        bookingId: invoice.BookingID,
                        totalAmount: invoice.TotalAmount,
                        paymentStatus: invoice.InvoicePaymentStatus,
                        createAt: invoice.CreateAt
                    } : null,
                    logs: paymentLogs.map(log => log.toJSON()),
                    // ✅ Notification info
                    notification: hasRecentStatusChange ? {
                        hasNewUpdate: true,
                        lastAction: recentChange.Action,
                        lastUpdateTime: recentChange.CreatedAt,
                        message: recentChange.Message
                    } : {
                        hasNewUpdate: false
                    },
                    // ✅ Status info
                    isExpired: payment.isExpired(),
                    canRetry: payment.canRetry(),
                    timeRemaining: payment.getExpiryDate() ? 
                        Math.max(0, new Date(payment.getExpiryDate()) - new Date()) : null
                }
            };

        } catch (error) {
            console.error('❌ Error getting payment status with notification:', error);
            return {
                success: false,
                message: 'Failed to get payment status',
                error: error.message
            };
        }
    }

    // ✅ THÊM: Simulate bank notification for testing
    async simulateBankNotification(paymentId) {
        try {
            const pool = await this.pool;
            
            // Get payment info
            const paymentResult = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT 
                        p.PaymentID, p.InvoiceID, p.Amount, p.PaymentStatus,
                        i.BookingID
                    FROM Payment p
                    LEFT JOIN Invoice i ON p.InvoiceID = i.InvoiceID
                    WHERE p.PaymentID = @paymentId
                `);

            if (paymentResult.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Payment not found'
                };
            }

            const payment = paymentResult.recordset[0];
            
            if (payment.PaymentStatus === 'completed') {
                return {
                    success: false,
                    message: 'Payment already completed'
                };
            }

            // Simulate bank notification data
            const simulatedNotification = {
                transactionId: `BANK_${Date.now()}`,
                amount: payment.Amount,
                content: `HOTELHUB INV${payment.InvoiceID} ${payment.BookingID}`,
                accountNo: process.env.ACCOUNT_NO || '0865124996',
                timestamp: new Date().toISOString(),
                bankCode: process.env.BANK_ID || '970422'
            };

            console.log('🧪 Simulating bank notification:', simulatedNotification);

            // Process the webhook
            const webhookResult = await this.processWebhookNotification(simulatedNotification);

            return {
                success: true,
                message: 'Bank notification simulated successfully',
                simulation: simulatedNotification,
                webhookResult: webhookResult
            };

        } catch (error) {
            console.error('❌ Error simulating bank notification:', error);
            return {
                success: false,
                message: 'Failed to simulate bank notification',
                error: error.message
            };
        }
    }
}

export default PaymentDBContext;