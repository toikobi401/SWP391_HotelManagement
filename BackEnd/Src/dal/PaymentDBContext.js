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

    // Check if invoice exists (using actual Invoice table structure)
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

    // Update Invoice PaymentStatus when payment completed
    async updateInvoicePaymentStatus(invoiceId, paymentStatus = true) {
        try {
            const pool = await this.pool;
            await pool.request()
                .input('invoiceId', mssql.Int, invoiceId)
                .input('paymentStatus', mssql.Bit, paymentStatus)
                .query(`
                    UPDATE [dbo].[Invoice] 
                    SET PaymentStatus = @paymentStatus
                    WHERE InvoiceID = @invoiceId
                `);
            
            console.log(`✅ Invoice ${invoiceId} payment status updated to ${paymentStatus}`);
            return true;
        } catch (error) {
            console.error('❌ Error updating invoice payment status:', error);
            throw error;
        }
    }

    // Insert new payment
    async insert(payment) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('invoiceId', mssql.Int, payment.getInvoiceId())
                .input('paymentMethod', mssql.NVarChar(20), payment.getPaymentMethod())
                .input('paymentStatus', mssql.NVarChar(20), payment.getPaymentStatus())
                .input('amount', mssql.Float, payment.getAmount())
                .input('transactionId', mssql.NVarChar(100), payment.getTransactionId())
                .input('bankCode', mssql.NVarChar(20), payment.getBankCode())
                .input('paymentGatewayResponse', mssql.NVarChar(mssql.MAX), payment.getPaymentGatewayResponse())
                .input('qrCodeUrl', mssql.NVarChar(500), payment.getQRCodeUrl())
                .input('paymentDate', mssql.DateTime, payment.getPaymentDate())
                .input('expiryDate', mssql.DateTime, payment.getExpiryDate())
                .input('retryCount', mssql.Int, payment.getRetryCount())
                .input('notes', mssql.NVarChar(500), payment.getNotes())
                .query(`
                    INSERT INTO [dbo].[Payment] (
                        [InvoiceID], [PaymentMethod], [PaymentStatus], [Amount], 
                        [TransactionID], [BankCode], [PaymentGatewayResponse], 
                        [QRCodeUrl], [PaymentDate], [ExpiryDate], [RetryCount], 
                        [Notes], [CreatedAt], [UpdatedAt]
                    )
                    OUTPUT INSERTED.PaymentID
                    VALUES (
                        @invoiceId, @paymentMethod, @paymentStatus, @amount,
                        @transactionId, @bankCode, @paymentGatewayResponse,
                        @qrCodeUrl, @paymentDate, @expiryDate, @retryCount,
                        @notes, GETDATE(), GETDATE()
                    )
                `);

            const paymentId = result.recordset[0].PaymentID;
            console.log('✅ Payment inserted successfully with ID:', paymentId);
            return paymentId;

        } catch (error) {
            console.error('❌ Error inserting payment:', error);
            throw error;
        }
    }

    // Get payment by ID
    async get(paymentId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT * FROM [dbo].[Payment] 
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

    // Update payment status
    async updatePaymentStatus(paymentId, status, transactionId = null) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .input('status', mssql.NVarChar(20), status)
                .input('transactionId', mssql.NVarChar(100), transactionId)
                .query(`
                    UPDATE [dbo].[Payment] 
                    SET PaymentStatus = @status,
                        TransactionID = @transactionId,
                        PaymentDate = CASE WHEN @status = 'completed' THEN GETDATE() ELSE PaymentDate END,
                        UpdatedAt = GETDATE()
                    WHERE PaymentID = @paymentId
                `);

            console.log('✅ Payment status updated successfully');
            return result.rowsAffected[0] > 0;

        } catch (error) {
            console.error('❌ Error updating payment status:', error);
            throw error;
        }
    }

    // Update QR URL
    async updatePaymentQRUrl(paymentId, qrUrl) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .input('qrUrl', mssql.NVarChar(500), qrUrl)
                .query(`
                    UPDATE [dbo].[Payment] 
                    SET QRCodeUrl = @qrUrl,
                        UpdatedAt = GETDATE()
                    WHERE PaymentID = @paymentId
                `);

            console.log('✅ QR URL updated successfully');
            return result.rowsAffected[0] > 0;

        } catch (error) {
            console.error('❌ Error updating QR URL:', error);
            throw error;
        }
    }

    // Get payments by invoice ID
    async getByInvoiceId(invoiceId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('invoiceId', mssql.Int, invoiceId)
                .query(`
                    SELECT * FROM [dbo].[Payment] 
                    WHERE InvoiceID = @invoiceId
                    ORDER BY CreatedAt DESC
                `);
            
            return result.recordset.map(row => Payment.fromDatabase(row));
        } catch (error) {
            console.error('❌ Error getting payments by invoice:', error);
            throw error;
        }
    }

    // Insert payment log
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

    // Get payment logs
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
}

export default PaymentDBContext;