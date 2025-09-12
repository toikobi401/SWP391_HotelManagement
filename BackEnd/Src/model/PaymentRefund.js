class PaymentRefund {
    constructor(refundId, paymentId, refundAmount, refundReason, refundStatus, refundTransactionId, refundDate, processedBy, createdAt) {
        this.refundId = refundId;
        this.paymentId = paymentId;
        this.refundAmount = refundAmount;
        this.refundReason = refundReason;
        this.refundStatus = refundStatus; // 'pending', 'processing', 'completed', 'failed', 'cancelled'
        this.refundTransactionId = refundTransactionId;
        this.refundDate = refundDate;
        this.processedBy = processedBy;
        this.createdAt = createdAt;
        // ✅ SỬA: Xóa UpdatedAt vì không có trong database schema
    }

    // ✅ REFUND STATUS CONSTANTS
    static get REFUND_STATUS() {
        return {
            PENDING: 'pending',
            PROCESSING: 'processing',
            COMPLETED: 'completed',
            FAILED: 'failed',
            CANCELLED: 'cancelled'
        };
    }

    // ✅ REFUND REASONS
    static get REFUND_REASONS() {
        return {
            CUSTOMER_REQUEST: 'Yêu cầu của khách hàng',
            BOOKING_CANCELLED: 'Hủy booking',
            SYSTEM_ERROR: 'Lỗi hệ thống',
            DUPLICATE_PAYMENT: 'Thanh toán trùng lặp',
            OVERCHARGE: 'Tính phí thừa',
            SERVICE_NOT_PROVIDED: 'Dịch vụ không được cung cấp',
            OTHER: 'Lý do khác'
        };
    }

    // Getters and setters
    getRefundId() { return this.refundId; }
    getPaymentId() { return this.paymentId; }
    getRefundAmount() { return this.refundAmount; }
    getRefundReason() { return this.refundReason; }
    getRefundStatus() { return this.refundStatus; }
    getRefundTransactionId() { return this.refundTransactionId; }
    getRefundDate() { return this.refundDate; }
    getProcessedBy() { return this.processedBy; }
    getCreatedAt() { return this.createdAt; }

    // Status check methods
    isPending() { return this.refundStatus === PaymentRefund.REFUND_STATUS.PENDING; }
    isProcessing() { return this.refundStatus === PaymentRefund.REFUND_STATUS.PROCESSING; }
    isCompleted() { return this.refundStatus === PaymentRefund.REFUND_STATUS.COMPLETED; }
    isFailed() { return this.refundStatus === PaymentRefund.REFUND_STATUS.FAILED; }
    isCancelled() { return this.refundStatus === PaymentRefund.REFUND_STATUS.CANCELLED; }

    // ✅ VALIDATION
    validate() {
        const errors = [];

        if (!this.paymentId || this.paymentId <= 0) {
            errors.push('PaymentID is required and must be positive');
        }

        if (!this.refundAmount || this.refundAmount <= 0) {
            errors.push('Refund amount must be positive');
        }

        if (!this.refundReason || this.refundReason.trim() === '') {
            errors.push('Refund reason is required');
        }

        const validStatuses = Object.values(PaymentRefund.REFUND_STATUS);
        if (!validStatuses.includes(this.refundStatus)) {
            errors.push(`Refund status must be one of: ${validStatuses.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ✅ STATUS UPDATE METHODS
    markAsProcessing() {
        this.refundStatus = PaymentRefund.REFUND_STATUS.PROCESSING;
        return this;
    }

    markAsCompleted(transactionId) {
        this.refundStatus = PaymentRefund.REFUND_STATUS.COMPLETED;
        this.refundTransactionId = transactionId;
        this.refundDate = new Date();
        return this;
    }

    markAsFailed(reason = null) {
        this.refundStatus = PaymentRefund.REFUND_STATUS.FAILED;
        if (reason) {
            this.refundReason += ` (Failed: ${reason})`;
        }
        return this;
    }

    markAsCancelled() {
        this.refundStatus = PaymentRefund.REFUND_STATUS.CANCELLED;
        return this;
    }

    // ✅ GET STATUS DISPLAY NAME
    getRefundStatusDisplayName() {
        const statusMap = {
            [PaymentRefund.REFUND_STATUS.PENDING]: 'Chờ xử lý',
            [PaymentRefund.REFUND_STATUS.PROCESSING]: 'Đang xử lý',
            [PaymentRefund.REFUND_STATUS.COMPLETED]: 'Hoàn thành',
            [PaymentRefund.REFUND_STATUS.FAILED]: 'Thất bại',
            [PaymentRefund.REFUND_STATUS.CANCELLED]: 'Đã hủy'
        };
        return statusMap[this.refundStatus] || this.refundStatus;
    }

    // ✅ SỬA: toJSON theo đúng schema database
    toJSON() {
        return {
            refundId: this.refundId,
            paymentId: this.paymentId,
            refundAmount: this.refundAmount,
            refundReason: this.refundReason,
            refundStatus: this.refundStatus,
            refundStatusDisplayName: this.getRefundStatusDisplayName(),
            refundTransactionId: this.refundTransactionId,
            refundDate: this.refundDate,
            processedBy: this.processedBy,
            createdAt: this.createdAt,
            // Status booleans
            isPending: this.isPending(),
            isProcessing: this.isProcessing(),
            isCompleted: this.isCompleted(),
            isFailed: this.isFailed(),
            isCancelled: this.isCancelled(),
            // Formatted amount
            formattedRefundAmount: this.getFormattedRefundAmount()
        };
    }

    // ✅ SỬA: fromDatabase theo đúng schema database  
    static fromDatabase(row) {
        const refund = new PaymentRefund(
            row.RefundID,
            row.PaymentID,
            row.RefundAmount,
            row.RefundReason,
            row.RefundStatus,
            row.RefundTransactionID,
            row.RefundDate,
            row.ProcessedBy,
            row.CreatedAt
        );
        return refund;
    }

    // ✅ SỬA: toDatabaseObject theo đúng schema
    toDatabaseObject() {
        return {
            RefundID: this.refundId,
            PaymentID: this.paymentId,
            RefundAmount: this.refundAmount,
            RefundReason: this.refundReason,
            RefundStatus: this.refundStatus,
            RefundTransactionID: this.refundTransactionId,
            RefundDate: this.refundDate,
            ProcessedBy: this.processedBy,
            CreatedAt: this.createdAt
        };
    }

    // ✅ CREATE REFUND INSTANCE
    static createRefund(paymentId, refundAmount, refundReason, processedBy) {
        return new PaymentRefund(
            null,
            paymentId,
            refundAmount,
            refundReason,
            PaymentRefund.REFUND_STATUS.PENDING,
            null,
            null,
            processedBy,
            new Date()
        );
    }

    // ✅ FORMAT CURRENCY
    getFormattedRefundAmount() {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(this.refundAmount);
    }

    // ✅ CLONE REFUND
    clone() {
        return new PaymentRefund(
            null, // New refund, no ID
            this.paymentId,
            this.refundAmount,
            this.refundReason,
            PaymentRefund.REFUND_STATUS.PENDING,
            null,
            null,
            this.processedBy,
            new Date()
        );
    }

    // ✅ TO STRING
    toString() {
        return `PaymentRefund[ID=${this.refundId}, PaymentID=${this.paymentId}, Amount=${this.refundAmount}, Status=${this.refundStatus}]`;
    }
}

export default PaymentRefund;