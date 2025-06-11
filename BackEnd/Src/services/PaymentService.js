import crypto from 'crypto';
import querystring from 'querystring';
import moment from 'moment';
import axios from 'axios';

class PaymentService {
    constructor() {
        // VietQR configuration
        this.vietQRConfig = {
            bankId: process.env.VIETQR_BANK_ID || '970422', // MB Bank
            accountNo: process.env.VIETQR_ACCOUNT_NO || '0123456789',
            accountName: process.env.VIETQR_ACCOUNT_NAME || 'HOTEL HUB',
            apiUrl: 'https://img.vietqr.io/image'
        };

        console.log('PaymentService initialized with config:', {
            bankId: this.vietQRConfig.bankId,
            accountNo: this.vietQRConfig.accountNo,
            accountName: this.vietQRConfig.accountName
        });
    }

    // Generate VietQR
    generateVietQR(paymentData) {
        try {
            const { amount, invoiceId, description, template = 'compact' } = paymentData;
            
            console.log('Generating VietQR with data:', { amount, invoiceId, description, template });
            
            // Tạo nội dung chuyển khoản chuẩn
            const transferContent = `HOTELHUB INV${invoiceId} ${description || ''}`.substring(0, 25);
            
            // Tạo URL QR code với các tham số đầy đủ
            const qrParams = new URLSearchParams({
                amount: amount,
                addInfo: transferContent,
                accountName: this.vietQRConfig.accountName
            });

            const qrUrl = `${this.vietQRConfig.apiUrl}/${this.vietQRConfig.bankId}-${this.vietQRConfig.accountNo}-${template}.jpg?${qrParams.toString()}`;

            console.log('Generated QR URL:', qrUrl);

            // Tạo thêm QR data để hiển thị thông tin
            const qrData = {
                bankId: this.vietQRConfig.bankId,
                bankName: this.getBankName(this.vietQRConfig.bankId),
                accountNo: this.vietQRConfig.accountNo,
                accountName: this.vietQRConfig.accountName,
                amount: amount,
                description: transferContent,
                template: template,
                invoiceId: invoiceId,
                expectedContent: transferContent
            };

            return {
                success: true,
                qrUrl,
                qrData,
                transferInfo: {
                    bankName: qrData.bankName,
                    accountNo: this.vietQRConfig.accountNo,
                    accountName: this.vietQRConfig.accountName,
                    amount: amount.toLocaleString('vi-VN') + ' VND',
                    content: transferContent,
                    note: 'Vui lòng chuyển khoản đúng nội dung để được xử lý tự động'
                }
            };
        } catch (error) {
            console.error('VietQR generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get bank name from bank ID
    getBankName(bankId) {
        const bankNames = {
            '970422': 'MB Bank (Ngân hàng Quân đội)',
            '970415': 'VietinBank',
            '970436': 'Vietcombank', 
            '970418': 'BIDV',
            '970405': 'Agribank',
            '970407': 'Techcombank',
            '970432': 'VPBank',
            '970423': 'TPBank',
            '970403': 'Sacombank',
            '970437': 'HDBank'
        };
        return bankNames[bankId] || 'Ngân hàng';
    }

    // Verify bank transfer
    async verifyBankTransfer(transferData) {
        try {
            const { amount, content, transactionId, paymentId } = transferData;
            
            console.log('Verifying bank transfer:', { amount, content, transactionId, paymentId });
            
            // Phương thức 1: Kiểm tra format nội dung chuyển khoản
            const contentVerification = this.verifyTransferContent(content, paymentId);
            
            if (!contentVerification.isValid) {
                return {
                    success: false,
                    error: 'Invalid transfer content format',
                    expected: contentVerification.expected,
                    received: content
                };
            }

            // Phương thức 2: Giả lập kiểm tra với ngân hàng
            const bankVerification = await this.checkWithBankAPI(transferData);

            return {
                success: true,
                verified: true,
                invoiceId: contentVerification.invoiceId,
                amount: amount,
                transactionId: transactionId,
                verificationTime: new Date(),
                verificationMethod: 'manual',
                bankVerification: bankVerification
            };
        } catch (error) {
            console.error('Bank transfer verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Verify transfer content format
    verifyTransferContent(content, expectedPaymentId) {
        console.log('Verifying transfer content:', { content, expectedPaymentId });
        
        // Expected format: "HOTELHUB INV{invoiceId} {description}"
        const pattern = /HOTELHUB\s+INV(\d+)/i;
        const match = content.match(pattern);
        
        if (!match) {
            return {
                isValid: false,
                expected: `HOTELHUB INV${expectedPaymentId}`,
                invoiceId: null
            };
        }

        const invoiceId = parseInt(match[1]);
        
        return {
            isValid: true,
            invoiceId: invoiceId,
            expected: `HOTELHUB INV${expectedPaymentId}`
        };
    }

    // Simulate bank API check
    async checkWithBankAPI(transferData) {
        try {
            console.log('Simulating bank API check...');
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                verified: true,
                bankResponse: {
                    status: 'success',
                    transactionExists: true,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                verified: false,
                error: error.message
            };
        }
    }

    // Check transaction with MB Bank
    async checkMBBankTransaction(accountNo, fromDate, toDate, amount, content) {
        try {
            // Simulate checking with MB Bank API
            // In thực tế, bạn sẽ call API của MB Bank hoặc dùng webhook
            console.log('🏦 Checking with MB Bank API:', { accountNo, fromDate, toDate, amount, content });
            
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Simulate 70% chance of finding transaction
            const found = Math.random() > 0.3;
            
            if (found) {
                return {
                    success: true,
                    found: true,
                    transaction: {
                        transactionId: `MBB_${Date.now()}`,
                        amount: amount,
                        content: content,
                        transactionTime: new Date(),
                        accountNo: accountNo
                    }
                };
            } else {
                return {
                    success: true,
                    found: false,
                    message: 'Transaction not found yet, please wait...'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default PaymentService;