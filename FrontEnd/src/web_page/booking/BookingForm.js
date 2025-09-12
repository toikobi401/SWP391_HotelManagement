import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ THÊM NẾU CHƯA CÓ
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Import custom hooks
import { useBookingData } from './hooks/useBookingData';
import { useBookingValidation } from './hooks/useBookingValidation';
import { usePricing } from './hooks/usePricing';
import { usePromotions } from './hooks/usePromotions';
import { useServices } from './hooks/useServices';
import { useGuestManagement } from './hooks/useGuestManagement';

// Import components
import CustomerInfoSection from './components/CustomerInfoSection';
import DateTimeSection from './components/DateTimeSection';
import RoomTypeSelection from './components/RoomTypeSelection';
import ServicesSection from './components/ServicesSection';
import PromotionSection from './components/PromotionSection';
import PricingSummary from './components/PricingSummary';
import RoomTypeModal from './components/RoomTypeModal';
import ServiceModal from './components/ServiceModal';
import RoomSelectionModal from './components/RoomSelectionModal';

import styles from './BookingForm.module.css';

const BookingForm = () => {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    
    // State for modals
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    // ✅ State cho room selection modal
    const [showRoomSelectionModal, setShowRoomSelectionModal] = useState(false);
    const [createdBookingData, setCreatedBookingData] = useState(null);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [selectedActualRooms, setSelectedActualRooms] = useState([]);

    // ✅ Flag để prevent double invoice creation
    const [invoiceCreating, setInvoiceCreating] = useState(false);
    const invoiceCreatedRef = useRef(false);

    // Custom hooks
    const {
      formData,
      setFormData,
      roomTypes,
      roomTypesLoading,
      roomTypesError,
      handleInputChange,
      retryFetchRoomTypes,
      getRoomTypeById,
      checkRoomAvailability,
      addRoomType,
      updateRoomQuantity,
      removeRoomType,
      clearAllRooms,
      getTotalRooms,
      getTotalPrice,
      getMaxGuestsCapacity,
      isRoomTypeSelected,
      getSelectedRoomQuantity
    } = useBookingData();

    const serviceState = useServices();
    const { availableServices, servicesLoading } = serviceState;

    // Promotions hook
    const {
      promotions,
      promotionsLoading,
      appliedPromotion,
      promotionCode,
      setPromotionCode,
      applyPromotion,
      removePromotion,
      validatePromotionCode,
      calculateDiscount,
      calculateFinalAmount
    } = usePromotions();

    const {
      validationErrors,
      validateDateTime,
      validateForm,
      setDefaultTime
    } = useBookingValidation();

    // Pricing with promotion support
    const { pricingBreakdown, calculateServiceTotal } = usePricing(
      formData,
      roomTypes,
      formData.selectedServices,
      availableServices,
      appliedPromotion
    );

    // Guest Management Hook
    const {
      guestLoading,
      existingGuest,
      createOrUpdateGuest,
      validateGuestData,
      checkExistingGuest
    } = useGuestManagement();

    // Service handlers
    const handleServiceToggle = (serviceId) => {
      setFormData(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.includes(serviceId)
          ? prev.selectedServices.filter(id => id !== serviceId)
          : [...prev.selectedServices, serviceId]
      }));
    };

    // Enhanced input change handler
    const handleEnhancedInputChange = (e) => {
      handleInputChange(e);
      
      // Additional validation for specific fields
      if (e.target.name === 'phoneNumber' && e.target.value.length >= 10) {
        // Trigger guest check after a delay
        setTimeout(() => {
          checkExistingGuest(e.target.value);
        }, 500);
      }
    };

    // Guest data change handler
    const handleGuestDataChange = (guestData) => {
      if (guestData) {
        // Auto-fill form with guest data
        setFormData(prev => ({
          ...prev,
          customerName: guestData.guestName || prev.customerName,
          email: guestData.guestEmail || prev.email,
          phoneNumber: guestData.guestPhoneNumber || prev.phoneNumber
        }));
      }
    };

    // Promotion handlers
    const handleApplyPromotion = (promotion) => {
      const success = applyPromotion(promotion);
      if (success) {
        toast.success(`Áp dụng khuyến mãi "${promotion.promotionName}" thành công!`);
      }
    };

    const handleRemovePromotion = () => {
      const removedPromotion = appliedPromotion;
      removePromotion();
      if (removedPromotion) {
        toast.info(`Đã bỏ khuyến mãi "${removedPromotion.promotionName}"`);
      }
    };

    // ✅ SỬA: handleSubmit - Đảm bảo tạo guest TRƯỚC khi tạo booking
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (submitLoading || invoiceCreating || invoiceCreatedRef.current) {
        console.log('⚠️ Submit already in progress or completed');
        return;
      }

      setSubmitLoading(true);

      try {
        console.log('📝 Starting booking submission process...');
        
        // ✅ BƯỚC 1: Validate form trước
        if (!validateForm(formData)) {
          toast.error('Vui lòng kiểm tra lại thông tin đã nhập');
          return;
        }

        // ✅ BƯỚC 2: TẠO GUEST TRƯỚC (BẮT BUỘC)
        console.log('👤 Step 1: Creating/checking guest...');
        try {
          const guestResult = await createOrUpdateGuest({
            phoneNumber: formData.phoneNumber || formData.walkInGuestPhoneNumber,
            customerName: formData.customerName,
            email: formData.email
          });
          
          if (!guestResult) {
            throw new Error('Không thể tạo thông tin khách hàng');
          }
          
          console.log('✅ Guest created/verified successfully:', guestResult.guestPhoneNumber);
        } catch (guestError) {
          console.error('❌ Guest creation failed:', guestError);
          toast.error(`Lỗi tạo thông tin khách: ${guestError.message}`);
          return;
        }

        // ✅ BƯỚC 3: Tiếp tục tạo booking (logic hiện tại)
        console.log('🏨 Step 2: Creating booking...');
        
        // ✅ ENHANCED: Validate với explicit formData reference
        console.log('🔍 Validating form with data:', {
            formData,
            hasFormData: !!formData,
            formDataKeys: formData ? Object.keys(formData) : [],
            hasCustomerName: !!formData?.customerName,
            hasPhoneNumber: !!formData?.phoneNumber,
            selectedPromotions: formData?.selectedPromotions || []
        });
        
        const isValid = validateForm(formData);
        if (!isValid) {
            toast.error('Vui lòng kiểm tra lại thông tin đã nhập');
            return;
        }

        // ✅ ENHANCED: Tạo booking payload với promotion data rõ ràng
        const bookingPayload = {
            receptionistID: user?.UserID,
            numberOfGuest: parseInt(formData.numberOfGuests), // ✅ FIX: Parse to number
            specialRequest: formData.specialRequests || formData.specialRequest || '',
            bookingType: 0, // Walk-in
            guestID: formData.phoneNumber?.replace(/\s/g, '') || formData.walkInGuestPhoneNumber?.replace(/\s/g, ''),
            walkInGuestPhoneNumber: formData.phoneNumber?.replace(/\s/g, '') || formData.walkInGuestPhoneNumber?.replace(/\s/g, ''),
            
            // ✅ QUAN TRỌNG: Đảm bảo promotions được map đúng format
            selectedPromotions: (appliedPromotion ? [{
                promotionID: appliedPromotion.promotionID,
                promotionName: appliedPromotion.promotionName,
                discountPercent: appliedPromotion.discountPercent,
                description: appliedPromotion.description
            }] : []),
            
            // ✅ Services
            selectedServices: formData.selectedServices?.map(serviceId => ({
                serviceID: parseInt(serviceId)
            })) || [],
            
            // ✅ Optional fields
            ...(formData.checkIn && { checkInDate: formData.checkIn }),
            ...(formData.checkOut && { checkOutDate: formData.checkOut })
        };

        console.log('💾 Creating walk-in booking with payload:', {
            ...bookingPayload,
            selectedPromotionsCount: bookingPayload.selectedPromotions.length,
            selectedServicesCount: bookingPayload.selectedServices.length,
            // ✅ THÊM: Debug promotion info
            promotionDetails: bookingPayload.selectedPromotions,
            appliedPromotionInfo: appliedPromotion
        });

        // ✅ Gửi API request
        const response = await fetch('http://localhost:3000/api/bookings/walk-in', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingPayload)
        });

        const result = await response.json();
        
        // ✅ FIX: Enhanced response logging để debug
        console.log('📊 API Response received:', {
          ok: response.ok,
          status: response.status,
          resultKeys: Object.keys(result || {}),
          resultSuccess: result?.success,
          resultBookingID: result?.bookingID,
          resultData: result?.data,
          fullResult: result
        });

        if (response.ok && result.success) {
          console.log('✅ Booking created successfully:', result);
          
          // ✅ FIX: Trích xuất bookingID từ multiple possible locations
          const extractedBookingID = result.bookingID || 
                                 result.data?.bookingID || 
                                 result.data?.BookingID ||
                                 result.id;
          
          if (!extractedBookingID) {
            console.error('❌ No bookingID found in response:', result);
            throw new Error('Không thể lấy booking ID từ response');
          }
          
          console.log('🎯 Extracted bookingID:', extractedBookingID);
          
          // ✅ FIX: Tạo booking data với bookingID đúng
          const bookingData = {
            bookingID: extractedBookingID,        // ✅ QUAN TRỌNG: Sử dụng extracted ID
            bookingId: extractedBookingID,        // ✅ Alternative field name
            guestName: formData.customerName,
            guestPhone: formData.phoneNumber,
            guestEmail: formData.email,           // ✅ THÊM: Guest email từ formData
            numberOfGuest: formData.numberOfGuests,
            checkInDate: formData.checkIn,
            checkOutDate: formData.checkOut,
            specialRequest: formData.specialRequests,
            
            // ✅ THÊM: Service & promotion data
            selectedRooms: formData.selectedRooms,
            selectedServices: formData.selectedServices,
            selectedPromotions: appliedPromotion ? [appliedPromotion] : [],
            availableServices,
            roomTypes,
            
            // ✅ SỬA: Pricing data với đúng tên field roomSubtotal
            pricing: {
              roomSubtotal: pricingBreakdown.roomSubtotal,        // ✅ QUAN TRỌNG: Đúng tên field
              servicesSubtotal: pricingBreakdown.servicesSubtotal,  
              lateCheckoutFee: pricingBreakdown.lateCheckoutFee,
              promotionDiscount: pricingBreakdown.promotionDiscount,
              finalTotal: pricingBreakdown.finalTotal
            },
            
            // ✅ THÊM: Response metadata
            responseData: result.data,
            createdAt: new Date().toISOString()
          };
          
          console.log('📊 Setting created booking data:', {
            hasBookingID: !!bookingData.bookingID,
            bookingID: bookingData.bookingID,
            roomsCount: bookingData.selectedRooms?.length || 0,
            servicesCount: bookingData.selectedServices?.length || 0
          });
          
          setCreatedBookingData(bookingData);
          
          // ✅ FIX: Fetch available rooms với bookingID đúng
          await fetchAvailableRoomsForBooking(bookingData);
          
        } else {
          console.error('❌ Booking creation failed:', result);
          const errorMessage = result.message || 'Tạo booking thất bại';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('❌ Error submitting booking:', error);
        toast.error(error.message || 'Có lỗi xảy ra khi tạo booking');
      } finally {
        setSubmitLoading(false);
      }
    };

    // ✅ THÊM: Calculate nights helper
    const calculateNights = (checkIn, checkOut) => {
      if (!checkIn || !checkOut) return 1;
      
      try {
          const checkInDate = new Date(checkIn);
          const checkOutDate = new Date(checkOut);
          
          if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
              return 1;
          }
          
          const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
          return Math.max(1, Math.ceil(timeDifference / (1000 * 3600 * 24)));
      } catch (error) {
          console.error('Error calculating nights:', error);
          return 1;
      }
    };
  
    // ✅ THÊM: Fetch available rooms for booking
    // ✅ SỬA: fetchAvailableRoomsForBooking - Lưu room requirements vào bookingData
    const fetchAvailableRoomsForBooking = async (bookingData) => {
      console.log('🔍 fetchAvailableRoomsForBooking called with:', {
        bookingData: !!bookingData,
        selectedRooms: formData.selectedRooms,
        selectedRoomsLength: formData.selectedRooms?.length || 0
      });

      // ✅ Enhanced validation (keeping existing logic)
      if (!bookingData) {
        console.error('❌ Invalid booking data: bookingData is null/undefined');
        throw new Error('Booking data is missing');
      }

      if (!bookingData.bookingID && !bookingData.bookingId) {
        console.error('❌ Invalid booking data: both bookingID and bookingId are missing', bookingData);
        throw new Error('Booking ID is missing from booking data');
      }

      if (!formData.selectedRooms || formData.selectedRooms.length === 0) {
        console.error('❌ No rooms selected for booking');
        throw new Error('No rooms selected for assignment');
      }

      try {
        console.log('🏨 Fetching available rooms for booking...');
        
        const bookingID = bookingData.bookingID || bookingData.bookingId;
        const requestedRoomTypes = formData.selectedRooms.map(room => ({
          roomTypeId: String(room.roomTypeId),
          quantity: parseInt(room.quantity)
        }));

        // ✅ Build query parameters using URLSearchParams (keeping existing fix)
        const params = new URLSearchParams();
        params.append('checkIn', formData.checkIn);
        params.append('checkOut', formData.checkOut);
        params.append('requestedRoomTypes', JSON.stringify(requestedRoomTypes));

        const url = `http://localhost:3000/api/rooms/available-for-booking?${params.toString()}`;

        console.log('📤 Fetching available rooms with params:', {
          bookingID,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          requestedRoomTypes,
          url
        });

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Failed to fetch available rooms:', errorData);
          throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch available rooms`);
        }

        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Available rooms fetched successfully:', result.data?.length || 0, 'rooms');
          
          const roomsArray = Array.isArray(result.data) ? result.data : [];
          setAvailableRooms(roomsArray);
          
          // ✅ FIX: Update bookingData với room requirements
          const updatedBookingData = {
            ...bookingData,
            selectedRooms: formData.selectedRooms,  // ✅ QUAN TRỌNG: Truyền requirements
            requestedRoomTypes: requestedRoomTypes,  // ✅ Alternative format
            roomRequirements: result.pagination?.roomRequirements || requestedRoomTypes  // ✅ From API response
          };
          
          console.log('📊 Updated booking data with room requirements:', {
            hasSelectedRooms: !!updatedBookingData.selectedRooms,
            selectedRoomsCount: updatedBookingData.selectedRooms?.length,
            hasRequestedRoomTypes: !!updatedBookingData.requestedRoomTypes,
            hasRoomRequirements: !!updatedBookingData.roomRequirements
          });
          
          setCreatedBookingData(updatedBookingData);
          
          // ✅ Hiển thị room selection modal với updated booking data
          setShowRoomSelectionModal(true);
          
          return roomsArray;
        } else {
          console.error('❌ Failed to fetch available rooms:', result);
          throw new Error(result.message || 'Không thể lấy danh sách phòng trống');
        }
      } catch (error) {
        console.error('❌ Error fetching available rooms:', error);
        toast.error(error.message || 'Lỗi khi tải danh sách phòng trống');
        throw error;
      }
    };

    // ✅ Handle room selection completion
    const handleRoomSelectionComplete = async (completionData) => {
      try {
        console.log('✅ Room selection completed:', completionData);
        
        // ✅ ENHANCED VALIDATION: Kiểm tra nhiều cách lấy bookingID
        const bookingID = completionData.bookingID || 
                         completionData.bookingData?.bookingID || 
                         completionData.bookingData?.bookingId ||
                         createdBookingData?.bookingID ||
                         createdBookingData?.bookingId;
        
        if (!bookingID) {
          console.error('❌ Missing bookingID in completionData:', {
            completionData,
            createdBookingData,
            availableKeys: {
              completionData: completionData ? Object.keys(completionData) : [],
              bookingData: completionData?.bookingData ? Object.keys(completionData.bookingData) : [],
              createdBookingData: createdBookingData ? Object.keys(createdBookingData) : []
            }
          });
          throw new Error('Booking ID không tồn tại trong dữ liệu hoàn thành');
        }

        // ✅ Extract selected rooms
        const selectedRooms = completionData.selectedRooms || [];
        
        if (!Array.isArray(selectedRooms) || selectedRooms.length === 0) {
          throw new Error('Không có phòng nào được chọn');
        }

        console.log(`🏨 Assigning ${selectedRooms.length} rooms to booking ${bookingID}...`);

        // ✅ Call API để assign rooms với proper format
        const assignResponse = await fetch(`http://localhost:3000/api/bookings/${bookingID}/assign-rooms`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            selectedRooms: selectedRooms.map(room => ({
              roomID: room.RoomID,
              checkInAt: completionData.bookingData?.checkInDate || formData.checkIn,
              checkOutAt: completionData.bookingData?.checkOutDate || formData.checkOut
            }))
          })
        });

        if (!assignResponse.ok) {
          const errorData = await assignResponse.json();
          throw new Error(errorData.message || `HTTP ${assignResponse.status}: Failed to assign rooms`);
        }

        const assignResult = await assignResponse.json();
        console.log('✅ Rooms assigned successfully:', assignResult);

        // ✅ Close room selection modal
        setShowRoomSelectionModal(false);
        setSelectedActualRooms(selectedRooms);

        // ✅ Success notification
        toast.success(`Đã gán ${selectedRooms.length} phòng cho booking #${bookingID}`);

        // ✅ Navigate to invoice với enhanced booking data BẰNG promotion data
        if (!invoiceCreating && !invoiceCreatedRef.current) {
          setInvoiceCreating(true);
          invoiceCreatedRef.current = true;

          try {
            console.log('📋 Creating invoice for completed booking...');
            
            // ✅ SỬA: Enhanced booking data với FULL promotion information
            const enhancedBookingData = {
              // ✅ Booking info
              bookingID: bookingID,
              bookingId: bookingID, // Alternative field
              bookingStatus: 'Confirmed',
              
              // ✅ Dates
              checkInDate: completionData.bookingData?.checkInDate || formData.checkIn,
              checkOutDate: completionData.bookingData?.checkOutDate || formData.checkOut,
              
              // ✅ Guest info
              numberOfGuest: completionData.bookingData?.numberOfGuest || formData.numberOfGuests,
              guestName: completionData.bookingData?.guestName || formData.customerName,
              guestPhone: completionData.bookingData?.walkInGuestPhoneNumber || formData.phoneNumber,
              
              // ✅ QUAN TRỌNG: Selected items với enhanced room type info
              selectedRooms: formData.selectedRooms.map(room => {
                const roomType = getRoomTypeById(room.roomTypeId);
                return {
                  ...room,
                  roomTypeName: roomType?.name || `Loại ${room.roomTypeId}`,
                  roomTypePrice: roomType?.price || 0,
                  basePrice: roomType?.price || 0
                };
              }),
              selectedServices: formData.selectedServices,
              
              // ✅ SỬA: Đảm bảo promotion data được truyền đầy đủ
              selectedPromotions: appliedPromotion ? [{
                promotionID: appliedPromotion.promotionID,
                promotionName: appliedPromotion.promotionName,
                discountPercent: appliedPromotion.discountPercent,
                description: appliedPromotion.description,
                startDate: appliedPromotion.startDate,
                endDate: appliedPromotion.endDate
              }] : [],
              
              // ✅ THÊM: Available data để tính pricing
              availableServices: availableServices,
              roomTypes: roomTypes, // ✅ Truyền room types để có pricing
              
              // ✅ Assigned rooms
              assignedRooms: selectedRooms,
              
              // ✅ SỬA: Enhanced pricing info với promotion
              totalPrice: pricingBreakdown?.originalTotal || pricingBreakdown?.totalPrice || 0,
              promotionDiscount: pricingBreakdown?.promotionDiscount || 0,
              finalTotal: pricingBreakdown?.finalTotal || pricingBreakdown?.totalPrice || 0,
              
              // ✅ THÊM: Applied promotion info
              appliedPromotionInfo: appliedPromotion ? {
                promotionName: appliedPromotion.promotionName,
                discountPercent: appliedPromotion.discountPercent,
                promotionID: appliedPromotion.promotionID
              } : null,
              
              // ✅ Additional data
              specialRequest: formData.specialRequests,
              appliedPromotion: appliedPromotion
            };

            console.log('📊 Enhanced booking data for invoice:', {
              bookingID: enhancedBookingData.bookingID,
              selectedRoomsCount: enhancedBookingData.selectedRooms?.length,
              roomTypesCount: enhancedBookingData.roomTypes?.length,
              hasRoomPricing: enhancedBookingData.selectedRooms?.some(r => r.roomTypePrice > 0),
              // ✅ THÊM: Promotion debugging
              hasPromotion: !!enhancedBookingData.appliedPromotion,
              promotionName: enhancedBookingData.appliedPromotion?.promotionName,
              promotionDiscount: enhancedBookingData.promotionDiscount,
              selectedPromotionsCount: enhancedBookingData.selectedPromotions?.length
            });

            // ✅ SỬA: Đường dẫn đúng từ invoice/review → invoice-review
            navigate('/invoice-review', {
              state: {
                bookingData: enhancedBookingData,
                fromBooking: true
              }
            });

          } catch (invoiceError) {
            console.error('❌ Error creating invoice:', invoiceError);
            toast.error('Lỗi tạo hóa đơn, vui lòng thử lại');
            setInvoiceCreating(false);
            invoiceCreatedRef.current = false;
          }
        }

      } catch (error) {
        console.error('❌ Error completing room selection:', error);
        toast.error(`Lỗi hoàn thành chọn phòng: ${error.message}`);
        setShowRoomSelectionModal(false);
      }
    };

    // ✅ THÊM: Reset flags khi component unmount
    useEffect(() => {
      return () => {
        invoiceCreatedRef.current = false;
        setInvoiceCreating(false);
      };
    }, []);

    // Modal handlers
    const openServiceModal = () => {
      setShowRoomTypeModal(false);
      setShowServiceModal(true);
    };

    const openRoomTypeModal = () => {
      setShowServiceModal(false);
      setShowRoomTypeModal(true);
    };

    const closeAllModals = () => {
      setShowServiceModal(false);
      setShowRoomTypeModal(false);
    };

    // Add class for wrapper when modal is open
    const wrapperClasses = `${styles.bookingFormWrapper} ${
      (showServiceModal || showRoomTypeModal) ? styles.modalOpen : ''
    }`;

    // Calculate totals for pricing summary
    const totalAmount = pricingBreakdown.originalTotal || pricingBreakdown.totalPrice || 0;
    const discountAmount = appliedPromotion ? calculateDiscount(totalAmount) : 0;
    const finalAmount = appliedPromotion ? calculateFinalAmount(totalAmount) : totalAmount;

    // ✅ THÊM: Handle cancel room selection
    const handleCancelRoomSelection = () => {
        console.log('🚫 Cancelling room selection...');
        
        // Reset room selection states
        setShowRoomSelectionModal(false);
        setCreatedBookingData(null);
        setAvailableRooms([]);
        setSelectedActualRooms([]);
        
        // Reset form states
        setSubmitLoading(false);
        setInvoiceCreating(false);
        invoiceCreatedRef.current = false;
        
        toast.info('Đã hủy chọn phòng');
    };

    // ✅ THÊM: Debug helper để kiểm tra form state
    useEffect(() => {
      console.log('🔍 BookingForm - formData state:', {
        formDataExists: !!formData,
        formDataType: typeof formData,
        formDataKeys: formData ? Object.keys(formData) : [],
        customerName: formData?.customerName,
        phoneNumber: formData?.phoneNumber,
        email: formData?.email,
        selectedRooms: formData?.selectedRooms?.length || 0
      });
    }, [formData]);

    return (
      <div className={wrapperClasses}>
        {/* Header Section */}
        <div className={styles.bookingHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.formTitle}>Đặt phòng khách sạn</h1>
            <p className={styles.formSubtitle}>
              Điền thông tin để tạo booking mới cho khách hàng
            </p>
            
            {/* Progress Steps */}
            <div className={styles.progressSteps}>
              <div className={`${styles.step} ${formData.checkIn && formData.checkOut ? styles.completed : styles.active}`}>
                <div className={styles.stepNumber}>1</div>
                <span className={styles.stepLabel}>Thời gian</span>
              </div>
              <div className={`${styles.step} ${formData.selectedRooms.length > 0 ? styles.completed : formData.checkIn && formData.checkOut ? styles.active : ''}`}>
                <div className={styles.stepNumber}>2</div>
                <span className={styles.stepLabel}>Chọn phòng</span>
              </div>
              <div className={`${styles.step} ${formData.customerName && formData.phoneNumber ? styles.completed : formData.selectedRooms.length > 0 ? styles.active : ''}`}>
                <div className={styles.stepNumber}>3</div>
                <span className={styles.stepLabel}>Thông tin KH</span>
              </div>
              <div className={`${styles.step} ${totalAmount > 0 ? styles.active : ''}`}>
                <div className={styles.stepNumber}>4</div>
                <span className={styles.stepLabel}>Xác nhận</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Container */}
        <div className={styles.bookingFormContainer}>
          <form onSubmit={handleSubmit} className={styles.formLayout}>
            {/* Left Column - Main Form */}
            <div className={styles.leftColumn}>
              {/* Date Time Section */}
              <div className={styles.formStep}>
                <div className={styles.stepBadge}>Bước 1</div>
                <DateTimeSection
                  formData={formData}
                  handleInputChange={handleEnhancedInputChange}
                  validationErrors={validationErrors}
                  validateDateTime={validateDateTime}
                  setDefaultTime={setDefaultTime}
                />
              </div>

              {/* Room Type Selection */}
              <div className={styles.formStep}>
                <div className={styles.stepBadge}>Bước 2</div>
                <RoomTypeSelection
                  formData={formData}
                  handleInputChange={handleEnhancedInputChange}
                  roomTypes={roomTypes}
                  roomTypesLoading={roomTypesLoading}
                  roomTypesError={roomTypesError}
                  retryFetchRoomTypes={retryFetchRoomTypes}
                  validationErrors={validationErrors}
                  addRoomType={addRoomType}
                  updateRoomQuantity={updateRoomQuantity}
                  removeRoomType={removeRoomType}
                  clearAllRooms={clearAllRooms}
                  getTotalRooms={getTotalRooms}
                  getTotalPrice={getTotalPrice}
                  getMaxGuestsCapacity={getMaxGuestsCapacity}
                  isRoomTypeSelected={isRoomTypeSelected}
                  getSelectedRoomQuantity={getSelectedRoomQuantity}
                  checkRoomAvailability={checkRoomAvailability}
                  openRoomTypeModal={openRoomTypeModal}
                />
              </div>

              {/* Services Section */}
              <div className={styles.formStep}>
                <div className={styles.stepBadge}>Tùy chọn</div>
                <ServicesSection
                  selectedServices={formData.selectedServices}
                  availableServices={availableServices}
                  servicesLoading={servicesLoading}
                  setShowServiceModal={openServiceModal}
                  handleServiceToggle={handleServiceToggle}
                />
              </div>

              {/* Promotion Section */}
              <div className={styles.formStep}>
                <div className={styles.stepBadge}>Khuyến mãi</div>
                <PromotionSection
                  promotions={promotions}
                  promotionsLoading={promotionsLoading}
                  appliedPromotion={appliedPromotion}
                  promotionCode={promotionCode}
                  setPromotionCode={setPromotionCode}
                  onApplyPromotion={handleApplyPromotion}
                  onRemovePromotion={handleRemovePromotion}
                  onValidateCode={validatePromotionCode}
                  totalAmount={totalAmount}
                  discountAmount={discountAmount}
                  finalAmount={finalAmount}
                />
              </div>

              {/* Customer Info Section */}
              <div className={styles.formStep}>
                <div className={styles.stepBadge}>Bước 3</div>
                <CustomerInfoSection
                  formData={formData}
                  handleInputChange={handleEnhancedInputChange}
                  validationErrors={validationErrors}
                  onGuestDataChange={handleGuestDataChange}
                />
              </div>

              {/* Special Requests */}
              <div className={styles.formStep}>
                <div className={styles.stepBadge}>Ghi chú</div>
                <div className={styles.formSection}>
                  <h3><i className="fas fa-clipboard"></i> Yêu cầu đặc biệt</h3>
                  <div className={styles.field}>
                    <label htmlFor="specialRequests">
                      <i className="fas fa-comment"></i> Ghi chú thêm
                    </label>
                    <textarea
                      id="specialRequests"
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleEnhancedInputChange}
                      placeholder="Nhập yêu cầu đặc biệt (nếu có)..."
                      rows="3"
                    />
                    <small className={styles.fieldHint}>
                      <i className="fas fa-info-circle"></i>
                      VD: Tầng cao, view biển, phòng không hút thuốc...
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sticky Summary */}
            <div className={styles.rightColumn}>
              <div className={styles.stickySummary}>
                {/* Quick Info Card */}
                {(formData.checkIn || formData.customerName || getTotalRooms() > 0) && (
                  <div className={styles.quickInfoCard}>
                    <h4><i className="fas fa-info-circle"></i> Thông tin nhanh</h4>
                    
                    {formData.customerName && (
                      <div className={styles.quickInfoItem}>
                        <span className={styles.infoLabel}>Khách hàng:</span>
                        <span className={styles.infoValue}>
                          {formData.customerName}
                          {existingGuest && (
                            <span className="badge bg-success ms-2">
                              <i className="fas fa-user-check"></i> Khách cũ
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {formData.checkIn && formData.checkOut && (
                      <div className={styles.quickInfoItem}>
                        <span className={styles.infoLabel}>Thời gian:</span>
                        <span className={styles.infoValue}>
                          {new Date(formData.checkIn).toLocaleDateString('vi-VN')} - {new Date(formData.checkOut).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    )}
                    
                    {getTotalRooms() > 0 && (
                      <div className={styles.quickInfoItem}>
                        <span className={styles.infoLabel}>Phòng:</span>
                        <span className={styles.infoValue}>
                          {getTotalRooms()} phòng, {getMaxGuestsCapacity()} người tối đa
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing Summary */}
                <PricingSummary
                  pricingBreakdown={pricingBreakdown}
                  formData={formData}
                  roomTypes={roomTypes}
                />

                {/* Submit Section */}
                <div className={styles.stickySubmit}>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={submitLoading || !formData.customerName || !formData.phoneNumber || getTotalRooms() === 0}
                  >
                    {submitLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle"></i>
                        Tạo booking
                        {finalAmount > 0 && (
                          <div className={styles.submitPrice}>
                            {appliedPromotion ? (
                              <>
                                <span className={styles.originalPrice}>
                                  {totalAmount.toLocaleString('vi-VN')}đ
                                </span>
                                <span className={styles.discountedPrice}>
                                  {finalAmount.toLocaleString('vi-VN')}đ
                                </span>
                              </>
                            ) : (
                              <span>{finalAmount.toLocaleString('vi-VN')}đ</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </button>

                  {/* Trust Badges */}
                  <div className={styles.trustBadges}>
                    <div className={styles.trustBadge}>
                      <i className="fas fa-shield-alt"></i>
                      <span>An toàn</span>
                    </div>
                    <div className={styles.trustBadge}>
                      <i className="fas fa-clock"></i>
                      <span>Nhanh chóng</span>
                    </div>
                    <div className={styles.trustBadge}>
                      <i className="fas fa-headset"></i>
                      <span>Hỗ trợ 24/7</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Modals */}
          <ServiceModal
            showServiceModal={showServiceModal}
            setShowServiceModal={setShowServiceModal}
            serviceState={serviceState}
            selectedServices={formData.selectedServices}
            handleServiceToggle={handleServiceToggle}
            calculateServiceTotal={() => calculateServiceTotal(formData.selectedServices, availableServices)}
          />

          <RoomTypeModal
            showRoomTypeModal={showRoomTypeModal}
            setShowRoomTypeModal={setShowRoomTypeModal}
            roomTypes={roomTypes}
            roomTypesLoading={roomTypesLoading}
            selectedRooms={formData.selectedRooms}
            addRoomType={addRoomType}
            updateRoomQuantity={updateRoomQuantity}
            removeRoomType={removeRoomType}
            isRoomTypeSelected={isRoomTypeSelected}
            getSelectedRoomQuantity={getSelectedRoomQuantity}
            checkRoomAvailability={checkRoomAvailability}
          />

          {/* ✅ THÊM: Room Selection Modal */}
          {showRoomSelectionModal && (
            <RoomSelectionModal
              isOpen={showRoomSelectionModal}
              onClose={handleCancelRoomSelection}
              bookingData={createdBookingData}
              availableRooms={availableRooms}
              onRoomSelectionComplete={handleRoomSelectionComplete}
              selectedRooms={selectedActualRooms}
              setSelectedRooms={setSelectedActualRooms}
            />
          )}
        </div>

        {/* Loading overlay for booking creation */}
        {submitLoading && (
          <div className={styles.formLoading}>
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Đang tạo booking...</span>
            </div>
            <p>Đang tạo booking, vui lòng chờ...</p>
          </div>
        )}
      </div>
    );
  };
  
  // ✅ THÊM: Helper functions để tính toán pricing
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return 0;
      }
      
      const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
      return Math.max(0, Math.ceil(timeDifference / (1000 * 3600 * 24)));
    } catch (error) {
      console.error('Error calculating nights:', error);
      return 0;
    }
  };
  
  // ✅ THÊM: Function tính late checkout fee (KHÔNG XÓA GÌ CẢ)
  const calculateLateCheckoutFee = (checkOut, selectedRooms, roomTypes) => {
    if (!checkOut || !selectedRooms || !Array.isArray(selectedRooms) || !Array.isArray(roomTypes)) return 0;
    
    try {
      const checkOutDate = new Date(checkOut);
      if (isNaN(checkOutDate.getTime())) return 0;
      
      const checkOutHour = checkOutDate.getHours();
      const checkOutMinute = checkOutDate.getMinutes();
      const checkOutTime = checkOutHour + (checkOutMinute / 60);
      
      // CHỈ tính phí khi SAU 11:30
      if (checkOutTime <= 11.5) return 0;
      
      const hoursOverdue = Math.ceil(checkOutTime - 11.5);
      
      let totalLateFee = 0;
      
      selectedRooms.forEach(room => {
        if (!room || !room.roomTypeId) return;
        
        const roomType = roomTypes.find(rt => rt.id === String(room.roomTypeId));
        if (!roomType) return;
        
        const roomPricePerNight = roomType.price || 0;
        const quantity = room.quantity || 0;
        
        const feePerRoomPerHour = roomPricePerNight * 0.1;
        const roomLateFee = feePerRoomPerHour * hoursOverdue * quantity;
        
        totalLateFee += roomLateFee;
      });
      
      return totalLateFee;
    } catch (error) {
      console.error('Error calculating late checkout fee:', error);
      return 0;
    }
  };
  
  // ✅ SỬA: redirectToInvoiceReview - Enhanced booking data preparation
  const redirectToInvoiceReview = (completedBookingData) => {
    try {
        console.log('📋 Creating invoice for completed booking...');
        
        // ✅ Ensure we have all required data
        if (!completedBookingData || !completedBookingData.bookingID) {
            throw new Error('Completed booking data is missing or invalid');
        }

        // ✅ SỬA: Enhanced booking data với tất cả thông tin cần thiết
        const enhancedBookingData = {
            // ✅ Core booking info
            bookingID: completedBookingData.bookingID,
            bookingId: completedBookingData.bookingID, // ✅ Dual format
            bookingStatus: completedBookingData.bookingStatus || 'Confirmed',
            
            // ✅ Guest info
            guestName: formData.customerName,
            guestPhone: formData.phoneNumber || formData.walkInGuestPhoneNumber,
            guestEmail: formData.email,
            numberOfGuest: formData.numberOfGuests,
            
            // ✅ Dates
            checkInDate: formData.checkIn,
            checkOutDate: formData.checkOut,
            specialRequest: formData.specialRequests,
            
            // ✅ Selected items with proper counts
            selectedRooms: formData.selectedRooms || [],
            selectedServices: formData.selectedServices || [],
            selectedPromotions: appliedPromotion ? [appliedPromotion] : [],
            
            // ✅ Additional data for invoice creation
            availableServices: availableServices || [],
            roomTypes: roomTypes || [],
            
            // ✅ Pricing information
            pricing: pricingBreakdown,
            totalPrice: pricingBreakdown.originalTotal || pricingBreakdown.totalPrice || 0,
            finalTotal: pricingBreakdown.finalTotal || pricingBreakdown.totalPrice || 0,
            
            // ✅ Metadata
            responseData: completedBookingData.responseData,
            createdAt: new Date().toISOString(),
            
            // ✅ CRITICAL: Counts for display
            requestedRoomTypes: formData.selectedRooms?.length || 0,
            selectedPromotions: appliedPromotion ? 1 : 0,
            selectedServices: formData.selectedServices?.length || 0,
            hasBookingData: true
        };

        console.log('📊 Enhanced booking data for invoice:', {
            bookingID: enhancedBookingData.bookingID,
            hasAllRequiredData: !!(enhancedBookingData.bookingID && enhancedBookingData.guestName),
            roomsCount: enhancedBookingData.selectedRooms?.length,
            servicesCount: enhancedBookingData.selectedServices?.length,
            promotionsCount: enhancedBookingData.selectedPromotions?.length,
            totalPrice: enhancedBookingData.totalPrice,
            finalTotal: enhancedBookingData.finalTotal
        });

        // ✅ SỬA: Navigate with proper state structure
        navigate('/receptionist/invoice-review', {
            state: {
                bookingData: enhancedBookingData,
                fromBooking: true // ✅ CRITICAL flag để trigger tạo invoice
            },
            replace: true // ✅ Replace để avoid back button issues
        });

    } catch (error) {
        console.error('❌ Error redirecting to invoice review:', error);
        toast.error('Lỗi khi chuyển đến trang tạo hóa đơn: ' + error.message);
    }
};

export default BookingForm;