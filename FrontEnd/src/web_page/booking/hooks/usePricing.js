// filepath: c:\Users\PC\OneDrive\Desktop\LEARNING\SWP391\Assignment\SWP391_HotelManagement\FrontEnd\src\web_page\booking\hooks\usePricing.js
import { useState, useEffect, useCallback } from 'react';

export const usePricing = (formData, roomTypes, selectedServices, availableServices, appliedPromotion = null) => {
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

  // ✅ SỬA: Thêm dependency array và safety checks
  useEffect(() => {
    // ✅ Safety checks trước khi calculate
    if (!formData) {
      console.warn('FormData is undefined in usePricing');
      return;
    }

    if (!Array.isArray(roomTypes)) {
      console.warn('RoomTypes is not an array in usePricing');
      return;
    }

    if (formData.checkIn && formData.checkOut && Array.isArray(formData.selectedRooms) && formData.selectedRooms.length > 0) {
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
    formData?.selectedRooms, 
    selectedServices, 
    appliedPromotion, 
    roomTypes
  ]);

  // Tính số đêm
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return 0;
      }
      
      const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
      return Math.max(0, Math.ceil(timeDifference / (1000 * 3600 * 24)));
    } catch (error) {
      console.error('Error calculating nights:', error);
      return 0;
    }
  };

  // ✅ SỬA: Tính phí checkout muộn theo công thức mới
  const calculateLateCheckoutFee = (checkOut, roomsData, roomTypes) => {
    if (!checkOut || !roomsData || !Array.isArray(roomsData) || !Array.isArray(roomTypes)) return 0;
    
    try {
      const checkOutDate = new Date(checkOut);
      if (isNaN(checkOutDate.getTime())) return 0;
      
      const checkOutHour = checkOutDate.getHours();
      const checkOutMinute = checkOutDate.getMinutes();
      const checkOutTime = checkOutHour + (checkOutMinute / 60);
      
      // ✅ CHỈ tính phí khi SAU 11:30 (> 11.5 hours)
      if (checkOutTime <= 11.5) return 0;
      
      // ✅ SỬA: Tính số giờ vượt quá 11:30
      const hoursOverdue = Math.ceil(checkOutTime - 11.5); // Làm tròn lên
      
      // ✅ SỬA: Tính phí dựa trên giá phòng thực tế
      let totalLateFee = 0;
      
      roomsData.forEach(room => {
        if (!room || !room.roomTypeId) return;
        
        const roomType = roomTypes.find(rt => rt.id === String(room.roomTypeId));
        if (!roomType) return;
        
        const roomPricePerNight = roomType.price || 0;
        const quantity = room.quantity || 0;
        
        // ✅ SỬA: (10% giá phòng 1 đêm) × (số giờ vượt quá) × (số lượng phòng)
        const feePerRoomPerHour = roomPricePerNight * 0.1; // 10% giá phòng
        const roomLateFee = feePerRoomPerHour * hoursOverdue * quantity;
        
        totalLateFee += roomLateFee;
        
        console.log(`💰 Late checkout fee calculation for ${roomType.name}:`, {
          roomPricePerNight: roomPricePerNight.toLocaleString(),
          feePerRoomPerHour: feePerRoomPerHour.toLocaleString(),
          hoursOverdue,
          quantity,
          roomLateFee: roomLateFee.toLocaleString(),
          checkOutTime: `${checkOutHour}:${checkOutMinute.toString().padStart(2, '0')}`
        });
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
  };

  // ✅ SỬA: Đảm bảo pricing được tính đúng ngay từ đầu
  const calculatePricing = useCallback(() => {
    try {
      // ✅ Safety checks
      if (!formData || !Array.isArray(formData.selectedRooms) || !Array.isArray(roomTypes)) {
        console.warn('Missing or invalid data for pricing calculation');
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
        return;
      }

      // Calculate room subtotal and breakdown
      let roomSubtotal = 0;
      const roomsBreakdown = [];
      const nightCount = calculateNights(formData.checkIn, formData.checkOut);
      
      // ✅ SỬA: Đảm bảo luôn có nightCount, nếu không có thì sử dụng 1
      const effectiveNightCount = Math.max(1, nightCount);
      
      if (formData.selectedRooms.length > 0) {
        formData.selectedRooms.forEach(selectedRoom => {
          if (!selectedRoom || !selectedRoom.roomTypeId) {
            console.warn('Invalid selected room:', selectedRoom);
            return;
          }

          const roomType = roomTypes.find(rt => rt.id === String(selectedRoom.roomTypeId));
          if (!roomType) {
            console.warn('Room type not found for ID:', selectedRoom.roomTypeId);
            return;
          }

          const roomPrice = roomType.price || 0;
          const quantity = selectedRoom.quantity || 0;
          const roomTotal = roomPrice * quantity * effectiveNightCount;
          
          roomSubtotal += roomTotal;
          
          // ✅ THÊM: Tạo breakdown cho từng loại phòng
          roomsBreakdown.push({
            roomTypeId: selectedRoom.roomTypeId,
            roomTypeName: roomType.name || 'Unknown',
            quantity: quantity,
            pricePerNight: roomPrice,
            totalPrice: roomTotal,
            lateCheckoutFee: 0 // Sẽ được tính riêng
          });
        });
      }

      // ✅ SỬA: Calculate late checkout fee với công thức mới
      const lateCheckoutFee = calculateLateCheckoutFee(
        formData.checkOut, 
        formData.selectedRooms,
        roomTypes
      );
      
      // Calculate services subtotal
      const servicesSubtotal = calculateServiceTotal(selectedServices || [], availableServices || []);
      
      // ✅ SỬA: Calculate subtotal INCLUDING late checkout fee
      const subtotal = roomSubtotal + servicesSubtotal + lateCheckoutFee;
      
      // ✅ SỬA: Calculate promotion discount from subtotal (including late fee)
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
      
      console.log('💰 Pricing calculated:', {
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
      console.error('❌ Error calculating pricing:', error);
      setPricingBreakdown(prev => ({ 
        ...prev, 
        error: error.message,
        roomsBreakdown: [],
        totalPrice: 0,
        finalTotal: 0
      }));
    }
  }, [
    formData?.checkIn,
    formData?.checkOut,
    formData?.selectedRooms,
    roomTypes,
    selectedServices,
    availableServices,
    appliedPromotion
  ]);

  const calculateServiceTotal = (selectedServices, availableServices) => {
    if (!Array.isArray(selectedServices) || !Array.isArray(availableServices)) {
      return 0;
    }

    return selectedServices.reduce((total, serviceId) => {
      const service = availableServices.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  // ✅ SỬA: Calculate promotion discount
  const calculatePromotionDiscount = (subtotal, promotion) => {
    if (!promotion || !subtotal || subtotal <= 0) {
      return 0;
    }
    
    const discountAmount = (subtotal * (promotion.discountPercent || 0)) / 100;
    return Math.round(discountAmount);
  };

  return {
    pricingBreakdown,
    calculateServiceTotal,
    calculateNights,
    calculateLateCheckoutFee: (checkOut, roomsData, roomTypesData) => 
      calculateLateCheckoutFee(checkOut, roomsData, roomTypesData),
    calculatePromotionDiscount,
    hasPromotion: !!appliedPromotion,
    promotionSavings: pricingBreakdown.promotionDiscount || 0
  };
};