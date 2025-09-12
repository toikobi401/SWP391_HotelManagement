import { useState, useEffect } from 'react';

export const useRoomTypesOnline = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomTypesLoading, setRoomTypesLoading] = useState(true);
  const [roomTypesError, setRoomTypesError] = useState('');

  useEffect(() => {
    fetchRoomTypesFromAPI();
  }, []);

  const fetchRoomTypesFromAPI = async () => {
    try {
      setRoomTypesLoading(true);
      setRoomTypesError('');
      
      console.log('🏨 Fetching room types from API for online booking...');
      
      const response = await fetch('http://localhost:3000/api/room-types', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Room types response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Room types data received:', data);

        if (data.success && Array.isArray(data.data)) {
          const transformedRoomTypes = data.data.map(roomType => ({
            id: String(roomType.TypeId), // ✅ Đảm bảo string để consistent
            name: roomType.TypeName,
            price: roomType.BasePrice,
            description: roomType.Description,
            formattedPrice: roomType.FormattedPrice || `${roomType.BasePrice.toLocaleString('vi-VN')}đ`,
            maxOccupancy: roomType.MaxOccupancy || 2,
            totalRooms: roomType.TotalRooms || 0,
            availableRooms: roomType.AvailableRooms || 0,
            occupiedRooms: roomType.OccupiedRooms || 0,
            reservedRooms: roomType.ReservedRooms || 0,
            maintenanceRooms: roomType.MaintenanceRooms || 0
          }));

          setRoomTypes(transformedRoomTypes);
          
          console.log(`✅ Loaded ${transformedRoomTypes.length} room types for online booking`);
          console.log('🏨 Room types preview:', transformedRoomTypes.slice(0, 2));
        } else {
          throw new Error('Invalid room types data format received');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch room types`);
      }
    } catch (error) {
      console.error('❌ Error fetching room types for online booking:', error);
      setRoomTypesError(error.message);
      setFallbackRoomTypes();
    } finally {
      setRoomTypesLoading(false);
    }
  };

  const setFallbackRoomTypes = () => {
    const fallbackRoomTypes = [
      { 
        id: '1', 
        name: 'Phòng đơn', 
        price: 300000, 
        description: 'Phòng cho 1 người với tiện nghi cơ bản', 
        formattedPrice: '300,000đ',
        maxOccupancy: 1,
        totalRooms: 10,
        availableRooms: 5
      },
      { 
        id: '2', 
        name: 'Phòng đôi', 
        price: 500000, 
        description: 'Phòng cho 2 người với giường đôi', 
        formattedPrice: '500,000đ',
        maxOccupancy: 2,
        totalRooms: 8,
        availableRooms: 3
      },
      { 
        id: '3', 
        name: 'Phòng gia đình', 
        price: 800000, 
        description: 'Phòng rộng rãi cho gia đình 4-6 người', 
        formattedPrice: '800,000đ',
        maxOccupancy: 6,
        totalRooms: 5,
        availableRooms: 2
      },
      { 
        id: '4', 
        name: 'Phòng thường', 
        price: 350000, 
        description: 'Phòng tiêu chuẩn với tiện nghi cơ bản', 
        formattedPrice: '350,000đ',
        maxOccupancy: 2,
        totalRooms: 10,
        availableRooms: 8
      },
      { 
        id: '5', 
        name: 'Phòng cao cấp', 
        price: 800000, 
        description: 'Phòng với tiện nghi cao cấp', 
        formattedPrice: '800,000đ',
        maxOccupancy: 2,
        totalRooms: 3,
        availableRooms: 2
      },
      { 
        id: '6', 
        name: 'Phòng tiết kiệm', 
        price: 100000, 
        description: 'Phòng giá rẻ với tiện nghi cơ bản', 
        formattedPrice: '100,000đ',
        maxOccupancy: 2,
        totalRooms: 20,
        availableRooms: 18
      }
    ];
    setRoomTypes(fallbackRoomTypes);
    console.log('✅ Set fallback room types for online booking');
  };

  // Helper functions
  const getRoomTypeById = (roomTypeId) => {
    const normalizedId = String(roomTypeId);
    return roomTypes.find(rt => rt.id === normalizedId);
  };

  const getRoomTypePrice = (roomTypeId) => {
    const roomType = getRoomTypeById(roomTypeId);
    return roomType ? roomType.price : 0;
  };

  const getRoomTypeName = (roomTypeId) => {
    const roomType = getRoomTypeById(roomTypeId);
    return roomType ? roomType.name : 'Unknown Room Type';
  };

  const checkRoomAvailability = (roomTypeId, requestedQuantity = 1) => {
    const roomType = getRoomTypeById(roomTypeId);
    if (!roomType) return false;
    
    return roomType.availableRooms >= requestedQuantity;
  };

  return {
    roomTypes,
    roomTypesLoading,
    roomTypesError,
    getRoomTypeById,
    getRoomTypePrice,
    getRoomTypeName,
    checkRoomAvailability,
    refetchRoomTypes: fetchRoomTypesFromAPI
  };
};