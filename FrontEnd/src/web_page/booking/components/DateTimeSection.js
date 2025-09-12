import React from 'react';
import styles from '../BookingForm.module.css';

const DateTimeSection = ({ 
  formData, 
  handleInputChange, 
  validationErrors, 
  validateDateTime,
  setDefaultTime 
}) => {
  const handleDateTimeChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    // ✅ SỬA: Nếu người dùng chỉ chọn ngày (không có thời gian), set default time
    if (value && !value.includes('T')) {
      if (name === 'checkIn') {
        // ✅ CheckIn: 12:00 PM (trưa) = 12:00
        processedValue = value + 'T12:00';
      } else if (name === 'checkOut') {
        // ✅ CheckOut: 11:30 AM = 11:30
        processedValue = value + 'T11:30';
      }
    } else if (value && value.includes('T')) {
      // Nếu có thời gian, validate
      validateDateTime(name, value, formData);
    }
    
    handleInputChange({ target: { name, value: processedValue } });
    
    // Validate nếu có value
    if (processedValue) {
      validateDateTime(name, processedValue, formData);
    }
  };

  return (
    <div className={styles.formSection}>
      <h3><i className="fas fa-calendar-alt"></i> Thời gian lưu trú</h3>
      
      <div className={styles.field}>
        <label htmlFor="checkIn" className={!formData.checkIn ? 'required' : ''}>
          <i className="fas fa-calendar-check"></i> Ngày & giờ nhận phòng
        </label>
        <input
          type="datetime-local"
          id="checkIn"
          name="checkIn"
          value={formData.checkIn}
          onChange={handleDateTimeChange}
          className={validationErrors.checkIn ? 'error' : ''}
          min={new Date().toISOString().slice(0, 16)}
          required
        />
        {validationErrors.checkIn && (
          <div className={styles.fieldError}>
            <i className="fas fa-exclamation-circle"></i>
            {validationErrors.checkIn}
          </div>
        )}
        {validationErrors.checkInWarning && (
          <div className={styles.fieldWarning}>
            <i className="fas fa-info-circle"></i>
            {validationErrors.checkInWarning}
          </div>
        )}
        <small className={styles.fieldHint}>
          <i className="fas fa-info-circle"></i>
          Mặc định: Nhận phòng lúc 12:00 PM (trưa)
        </small>
      </div>

      <div className={styles.field}>
        <label htmlFor="checkOut" className={!formData.checkOut ? 'required' : ''}>
          <i className="fas fa-calendar-times"></i> Ngày & giờ trả phòng
        </label>
        <input
          type="datetime-local"
          id="checkOut"
          name="checkOut"
          value={formData.checkOut}
          onChange={handleDateTimeChange}
          className={validationErrors.checkOut ? 'error' : ''}
          min={formData.checkIn || new Date().toISOString().slice(0, 16)}
          required
        />
        {validationErrors.checkOut && (
          <div className={styles.fieldError}>
            <i className="fas fa-exclamation-circle"></i>
            {validationErrors.checkOut}
          </div>
        )}
        {validationErrors.checkOutWarning && (
          <div className={styles.fieldWarning}>
            <i className="fas fa-exclamation-triangle"></i>
            {validationErrors.checkOutWarning}
          </div>
        )}
        {validationErrors.dateRange && (
          <div className={styles.fieldError}>
            <i className="fas fa-exclamation-circle"></i>
            {validationErrors.dateRange}
          </div>
        )}
        <small className={styles.fieldHint}>
          <i className="fas fa-info-circle"></i>
          {/* ✅ SỬA: Cập nhật hint để phản ánh công thức mới */}
          Trả phòng chuẩn: 11:30 (sáng). Phí trễ: 10% giá phòng/đêm × mỗi giờ sau 11:30
        </small>
      </div>
    </div>
  );
};

export default DateTimeSection;