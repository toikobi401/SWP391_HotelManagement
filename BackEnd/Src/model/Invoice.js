class Invoice {
    constructor(
        invoiceID = null,
        bookingID = null,
        createAt = null,
        totalAmount = 0.0,
        paymentStatus = 'Pending', // ✅ SỬA: Từ boolean sang string
        paidAmount = 0.0,
        remainingAmount = 0.0
    ) {
        this.InvoiceID = invoiceID;
        this.BookingID = bookingID;
        this.CreateAt = createAt || new Date();
        this.TotalAmount = parseFloat(totalAmount) || 0.0;
        this.PaymentStatus = paymentStatus || 'Pending'; // ✅ SỬA: Default 'Pending'
        this.PaidAmount = parseFloat(paidAmount) || 0.0;
        this.RemainingAmount = parseFloat(remainingAmount) || 0.0;
        
        // Additional properties for business logic
        this.invoiceItems = []; // Array of InvoiceItem objects
    }

    // ✅ THÊM: Payment Status Constants
    static get PAYMENT_STATUS() {
        return {
            PENDING: 'Pending',
            PARTIAL: 'Partial',
            PAID: 'Paid',
            REFUNDED: 'Refunded',
            CANCELLED: 'Cancelled',
            OVERDUE: 'Overdue'
        };
    }

    // ✅ CREATE FROM DATABASE RECORD
    static fromDatabase(record) {
        if (!record) return null;

        return new Invoice(
            record.InvoiceID,
            record.BookingID,
            record.CreateAt,
            record.TotalAmount,
            record.PaymentStatus, // ✅ SỬA: Giữ nguyên string
            record.PaidAmount,
            record.RemainingAmount
        );
    }

    // ✅ VALIDATION METHODS
    validate() {
        const errors = [];

        // Validate BookingID
        if (!this.BookingID || this.BookingID <= 0) {
            errors.push('BookingID is required and must be positive');
        }

        // Validate TotalAmount
        if (this.TotalAmount < 0) {
            errors.push('TotalAmount cannot be negative');
        }

        // Validate PaidAmount
        if (this.PaidAmount < 0) {
            errors.push('PaidAmount cannot be negative');
        }

        // Validate RemainingAmount
        if (this.RemainingAmount < 0) {
            errors.push('RemainingAmount cannot be negative');
        }

        // ✅ SỬA: Validate PaymentStatus as string
        const validStatuses = Object.values(Invoice.PAYMENT_STATUS);
        if (!validStatuses.includes(this.PaymentStatus)) {
            errors.push(`PaymentStatus must be one of: ${validStatuses.join(', ')}`);
        }

        // Business logic validations
        if (this.PaidAmount > this.TotalAmount) {
            errors.push('PaidAmount cannot exceed TotalAmount');
        }

        // Check if amounts are consistent
        const calculatedRemaining = this.TotalAmount - this.PaidAmount;
        if (Math.abs(this.RemainingAmount - calculatedRemaining) > 0.01) {
            errors.push('RemainingAmount must equal TotalAmount minus PaidAmount');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            validatedData: this
        };
    }

    // ✅ SỬA: Calculate remaining amount và update status
    calculateRemainingAmount() {
        this.RemainingAmount = this.TotalAmount - this.PaidAmount;
        
        // ✅ SỬA: Update payment status based on remaining amount
        if (this.RemainingAmount <= 0) {
            this.PaymentStatus = Invoice.PAYMENT_STATUS.PAID;
            this.RemainingAmount = 0; // Ensure no negative remaining
        } else if (this.PaidAmount > 0) {
            this.PaymentStatus = Invoice.PAYMENT_STATUS.PARTIAL;
        } else {
            this.PaymentStatus = Invoice.PAYMENT_STATUS.PENDING;
        }
        
        return this.RemainingAmount;
    }

    // ✅ SỬA: Get payment status methods
    isPending() {
        return this.PaymentStatus === Invoice.PAYMENT_STATUS.PENDING;
    }

    isPartiallyPaid() {
        return this.PaymentStatus === Invoice.PAYMENT_STATUS.PARTIAL;
    }

    isFullyPaid() {
        return this.PaymentStatus === Invoice.PAYMENT_STATUS.PAID;
    }

    isRefunded() {
        return this.PaymentStatus === Invoice.PAYMENT_STATUS.REFUNDED;
    }

    isCancelled() {
        return this.PaymentStatus === Invoice.PAYMENT_STATUS.CANCELLED;
    }

    isOverdue() {
        return this.PaymentStatus === Invoice.PAYMENT_STATUS.OVERDUE;
    }

    // ✅ SỬA: Get payment status string (Vietnamese)
    getPaymentStatusString() {
        const statusMap = {
            [Invoice.PAYMENT_STATUS.PENDING]: 'Chưa thanh toán',
            [Invoice.PAYMENT_STATUS.PARTIAL]: 'Thanh toán một phần',
            [Invoice.PAYMENT_STATUS.PAID]: 'Đã thanh toán',
            [Invoice.PAYMENT_STATUS.REFUNDED]: 'Đã hoàn tiền',
            [Invoice.PAYMENT_STATUS.CANCELLED]: 'Đã hủy',
            [Invoice.PAYMENT_STATUS.OVERDUE]: 'Quá hạn'
        };

        return statusMap[this.PaymentStatus] || this.PaymentStatus;
    }

    // ✅ GET PAYMENT PERCENTAGE
    getPaymentPercentage() {
        if (this.TotalAmount <= 0) return 0;
        return Math.round((this.PaidAmount / this.TotalAmount) * 100);
    }

    // ✅ SỬA: Set payment status method
    setPaymentStatus(status) {
        const validStatuses = Object.values(Invoice.PAYMENT_STATUS);
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid payment status: ${status}`);
        }
        this.PaymentStatus = status;
        return this;
    }

    // ✅ SỬA: Mark as specific status methods
    markAsPaid() {
        this.PaymentStatus = Invoice.PAYMENT_STATUS.PAID;
        this.PaidAmount = this.TotalAmount;
        this.RemainingAmount = 0;
        return this;
    }

    markAsPartial(paidAmount) {
        this.PaidAmount = parseFloat(paidAmount);
        this.RemainingAmount = this.TotalAmount - this.PaidAmount;
        this.PaymentStatus = Invoice.PAYMENT_STATUS.PARTIAL;
        return this;
    }

    markAsCancelled() {
        this.PaymentStatus = Invoice.PAYMENT_STATUS.CANCELLED;
        return this;
    }

    markAsRefunded() {
        this.PaymentStatus = Invoice.PAYMENT_STATUS.REFUNDED;
        return this;
    }

    // ✅ TO JSON FOR API RESPONSES
    toJSON() {
        return {
            InvoiceID: this.InvoiceID,
            BookingID: this.BookingID,
            CreateAt: this.CreateAt,
            TotalAmount: this.TotalAmount,
            PaymentStatus: this.PaymentStatus, // ✅ SỬA: String thay vì boolean
            PaymentStatusString: this.getPaymentStatusString(),
            PaidAmount: this.PaidAmount,
            RemainingAmount: this.RemainingAmount,
            PaymentPercentage: this.getPaymentPercentage(),
            InvoiceItems: this.invoiceItems.map(item => item.toJSON ? item.toJSON() : item),
            IsPending: this.isPending(),
            IsPartiallyPaid: this.isPartiallyPaid(),
            IsFullyPaid: this.isFullyPaid(),
            IsRefunded: this.isRefunded(),
            IsCancelled: this.isCancelled(),
            IsOverdue: this.isOverdue()
        };
    }

    // ✅ TO DATABASE FORMAT
    toDatabase() {
        return {
            InvoiceID: this.InvoiceID,
            BookingID: this.BookingID,
            CreateAt: this.CreateAt,
            TotalAmount: this.TotalAmount,
            PaymentStatus: this.PaymentStatus, // ✅ SỬA: String
            PaidAmount: this.PaidAmount,
            RemainingAmount: this.RemainingAmount
        };
    }

    // ✅ CLONE INVOICE
    clone() {
        const cloned = new Invoice(
            null, // New invoice, no ID
            this.BookingID,
            new Date(),
            this.TotalAmount,
            Invoice.PAYMENT_STATUS.PENDING, // ✅ SỬA: New invoice is pending
            0.0,
            this.TotalAmount
        );

        // Clone invoice items
        cloned.invoiceItems = this.invoiceItems.map(item => 
            item.clone ? item.clone() : Object.assign({}, item)
        );

        return cloned;
    }

    // ✅ TO STRING REPRESENTATION
    toString() {
        return `Invoice[ID=${this.InvoiceID}, BookingID=${this.BookingID}, Total=${this.TotalAmount}, Status=${this.PaymentStatus}]`;
    }
}

export default Invoice;