import React from 'react';
import styles from '../BookingForm.module.css';

const PricingSummary = ({ pricingBreakdown, formData, roomTypes }) => {
  // ✅ SỬA: Thêm default values và safety checks
  const safePricingBreakdown = pricingBreakdown || {};
  const safeFormData = formData || {};
  const safeRoomTypes = roomTypes || [];
  
  const { 
    roomsBreakdown = [],
    nightCount = 0,
    lateCheckoutFee = 0,
    totalPrice = 0,
    roomSubtotal = 0,
    servicesSubtotal = 0,
    subtotal = 0,
    originalTotal = 0,
    promotionDiscount = 0,
    finalTotal = 0
  } = safePricingBreakdown;
  
  // ✅ SỬA: Safety checks cho formData
  const selectedRooms = safeFormData.selectedRooms || [];
  const selectedServices = safeFormData.selectedServices || [];
  
  // ✅ THÊM: Helper functions với safety checks
  const getTotalRooms = () => {
    if (!Array.isArray(selectedRooms)) return 0;
    return selectedRooms.reduce((total, room) => total + (room?.quantity || 0), 0);
  };

  const getMaxGuestsCapacity = () => {
    if (!Array.isArray(selectedRooms) || !Array.isArray(safeRoomTypes)) return 0;
    return selectedRooms.reduce((total, room) => {
      if (!room || !room.roomTypeId) return total;
      const roomType = getRoomTypeById(room.roomTypeId);
      return total + (roomType ? (roomType.maxOccupancy || 0) * (room.quantity || 0) : 0);
    }, 0);
  };

  const hasBookingData = () => {
    return selectedRooms.length > 0 || safeFormData.checkIn || safeFormData.customerName;
  };

  // ✅ SỬA: Safety check cho room types mapping
  const getRoomTypeById = (roomTypeId) => {
    if (!Array.isArray(safeRoomTypes)) return null;
    return safeRoomTypes.find(rt => rt.id === String(roomTypeId));
  };

  return (
    <div className={`${styles.formSection} ${styles.pricingSummary}`}>
      <h3>
        <i className="fas fa-receipt"></i> 
        {totalPrice > 0 ? 'Tổng kết đặt phòng' : 'Thông tin đặt phòng'}
      </h3>
      
      {/* ✅ BOOKING SUMMARY INFO với safety checks */}
      {hasBookingData() && (
        <div className={styles.bookingSummary}>
          <h6 className={styles.summaryTitle}>
            <i className="fas fa-info-circle"></i>
            Tóm tắt đặt phòng
          </h6>
          
          {/* Room Info */}
          {selectedRooms.length > 0 && (
            <div className={styles.summaryItem}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <i className="fas fa-bed"></i> Phòng:
                </span>
                <span className={styles.summaryValue}>
                  {getTotalRooms()} phòng cho {getMaxGuestsCapacity()} người
                </span>
              </div>
              
              {/* ✅ SỬA: Chi tiết từng loại phòng với safety checks */}
              <div className={styles.roomTypesList}>
                {selectedRooms.map((room, index) => {
                  if (!room || !room.roomTypeId) return null;
                  
                  const roomType = getRoomTypeById(room.roomTypeId);
                  if (!roomType) {
                    return (
                      <div key={room.roomTypeId || index} className={styles.roomTypeItem}>
                        <span className={styles.roomTypeDetail}>
                          • {room.quantity || 0}x Loại phòng không xác định
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={room.roomTypeId || index} className={styles.roomTypeItem}>
                      <span className={styles.roomTypeDetail}>
                        • {room.quantity || 0}x {roomType.name || 'Unknown Room Type'}
                        {totalPrice > 0 && roomType.price && (
                          <small> ({roomType.price.toLocaleString('vi-VN')}đ/đêm)</small>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Date Info */}
          {safeFormData.checkIn && safeFormData.checkOut && (
            <div className={styles.summaryItem}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <i className="fas fa-calendar-alt"></i> Thời gian:
                </span>
                <span className={styles.summaryValue}>
                  {new Date(safeFormData.checkIn).toLocaleDateString('vi-VN')} - {new Date(safeFormData.checkOut).toLocaleDateString('vi-VN')}
                  {nightCount > 0 && (
                    <small> ({nightCount} đêm)</small>
                  )}
                </span>
              </div>
            </div>
          )}
          
          {/* Customer Info */}
          {safeFormData.customerName && (
            <div className={styles.summaryItem}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <i className="fas fa-user"></i> Khách hàng:
                </span>
                <span className={styles.summaryValue}>{safeFormData.customerName}</span>
              </div>
            </div>
          )}
          
          {/* Guests Info */}
          {safeFormData.numberOfGuests > 0 && (
            <div className={styles.summaryItem}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <i className="fas fa-users"></i> Số người:
                </span>
                <span className={styles.summaryValue}>
                  {safeFormData.numberOfGuests} người
                  {getMaxGuestsCapacity() > 0 && safeFormData.numberOfGuests > getMaxGuestsCapacity() && (
                    <span className={styles.capacityWarning}>
                      <i className="fas fa-exclamation-triangle"></i>
                      Vượt sức chứa
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
          
          {/* ✅ SỬA: Services Info - sử dụng servicesSubtotal thay vì servicePrice */}
          {selectedServices.length > 0 && (
            <div className={styles.summaryItem}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>
                  <i className="fas fa-concierge-bell"></i> Dịch vụ:
                </span>
                <span className={styles.summaryValue}>
                  {selectedServices.length} dịch vụ đã chọn
                  {servicesSubtotal > 0 && (
                    <small> (+{servicesSubtotal.toLocaleString('vi-VN')}đ)</small>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ PRICING BREAKDOWN với safety checks */}
      {totalPrice > 0 && (
        <div className={styles.pricingDetails}>
          <h6 className={styles.breakdownTitle}>
            <i className="fas fa-calculator"></i> 
            Chi tiết giá ({nightCount} đêm):
          </h6>
          
          {/* Room costs */}
          {Array.isArray(roomsBreakdown) && roomsBreakdown.length > 0 && (
            <div className={styles.roomsBreakdown}>
              {roomsBreakdown.map((room, index) => (
                <div key={index} className={styles.roomBreakdownItem}>
                  <span>{room.roomTypeName} x{room.quantity} ({nightCount} đêm):</span>
                  <span>{room.totalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Room subtotal */}
          <div className={styles.pricingItem}>
            <span>Tổng tiền phòng:</span>
            <span>{roomSubtotal.toLocaleString('vi-VN')}đ</span>
          </div>
          
          {/* Services */}
          {servicesSubtotal > 0 && (
            <div className={styles.pricingItem}>
              <span>Dịch vụ:</span>
              <span>+{servicesSubtotal.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          
          {/* ✅ SỬA: Late checkout fee hiển thị riêng biệt */}
          {lateCheckoutFee > 0 && (
            <div className={styles.pricingItem}>
              <span className={styles.feeLabel}>
                <i className="fas fa-exclamation-triangle"></i>
                Phí checkout muộn:
              </span>
              <span className={styles.feeAmount}>+{lateCheckoutFee.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          
          {/* ✅ THÊM: Chi tiết tính phí checkout muộn */}
          {lateCheckoutFee > 0 && safeFormData.checkOut && (
            <div className={styles.feeBreakdown}>
              <small className={styles.feeExplanation}>
                <i className="fas fa-info-circle"></i>
                {(() => {
                  const checkOutDate = new Date(safeFormData.checkOut);
                  const checkOutHour = checkOutDate.getHours();
                  const checkOutMinute = checkOutDate.getMinutes();
                  const checkOutTime = checkOutHour + (checkOutMinute / 60);
                  const hoursOverdue = Math.ceil(checkOutTime - 11.5);
                  const formattedMinute = checkOutMinute.toString().padStart(2, '0');
                  return `Checkout ${checkOutHour}:${formattedMinute} = ${hoursOverdue} giờ trễ x 10% giá phòng/đêm`;
                })()}
              </small>
            </div>
          )}
          
          {/* Subtotal before promotion */}
          <div className={`${styles.pricingItem} ${styles.subtotalItem}`}>
            <span><strong>Tạm tính:</strong></span>
            <span><strong>{subtotal.toLocaleString('vi-VN')}đ</strong></span>
          </div>
          
          {/* Promotion discount */}
          {promotionDiscount > 0 && (
            <div className={styles.pricingItem}>
              <span className={styles.discountLabel}>
                <i className="fas fa-tags"></i>
                Khuyến mãi:
              </span>
              <span className={styles.discountAmount}>
                -{promotionDiscount.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}
          
          {/* Final total */}
          <div className={styles.pricingTotal}>
            <span><strong>Tổng cộng:</strong></span>
            <span><strong>{finalTotal.toLocaleString('vi-VN')}đ</strong></span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasBookingData() && (
        <div className={styles.emptyBooking}>
          <i className="fas fa-clipboard-list"></i>
          <p>Chưa có thông tin đặt phòng</p>
          <small>Vui lòng chọn phòng và nhập thông tin khách hàng để xem tóm tắt booking.</small>
        </div>
      )}
    </div>
  );
};

export default PricingSummary;