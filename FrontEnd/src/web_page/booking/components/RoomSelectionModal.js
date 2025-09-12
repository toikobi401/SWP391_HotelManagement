import React, { useState, useEffect } from 'react';
import styles from './RoomSelectionModal.module.css';
import { toast } from 'react-toastify';

const RoomSelectionModal = ({
  isOpen,
  onClose,
  bookingData,
  availableRooms,
  onRoomSelectionComplete,
  selectedRooms,
  setSelectedRooms
}) => {
  const [roomsByType, setRoomsByType] = useState({});
  const [loading, setLoading] = useState(false);

  // ✅ GIỮ LẠI: Khai báo safeSelectedRooms đầu tiên (đúng vị trí)
  const safeSelectedRooms = Array.isArray(selectedRooms) ? selectedRooms : [];

  // ✅ SỬA: getRequiredRooms - Multiple fallback approaches (keeping existing logic)
  const getRequiredRooms = () => {
    console.log('🔍 Getting required rooms from multiple sources:', {
      fromBookingDataSelectedRooms: bookingData?.selectedRooms?.length || 0,
      fromBookingDataRequestedRoomTypes: bookingData?.requestedRoomTypes?.length || 0,
      fromAvailableRoomsResponse: availableRooms?.meta?.roomRequirements?.length || 0,
      bookingDataKeys: bookingData ? Object.keys(bookingData) : []
    });
    
    // ✅ Method 1: Từ bookingData.selectedRooms (primary)
    if (bookingData?.selectedRooms && Array.isArray(bookingData.selectedRooms) && bookingData.selectedRooms.length > 0) {
      console.log('✅ Using selectedRooms from bookingData');
      return bookingData.selectedRooms;
    }
    
    // ✅ Method 2: Từ bookingData.requestedRoomTypes (fallback 1)
    if (bookingData?.requestedRoomTypes && Array.isArray(bookingData.requestedRoomTypes) && bookingData.requestedRoomTypes.length > 0) {
      console.log('✅ Using requestedRoomTypes from bookingData');
      return bookingData.requestedRoomTypes;
    }
    
    // ✅ Method 3: Từ API response metadata (fallback 2)
    if (bookingData?.roomRequirements && Array.isArray(bookingData.roomRequirements) && bookingData.roomRequirements.length > 0) {
      console.log('✅ Using roomRequirements from API response');
      return bookingData.roomRequirements;
    }
    
    // ✅ Method 4: Parse từ original formData nếu có (fallback 3)
    if (typeof window !== 'undefined' && window.formData?.selectedRooms) {
      console.log('✅ Using selectedRooms from window.formData');
      return window.formData.selectedRooms;
    }
    
    console.warn('⚠️ No required rooms found from any source');
    return [];
  };

  // ✅ SỬA: Enhanced useEffect để xử lý room grouping (keeping existing logic)
  useEffect(() => {
    console.log('🔍 RoomSelectionModal: Processing available rooms:', {
      availableRoomsCount: availableRooms?.length || 0,
      availableRoomsType: typeof availableRooms,
      isArray: Array.isArray(availableRooms),
      firstRoom: availableRooms?.[0],
      bookingDataExists: !!bookingData,
      bookingDataKeys: bookingData ? Object.keys(bookingData) : [],
      requiredRoomsCount: getRequiredRooms().length
    });

    if (!Array.isArray(availableRooms) || availableRooms.length === 0) {
      console.log('⚠️ No available rooms to process');
      setRoomsByType({});
      return;
    }

    try {
      // ✅ Group rooms by type với enhanced error handling
      const groupedRooms = {};
      
      availableRooms.forEach((room, index) => {
        try {
          console.log(`🔍 Processing room ${index + 1}:`, {
            roomId: room.RoomID || room.roomId,
            roomNumber: room.RoomNumber || room.roomNumber,
            typeId: room.TypeID || room.typeId || room.RoomTypeID,
            typeName: room.TypeName || room.typeName
          });
          
          // ✅ Multiple field name fallbacks
          const roomTypeId = room.TypeID || room.typeId || room.RoomTypeID || room.roomTypeId;
          const roomTypeName = room.TypeName || room.typeName || room.RoomTypeName || `Type ${roomTypeId}`;
          const basePrice = room.BasePrice || room.basePrice || room.Price || room.price || 0;
          
          if (!roomTypeId) {
            console.warn(`⚠️ Room ${index} missing TypeID:`, room);
            return;
          }
          
          if (!groupedRooms[roomTypeId]) {
            groupedRooms[roomTypeId] = {
              typeID: roomTypeId,
              typeName: roomTypeName,
              basePrice: basePrice,
              rooms: []
            };
          }
          
          groupedRooms[roomTypeId].rooms.push(room);
          
        } catch (roomError) {
          console.error(`❌ Error processing room ${index}:`, roomError, room);
        }
      });
      
      console.log('✅ Rooms grouped by type:', {
        roomTypesCount: Object.keys(groupedRooms).length,
        roomTypes: Object.keys(groupedRooms).map(typeId => ({
          typeId,
          typeName: groupedRooms[typeId].typeName,
          roomCount: groupedRooms[typeId].rooms.length
        })),
        totalRoomsProcessed: availableRooms.length
      });
      
      setRoomsByType(groupedRooms);
      
    } catch (error) {
      console.error('❌ Error grouping rooms:', error);
      setRoomsByType({});
    }
  }, [availableRooms, bookingData]);

  // ✅ Check if room is selected with safety check (keeping existing logic)
  const isRoomSelected = (roomID) => {
    if (!Array.isArray(safeSelectedRooms)) return false;
    return safeSelectedRooms.some(room => 
      (room.RoomID || room.roomId) === roomID
    );
  };

  // ✅ Toggle room selection with proper state management (keeping existing logic)
  const toggleRoomSelection = (room) => {
    const roomID = room.RoomID || room.roomId;
    const roomNumber = room.RoomNumber || room.roomNumber;
    
    console.log('🔄 Toggling room selection:', `${room.TypeID || room.typeId}-${roomNumber} (${roomID})`, 
               'currently selected:', isRoomSelected(roomID));
    
    if (isRoomSelected(roomID)) {
      console.log('➖ Removed room', `${room.TypeID || room.typeId}-${roomNumber}`, 'from selection');
      setSelectedRooms(prev => prev.filter(r => (r.RoomID || r.roomId) !== roomID));
    } else {
      console.log('➕ Added room', `${room.TypeID || room.typeId}-${roomNumber}`, 'to selection');
      setSelectedRooms(prev => [...prev, room]); // ✅ THÊM DÒNG NÀY
    }
  };

  // ✅ Enhanced validation với room type checking (keeping existing logic)
  const validateSelection = () => {
    const requiredRooms = getRequiredRooms();
    const errors = [];
    
    if (requiredRooms.length === 0) {
      console.warn('⚠️ No room requirements found for validation');
      return { isValid: true, errors: [] };
    }
    
    const totalRequired = requiredRooms.reduce((sum, rt) => sum + (rt.quantity || 0), 0);
    
    if (safeSelectedRooms.length !== totalRequired) {
      errors.push(`Cần chọn ${totalRequired} phòng, hiện tại đã chọn ${safeSelectedRooms.length} phòng`);
    }
    
    // Validate from room type perspective
    for (const reqType of requiredRooms) {
      const selectedOfType = safeSelectedRooms.filter(room => {
        const roomTypeId = room.TypeID || room.typeId || room.RoomTypeID;
        return String(roomTypeId) === String(reqType.roomTypeId);
      });
      
      if (selectedOfType.length !== reqType.quantity) {
        const roomTypeName = roomsByType[reqType.roomTypeId]?.typeName || reqType.roomTypeId;
        errors.push(`Loại phòng ${roomTypeName}: cần ${reqType.quantity}, đã chọn ${selectedOfType.length}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // ✅ Handle confirm selection with better error handling (keeping existing logic)
  const handleConfirm = async () => {
    setLoading(true);
    
    try {
      const requiredRooms = getRequiredRooms();
      
      if (requiredRooms.length === 0) {
        throw new Error('Không có yêu cầu phòng nào');
      }
      
      const totalRequired = requiredRooms.reduce((sum, rt) => sum + (rt.quantity || 0), 0);
      
      if (safeSelectedRooms.length !== totalRequired) {
        throw new Error(`Cần chọn ${totalRequired} phòng, hiện tại đã chọn ${safeSelectedRooms.length} phòng`);
      }
      
      // ✅ Validate từng room type requirement
      for (const reqType of requiredRooms) {
        const selectedOfType = safeSelectedRooms.filter(room => {
          const roomTypeId = room.TypeID || room.typeId || room.RoomTypeID;
          return String(roomTypeId) === String(reqType.roomTypeId);
        });
        
        if (selectedOfType.length !== reqType.quantity) {
          const roomTypeName = roomsByType[reqType.roomTypeId]?.typeName || reqType.roomTypeId;
          throw new Error(`Loại phòng ${roomTypeName}: cần ${reqType.quantity}, đã chọn ${selectedOfType.length}`);
        }
      }
      
      console.log('✅ Room selection validation passed, confirming assignment...');
      
      // ✅ Gọi completion callback với data đầy đủ
      const completionData = {
        bookingID: bookingData.bookingID || bookingData.bookingId,
        selectedRooms: safeSelectedRooms,
        roomsByType: roomsByType,
        bookingData: bookingData
      };
      
      await onRoomSelectionComplete(completionData);
      
    } catch (error) {
      console.error('❌ Room selection confirmation failed:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get room status indicator (keeping existing logic)
  const getRoomStatusInfo = (room) => {
    const status = room.Status || room.status || 'Available';
    
    const statusMap = {
      'Available': { label: 'Trống', color: '#28a745', icon: 'fas fa-check-circle' },
      'Occupied': { label: 'Đang sử dụng', color: '#dc3545', icon: 'fas fa-times-circle' },
      'Reserved': { label: 'Đã đặt', color: '#ffc107', icon: 'fas fa-clock' },
      'Maintenance': { label: 'Bảo trì', color: '#6c757d', icon: 'fas fa-tools' },
      'Cleaning': { label: 'Dọn dẹp', color: '#17a2b8', icon: 'fas fa-broom' }
    };
    
    return statusMap[status] || statusMap['Available'];
  };

  if (!isOpen) return null;

  const requiredRooms = getRequiredRooms();
  const totalRequired = requiredRooms.reduce((sum, rt) => sum + (rt.quantity || 0), 0);
  // ✅ SỬ DỤNG: safeSelectedRooms đã được khai báo ở đầu component

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h4>
            <i className="fas fa-bed me-2"></i>
            Chọn phòng cho Booking #{bookingData?.bookingID}
          </h4>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Booking Info */}
        <div className={styles.bookingInfo}>
          <div className={styles.infoRow}>
            <span><strong>Khách hàng:</strong> {bookingData?.guest?.guestName || bookingData?.guestName || 'Walk-in Guest'}</span>
            <span><strong>Số khách:</strong> {bookingData?.numberOfGuest || 0} người</span>
          </div>
          <div className={styles.infoRow}>
            <span><strong>Check-in:</strong> {bookingData?.checkInDate ? new Date(bookingData.checkInDate).toLocaleString('vi-VN') : 'N/A'}</span>
            <span><strong>Check-out:</strong> {bookingData?.checkOutDate ? new Date(bookingData.checkOutDate).toLocaleString('vi-VN') : 'N/A'}</span>
          </div>
        </div>

        {/* Requirements Section */}
        <div className={styles.requirementSection}>
          <h6><i className="fas fa-list-check me-2"></i>Yêu cầu phòng:</h6>
          <div className={styles.requirements}>
            {requiredRooms.map((req, index) => {
              const roomType = roomsByType[req.roomTypeId];
              const selectedOfType = safeSelectedRooms.filter(room => {
                const roomTypeId = room.TypeID || room.typeId || room.RoomTypeID;
                return String(roomTypeId) === String(req.roomTypeId);
              });
              
              return (
                <div key={index} className={`${styles.requirement} ${selectedOfType.length === req.quantity ? styles.fulfilled : ''}`}>
                  <span>{roomType?.typeName || `Loại ${req.roomTypeId}`}: </span>
                  <span className={selectedOfType.length === req.quantity ? styles.fulfilled : styles.pending}>
                    {selectedOfType.length}/{req.quantity} phòng
                  </span>
                </div>
              );
            })}
          </div>
          <div className={styles.totalRequired}>
            <strong>
              Tổng cần: {totalRequired} phòng | Đã chọn: {safeSelectedRooms.length} phòng
              {safeSelectedRooms.length === totalRequired && (
                <i className="fas fa-check-circle ms-2" style={{color: '#28a745'}}></i>
              )}
            </strong>
          </div>
        </div>

        {/* Rooms Section */}
        <div className={styles.roomsSection}>
          <h6><i className="fas fa-door-open me-2"></i>Phòng có sẵn ({Object.values(roomsByType).reduce((sum, type) => sum + type.rooms.length, 0)} phòng):</h6>
          
          {Object.keys(roomsByType).length === 0 ? (
            <div className={styles.noRooms}>
              <i className="fas fa-exclamation-circle"></i>
              <p>Không có phòng trống phù hợp với yêu cầu</p>
              <small>Kiểm tra lại thời gian hoặc loại phòng yêu cầu</small>
            </div>
          ) : (
            <div className={styles.roomTypesList}>
              {Object.values(roomsByType).map((roomType) => (
                <div key={roomType.typeID} className={styles.roomTypeGroup}>
                  <div className={styles.roomTypeHeader}>
                    <h6>{roomType.typeName} ({roomType.rooms.length} phòng)</h6>
                    <span className={styles.roomTypePrice}>
                      {roomType.basePrice.toLocaleString('vi-VN')}đ/đêm
                    </span>
                  </div>
                  
                  <div className={styles.roomsList}>
                    {roomType.rooms.map((room) => {
                      const roomID = room.RoomID || room.roomId;
                      const roomNumber = room.RoomNumber || room.roomNumber;
                      const isSelected = isRoomSelected(roomID);
                      const statusInfo = getRoomStatusInfo(room);
                      
                      return (
                        <div 
                          key={roomID}
                          className={`${styles.roomCard} ${isSelected ? styles.selected : ''}`}
                          onClick={() => toggleRoomSelection(room)}
                        >
                          <div className={styles.roomHeader}>
                            <div className={styles.roomNumber}>{roomNumber}</div>
                            <div 
                              className={styles.roomStatus}
                              style={{ color: statusInfo.color }}
                            >
                              <i className={statusInfo.icon}></i>
                              <span>{statusInfo.label}</span>
                            </div>
                          </div>
                          
                          <div className={styles.roomDetails}>
                            <div className={styles.roomInfo}>
                              <span><i className="fas fa-users"></i> {room.Capacity || room.capacity || 2} người</span>
                              <span><i className="fas fa-layer-group"></i> Tầng {room.Floor || room.floor}</span>
                            </div>
                            <div className={styles.roomPrice}>
                              {roomType.basePrice.toLocaleString('vi-VN')}đ
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

        {/* Modal Footer */}
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
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={safeSelectedRooms.length !== totalRequired || loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin me-2"></i>
                Đang xử lý...
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                Xác nhận gán phòng ({safeSelectedRooms.length}/{totalRequired})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSelectionModal;