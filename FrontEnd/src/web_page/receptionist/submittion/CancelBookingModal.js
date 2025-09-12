import React, { useState, useEffect } from 'react';
import styles from './SubmittionPage.module.css';
import useCancelBooking from '../useCancelBooking';

const CancelBookingModal = ({ show, onClose, onSubmit, selectedBooking }) => {
  const {
    isLoading,
    error,
    successMessage,
    cancelBooking,
    resetState,
    getCancelTypes,
    validateCancelData
  } = useCancelBooking();

  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // ✅ Reset form khi modal mở (không cần dependency resetState để tránh infinite loop)
  useEffect(() => {
    if (show) {
      resetState();
      setValidationErrors([]);
      setReason('');
      setNote('');
    }
  }, [show]); // Chỉ theo dõi show, không theo dõi resetState

  // ✅ Hiển thị thông báo thành công (chỉ theo dõi successMessage)
  useEffect(() => {
    if (successMessage) {
      alert(successMessage);
      setTimeout(() => {
        handleClose();
        if (onSubmit) {
          onSubmit(); // Gọi callback để refresh data
        }
      }, 1000);
    }
  }, [successMessage]); // Chỉ theo dõi successMessage

  const handleSubmit = async () => {
    // Validate form data
    const validation = validateCancelData(reason, note);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (!selectedBooking?.bookingID) {
      setValidationErrors(['Không tìm thấy thông tin booking']);
      return;
    }

    setValidationErrors([]);

    try {
      const result = await cancelBooking(selectedBooking.bookingID, reason, note);
      
      if (result.success) {
        console.log('✅ Booking cancelled successfully');
        // Success message và close modal được xử lý trong useEffect
      } else {
        console.error('❌ Failed to cancel booking:', result.error);
      }
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
    }
  };

  const handleClose = () => {
    setReason('');
    setNote('');
    setValidationErrors([]);
    resetState();
    onClose();
  };

  if (!show) return null;

  // ✅ Lấy danh sách cancel types từ hook
  const cancelTypes = getCancelTypes();

  return (
    <div className={`modal fade show d-block ${styles.modal}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className={`modal-content ${styles.modalContent}`}>
          <div className={`modal-header ${styles.modalHeader}`}>
            <h5 className={`modal-title ${styles.modalTitle}`}>
              <i className="fas fa-times-circle text-danger me-2"></i>
              Hủy booking {selectedBooking?.bookingID ? `#${selectedBooking.bookingID}` : ''}
            </h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <div className={`modal-body ${styles.modalBody}`}>
            
            {/* ✅ Hiển thị thông tin booking */}
            {selectedBooking && (
              <div className="alert alert-info mb-3">
                <strong>Thông tin booking:</strong><br />
                <small>
                  ID: #{selectedBooking.bookingID} | 
                  Trạng thái: {selectedBooking.bookingStatus} | 
                  Khách: {selectedBooking.numberOfGuest} người
                  {selectedBooking.walkInGuestPhoneNumber && ` | SĐT: ${selectedBooking.walkInGuestPhoneNumber}`}
                </small>
              </div>
            )}

            {/* ✅ Hiển thị lỗi validation */}
            {validationErrors.length > 0 && (
              <div className="alert alert-danger">
                <strong>Lỗi:</strong>
                <ul className="mb-0">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ✅ Hiển thị lỗi từ API */}
            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <strong>Lỗi:</strong> {error}
              </div>
            )}

            <div className="mb-3">
              <label className={`form-label ${styles.formLabel}`}>
                <strong>Lý do hủy <span className="text-danger">*</span></strong>
              </label>
              <select
                className={`form-select ${styles.formSelect}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">Chọn lý do hủy</option>
                {cancelTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className={`form-label ${styles.formLabel}`}>
                <strong>Ghi chú thêm</strong>
              </label>
              <textarea
                className={`form-control ${styles.formControl}`}
                rows="4"
                placeholder="Nhập ghi chú chi tiết về việc hủy booking..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isLoading}
                maxLength={255}
              />
              <small className="form-text text-muted">
                {note.length}/255 ký tự
              </small>
            </div>
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Cảnh báo:</strong> Việc hủy booking sẽ không thể hoàn tác. Vui lòng kiểm tra kỹ trước khi xác nhận.
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className={`btn btn-secondary ${styles.button}`}
              onClick={handleClose}
              disabled={isLoading}
            >
              <i className="fas fa-times me-2"></i>
              Đóng
            </button>
            <button
              type="button"
              className={`btn btn-danger ${styles.button}`}
              onClick={handleSubmit}
              disabled={!reason.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  Đang hủy...
                </>
              ) : (
                <>
                  <i className="fas fa-check me-2"></i>
                  Xác nhận hủy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;