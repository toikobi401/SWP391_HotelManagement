import mssql from 'mssql';
import DBContext from './DBContext.js';
import PaymentRefund from '../model/PaymentRefund.js';

class PaymentRefundDBContext extends DBContext {
    constructor() {
        super();
        console.log('PaymentRefundDBContext initialized');
    }

    // ✅ SỬA: CHECK PAYMENT REFUND ELIGIBILITY - Đảm bảo return số đúng
    async checkRefundEligibility(paymentId) {
        try {
            const pool = await this.pool;

            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT 
                        p.PaymentID,
                        p.Amount as PaymentAmount,
                        p.PaymentStatus,
                        p.PaymentMethod,
                        p.InvoiceID,
                        ISNULL(SUM(CASE 
                            WHEN r.RefundStatus IN ('completed', 'pending', 'processing') 
                            THEN r.RefundAmount 
                            ELSE 0 
                        END), 0) as TotalRefunded,
                        COUNT(CASE 
                            WHEN r.RefundStatus IN ('completed', 'pending', 'processing') 
                            THEN r.RefundID 
                            ELSE NULL 
                        END) as RefundCount
                    FROM Payment p
                    LEFT JOIN PaymentRefund r ON p.PaymentID = r.PaymentID 
                    WHERE p.PaymentID = @paymentId
                    GROUP BY p.PaymentID, p.Amount, p.PaymentStatus, p.PaymentMethod, p.InvoiceID
                `);

            if (result.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Không tìm thấy payment để kiểm tra refund eligibility'
                };
            }

            const payment = result.recordset[0];
            
            // ✅ SỬA: Đảm bảo parse number chính xác và log để debug
            const totalAmount = parseFloat(payment.PaymentAmount) || 0;
            const totalRefunded = parseFloat(payment.TotalRefunded) || 0;
            const availableRefundAmount = Math.max(0, totalAmount - totalRefunded);
            
            console.log('💰 Payment amounts debug:', {
                raw: {
                    PaymentAmount: payment.PaymentAmount,
                    TotalRefunded: payment.TotalRefunded
                },
                parsed: {
                    totalAmount,
                    totalRefunded,
                    availableRefundAmount
                }
            });
            
            // ✅ SỬA: Logic kiểm tra refund eligibility chính xác
            const canRefund = payment.PaymentStatus === 'completed' && availableRefundAmount > 0;
            
            let eligibilityReason = '';
            if (payment.PaymentStatus !== 'completed') {
                eligibilityReason = 'Payment chưa completed';
            } else if (availableRefundAmount <= 0) {
                eligibilityReason = 'Đã refund hết số tiền';
            } else {
                eligibilityReason = 'Có thể refund';
            }

            const eligibilityData = {
                paymentId: payment.PaymentID,
                invoiceId: payment.InvoiceID,
                canRefund: canRefund,
                eligibilityReason: eligibilityReason,
                totalAmount: totalAmount, // ✅ SỬA: Đảm bảo là number
                totalRefunded: totalRefunded, // ✅ SỬA: Đảm bảo là number
                availableRefundAmount: availableRefundAmount, // ✅ SỬA: Đảm bảo là number
                refundCount: payment.RefundCount || 0,
                paymentStatus: payment.PaymentStatus,
                paymentMethod: payment.PaymentMethod
            };

            console.log('💰 Refund eligibility calculated:', eligibilityData);

            return {
                success: true,
                data: eligibilityData
            };

        } catch (error) {
            console.error('❌ Error checking refund eligibility:', error);
            return {
                success: false,
                message: 'Lỗi khi kiểm tra refund eligibility',
                error: error.message
            };
        }
    }

    // ✅ SỬA: GET REFUNDS BY PAYMENT ID - Load đúng amount và status
    async getRefundsByPaymentId(paymentId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('paymentId', mssql.Int, paymentId)
                .query(`
                    SELECT 
                        r.RefundID,
                        r.PaymentID,
                        r.RefundAmount,
                        r.RefundReason,
                        r.RefundStatus,
                        r.RefundTransactionID,
                        r.RefundDate,
                        r.ProcessedBy,
                        r.CreatedAt,
                        u.Fullname as ProcessedByName,
                        p.Amount as OriginalPaymentAmount,
                        p.PaymentStatus as PaymentStatus
                    FROM PaymentRefund r
                    LEFT JOIN [User] u ON r.ProcessedBy = u.UserID
                    LEFT JOIN Payment p ON r.PaymentID = p.PaymentID
                    WHERE r.PaymentID = @paymentId
                    ORDER BY r.CreatedAt DESC
                `);

            const refunds = result.recordset.map(row => {
                const refund = PaymentRefund.fromDatabase(row);
                
                // ✅ SỬA: Thêm thông tin bổ sung chính xác
                refund.processedByName = row.ProcessedByName;
                refund.originalPaymentAmount = parseFloat(row.OriginalPaymentAmount) || 0;
                refund.paymentStatus = row.PaymentStatus;
                refund.refundStatusDisplayName = refund.getRefundStatusDisplayName();
                
                console.log(`💰 Loaded refund ${refund.refundId}:`, {
                    amount: refund.refundAmount,
                    status: refund.refundStatus,
                    displayStatus: refund.refundStatusDisplayName
                });
                
                return refund;
            });

            return {
                success: true,
                data: refunds
            };

        } catch (error) {
            console.error('❌ Error getting refunds by payment ID:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy danh sách hoàn tiền theo payment',
                error: error.message
            };
        }
    }

    // ✅ SỬA: GET REFUND BY ID - Load đúng amount và status
    async getRefundById(refundId) {
        try {
            const pool = await this.pool;
            
            const result = await pool.request()
                .input('refundId', mssql.Int, refundId)
                .query(`
                    SELECT 
                        r.RefundID,
                        r.PaymentID,
                        r.RefundAmount,
                        r.RefundReason,
                        r.RefundStatus,
                        r.RefundTransactionID,
                        r.RefundDate,
                        r.ProcessedBy,
                        r.CreatedAt,
                        p.Amount as OriginalAmount,
                        p.PaymentMethod,
                        p.TransactionID as OriginalTransactionID,
                        p.InvoiceID,
                        u.Fullname as ProcessedByName
                    FROM PaymentRefund r
                    LEFT JOIN Payment p ON r.PaymentID = p.PaymentID
                    LEFT JOIN [User] u ON r.ProcessedBy = u.UserID
                    WHERE r.RefundID = @refundId
                `);

            if (result.recordset.length === 0) {
                return {
                    success: false,
                    notFound: true,
                    message: 'Không tìm thấy refund'
                };
            }

            const row = result.recordset[0];
            const refund = PaymentRefund.fromDatabase(row);
            
            // ✅ SỬA: Add additional info với amount chính xác
            refund.originalAmount = parseFloat(row.OriginalAmount) || 0;
            refund.paymentMethod = row.PaymentMethod;
            refund.originalTransactionId = row.OriginalTransactionID;
            refund.invoiceId = row.InvoiceID;
            refund.processedByName = row.ProcessedByName;
            refund.refundStatusDisplayName = refund.getRefundStatusDisplayName();

            console.log(`💰 Loaded refund details ${refundId}:`, {
                refundAmount: refund.refundAmount,
                refundStatus: refund.refundStatus,
                originalAmount: refund.originalAmount
            });

            return {
                success: true,
                data: refund
            };

        } catch (error) {
            console.error('❌ Error getting refund by ID:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy thông tin hoàn tiền',
                error: error.message
            };
        }
    }

    // ✅ SỬA: CREATE REFUND - Đảm bảo amount được lưu đúng
    async createRefund(refundData) {
        try {
            const pool = await this.pool;
            
            console.log('💰 Creating refund with data:', refundData);
            
            // ✅ SỬA: Validate và format refund data chính xác
            const refund = PaymentRefund.createRefund(
                refundData.paymentId,
                parseFloat(refundData.refundAmount), // ✅ Ensure float
                refundData.refundReason,
                refundData.processedBy
            );

            const validation = refund.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Dữ liệu refund không hợp lệ',
                    errors: validation.errors
                };
            }

            const result = await pool.request()
                .input('paymentId', mssql.Int, refund.getPaymentId())
                .input('refundAmount', mssql.Float, refund.getRefundAmount()) // ✅ Ensure Float type
                .input('refundReason', mssql.NVarChar(500), refund.getRefundReason())
                .input('refundStatus', mssql.NVarChar(20), refund.getRefundStatus())
                .input('processedBy', mssql.Int, refund.getProcessedBy())
                .query(`
                    INSERT INTO PaymentRefund (
                        PaymentID, RefundAmount, RefundReason, RefundStatus, 
                        ProcessedBy, CreatedAt
                    )
                    OUTPUT INSERTED.RefundID
                    VALUES (
                        @paymentId, @refundAmount, @refundReason, @refundStatus,
                        @processedBy, GETDATE()
                    )
                `);

            const refundId = result.recordset[0].RefundID;
            console.log('✅ Refund created with ID:', refundId, 'Amount:', refund.getRefundAmount());

            return {
                success: true,
                refundId: refundId,
                message: 'Tạo yêu cầu hoàn tiền thành công'
            };

        } catch (error) {
            console.error('❌ Error creating refund:', error);
            return {
                success: false,
                message: 'Lỗi khi tạo yêu cầu hoàn tiền',
                error: error.message
            };
        }
    }

    // ✅ Giữ nguyên các method khác...
    async getAllRefunds(page = 1, pageSize = 20, status = null) {
        try {
            const pool = await this.pool;
            const offset = (page - 1) * pageSize;

            let whereClause = '';
            if (status && status.trim() !== '') {
                whereClause = 'WHERE r.RefundStatus = @status';
            }

            // Count query
            const countQuery = `SELECT COUNT(*) as totalCount FROM PaymentRefund r ${whereClause}`;
            const countRequest = pool.request();
            if (status && status.trim() !== '') {
                countRequest.input('status', mssql.NVarChar(20), status.trim());
            }
            
            const countResult = await countRequest.query(countQuery);
            const totalCount = countResult.recordset[0].totalCount;

            // Data query
            const query = `
                SELECT 
                    r.RefundID,
                    r.PaymentID,
                    r.RefundAmount,
                    r.RefundReason,
                    r.RefundStatus,
                    r.RefundTransactionID,
                    r.RefundDate,
                    r.ProcessedBy,
                    r.CreatedAt,
                    p.Amount as OriginalAmount,
                    p.PaymentMethod,
                    p.TransactionID as OriginalTransactionID,
                    i.InvoiceID,
                    b.BookingID,
                    u.Fullname as ProcessedByName
                FROM PaymentRefund r
                LEFT JOIN Payment p ON r.PaymentID = p.PaymentID
                LEFT JOIN Invoice i ON p.InvoiceID = i.InvoiceID
                LEFT JOIN Booking b ON i.BookingID = b.BookingID
                LEFT JOIN [User] u ON r.ProcessedBy = u.UserID
                ${whereClause}
                ORDER BY r.CreatedAt DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            `;

            const dataRequest = pool.request();
            if (status && status.trim() !== '') {
                dataRequest.input('status', mssql.NVarChar(20), status.trim());
            }
            dataRequest.input('offset', mssql.Int, offset);
            dataRequest.input('pageSize', mssql.Int, pageSize);

            const result = await dataRequest.query(query);

            const refunds = result.recordset.map(row => {
                const refund = PaymentRefund.fromDatabase(row);
                
                // ✅ SỬA: Add additional info với amount chính xác
                refund.originalAmount = parseFloat(row.OriginalAmount) || 0;
                refund.paymentMethod = row.PaymentMethod;
                refund.originalTransactionId = row.OriginalTransactionID;
                refund.invoiceId = row.InvoiceID;
                refund.bookingId = row.BookingID;
                refund.processedByName = row.ProcessedByName;
                refund.refundStatusDisplayName = refund.getRefundStatusDisplayName();
                
                return refund;
            });

            const totalPages = Math.ceil(totalCount / pageSize);

            return {
                success: true,
                data: refunds,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            console.error('❌ Error getting all refunds:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy danh sách hoàn tiền',
                error: error.message
            };
        }
    }

    // ✅ UPDATE REFUND STATUS
    async updateRefundStatus(refundId, status, transactionId = null, note = null) {
        try {
            const pool = await this.pool;

            const validStatuses = Object.values(PaymentRefund.REFUND_STATUS);
            if (!validStatuses.includes(status)) {
                return {
                    success: false,
                    message: `Trạng thái refund không hợp lệ. Phải là một trong: ${validStatuses.join(', ')}`
                };
            }

            let updateFields = 'RefundStatus = @status';
            const request = pool.request()
                .input('refundId', mssql.Int, refundId)
                .input('status', mssql.NVarChar(20), status);

            if (status === PaymentRefund.REFUND_STATUS.COMPLETED) {
                updateFields += ', RefundDate = GETDATE()';
                if (transactionId) {
                    updateFields += ', RefundTransactionID = @transactionId';
                    request.input('transactionId', mssql.NVarChar(100), transactionId);
                }
            }

            if (note) {
                updateFields += ', RefundReason = CONCAT(RefundReason, @note)';
                request.input('note', mssql.NVarChar(500), ` - ${note}`);
            }

            const result = await request.query(`
                UPDATE PaymentRefund 
                SET ${updateFields}
                WHERE RefundID = @refundId
            `);

            if (result.rowsAffected[0] === 0) {
                return {
                    success: false,
                    message: 'Không tìm thấy refund để cập nhật'
                };
            }

            console.log(`✅ Refund ${refundId} status updated to: ${status}`);

            return {
                success: true,
                message: `Cập nhật trạng thái hoàn tiền thành công: ${status}`
            };

        } catch (error) {
            console.error('❌ Error updating refund status:', error);
            return {
                success: false,
                message: 'Lỗi khi cập nhật trạng thái hoàn tiền',
                error: error.message
            };
        }
    }

    // Abstract methods implementation
    async list() {
        return await this.getAllRefunds();
    }

    async get(id) {
        return await this.getRefundById(id);
    }

    async insert(refund) {
        return await this.createRefund(refund);
    }

    async update(refund) {
        return await this.updateRefundStatus(
            refund.refundId, 
            refund.refundStatus, 
            refund.refundTransactionId
        );
    }

    async delete(id) {
        // Soft delete by marking as cancelled
        return await this.updateRefundStatus(id, PaymentRefund.REFUND_STATUS.CANCELLED);
    }
}

export default PaymentRefundDBContext;