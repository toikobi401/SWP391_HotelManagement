import { useState, useCallback } from 'react';
import axios from 'axios';

const useCancelBooking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ✅ Hàm hủy booking - Sử dụng useCallback để tránh re-render
  const cancelBooking = useCallback(async (bookingID, cancelType, cancelReason = '') => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('🔄 Cancelling booking:', {
        bookingID,
        cancelType,
        cancelReason
      });

      // Validate inputs
      if (!bookingID || isNaN(bookingID) || bookingID <= 0) {
        throw new Error('Booking ID không hợp lệ');
      }

      if (!cancelType || cancelType.trim() === '') {
        throw new Error('Loại hủy booking là bắt buộc');
      }

      if (cancelType.length > 50) {
        throw new Error('Loại hủy không được vượt quá 50 ký tự');
      }

      if (cancelReason && cancelReason.length > 255) {
        throw new Error('Lý do hủy không được vượt quá 255 ký tự');
      }

      // Prepare request data
      const requestData = {
        bookingID: parseInt(bookingID),
        cancelType: cancelType.trim(),
        cancelReason: cancelReason ? cancelReason.trim() : null
      };

      // Make API call using /api/booking-cancels endpoint
      const response = await axios.post(
        `http://localhost:3000/api/booking-cancels`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log('✅ Booking cancelled successfully:', response.data.data);
        
        setSuccessMessage(`Đã hủy booking #${bookingID} thành công`);
        
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Không thể hủy booking');
      }

    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      
      let errorMessage = 'Đã xảy ra lỗi khi hủy booking';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Lỗi từ server: ${error.response.status}`;
        }
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'Không thể kết nối đến server';
      } else if (error.message) {
        // Something else happened
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
      
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array vì function này không phụ thuộc vào props/state khác

  // ✅ Hàm reset state - Sử dụng useCallback để tránh infinite re-render
  const resetState = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
  }, []);

  // ✅ Hàm lấy danh sách các loại hủy phổ biến - Sử dụng useCallback 
  const getCancelTypes = useCallback(() => {
    return [
      { value: 'Khách hàng yêu cầu', label: 'Khách hàng yêu cầu' },
      { value: 'Không có phòng trống', label: 'Không có phòng trống' },
      { value: 'Lỗi hệ thống', label: 'Lỗi hệ thống' },
      { value: 'Khách không đến', label: 'Khách không đến (No-show)' },
      { value: 'Thanh toán thất bại', label: 'Thanh toán thất bại' },
      { value: 'Thay đổi lịch trình', label: 'Thay đổi lịch trình' },
      { value: 'Yêu cầu hoàn tiền', label: 'Yêu cầu hoàn tiền' },
      { value: 'Vi phạm chính sách', label: 'Vi phạm chính sách' },
      { value: 'Lỗi thông tin booking', label: 'Lỗi thông tin booking' },
      { value: 'Khác', label: 'Khác' }
    ];
  }, []);

  // ✅ Hàm validate cancel data - Sử dụng useCallback
  const validateCancelData = useCallback((cancelType, cancelReason = '') => {
    const errors = [];

    if (!cancelType || cancelType.trim() === '') {
      errors.push('Loại hủy booking là bắt buộc');
    } else if (cancelType.length > 50) {
      errors.push('Loại hủy không được vượt quá 50 ký tự');
    }

    if (cancelReason && cancelReason.length > 255) {
      errors.push('Lý do hủy không được vượt quá 255 ký tự');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return {
    // State
    isLoading,
    error,
    successMessage,
    
    // Functions
    cancelBooking,
    resetState,
    getCancelTypes,
    validateCancelData
  };
};

export default useCancelBooking;
