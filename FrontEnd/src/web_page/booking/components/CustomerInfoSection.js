import React, { useEffect, useState } from 'react';
import styles from '../BookingForm.module.css';
import { useGuestManagement } from '../hooks/useGuestManagement';

const CustomerInfoSection = ({ 
  formData, 
  handleInputChange, 
  validationErrors, 
  onGuestDataChange 
}) => {
  const {
    guestLoading,
    existingGuest,
    checkExistingGuest,
    setExistingGuest
  } = useGuestManagement();

  const [phoneCheckTimeout, setPhoneCheckTimeout] = useState(null);
  const [showGuestInfo, setShowGuestInfo] = useState(false);

  // Debounced phone number check
  useEffect(() => {
    if (phoneCheckTimeout) {
      clearTimeout(phoneCheckTimeout);
    }

    if (formData.phoneNumber && formData.phoneNumber.length >= 10) {
      const timeout = setTimeout(async () => {
        const guest = await checkExistingGuest(formData.phoneNumber);
        if (guest && onGuestDataChange) {
          onGuestDataChange(guest);
        }
      }, 1000); // Check after 1 second of no typing

      setPhoneCheckTimeout(timeout);
    } else {
      setExistingGuest(null);
      setShowGuestInfo(false);
    }

    return () => {
      if (phoneCheckTimeout) {
        clearTimeout(phoneCheckTimeout);
      }
    };
  }, [formData.phoneNumber]);

  // Auto-fill form when guest is found
  useEffect(() => {
    if (existingGuest) {
      setShowGuestInfo(true);
      
      // Auto-fill form với thông tin guest có sẵn
      const syntheticEvent = { target: { name: '', value: '' } };
      
      if (!formData.customerName && existingGuest.guestName) {
        syntheticEvent.target.name = 'customerName';
        syntheticEvent.target.value = existingGuest.guestName;
        handleInputChange(syntheticEvent);
      }
      
      if (!formData.email && existingGuest.guestEmail) {
        syntheticEvent.target.name = 'email';
        syntheticEvent.target.value = existingGuest.guestEmail;
        handleInputChange(syntheticEvent);
      }
    } else {
      setShowGuestInfo(false);
    }
  }, [existingGuest]);

  const handleClearGuestInfo = () => {
    setExistingGuest(null);
    setShowGuestInfo(false);
    
    // Clear form fields
    const clearEvent = { target: { name: '', value: '' } };
    
    clearEvent.target.name = 'customerName';
    clearEvent.target.value = '';
    handleInputChange(clearEvent);
    
    clearEvent.target.name = 'email';
    clearEvent.target.value = '';
    handleInputChange(clearEvent);
  };

  return (
    <div className={styles.formSection}>
      <h3><i className="fas fa-user"></i> Thông tin khách hàng</h3>
      
      {/* Phone Number Field */}
      <div className={styles.field}>
        <label htmlFor="phoneNumber" className={!formData.phoneNumber ? 'required' : ''}>
          <i className="fas fa-phone"></i> Số điện thoại
          {guestLoading && (
            <span className="ms-2">
              <i className="fas fa-spinner fa-spin"></i>
              <small className="text-muted ms-1">Đang kiểm tra...</small>
            </span>
          )}
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          className={validationErrors.phoneNumber ? 'error' : ''}
          placeholder="Nhập số điện thoại (VD: 0987654321)"
          required
        />
        {validationErrors.phoneNumber && (
          <div className={styles.fieldError}>
            <i className="fas fa-exclamation-circle"></i>
            {validationErrors.phoneNumber}
          </div>
        )}
        <small className={styles.fieldHint}>
          <i className="fas fa-info-circle"></i>
          Nhập đầy đủ 10 số để tự động kiểm tra khách hàng cũ
        </small>
      </div>

      {/* Existing Guest Info */}
      {showGuestInfo && existingGuest && (
        <div className={`${styles.existingGuestInfo} alert alert-success`}>
          <div className={styles.guestInfoHeader}>
            <div>
              <h6>
                <i className="fas fa-user-check"></i>
                Khách hàng đã tồn tại trong hệ thống
              </h6>
              <p className="mb-1">
                <strong>{existingGuest.guestName}</strong>
                {existingGuest.guestEmail && (
                  <span className="text-muted"> • {existingGuest.guestEmail}</span>
                )}
              </p>
              <small className="text-muted">
                Đã tạo: {new Date(existingGuest.createAt).toLocaleDateString('vi-VN')}
                {existingGuest.receptionistName && (
                  <span> bởi {existingGuest.receptionistName}</span>
                )}
              </small>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleClearGuestInfo}
              title="Nhập thông tin mới"
            >
              <i className="fas fa-edit"></i>
              Sửa
            </button>
          </div>
        </div>
      )}

      {/* Customer Name Field */}
      <div className={styles.field}>
        <label htmlFor="customerName" className={!formData.customerName ? 'required' : ''}>
          <i className="fas fa-signature"></i> Họ và tên
          {existingGuest && (
            <span className="badge bg-info ms-2">
              <i className="fas fa-sync-alt"></i> Tự động điền
            </span>
          )}
        </label>
        <input
          type="text"
          id="customerName"
          name="customerName"
          value={formData.customerName}
          onChange={handleInputChange}
          className={validationErrors.customerName ? 'error' : ''}
          placeholder="Nhập họ tên đầy đủ"
          required
          disabled={guestLoading}
        />
        {validationErrors.customerName && (
          <div className={styles.fieldError}>
            <i className="fas fa-exclamation-circle"></i>
            {validationErrors.customerName}
          </div>
        )}
      </div>

      {/* Email Field */}
      <div className={styles.field}>
        <label htmlFor="email" className={!formData.email ? 'required' : ''}>
          <i className="fas fa-envelope"></i> Email
          {existingGuest && existingGuest.guestEmail && (
            <span className="badge bg-info ms-2">
              <i className="fas fa-sync-alt"></i> Tự động điền
            </span>
          )}
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={validationErrors.email ? 'error' : ''}
          placeholder="Nhập địa chỉ email"
          required
          disabled={guestLoading}
        />
        {validationErrors.email && (
          <div className={styles.fieldError}>
            <i className="fas fa-exclamation-circle"></i>
            {validationErrors.email}
          </div>
        )}
      </div>

      {/* Guest Creation Info */}
      {!existingGuest && formData.phoneNumber && formData.phoneNumber.length >= 10 && !guestLoading && (
        <div className={`${styles.newGuestInfo} alert alert-info`}>
          <h6>
            <i className="fas fa-user-plus"></i>
            Khách hàng mới
          </h6>
          <p className="mb-0">
            <small>
              Thông tin khách hàng sẽ được lưu vào hệ thống để sử dụng cho các lần đặt phòng tiếp theo.
            </small>
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerInfoSection;