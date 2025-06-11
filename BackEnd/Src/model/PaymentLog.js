class PaymentLog {
    constructor(logId, paymentId, action, status, message, requestData, responseData, ipAddress, userAgent) {
        this.logId = logId;
        this.paymentId = paymentId;
        this.action = action; // 'created', 'processing', 'completed', 'failed', 'refunded', 'webhook_received'
        this.status = status;
        this.message = message;
        this.requestData = requestData;
        this.responseData = responseData;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.createdAt = null;
    }

    // Getters and setters
    getLogId() { return this.logId; }
    getPaymentId() { return this.paymentId; }
    getAction() { return this.action; }
    getStatus() { return this.status; }
    getMessage() { return this.message; }
    getRequestData() { return this.requestData; }
    getResponseData() { return this.responseData; }
    getIPAddress() { return this.ipAddress; }
    getUserAgent() { return this.userAgent; }

    toJSON() {
        return {
            logId: this.logId,
            paymentId: this.paymentId,
            action: this.action,
            status: this.status,
            message: this.message,
            requestData: this.requestData,
            responseData: this.responseData,
            ipAddress: this.ipAddress,
            userAgent: this.userAgent,
            createdAt: this.createdAt
        };
    }

    static fromDatabase(row) {
        const log = new PaymentLog(
            row.LogID,
            row.PaymentID,
            row.Action,
            row.Status,
            row.Message,
            row.RequestData,
            row.ResponseData,
            row.IPAddress,
            row.UserAgent
        );
        log.createdAt = row.CreatedAt;
        return log;
    }
}

export default PaymentLog;