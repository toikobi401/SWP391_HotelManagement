import { useState, useEffect, useCallback } from 'react';

export const usePricingOnline = (formData, selectedRooms, selectedServices, availableServices, appliedPromotion = null, roomTypes = []) => {
  const [pricingBreakdown, setPricingBreakdown] = useState({
    roomSubtotal: 0,
    servicesSubtotal: 0,
    subtotal: 0,
    nightCount: 0,
    lateCheckoutFee: 0,
    totalPrice: 0,
    originalTotal: 0,
    promotionDiscount: 0,
    finalTotal: 0,
    appliedPromotionInfo: null,
    roomsBreakdown: []
  });

  // ✅ THÊM roomTypes vào dependency array
  useEffect(() => {
    // ✅ Safety checks trước khi calculate
    if (!formData) {
      console.warn('FormData is undefined in usePricingOnline');
      return;
    }

    if (!Array.isArray(selectedRooms)) {
      console.warn('SelectedRooms is not an array in usePricingOnline');
      return;
    }

    if (!Array.isArray(roomTypes)) {
      console.warn('RoomTypes is not an array in usePricingOnline');
      return;
    }

    if (formData.checkIn && formData.checkOut && selectedRooms.length > 0 && roomTypes.length > 0) {
      calculatePricing();
    } else {
      // ✅ Reset pricing khi không có data
      setPricingBreakdown(prev => ({
        ...prev,
        roomSubtotal: 0,
        servicesSubtotal: 0,
        subtotal: 0,
        nightCount: 0,
        lateCheckoutFee: 0,
        totalPrice: 0,
        originalTotal: 0,
        promotionDiscount: 0,
        finalTotal: 0,
        roomsBreakdown: []
      }));
    }
  }, [
    formData?.checkIn, 
    formData?.checkOut, 
    selectedRooms, 
    selectedServices, 
    appliedPromotion, 
    availableServices,
    roomTypes // ✅ THÊM roomTypes vào dependency array
  ]);

  // ✅ Tính số đêm
  const calculateNights = useCallback((checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        console.error('Invalid dates in calculateNights:', { checkIn, checkOut });
        return 0;
      }
      
      const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
      return Math.max(1, Math.ceil(timeDifference / (1000 * 3600 * 24)));
    } catch (error) {
      console.error('Error calculating nights:', error);
      return 1; // Default to 1 night
    }
  }, []);

  // ✅ SỬA: Tính phí checkout muộn với room types data
  const calculateLateCheckoutFee = useCallback((checkOut, roomsData, roomTypesData) => {
    if (!checkOut || !roomsData || !Array.isArray(roomsData) || !Array.isArray(roomTypesData)) return 0;
    
    try {
      const checkOutDate = new Date(checkOut);
      if (isNaN(checkOutDate.getTime())) return 0;
      
      const checkOutHour = checkOutDate.getHours();
      const checkOutMinute = checkOutDate.getMinutes();
      const checkOutTime = checkOutHour + (checkOutMinute / 60);
      
      // ✅ CHỈ tính phí khi SAU 11:30 (> 11.5 hours)
      if (checkOutTime <= 11.5) return 0;
      
      // ✅ Tính số giờ vượt quá 11:30
      const hoursOverdue = Math.ceil(checkOutTime - 11.5);
      
      // ✅ SỬA: Tính phí dựa trên giá phòng thực tế từ roomTypes
      let totalLateFee = 0;
      
      roomsData.forEach(room => {
        // ✅ Tìm room type từ roomTypesData
        const roomType = roomTypesData.find(rt => rt.id === String(room.roomTypeId));
        if (roomType) {
          const roomPrice = parseFloat(roomType.price) || 0;
          const roomQuantity = parseInt(room.quantity) || 0;
          const lateFeePer10Percent = roomPrice * 0.1; // 10% giá phòng
          const roomLateFee = lateFeePer10Percent * hoursOverdue * roomQuantity;
          totalLateFee += roomLateFee;
          
          console.log(`🏨 Late fee for ${roomType.name}: ${roomPrice.toLocaleString()}đ × 10% × ${hoursOverdue}h × ${roomQuantity} = ${roomLateFee.toLocaleString()}đ`);
        } else {
          console.warn(`⚠️ Room type not found for ID: ${room.roomTypeId}`);
        }
      });
      
      console.log('💰 Total late checkout fee calculation:', {
        checkOutTime: `${checkOutHour}:${checkOutMinute.toString().padStart(2, '0')}`,
        checkOutTimeDecimal: checkOutTime,
        isLate: checkOutTime > 11.5,
        hoursOverdue,
        totalLateFee: totalLateFee.toLocaleString(),
        formula: '(10% × giá phòng/đêm) × số giờ trễ × số phòng'
      });
      
      return totalLateFee;
    } catch (error) {
      console.error('Error calculating late checkout fee:', error);
      return 0;
    }
  }, []);

  // ✅ Tính services total từ database (giữ nguyên)
  const calculateServiceTotal = useCallback((selectedServiceIds, servicesFromDB) => {
    if (!Array.isArray(selectedServiceIds) || !Array.isArray(servicesFromDB)) {
      console.warn('Invalid data for service calculation:', { selectedServiceIds, servicesFromDB });
      return 0;
    }

    const total = selectedServiceIds.reduce((total, serviceId) => {
      // ✅ Tìm service từ database trước
      const serviceFromDB = servicesFromDB.find(service => service.id === serviceId);
      
      if (serviceFromDB) {
        console.log(`🛎️ Service from DB: ${serviceFromDB.name} - ${serviceFromDB.price.toLocaleString()}đ`);
        return total + (serviceFromDB.price || 0);
      }
      
      // ✅ Fallback nếu không tìm thấy trong DB
      console.warn(`⚠️ Service ID ${serviceId} not found in database, using fallback`);
      return total + 0;
    }, 0);

    console.log('💰 Services total from database:', {
      selectedServices: selectedServiceIds.length,
      totalAmount: total.toLocaleString() + 'đ',
      servicesFromDB: servicesFromDB.length
    });

    return total;
  }, []);

  // ✅ Calculate promotion discount (giữ nguyên)
  const calculatePromotionDiscount = useCallback((subtotal, promotion) => {
    if (!promotion || !subtotal || subtotal <= 0) {
      return 0;
    }
    
    const discountAmount = (subtotal * (promotion.discountPercent || 0)) / 100;
    return Math.round(discountAmount);
  }, []);

  // ✅ SỬA: Main pricing calculation function với room types
  const calculatePricing = useCallback(() => {
    try {
      console.log('🧮 Starting pricing calculation for online booking...');
      
      // ✅ Safety checks
      if (!formData || !Array.isArray(selectedRooms) || !Array.isArray(roomTypes)) {
        console.warn('Missing required data for pricing calculation');
        return;
      }

      // Calculate room subtotal and breakdown
      let roomSubtotal = 0;
      const roomsBreakdown = [];
      const nightCount = calculateNights(formData.checkIn, formData.checkOut);
      
      // ✅ Đảm bảo luôn có nightCount, nếu không có thì sử dụng 1
      const effectiveNightCount = Math.max(1, nightCount);
      
      if (selectedRooms.length > 0) {
        selectedRooms.forEach(room => {
          // ✅ SỬA: Tìm room type từ roomTypes data
          const roomType = roomTypes.find(rt => rt.id === String(room.roomTypeId));
          
          if (roomType) {
            const roomPrice = parseFloat(roomType.price) || 0;
            const roomQuantity = parseInt(room.quantity) || 0;
            const roomTotal = roomPrice * roomQuantity * effectiveNightCount;
            
            roomSubtotal += roomTotal;
            
            roomsBreakdown.push({
              roomTypeId: room.roomTypeId,
              name: roomType.name,
              price: roomPrice,
              quantity: roomQuantity,
              nights: effectiveNightCount,
              subtotal: roomTotal
            });
            
            console.log(`🏨 Room: ${roomType.name} - ${roomPrice.toLocaleString()}đ × ${roomQuantity} × ${effectiveNightCount}đêm = ${roomTotal.toLocaleString()}đ`);
          } else {
            console.warn(`⚠️ Room type not found for ID: ${room.roomTypeId}`);
            
            // ✅ Fallback với tên room type
            roomsBreakdown.push({
              roomTypeId: room.roomTypeId,
              name: `Room Type ${room.roomTypeId}`,
              price: 0,
              quantity: parseInt(room.quantity) || 0,
              nights: effectiveNightCount,
              subtotal: 0
            });
          }
        });
      }

      // ✅ SỬA: Calculate late checkout fee với roomTypes
      const lateCheckoutFee = calculateLateCheckoutFee(formData.checkOut, selectedRooms, roomTypes);
      
      // ✅ Calculate services subtotal từ database
      const servicesSubtotal = calculateServiceTotal(selectedServices || [], availableServices || []);
      
      // ✅ Calculate subtotal INCLUDING late checkout fee (giống như booking)
      const subtotal = roomSubtotal + servicesSubtotal + lateCheckoutFee;
      
      // ✅ Calculate promotion discount from subtotal (including late fee)
      const promotionDiscount = calculatePromotionDiscount(subtotal, appliedPromotion);
      const finalTotal = Math.max(0, subtotal - promotionDiscount);
      
      const totalPrice = Math.round(subtotal) || 0;
      const finalTotalRounded = Math.round(finalTotal) || 0;
      
      const breakdown = {
        roomSubtotal: Math.round(roomSubtotal) || 0,
        servicesSubtotal: Math.round(servicesSubtotal) || 0,
        subtotal: Math.round(subtotal) || 0,
        nightCount: effectiveNightCount,
        lateCheckoutFee: Math.round(lateCheckoutFee) || 0,
        totalPrice: totalPrice,
        originalTotal: Math.round(subtotal) || 0,
        promotionDiscount: Math.round(promotionDiscount) || 0,
        finalTotal: finalTotalRounded,
        appliedPromotionInfo: appliedPromotion ? {
          promotionName: appliedPromotion.promotionName,
          discountPercent: appliedPromotion.discountPercent,
          promotionID: appliedPromotion.promotionID
        } : null,
        roomsBreakdown: roomsBreakdown
      };

      setPricingBreakdown(breakdown);
      
      console.log('💰 Online booking pricing calculated:', {
        rooms: `${roomSubtotal.toLocaleString()}đ`,
        services: `${servicesSubtotal.toLocaleString()}đ`,
        lateCheckout: `${lateCheckoutFee.toLocaleString()}đ`,
        subtotal: `${subtotal.toLocaleString()}đ`,
        promotion: appliedPromotion ? `${appliedPromotion.promotionName} (-${promotionDiscount.toLocaleString()}đ)` : 'None',
        totalPrice: `${totalPrice.toLocaleString()}đ`,
        final: `${finalTotalRounded.toLocaleString()}đ`,
        breakdown: roomsBreakdown
      });
      
    } catch (error) {
      console.error('❌ Error calculating online booking pricing:', error);
    }
  }, [
    formData,
    selectedRooms,
    selectedServices,
    availableServices,
    appliedPromotion,
    roomTypes, // ✅ THÊM roomTypes vào dependency
    calculateNights,
    calculateLateCheckoutFee,
    calculateServiceTotal,
    calculatePromotionDiscount
  ]);

  return {
    pricingBreakdown,
    calculateServiceTotal,
    calculateNights,
    calculateLateCheckoutFee,
    calculatePromotionDiscount,
    hasPromotion: !!appliedPromotion,
    promotionSavings: pricingBreakdown.promotionDiscount || 0,
    // ✅ Expose individual functions for external use
    getServicePriceFromDB: (serviceId) => {
      const service = availableServices?.find(s => s.id === serviceId);
      return service?.price || 0;
    }
  };
};