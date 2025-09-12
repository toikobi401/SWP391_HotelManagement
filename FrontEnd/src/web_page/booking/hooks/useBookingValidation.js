import { useState } from 'react';

export const useBookingValidation = () => {
  const [validationErrors, setValidationErrors] = useState({});

  // ✅ SỬA: validateForm với enhanced debugging
  const validateForm = (formData) => {
    const errors = {};

    // ✅ ENHANCED DEBUG LOGGING
    console.log('🔍 validateForm called with:', {
      formData,
      formDataType: typeof formData,
      isUndefined: formData === undefined,
      isNull: formData === null,
      isObject: typeof formData === 'object',
      hasKeys: formData ? Object.keys(formData).length : 0,
      stackTrace: new Error().stack
    });

    // ✅ SAFETY CHECK: Kiểm tra formData trước khi sử dụng
    if (!formData || typeof formData !== 'object') {
      console.error('❌ FormData is invalid in validateForm:', {
        received: formData,
        type: typeof formData,
        isUndefined: formData === undefined,
        isNull: formData === null
      });
      errors.general = 'Dữ liệu form không hợp lệ';
      setValidationErrors(errors);
      return false;
    }

    console.log('✅ FormData validation passed, proceeding with field validation...');

    // ✅ REQUIRED FIELDS validation với safety checks
    if (!formData.customerName?.trim()) {
      errors.customerName = 'Vui lòng nhập họ tên khách hàng';
    }
    
    if (!formData.phoneNumber?.trim() && !formData.walkInGuestPhoneNumber?.trim()) {
      errors.phoneNumber = 'Vui lòng nhập số điện thoại';
    }
    
    if (!formData.email?.trim()) {
      errors.email = 'Vui lòng nhập email';
    }

    // ✅ FORMAT VALIDATION với safety checks
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Email không đúng định dạng';
      }
    }

    if (formData.phoneNumber || formData.walkInGuestPhoneNumber) {
      const phoneRegex = /^[0-9]{10,11}$/;
      const phone = formData.phoneNumber || formData.walkInGuestPhoneNumber;
      if (phone && !phoneRegex.test(phone.replace(/\s/g, ''))) {
        errors.phoneNumber = 'Số điện thoại không hợp lệ (10-11 số)';
      }
    }

    // ✅ NUMBER OF GUESTS validation với safety check
    const numberOfGuests = parseInt(formData.numberOfGuests || formData.numberOfGuest || 0);
    if (!numberOfGuests || numberOfGuests < 1) {
      errors.numberOfGuests = 'Số khách phải lớn hơn 0';
    }

    // ✅ OPTIONAL: Date validation - chỉ validate nếu có
    if (formData.checkIn && formData.checkOut) {
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      const now = new Date();

      if (checkInDate < now) {
        errors.checkIn = 'Thời gian nhận phòng không được trong quá khứ';
      }

      if (checkInDate >= checkOutDate) {
        errors.dateRange = 'Thời gian trả phòng phải sau thời gian nhận phòng';
      }
    }

    setValidationErrors(errors);
    
    console.log('✅ Validation completed:', {
      errorsCount: Object.keys(errors).length,
      errors,
      isValid: Object.keys(errors).length === 0
    });
    
    return Object.keys(errors).length === 0;
  };

  // ✅ GIỮ NGUYÊN: Các functions khác
  const validateDateTime = (field, value, formData) => {
    // ✅ Safety check
    if (!formData) {
      console.warn('FormData is undefined in validateDateTime');
      return false;
    }
    
    const errors = { ...validationErrors };
    const now = new Date();
    const selectedDate = new Date(value);

    // Xóa lỗi cũ cho field này
    delete errors[field];
    delete errors.dateRange;

    if (field === 'checkIn') {
      // Check-in không được trong quá khứ
      if (selectedDate < now) {
        errors.checkIn = 'Thời gian nhận phòng không được trong quá khứ';
      }
      
      // Kiểm tra giờ check-in (khuyến nghị 12:00)
      const checkInHour = selectedDate.getHours();
      if (checkInHour < 12) {
        errors.checkInWarning = 'Khuyến nghị nhận phòng từ 12:00. Nhận phòng sớm có thể phải chờ.';
      }

      // Nếu có check-out, kiểm tra logic
      if (formData.checkOut) {
        const checkOutDate = new Date(formData.checkOut);
        if (selectedDate >= checkOutDate) {
          errors.dateRange = 'Thời gian nhận phòng phải trước thời gian trả phòng';
        }
      }
    }

    if (field === 'checkOut') {
      // Check-out không được trước check-in
      if (formData.checkIn) {
        const checkInDate = new Date(formData.checkIn);
        if (selectedDate <= checkInDate) {
          errors.dateRange = 'Thời gian trả phòng phải sau thời gian nhận phòng';
        }
      }

      // ✅ SỬA: Cảnh báo về phí checkout muộn với công thức mới
      const checkOutHour = selectedDate.getHours();
      const checkOutMinute = selectedDate.getMinutes();
      const checkOutTime = checkOutHour + (checkOutMinute / 60);
      
      // ✅ CHỈ hiển thị warning khi SAU 11:30 (> 11.5)
      if (checkOutTime > 11.5) { // 11:30 = 11.5 hours
        const hoursOverdue = Math.ceil(checkOutTime - 11.5);
        const formattedMinute = selectedDate.getMinutes().toString().padStart(2, '0');
        errors.checkOutWarning = `Trả phòng sau 11:30 sẽ tính phí 10% giá phòng/đêm cho mỗi giờ trễ (${checkOutHour}:${formattedMinute} = ${hoursOverdue} giờ trễ)`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).filter(key => !key.includes('Warning')).length === 0;
  };

  // ✅ SỬA: Thay đổi default time cho checkIn và checkOut
  const setDefaultTime = (dateTimeString, isCheckOut = false) => {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    
    if (isCheckOut) {
      // ✅ CheckOut: 11:30 AM
      date.setHours(11, 30, 0, 0);
    } else {
      // ✅ CheckIn: 12:00 PM (12 AM = midnight, 12 PM = noon)
      date.setHours(12, 0, 0, 0);
    }
    
    // Format to datetime-local input format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return {
    validationErrors,
    setValidationErrors,
    validateDateTime,
    validateForm,
    setDefaultTime
  };
};