import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';

export const useGuestManagement = () => {
  const [guestLoading, setGuestLoading] = useState(false);
  const [existingGuest, setExistingGuest] = useState(null);
  const { user } = useAuth();

  // Kiểm tra guest đã tồn tại bằng số điện thoại
  const checkExistingGuest = async (phoneNumber) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setExistingGuest(null);
      return null;
    }

    try {
      setGuestLoading(true);
      console.log('🔍 Checking existing guest with phone:', phoneNumber);

      const response = await fetch(`http://localhost:3000/api/guests/${phoneNumber}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) {
        // Guest không tồn tại - đây là trường hợp bình thường
        console.log('📝 Guest not found, will create new one');
        setExistingGuest(null);
        return null;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log('✅ Found existing guest:', data.data.guestName);
          setExistingGuest(data.data);
          toast.info(`Tìm thấy khách hàng: ${data.data.guestName}`);
          return data.data;
        }
      } else {
        console.error('❌ Error checking guest:', response.status);
      }

      setExistingGuest(null);
      return null;
    } catch (error) {
      console.error('❌ Error checking existing guest:', error);
      setExistingGuest(null);
      return null;
    } finally {
      setGuestLoading(false);
    }
  };

  // Tạo hoặc cập nhật guest
  const createOrUpdateGuest = async (guestData) => {
    try {
      setGuestLoading(true);
      
      // Lấy receptionistID từ user hiện tại
      const receptionistID = user?.UserID;
      if (!receptionistID) {
        throw new Error('Không tìm thấy thông tin nhân viên lễ tân');
      }

      // Chuẩn bị dữ liệu guest
      const guestPayload = {
        guestPhoneNumber: guestData.phoneNumber.replace(/\s/g, ''), // Remove spaces
        guestName: guestData.customerName.trim(),
        guestEmail: guestData.email?.trim() || null,
        receptionistID: receptionistID
      };

      console.log('💾 Creating/updating guest:', guestPayload);

      // ✅ SỬA: KIỂM TRA GUEST TỒN TẠI TRƯỚC KHI TẠO
      console.log('🔍 Checking if guest exists before creating...');
      const existingGuestCheck = await checkExistingGuest(guestPayload.guestPhoneNumber);
      
      if (existingGuestCheck) {
        // Guest đã tồn tại, cập nhật thông tin
        console.log('ℹ️ Guest already exists, updating information...');
        const updateResponse = await fetch(`http://localhost:3000/api/guests/${guestPayload.guestPhoneNumber}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            guestName: guestPayload.guestName,
            guestEmail: guestPayload.guestEmail
          })
        });

        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          console.log('✅ Guest updated successfully');
          setExistingGuest(updateData.data);
          toast.success('Cập nhật thông tin khách hàng thành công');
          return updateData.data;
        } else {
          const errorData = await updateResponse.json();
          throw new Error(errorData.message || 'Không thể cập nhật thông tin khách hàng');
        }
      } else {
        // Guest chưa tồn tại, tạo mới
        console.log('➕ Creating new guest...');
        const createResponse = await fetch('http://localhost:3000/api/guests', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(guestPayload)
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('✅ Guest created successfully');
          setExistingGuest(createData.data);
          toast.success('Tạo thông tin khách hàng thành công');
          return createData.data;
        } else {
          const errorData = await createResponse.json();
          throw new Error(errorData.message || 'Không thể tạo khách hàng');
        }
      }

    } catch (error) {
      console.error('❌ Error in createOrUpdateGuest:', error);
      toast.error(`Lỗi xử lý thông tin khách hàng: ${error.message}`);
      throw error;
    } finally {
      setGuestLoading(false);
    }
  };

  // Validate guest data trước khi submit
  const validateGuestData = (formData) => {
    const errors = [];

    if (!formData.phoneNumber || formData.phoneNumber.trim().length < 10) {
      errors.push('Số điện thoại không hợp lệ');
    }

    if (!formData.customerName || formData.customerName.trim().length < 2) {
      errors.push('Tên khách hàng không hợp lệ');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Email không đúng định dạng');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 1. Tạo guest trước (BẮT BUỘC)
      const guestResult = await createOrUpdateGuest({
        phoneNumber: formData.phoneNumber,
        customerName: formData.customerName, 
        email: formData.email
      });
      
      if (!guestResult) {
        toast.error('Không thể tạo thông tin khách hàng');
        return;
      }
      
      // 2. Chỉ tạo booking khi guest đã tồn tại
      const bookingResponse = await fetch('http://localhost:3000/api/bookings/walk-in', {
        method: 'POST',
        // ... booking payload
      });
      
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return {
    guestLoading,
    existingGuest,
    checkExistingGuest,
    createOrUpdateGuest,
    validateGuestData,
    setExistingGuest
  };
};