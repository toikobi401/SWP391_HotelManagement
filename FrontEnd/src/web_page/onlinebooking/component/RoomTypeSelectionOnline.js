import React, { useState, useEffect } from 'react';
import styles from './RoomTypeSelectionOnline.module.css';

const RoomTypeSelectionOnline = ({ 
  formData, 
  selectedRooms, 
  setSelectedRooms, 
  nextStep, 
  prevStep,
  roomTypes = [], // ✅ THÊM: Nhận roomTypes từ props
  roomTypesLoading = false, // ✅ THÊM
  roomTypesError = '' // ✅ THÊM
}) => {
  const [quantities, setQuantities] = useState({});

  // ✅ SỬA: Sử dụng roomTypes từ props thay vì fetch
  // const [roomTypes, setRoomTypes] = useState([]);
  // const [roomTypesLoading, setRoomTypesLoading] = useState(true);
  // const [roomTypesError, setRoomTypesError] = useState('');

  // ✅ SỬA: Bỏ useEffect fetch vì sẽ nhận từ props
  // useEffect(() => {
  //   fetchRoomTypesFromAPI();
  // }, []);

  // ✅ SỬA: Bỏ fetchRoomTypesFromAPI function

  // ✅ SỬA: Bỏ setFallbackRoomTypes function

  // ✅ Helper functions (giữ nguyên)
  const getRoomIcon = (roomTypeId) => {
    const icons = {
      '1': '🏨', '2': '👨‍👩‍👧‍👦', '3': '🛏️', '4': '💑', '5': '⭐', '6': '💡'
    };
    return icons[roomTypeId] || '🏨';
  };

  const getPriceCategory = (price) => {
    if (price < 300000) return { category: 'Tiết kiệm', color: '#16a34a' };
    if (price < 500000) return { category: 'Tiêu chuẩn', color: '#2563eb' };
    if (price < 800000) return { category: 'Cao cấp', color: '#dc2626' };
    return { category: 'Sang trọng', color: '#d69e2e' };
  };

  const getAvailabilityStatus = (roomType) => {
    const availableRooms = roomType.availableRooms || 0;
    const selectedQuantity = getSelectedRoomQuantity(roomType.id);
    const actualAvailable = availableRooms - selectedQuantity;
    
    if (actualAvailable === 0) {
      return { status: 'full', text: 'Hết phòng', color: '#dc2626' };
    } else if (actualAvailable <= 3) {
      return { status: 'limited', text: `Còn ${actualAvailable} phòng`, color: '#f59e0b' };
    } else {
      return { status: 'available', text: `Còn ${actualAvailable} phòng`, color: '#16a34a' };
    }
  };

  // ✅ Room selection logic (giữ nguyên)
  const isRoomTypeSelected = (roomTypeId) => {
    return selectedRooms.some(room => room.roomTypeId === roomTypeId);
  };

  const getSelectedRoomQuantity = (roomTypeId) => {
    const room = selectedRooms.find(room => room.roomTypeId === roomTypeId);
    return room ? room.quantity : 0;
  };

  const getQuantityForRoom = (roomTypeId) => {
    return quantities[roomTypeId] !== undefined ? quantities[roomTypeId] : getSelectedRoomQuantity(roomTypeId);
  };

  const handleQuantityChange = (roomTypeId, newQuantity) => {
    const quantity = Math.max(0, parseInt(newQuantity) || 0);
    const roomType = roomTypes.find(rt => rt.id === roomTypeId);
    
    if (quantity === 0) {
      // Remove room from selection
      setSelectedRooms(prev => prev.filter(room => room.roomTypeId !== roomTypeId));
      setQuantities(prev => ({ ...prev, [roomTypeId]: 0 }));
    } else {
      // Check availability
      const maxAvailable = roomType?.availableRooms || 0;
      const finalQuantity = Math.min(quantity, maxAvailable);
      
      // Update or add room
      setSelectedRooms(prev => {
        const existing = prev.find(room => room.roomTypeId === roomTypeId);
        if (existing) {
          return prev.map(room => 
            room.roomTypeId === roomTypeId 
              ? { ...room, quantity: finalQuantity }
              : room
          );
        } else {
          return [...prev, { roomTypeId, quantity: finalQuantity }];
        }
      });
      
      setQuantities(prev => ({ ...prev, [roomTypeId]: finalQuantity }));
    }
  };

  // ✅ Calculate totals (giữ nguyên)
  const getTotalRooms = () => {
    return selectedRooms.reduce((total, room) => total + (room.quantity || 0), 0);
  };

  const getTotalCapacity = () => {
    return selectedRooms.reduce((total, room) => {
      const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
      return total + ((roomType?.maxOccupancy || 0) * (room.quantity || 0));
    }, 0);
  };

  const getTotalPrice = () => {
    return selectedRooms.reduce((total, room) => {
      const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
      return total + ((roomType?.price || 0) * (room.quantity || 0));
    }, 0);
  };

  // ✅ Calculate nights (giữ nguyên)
  const calculateNights = () => {
    if (formData.checkIn && formData.checkOut) {
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
      const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return nights > 0 ? nights : 1;
    }
    return 1;
  };

  const nights = calculateNights();
  const totalRooms = getTotalRooms();
  const totalCapacity = getTotalCapacity();
  const totalPrice = getTotalPrice();
  // ✅ FIX: Sử dụng đúng tên field từ formData
  const numberOfGuests = formData.numberOfGuest || 0;

  // ✅ Validation before next step (giữ nguyên)
  const handleNextStep = () => {
    if (selectedRooms.length === 0) {
      alert('Vui lòng chọn ít nhất một loại phòng');
      return;
    }

    if (totalCapacity < numberOfGuests) {
      alert(`Sức chứa phòng chưa đủ cho ${numberOfGuests} khách. Hiện tại chỉ có thể chứa ${totalCapacity} người.`);
      return;
    }

    nextStep();
  };

  // ✅ SỬA: Loading state với props
  if (roomTypesLoading) {
    return (
      <div className={styles.roomTypeSection}>
        <h2 className={styles.title}>Chọn loại phòng</h2>
        <div className={styles.loadingState}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Đang tải loại phòng...</span>
          </div>
          <p>Đang tải thông tin phòng từ database...</p>
        </div>
      </div>
    );
  }

  // ✅ SỬA: Error state với props
  if (roomTypesError) {
    return (
      <div className={styles.roomTypeSection}>
        <h2 className={styles.title}>Chọn loại phòng</h2>
        <div className={styles.errorState}>
          <div className={styles.errorAlert}>
            <i className="fas fa-exclamation-triangle"></i>
            <p>Không thể tải loại phòng từ database: {roomTypesError}</p>
          </div>
          <button 
            className={styles.retryBtn}
            onClick={() => window.location.reload()} // Simple retry
          >
            <i className="fas fa-retry"></i>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.roomTypeSection}>
      <h2 className={styles.title}>Chọn loại phòng và số lượng</h2>
      
      {/* Booking Info */}
      <div className={styles.bookingInfo}>
        <h4 className={styles.bookingInfoTitle}>
          <i className="fas fa-info-circle"></i>
          Thông tin đặt phòng
        </h4>
        <div className={styles.bookingInfoGrid}>
          <div><strong>Số khách:</strong> {numberOfGuests} người</div>
          <div><strong>Số đêm:</strong> {nights} đêm</div>
          <div><strong>Nhận phòng:</strong> {new Date(formData.checkIn).toLocaleDateString('vi-VN')}</div>
          <div><strong>Trả phòng:</strong> {new Date(formData.checkOut).toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      {/* Room Types Grid */}
      <div className={styles.roomTypesGrid}>
        {roomTypes.map(roomType => {
          const availability = getAvailabilityStatus(roomType);
          const priceCategory = getPriceCategory(roomType.price);
          const isSelected = isRoomTypeSelected(roomType.id);
          const selectedQuantity = getQuantityForRoom(roomType.id);
          const isAvailable = availability.status !== 'full';

          return (
            <div 
              key={roomType.id}
              className={`
                ${styles.roomTypeCard} 
                ${isSelected ? styles.selected : ''} 
                ${!isAvailable ? styles.unavailable : ''}
              `}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className={styles.selectionIndicator}>
                  {selectedQuantity}
                </div>
              )}

              {/* Room Type Header */}
              <div className={styles.roomTypeHeader}>
                <div className={styles.roomTypeIcon}>
                  {getRoomIcon(roomType.id)}
                </div>
                <div className={styles.roomTypeTitle}>
                  <h4>{roomType.name}</h4>
                  <span 
                    className={styles.priceCategoryBadge}
                    style={{ backgroundColor: priceCategory.color }}
                  >
                    {priceCategory.category}
                  </span>
                </div>
              </div>

              {/* Room Description */}
              <p className={styles.roomDescription}>
                {roomType.description}
              </p>

              {/* Room Meta Info */}
              <div className={styles.roomMeta}>
                <div>
                  <i className="fas fa-users"></i>
                  <span>Tối đa {roomType.maxOccupancy} người</span>
                </div>
                <div>
                  <i className="fas fa-bed"></i>
                  <span>{roomType.totalRooms} phòng</span>
                </div>
              </div>

              {/* Availability Status */}
              <div 
                className={styles.availabilityStatus}
                style={{ color: availability.color }}
              >
                <i className="fas fa-circle"></i>
                <span>{availability.text}</span>
              </div>

              {/* Quantity Selector */}
              {isAvailable && (
                <div className={styles.quantitySelector}>
                  <label className={styles.quantityLabel}>
                    Số lượng phòng:
                  </label>
                  <div className={styles.quantityControls}>
                    <button
                      type="button"
                      className={styles.quantityBtn}
                      onClick={() => handleQuantityChange(roomType.id, selectedQuantity - 1)}
                      disabled={selectedQuantity <= 0}
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <input
                      type="number"
                      className={styles.quantityInput}
                      value={selectedQuantity}
                      onChange={(e) => handleQuantityChange(roomType.id, e.target.value)}
                      min="0"
                      max={roomType.availableRooms}
                    />
                    <button
                      type="button"
                      className={styles.quantityBtn}
                      onClick={() => handleQuantityChange(roomType.id, selectedQuantity + 1)}
                      disabled={selectedQuantity >= (roomType.availableRooms || 0)}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Room Price Section */}
              <div className={styles.roomPriceSection}>
                <div className={styles.roomPrice}>
                  {roomType.price.toLocaleString('vi-VN')}đ
                </div>
                <div className={styles.roomPriceUnit}>
                  /phòng/đêm
                </div>
                
                {selectedQuantity > 0 && (
                  <>
                    <div className={styles.roomTotalPrice}>
                      Tổng: {(roomType.price * selectedQuantity * nights).toLocaleString('vi-VN')}đ
                    </div>
                    <div className={styles.roomTotalBreakdown}>
                      {selectedQuantity} phòng × {nights} đêm
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedRooms.length > 0 && (
        <div className={styles.selectionSummary}>
          <h4>
            <i className="fas fa-check-circle"></i>
            Tóm tắt phòng đã chọn
          </h4>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span>Tổng phòng</span>
              <strong>{totalRooms} phòng</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Sức chứa</span>
              <strong>{totalCapacity} người</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Giá/đêm</span>
              <strong>{totalPrice.toLocaleString('vi-VN')}đ</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Tổng tiền</span>
              <strong style={{ color: '#059669' }}>
                {(totalPrice * nights).toLocaleString('vi-VN')}đ
              </strong>
            </div>
          </div>

          {/* Capacity Warning */}
          {totalCapacity < numberOfGuests && (
            <div className={styles.capacityWarning}>
              <i className="fas fa-exclamation-triangle"></i>
              Sức chứa chưa đủ cho {numberOfGuests} khách. Cần thêm {numberOfGuests - totalCapacity} chỗ.
            </div>
          )}
        </div>
      )}

      {/* Navigation Actions */}
      <div className={styles.formActions}>
        <button 
          className={styles.btnBack}
          onClick={prevStep}
        >
          <i className="fas fa-arrow-left"></i>
          Quay lại
        </button>
        <button 
          className={styles.btnNext}
          onClick={handleNextStep}
          disabled={selectedRooms.length === 0}
        >
          Tiếp tục
          <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
};

export default RoomTypeSelectionOnline;
