import React, { useState } from 'react';
import styles from './SpecialRequestOnline.module.css';

const SpecialRequestOnline = ({ 
  formData, 
  handleInputChange, 
  nextStep, 
  prevStep 
}) => {
  const [characterCount, setCharacterCount] = useState(formData.specialRequest?.length || 0);
  const maxCharacters = 250; // ✅ SỬA: Giảm từ 500 xuống 250 để phù hợp với database

  const handleSpecialRequestChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxCharacters) {
      handleInputChange(e);
      setCharacterCount(value.length);
    }
  };

  const handleNextStep = () => {
    // ✅ Special request là optional, không cần validation
    nextStep();
  };

  // ✅ Danh sách các gợi ý special request phổ biến
  const commonRequests = [
    "Phòng tầng cao",
    "Phòng view biển", 
    "Phòng yên tĩnh",
    "Gần thang máy",
    "Xa thang máy",
    "Phòng không hút thuốc",
    "Giường đôi lớn",
    "2 giường đơn",
    "Phòng kết nối",
    "Check-in sớm",
    "Check-out muộn",
    "Báo thức sớm",
    "Không làm phòng",
    "Phòng cho người khuyết tật",
    "Gần nhà hàng"
  ];

  const addSuggestion = (suggestion) => {
    let currentRequest = formData.specialRequest || '';
    
    // Thêm dấu phẩy nếu đã có nội dung
    if (currentRequest.trim()) {
      currentRequest += ', ';
    }
    
    const newRequest = currentRequest + suggestion;
    
    if (newRequest.length <= maxCharacters) {
      const syntheticEvent = {
        target: {
          name: 'specialRequest',
          value: newRequest
        }
      };
      handleSpecialRequestChange(syntheticEvent);
    }
  };

  const clearRequest = () => {
    const syntheticEvent = {
      target: {
        name: 'specialRequest',
        value: ''
      }
    };
    handleSpecialRequestChange(syntheticEvent);
  };

  return (
    <div className={styles.specialRequestSection}>
      <div className={styles.container}>
        {/* ✅ HEADER */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            <i className="fas fa-comment-dots"></i>
            Yêu cầu đặc biệt
          </h3>
          <p className={styles.subtitle}>
            Hãy cho chúng tôi biết những yêu cầu đặc biệt của bạn để chúng tôi có thể phục vụ bạn tốt nhất
            <span className={styles.optional}>(Không bắt buộc)</span>
          </p>
        </div>

        {/* ✅ BOOKING INFO SUMMARY */}
        <div className={styles.bookingInfo}>
          <h6 className={styles.bookingInfoTitle}>
            <i className="fas fa-info-circle"></i>
            Thông tin đặt phòng
          </h6>
          <div className={styles.bookingInfoGrid}>
            <div className={styles.infoItem}>
              <span>Ngày nhận phòng:</span>
              <strong>{new Date(formData.checkIn).toLocaleDateString('vi-VN')}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Ngày trả phòng:</span>
              <strong>{new Date(formData.checkOut).toLocaleDateString('vi-VN')}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Số khách:</span>
              <strong>{formData.numberOfGuest} người</strong>
            </div>
          </div>
        </div>

        {/* ✅ SPECIAL REQUEST INPUT */}
        <div className={styles.requestInputSection}>
          <div className={styles.inputWrapper}>
            <label htmlFor="specialRequest" className={styles.inputLabel}>
              <i className="fas fa-edit"></i>
              Yêu cầu của bạn
            </label>
            <textarea
              id="specialRequest"
              name="specialRequest"
              value={formData.specialRequest || ''}
              onChange={handleSpecialRequestChange}
              placeholder="Ví dụ: Tôi muốn phòng tầng cao có view biển, check-in sớm lúc 12:00..."
              className={styles.textarea}
              rows={4}
            />
            <div className={styles.inputFooter}>
              <span className={styles.characterCount}>
                {characterCount}/{maxCharacters} ký tự
              </span>
              {formData.specialRequest && (
                <button
                  type="button"
                  onClick={clearRequest}
                  className={styles.clearButton}
                >
                  <i className="fas fa-times"></i>
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ✅ COMMON SUGGESTIONS */}
        <div className={styles.suggestionsSection}>
          <h6 className={styles.suggestionsTitle}>
            <i className="fas fa-lightbulb"></i>
            Gợi ý yêu cầu phổ biến
          </h6>
          <p className={styles.suggestionsSubtitle}>
            Nhấp vào các gợi ý dưới đây để thêm vào yêu cầu của bạn
          </p>
          <div className={styles.suggestionsGrid}>
            {commonRequests.map((request, index) => (
              <button
                key={index}
                type="button"
                onClick={() => addSuggestion(request)}
                className={styles.suggestionButton}
                disabled={characterCount + request.length + 2 > maxCharacters}
              >
                <i className="fas fa-plus"></i>
                {request}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ HELPFUL NOTES */}
        <div className={styles.notesSection}>
          <div className={styles.noteCard}>
            <i className="fas fa-info-circle"></i>
            <div>
              <h6>Lưu ý quan trọng</h6>
              <ul>
                <li>Chúng tôi sẽ cố gắng đáp ứng yêu cầu của bạn tùy thuộc vào tình trạng sẵn có</li>
                <li>Một số yêu cầu có thể phát sinh phí bổ sung</li>
                <li>Yêu cầu đặc biệt không đảm bảo 100% được thực hiện</li>
                <li>Để được hỗ trợ tốt nhất, hãy liên hệ trực tiếp với khách sạn</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ✅ FORM ACTIONS */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={prevStep}
            className={styles.btnBack}
          >
            <i className="fas fa-arrow-left"></i>
            Quay lại
          </button>
          
          <button
            type="button"
            onClick={handleNextStep}
            className={styles.btnNext}
          >
            Tiếp tục
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpecialRequestOnline;
