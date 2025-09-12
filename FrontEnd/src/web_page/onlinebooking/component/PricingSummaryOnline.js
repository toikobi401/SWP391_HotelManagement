import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './PricingSummaryOnline.module.css';
 
const PricingSummaryOnline = ({
  formData,
  selectedRooms,
  selectedServices,
  selectedPromotion,
  availableServices = [],
  availableRoomTypes = [], // ✅ SỬA: Đảm bảo prop này được nhận
  pricingBreakdown = {},
  totalAmount = 0,
  promotionCalculation = {},
  prevStep,
  goToInvoice
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ SỬA: Sử dụng pricing breakdown từ hook
  const {
    roomSubtotal = 0,
    servicesSubtotal = 0,
    lateCheckoutFee = 0,
    nightCount = 0,
    roomsBreakdown = [],
    originalTotal = totalAmount,
    promotionDiscount = 0,
    finalTotal = totalAmount
  } = pricingBreakdown;

  // ✅ Sử dụng promotionCalculation nếu có, fallback về pricingBreakdown
  const effectiveOriginalAmount = promotionCalculation.originalAmount || originalTotal;
  const effectiveDiscountAmount = promotionCalculation.discountAmount || promotionDiscount;
  const effectiveFinalAmount = promotionCalculation.finalAmount || finalTotal;

  // ✅ THÊM: Function để xử lý đặt phòng online
  const handleConfirmBooking = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log('🌐 Confirming online booking...');

      // ✅ SỬA: Validate user từ AuthContext
      if (!user || !user.UserID) {
        toast.error('Vui lòng đăng nhập để đặt phòng');
        return;
      }

      // ✅ SỬA: Đảm bảo formData có đầy đủ thông tin
      if (!formData.checkIn || !formData.checkOut) {
        toast.error('Thiếu thông tin ngày nhận/trả phòng');
        return;
      }

      // ✅ SỬA: Prepare booking data với customerID từ AuthContext
      const bookingData = {
        // ✅ QUAN TRỌNG: Thêm customerID từ AuthContext
        customerID: user.UserID,
        
        // Booking details
        numberOfGuest: formData.numberOfGuest || 1,
        specialRequest: formData.specialRequest || null,
        
        // Dates từ formData
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        
        // Selected rooms với đầy đủ thông tin từ roomTypes
        selectedRooms: selectedRooms.map(room => {
          const roomTypeInfo = availableRoomTypes?.find(rt => 
            String(rt.id) === String(room.roomTypeId) || 
            String(rt.TypeId) === String(room.roomTypeId)
          );
          
          console.log('🏨 Room mapping:', {
            roomTypeId: room.roomTypeId,
            foundInfo: !!roomTypeInfo,
            roomTypeInfo,
            quantity: room.quantity
          });
          
          return {
            roomTypeId: parseInt(room.roomTypeId),
            quantity: parseInt(room.quantity),
            price: roomTypeInfo?.price || roomTypeInfo?.BasePrice || 0,
            name: roomTypeInfo?.name || roomTypeInfo?.TypeName || 'Unknown Room',
            // ✅ THÊM: Check-in và Check-out dates cho từng room type
            checkInAt: formData.checkIn,
            checkOutAt: formData.checkOut
          };
        }),
        
        // Selected services
        selectedServices: selectedServices || [],
        
        // Selected promotion
        selectedPromotion: selectedPromotion ? {
          promotionID: selectedPromotion.promotionID,
          promotionName: selectedPromotion.promotionName,
          discountPercent: selectedPromotion.discountPercent
        } : null,
        
        // Pricing breakdown
        pricing: {
          roomSubtotal,
          servicesSubtotal,
          lateCheckoutFee,
          nightCount,
          originalTotal: effectiveOriginalAmount,
          promotionDiscount: effectiveDiscountAmount,
          finalTotal: effectiveFinalAmount
        },
        
        // Total amount
        totalAmount: effectiveFinalAmount,
        
        // Booking type (1 = Online)
        bookingType: 1
      };

      console.log('📋 Booking data to submit:', {
        ...bookingData,
        user: {
          UserID: user.UserID,
          Username: user.Username,
          Email: user.Email
        }
      });

      // ✅ Validate booking data trước khi gửi
      if (!bookingData.selectedRooms || bookingData.selectedRooms.length === 0) {
        toast.error('Vui lòng chọn ít nhất một phòng');
        return;
      }

      if (bookingData.selectedRooms.some(room => !room.price || room.price <= 0)) {
        toast.error('Thông tin giá phòng không hợp lệ');
        return;
      }

      // ✅ Call API để tạo online booking
      const response = await fetch('http://localhost:3000/api/bookings/online/create', {
        method: 'POST',
        credentials: 'include', // ✅ Vẫn gửi credentials cho security
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Online booking created successfully:', result);
        
        setShowSuccess(true);
        toast.success('Đặt phòng thành công!');
        
        // ✅ SỬA: Navigate với đầy đủ state cần thiết cho InvoiceReview
        setTimeout(() => {
          navigate('/invoice-review', {
            state: {
              // ✅ QUAN TRỌNG: Đặt fromBooking = true để InvoiceReview biết cần tạo invoice
              fromBooking: true,
              
              // ✅ Booking data với đầy đủ thông tin - SỬA CONSISTENT NAMING
              bookingData: {
                ...bookingData,
                // ✅ QUAN TRỌNG: Đảm bảo tất cả ID fields nhất quán
                bookingID: result.data.bookingID,
                bookingId: result.data.bookingID, // ✅ THÊM: Backup field để tương thích
                invoiceID: result.data.invoiceID,
                invoiceId: result.data.invoiceID, // ✅ THÊM: Backup field
                customerID: result.data.customerID,
                customerId: result.data.customerID, // ✅ THÊM: Backup field
                bookingStatus: result.data.bookingStatus,
                paymentStatus: result.data.paymentStatus,
                
                // ✅ THÊM: Đảm bảo có đầy đủ thông tin cần thiết cho invoice
                checkInDate: bookingData.checkIn || bookingData.checkInDate,
                checkOutDate: bookingData.checkOut || bookingData.checkOutDate,
                guestName: formData.customerName || user?.Fullname || '',
                guestPhone: formData.phoneNumber || user?.PhoneNumber || '',
                guestEmail: formData.email || user?.Email || '',
                numberOfGuests: bookingData.numberOfGuest || bookingData.numberOfGuests || 1,
                specialRequest: bookingData.specialRequest || '',
                
                // ✅ THÊM: Room types data để InvoiceReview có thể resolve room names
                roomTypes: availableRoomTypes,
                availableServices: availableServices
              },
              
              // ✅ THÊM: Thông tin customer từ formData
              customerInfo: {
                customerName: formData.customerName || user?.Fullname || '',
                email: formData.email || user?.Email || '',
                phoneNumber: formData.phoneNumber || user?.PhoneNumber || '',
                userID: user?.UserID || null
              },
              
              // ✅ THÊM: Additional context cho InvoiceReview
              bookingType: 'online',
              totalAmount: effectiveFinalAmount,
              originalAmount: effectiveOriginalAmount,
              discountAmount: effectiveDiscountAmount,
              
              // ✅ THÊM: Pricing breakdown cho invoice display
              pricing: {
                roomSubtotal,
                servicesSubtotal,
                lateCheckoutFee,
                nightCount,
                finalTotal: effectiveFinalAmount
              }
            }
          });
        }, 2000);
        
      } else {
        console.error('❌ Failed to create online booking:', result);
        toast.error(result.message || 'Không thể tạo đặt phòng. Vui lòng thử lại.');
      }

    } catch (error) {
      console.error('❌ Error confirming online booking:', error);
      toast.error('Có lỗi xảy ra khi đặt phòng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };
  // ✅ THÊM: Helper function để tính nightCount nếu pricingBreakdown không có
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return 0;
      }
      
      const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
      return Math.max(1, Math.ceil(timeDifference / (1000 * 3600 * 24)));
    } catch (error) {
      console.error('Error calculating nights:', error);
      return 1;
    }
  };

  // ✅ SỬA: Sử dụng nightCount từ pricingBreakdown, fallback về calculation
  const effectiveNightCount = nightCount || calculateNights(formData?.chedckIn, formData?.checkOut);

  // ✅ Helper function để lấy giá service từ database
  const getServiceInfo = (serviceId) => {
    return availableServices.find(s => s.id === serviceId) || {
      name: 'Unknown Service',
      price: 0,
      category: 'Khác'
    };
  };

  return (
    <div className={styles.pricingSummary}>
      <h2 className={styles.title}>Xác nhận đặt phòng</h2>
      
      {/* THÔNG TIN KHÁCH HÀNG */}
      <div className={styles.customerSection}>
        <h3>
          <i className="fas fa-user"></i>
          Thông tin khách hàng
        </h3>
        <div className={styles.customerInfo}>
          <div className={styles.infoRow}>
            <span>Họ tên:</span>
            <strong>{user?.Fullname || 'Chưa cập nhật'}</strong>
          </div>
          <div className={styles.infoRow}>
            <span>Email:</span>
            <strong>{user?.Email || 'Chưa cập nhật'}</strong>
          </div>
          <div className={styles.infoRow}>
            <span>Số điện thoại:</span>
            <strong>{user?.PhoneNumber || 'Chưa cập nhật'}</strong>
          </div>
        </div>
      </div>

      {/* THÔNG TIN PHÒNG - SỬ DỤNG roomsBreakdown */}
      <div className={styles.bookingSection}>
        <h3>
          <i className="fas fa-bed"></i>
          Thông tin đặt phòng ({nightCount} đêm)
        </h3>
        
        {/* ✅ SỬA: Sử dụng roomsBreakdown từ pricing hook */}
        <div className={styles.roomsList}>
          {roomsBreakdown.length > 0 ? (
            roomsBreakdown.map((room, index) => (
              <div key={index} className={styles.roomItem}>
                <div className={styles.roomInfo}>
                  <span className={styles.roomName}>{room.name}</span>
                  <span className={styles.roomDetails}>
                    {room.quantity} phòng × {room.price.toLocaleString('vi-VN')}đ × {room.nights} đêm
                  </span>
                </div>
                <span className={styles.roomTotal}>
                  {room.subtotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))
          ) : (
            selectedRooms.map((room, index) => (
              <div key={index} className={styles.roomItem}>
                <span>{room.name}</span>
                <span>{room.quantity} phòng × {parseFloat(room.price).toLocaleString('vi-VN')}đ</span>
              </div>
            ))
          )}
        </div>
        
        {roomSubtotal > 0 && (
          <div className={styles.sectionTotal}>
            <strong>Tổng phòng: {roomSubtotal.toLocaleString('vi-VN')}đ</strong>
          </div>
        )}
      </div>

      {/* THÔNG TIN DỊCH VỤ - SỬ DỤNG DATABASE */}
      {selectedServices.length > 0 && (
        <div className={styles.servicesSection}>
          <h3>
            <i className="fas fa-concierge-bell"></i>
            Dịch vụ đã chọn
          </h3>
          <div className={styles.servicesList}>
            {selectedServices.map((serviceId, index) => {
              const serviceInfo = getServiceInfo(serviceId);
              return (
                <div key={index} className={styles.serviceItem}>
                  <div className={styles.serviceInfo}>
                    <span className={styles.serviceName}>{serviceInfo.name}</span>
                    {serviceInfo.category && (
                      <span className={styles.serviceCategory}>{serviceInfo.category}</span>
                    )}
                  </div>
                  <span className={styles.servicePrice}>
                    {serviceInfo.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              );
            })}
          </div>
          
          {servicesSubtotal > 0 && (
            <div className={styles.sectionTotal}>
              <strong>Tổng dịch vụ: {servicesSubtotal.toLocaleString('vi-VN')}đ</strong>
            </div>
          )}
        </div>
      )}

      {/* ✅ THÊM: PHẦN PHÍ CHECKOUT MUỘN */}
      {lateCheckoutFee > 0 && (
        <div className={styles.lateCheckoutSection}>
          <h3>
            <i className="fas fa-clock"></i>
            Phí checkout muộn
          </h3>
          <div className={styles.lateCheckoutInfo}>
            <span>Checkout sau 11:30</span>
            <span className={styles.lateCheckoutFee}>
              {lateCheckoutFee.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
      )}

      {/* THÔNG TIN KHUYẾN MÃI */}
      {selectedPromotion && (
        <div className={styles.promotionSection}>
          <h3>
            <i className="fas fa-tags"></i>
            Khuyến mãi
          </h3>
          <div className={styles.promotionInfo}>
            <span>{selectedPromotion.promotionName}</span>
            <span className={styles.discountAmount}>
              -{selectedPromotion.discountPercent}% (-{effectiveDiscountAmount.toLocaleString('vi-VN')}đ)
            </span>
          </div>
        </div>
      )}

      {/* TỔNG TIỀN - SỬ DỤNG PRICING BREAKDOWN */}
      <div className={styles.totalSection}>
        <div className={styles.subtotalRow}>
          <span>Tạm tính:</span>
          <span>{effectiveOriginalAmount.toLocaleString('vi-VN')}đ</span>
        </div>
        
        {/* ✅ THÊM: Hiển thị chi tiết breakdown */}
        <div className={styles.breakdownRows}>
          <div className={styles.breakdownRow}>
            <span>• Phòng ({nightCount} đêm):</span>
            <span>{roomSubtotal.toLocaleString('vi-VN')}đ</span>
          </div>
          {servicesSubtotal > 0 && (
            <div className={styles.breakdownRow}>
              <span>• Dịch vụ:</span>
              <span>{servicesSubtotal.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          {lateCheckoutFee > 0 && (
            <div className={styles.breakdownRow}>
              <span>• Phí checkout muộn:</span>
              <span>{lateCheckoutFee.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
        </div>
        
        {effectiveDiscountAmount > 0 && (
          <div className={styles.discountRow}>
            <span>Giảm giá:</span>
            <span>-{effectiveDiscountAmount.toLocaleString('vi-VN')}đ</span>
          </div>
        )}
        <div className={styles.totalRow}>
          <span>Tổng tiền:</span>
          <strong>{effectiveFinalAmount.toLocaleString('vi-VN')}đ</strong>
        </div>
      </div>

      {/* ACTIONS */}
      <div className={styles.formActions}>
        <button 
          className={styles.btnBack} 
          onClick={prevStep}
          disabled={isSubmitting}
        >
          <i className="fas fa-arrow-left"></i>
          Quay lại
        </button>
        {!showSuccess ? (
          <button
            className={styles.btnBooking}
            onClick={handleConfirmBooking}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Đang xử lý...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                Xác nhận đặt phòng
              </>
            )}
          </button>
        ) : (
          <button
            className={styles.btnInvoice}
            onClick={() => {/* Will redirect automatically */}}
            disabled
          >
            <i className="fas fa-check-circle"></i>
            Đang chuyển hướng...
          </button>
        )}
      </div>

      {showSuccess && (
        <div className={styles.successMessage}>
          <i className="fas fa-check-circle"></i>
          Đặt phòng thành công! Đang chuyển đến trang thanh toán...
        </div>
      )}
    </div>
  );
};

export default PricingSummaryOnline;