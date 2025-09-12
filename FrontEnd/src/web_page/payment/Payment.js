import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './payment.css';

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const paymentData = location.state;
    const { user } = useAuth();

    // ✅ THÊM: Debug log để kiểm tra data structure
    useEffect(() => {
        console.log('🔍 Payment Data Debug:', {
            hasPaymentData: !!paymentData,
            paymentDataKeys: paymentData ? Object.keys(paymentData) : [],
            paymentData: paymentData,
            fromInvoiceReview: paymentData?.fromInvoiceReview,
            hasInvoice: !!paymentData?.invoice,
            hasBookingData: !!paymentData?.bookingData,
            hasCustomerInfo: !!paymentData?.customerInfo,
            hasItemsInfo: !!paymentData?.itemsInfo,
            hasPricingInfo: !!paymentData?.pricingInfo,
            invoiceKeys: paymentData?.invoice ? Object.keys(paymentData.invoice) : [],
            bookingDataKeys: paymentData?.bookingData ? Object.keys(paymentData.bookingData) : []
        });

        // ✅ Debug specific data issues
        if (!paymentData) {
            console.error('❌ No payment data received from navigation state');
        } else {
            // Check invoice structure
            if (paymentData.invoice) {
                console.log('📋 Invoice Data:', {
                    InvoiceID: paymentData.invoice.InvoiceID,
                    BookingID: paymentData.invoice.BookingID,
                    TotalAmount: paymentData.invoice.TotalAmount,
                    customerName: paymentData.invoice.customerName,
                    itemsBreakdown: !!paymentData.invoice.itemsBreakdown
                });
            }
            
            // Check customer info
            if (paymentData.customerInfo) {
                console.log('👤 Customer Info:', paymentData.customerInfo);
            }
            
            // Check pricing info
            if (paymentData.pricingInfo) {
                console.log('💰 Pricing Info:', paymentData.pricingInfo);
            }
        }
    }, [paymentData]);

    // ✅ States
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);

    // ✅ QR Code states
    const [qrCode, setQrCode] = useState('');
    const [qrData, setQrData] = useState(null);
    const [transferInfo, setTransferInfo] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('Ready to Generate QR');
    const [paymentId, setPaymentId] = useState(null);
    const [expiryTime, setExpiryTime] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);

    // ✅ Notification states
    const [lastNotificationCheck, setLastNotificationCheck] = useState(null);
    const [showPaymentNotification, setShowPaymentNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationSound, setNotificationSound] = useState(null);
    const [autoCheckInterval, setAutoCheckInterval] = useState(null);

    // ✅ Create axios instance
    const api = axios.create({
        baseURL: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
        timeout: 30000,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    // ✅ Request interceptor
    api.interceptors.request.use(
        (config) => {
            console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                params: config.params,
                data: config.data,
                timestamp: new Date().toISOString()
            });
            return config;
        },
        (error) => {
            console.error('❌ Request Error:', error);
            return Promise.reject(error);
        }
    );

    // ✅ Response interceptor
    api.interceptors.response.use(
        (response) => {
            console.log(`✅ API Response: ${response.status}`, {
                url: response.config.url,
                data: response.data,
                timestamp: new Date().toISOString()
            });
            return response;
        },
        (error) => {
            console.error(`❌ Response Error: ${error.response?.status || 'Network Error'}`, {
                url: error.config?.url,
                message: error.message,
                response: error.response?.data,
                timestamp: new Date().toISOString()
            });
            
            if (error.code === 'ECONNABORTED') {
                toast.error('Yêu cầu quá thời gian chờ, vui lòng thử lại');
            } else if (error.response?.status === 500) {
                toast.error('Lỗi server, vui lòng thử lại sau');
            } else if (error.response?.status === 404) {
                toast.error('API không tồn tại');
            }
            
            return Promise.reject(error);
        }
    );

    // ✅ Helper functions
    const getRedirectPath = () => {
        if (user?.roles?.some(role => role.RoleID === 1)) {
            return '/manager';
        } else if (user?.roles?.some(role => role.RoleID === 2)) {
            return '/receptionist';
        } else {
            return '/customer';
        }
    };

    const safeToLocaleString = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '0';
        return Number(value).toLocaleString('vi-VN');
    };

    const getValidInvoiceId = () => {
        return paymentData?.invoice?.InvoiceID || 
               paymentData?.invoice?.invoiceID || 
               paymentData?.invoice?.id || 
               paymentData?.invoiceId ||
               null;
    };

    // ✅ Data extraction functions với enhanced debugging
    const getBookingInfo = () => {
        // ✅ Debug logging
        console.log('🔍 GetBookingInfo Debug:', {
            hasCustomerInfo: !!paymentData?.customerInfo,
            customerInfo: paymentData?.customerInfo,
            hasInvoiceCustomer: !!paymentData?.invoice?.customerName,
            invoiceCustomer: {
                name: paymentData?.invoice?.customerName,
                phone: paymentData?.invoice?.customerPhone,
                email: paymentData?.invoice?.customerEmail
            },
            hasBookingData: !!paymentData?.bookingData,
            bookingCustomer: {
                customerName: paymentData?.bookingData?.customerName,
                guestName: paymentData?.bookingData?.guestName
            }
        });
        
        // ✅ Method 1: Từ enhanced customer info (mới)
        if (paymentData?.customerInfo) {
            const result = {
                customerName: paymentData.customerInfo.name || 'Khách hàng',
                customerPhone: paymentData.customerInfo.phone || 'N/A',
                customerEmail: paymentData.customerInfo.email || 'N/A',
                customerType: paymentData.customerInfo.type || 'Walk-in Guest',
                bookingId: paymentData?.bookingData?.bookingID || 
                          paymentData?.invoice?.BookingID || 'N/A',
                receptionistName: paymentData?.bookingData?.receptionistName || 'N/A',
                checkInDate: paymentData?.bookingData?.checkInDate,
                checkOutDate: paymentData?.bookingData?.checkOutDate,
                numberOfGuests: paymentData?.bookingData?.numberOfGuest || 0,
                stayDuration: paymentData?.bookingData?.stayDuration || { nights: 0, text: '0 đêm' }
            };
            console.log('✅ Using customerInfo method:', result);
            return result;
        }

        // ✅ Method 2: Từ enhanced invoice data (mới)
        if (paymentData?.invoice?.customerName) {
            const result = {
                customerName: paymentData.invoice.customerName,
                customerPhone: paymentData.invoice.customerPhone || 'N/A',
                customerEmail: paymentData.invoice.customerEmail || 'N/A',
                customerType: 'Walk-in Guest',
                bookingId: paymentData.invoice.BookingID || 'N/A',
                receptionistName: paymentData?.bookingData?.receptionistName || 'N/A',
                checkInDate: paymentData?.bookingData?.checkInDate,
                checkOutDate: paymentData?.bookingData?.checkOutDate,
                numberOfGuests: paymentData?.bookingData?.numberOfGuest || 0,
                stayDuration: paymentData?.bookingData?.stayDuration || { nights: 0, text: '0 đêm' }
            };
            console.log('✅ Using invoice customer method:', result);
            return result;
        }

        // ✅ Method 3: Từ bookingData truyền thống (fallback)
        if (paymentData?.bookingData) {
            const result = {
                customerName: paymentData.bookingData.customerName || 
                             paymentData.bookingData.guestName || 'Khách hàng',
                customerPhone: paymentData.bookingData.customerPhone || 
                              paymentData.bookingData.guestPhone || 
                              paymentData.bookingData.phoneNumber || 
                              paymentData.bookingData.walkInGuestPhoneNumber || 'N/A',
                customerEmail: paymentData.bookingData.customerEmail || 
                              paymentData.bookingData.guestEmail || 
                              paymentData.bookingData.email || 'N/A',
                customerType: 'Walk-in Guest',
                bookingId: paymentData.bookingData.bookingID || 'N/A',
                receptionistName: paymentData.bookingData.receptionistName || 'N/A',
                checkInDate: paymentData.bookingData.checkInDate,
                checkOutDate: paymentData.bookingData.checkOutDate,
                numberOfGuests: paymentData.bookingData.numberOfGuest || 0,
                stayDuration: paymentData.bookingData.stayDuration || { nights: 0, text: '0 đêm' }
            };
            console.log('✅ Using bookingData method:', result);
            return result;
        }

        // ✅ Default fallback
        const fallbackResult = {
            customerName: 'Khách hàng',
            customerPhone: 'N/A',
            customerEmail: 'N/A',
            customerType: 'Walk-in Guest',
            bookingId: 'N/A',
            receptionistName: 'N/A',
            checkInDate: null,
            checkOutDate: null,
            numberOfGuests: 0,
            stayDuration: { nights: 0, text: '0 đêm' }
        };
        console.log('⚠️ Using fallback method:', fallbackResult);
        return fallbackResult;
    };

    const getInvoiceInfo = () => {
        const invoice = paymentData?.invoice;
        if (!invoice) return null;

        return {
            invoiceId: invoice.InvoiceID || invoice.invoiceID || invoice.id,
            totalAmount: invoice.TotalAmount || paymentData?.totalAmount || 0,
            paidAmount: invoice.PaidAmount || 0,
            remainingAmount: invoice.RemainingAmount || invoice.TotalAmount || paymentData?.totalAmount || 0,
            paymentStatus: invoice.PaymentStatus || 'Pending',
            createAt: invoice.CreateAt || new Date().toISOString()
        };
    };

    // ✅ SỬA: Enhanced getItemsInfo với service details
    const getItemsInfo = () => {
        // ✅ Method 1: Từ enhanced items info (mới)
        if (paymentData?.itemsInfo) {
            return {
                rooms: paymentData.itemsInfo.rooms || [],
                services: paymentData.itemsInfo.services || [],
                promotions: paymentData.itemsInfo.promotions || [],
                totalRooms: paymentData.itemsInfo.rooms?.length || 0,
                totalServices: paymentData.itemsInfo.services?.length || 0
            };
        }

        // ✅ Method 2: Từ enhanced invoice breakdown (mới)
        if (paymentData?.invoice?.itemsBreakdown) {
            return {
                rooms: paymentData.invoice.itemsBreakdown.rooms || [],
                services: paymentData.invoice.itemsBreakdown.services || [],
                promotions: paymentData.invoice.itemsBreakdown.promotions || [],
                totalRooms: paymentData.invoice.itemsBreakdown.rooms?.length || 0,
                totalServices: paymentData.invoice.itemsBreakdown.services?.length || 0
            };
        }

        // ✅ Method 3: Từ bookingData details (mới)
        if (paymentData?.bookingData?.serviceDetails || paymentData?.bookingData?.roomDetails) {
            return {
                rooms: paymentData.bookingData.roomDetails?.rooms || [],
                services: paymentData.bookingData.serviceDetails?.services || [],
                promotions: paymentData.bookingData.promotionDetails?.promotions || [],
                totalRooms: paymentData.bookingData.roomDetails?.totalRooms || 0,
                totalServices: paymentData.bookingData.serviceDetails?.services?.length || 0
            };
        }

        // ✅ Method 4: Từ bookingData truyền thống (fallback)
        if (paymentData?.bookingData) {
            const rooms = [];
            const services = [];
            
            // Extract room info từ selectedRooms
            if (paymentData.bookingData.selectedRooms && Array.isArray(paymentData.bookingData.selectedRooms)) {
                paymentData.bookingData.selectedRooms.forEach(room => {
                    rooms.push({
                        name: room.name || room.typeName || `Room ${room.roomTypeId}`,
                        quantity: room.quantity || 1,
                        unitPrice: room.unitPrice || room.price || 0,
                        subTotal: room.subTotal || (room.quantity * room.unitPrice) || 0
                    });
                });
            }

            // Extract service info từ selectedServices và availableServices
            if (paymentData.bookingData.selectedServices && paymentData.bookingData.availableServices) {
                paymentData.bookingData.selectedServices.forEach(serviceId => {
                    const service = paymentData.bookingData.availableServices.find(s => s.id === serviceId);
                    if (service) {
                        services.push({
                            name: service.name,
                            price: service.price,
                            description: service.description
                        });
                    }
                });
            }

            return {
                rooms: rooms,
                services: services,
                promotions: [],
                totalRooms: rooms.length,
                totalServices: services.length
            };
        }

        // ✅ Default fallback
        return {
            rooms: [],
            services: [],
            promotions: [],
            totalRooms: 0,
            totalServices: 0
        };
    };

    // ✅ SỬA: Enhanced getPricingInfo với enhanced pricing data và totalAmount
    const getPricingInfo = () => {
        // ✅ Method 1: Từ enhanced pricing info (mới)
        if (paymentData?.pricingInfo) {
            const finalTotal = paymentData.pricingInfo.finalTotal || 0;
            return {
                roomTotal: paymentData.pricingInfo.roomTotal || 0,
                serviceTotal: paymentData.pricingInfo.serviceTotal || 0,
                lateCheckoutFee: paymentData.pricingInfo.lateCheckoutFee || 0,
                subtotal: paymentData.pricingInfo.subtotal || 0,
                promotionDiscount: paymentData.pricingInfo.promotionDiscount || 0,
                finalTotal: finalTotal,
                totalAmount: finalTotal, // ✅ THÊM: totalAmount bị thiếu
                depositAmount: Math.round(finalTotal * 0.5)
            };
        }

        // ✅ Method 2: Từ enhanced invoice pricing (mới)
        if (paymentData?.invoice?.pricingBreakdown) {
            const pricing = paymentData.invoice.pricingBreakdown;
            const finalTotal = pricing.finalTotal || 0;
            return {
                roomTotal: pricing.roomTotal || 0,
                serviceTotal: pricing.serviceTotal || 0,
                lateCheckoutFee: pricing.lateCheckoutFee || 0,
                subtotal: pricing.subtotal || 0,
                promotionDiscount: pricing.promotionDiscount || 0,
                finalTotal: finalTotal,
                totalAmount: finalTotal, // ✅ THÊM: totalAmount bị thiếu
                depositAmount: Math.round(finalTotal * 0.5)
            };
        }

        // ✅ Method 3: Từ bookingData pricing (mới)
        if (paymentData?.bookingData?.pricing) {
            const pricing = paymentData.bookingData.pricing;
            const finalTotal = pricing.finalTotal || 0;
            return {
                roomTotal: pricing.roomTotal || 0,
                serviceTotal: pricing.serviceTotal || 0,
                lateCheckoutFee: pricing.lateCheckoutFee || 0,
                subtotal: pricing.subtotal || 0,
                promotionDiscount: pricing.promotionDiscount || 0,
                finalTotal: finalTotal,
                totalAmount: finalTotal, // ✅ THÊM: totalAmount bị thiếu
                depositAmount: Math.round(finalTotal * 0.5)
            };
        }

        // ✅ Method 4: Từ invoice TotalAmount (fallback)
        if (paymentData?.invoice?.TotalAmount) {
            const total = paymentData.invoice.TotalAmount;
            return {
                roomTotal: 0,
                serviceTotal: 0,
                lateCheckoutFee: 0,
                subtotal: total,
                promotionDiscount: 0,
                finalTotal: total,
                totalAmount: total, // ✅ THÊM: totalAmount bị thiếu
                depositAmount: Math.round(total * 0.5)
            };
        }

        // ✅ Method 5: Từ paymentData.totalAmount trực tiếp (fallback cuối)
        if (paymentData?.totalAmount) {
            const total = paymentData.totalAmount;
            return {
                roomTotal: 0,
                serviceTotal: 0,
                lateCheckoutFee: 0,
                subtotal: total,
                promotionDiscount: 0,
                finalTotal: total,
                totalAmount: total, // ✅ THÊM: totalAmount bị thiếu
                depositAmount: Math.round(total * 0.5)
            };
        }

        // ✅ Default fallback
        return {
            roomTotal: 0,
            serviceTotal: 0,
            lateCheckoutFee: 0,
            subtotal: 0,
            promotionDiscount: 0,
            finalTotal: 0,
            totalAmount: 0, // ✅ THÊM: totalAmount bị thiếu
            depositAmount: 0
        };
    };

    // ✅ Memoized objects
    const bookingInfo = useMemo(() => getBookingInfo(), [paymentData]);
    const invoiceInfo = useMemo(() => getInvoiceInfo(), [paymentData]);
    const pricingInfo = useMemo(() => getPricingInfo(), [paymentData]);
    const itemsInfo = useMemo(() => getItemsInfo(), [paymentData]);

    // ✅ Initialize notification sound
    useEffect(() => {
        try {
            const audio = new Audio('/assets/sounds/payment-success.mp3');
            audio.volume = 0.3;
            setNotificationSound(audio);
        } catch (error) {
            console.log('Sound file not available:', error);
        }
    }, []);

    // ✅ Timer effect for countdown
    useEffect(() => {
        if (!expiryTime) return;

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const expiry = new Date(expiryTime).getTime();
            const remaining = expiry - now;

            if (remaining <= 0) {
                setTimeRemaining(null);
                setPaymentStatus('QR Code Expired');
                toast.warning('Mã QR đã hết hạn');
                clearInterval(timer);
                
                if (autoCheckInterval) {
                    clearInterval(autoCheckInterval);
                    setAutoCheckInterval(null);
                }
            } else {
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [expiryTime, autoCheckInterval]);

    // ✅ Auto check payment status
    useEffect(() => {
        if (!paymentId || paymentStatus !== 'QR Generated' || !timeRemaining) {
            if (autoCheckInterval) {
                clearInterval(autoCheckInterval);
                setAutoCheckInterval(null);
            }
            return;
        }

        if (autoCheckInterval) {
            clearInterval(autoCheckInterval);
        }

        console.log('🔄 Starting auto payment status check...');

        const checkInterval = setInterval(async () => {
            try {
                console.log('🔍 Auto checking payment status with notification...');
                
                const response = await api.get(`/api/payment/${paymentId}/status-with-notification`);
                
                if (response.data.success) {
                    const { data } = response.data;
                    const payment = data.payment;
                    
                    if (data.notification && data.notification.hasNewUpdate) {
                        console.log('🔔 New payment notification received:', data.notification);
                        
                        setNotificationMessage(`💰 Thanh toán đã được xác nhận! Mã giao dịch: ${payment.transactionId || 'N/A'}`);
                        setShowPaymentNotification(true);
                        
                        if (notificationSound) {
                            try {
                                notificationSound.currentTime = 0;
                                notificationSound.play().catch(console.log);
                            } catch (soundError) {
                                console.log('Sound play failed:', soundError);
                            }
                        }
                        
                        toast.success('🎉 Thanh toán thành công! Đã nhận được xác nhận từ ngân hàng', {
                            autoClose: 5000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                        });
                        
                        setTimeout(() => {
                            setShowPaymentNotification(false);
                        }, 8000);
                        
                        setLastNotificationCheck(new Date());
                    }
                    
                    if (payment.paymentStatus === 'completed') {
                        setPaymentStatus('Payment Completed');
                        setShowQRModal(false);
                        
                        if (autoCheckInterval) {
                            clearInterval(autoCheckInterval);
                            setAutoCheckInterval(null);
                        }
                        
                        toast.success('🎉 Thanh toán hoàn tất! Đang chuyển hướng đến danh sách hóa đơn...', {
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                        });
                        
                        setTimeout(() => {
                            navigate('/receptionist/invoices', {
                                state: {
                                    paymentCompleted: true,
                                    paymentResult: payment,
                                    bookingInfo: bookingInfo,
                                    invoiceInfo: invoiceInfo,
                                    paidAmount: paymentAmount,
                                    paymentMethod: 'VietQR',
                                    qrPayment: true,
                                    autoVerified: true,
                                    notificationReceived: data.notification?.hasNewUpdate || false
                                }
                            });
                        }, 2000);
                        
                    } else {
                        console.log('💭 Payment still pending, status:', payment.paymentStatus);
                    }
                }
                
            } catch (error) {
                console.error('❌ Auto payment check failed:', error);
            }
        }, 3000);

        setAutoCheckInterval(checkInterval);

        return () => {
            if (checkInterval) {
                clearInterval(checkInterval);
            }
        };
    }, [paymentId, paymentStatus, timeRemaining, notificationSound, api, bookingInfo, invoiceInfo, paymentAmount, navigate]);

    // ✅ Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoCheckInterval) {
                clearInterval(autoCheckInterval);
            }
        };
    }, [autoCheckInterval]);

    // ✅ Initialize payment amount
    useEffect(() => {
        console.log('💳 Payment component mounted with data:', {
            hasPaymentData: !!paymentData,
            hasInvoice: !!paymentData?.invoice,
            hasBookingData: !!paymentData?.bookingData,
            totalAmount: pricingInfo.totalAmount,
            depositAmount: pricingInfo.depositAmount,
            bookingId: bookingInfo.bookingId,
            invoiceId: invoiceInfo?.invoiceId,
            // ✅ THÊM: Debug pricing structure
            pricingInfoDetails: {
                roomTotal: pricingInfo.roomTotal,
                serviceTotal: pricingInfo.serviceTotal,
                finalTotal: pricingInfo.finalTotal,
                depositAmount: pricingInfo.depositAmount,
                source: paymentData?.pricingInfo ? 'pricingInfo' :
                       paymentData?.invoice?.pricingBreakdown ? 'invoice.pricingBreakdown' :
                       paymentData?.bookingData?.pricing ? 'bookingData.pricing' :
                       paymentData?.invoice?.TotalAmount ? 'invoice.TotalAmount' :
                       paymentData?.totalAmount ? 'totalAmount' : 'default'
            }
        });

        if (!paymentData || (!paymentData.invoice && !paymentData.totalAmount)) {
            console.warn('⚠️ Invalid payment data, redirecting...');
            toast.error('Dữ liệu thanh toán không hợp lệ');
            navigate(getRedirectPath());
            return;
        }

        // ✅ SỬA: Ensure valid payment amount
        const validDepositAmount = pricingInfo.depositAmount || pricingInfo.totalAmount || pricingInfo.finalTotal || 0;
        console.log('💰 Setting payment amount:', {
            original: pricingInfo.depositAmount,
            fallback: validDepositAmount,
            totalAmount: pricingInfo.totalAmount,
            finalTotal: pricingInfo.finalTotal
        });
        
        setPaymentAmount(validDepositAmount);
    }, [paymentData, pricingInfo.depositAmount, pricingInfo.totalAmount, pricingInfo.finalTotal, bookingInfo.bookingId, invoiceInfo?.invoiceId, navigate]);

    // ✅ Generate VietQR function
    const generateVietQR = async () => {
        try {
            setQrLoading(true);
            setPaymentStatus('Generating QR...');
            
            console.log('🎯 Generating VietQR for booking payment:', {
                invoiceId: invoiceInfo?.invoiceId,
                amount: paymentAmount,
                bookingId: bookingInfo.bookingId,
                guestName: bookingInfo.guestName
            });

            const qrPayload = {
                invoiceId: invoiceInfo?.invoiceId,
                amount: paymentAmount,
                description: `HOTELHUB INV${invoiceInfo?.invoiceId} ${bookingInfo.guestName} BK${bookingInfo.bookingId}`,
                template: 'compact'
            };

            console.log('📨 Sending VietQR request:', qrPayload);

            const response = await api.post('/api/payment/vietqr/generate', qrPayload);

            console.log('✅ VietQR response received:', response.data);

            if (response.data && response.data.success) {
                const responseData = response.data.data || response.data;
                
                const qrUrl = responseData.qrUrl || responseData.qrCode || responseData.qr_url;
                const qrDataInfo = responseData.qrData || responseData.data || {};
                const transferInfoData = responseData.transferInfo || responseData.transfer_info || {};
                const paymentIdValue = responseData.paymentId || responseData.payment_id || Date.now();
                
                console.log('🎯 Extracted QR data:', {
                    qrUrl,
                    hasQrData: !!qrDataInfo,
                    hasTransferInfo: !!transferInfoData,
                    paymentId: paymentIdValue
                });
                
                if (!qrUrl) {
                    throw new Error('QR URL not found in response');
                }
                
                setQrCode(qrUrl);
                setQrData(qrDataInfo);
                setTransferInfo(transferInfoData);
                setPaymentId(paymentIdValue);
                setPaymentStatus('QR Generated');
                
                const expiry = new Date();
                expiry.setMinutes(expiry.getMinutes() + 15);
                setExpiryTime(expiry.toISOString());
                
                console.log('🎯 QR Generated successfully, starting auto-check:', {
                    paymentId: paymentIdValue,
                    qrUrl: qrUrl,
                    expiryTime: expiry
                });
                
                toast.success('Tạo mã QR thành công! Hệ thống sẽ tự động xác nhận khi nhận được thanh toán.');
                setShowQRModal(true);
                
            } else {
                throw new Error(response.data?.message || 'Không thể tạo mã QR');
            }
            
        } catch (error) {
            console.error('❌ VietQR generation failed:', error);
            
            let errorMessage = 'Lỗi khi tạo mã QR';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
            setPaymentStatus('QR Generation Failed');
            
        } finally {
            setQrLoading(false);
        }
    };

    // ✅ Manual refresh payment status
    const refreshPaymentStatus = async () => {
        if (!paymentId) return;
        
        try {
            console.log('🔄 Manual refresh payment status...');
            toast.info('Đang kiểm tra trạng thái thanh toán...');
            
            const response = await api.get(`/api/payment/${paymentId}/status-with-notification`);
            
            if (response.data.success) {
                const { data } = response.data;
                const payment = data.payment;
                
                if (payment.paymentStatus === 'completed') {
                    setPaymentStatus('Payment Completed');
                    toast.success('Thanh toán đã hoàn tất! Đang chuyển hướng...');
                    
                    setTimeout(() => {
                        navigate('/receptionist/invoices', {
                            state: {
                                paymentCompleted: true,
                                paymentResult: payment,
                                bookingInfo: bookingInfo,
                                invoiceInfo: invoiceInfo,
                                paidAmount: paymentAmount,
                                paymentMethod: 'VietQR',
                                qrPayment: true,
                                manualRefresh: true
                            }
                        });
                    }, 1500);
                } else if (data.notification?.hasNewUpdate) {
                    toast.info('Đã có cập nhật mới từ ngân hàng!');
                } else {
                    toast.info(`Trạng thái hiện tại: ${payment.paymentStatus}`);
                }
            }
            
        } catch (error) {
            console.error('Manual refresh failed:', error);
            toast.error('Lỗi khi kiểm tra trạng thái thanh toán');
        }
    };

    // ✅ Test notification function
    const testBankNotification = async () => {
        if (!paymentId) return;
        
        try {
            console.log('🧪 Testing bank notification...');
            toast.info('Đang mô phỏng thông báo từ ngân hàng...');
            
            const response = await api.post('/api/payment/test/simulate-bank-notification', {
                paymentId: paymentId,
                success: true
            });
            
            if (response.data.success) {
                toast.success('Mô phỏng thành công! Hệ thống sẽ tự động cập nhật...');
            } else {
                toast.error('Mô phỏng thất bại: ' + response.data.message);
            }
            
        } catch (error) {
            console.error('Test notification failed:', error);
            toast.error('Lỗi khi mô phỏng thông báo');
        }
    };

    // ✅ Manual verify payment
    const manualVerifyPayment = async () => {
        if (!paymentId) {
            toast.error('Không có payment ID để verify');
            return;
        }
            // ✅ SỬA: Đảm bảo paymentId là số
    const id = typeof paymentId === 'object' && paymentId !== null && paymentId.paymentId
        ? paymentId.paymentId
        : paymentId;

    if (!id || isNaN(Number(id))) {
        toast.error('Payment ID không hợp lệ');
        return;
    }

        try {
            console.log('🔧 Manual verification for payment:', id);
            
            const response = await api.post(`/api/payment/force-verify/${id}`);
            
            if (response.data.success) {
                toast.success('Xác minh thanh toán thành công! Đang chuyển hướng...');
                
                setTimeout(() => {
                    navigate('/receptionist/invoices', {
                        state: {
                            paymentCompleted: true,
                            paymentResult: response.data.payment,
                            bookingInfo: bookingInfo,
                            invoiceInfo: invoiceInfo,
                            paidAmount: paymentAmount,
                            paymentMethod: 'VietQR',
                            manualVerification: true
                        }
                    });
                }, 1500);
            } else {
                toast.error(response.data.message || 'Xác minh thất bại');
            }
            
        } catch (error) {
            console.error('❌ Manual verification failed:', error);
            toast.error('Lỗi khi xác minh thanh toán');
        }
    };

    // ✅ SỬA: CHỈ GIỮ MỘT processPayment function
    const handleProcessPayment = async () => {
        try {
            setProcessingPayment(true);

            const invoiceId = getValidInvoiceId();
            if (!invoiceId) {
                throw new Error('Không tìm thấy ID hóa đơn');
            }

            console.log('💰 Processing payment:', {
                invoiceId,
                paymentAmount,
                paymentMethod,
                bookingId: bookingInfo.bookingId
            });

            const paymentPayload = {
                depositAmount: paymentAmount,
                paymentMethod: paymentMethod,
                notes: `Thanh toán cọc ${paymentMethod} cho booking #${bookingInfo.bookingId} - Khách: ${bookingInfo.guestName}`
            };

            const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/deposit-payment`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentPayload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Payment successful:', result);
                toast.success('Thanh toán cọc thành công! Đang chuyển hướng...');
                
                setTimeout(() => {
                    navigate('/receptionist/invoices', {
                        state: {
                            paymentCompleted: true,
                            paymentResult: result.data,
                            bookingInfo: bookingInfo,
                            invoiceInfo: invoiceInfo,
                            paidAmount: paymentAmount,
                            paymentMethod: paymentMethod,
                            remainingAmount: result.data.newRemainingAmount || (pricingInfo.totalAmount - paymentAmount),
                            cashPayment: true
                        }
                    });
                }, 1000);
            } else {
                throw new Error(result.message || 'Thanh toán thất bại');
            }

        } catch (error) {
            console.error('❌ Payment error:', error);
            toast.error('Lỗi thanh toán: ' + error.message);
        } finally {
            setProcessingPayment(false);
        }
    };

    // ✅ Handle QR modal close
    const handleQRModalClose = () => {
        setShowQRModal(false);
        
        if (autoCheckInterval) {
            clearInterval(autoCheckInterval);
            setAutoCheckInterval(null);
        }
        
        setQrCode('');
        setQrData(null);
        setTransferInfo(null);
        setPaymentId(null);
        setExpiryTime(null);
        setTimeRemaining(null);
        setPaymentStatus('Ready to Generate QR');
        setShowPaymentNotification(false);
    };

    // ✅ Early return check
    if (!paymentData || !paymentData.invoice) {
        return (
            <div className="payment-container">
                <div className="alert alert-warning text-center">
                    <h4>Không có dữ liệu thanh toán</h4>
                    <p>Vui lòng quay lại trang trước và thử lại.</p>
                    <button 
                        className="btn btn-outline-primary"
                        onClick={() => navigate(getRedirectPath())}
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    // ✅ Render JSX (giữ nguyên phần render, chỉ thay đổi onClick cho nút thanh toán)
    return (
        <div className="payment-container">
            <div className="payment-header">
                <h1><i className="fas fa-credit-card"></i> Thanh toán cọc đặt phòng</h1>
                <p>Thanh toán cọc {pricingInfo.depositPercentage}% để xác nhận đặt phòng</p>
            </div>

            <div className="row">
                <div className="col-lg-8">
                    {/* Booking info card */}
                    <div className="payment-card">
                        <div className="card-header">
                            <h3><i className="fas fa-info-circle"></i> Thông tin đặt phòng</h3>
                        </div>
                        <div className="card-body">
                            <div className="booking-info">
                                <h5><i className="fas fa-user"></i> Thông tin khách hàng</h5>
                                <p><strong>Tên khách hàng:</strong> {bookingInfo.guestName}</p>
                                <p><strong>Số điện thoại:</strong> {bookingInfo.guestPhone}</p>
                                <p><strong>Email:</strong> {bookingInfo.guestEmail}</p>
                                <p><strong>Mã booking:</strong> #{bookingInfo.bookingId}</p>
                            </div>

                            <div className="booking-info">
                                <h5><i className="fas fa-calendar"></i> Thông tin lưu trú</h5>
                                <p><strong>Ngày nhận phòng:</strong> {bookingInfo.checkInDate ? new Date(bookingInfo.checkInDate).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                <p><strong>Ngày trả phòng:</strong> {bookingInfo.checkOutDate ? new Date(bookingInfo.checkOutDate).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                <p><strong>Số đêm:</strong> {bookingInfo.nights} đêm</p>
                                <p><strong>Số khách:</strong> {bookingInfo.numberOfGuests} người</p>
                            </div>

                            {bookingInfo.specialRequest && (
                                <div className="booking-info">
                                    <h5><i className="fas fa-comment"></i> Yêu cầu đặc biệt</h5>
                                    <p>{bookingInfo.specialRequest}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment method card */}
                    <div className="payment-card">
                        <div className="card-header">
                            <h3><i className="fas fa-money-check"></i> Phương thức thanh toán</h3>
                        </div>
                        <div className="card-body">
                            <div className="payment-method">
                                <h5><i className="fas fa-credit-card"></i> Chọn phương thức thanh toán</h5>
                                
                                <div className={`form-check ${paymentMethod === 'Cash' ? 'checked' : ''}`}>
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        id="paymentCash"
                                        value="Cash"
                                        checked={paymentMethod === 'Cash'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <label className="form-check-label" htmlFor="paymentCash">
                                        <i className="fas fa-money-bill-wave"></i>
                                        <div>
                                            <span className="fw-semibold">Tiền mặt</span>
                                            <small>Thanh toán trực tiếp tại quầy lễ tân</small>
                                        </div>
                                    </label>
                                </div>

                                <div className={`form-check ${paymentMethod === 'VietQR' ? 'checked' : ''}`}>
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        id="paymentVietQR"
                                        value="VietQR"
                                        checked={paymentMethod === 'VietQR'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <label className="form-check-label" htmlFor="paymentVietQR">
                                        <i className="fas fa-qrcode"></i>
                                        <div>
                                            <span className="fw-semibold">VietQR</span>
                                            <small>Quét mã QR để thanh toán qua ứng dụng ngân hàng</small>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="payment-amount">
                                <h5><i className="fas fa-calculator"></i> Số tiền thanh toán</h5>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                        min="0"
                                        max={pricingInfo.totalAmount}
                                    />
                                    <span className="input-group-text">VNĐ</span>
                                </div>
                                <small className="text-muted">
                                    Số tiền cọc đề xuất: {safeToLocaleString(pricingInfo.depositAmount)}đ 
                                    ({pricingInfo.depositPercentage}% tổng hóa đơn)
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    {/* Order summary card */}
                    <div className="order-summary-card">
                        <div className="card-header">
                            <h4><i className="fas fa-receipt"></i> Tóm tắt đơn hàng</h4>
                        </div>
                        <div className="card-body">
                            {itemsInfo.rooms.length > 0 && (
                                <div className="order-section">
                                    <h6><i className="fas fa-bed"></i> Phòng đã chọn</h6>
                                    {itemsInfo.rooms.map((room, index) => (
                                        <div key={index} className="order-item">
                                            <div className="item-info">
                                                <div className="item-name">{room.name}</div>
                                                <div className="item-details">Số lượng: {room.quantity}</div>
                                            </div>
                                            <div className="item-price">{safeToLocaleString(room.totalPrice)}đ</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {itemsInfo.services.length > 0 && (
                                <div className="order-section">
                                    <h6><i className="fas fa-concierge-bell"></i> Dịch vụ</h6>
                                    {itemsInfo.services.map((service, index) => (
                                        <div key={index} className="order-item">
                                            <div className="item-info">
                                                <div className="item-name">{service.name}</div>
                                                <div className="item-details">{service.description}</div>
                                            </div>
                                            <div className="item-price">{safeToLocaleString(service.price)}đ</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {itemsInfo.promotions.length > 0 && (
                                <div className="order-section">
                                    <h6><i className="fas fa-tags"></i> Khuyến mãi</h6>
                                    {itemsInfo.promotions.map((promotion, index) => (
                                        <div key={index} className="order-item">
                                            <div className="item-info">
                                                <div className="item-name">{promotion.name}</div>
                                                <div className="item-details">Giảm {promotion.discountPercent}%</div>
                                            </div>
                                            <div className="item-price text-success">-{promotion.discountPercent}%</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="order-summary">
                                <div className="summary-row">
                                    <span>Tổng hóa đơn:</span>
                                    <span>{safeToLocaleString(pricingInfo.totalAmount)}đ</span>
                                </div>
                                <div className="summary-row text-success">
                                    <span>Cọc thanh toán ({pricingInfo.depositPercentage}%):</span>
                                    <span>{safeToLocaleString(paymentAmount)}đ</span>
                                </div>
                                <div className="summary-row">
                                    <span>Còn lại khi checkin:</span>
                                    <span>{safeToLocaleString(pricingInfo.totalAmount - paymentAmount)}đ</span>
                                </div>
                                <div className="summary-total">
                                    <span>Thanh toán ngay:</span>
                                    <span>{safeToLocaleString(paymentAmount)}đ</span>
                                </div>
                            </div>

                            <div className="deposit-info">
                                <small>
                                    Bạn sẽ thanh toán số tiền còn lại 
                                    <strong> {safeToLocaleString(pricingInfo.totalAmount - paymentAmount)}đ</strong> 
                                    khi checkin.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="payment-actions">
                <button 
                    className="btn btn-secondary"
                    onClick={() => navigate(-1)}
                >
                    <i className="fas fa-arrow-left"></i> Quay lại
                </button>
                
                {/* ✅ SỬA: Thay đổi onClick để gọi function đúng */}
                <button 
                    className="btn btn-success"
                    onClick={paymentMethod === 'VietQR' ? generateVietQR : handleProcessPayment}
                    disabled={processingPayment || qrLoading || paymentAmount <= 0}
                >
                    {(processingPayment || qrLoading) ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                        </>
                    ) : (
                        <>
                            <i className={paymentMethod === 'VietQR' ? "fas fa-qrcode" : "fas fa-check-circle"}></i> 
                            {paymentMethod === 'VietQR' ? 'Tạo mã QR' : `Thanh toán ${safeToLocaleString(paymentAmount)}đ`}
                        </>
                    )}
                </button>
            </div>

            {/* ✅ QR Modal (giữ nguyên) */}
            {showQRModal && (
                <div className="modal fade show d-block">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-qrcode"></i> Thanh toán VietQR
                                    {paymentStatus === 'QR Generated' && (
                                        <span className="auto-refresh-indicator">
                                            <i className="fas fa-sync-alt"></i>
                                            Tự động kiểm tra
                                        </span>
                                    )}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={handleQRModalClose}
                                ></button>
                            </div>
                            <div className="modal-body text-center">
                                {showPaymentNotification && (
                                    <div className="alert alert-success alert-dismissible payment-success-notification" role="alert">
                                        <div className="d-flex align-items-center">
                                            <i className="fas fa-check-circle fa-2x text-success me-3 payment-success-pulse"></i>
                                            <div className="flex-grow-1">
                                                <h6 className="alert-heading mb-1">🎉 Thanh toán thành công!</h6>
                                                <p className="mb-0">{notificationMessage}</p>
                                                <small className="text-muted">Đã nhận được xác nhận từ ngân hàng</small>
                                            </div>
                                            <button 
                                                type="button" 
                                                className="btn-close" 
                                                onClick={() => setShowPaymentNotification(false)}
                                            ></button>
                                        </div>
                                    </div>
                                )}

                                <div className="alert alert-info">
                                    <h6>Trạng thái: {paymentStatus}</h6>
                                    <p>Số tiền: <strong>{safeToLocaleString(paymentAmount)}đ</strong></p>
                                    {timeRemaining && (
                                        <p>Thời gian còn lại: <strong className="text-warning">{timeRemaining}</strong></p>
                                    )}
                                    {paymentStatus === 'QR Generated' && (
                                        <small className="text-info d-block mt-2">
                                            <i className="fas fa-bell me-1"></i>
                                            Hệ thống đang tự động kiểm tra thanh toán mỗi 3 giây
                                        </small>
                                    )}
                                </div>
                                
                                {qrCode && (
                                    <div className="qr-code-section mb-4">
                                        <img 
                                            src={qrCode} 
                                            alt="VietQR Code"
                                            style={{ maxWidth: '300px', width: '100%' }}
                                            className="border rounded"
                                        />
                                    </div>
                                )}
                                
                                {transferInfo && (
                                    <div className="transfer-info mt-4">
                                        <h6><i className="fas fa-info-circle"></i> Thông tin chuyển khoản</h6>
                                        <div className="bank-details">
                                            <div className="bank-item">
                                                <span className="label">Ngân hàng:</span>
                                                <span className="value">{transferInfo.bankName || 'MB Bank'}</span>
                                            </div>
                                            <div className="bank-item">
                                                <span className="label">Số tài khoản:</span>
                                                <span className="value">{transferInfo.accountNo || '0865124996'}</span>
                                            </div>
                                            <div className="bank-item">
                                                <span className="label">Chủ tài khoản:</span>
                                                <span className="value">{transferInfo.accountName || 'LE TRAN TRONG DAT'}</span>
                                            </div>
                                            <div className="bank-item">
                                                <span className="label">Số tiền:</span>
                                                <span className="value highlight">{transferInfo.amount || `${safeToLocaleString(paymentAmount)}đ`}</span>
                                            </div>
                                            <div className="bank-item">
                                                <span className="label">Nội dung:</span>
                                                <span className="value">{transferInfo.content || `HOTELHUB INV${invoiceInfo?.invoiceId} ${bookingInfo.guestName} BK${bookingInfo.bookingId}`}</span>
                                            </div>
                                        </div>
                                        <small className="text-muted mt-2 d-block">
                                            {transferInfo.note || 'Vui lòng chuyển đúng số tiền và nội dung'}
                                        </small>
                                    </div>
                                )}
                                
                                <div className="mt-3">
                                    <small className="text-muted">
                                        🔔 Sau khi chuyển khoản, hệ thống sẽ tự động thông báo và xác nhận thanh toán
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="btn btn-info"
                                    onClick={refreshPaymentStatus}
                                    disabled={!paymentId}
                                >
                                    <i className="fas fa-sync-alt"></i> Kiểm tra ngay
                                </button>
                                
                                {process.env.NODE_ENV === 'development' && (
                                    <button 
                                        className="btn btn-warning"
                                        onClick={testBankNotification}
                                        disabled={!paymentId}
                                    >
                                        <i className="fas fa-flask"></i> Test Notification
                                    </button>
                                )}
                                
                                <button 
                                    className="btn btn-outline-success"
                                    onClick={manualVerifyPayment}
                                    disabled={!paymentId}
                                >
                                    <i className="fas fa-check"></i> Xác nhận đã chuyển khoản
                                </button>
                                
                                <button 
                                    className="btn btn-secondary"
                                    onClick={handleQRModalClose}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payment;