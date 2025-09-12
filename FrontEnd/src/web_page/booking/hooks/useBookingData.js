import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export const useBookingData = () => {
  // ✅ SỬA: Đảm bảo formData có tất cả fields cần thiết
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    now.setHours(12, 0, 0, 0); // 12:00 PM (trưa)
    tomorrow.setHours(11, 30, 0, 0); // 11:30 AM (sáng)
    
    return {
      // ✅ QUAN TRỌNG: Đảm bảo có tất cả fields cần thiết cho validation
      selectedRooms: [],
      checkIn: now.toISOString().slice(0, 16),
      checkOut: tomorrow.toISOString().slice(0, 16),
      numberOfGuests: 1,
      
      // ✅ Customer info fields - PHẢI CÓ để validation không lỗi
      customerName: '',
      phoneNumber: '',
      email: '',
      
      // ✅ Additional fields
      selectedServices: [],
      selectedPromotions: [],
      specialRequests: '',
      
      // ✅ Walk-in specific
      walkInGuestPhoneNumber: ''
    };
  });

  // ✅ THÊM: Debug log khi formData thay đổi
  useEffect(() => {
    console.log('📊 FormData updated:', {
      keys: Object.keys(formData),
      hasCustomerName: !!formData.customerName,
      hasPhoneNumber: !!formData.phoneNumber,
      hasEmail: !!formData.email,
      formData
    });
  }, [formData]);

  const [validationErrors, setValidationErrors] = useState({});
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomTypesLoading, setRoomTypesLoading] = useState(true);
  const [roomTypesError, setRoomTypesError] = useState('');

  // Fetch room types from database
  useEffect(() => {
    fetchRoomTypes();
  }, []);



  const setFallbackRoomTypes = () => {
    console.log('🔄 Setting fallback room types...');
    const fallbackTypes = [
      { id: '1', name: 'Phòng thường', price: 350000, description: 'Phòng tiêu chuẩn với tiện nghi cơ bản', maxOccupancy: 2, totalRooms: 10, availableRooms: 8 },
      { id: '2', name: 'Phòng gia đình', price: 500000, description: 'Phòng rộng rãi phù hợp cho gia đình', maxOccupancy: 4, totalRooms: 5, availableRooms: 3 },
      { id: '4', name: 'Phòng đơn', price: 250000, description: 'Phòng với 1 giường đơn', maxOccupancy: 1, totalRooms: 15, availableRooms: 12 },
      { id: '5', name: 'Phòng đôi', price: 300000, description: 'Phòng với 1 giường đôi', maxOccupancy: 2, totalRooms: 8, availableRooms: 6 },
      { id: '6', name: 'Phòng cao cấp', price: 800000, description: 'Phòng với tiện nghi cao cấp', maxOccupancy: 2, totalRooms: 3, availableRooms: 2 },
      { id: '7', name: 'Phòng tiết kiệm', price: 100000, description: 'Phòng giá rẻ với tiện nghi cơ bản', maxOccupancy: 2, totalRooms: 20, availableRooms: 18 }
    ];
    setRoomTypes(fallbackTypes);
    console.log('✅ Fallback room types set:', fallbackTypes.length);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ✅ THÊM: Functions để quản lý multiple room types
  // ✅ SỬA: addRoomType - Đảm bảo roomTypeId được store dạng string nhất quán
  const addRoomType = (roomTypeId, quantity = 1) => {
    if (!roomTypeId || quantity <= 0) {
      console.warn('❌ Invalid roomTypeId or quantity:', { roomTypeId, quantity });
      return;
    }

    // ✅ SỬA: Normalize roomTypeId thành string để consistency trong state
    const normalizedRoomTypeId = String(roomTypeId);

    setFormData(prev => {
      const existing = prev.selectedRooms.find(r => r.roomTypeId === normalizedRoomTypeId);
      
      if (existing) {
        // Update quantity
        return {
          ...prev,
          selectedRooms: prev.selectedRooms.map(r =>
            r.roomTypeId === normalizedRoomTypeId 
              ? { ...r, quantity: r.quantity + quantity }
              : r
          )
        };
      } else {
        // Add new
        const newRoom = {
          roomTypeId: normalizedRoomTypeId, // ✅ Store as string
          quantity: quantity
        };
        
        console.log('➕ Adding room type:', newRoom);
        
        return {
          ...prev,
          selectedRooms: [...prev.selectedRooms, newRoom]
        };
      }
    });
  };

  // ✅ SỬA: updateRoomQuantity với consistency
  const updateRoomQuantity = (roomTypeId, quantity) => {
    if (quantity <= 0) {
      removeRoomType(roomTypeId);
      return;
    }

    const normalizedRoomTypeId = String(roomTypeId);

    setFormData(prev => ({
      ...prev,
      selectedRooms: prev.selectedRooms.map(r =>
        r.roomTypeId === normalizedRoomTypeId 
          ? { ...r, quantity: parseInt(quantity) }
          : r
      )
    }));
  };

  const removeRoomType = (roomTypeId) => {
    setFormData(prev => {
      const currentSelectedRooms = Array.isArray(prev.selectedRooms) ? prev.selectedRooms : [];
      return {
        ...prev,
        selectedRooms: currentSelectedRooms.filter(r => r?.roomTypeId !== roomTypeId)
      };
    });
  };

  const clearAllRooms = () => {
    setFormData(prev => ({
      ...prev,
      selectedRooms: []
    }));
  };

  // ✅ THÊM: Helper functions
  const getTotalRooms = () => {
    if (!Array.isArray(formData.selectedRooms)) {
      console.warn('selectedRooms is not an array:', formData.selectedRooms);
      return 0;
    }
    return formData.selectedRooms.reduce((total, room) => total + (room?.quantity || 0), 0);
  };

  const getTotalPrice = () => {
    if (!Array.isArray(formData.selectedRooms) || !Array.isArray(roomTypes)) {
      return 0;
    }
    return formData.selectedRooms.reduce((total, room) => {
      if (!room || !room.roomTypeId) return total;
      const roomType = getRoomTypeById(room.roomTypeId);
      return total + (roomType ? (roomType.price || 0) * (room.quantity || 0) : 0);
    }, 0);
  };

  const getMaxGuestsCapacity = () => {
    if (!Array.isArray(formData.selectedRooms) || !Array.isArray(roomTypes)) {
      return 0;
    }
    return formData.selectedRooms.reduce((total, room) => {
      if (!room || !room.roomTypeId) return total;
      const roomType = getRoomTypeById(room.roomTypeId);
      return total + (roomType ? (roomType.maxOccupancy || 0) * (room.quantity || 0) : 0);
    }, 0);
  };

  // ✅ KIỂM TRA: Đảm bảo function được export
  const retryFetchRoomTypes = () => {
    fetchRoomTypes();
  };

  // ✅ SỬA: getRoomTypeById với fallback
  const getRoomTypeById = (roomTypeId) => {
    if (!Array.isArray(roomTypes)) return null;
    const normalizedId = String(roomTypeId);
    return roomTypes.find(rt => String(rt.id) === normalizedId);
  };

  const checkRoomAvailability = (roomTypeId, requestedQuantity = 1) => {
    const roomType = getRoomTypeById(roomTypeId);
    if (!roomType) return false;
    
    // Check if there are enough rooms available
    const currentlySelected = formData.selectedRooms.find(r => r.roomTypeId === roomTypeId);
    const alreadySelected = currentlySelected ? currentlySelected.quantity : 0;
    const totalNeeded = alreadySelected + requestedQuantity;
    
    return roomType.availableRooms >= totalNeeded;
  };

  const isRoomTypeSelected = (roomTypeId) => {
    if (!Array.isArray(formData.selectedRooms)) return false;
    return formData.selectedRooms.some(r => r?.roomTypeId === roomTypeId);
  };

  const getSelectedRoomQuantity = (roomTypeId) => {
    if (!Array.isArray(formData.selectedRooms)) return 0;
    const room = formData.selectedRooms.find(r => r?.roomTypeId === roomTypeId);
    return room?.quantity || 0;
  };
  
  const fetchRoomTypes = async () => {
    try {
      setRoomTypesLoading(true);
      setRoomTypesError('');
      console.log('🔄 Fetching room types from API...');
      
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
        
        const roomTypesData = responseData.data || responseData || [];
        
        if (Array.isArray(roomTypesData) && roomTypesData.length > 0) {
          const transformedRoomTypes = roomTypesData.map(roomType => ({
            id: String(roomType.TypeId || roomType.id),
            name: roomType.TypeName || roomType.name,
            price: roomType.BasePrice || roomType.price,
            description: roomType.Description || roomType.description,
            maxOccupancy: roomType.MaxOccupancy || roomType.maxOccupancy || 2, // ✅ SỬA: Đảm bảo map đúng MaxOccupancy
            totalRooms: roomType.TotalRooms || roomType.totalRooms || 0,
            availableRooms: roomType.AvailableRooms || roomType.availableRooms || 0
          }));

          setRoomTypes(transformedRoomTypes);
          console.log('✅ Transformed room types:', transformedRoomTypes);
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
      setRoomTypesError(error.message);
      setFallbackRoomTypes();
      toast.error('Không thể tải danh sách loại phòng từ server');
    } finally {
      setRoomTypesLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
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
  };
  
};