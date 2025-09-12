import React from 'react';
import styles from './DateTimeSectionOnline.module.css';

const DateTimeSectionOnline = ({ formData, handleInputChange, nextStep, hasPrefilledData }) => {
  
  // ✅ THÊM: Debug log để kiểm tra dữ liệu nhận được
  console.log('🔍 DateTimeSectionOnline - formData:', formData);
  console.log('🔍 DateTimeSectionOnline - numberOfGuest:', formData.numberOfGuest);
  
  // ✅ THÊM: Validate form trước khi next step
  const handleNextStep = () => {
    if (!formData.checkIn || !formData.checkOut || !formData.numberOfGuest) {
      alert('Vui lòng điền đầy đủ thông tin ngày nhận phòng, trả phòng và số khách');
      return;
    }

    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      alert('Ngày nhận phòng không thể là ngày trong quá khứ');
      return;
    }

    if (checkOutDate <= checkInDate) {
      alert('Ngày trả phòng phải sau ngày nhận phòng');
      return;
    }

    if (formData.numberOfGuest < 1 || formData.numberOfGuest > 100) {
      alert('Số khách phải từ 1 đến 100 người');
      return;
    }

    nextStep();
  };

  // ✅ THÊM: Tính số ngày ở
  const calculateNights = () => {
    if (formData.checkIn && formData.checkOut) {
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
      const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return nights > 0 ? nights : 0;
    }
    return 0;
  };

  const nights = calculateNights();

  return (
    <div className={styles.dateTimeSection}>
      <h2 className={styles.title}>Xác Nhận Chọn Ngày Nhận Và Trả Phòng</h2>
      
      {/* ✅ THÊM: Hiển thị thông báo nếu có dữ liệu từ homepage */}
      {hasPrefilledData && (
        <div className={styles.prefilledNotice}>
          <i className="fas fa-check-circle"></i>
          Thông tin đã được điền sẵn từ trang chủ. Bạn có thể chỉnh sửa nếu cần.
        </div>
      )}

      <div className={styles.formRow}>
        <label htmlFor="checkIn" className={styles.label}>
          <i className="fas fa-calendar-alt"></i>
          Ngày Nhận Phòng
        </label>
        <input 
          type="date" 
          id="checkIn"
          name="checkIn" 
          value={formData.checkIn} 
          onChange={handleInputChange} 
          required 
          min={new Date().toISOString().split('T')[0]}
          className={styles.input}
        />
      </div>

      <div className={styles.formRow}>
        <label htmlFor="checkOut" className={styles.label}>
          <i className="fas fa-calendar-check"></i>
          Ngày Trả Phòng
        </label>
        <input 
          type="date" 
          id="checkOut"
          name="checkOut" 
          value={formData.checkOut} 
          onChange={handleInputChange} 
          required 
          min={formData.checkIn || new Date().toISOString().split('T')[0]}
          className={styles.input}
        />
      </div>

      <div className={styles.formRow}>
        <label htmlFor="numberOfGuest" className={styles.label}>
          <i className="fas fa-users"></i>
          Số Khách
        </label>
        <input 
          type="number" 
          id="numberOfGuest"
          name="numberOfGuest" 
          value={formData.numberOfGuest} 
          onChange={handleInputChange} 
          min={1} 
          max={100}
          required 
          className={styles.input}
        />
      </div>

      {/* ✅ THÊM: Hiển thị thông tin tóm tắt */}
      {formData.checkIn && formData.checkOut && nights > 0 && (
        <div className={styles.bookingInfo}>
          <h4 className={styles.bookingInfoTitle}>
            <i className="fas fa-info-circle"></i>
            Thông tin đặt phòng
          </h4>
          <div className={styles.bookingInfoGrid}>
            <div>
              <strong>Nhận phòng:</strong> {new Date(formData.checkIn).toLocaleDateString('vi-VN')}
            </div>
            <div>
              <strong>Trả phòng:</strong> {new Date(formData.checkOut).toLocaleDateString('vi-VN')}
            </div>
            <div>
              <strong>Số đêm:</strong> {nights} đêm
            </div>
            <div>
              <strong>Số khách:</strong> {formData.numberOfGuest} người
            </div>
          </div>
        </div>
      )}

      <div className={styles.formActions}>
        <button 
          className={styles.btnNext}
          onClick={handleNextStep}
          disabled={!formData.checkIn || !formData.checkOut || !formData.numberOfGuest}
        >
          <i className="fas fa-search"></i>
          Tìm phòng
        </button>
      </div>
    </div>
  );
};

export default DateTimeSectionOnline;