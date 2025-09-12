import React, { useState, useEffect } from 'react';
import styles from '../BookingForm.module.css';

const RoomTypeModal = ({
  showRoomTypeModal,
  setShowRoomTypeModal,
  roomTypes,
  roomTypesLoading,
  selectedRooms,
  addRoomType,
  updateRoomQuantity,
  removeRoomType,
  isRoomTypeSelected,
  getSelectedRoomQuantity,
  checkRoomAvailability
}) => {
  const [quantities, setQuantities] = useState({});

  const getRoomIcon = (roomTypeId) => {
    const icons = {
      '1': '🏨', '2': '👨‍👩‍👧‍👦', '4': '🛏️', '5': '💑', '6': '⭐', '7': '💡'
    };
    return icons[roomTypeId] || '🏨';
  };

  const getAvailabilityStatus = (roomType) => {
    const availableRooms = roomType.availableRooms || 0;
    const selectedQuantity = getSelectedRoomQuantity(roomType.id);
    const actualAvailable = availableRooms - selectedQuantity;
    
    if (actualAvailable === 0) {
      return { status: 'full', text: 'Hết phòng', color: '#e53e3e', icon: 'fa-times-circle' };
    } else if (actualAvailable <= 2) {
      return { status: 'limited', text: `Còn ${actualAvailable} phòng`, color: '#f59e0b', icon: 'fa-exclamation-circle' };
    } else {
      return { status: 'available', text: `${actualAvailable} phòng trống`, color: '#38a169', icon: 'fa-check-circle' };
    }
  };

  const getPriceCategory = (price) => {
    if (price < 300000) return { category: 'Tiết kiệm', color: '#38a169' };
    if (price < 500000) return { category: 'Tiêu chuẩn', color: '#3182ce' };
    if (price < 800000) return { category: 'Cao cấp', color: '#9f7aea' };
    return { category: 'Sang trọng', color: '#d69e2e' };
  };

  const handleQuantityChange = (roomTypeId, newQuantity) => {
    const quantity = Math.max(0, parseInt(newQuantity) || 0);
    const roomType = roomTypes.find(rt => rt.id === roomTypeId);
    
    if (quantity === 0) {
      removeRoomType(roomTypeId);
      setQuantities(prev => ({ ...prev, [roomTypeId]: 0 }));
    } else if (quantity <= (roomType?.availableRooms || 0)) {
      if (isRoomTypeSelected(roomTypeId)) {
        updateRoomQuantity(roomTypeId, quantity);
      } else {
        addRoomType(roomTypeId, quantity);
      }
      setQuantities(prev => ({ ...prev, [roomTypeId]: quantity }));
    }
  };

  const getQuantityForRoom = (roomTypeId) => {
    return quantities[roomTypeId] !== undefined ? quantities[roomTypeId] : getSelectedRoomQuantity(roomTypeId);
  };

  useEffect(() => {
    if (showRoomTypeModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showRoomTypeModal]);

  if (!showRoomTypeModal) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowRoomTypeModal(false);
    }
  };

  return (
    <div 
      className={styles.serviceModal} 
      onClick={handleBackdropClick}
    >
      <div 
        className={styles.serviceModalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.serviceModalHeader}>
          <h4>
            <i className="fas fa-bed me-2"></i>
            Chọn loại phòng và số lượng
          </h4>
          <button
            type="button"
            className={styles.serviceModalClose}
            onClick={() => setShowRoomTypeModal(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.serviceModalBody}>
          {/* Room Types Loading */}
          {roomTypesLoading ? (
            <div className={styles.roomTypeLoading}>
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Đang tải loại phòng...</span>
              </div>
              <p>Đang tải danh sách loại phòng...</p>
            </div>
          ) : (
            <div className={styles.roomTypeGrid}>
              {roomTypes.length === 0 ? (
                <div className={styles.noRoomTypesFound}>
                  <i className="fas fa-bed"></i>
                  <p>Không có loại phòng nào.</p>
                </div>
              ) : (
                roomTypes.map(roomType => {
                  const availability = getAvailabilityStatus(roomType);
                  const priceCategory = getPriceCategory(roomType.price);
                  const isSelected = isRoomTypeSelected(roomType.id);
                  const selectedQuantity = getQuantityForRoom(roomType.id);
                  const isAvailable = availability.status !== 'full';

                  return (
                    <div 
                      key={roomType.id} 
                      className={`${styles.serviceCard} ${isSelected ? styles.selected : ''} ${!isAvailable ? styles.unavailable : ''}`}
                    >
                      <div className={styles.serviceCardHeader}>
                        <div className={styles.serviceCardTitle}>
                          <div className={styles.roomTypeHeader}>
                            <span className={styles.roomTypeIcon}>
                              {getRoomIcon(roomType.id)}
                            </span>
                            <h5>{roomType.name}</h5>
                          </div>
                          <div className={styles.roomTypeBadges}>
                            <div 
                              className={styles.serviceCardBadge}
                              style={{ backgroundColor: priceCategory.color }}
                            >
                              {priceCategory.category}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.serviceCardBody}>
                        <p className={styles.serviceDescription}>
                          {roomType.description}
                        </p>
                        
                        <div className={styles.serviceCardMeta}>
                          <div className={styles.serviceMeta}>
                            <i className="fas fa-users"></i>
                            <span>Tối đa {roomType.maxOccupancy} người</span>
                          </div>
                          <div className={styles.serviceMeta}>
                            <i className="fas fa-building"></i>
                            <span>Tổng: {roomType.totalRooms || 0} phòng</span>
                          </div>
                        </div>

                        {/* Availability Status */}
                        <div className={styles.roomTypeAvailability}>
                          <div 
                            className={styles.availabilityStatus}
                            style={{ color: availability.color }}
                          >
                            <i className={`fas ${availability.icon}`}></i>
                            <span>{availability.text}</span>
                          </div>
                        </div>

                        {/* ✅ THÊM: Quantity Selector */}
                        <div className={styles.quantitySelector}>
                          <label>Số lượng phòng:</label>
                          <div className={styles.quantityControls}>
                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() => handleQuantityChange(roomType.id, selectedQuantity - 1)}
                              disabled={selectedQuantity <= 0}
                            >
                              <i className="fas fa-minus"></i>
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={roomType.availableRooms}
                              value={selectedQuantity}
                              onChange={(e) => handleQuantityChange(roomType.id, e.target.value)}
                              className={styles.quantityInput}
                              disabled={!isAvailable}
                            />
                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() => handleQuantityChange(roomType.id, selectedQuantity + 1)}
                              disabled={selectedQuantity >= roomType.availableRooms || !isAvailable}
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={styles.serviceCardFooter}>
                        <div className={styles.servicePrice}>
                          <strong>{roomType.price.toLocaleString('vi-VN')}đ</strong>
                          <small>/đêm</small>
                        </div>
                        {selectedQuantity > 0 && (
                          <div className={styles.totalRoomPrice}>
                            <small>
                              Tổng: {(roomType.price * selectedQuantity).toLocaleString('vi-VN')}đ/đêm
                            </small>
                          </div>
                        )}
                      </div>

                      {/* Selection Overlay */}
                      {isSelected && (
                        <div className={styles.selectionOverlay}>
                          <i className="fas fa-check-circle"></i>
                          <span>{selectedQuantity}</span>
                        </div>
                      )}

                      {/* Unavailable Overlay */}
                      {!isAvailable && (
                        <div className={styles.unavailableOverlay}>
                          <i className="fas fa-times-circle"></i>
                          <span>Hết phòng</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className={styles.serviceModalFooter}>
          <div className={styles.modalFooterInfo}>
            <div className={styles.selectionSummary}>
              <span>Đã chọn: {selectedRooms.reduce((total, room) => total + room.quantity, 0)} phòng</span>
              {selectedRooms.length > 0 && (
                <div className={styles.roomTypesSummary}>
                  {selectedRooms.map(room => {
                    const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
                    return roomType ? (
                      <small key={room.roomTypeId}>
                        {room.quantity}x {roomType.name}
                      </small>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className={styles.confirmSelectionButton}
            onClick={() => setShowRoomTypeModal(false)}
            disabled={selectedRooms.length === 0}
          >
            <i className="fas fa-check me-2"></i>
            Xác nhận ({selectedRooms.reduce((total, room) => total + room.quantity, 0)} phòng)
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomTypeModal;