import React, { useState, useEffect } from 'react';
import styles from './RoomSelectionModalOnline.module.css';

const RoomSelectionModalOnline = ({
  isOpen,
  onClose,
  bookingData,
  availableRooms,
  onRoomSelectionComplete,
  selectedRooms,
  setSelectedRooms,
  isCheckIn = false // ✅ THÊM: Prop để xác định có phải check-in không
}) => {
  const [roomsByType, setRoomsByType] = useState({});
  const [loading, setLoading] = useState(false);

  // ✅ Safety check for selectedRooms
  const safeSelectedRooms = Array.isArray(selectedRooms) ? selectedRooms : [];

  // ✅ Get required rooms from booking data
  const getRequiredRooms = () => {
    if (!bookingData) {
      console.warn('BookingData is undefined in getRequiredRooms');
      return [];
    }

    const sources = {
      fromSelectedRooms: Array.isArray(bookingData.selectedRooms) ? bookingData.selectedRooms.length : 0,
      fromRequestedRoomTypes: Array.isArray(bookingData.requestedRoomTypes) ? bookingData.requestedRoomTypes.length : 0,
      fromRoomTypeRequirements: Array.isArray(bookingData.roomTypeRequirements) ? bookingData.roomTypeRequirements.length : 0,
      fromRoomRequirements: Array.isArray(bookingData.roomRequirements) ? bookingData.roomRequirements.length : 0
    };

    console.log('🔍 Getting required rooms from multiple sources:', {
      ...sources,
      bookingDataKeys: Object.keys(bookingData)
    });

    // Priority order for room requirements
    if (bookingData.roomTypeRequirements && Array.isArray(bookingData.roomTypeRequirements)) {
      console.log('✅ Using roomTypeRequirements from bookingData');
      return bookingData.roomTypeRequirements;
    }

    if (bookingData.requestedRoomTypes && Array.isArray(bookingData.requestedRoomTypes)) {
      console.log('✅ Using requestedRoomTypes from bookingData');
      return bookingData.requestedRoomTypes;
    }

    if (bookingData.roomRequirements && Array.isArray(bookingData.roomRequirements)) {
      console.log('✅ Using roomRequirements from bookingData');
      return bookingData.roomRequirements;
    }

    if (bookingData.selectedRooms && Array.isArray(bookingData.selectedRooms)) {
      console.log('✅ Using selectedRooms from bookingData');
      return bookingData.selectedRooms.map(room => ({
        roomTypeID: room.roomTypeId,
        roomTypeName: room.roomTypeName || 'Unknown',
        quantity: room.quantity,
        roomTypePrice: room.roomTypePrice || 0
      }));
    }

    console.warn('⚠️ No room requirements found in bookingData');
    return [];
  };

  // ✅ Process available rooms and group by type
  useEffect(() => {
    if (!isOpen || !availableRooms || !Array.isArray(availableRooms)) {
      setRoomsByType({});
      return;
    }

    console.log('🔍 RoomSelectionModalOnline: Processing available rooms:', {
      availableRoomsCount: availableRooms.length,
      availableRoomsType: typeof availableRooms,
      isArray: Array.isArray(availableRooms),
      firstRoom: availableRooms[0],
      bookingDataExists: !!bookingData
    });

    // Group rooms by type with unique key handling
    const grouped = {};
    const usedKeys = new Set();

    availableRooms.forEach((room, index) => {
      console.log(`🔍 Processing room ${index + 1}:`, {
        roomId: room.RoomID,
        roomNumber: room.RoomNumber,
        typeId: room.TypeID,
        typeName: room.TypeName
      });

      // Create unique key for each room
      const uniqueKey = `${room.RoomID}_${room.RoomNumber}_${index}`;
      
      // Check for duplicate keys
      if (usedKeys.has(uniqueKey)) {
        console.warn(`⚠️ Duplicate key detected: ${uniqueKey}`);
        const newKey = `${uniqueKey}_dup_${Date.now()}`;
        usedKeys.add(newKey);
      } else {
        usedKeys.add(uniqueKey);
      }

      const typeId = room.TypeID;
      const typeName = room.TypeName || `Room Type ${typeId}`;

      if (!grouped[typeId]) {
        grouped[typeId] = {
          typeId: typeId,
          typeName: typeName,
          basePrice: room.TypeBasePrice || room.BasePrice || 0,
          rooms: []
        };
      }

      // Add room with unique key
      grouped[typeId].rooms.push({
        ...room,
        uniqueKey: uniqueKey
      });
    });

    console.log('✅ Rooms grouped by type:', {
      roomTypesCount: Object.keys(grouped).length,
      roomTypes: Object.keys(grouped),
      totalRoomsProcessed: availableRooms.length
    });

    setRoomsByType(grouped);
  }, [availableRooms, bookingData, isOpen]);

  // ✅ Check if room is selected
  const isRoomSelected = (roomID) => {
    if (!roomID || !Array.isArray(safeSelectedRooms)) return false;
    
    return safeSelectedRooms.some(selectedRoom => 
      selectedRoom.roomID === roomID || 
      selectedRoom.roomID === String(roomID) ||
      selectedRoom.RoomID === roomID ||
      selectedRoom.RoomID === String(roomID)
    );
  };

  // ✅ Toggle room selection
  const toggleRoomSelection = (room) => {
    if (!room || !room.RoomID) {
      console.error('Invalid room data:', room);
      return;
    }

    const roomID = room.RoomID;
    const isCurrentlySelected = isRoomSelected(roomID);

    console.log('🔄 Toggling room selection:', {
      roomID,
      roomNumber: room.RoomNumber,
      isCurrentlySelected,
      currentSelectedCount: safeSelectedRooms.length
    });

    if (isCurrentlySelected) {
      // Remove room from selection
      const updatedSelection = safeSelectedRooms.filter(selectedRoom => 
        selectedRoom.roomID !== roomID && 
        selectedRoom.roomID !== String(roomID) &&
        selectedRoom.RoomID !== roomID &&
        selectedRoom.RoomID !== String(roomID)
      );
      setSelectedRooms(updatedSelection);
      console.log(`➖ Removed room ${room.RoomNumber} from selection`);
    } else {
      // Add room to selection
      const roomToAdd = {
        roomID: roomID,
        roomNumber: room.RoomNumber,
        typeID: room.TypeID,
        typeName: room.TypeName,
        floor: room.Floor,
        capacity: room.Capacity,
        currentPrice: room.CurrentPrice,
        description: room.Description
      };
      
      const updatedSelection = [...safeSelectedRooms, roomToAdd];
      setSelectedRooms(updatedSelection);
      console.log(`➕ Added room ${room.RoomNumber} to selection`);
    }
  };

  // ✅ Validate selection against requirements
  const validateSelection = () => {
    const requiredRooms = getRequiredRooms();
    const errors = [];

    if (safeSelectedRooms.length === 0) {
      errors.push('Vui lòng chọn ít nhất một phòng');
      return { isValid: false, errors };
    }

    // Check if selection meets requirements
    const selectionByType = {};
    safeSelectedRooms.forEach(room => {
      const typeId = room.typeID || room.TypeID;
      selectionByType[typeId] = (selectionByType[typeId] || 0) + 1;
    });

    requiredRooms.forEach(requirement => {
      const typeId = requirement.roomTypeID || requirement.roomTypeId;
      const required = requirement.quantity || 1;
      const selected = selectionByType[typeId] || 0;

      if (selected < required) {
        errors.push(`Cần chọn ${required} phòng ${requirement.roomTypeName || 'loại ' + typeId}, hiện tại chỉ chọn ${selected}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // ✅ Handle confirm selection - Pass data to parent for API call
  const handleConfirm = async () => {
    const validation = validateSelection();
    
    if (!validation.isValid) {
      alert('Lỗi: ' + validation.errors.join('\n'));
      return;
    }

    if (!bookingData?.bookingID) {
      alert('Lỗi: Không tìm thấy thông tin booking');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔄 Preparing room assignment data for online booking:', {
        bookingID: bookingData.bookingID,
        selectedRooms: safeSelectedRooms,
        numberOfGuest: bookingData.numberOfGuest,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut
      });

      // ✅ Prepare room data for assignment
      const roomsForAssignment = safeSelectedRooms.map(room => ({
        roomID: room.roomID || room.RoomID,
        roomNumber: room.roomNumber || room.RoomNumber,
        typeID: room.typeID || room.TypeID,
        typeName: room.typeName || room.TypeName,
        checkInAt: bookingData.checkIn || new Date(),
        checkOutAt: bookingData.checkOut || new Date(),
        capacity: room.capacity || room.Capacity,
        currentPrice: room.currentPrice || room.CurrentPrice
      }));

      // ✅ Pass data to parent component for API call
      await onRoomSelectionComplete({
        booking: bookingData,
        selectedRooms: roomsForAssignment
      });

      onClose();
      
    } catch (error) {
      console.error('❌ Error completing room assignment:', error);
      alert('Có lỗi xảy ra khi gán phòng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get room status information
  const getRoomStatusInfo = (room) => {
    const status = room.Status || room.status || 'available';
    
    switch (status.toLowerCase()) {
      case 'available':
      case 'trống':
        return { text: 'Có sẵn', color: '#28a745', icon: 'fas fa-check-circle' };
      case 'occupied':
      case 'đang sử dụng':
        return { text: 'Đang sử dụng', color: '#dc3545', icon: 'fas fa-user' };
      case 'reserved':
      case 'đã đặt':
        return { text: 'Đã đặt', color: '#ffc107', icon: 'fas fa-clock' };
      case 'maintenance':
      case 'bảo trì':
        return { text: 'Bảo trì', color: '#6c757d', icon: 'fas fa-tools' };
      default:
        return { text: status, color: '#6c757d', icon: 'fas fa-question' };
    }
  };

  if (!isOpen) return null;

  const requiredRooms = getRequiredRooms();
  const totalRequired = requiredRooms.reduce((sum, rt) => sum + (rt.quantity || 0), 0);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* ✅ Header */}
        <div className={styles.modalHeader}>
          <h4>
            <i className={`fas ${isCheckIn ? 'fa-key text-primary' : 'fa-door-open'} me-2`}></i>
            {isCheckIn ? 'Check-in với gán phòng' : 'Chọn phòng cho đặt phòng online'}
          </h4>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* ✅ Booking Info */}
        <div className={styles.bookingInfo}>
          <div className={styles.bookingHeader}>
            <h5>
              <i className="fas fa-info-circle me-2"></i>
              Thông tin đặt phòng (ID: {bookingData?.bookingID || 'N/A'})
            </h5>
          </div>
          
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span><i className="fas fa-user me-1"></i>Khách hàng:</span>
              <strong>{bookingData?.customerName || bookingData?.guestName || 'Online Customer'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span><i className="fas fa-users me-1"></i>Số khách:</span>
              <strong>{bookingData?.numberOfGuest || 0} người</strong>
            </div>
            <div className={styles.infoRow}>
              <span><i className="fas fa-calendar-check me-1"></i>Check-in:</span>
              <strong>{bookingData?.checkIn ? new Date(bookingData.checkIn).toLocaleDateString('vi-VN') : 'N/A'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span><i className="fas fa-calendar-times me-1"></i>Check-out:</span>
              <strong>{bookingData?.checkOut ? new Date(bookingData.checkOut).toLocaleDateString('vi-VN') : 'N/A'}</strong>
            </div>
            {bookingData?.specialRequest && (
              <div className={styles.infoRow}>
                <span><i className="fas fa-clipboard-list me-1"></i>Yêu cầu đặc biệt:</span>
                <strong>{bookingData.specialRequest}</strong>
              </div>
            )}
            <div className={styles.infoRow}>
              <span><i className="fas fa-info me-1"></i>Trạng thái:</span>
              <strong className={styles.statusBadge}>
                {bookingData?.bookingStatus || 'Pending'}
              </strong>
            </div>
          </div>
        </div>

        {/* ✅ Requirements */}
        <div className={styles.requirementSection}>
          <h6>
            <i className="fas fa-list-check me-2"></i>
            Yêu cầu phòng cần gán:
          </h6>
          <div className={styles.requirements}>
            {requiredRooms.length > 0 ? (
              requiredRooms.map((req, index) => (
                <div 
                  key={`requirement-${req.roomTypeID || req.roomTypeId}-${index}`}
                  className={styles.requirement}
                >
                  <div className={styles.requirementInfo}>
                    <span className={styles.requirementQuantity}>
                      {req.quantity}x
                    </span>
                    <span className={styles.requirementName}>
                      {req.roomTypeName || `Loại phòng ${req.roomTypeID || req.roomTypeId}`}
                    </span>
                  </div>
                  <span className={styles.price}>
                    {req.roomTypePrice?.toLocaleString('vi-VN') || 0}đ/đêm
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.noRequirements}>
                <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                Không có yêu cầu phòng cụ thể. Vui lòng chọn phòng phù hợp.
              </div>
            )}
          </div>
          <div className={styles.selectionSummary}>
            <div className={styles.totalRequired}>
              <i className="fas fa-calculator me-2"></i>
              <strong>Tổng cần: {totalRequired} phòng</strong>
            </div>
            <div className={styles.totalSelected}>
              <i className="fas fa-check-double me-2"></i>
              <strong>Đã chọn: {safeSelectedRooms.length} phòng</strong>
            </div>
            {safeSelectedRooms.length < totalRequired && (
              <div className={styles.selectionWarning}>
                <i className="fas fa-exclamation-circle me-2"></i>
                Cần chọn thêm {totalRequired - safeSelectedRooms.length} phòng
              </div>
            )}
          </div>
        </div>

        {/* ✅ Rooms Section */}
        <div className={styles.roomsSection}>
          <h6>Phòng có sẵn ({Object.keys(roomsByType).length} loại):</h6>
          
          {Object.keys(roomsByType).length === 0 ? (
            <div className={styles.noRooms}>
              <i className="fas fa-exclamation-triangle"></i>
              <p>Không có phòng trống phù hợp</p>
            </div>
          ) : (
            <div className={styles.roomTypesList}>
              {Object.values(roomsByType).map(roomTypeGroup => (
                <div key={`roomtype-${roomTypeGroup.typeId}`} className={styles.roomTypeGroup}>
                  <div className={styles.roomTypeHeader}>
                    <h6>{roomTypeGroup.typeName}</h6>
                    <span className={styles.roomTypePrice}>
                      ({roomTypeGroup.rooms.length} phòng có sẵn)
                    </span>
                  </div>
                  
                  <div className={styles.roomsList}>
                    {roomTypeGroup.rooms.map((room) => {
                      const statusInfo = getRoomStatusInfo(room);
                      const isSelected = isRoomSelected(room.RoomID);
                      
                      return (
                        <div
                          key={room.uniqueKey || `room-${room.RoomID}-${room.RoomNumber}`}
                          className={`${styles.roomCard} ${isSelected ? styles.selected : ''}`}
                          onClick={() => toggleRoomSelection(room)}
                        >
                          <div className={styles.roomHeader}>
                            <div className={styles.roomNumber}>
                              <i className="fas fa-door-closed me-1"></i>
                              Phòng {room.RoomNumber}
                            </div>
                            <div 
                              className={styles.roomStatus}
                              style={{ color: statusInfo.color }}
                            >
                              <i className={statusInfo.icon}></i>
                              <span>{statusInfo.text}</span>
                            </div>
                          </div>
                          
                          <div className={styles.roomDetails}>
                            <div className={styles.roomInfo}>
                              <span>
                                <i className="fas fa-layer-group me-1"></i>
                                Tầng {room.Floor}
                              </span>
                              <span>
                                <i className="fas fa-users me-1"></i>
                                {room.Capacity} người
                              </span>
                            </div>
                            <div className={styles.roomPrice}>
                              {room.CurrentPrice?.toLocaleString('vi-VN')}đ/đêm
                            </div>
                          </div>
                          
                          {room.Description && (
                            <div className={styles.roomDescription}>
                              {room.Description}
                            </div>
                          )}
                          
                          {isSelected && (
                            <div className={styles.selectedIndicator}>
                              <i className="fas fa-check"></i>
                              Đã chọn
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Footer */}
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            <i className="fas fa-times me-2"></i>
            Hủy
          </button>
          <button 
            className={`${styles.confirmButton} ${loading ? styles.loading : ''}`}
            onClick={handleConfirm}
            disabled={safeSelectedRooms.length === 0 || loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin me-2"></i>
                Đang xử lý...
              </>
            ) : (
              <>
                <i className={`fas ${isCheckIn ? 'fa-key' : 'fa-check'} me-2`}></i>
                {isCheckIn 
                  ? `Check-in ngay (${safeSelectedRooms.length} phòng)` 
                  : `Xác nhận (${safeSelectedRooms.length} phòng)`
                }
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSelectionModalOnline;