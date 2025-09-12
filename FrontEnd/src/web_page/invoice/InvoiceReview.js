import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import styles from './InvoiceReview.module.css';
import InvoicePrint from './components/InvoicePrint';

const InvoiceReview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // ✅ Lấy booking data từ navigation state
    const bookingData = location.state?.bookingData;
    const fromBooking = location.state?.fromBooking;
    
    const [invoice, setInvoice] = useState(null);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmingPayment, setConfirmingPayment] = useState(false);
    
    // ✅ SỬA: Enhanced duplicate prevention
    const [invoiceCreated, setInvoiceCreated] = useState(false);
    const invoiceCreationRef = useRef(false);
    const [creationAttempts, setCreationAttempts] = useState(0);

    // ✅ THÊM: Print modal state
    const [showPrintModal, setShowPrintModal] = useState(false);

    // ✅ FIX: Thêm isOpen logic bị thiếu - Component luôn "open" khi được render
    const isOpen = true; // ✅ InvoiceReview luôn hiển thị khi được navigate đến

    // ✅ THÊM: Các helper functions bị thiếu
    const calculateStayDuration = () => {
        if (!bookingData?.checkInDate || !bookingData?.checkOutDate) {
            return { nights: 0, text: '0 đêm' };
        }
        
        const checkIn = new Date(bookingData.checkInDate);
        const checkOut = new Date(bookingData.checkOutDate);
        const timeDiff = checkOut.getTime() - checkIn.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return {
            nights: Math.max(1, nights),
            text: `${Math.max(1, nights)} đêm`
        };
    };

    // ✅ THÊM: Helper functions bị thiếu - ĐẶT TRƯỚC khi sử dụng trong getRoomDetails()
    const getRoomTypeName = (typeId) => {
        if (!bookingData?.roomTypes || !Array.isArray(bookingData.roomTypes)) {
            return null;
        }
        const roomType = bookingData.roomTypes.find(rt => 
            String(rt.id) === String(typeId) || 
            String(rt.TypeId) === String(typeId) ||
            String(rt.typeId) === String(typeId)
        );
        return roomType?.name || roomType?.TypeName || roomType?.typeName || null;
    };

    const getRoomTypePrice = (typeId) => {
        if (!bookingData?.roomTypes || !Array.isArray(bookingData.roomTypes)) {
            return 0;
        }
        const roomType = bookingData.roomTypes.find(rt => 
            String(rt.id) === String(typeId) || 
            String(rt.TypeId) === String(typeId) ||
            String(rt.typeId) === String(typeId)
        );
        return roomType?.price || roomType?.BasePrice || roomType?.basePrice || 0;
    };

    // ✅ GIỮ NGUYÊN: Existing getRoomDetails function
    const getRoomDetails = () => {
        // ✅ SỬA: Group by room type instead of showing only first item
        if (!invoiceItems || invoiceItems.length === 0) {
            return { hasRooms: false, rooms: [], totalRooms: 0 };
        }

        const roomItems = invoiceItems.filter(item => item.ItemType === 'Room');
        
        if (roomItems.length === 0) {
            return { hasRooms: false, rooms: [], totalRooms: 0 };
        }

        // ✅ Group rooms by type (extract room type from ItemName)
        const roomTypeGroups = {};
        
        roomItems.forEach(item => {
            // Extract room type from ItemName (format: "RoomType - Room Number")
            const parts = item.ItemName.split(' - ');
            const roomType = parts[0]; // "Family", "Normal", etc.
            const roomNumber = parts.length > 1 ? parts[1] : item.ItemName;
            
            if (!roomTypeGroups[roomType]) {
                roomTypeGroups[roomType] = {
                    name: roomType,
                    rooms: [],
                    quantity: 0,
                    unitPrice: item.UnitPrice,
                    subTotal: 0,
                    description: item.Description || `Phòng loại ${roomType}`
                };
            }
            
            roomTypeGroups[roomType].rooms.push(roomNumber);
            roomTypeGroups[roomType].quantity += item.Quantity;
            roomTypeGroups[roomType].subTotal += item.SubTotal;
        });

        // ✅ Convert to array format for display
        const rooms = Object.values(roomTypeGroups).map(group => ({
            name: `${group.name} (${group.quantity} phòng)`,
            quantity: group.quantity,
            unitPrice: group.unitPrice,
            subTotal: group.subTotal,
            description: `${group.rooms.join(', ')} - ${group.name}`,
            rooms: group.rooms // ✅ THÊM: List of individual rooms
        }));

        return {
            hasRooms: true,
            rooms: rooms,
            totalRooms: rooms.reduce((total, room) => total + room.quantity, 0)
        };
    };

    const getServiceDetails = () => {
        if (!bookingData?.selectedServices || !Array.isArray(bookingData.selectedServices)) {
            return { hasServices: false, services: [] };
        }
        
        const services = bookingData.selectedServices.map(serviceId => {
            const service = bookingData.availableServices?.find(s => s.id === serviceId);
            return service ? {
                name: service.name,
                price: service.price,
                description: service.description
            } : null;
        }).filter(Boolean);
        
        return {
            hasServices: services.length > 0,
            services: services
        };
    };

    const getPromotionDetails = () => {
        if (!bookingData?.selectedPromotions || !Array.isArray(bookingData.selectedPromotions)) {
            return { hasPromotions: false, promotions: [] };
        }
        
        const promotions = bookingData.selectedPromotions.map(promotion => ({
            name: promotion.promotionName || promotion.name,
            discountPercent: promotion.discountPercent || promotion.discount || 0,
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            description: promotion.description
        }));
        
        return {
            hasPromotions: promotions.length > 0,
            promotions: promotions
        };
    };

    const calculateTotalAmount = () => {
        // ✅ SỬA: Ưu tiên sử dụng data từ location.state (được truyền từ PricingSummaryOnline)
        const pricingFromState = location.state?.pricing;
        const totalFromState = location.state?.totalAmount;
        const originalFromState = location.state?.originalAmount;
        const discountFromState = location.state?.discountAmount;
        
        console.log('💰 Calculating totals from available sources:', {
            hasLocationState: !!(pricingFromState || totalFromState),
            hasBookingData: !!bookingData,
            hasInvoiceData: !!invoice,
            pricingFromState,
            totalFromState,
            originalFromState,
            discountFromState,
            bookingDataTotal: bookingData?.totalPrice || bookingData?.finalTotal,
            invoiceTotal: invoice?.TotalAmount
        });

        // ✅ Priority 1: Use data từ navigation state (most accurate)
        if (pricingFromState || totalFromState) {
            console.log('✅ Using pricing from navigation state');
            
            return {
                roomTotal: pricingFromState?.roomSubtotal || 0,
                serviceTotal: pricingFromState?.servicesSubtotal || 0,
                lateCheckoutFee: pricingFromState?.lateCheckoutFee || 0,
                subtotal: originalFromState || totalFromState || 0,
                promotionDiscount: discountFromState || 0,
                finalTotal: totalFromState || 0,
                nightCount: pricingFromState?.nightCount || 1
            };
        }

        // ✅ Priority 2: Use data từ bookingData
        if (bookingData?.totalPrice || bookingData?.finalTotal) {
            console.log('✅ Using pricing from booking data');

            return {
                roomTotal: bookingData.pricing?.roomSubtotal || 0,
                serviceTotal: bookingData.pricing?.servicesSubtotal || 0,
                lateCheckoutFee: bookingData.pricing?.lateCheckoutFee || 0,
                subtotal: bookingData.originalTotal || bookingData.totalPrice || 0,
                promotionDiscount: bookingData.discountAmount || 0,
                finalTotal: bookingData.finalTotal || bookingData.totalPrice || 0,
                nightCount: bookingData.pricing?.nightCount || 1
            };
        }

        // ✅ Priority 3: Use invoice data nếu có
        if (invoice?.TotalAmount) {
            console.log('✅ Using total amount from invoice:', invoice.TotalAmount);
            
            return {
                roomTotal: 0,
                serviceTotal: 0,
                lateCheckoutFee: 0,
                subtotal: invoice.TotalAmount,
                promotionDiscount: 0,
                finalTotal: invoice.TotalAmount,
                nightCount: 1
            };
        }

        // ✅ Priority 4: Fallback calculation
        console.warn('⚠️ No reliable pricing data found, using fallback calculation');
        
        const roomDetails = getRoomDetails();
        const serviceDetails = getServiceDetails();
        const stayDuration = calculateStayDuration();
        
        const roomTotal = roomDetails.rooms?.reduce((sum, room) => sum + (room.subTotal * stayDuration.nights), 0) || 0;
        const serviceTotal = serviceDetails.services?.reduce((sum, service) => sum + service.price, 0) || 0;
        const lateCheckoutFee = 0;
        
        const subtotal = roomTotal + serviceTotal + lateCheckoutFee;
        const promotionDiscount = 0;
        const finalTotal = subtotal;
        
        return {
            roomTotal,
            serviceTotal,
            lateCheckoutFee,
            subtotal,
            promotionDiscount,
            finalTotal,
            nightCount: stayDuration.nights
        };
    };

    // ✅ THÊM: Format helpers bị thiếu
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('vi-VN');
        } catch {
            return 'N/A';
        }
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('vi-VN');
        } catch {
            return 'N/A';
        }
    };

    const safeToLocaleString = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '0';
        return Number(value).toLocaleString('vi-VN');
    };

    // ✅ THÊM: Handler functions bị thiếu
    const handleBackToBooking = () => {
        navigate('/receptionist/bookings');
    };

    const handlePrintPreview = () => {
        setShowPrintModal(true);
    };

    const handleClosePrintModal = () => {
        setShowPrintModal(false);
    };

    const proceedToPayment = async () => {
        if (!invoice?.InvoiceID) {
            toast.error('Hóa đơn chưa được tạo');
            return;
        }

        setConfirmingPayment(true);
        
        try {
            // ✅ SỬA: Chuẩn bị enhanced payment data với đầy đủ thông tin
            const guestInfo = getGuestInfo();
            const receptionistInfo = getReceptionistInfo();
            const roomDetails = getRoomDetails();
            const serviceDetails = getServiceDetails();
            const promotionDetails = getPromotionDetails();
            const totals = calculateTotalAmount();
            const stayDuration = calculateStayDuration();

            // ✅ THÊM: Enhanced booking data với đầy đủ customer info
            const enhancedBookingData = {
                ...bookingData,
                // ✅ Customer information
                customerName: guestInfo.name,
                customerPhone: guestInfo.phone,
                customerEmail: guestInfo.email,
                guestType: guestInfo.type,
                
                // ✅ Receptionist information
                receptionistName: receptionistInfo.name,
                receptionistId: receptionistInfo.receptionistId,
                
                // ✅ Stay details
                stayDuration: stayDuration,
                
                // ✅ Room details with full info
                roomDetails: {
                    hasRooms: roomDetails.hasRooms,
                    rooms: roomDetails.rooms,
                    totalRooms: roomDetails.totalRooms
                },
                
                // ✅ Service details with full info
                serviceDetails: {
                    hasServices: serviceDetails.hasServices,
                    services: serviceDetails.services || []
                },
                
                // ✅ Promotion details
                promotionDetails: {
                    hasPromotions: promotionDetails.hasPromotions,
                    promotions: promotionDetails.promotions || []
                },
                
                // ✅ Pricing breakdown
                pricing: {
                    roomTotal: totals.roomTotal,
                    serviceTotal: totals.serviceTotal,
                    lateCheckoutFee: totals.lateCheckoutFee,
                    subtotal: totals.subtotal,
                    promotionDiscount: totals.promotionDiscount,
                    finalTotal: totals.finalTotal
                }
            };

            // ✅ THÊM: Enhanced invoice data
            const enhancedInvoice = {
                ...invoice,
                // ✅ Customer info trực tiếp trong invoice
                customerName: guestInfo.name,
                customerPhone: guestInfo.phone,
                customerEmail: guestInfo.email,
                
                // ✅ Invoice items breakdown
                itemsBreakdown: {
                    rooms: roomDetails.rooms || [],
                    services: serviceDetails.services || [],
                    promotions: promotionDetails.promotions || []
                },
                
                // ✅ Pricing info
                pricingBreakdown: totals
            };

            console.log('💳 Proceeding to payment with enhanced data:', {
                invoiceId: enhancedInvoice.InvoiceID,
                customerName: guestInfo.name,
                customerEmail: guestInfo.email,
                customerPhone: guestInfo.phone,
                totalAmount: totals.finalTotal,
                servicesCount: serviceDetails.services?.length || 0,
                roomsCount: roomDetails.totalRooms
            });

            // ✅ SỬA: Navigate với enhanced data
            navigate('/payment', {
                state: {
                    invoice: enhancedInvoice,
                    bookingData: enhancedBookingData,
                    fromInvoiceReview: true,
                    // ✅ THÊM: Direct access data
                    customerInfo: {
                        name: guestInfo.name,
                        phone: guestInfo.phone,
                        email: guestInfo.email,
                        type: guestInfo.type
                    },
                    itemsInfo: {
                        rooms: roomDetails.rooms || [],
                        services: serviceDetails.services || [],
                        promotions: promotionDetails.promotions || []
                    },
                    pricingInfo: totals
                }
            });
        } catch (error) {
            console.error('❌ Error proceeding to payment:', error);
            toast.error('Lỗi khi chuyển đến trang thanh toán');
        } finally {
            setConfirmingPayment(false);
        }
    };

    // ✅ GIỮ NGUYÊN: Existing useEffect và functions
    useEffect(() => {
        // ✅ SỬA: Enhanced debugging và chỉ chạy khi cần thiết
        console.log('🔍 InvoiceReview useEffect triggered:', {
            bookingData: !!bookingData,
            bookingID: bookingData?.bookingID,
            invoiceCreated: invoiceCreated,
            invoiceCreationRefCurrent: invoiceCreationRef.current,
            fromBooking: fromBooking,
            creationAttempts: creationAttempts
        });

        // ✅ SỬA: Chỉ tạo invoice khi có booking data và chưa tạo
        if (bookingData?.bookingID && fromBooking && !invoiceCreated && !invoiceCreationRef.current && creationAttempts === 0) {
            console.log('✅ Conditions met for invoice creation, proceeding...');
            setCreationAttempts(1);
            createInvoiceForBooking();
        } else {
            console.log('⚠️ Invoice creation skipped:', {
                reason: !bookingData?.bookingID ? 'No bookingID' :
                        !fromBooking ? 'Not from booking' :
                        invoiceCreated ? 'Already created (state)' :
                        invoiceCreationRef.current ? 'Already created (ref)' :
                        creationAttempts > 0 ? 'Already attempted' : 'Unknown'
            });
            
            // ✅ SỬA: Nếu không có booking data, load existing invoice
            if (!bookingData?.bookingID && !loading) {
                const invoiceIdFromUrl = new URLSearchParams(window.location.search).get('invoiceId');
                if (invoiceIdFromUrl) {
                    console.log('🔍 Loading existing invoice from URL:', invoiceIdFromUrl);
                    loadInvoiceDetails(parseInt(invoiceIdFromUrl));
                }
            }
        }
    }, []);

    // ✅ SỬA: createInvoiceForBooking - Reset flags properly
    const createInvoiceForBooking = async () => {
        // ✅ CRITICAL: Prevent multiple calls
        if (invoiceCreationRef.current || invoiceCreated) {
            console.log('⚠️ Invoice creation already in progress or completed, skipping...');
            return;
        }

        // ✅ Set flags immediately
        invoiceCreationRef.current = true;
        setLoading(true);
        setError(null);

        try {
            // ✅ SỬA: Flexible booking ID extraction với fallback
            const bookingID = bookingData?.bookingID || 
                            bookingData?.bookingId || 
                            bookingData?.BookingID;
            
            console.log('💾 Creating invoice for booking:', {
                bookingID,
                hasBookingData: !!bookingData,
                bookingDataKeys: bookingData ? Object.keys(bookingData) : [],
                bookingStatus: bookingData?.bookingStatus
            });

            if (!bookingID) {
                // ✅ THÊM: Debug logging để tìm lỗi
                console.error('❌ No valid booking ID found in:', bookingData);
                throw new Error('Booking ID không hợp lệ. Vui lòng thử lại từ trang đặt phòng.');
            }

            const response = await fetch('http://localhost:3000/api/invoices/create-for-booking', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    bookingId: bookingID,
                    // ✅ THÊM: Additional context để backend có thể validate
                    fromOnlineBooking: true,
                    customerInfo: {
                        customerID: bookingData?.customerID || bookingData?.customerId,
                        guestName: bookingData?.guestName,
                        guestEmail: bookingData?.guestEmail,
                        guestPhone: bookingData?.guestPhone
                    }
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Invoice processed successfully:', {
                    invoiceID: result.data?.InvoiceID,
                    bookingID: bookingID,
                    totalAmount: result.data?.TotalAmount,
                    isExisting: result.isExisting || false
                });
                
                // ✅ SỬA: Set state properly cho cả invoice mới và đã tồn tại
                setInvoice(result.data);
                setInvoiceItems(result.data?.invoiceItems || []);
                setInvoiceCreated(true);
                
                // ✅ THÊM: Toast notification dựa trên trường hợp
                if (result.isExisting) {
                    toast.info('Hóa đơn đã tồn tại cho đặt phòng này');
                } else {
                    toast.success('Tạo hóa đơn thành công');
                }
                
                console.log('📋 Invoice data loaded:', {
                    invoiceID: result.data?.InvoiceID,
                    totalAmount: result.data?.TotalAmount,
                    itemsCount: result.data?.invoiceItems?.length || 0,
                    hasBookingData: !!bookingData,
                    isExisting: result.isExisting || false
                });
                
            } else {
                console.error('❌ Failed to process invoice:', result);
                
                // ✅ THÊM: Xử lý đặc biệt cho trường hợp invoice đã tồn tại
                if (result.error === 'INVOICE_ALREADY_EXISTS' && result.invoiceId) {
                    console.log('🔄 Loading existing invoice:', result.invoiceId);
                    await loadInvoiceDetails(result.invoiceId);
                    toast.info('Hóa đơn đã tồn tại cho đặt phòng này');
                } else {
                    throw new Error(result.message || 'Không thể xử lý hóa đơn');
                }
            }

        } catch (error) {
            console.error('❌ Error creating invoice for booking:', error);
            setError(error.message || 'Lỗi khi tạo hóa đơn');
            
            // ✅ SỬA: Reset flags on error để có thể retry
            invoiceCreationRef.current = false;
            setInvoiceCreated(false);
            
        } finally {
            setLoading(false);
        }
    };

    // ✅ THÊM: Load invoice details method
    const loadInvoiceDetails = async (invoiceId) => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔍 Loading invoice details:', invoiceId);

            const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Invoice details loaded:', result.data);
                
                setInvoice(result.data);
                setInvoiceItems(result.data?.invoiceItems || []);
                setInvoiceCreated(true);
                
                // ✅ Map invoice data to bookingData format for compatibility
                if (!bookingData && result.data) {
                    const mappedBookingData = {
                        bookingID: result.data.BookingID,
                        bookingId: result.data.BookingID,
                        guestName: result.data.GuestName,
                        guestEmail: result.data.GuestEmail,
                        guestPhone: result.data.GuestPhone,
                        numberOfGuest: result.data.NumberOfGuest,
                        specialRequest: result.data.SpecialRequest,
                        checkInDate: result.data.CheckInDate,
                        checkOutDate: result.data.CheckOutDate
                    };
                    setBookingData(mappedBookingData);
                }
                
            } else {
                throw new Error(result.message || 'Không thể tải thông tin hóa đơn');
            }

        } catch (error) {
            console.error('❌ Error loading invoice details:', error);
            setError(error.message);
            toast.error('Lỗi khi tải thông tin hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    // ✅ Loading state
    if (loading) {
        return (
            <div className={styles.invoiceReviewContainer}>
                <div className={styles.loadingSection}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Đang tạo hóa đơn...</span>
                    </div>
                    <h3>Đang tạo hóa đơn...</h3>
                    <p>Vui lòng đợi trong giây lát</p>
                </div>
            </div>
        );
    }

    // ✅ Error state
    if (error) {
        return (
            <div className={styles.invoiceReviewContainer}>
                <div className={styles.errorSection}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <h3>Lỗi tải hóa đơn</h3>
                    <p>{error}</p>
                    <div className={styles.errorActions}>
                        <button 
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={handleBackToBooking}
                        >
                            <i className="fas fa-arrow-left"></i>
                            Quay lại danh sách booking
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ SỬA: Enhanced getGuestInfo để xử lý data từ cả online và walk-in booking
    const getGuestInfo = () => {
        // ✅ Ưu tiên lấy từ customerInfo được truyền từ PricingSummaryOnline
        const customerInfo = location.state?.customerInfo;
        
        // ✅ Fallback order: customerInfo -> bookingData -> user -> default
        const guestInfo = {
            name: customerInfo?.customerName || 
                  bookingData?.guestName || 
                  bookingData?.customerName || 
                  user?.Fullname || 
                  'Khách hàng',
                  
            phone: customerInfo?.phoneNumber || 
                   bookingData?.guestPhone || 
                   bookingData?.phoneNumber || 
                   bookingData?.walkInGuestPhoneNumber || 
                   user?.PhoneNumber || 
                   'N/A',
                   
            email: customerInfo?.email || 
                   bookingData?.guestEmail || 
                   bookingData?.email || 
                   user?.Email || 
                   'N/A',
                   
            // ✅ Xác định loại khách hàng
            type: bookingData?.bookingType === 'online' || location.state?.bookingType === 'online' 
                  ? 'Online Customer' 
                  : 'Walk-in Guest',
                  
            // ✅ THÊM: User ID cho tracking
            userID: customerInfo?.userID || 
                   bookingData?.customerID || 
                   bookingData?.customerId || 
                   user?.UserID || 
                   null
        };

        console.log('👤 Guest Info resolved:', {
            source: customerInfo ? 'customerInfo' : 'bookingData/fallback',
            guestInfo,
            rawCustomerInfo: customerInfo,
            rawBookingDataGuest: {
                guestName: bookingData?.guestName,
                guestPhone: bookingData?.guestPhone,
                guestEmail: bookingData?.guestEmail
            }
        });

        return guestInfo;
    };

    const getReceptionistInfo = () => {
        return {
            name: user?.fullname || user?.Fullname || 'Nhân viên lễ tân',
            receptionistId: user?.userID || user?.UserID || 'N/A'
        };
    };

    // ✅ SỬA: Sử dụng isOpen = true thay vì kiểm tra !isOpen
    // Component luôn hiển thị khi được navigate đến
    
    const guestInfo = getGuestInfo();
    const receptionistInfo = getReceptionistInfo();
    const stayDuration = calculateStayDuration();
    const roomDetails = getRoomDetails();
    const serviceDetails = getServiceDetails();
    const promotionDetails = getPromotionDetails();
    const totals = calculateTotalAmount();

    // ✅ SỬA: Di chuyển getInvoicePrintData function vào trong component
    const getInvoicePrintData = () => {
        if (!invoice) {
            console.warn('⚠️ Invoice data not available for printing');
            return null;
        }

        try {
            const guestInfo = getGuestInfo();
            const roomDetails = getRoomDetails();
            const serviceDetails = getServiceDetails();
            const promotionDetails = getPromotionDetails();
            const totals = calculateTotalAmount();

            return {
                invoice: {
                    invoiceID: invoice.invoiceID,
                    bookingID: invoice.bookingID,
                    createAt: formatDate(invoice.createAt),
                    totalAmount: invoice.totalAmount,
                    paymentStatus: invoice.paymentStatus,
                    paidAmount: invoice.paidAmount,
                    remainingAmount: invoice.remainingAmount
                },
                customer: {
                    name: guestInfo.name,
                    email: guestInfo.email,
                    phone: guestInfo.phone,
                    type: guestInfo.type
                },
                booking: {
                    checkIn: bookingData?.checkIn ? formatDate(bookingData.checkIn) : 'N/A',
                    checkOut: bookingData?.checkOut ? formatDate(bookingData.checkOut) : 'N/A',
                    nights: calculateStayDuration(),
                    guests: bookingData?.numberOfGuest || 0,
                    specialRequest: bookingData?.specialRequest || 'Không có'
                },
                items: {
                    rooms: roomDetails,
                    services: serviceDetails,
                    promotions: promotionDetails
                },
                totals: totals,
                printDate: new Date().toLocaleString('vi-VN'),
                printedBy: user?.Fullname || 'System'
            };
        } catch (error) {
            console.error('❌ Error preparing print data:', error);
            return null;
        }
    };

    // ✅ GIỮ NGUYÊN: JSX render hiện tại với tất cả styles và structure
    return (
        <div className={styles.invoiceReviewContainer}>
            {/* Header */}
            <div className={styles.invoiceHeader}>
                <div className={styles.headerContent}>
                    <div>
                        <h1>
                            <i className="fas fa-file-invoice"></i>
                            Xem trước hóa đơn
                        </h1>
                        <p>Kiểm tra thông tin trước khi thanh toán</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button 
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={handleBackToBooking}
                        >
                            <i className="fas fa-arrow-left"></i>
                            Quay lại
                        </button>
                        <button 
                            className={`${styles.btn}`}
                            onClick={handlePrintPreview}
                        >
                            <i className="fas fa-print"></i>
                            Xem trước in
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className={styles.invoiceContent}>
                <div className={styles.mainContent}>
                    {/* Invoice Info Card */}
                    <div className={styles.invoiceCard}>
                        <div className={styles.cardHeader}>
                            <h3>
                                <i className="fas fa-info-circle"></i>
                                Thông tin hóa đơn
                            </h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>
                                        <i className="fas fa-hashtag"></i>
                                        Mã hóa đơn:
                                    </span>
                                    <span className={`${styles.value} ${styles.invoiceId}`}>
                                        #{invoice?.InvoiceID || 'Đang tạo...'}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>
                                        <i className="fas fa-calendar-alt"></i>
                                        Ngày tạo:
                                    </span>
                                    <span className={styles.value}>
                                        {formatDate(invoice?.CreateAt)}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>
                                        <i className="fas fa-bed"></i>
                                        Mã booking:
                                    </span>
                                    <span className={`${styles.value} ${styles.bookingId}`}>
                                        #{bookingData?.bookingID || invoice?.BookingID}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>
                                        <i className="fas fa-credit-card"></i>
                                        Trạng thái:
                                    </span>
                                    <span className={`${styles.value} ${styles.status} ${styles.pending}`}>
                                        {invoice?.PaymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info Card */}
                    <div className={styles.invoiceCard}>
                        <div className={styles.cardHeader}>
                            <h3>
                                <i className="fas fa-user"></i>
                                Thông tin khách hàng
                            </h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.customerMainInfo}>
                                <div className={styles.customerAvatar}>
                                    <i className="fas fa-user-circle"></i>
                                </div>
                                <div className={styles.customerBasic}>
                                    <h4>{guestInfo.name}</h4>
                                    <span className={styles.customerType}>
                                        <i className="fas fa-tag"></i>
                                        {guestInfo.type}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.customerContact}>
                                <div className={styles.contactItem}>
                                    <i className="fas fa-phone"></i>
                                    <span>{guestInfo.phone}</span>
                                </div>
                                <div className={styles.contactItem}>
                                    <i className="fas fa-envelope"></i>
                                    <span>{guestInfo.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Booking Details Card */}
                    <div className={styles.invoiceCard}>
                        <div className={styles.cardHeader}>
                            <h3>
                                <i className="fas fa-calendar-check"></i>
                                Chi tiết đặt phòng
                            </h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.bookingTimeline}>
                                <div className={styles.timelineItem}>
                                    <div className={`${styles.timelineIcon} ${styles.checkin}`}>
                                        <i className="fas fa-calendar-plus"></i>
                                    </div>
                                    <div className={styles.timelineContent}>
                                        <h5>Nhận phòng</h5>
                                        <div className={styles.timelineDate}>
                                            {formatDate(bookingData?.checkInDate)}
                                        </div>
                                        <small>Thời gian check-in</small>
                                    </div>
                                </div>
                                <div className={styles.timelineConnector}>
                                    <div className={styles.timelineLine}></div>
                                    <div className={styles.timelineDuration}>
                                        <i className="fas fa-moon"></i>
                                        <span>{stayDuration.text}</span>
                                    </div>
                                </div>
                                <div className={styles.timelineItem}>
                                    <div className={`${styles.timelineIcon} ${styles.checkout}`}>
                                        <i className="fas fa-calendar-minus"></i>
                                    </div>
                                    <div className={styles.timelineContent}>
                                        <h5>Trả phòng</h5>
                                        <div className={styles.timelineDate}>
                                            {formatDate(bookingData?.checkOutDate)}
                                        </div>
                                        <small>Thời gian check-out</small>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.bookingExtraInfo}>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>
                                        <i className="fas fa-users"></i>
                                        Số khách:
                                    </span>
                                    <span className={styles.value}>
                                        {bookingData?.numberOfGuest || 'Chưa xác định'} người
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>
                                        <i className="fas fa-user-tie"></i>
                                        Nhân viên lễ tân:
                                    </span>
                                    <span className={styles.value}>
                                        {receptionistInfo.name}
                                    </span>
                                </div>
                                {bookingData?.specialRequest && (
                                    <div className={`${styles.infoRow} ${styles.specialRequest}`}>
                                        <span className={styles.label}>
                                            <i className="fas fa-sticky-note"></i>
                                            Yêu cầu đặc biệt:
                                        </span>
                                        <span className={styles.value}>
                                            {bookingData.specialRequest}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Room Details Card */}
                    {roomDetails.hasRooms && (
                        <div className={styles.invoiceCard}>
                            <div className={styles.cardHeader}>
                                <h3>
                                    <i className="fas fa-bed"></i>
                                    Chi tiết phòng ({roomDetails.totalRooms} phòng)
                                </h3>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.roomsGrid}>
                                    {roomDetails.rooms.map((room, index) => (
                                        <div key={index} className={styles.roomCard}>
                                            <div className={styles.roomHeader}>
                                                <div className={styles.roomNumber}>
                                                    <i className="fas fa-door-open"></i>
                                                    {room.name}
                                                </div>
                                                <div className={styles.roomQuantity}>
                                                    x{room.quantity}
                                                </div>
                                            </div>
                                            <div className={styles.roomDetails}>
                                                <div className={styles.roomInfoItem}>
                                                    <i className="fas fa-clock"></i>
                                                    <span>{stayDuration.text}</span>
                                                </div>
                                                <div className={styles.roomPrice}>
                                                    <i className="fas fa-tag"></i>
                                                    {safeToLocaleString(room.unitPrice)}đ/đêm
                                                </div>
                                            </div>
                                            <div className={styles.roomTotal}>
                                                <strong>{safeToLocaleString(room.subTotal)}đ</strong>
                                            </div>
                                            {room.description && (
                                                <p className={styles.roomDescription}>
                                                    {room.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Services Info Card */}
                    {serviceDetails.hasServices && (
                        <div className={styles.invoiceCard}>
                            <div className={styles.cardHeader}>
                                <h3>
                                    <i className="fas fa-concierge-bell"></i>
                                    Dịch vụ đã chọn
                                </h3>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.servicesList}>
                                    {serviceDetails.services.map((service, index) => (
                                        <div key={index} className={styles.serviceItem}>
                                            <div className={styles.serviceIcon}>
                                                <i className="fas fa-star"></i>
                                            </div>
                                            <div className={styles.serviceInfo}>
                                                <h5>{service.name}</h5>
                                                <p>{service.description}</p>
                                            </div>
                                            <div className={styles.servicePrice}>
                                                {safeToLocaleString(service.price)}đ
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Promotions Info Card */}
                    {promotionDetails.hasPromotions && (
                        <div className={styles.invoiceCard}>
                            <div className={styles.cardHeader}>
                                <h3>
                                    <i className="fas fa-tags"></i>
                                    Khuyến mãi áp dụng
                                </h3>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.promotionsList}>
                                    {promotionDetails.promotions.map((promotion, index) => (
                                        <div key={index} className={styles.promotionItem}>
                                            <div className={styles.promotionIcon}>
                                                <i className="fas fa-gift"></i>
                                            </div>
                                            <div className={styles.promotionInfo}>
                                                <h5>{promotion.name}</h5>
                                                <p>Giảm {promotion.discountPercent}%</p>
                                                {promotion.startDate && promotion.endDate && (
                                                    <small>
                                                        Có hiệu lực: {formatDateOnly(promotion.startDate)} - {formatDateOnly(promotion.endDate)}
                                                    </small>
                                                )}
                                            </div>
                                            <div className={styles.promotionDiscount}>
                                                -{promotion.discountPercent}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Total Summary Card */}
                    <div className={styles.invoiceCard}>
                        <div className={styles.cardHeader}>
                            <h3>
                                <i className="fas fa-calculator"></i>
                                Tổng kết thanh toán
                            </h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.summaryRows}>
                                <div className={styles.summaryRow}>
                                    <span>Tổng tiền phòng:</span>
                                    <span>{safeToLocaleString(totals.roomTotal)}đ</span>
                                </div>
                                {totals.serviceTotal > 0 && (
                                    <div className={styles.summaryRow}>
                                        <span>Tổng dịch vụ:</span>
                                        <span>{safeToLocaleString(totals.serviceTotal)}đ</span>
                                    </div>
                                )}
                                {totals.lateCheckoutFee > 0 && (
                                    <div className={`${styles.summaryRow} ${styles.feeRow}`}>
                                        <span className={styles.feeLabel}>
                                            <i className="fas fa-clock"></i>
                                            Phí checkout muộn:
                                        </span>
                                        <span>{safeToLocaleString(totals.lateCheckoutFee)}đ</span>
                                    </div>
                                )}
                                
                                <div className={`${styles.summaryRow} ${styles.subtotal}`}>
                                  <span><strong>Tạm tính:</strong></span>
                                  <span><strong>{safeToLocaleString(totals.subtotal)}đ</strong></span>
                                </div>
                                
                                {totals.promotionDiscount > 0 && (
                                  <div className={`${styles.summaryRow} ${styles.discount}`}>
                                    <span>Khuyến mãi:</span>
                                    <span>-{safeToLocaleString(totals.promotionDiscount)}đ</span>
                                  </div>
                                )}
                                
                                <div className={`${styles.summaryRow} ${styles.total}`}>
                                  <span><strong>Tổng cộng:</strong></span>
                                  <span><strong>{safeToLocaleString(totals.finalTotal)}đ</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Section */}
                    <div className={styles.actionButtonsSection}>
                        <div className={styles.invoiceCard}>
                            <div className={styles.cardBody}>
                                <button 
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                    onClick={() => navigate('/receptionist/booking')}
                                >
                                    <i className="fas fa-arrow-left"></i> Quay lại
                                </button>
                                
                                <button 
                                    className={`${styles.btn} ${styles.btnSuccess} ${styles.btnLg}`}
                                    onClick={proceedToPayment}
                                    disabled={confirmingPayment || !invoice?.InvoiceID}
                                >
                                    <i className="fas fa-credit-card"></i> 
                                    {confirmingPayment ? ' Đang xử lý...' : ' Xác nhận & Thanh toán'}
                                </button>
                            </div>
                            
                            <div className={styles.cardFooter}>
                                <small>
                                    Bạn sẽ thanh toán cọc 50% = {safeToLocaleString(Math.round(totals.finalTotal * 0.5))}đ
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.sidebarContent}>
                    {/* Quick Summary Card */}
                    <div className={styles.invoiceCard}>
                        <div className={styles.cardHeader}>
                            <h3>
                                <i className="fas fa-receipt"></i>
                                Tóm tắt
                            </h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Khách hàng:</span>
                                    <span className={styles.value}>{guestInfo.name}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Số đêm:</span>
                                    <span className={styles.value}>{stayDuration.nights} đêm</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Số phòng:</span>
                                    <span className={styles.value}>{roomDetails.length} phòng</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Tổng tiền:</span>
                                    <span className={`${styles.value} ${styles.total}`}>
                                        {safeToLocaleString(totals.finalTotal)}đ
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* ✅ Enhanced Action Buttons Section */}
                    <div className={styles.invoiceCard}>
                        <div className={styles.cardHeader}>
                            <h3>
                                <i className="fas fa-cogs"></i>
                                Thao tác
                            </h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.actionButtonsSection}>
                                {/* ✅ THÊM: Print Preview Button */}
                                <button
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}
                                    onClick={handlePrintPreview}
                                    disabled={!invoice}
                                >
                                    <i className="fas fa-print"></i>
                                    Xem trước & In hóa đơn
                                </button>
                                
                                {/* ✅ Back to Booking */}
                                <button
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}
                                    onClick={handleBackToBooking}
                                >
                                    <i className="fas fa-arrow-left"></i>
                                    Quay lại Booking
                                </button>
                                
                                {/* ✅ Proceed to Payment */}
                                <button
                                    className={`${styles.btn} ${styles.btnSuccess} ${styles.btnLg}`}
                                    onClick={proceedToPayment}
                                    disabled={confirmingPayment || !invoice}
                                >
                                    {confirmingPayment ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-credit-card"></i>
                                            Tiến hành thanh toán
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ THÊM: Print Modal */}
            <InvoicePrint
                isOpen={showPrintModal}
                onClose={handleClosePrintModal}
                invoiceData={getInvoicePrintData()}
                loading={loading}
            />
        </div>
    );
};

export default InvoiceReview;