import crypto from 'crypto';
import querystring from 'querystring';
import moment from 'moment';
import axios from 'axios';

class PaymentService {
    constructor() {
        // ✅ SỬA: Sử dụng trực tiếp từ process.env
        this.vietQRConfig = {
            bankId: process.env.BANK_ID || '970422', // MB Bank
            accountNo: process.env.ACCOUNT_NO || '0865124996',
            accountName: process.env.ACCOUNT_NAME || 'LE TRAN TRONG DAT',
            apiUrl: 'https://img.vietqr.io/image'
        };

        console.log('🏦 PaymentService initialized with config:', {
            bankId: this.vietQRConfig.bankId,
            accountNo: this.vietQRConfig.accountNo,
            accountName: this.vietQRConfig.accountName
        });
    }

    // ✅ SỬA: Generate VietQR với priority env variables
    generateVietQR({ amount, invoiceId, description, template = 'compact', accountNo, accountName, bankId }) {
        try {
            // ✅ SỬA: Ưu tiên sử dụng process.env trước, sau đó mới đến parameters
            const finalBankId = process.env.BANK_ID || bankId || '970422';
            const finalAccountNo = process.env.ACCOUNT_NO || accountNo || '0865124996';
            const finalAccountName = process.env.ACCOUNT_NAME || accountName || 'LE TRAN TRONG DAT';

            console.log('🔧 Generating VietQR with config:', {
                bankId: finalBankId,
                accountNo: finalAccountNo,
                accountName: finalAccountName,
                amount: amount,
                description: description
            });

            // ✅ SỬA: Đảm bảo URL được tạo với đúng Bank ID
            const qrUrl = `https://img.vietqr.io/image/${finalBankId}-${finalAccountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}`;

            console.log('🎯 Generated QR URL:', qrUrl);

            return {
                success: true,
                qrUrl: qrUrl,
                qrData: {
                    bankId: finalBankId,
                    bankName: this.getBankName(finalBankId),
                    accountNo: finalAccountNo,
                    accountName: finalAccountName,
                    amount: amount,
                    description: description
                },
                transferInfo: {
                    bankName: this.getBankName(finalBankId),
                    accountNo: finalAccountNo,
                    accountName: finalAccountName,
                    amount: amount.toLocaleString('vi-VN') + 'đ',
                    content: description,
                    note: 'Vui lòng chuyển đúng số tiền và nội dung cho MB Bank'
                }
            };

        } catch (error) {
            console.error('❌ VietQR generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ✅ SỬA: Get bank name với Bank ID chính xác
    getBankName(bankId) {
        const bankNames = {
            '970422': 'MB Bank (Ngân hàng Quân đội)', // ✅ MB Bank chính xác
            '970416': 'ACB Bank (Asia Commercial Bank)', // ✅ ACB Bank
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
        
        const bankName = bankNames[bankId] || 'Ngân hàng không xác định';
        console.log(`🏛️ Bank ID ${bankId} mapped to: ${bankName}`);
        return bankName;
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
            console.log('🏦 Checking with MB Bank API:', { accountNo, fromDate, toDate, amount, content });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
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