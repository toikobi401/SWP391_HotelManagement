import React from 'react';
import styles from '../BookingForm.module.css';

const RoomTypeSelection = ({ 
  formData, 
  handleInputChange, 
  roomTypes, 
  roomTypesLoading, 
  roomTypesError,
  retryFetchRoomTypes, 
  validationErrors,
  addRoomType,
  updateRoomQuantity,
  removeRoomType,
  clearAllRooms,
  getTotalRooms,
  getTotalPrice,
  getMaxGuestsCapacity,
  isRoomTypeSelected,
  getSelectedRoomQuantity,
  checkRoomAvailability,
  openRoomTypeModal
}) => {
  const getRoomIcon = (roomTypeId) => {
    const icons = {
      '1': '🏨', '2': '👨‍👩‍👧‍👦', '4': '🛏️', '5': '💑', '6': '⭐', '7': '💡'
    };
    return icons[roomTypeId] || '🏨';
  };

  if (roomTypesLoading) {
    return (
      <div className={styles.formSection}>
        <h3><i className="fas fa-bed"></i> Thông tin đặt phòng</h3>
        <div className={styles.loadingState}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Đang tải loại phòng...</span>
          </div>
          <p>Đang tải thông tin phòng từ database...</p>
        </div>
      </div>
    );
  }

  if (roomTypesError) {
    return (
      <div className={styles.formSection}>
        <h3><i className="fas fa-bed"></i> Thông tin đặt phòng</h3>
        <div className={styles.errorState}>
          <div className="alert alert-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Không thể tải loại phòng từ database: {roomTypesError}</p>
            <button 
              type="button" 
              className="btn btn-outline-primary mt-2"
              onClick={retryFetchRoomTypes} // ✅ SỬA: Sử dụng đúng function name
            >
              <i className="fas fa-retry"></i> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalRooms = getTotalRooms();
  const totalPrice = getTotalPrice();
  const maxCapacity = getMaxGuestsCapacity();

  return (
    <div className={styles.formSection}>
      <div className={`${styles.formSection} ${styles.servicesSection}`}>
        <div className={styles.servicesSectionHeader}>
          <h3><i className="fas fa-bed"></i> Thông tin đặt phòng</h3>
          <div className={styles.servicesControls}>
            <button
              type="button"
              className={styles.servicesExpandButton}
              onClick={openRoomTypeModal} // ✅ SỬ DỤNG PROP từ parent
              disabled={roomTypesLoading}
            >
              <i className="fas fa-plus-circle"></i>
              Chọn loại phòng
              {totalRooms > 0 && (
                <span className={styles.selectedBadge}>
                  {totalRooms}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Selected Room Types Summary */}
        {formData.selectedRooms.length > 0 && (
          <div className={styles.selectedServicesSummary}>
            <div className={styles.summaryHeader}>
              <h6>
                <i className="fas fa-check-circle"></i> 
                Phòng đã chọn ({totalRooms} phòng):
              </h6>
              <button
                type="button"
                className={styles.clearAllButton}
                onClick={clearAllRooms}
                title="Xóa tất cả"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
            
            <div className={styles.selectedRoomsList}>
              {formData.selectedRooms.map(selectedRoom => {
                const roomType = roomTypes.find(rt => rt.id === selectedRoom.roomTypeId);
                if (!roomType) return null;

                return (
                  <div key={selectedRoom.roomTypeId} className={styles.selectedRoomItem}>
                    <div className={styles.selectedRoomHeader}>
                      <span className={styles.roomTypeIcon}>
                        {getRoomIcon(selectedRoom.roomTypeId)}
                      </span>
                      <div className={styles.selectedRoomInfo}>
                        <div className={styles.selectedRoomName}>
                          {roomType.name}
                        </div>
                        <div className={styles.selectedRoomPrice}>
                          {roomType.price.toLocaleString('vi-VN')}đ/đêm × {selectedRoom.quantity}
                        </div>
                      </div>
                      <div className={styles.quantityControls}>
                        <button
                          type="button"
                          className={styles.quantityButton}
                          onClick={() => updateRoomQuantity(selectedRoom.roomTypeId, selectedRoom.quantity - 1)}
                          disabled={selectedRoom.quantity <= 1}
                        >
                          <i className="fas fa-minus"></i>
                        </button>
                        <span className={styles.quantityDisplay}>{selectedRoom.quantity}</span>
                        <button
                          type="button"
                          className={styles.quantityButton}
                          onClick={() => updateRoomQuantity(selectedRoom.roomTypeId, selectedRoom.quantity + 1)}
                          disabled={selectedRoom.quantity >= roomType.availableRooms}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                        <button
                          type="button"
                          className={styles.removeRoomButton}
                          onClick={() => removeRoomType(selectedRoom.roomTypeId)}
                          title="Xóa loại phòng này"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                    <div className={styles.selectedRoomDetails}>
                      <p className={styles.roomTypeDescription}>
                        {roomType.description}
                      </p>
                      <div className={styles.roomTypeMetaInfo}>
                        <span><i className="fas fa-users"></i> {roomType.maxOccupancy * selectedRoom.quantity} người tối đa</span>
                        <span><i className="fas fa-calculator"></i> {(roomType.price * selectedRoom.quantity).toLocaleString('vi-VN')}đ/đêm</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Totals */}
            <div className={styles.roomSelectionSummary}>
              <div className={styles.summaryRow}>
                <span>Tổng số phòng:</span>
                <strong>{totalRooms} phòng</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Sức chứa tối đa:</span>
                <strong>{maxCapacity} người</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Tổng giá/đêm:</span>
                <strong className={styles.totalPrice}>{totalPrice.toLocaleString('vi-VN')}đ</strong>
              </div>
            </div>
          </div>
        )}

        {/* No Room Type Selected */}
        {formData.selectedRooms.length === 0 && !roomTypesLoading && (
          <div className={styles.noServicesSelected}>
            <i className="fas fa-info-circle"></i>
            <span>Chưa chọn loại phòng. Nhấn "Chọn loại phòng" để xem danh sách.</span>
          </div>
        )}

        {/* Validation Error */}
        {validationErrors.selectedRooms && (
          <div className={styles.fieldError}>
            <i className="fas fa-exclamation-circle"></i>
            {validationErrors.selectedRooms}
          </div>
        )}

        {/* Guest Information */}
        <div className={styles.roomBookingDetails}>
          <div className={styles.field}>
            <label htmlFor="numberOfGuests">
              <i className="fas fa-users"></i> Số người
            </label>
            <select
              id="numberOfGuests"
              name="numberOfGuests"
              value={formData.numberOfGuests}
              onChange={handleInputChange}
              required
            >
              {Array.from({ length: Math.max(20, maxCapacity) }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>
                  {num} người
                  {maxCapacity > 0 && num > maxCapacity && ' (⚠️ Vượt sức chứa)'}
                </option>
              ))}
            </select>
            {maxCapacity > 0 && formData.numberOfGuests > maxCapacity && (
              <div className={styles.fieldWarning}>
                <i className="fas fa-exclamation-triangle"></i>
                Số người vượt quá sức chứa tối đa ({maxCapacity} người)
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="alert alert-info mt-2">
            <small>
              🔍 Debug: {roomTypes.length} loại phòng được tải từ database<br/>
              📊 Đã chọn: {formData.selectedRooms.length} loại phòng, {totalRooms} phòng tổng
            </small>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default RoomTypeSelection;