class Payment {
    constructor(paymentId, invoiceId, paymentMethod, paymentStatus, amount, transactionId, bankCode, paymentGatewayResponse, qrCodeUrl, paymentDate, expiryDate, retryCount, notes) {
        this.paymentId = paymentId;
        this.invoiceId = invoiceId;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus;
        this.amount = amount;
        this.transactionId = transactionId;
        this.bankCode = bankCode;
        this.paymentGatewayResponse = paymentGatewayResponse;
        this.qrCodeUrl = qrCodeUrl;
        this.paymentDate = paymentDate;
        this.expiryDate = expiryDate;
        this.retryCount = retryCount || 0;
        this.notes = notes;
        this.createdAt = null;
        this.updatedAt = null;
    }

    // Getter methods
    getPaymentId() { return this.paymentId; }
    getInvoiceId() { return this.invoiceId; }
    getPaymentMethod() { return this.paymentMethod; }
    getPaymentStatus() { return this.paymentStatus; }
    getAmount() { return this.amount; }
    getTransactionId() { return this.transactionId; }
    getBankCode() { return this.bankCode; }
    getPaymentGatewayResponse() { return this.paymentGatewayResponse; }
    getQRCodeUrl() { return this.qrCodeUrl; }
    getPaymentDate() { return this.paymentDate; }
    getExpiryDate() { return this.expiryDate; }
    getRetryCount() { return this.retryCount; }
    getNotes() { return this.notes; }

    // Setter methods
    setPaymentId(id) { this.paymentId = id; }
    setInvoiceId(id) { this.invoiceId = id; }
    setPaymentMethod(method) { this.paymentMethod = method; }
    setPaymentStatus(status) { this.paymentStatus = status; }
    setAmount(amount) { this.amount = amount; }
    setTransactionId(id) { this.transactionId = id; }
    setBankCode(code) { this.bankCode = code; }
    setPaymentGatewayResponse(response) { this.paymentGatewayResponse = response; }
    setQRCodeUrl(url) { this.qrCodeUrl = url; }
    setPaymentDate(date) { this.paymentDate = date; }
    setExpiryDate(date) { this.expiryDate = date; }
    setRetryCount(count) { this.retryCount = count; }
    setNotes(notes) { this.notes = notes; }

    // Business methods
    isPending() { return this.paymentStatus === 'pending'; }
    isProcessing() { return this.paymentStatus === 'processing'; }
    isCompleted() { return this.paymentStatus === 'completed'; }
    isFailed() { return this.paymentStatus === 'failed'; }
    isCancelled() { return this.paymentStatus === 'cancelled'; }
    isRefunded() { return this.paymentStatus === 'refunded'; }

    canRetry() {
        return (this.paymentStatus === 'failed' || this.paymentStatus === 'cancelled') 
               && this.retryCount < 3;
    }

    isExpired() {
        return this.expiryDate && new Date() > new Date(this.expiryDate);
    }

    markAsCompleted(transactionId, paymentDate = null) {
        this.paymentStatus = 'completed';
        this.transactionId = transactionId;
        this.paymentDate = paymentDate || new Date();
    }

    markAsFailed(reason = null) {
        this.paymentStatus = 'failed';
        if (reason) {
            this.notes = reason;
        }
    }

    incrementRetryCount() {
        this.retryCount = (this.retryCount || 0) + 1;
    }

    // Validation
    validate() {
        const errors = [];
        
        if (!this.invoiceId) {
            errors.push('Invoice ID is required');
        }
        
        if (!this.paymentMethod) {
            errors.push('Payment method is required');
        }
        
        if (!['vnpay', 'vietqr', 'cash', 'card'].includes(this.paymentMethod)) {
            errors.push('Invalid payment method');
        }
        
        if (!this.amount || this.amount <= 0) {
            errors.push('Amount must be greater than 0');
        }
        
        if (!['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'].includes(this.paymentStatus)) {
            errors.push('Invalid payment status');
        }
        
        return errors;
    }

    toJSON() {
        return {
            paymentId: this.paymentId,
            invoiceId: this.invoiceId,
            paymentMethod: this.paymentMethod,
            paymentStatus: this.paymentStatus,
            amount: this.amount,
            transactionId: this.transactionId,
            bankCode: this.bankCode,
            paymentGatewayResponse: this.paymentGatewayResponse,
            qrCodeUrl: this.qrCodeUrl,
            paymentDate: this.paymentDate,
            expiryDate: this.expiryDate,
            retryCount: this.retryCount,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromDatabase(row) {
        const payment = new Payment(
            row.PaymentID,
            row.InvoiceID,
            row.PaymentMethod,
            row.PaymentStatus,
            row.Amount,
            row.TransactionID,
            row.BankCode,
            row.PaymentGatewayResponse,
            row.QRCodeUrl,
            row.PaymentDate,
            row.ExpiryDate,
            row.RetryCount,
            row.Notes
        );
        payment.createdAt = row.CreatedAt;
        payment.updatedAt = row.UpdatedAt;
        return payment;
    }
}

export default Payment;