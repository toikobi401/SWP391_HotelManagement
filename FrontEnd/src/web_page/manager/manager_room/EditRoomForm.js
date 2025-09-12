import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import './RoomForm.css';
import SimpleModal from '../../UI component/Modal/SimpleModal';

const floors = [1, 2, 3, 4, 5];
const capacities = [1, 2, 3, 4, 5, 6];

const statusOptions = [
    { value: 'available', label: 'Có sẵn' },
    // { value: 'occupied', label: 'Đang sử dụng' },
    // { value: 'reserved', label: 'Đã đặt' },
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

// ✅ THÊM: Helper function để check trạng thái có thể edit không
const canEditRoom = (status) => {
    const editableStatuses = ['available', 'maintenance', 'trống', 'bảo trì'];
    return editableStatuses.includes(status?.toLowerCase());
};

const getStatusDisplayInfo = (status) => {
    const statusMap = {
        'available': { text: 'Có sẵn', color: '#28a745', icon: 'fa-check-circle', canEdit: true },
        'maintenance': { text: 'Bảo trì', color: '#6c757d', icon: 'fa-tools', canEdit: true },
        'occupied': { text: 'Đang sử dụng', color: '#dc3545', icon: 'fa-user', canEdit: false },
        'reserved': { text: 'Đã đặt', color: '#ffc107', icon: 'fa-clock', canEdit: false },
        'trống': { text: 'Có sẵn', color: '#28a745', icon: 'fa-check-circle', canEdit: true },
        'bảo trì': { text: 'Bảo trì', color: '#6c757d', icon: 'fa-tools', canEdit: true }
    };
    
    return statusMap[status?.toLowerCase()] || { 
        text: status || 'Không xác định', 
        color: '#6c757d', 
        icon: 'fa-question', 
        canEdit: false 
    };
};

function EditRoomForm({ isModal = false, isOpen = true, onClose, roomId: propRoomId, onSuccess }) {
    const [roomData, setRoomData] = useState({
        RoomNumber: '',
        TypeID: '',
        Floor: '',
        Capacity: '',
        CurrentPrice: '',
        Status: 'available',
        Description: ''
    });
    const [originalData, setOriginalData] = useState({});
    const [roomTypes, setRoomTypes] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState('');

    const [canEdit, setCanEdit] = useState(true);
    const [statusRestrictionMessage, setStatusRestrictionMessage] = useState('');

    const navigate = useNavigate();
    const { roomId: urlRoomId } = useParams();
    
    // ✅ SỬ DỤNG ROOMID TỪ PROPS HOẶC URL
    const roomId = propRoomId || urlRoomId;

    // ✅ FETCH ROOM TYPES VÀ ROOM DATA KHI COMPONENT MOUNT
    useEffect(() => {
        const initializeForm = async () => {
            try {
                setLoading(true);
                await Promise.all([
                    fetchRoomTypes(),
                    fetchRoomData()
                ]);
            } catch (error) {
                console.error('Error initializing form:', error);
                setError('Không thể tải dữ liệu phòng. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        if (roomId) {
            initializeForm();
        } else {
            setError('ID phòng không hợp lệ');
            setLoading(false);
        }
    }, [roomId]);

    // ✅ FETCH ROOM TYPES
    const fetchRoomTypes = async () => {
  try {
    // ✅ SỬA: Sử dụng endpoint đúng
    const response = await fetch('http://localhost:3000/api/room-types', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Room types data received:', responseData);
      
      // ✅ SỬA: Xử lý dữ liệu response đúng cách
      const roomTypesData = responseData.data || responseData || [];
      setRoomTypes(roomTypesData);
    } else {
      const errorData = await response.json();
      console.error('❌ Failed to fetch room types:', errorData);
      // Fallback room types
      setRoomTypes([
        { TypeId: 1, TypeName: 'Phòng thường', BasePrice: 300000 },
        { TypeId: 2, TypeName: 'Phòng gia đình', BasePrice: 500000 },
        { TypeId: 4, TypeName: 'Phòng đơn', BasePrice: 250000 },
        { TypeId: 5, TypeName: 'Phòng đôi', BasePrice: 400000 },
        { TypeId: 6, TypeName: 'Phòng cao cấp', BasePrice: 800000 },
        { TypeId: 7, TypeName: 'Phòng tiết kiệm', BasePrice: 200000 }
      ]);
    }
  } catch (error) {
    console.error('Error fetching room types:', error);
    // Set fallback data nếu có lỗi
    setRoomTypes([
      { TypeId: 1, TypeName: 'Phòng thường', BasePrice: 300000 },
      { TypeId: 2, TypeName: 'Phòng gia đình', BasePrice: 500000 },
      { TypeId: 4, TypeName: 'Phòng đơn', BasePrice: 250000 },
      { TypeId: 5, TypeName: 'Phòng đôi', BasePrice: 400000 },
      { TypeId: 6, TypeName: 'Phòng cao cấp', BasePrice: 800000 },
      { TypeId: 7, TypeName: 'Phòng tiết kiệm', BasePrice: 200000 }
    ]);
  }
};

    // ✅ FETCH ROOM DATA
    const fetchRoomData = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log(`🔍 Fetching room data for ID: ${roomId}`);
            
            const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data) {
                    const room = result.data;
                    
                    console.log('✅ Room data fetched:', room);
                    
                    // ✅ THÊM: Check if room can be edited
                    const statusInfo = getStatusDisplayInfo(room.Status);
                    const isEditable = statusInfo.canEdit;
                    
                    setCanEdit(isEditable);
                    
                    if (!isEditable) {
                        setStatusRestrictionMessage(
                            `Không thể chỉnh sửa phòng đang ở trạng thái "${statusInfo.text}". ` +
                            `Chỉ có thể sửa phòng ở trạng thái "Có sẵn" hoặc "Bảo trì".`
                        );
                    } else {
                        setStatusRestrictionMessage('');
                    }
                    
                    const roomData = {
                        RoomNumber: room.RoomNumber || '',
                        TypeID: room.TypeID || '',
                        Floor: room.Floor || '',
                        Capacity: room.Capacity || '',
                        CurrentPrice: room.CurrentPrice || '',
                        Status: room.Status || 'available',
                        Description: room.Description || ''
                    };
                    
                    setRoomData(roomData);
                    setOriginalData({ ...roomData });
                    
                } else {
                    throw new Error(result.message || 'Không thể lấy thông tin phòng');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: Lỗi khi lấy thông tin phòng`);
            }
        } catch (error) {
            console.error('❌ Error fetching room data:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ KIỂM TRA THAY ĐỔI
    useEffect(() => {
        const dataChanged = JSON.stringify(roomData) !== JSON.stringify(originalData);
        setHasChanges(dataChanged);
    }, [roomData, originalData]);

    // ✅ AUTO-SET PRICE KHI CHỌN ROOM TYPE
    useEffect(() => {
        if (roomData.TypeID && roomTypes.length > 0) {
            const selectedType = roomTypes.find(type => type.TypeId.toString() === roomData.TypeID);
            if (selectedType && selectedType.BasePrice && !roomData.CurrentPrice) {
                setRoomData(prev => ({
                    ...prev,
                    CurrentPrice: selectedType.BasePrice.toString()
                }));
            }
        }
    }, [roomData.TypeID, roomTypes]);

    // ✅ HANDLE INPUT CHANGE
    const handleInputChange = (field, value) => {
        setRoomData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // ✅ HANDLE SUBMIT
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (submitLoading) return;
        
        // ✅ THÊM: Check nếu room không thể edit
        if (!canEdit) {
            toast.error('Không thể chỉnh sửa phòng ở trạng thái này');
            return;
        }

        if (!hasChanges) {
            toast.info('Không có thay đổi nào để lưu');
            return;
        }

        try {
            setSubmitLoading(true);
            setError('');
            
            console.log('💾 Updating room with data:', roomData);
            
            // Validate required fields
            if (!roomData.RoomNumber?.trim()) {
                throw new Error('Số phòng không được để trống');
            }
            
            if (!roomData.TypeID) {
                throw new Error('Vui lòng chọn loại phòng');
            }
            
            if (!roomData.Floor) {
                throw new Error('Vui lòng chọn tầng');
            }
            
            if (!roomData.Capacity) {
                throw new Error('Vui lòng chọn sức chứa');
            }
            
            if (!roomData.CurrentPrice || parseFloat(roomData.CurrentPrice) <= 0) {
                throw new Error('Giá phòng phải lớn hơn 0');
            }

            const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    RoomNumber: roomData.RoomNumber.trim(),
                    TypeID: parseInt(roomData.TypeID),
                    Floor: parseInt(roomData.Floor),
                    Capacity: parseInt(roomData.Capacity),
                    CurrentPrice: parseFloat(roomData.CurrentPrice),
                    Status: roomData.Status,
                    Description: roomData.Description?.trim() || ''
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Room updated successfully');
                toast.success('Cập nhật phòng thành công!');
                
                // Update original data to reset hasChanges
                setOriginalData({ ...roomData });
                
                // Call onSuccess callback if provided
                if (onSuccess) {
                    onSuccess(result.data);
                }
                
                // Close modal or navigate back
                if (isModal) {
                    onClose && onClose();
                } else {
                    navigate('/manager/rooms');
                }
            } else {
                throw new Error(result.message || 'Không thể cập nhật phòng');
            }
            
        } catch (error) {
            console.error('❌ Error updating room:', error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    // ✅ HANDLE AMENITIES (PLACEHOLDER)
    const handleAmenities = async () => {
        try {
            // This would require implementation of amenity management endpoints
            console.log('🎯 Would update amenities:', amenities);
        } catch (error) {
            console.error('❌ Error updating amenities:', error);
            toast.warning('Phòng đã được cập nhật nhưng có lỗi khi cập nhật tiện nghi');
        }
    };

    // ✅ HANDLE CANCEL WITH CHANGES WARNING
    const handleCancel = () => {
        if (hasChanges) {
            if (window.confirm('Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn thoát?')) {
                if (isModal && onClose) {
                    onClose();
                } else {
                    navigate('/manager/rooms');
                }
            }
        } else {
            if (isModal && onClose) {
                onClose();
            } else {
                navigate('/manager/rooms');
            }
        }
    };

    // ✅ RESET FORM
    const handleReset = () => {
        if (window.confirm('Bạn có chắc chắn muốn khôi phục về dữ liệu ban đầu?')) {
            setRoomData(originalData);
            setAmenities([]);
        }
    };

    // ✅ THÊM: handleDelete function
    const handleDelete = async () => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa phòng ${originalData.RoomNumber}? Hành động này không thể hoàn tác.`)) {
            return;
        }

        try {
            setSubmitLoading(true);
            setError('');
            
            console.log('🗑️ Deleting room:', roomId);
            
            const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Room deleted successfully');
                toast.success(`Xóa phòng ${originalData.RoomNumber} thành công!`);
                
                // Call onSuccess callback if provided
                if (onSuccess) {
                    onSuccess({ deleted: true, roomId });
                }
                
                // Close modal or navigate back
                if (isModal && onClose) {
                    onClose();
                } else {
                    navigate('/manager/rooms');
                }
            } else {
                throw new Error(result.message || 'Không thể xóa phòng');
            }
            
        } catch (error) {
            console.error('❌ Error deleting room:', error);
            setError(error.message);
            toast.error(`Lỗi khi xóa phòng: ${error.message}`);
        } finally {
            setSubmitLoading(false);
        }
    };

    // ✅ LOADING STATE
    if (loading) {
        return (
            <div className="room-form-container">
                <div className="form-loading">
                    <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Đang tải...</span>
                    </div>
                    <h4>Đang tải thông tin phòng...</h4>
                    <p>Vui lòng đợi trong giây lát</p>
                </div>
            </div>
        );
    }

    // ✅ ERROR STATE
    if (error) {
        return (
            <div className="room-form-container">
                <div className="form-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                        <h5>Có lỗi xảy ra</h5>
                        <p>{error}</p>
                        <button 
                            className="btn btn-outline-primary mt-2"
                            onClick={() => {
                                if (isModal && onClose) {
                                    onClose();
                                } else {
                                    navigate('/manager/rooms');
                                }
                            }}
                        >
                            {isModal ? 'Đóng' : 'Quay lại danh sách phòng'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ KIỂM TRA NẾU KHÔNG HIỂN THỊ MODAL KHI ĐÓNG
    if (isModal && !isOpen) {
        return null;
    }

    // ✅ RENDER FORM CONTENT
    const formContent = (
        <form onSubmit={handleSubmit}>
            {/* ✅ THÊM: Status restriction warning */}
            {!canEdit && statusRestrictionMessage && (
                <div className="alert alert-warning d-flex align-items-center mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <div>
                        <strong>Không thể chỉnh sửa</strong>
                        <p className="mb-0">{statusRestrictionMessage}</p>
                    </div>
                </div>
            )}

            {/* ✅ THÊM: Current status display */}
            {originalData.Status && (
                <div className="mb-3">
                    <div className={`badge ${canEdit ? 'bg-success' : 'bg-warning'} fs-6 p-2`}>
                        <i className={`fas ${getStatusDisplayInfo(originalData.Status).icon} me-2`}></i>
                        Trạng thái hiện tại: {getStatusDisplayInfo(originalData.Status).text}
                        {canEdit && (
                            <span className="ms-2">
                                <i className="fas fa-edit"></i> Có thể chỉnh sửa
                            </span>
                        )}
                    </div>
                </div>
            )}

            {hasChanges && canEdit && (
                <div className="alert alert-warning d-flex align-items-center mb-3">
                    <i className="fas fa-edit me-2"></i>
                    <span>Có thay đổi chưa được lưu</span>
                </div>
            )}

            {/* ✅ SỬA: Disable fields if cannot edit */}
            <div className="form-group">
                <label>Số phòng: <span className="text-danger">*</span></label>
                <input
                    type="text"
                    className={`form-control ${roomData.RoomNumber !== originalData.RoomNumber ? 'field-changed' : ''}`}
                    value={roomData.RoomNumber}
                    onChange={(e) => handleInputChange('RoomNumber', e.target.value)}
                    placeholder="Ví dụ: 101, A01, ..."
                    required
                    disabled={!canEdit || submitLoading} // ✅ Disable if cannot edit
                />
                {roomData.RoomNumber !== originalData.RoomNumber && canEdit && (
                    <small className="text-warning">
                        <i className="fas fa-edit me-1"></i>
                        Đã thay đổi từ: {originalData.RoomNumber}
                    </small>
                )}
            </div>

            <div className="form-group">
                <label>Loại phòng: <span className="text-danger">*</span></label>
                <select
                    className={`form-control ${roomData.TypeID !== originalData.TypeID ? 'field-changed' : ''}`}
                    value={roomData.TypeID}
                    onChange={(e) => handleInputChange('TypeID', e.target.value)}
                    required
                    disabled={!canEdit || submitLoading} // ✅ Disable if cannot edit
                >
                    <option value="">Chọn loại phòng</option>
                    {roomTypes.map((type) => (
                        <option key={type.TypeId} value={type.TypeId}>
                            {type.TypeName} - {type.BasePrice?.toLocaleString('vi-VN')}đ
                            {type.Description && ` (${type.Description})`}
                        </option>
                    ))}
                </select>
                {roomData.TypeID !== originalData.TypeID && canEdit && (
                    <small className="text-warning">
                        <i className="fas fa-edit me-1"></i>
                        Loại phòng đã thay đổi
                    </small>
                )}
            </div>

            <div className="form-group">
                <label>Tầng: <span className="text-danger">*</span></label>
                <select
                    className={`form-control ${roomData.Floor !== originalData.Floor ? 'field-changed' : ''}`}
                    value={roomData.Floor}
                    onChange={(e) => handleInputChange('Floor', e.target.value)}
                    required
                    disabled={!canEdit || submitLoading} // ✅ Disable if cannot edit
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
                    className={`form-control ${roomData.Capacity !== originalData.Capacity ? 'field-changed' : ''}`}
                    value={roomData.Capacity}
                    onChange={(e) => handleInputChange('Capacity', e.target.value)}
                    required
                    disabled={!canEdit || submitLoading} // ✅ Disable if cannot edit
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
                    className={`form-control ${roomData.CurrentPrice !== originalData.CurrentPrice ? 'field-changed' : ''}`}
                    value={roomData.CurrentPrice}
                    onChange={(e) => handleInputChange('CurrentPrice', e.target.value)}
                    placeholder="Nhập giá phòng"
                    min="0"
                    step="1000"
                    required
                    disabled={!canEdit || submitLoading} // ✅ Disable if cannot edit
                />
                {roomData.CurrentPrice && (
                    <small className="text-muted">
                        💰 Giá: {parseFloat(roomData.CurrentPrice).toLocaleString('vi-VN')}đ
                        {roomData.CurrentPrice !== originalData.CurrentPrice && canEdit && (
                            <span className="text-warning ms-2">
                                (Thay đổi từ: {parseFloat(originalData.CurrentPrice).toLocaleString('vi-VN')}đ)
                            </span>
                        )}
                    </small>
                )}
            </div>

            <div className="form-group">
                <label>Trạng thái:</label>
                <select
                    className={`form-control ${roomData.Status !== originalData.Status ? 'field-changed' : ''}`}
                    value={roomData.Status}
                    onChange={(e) => handleInputChange('Status', e.target.value)}
                    required
                    disabled={!canEdit || submitLoading} // ✅ Disable if cannot edit
                >
                    {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {!canEdit && (
                    <small className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        Trạng thái chỉ có thể thay đổi khi phòng ở trạng thái "Có sẵn" hoặc "Bảo trì"
                    </small>
                )}
            </div>

            <div className="form-group">
                <label>Mô tả:</label>
                <textarea
                    className={`form-control ${roomData.Description !== originalData.Description ? 'field-changed' : ''}`}
                    value={roomData.Description}
                    onChange={(e) => handleInputChange('Description', e.target.value)}
                    placeholder="Mô tả chi tiết về phòng..."
                    rows="3"
                    disabled={!canEdit || submitLoading} // ✅ Disable if cannot edit
                />
            </div>

            {/* ✅ SỬA: Action buttons với status checking */}
            <div className="d-flex gap-2 mt-4">
                {canEdit ? (
                    <>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={submitLoading || !hasChanges}
                        >
                            {submitLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Đang cập nhật...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-save me-1"></i>
                                    Cập nhật phòng
                                </>
                            )}
                        </button>
                        
                        {hasChanges && (
                            <button 
                                type="button" 
                                className="btn btn-outline-warning"
                                onClick={handleReset}
                                disabled={submitLoading}
                            >
                                <i className="fas fa-undo me-1"></i>
                                Khôi phục
                            </button>
                        )}

                        {/* ✅ SỬA: Delete button với handleDelete function */}
                        <button 
                            type="button" 
                            className="btn btn-outline-danger"
                            onClick={handleDelete}
                            disabled={submitLoading}
                        >
                            <i className="fas fa-trash me-1"></i>
                            Xóa phòng
                        </button>
                    </>
                ) : (
                    <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>Chế độ chỉ xem:</strong> Phòng này không thể chỉnh sửa do đang ở trạng thái "{getStatusDisplayInfo(originalData.Status).text}".
                    </div>
                )}
                
                <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={submitLoading}
                >
                    <i className="fas fa-times me-1"></i>
                    {isModal ? 'Đóng' : 'Hủy'}
                </button>
            </div>
        </form>
    );

    // ✅ RENDER MODAL HOẶC NORMAL PAGE
    if (isModal) {
        return (
            <SimpleModal 
                isOpen={isOpen}
                onClose={handleCancel}
                title={`Chỉnh sửa phòng ${originalData.RoomNumber}`}
            >
                {formContent}
            </SimpleModal>
        );
    }

    // ✅ RENDER NORMAL PAGE
    return (
        <div className="room-form-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Chỉnh sửa phòng {originalData.RoomNumber}</h2>
                {hasChanges && (
                    <span className="badge bg-warning">
                        <i className="fas fa-edit me-1"></i>
                        Có thay đổi
                    </span>
                )}
            </div>

            {/* ✅ BREADCRUMB */}
            <nav aria-label="breadcrumb" className="mb-3">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                        <button 
                            className="btn btn-link p-0"
                            onClick={() => navigate('/manager')}
                        >
                            Quản lý
                        </button>
                    </li>
                    <li className="breadcrumb-item">
                        <button 
                            className="btn btn-link p-0"
                            onClick={() => navigate('/manager/rooms')}
                        >
                            Danh sách phòng
                        </button>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                        Chỉnh sửa phòng {originalData.RoomNumber}
                    </li>
                </ol>
            </nav>

            {formContent}
        </div>
    );
}

export default EditRoomForm;