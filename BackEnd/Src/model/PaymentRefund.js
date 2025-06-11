class PaymentRefund {
    constructor(refundId, paymentId, refundAmount, refundReason, refundStatus, refundTransactionId, refundDate, processedBy) {
        this.refundId = refundId;
        this.paymentId = paymentId;
        this.refundAmount = refundAmount;
        this.refundReason = refundReason;
        this.refundStatus = refundStatus; // 'pending', 'completed', 'failed'
        this.refundTransactionId = refundTransactionId;
        this.refundDate = refundDate;
        this.processedBy = processedBy;
        this.createdAt = null;
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

    isPending() { return this.refundStatus === 'pending'; }
    isCompleted() { return this.refundStatus === 'completed'; }
    isFailed() { return this.refundStatus === 'failed'; }

    markAsCompleted(transactionId) {
        this.refundStatus = 'completed';
        this.refundTransactionId = transactionId;
        this.refundDate = new Date();
    }

    markAsFailed() {
        this.refundStatus = 'failed';
    }

    toJSON() {
        return {
            refundId: this.refundId,
            paymentId: this.paymentId,
            refundAmount: this.refundAmount,
            refundReason: this.refundReason,
            refundStatus: this.refundStatus,
            refundTransactionId: this.refundTransactionId,
            refundDate: this.refundDate,
            processedBy: this.processedBy,
            createdAt: this.createdAt
        };
    }

    static fromDatabase(row) {
        const refund = new PaymentRefund(
            row.RefundID,
            row.PaymentID,
            row.RefundAmount,
            row.RefundReason,
            row.RefundStatus,
            row.RefundTransactionID,
            row.RefundDate,
            row.ProcessedBy
        );
        refund.createdAt = row.CreatedAt;
        return refund;
    }
}

export default PaymentRefund;