import React, { useState, useEffect } from 'react';
import styles from '../BookingForm.module.css';

const PromotionSection = ({ 
  promotions, 
  promotionsLoading, 
  appliedPromotion, 
  promotionCode, 
  setPromotionCode,
  onApplyPromotion, 
  onRemovePromotion,
  onValidateCode,
  totalAmount,
  discountAmount,
  finalAmount
}) => {
  const [showPromotionList, setShowPromotionList] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Handle manual code input
  const handleCodeChange = (e) => {
    const value = e.target.value;
    setManualCodeInput(value);
    setPromotionCode(value);
    setValidationMessage('');
  };

  // Handle apply promotion code
  const handleApplyCode = async () => {
    if (!manualCodeInput.trim()) {
      setValidationMessage('Vui lòng nhập mã khuyến mãi');
      return;
    }

    try {
      setIsValidating(true);
      setValidationMessage('');
      
      const validation = await onValidateCode(manualCodeInput.trim());
      
      if (validation.isValid) {
        onApplyPromotion(validation.promotion);
        setValidationMessage('');
        setShowPromotionList(false);
      } else {
        setValidationMessage(validation.message);
      }
    } catch (error) {
      setValidationMessage('Lỗi khi kiểm tra mã khuyến mãi');
    } finally {
      setIsValidating(false);
    }
  };

  // Handle select promotion from list
  const handleSelectPromotion = (promotion) => {
    onApplyPromotion(promotion);
    setManualCodeInput(promotion.promotionName);
    setShowPromotionList(false);
    setValidationMessage('');
  };

  // Handle remove promotion
  const handleRemovePromotion = () => {
    onRemovePromotion();
    setManualCodeInput('');
    setValidationMessage('');
  };

  // Update manual input when promotionCode changes externally
  useEffect(() => {
    setManualCodeInput(promotionCode);
  }, [promotionCode]);

  // Filter available promotions (exclude already applied one)
  const availablePromotions = promotions.filter(p => 
    !appliedPromotion || p.promotionID !== appliedPromotion.promotionID
  );

  return (
    <div className={styles.promotionSection}>
      <div className={styles.promotionHeader}>
        <h4>
          <i className="fas fa-tags"></i>
          Khuyến mãi
          {appliedPromotion && (
            <span className={styles.appliedBadge}>
              <i className="fas fa-check-circle"></i>
              Đã áp dụng
            </span>
          )}
        </h4>
        <p className={styles.promotionSubtext}>
          Nhập mã khuyến mãi hoặc chọn từ danh sách có sẵn
        </p>
      </div>

      {/* Applied Promotion Display */}
      {appliedPromotion && (
        <div className={styles.appliedPromotion}>
          <div className={styles.appliedPromotionContent}>
            <div className={styles.appliedPromotionInfo}>
              <h5>
                <i className="fas fa-percent"></i>
                {appliedPromotion.promotionName}
              </h5>
              <p>Giảm {appliedPromotion.discountPercent}% tổng hóa đơn</p>
              {appliedPromotion.description && (
                <small className={styles.promotionDescription}>
                  {appliedPromotion.description}
                </small>
              )}
            </div>
            <div className={styles.appliedPromotionDiscount}>
              <span className={styles.discountAmount}>
                -{discountAmount.toLocaleString('vi-VN')}đ
              </span>
              <button
                type="button"
                className={styles.removePromotionBtn}
                onClick={handleRemovePromotion}
                title="Bỏ khuyến mãi"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Input Section */}
      {!appliedPromotion && (
        <div className={styles.promotionInput}>
          
          {/* Manual Code Input */}
          <div className={styles.codeInputGroup}>
            <div className={styles.codeInputField}>
              <input
                type="text"
                placeholder="Nhập mã khuyến mãi..."
                value={manualCodeInput}
                onChange={handleCodeChange}
                className={`${styles.promotionCodeInput} ${
                  validationMessage ? styles.error : ''
                }`}
                disabled={isValidating}
              />
              <button
                type="button"
                className={styles.applyCodeBtn}
                onClick={handleApplyCode}
                disabled={isValidating || !manualCodeInput.trim()}
              >
                {isValidating ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  'Áp dụng'
                )}
              </button>
            </div>
            
            {validationMessage && (
              <div className={styles.validationMessage}>
                <i className="fas fa-exclamation-circle"></i>
                {validationMessage}
              </div>
            )}
          </div>

          {/* Available Promotions Toggle */}
          {availablePromotions.length > 0 && (
            <div className={styles.promotionListToggle}>
              <button
                type="button"
                className={styles.togglePromotionListBtn}
                onClick={() => setShowPromotionList(!showPromotionList)}
              >
                <i className={`fas fa-list ${showPromotionList ? 'fa-rotate-180' : ''}`}></i>
                {showPromotionList ? 'Ẩn' : 'Xem'} khuyến mãi có sẵn ({availablePromotions.length})
              </button>
            </div>
          )}

          {/* Available Promotions List */}
          {showPromotionList && (
            <div className={styles.promotionList}>
              {promotionsLoading ? (
                <div className={styles.promotionListLoading}>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Đang tải khuyến mãi...</span>
                </div>
              ) : availablePromotions.length > 0 ? (
                <div className={styles.promotionGrid}>
                  {availablePromotions.map((promotion) => (
                    <div
                      key={promotion.promotionID}
                      className={styles.promotionCard}
                      onClick={() => handleSelectPromotion(promotion)}
                    >
                      <div className={styles.promotionCardHeader}>
                        <h6>{promotion.promotionName}</h6>
                        <span className={styles.discountBadge}>
                          -{promotion.discountPercent}%
                        </span>
                      </div>
                      
                      {promotion.description && (
                        <p className={styles.promotionCardDescription}>
                          {promotion.description}
                        </p>
                      )}
                      
                      <div className={styles.promotionCardFooter}>
                        <small className={styles.promotionDates}>
                          <i className="fas fa-calendar"></i>
                          Đến {new Date(promotion.endDate).toLocaleDateString('vi-VN')}
                        </small>
                        <button
                          type="button"
                          className={styles.selectPromotionBtn}
                        >
                          Chọn
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noPromotions}>
                  <i className="fas fa-tag"></i>
                  <p>Không có khuyến mãi nào khả dụng</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Promotion Summary */}
      {appliedPromotion && totalAmount > 0 && (
        <div className={styles.promotionSummary}>
          <div className={styles.promotionSummaryRow}>
            <span>Tổng tiền gốc:</span>
            <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className={styles.promotionSummaryRow}>
            <span>Giảm giá ({appliedPromotion.discountPercent}%):</span>
            <span className={styles.discountText}>
              -{discountAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className={`${styles.promotionSummaryRow} ${styles.finalAmount}`}>
            <span>Thành tiền:</span>
            <span>{finalAmount.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionSection;