import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './RoomForm.css';

function AddRoomForm() {
  const [roomNumber, setRoomNumber] = useState('');
  const [typeId, setTypeId] = useState('');
  const [floor, setFloor] = useState('');
  const [capacity, setCapacity] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [status, setStatus] = useState('available');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const navigate = useNavigate();

  // ✅ FETCH ROOM TYPES TỪ API THAY VÌ HARDCODE
  useEffect(() => {
    fetchRoomTypes();
  }, []);

  const fetchRoomTypes = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching room types from API...');
      
      // ✅ SỬA: Sử dụng endpoint đúng
      const response = await fetch('http://localhost:3000/api/room-types', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Room types response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Room types fetched successfully:', responseData);
        
        // ✅ SỬA: Xử lý dữ liệu response đúng cách
        const roomTypesData = responseData.data || responseData || [];
        
        if (Array.isArray(roomTypesData) && roomTypesData.length > 0) {
          setRoomTypes(roomTypesData);
          console.log('📝 Room types set:', roomTypesData.length, 'types');
        } else {
          console.warn('⚠️ No room types found, using fallback');
          setFallbackRoomTypes();
        }
      } else {
        console.error('❌ Failed to fetch room types:', response.status);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch room types');
      }
    } catch (error) {
      console.error('❌ Error fetching room types:', error);
      setFallbackRoomTypes();
      toast.error('Không thể tải danh sách loại phòng từ server');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FALLBACK ROOM TYPES NẾU API FAIL
  const setFallbackRoomTypes = () => {
    console.log('🔄 Setting fallback room types...');
    const fallbackTypes = [
      { TypeId: 1, TypeName: 'Phòng thường', BasePrice: 300000, Description: 'Phòng tiêu chuẩn với tiện nghi cơ bản' },
      { TypeId: 2, TypeName: 'Phòng gia đình', BasePrice: 500000, Description: 'Phòng rộng rãi phù hợp cho gia đình' },
      { TypeId: 4, TypeName: 'Phòng đơn', BasePrice: 250000, Description: 'Phòng với 1 giường đơn' },
      { TypeId: 5, TypeName: 'Phòng đôi', BasePrice: 400000, Description: 'Phòng với 1 giường đôi' },
      { TypeId: 6, TypeName: 'Phòng cao cấp', BasePrice: 800000, Description: 'Phòng với tiện nghi cao cấp' },
      { TypeId: 7, TypeName: 'Phòng tiết kiệm', BasePrice: 200000, Description: 'Phòng giá rẻ với tiện nghi cơ bản' }
    ];
    setRoomTypes(fallbackTypes);
  };

  // ✅ AUTO-SET PRICE KHI CHỌN ROOM TYPE
  useEffect(() => {
    if (typeId && roomTypes.length > 0) {
      const selectedType = roomTypes.find(type => type.TypeId.toString() === typeId);
      if (selectedType && selectedType.BasePrice) {
        setCurrentPrice(selectedType.BasePrice.toString());
        console.log('💰 Auto-set price for type', typeId, ':', selectedType.BasePrice);
      }
    }
  }, [typeId, roomTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!roomNumber.trim()) {
        toast.error('Vui lòng nhập số phòng');
        return;
    }
    
    if (!typeId) {
        toast.error('Vui lòng chọn loại phòng');
        return;
    }
    
    if (!floor) {
        toast.error('Vui lòng chọn tầng');
        return;
    }
    
    if (!capacity) {
        toast.error('Vui lòng chọn sức chứa');
        return;
    }

    if (!currentPrice || parseFloat(currentPrice) <= 0) {
        toast.error('Vui lòng nhập giá phòng hợp lệ');
        return;
    }

    // Validate RoomType tồn tại
    const selectedRoomType = roomTypes.find(type => type.TypeId.toString() === typeId);
    if (!selectedRoomType) {
        toast.error('Loại phòng đã chọn không hợp lệ');
        return;
    }

    try {
        setSubmitLoading(true);
        
        // Prepare room data according to Room model structure
        const roomData = {
            RoomNumber: roomNumber.trim(),
            TypeID: parseInt(typeId),
            Floor: parseInt(floor),
            Capacity: parseInt(capacity),
            CurrentPrice: parseFloat(currentPrice),
            Status: status,
            Description: description.trim(),
            CreateAt: new Date().toISOString(),
            UpdateAt: new Date().toISOString() // ✅ SỬA TÊN FIELD
        };

        console.log('📤 Sending room data:', roomData);
        console.log('🏷️ Selected room type:', selectedRoomType);

        const response = await fetch('http://localhost:3000/api/rooms', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomData)
        });

        const responseData = await response.json();
        console.log('📥 Server response:', responseData);

        if (response.ok && responseData.success) {
            toast.success(`Thêm phòng ${roomNumber} (${selectedRoomType.TypeName}) thành công!`);
            
            // Handle amenities if any were selected
            if (amenities.length > 0 && responseData.roomId) {
                await handleAmenities(responseData.roomId);
            }
            
            // Navigate back to rooms list
            setTimeout(() => {
                navigate('/manager/rooms');
            }, 1500);
        } else {
            throw new Error(responseData.message || 'Có lỗi xảy ra khi thêm phòng');
        }
    } catch (error) {
        console.error('❌ Error adding room:', error);
        toast.error(error.message || 'Lỗi kết nối đến máy chủ');
    } finally {
        setSubmitLoading(false);
    }
  };

  // Handle adding amenities to the newly created room
  const handleAmenities = async (roomId) => {
    try {
      for (const amenityName of amenities) {
        // This would require an amenity lookup endpoint
        console.log(`🎯 Would assign amenity ${amenityName} to room ${roomId}`);
      }
    } catch (error) {
      console.error('❌ Error adding amenities:', error);
      toast.warning('Phòng đã được tạo nhưng có lỗi khi thêm tiện nghi');
    }
  };

  // Static data for form options
  const floors = [1, 2, 3, 4, 5];
  const capacities = [1, 2, 3, 4, 5, 6];
  
  const statusOptions = [
    { value: 'available', label: 'Có sẵn' },
    { value: 'occupied', label: 'Đang sử dụng' },
    { value: 'reserved', label: 'Đã đặt' },
    { value: 'maintenance', label: 'Bảo trì' }
  ];

  const amenityOptions = [
    'Kitchenette',
    'Sea view',
    'Jacuzzi',
    'Smart TV',
    'Controlls tablet',
  ];

  const amenityTranslations = {
    'Kitchenette': 'Bếp mini',
    'Sea view': 'View biển',
    'Jacuzzi': 'Bồn tắm',
    'Smart TV': 'TV thông minh',
    'Controlls tablet': 'Máy tính bảng điều khiển',
  };

  if (loading) {
    return (
      <div className="room-form-container">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Đang tải...</span>
          </div>
          <p>Đang tải thông tin loại phòng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-form-container">
      <h2 className="mb-3">Thêm phòng mới</h2>
      
      {/* ✅ HIỂN THỊ THÔNG TIN DEBUG NẾU CẦN */}
      {process.env.NODE_ENV === 'development' && (
        <div className="alert alert-info">
          <small>
            🔍 Debug: Đã tải {roomTypes.length} loại phòng từ {roomTypes.length > 0 && roomTypes[0].TypeId ? 'database' : 'fallback'}
          </small>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Số phòng: <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="Ví dụ: 101, A01, ..."
            required
          />
        </div>

        <div className="form-group">
          <label>Loại phòng: <span className="text-danger">*</span></label>
          <select
            className="form-control"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            required
          >
            <option value="">Chọn loại phòng</option>
            {roomTypes.map((type) => (
              <option key={type.TypeId} value={type.TypeId}>
                {type.TypeName} - {type.BasePrice?.toLocaleString('vi-VN')}đ
                {type.Description && ` (${type.Description})`}
              </option>
            ))}
          </select>
          {/* ✅ HIỂN THỊ THÔNG TIN LOẠI PHÒNG ĐÃ CHỌN */}
          {typeId && roomTypes.length > 0 && (
            <small className="text-muted">
              {(() => {
                const selectedType = roomTypes.find(type => type.TypeId.toString() === typeId);
                return selectedType ? `📝 ${selectedType.Description || 'Không có mô tả'}` : '';
              })()}
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Tầng: <span className="text-danger">*</span></label>
          <select
            className="form-control"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            required
          >
            <option value="">Chọn tầng</option>
            {floors.map((f) => (
              <option key={f} value={f}>{`Tầng ${f}`}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Sức chứa: <span className="text-danger">*</span></label>
          <select
            className="form-control"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          >
            <option value="">Chọn sức chứa</option>
            {capacities.map((c) => (
              <option key={c} value={c}>{c} người</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Giá hiện tại (VND): <span className="text-danger">*</span></label>
          <input
            type="number"
            className="form-control"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            placeholder="Nhập giá phòng"
            min="0"
            step="1000"
            required
          />
          {currentPrice && (
            <small className="text-muted">
              💰 Giá: {parseFloat(currentPrice).toLocaleString('vi-VN')}đ
              {typeId && roomTypes.length > 0 && (() => {
                const selectedType = roomTypes.find(type => type.TypeId.toString() === typeId);
                const basePrice = selectedType?.BasePrice;
                if (basePrice && parseFloat(currentPrice) !== basePrice) {
                  const diff = parseFloat(currentPrice) - basePrice;
                  return ` (${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')}đ so với giá gốc)`;
                }
                return basePrice ? ' (giá gốc)' : '';
              })()}
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Trạng thái:</label>
          <select
            className="form-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Mô tả:</label>
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết về phòng..."
            rows="3"
          />
        </div>

        <div className="form-group">
          <label className="mb-2 d-block">Tiện nghi:</label>
          <div className="btn-group flex-wrap" role="group" aria-label="Amenity toggle buttons">
            {amenityOptions.map((amenity) => {
              const isActive = amenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  className={`btn btn-outline-primary m-1 ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (isActive) {
                      setAmenities(amenities.filter((a) => a !== amenity));
                    } else {
                      setAmenities([...amenities, amenity]);
                    }
                  }}
                >
                  {amenityTranslations[amenity] || amenity}
                </button>
              );
            })}
          </div>
          {amenities.length > 0 && (
            <small className="text-muted">
              🎯 Đã chọn {amenities.length} tiện nghi
            </small>
          )}
        </div>

        <div className="d-flex gap-2 mt-4">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitLoading}
          >
            {submitLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang thêm...
              </>
            ) : (
              'Thêm phòng'
            )}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/manager/rooms')}
            disabled={submitLoading}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddRoomForm;