import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import SimpleModal from '../../UI component/Modal/SimpleModal';
import styles from './EditPromotion.module.css';

function EditPromotionModal({ isOpen, onClose, promotionId, onSuccess }) {
  const [form, setForm] = useState({
    promotionName: '',
    discountPercent: '',
    startDate: '',
    endDate: '',
    description: '',
    status: 'Active'
  });

  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');

  // Status options
  const statusOptions = [
    { value: 'Active', label: 'Hoạt động', color: 'success' },
    { value: 'Inactive', label: 'Không hoạt động', color: 'secondary' },
    { value: 'Draft', label: 'Bản nháp', color: 'warning' },
    { value: 'Suspended', label: 'Tạm ngưng', color: 'danger' },
    { value: 'Expired', label: 'Hết hạn', color: 'info' }
  ];

  // Fetch promotion data when modal opens
  useEffect(() => {
    if (isOpen && promotionId) {
      fetchPromotionData();
    } else if (!isOpen) {
      // Reset form when modal closes
      resetForm();
    }
  }, [isOpen, promotionId]);

  // Check for changes
  useEffect(() => {
    const dataChanged = JSON.stringify(form) !== JSON.stringify(originalData);
    setHasChanges(dataChanged);
  }, [form, originalData]);

  const resetForm = () => {
    setForm({
      promotionName: '',
      discountPercent: '',
      startDate: '',
      endDate: '',
      description: '',
      status: 'Active'
    });
    setOriginalData({});
    setLoading(false);
    setSubmitLoading(false);
    setHasChanges(false);
    setError('');
  };

  const fetchPromotionData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log(`🔄 Fetching promotion ${promotionId} data...`);
      
      const response = await fetch(`http://localhost:3000/api/promotions/${promotionId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Promotion data fetched:', result);
        
        if (result.success && result.data) {
          const promotionData = result.data;
          
          // Format dates for input fields
          const formattedData = {
            promotionName: promotionData.promotionName,
            discountPercent: promotionData.discountPercent.toString(),
            startDate: promotionData.startDate ? promotionData.startDate.split('T')[0] : '',
            endDate: promotionData.endDate ? promotionData.endDate.split('T')[0] : '',
            description: promotionData.description || '',
            status: promotionData.status || 'Active'
          };
          
          setForm(formattedData);
          setOriginalData(formattedData);
        } else {
          throw new Error(result.message || 'Không thể tải dữ liệu khuyến mãi');
        }
      } else if (response.status === 404) {
        setError('Không tìm thấy khuyến mãi');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching promotion:', error);
      setError('Lỗi khi tải dữ liệu khuyến mãi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ 
      ...form, 
      [e.target.name]: e.target.value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitLoading) return;

    if (!hasChanges) {
      toast.info('Không có thay đổi nào để lưu');
      return;
    }
    
    // Validation
    if (!form.promotionName.trim()) {
      toast.error('Vui lòng nhập tên khuyến mãi');
      return;
    }

    if (!form.discountPercent || parseFloat(form.discountPercent) <= 0) {
      toast.error('Vui lòng nhập phần trăm giảm giá hợp lệ');
      return;
    }

    if (!form.startDate || !form.endDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và kết thúc');
      return;
    }

    if (new Date(form.startDate) >= new Date(form.endDate)) {
      toast.error('Ngày bắt đầu phải trước ngày kết thúc');
      return;
    }

    try {
      setSubmitLoading(true);

      const promotionData = {
        promotionName: form.promotionName.trim(),
        discountPercent: parseFloat(form.discountPercent),
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim(),
        status: form.status
      };

      console.log('📤 Updating promotion data:', promotionData);

      const response = await fetch(`http://localhost:3000/api/promotions/${promotionId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promotionData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Cập nhật khuyến mãi thành công!');
        
        // Update original data to reflect saved state
        setOriginalData(form);
        
        // Call success callback and close modal
        if (onSuccess) {
          onSuccess();
        }
        
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error(result.message || 'Có lỗi xảy ra khi cập nhật khuyến mãi');
      }

    } catch (error) {
      console.error('❌ Error updating promotion:', error);
      toast.error('Lỗi khi cập nhật khuyến mãi: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục về dữ liệu ban đầu?')) {
      setForm(originalData);
    }
  };

  // ✅ ENHANCED: handleDelete function với usage checking
  const handleDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khuyến mãi "${originalData.promotionName}"?\n\nVui lòng chờ hệ thống kiểm tra tình trạng sử dụng...`)) {
      return;
    }

    try {
      setSubmitLoading(true);
      
      // ✅ KIỂM TRA USAGE TRƯỚC KHI XÓA
      console.log(`🔍 Checking usage for promotion ${promotionId}...`);
      
      const checkResponse = await fetch(`http://localhost:3000/api/promotions/${promotionId}/check-usage`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        
        if (checkResult.success && checkResult.data.isInUse) {
          // ✅ HIỂN THỊ THÔNG BÁO CHI TIẾT VỀ VIỆC KHÔNG THỂ XÓA
          const usageDetails = checkResult.data.usage.map(u => `${u.count} ${u.description}`).join(', ');
          
          toast.error(
            `❌ Không thể xóa khuyến mãi!\n\n` +
            `Khuyến mãi này đang được sử dụng trong ${checkResult.data.totalReferences} bản ghi: ${usageDetails}\n\n` +
            `💡 ${checkResult.data.recommendation}`,
            { 
              autoClose: 8000,
              position: "top-center",
              style: { whiteSpace: 'pre-line' }
            }
          );
          
          // ✅ ĐỀ XUẤT THAY ĐỔI TRẠNG THÁI
          const changeStatus = window.confirm(
            `Khuyến mãi đang được sử dụng và không thể xóa.\n\n` +
            `Bạn có muốn chuyển trạng thái thành "Không hoạt động" thay thế?\n\n` +
            `(Điều này sẽ ngưng việc sử dụng khuyến mãi mà không ảnh hưởng đến dữ liệu hiện có)`
          );
          
          if (changeStatus) {
            // ✅ THAY ĐỔI TRẠNG THÁI THAY VÌ XÓA
            try {
              const statusResponse = await fetch(`http://localhost:3000/api/promotions/${promotionId}/status`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'Inactive' })
              });

              const statusResult = await statusResponse.json();

              if (statusResponse.ok && statusResult.success) {
                toast.success('✅ Đã chuyển khuyến mãi thành trạng thái "Không hoạt động"');
                
                if (onSuccess) {
                  onSuccess();
                }
                
                onClose();
              } else {
                throw new Error(statusResult.message || 'Không thể thay đổi trạng thái');
              }
            } catch (statusError) {
              console.error('❌ Error changing status:', statusError);
              toast.error('Lỗi khi thay đổi trạng thái: ' + statusError.message);
            }
          }
          
          return; // Exit early
        }
      }
      
      // ✅ NẾU KHÔNG CÓ USAGE, TIẾP TỤC XÓA
      const finalConfirm = window.confirm(
        `⚠️ XÁC NHẬN CUỐI CÙNG:\n\n` +
        `Xóa vĩnh viễn khuyến mãi "${originalData.promotionName}"?\n\n` +
        `Hành động này KHÔNG THỂ HOÀN TÁC!`
      );
      
      if (!finalConfirm) {
        return;
      }
      
      const response = await fetch(`http://localhost:3000/api/promotions/${promotionId}?confirm=true`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('✅ Xóa khuyến mãi thành công!');
        
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        // ✅ ENHANCED ERROR HANDLING
        if (result.data && result.data.cannotDelete) {
          toast.error(
            `❌ ${result.message}\n\n💡 ${result.data.suggestion || 'Thay đổi trạng thái thay vì xóa'}`,
            { 
              autoClose: 8000,
              position: "top-center",
              style: { whiteSpace: 'pre-line' }
            }
          );
        } else {
          throw new Error(result.message || 'Không thể xóa khuyến mãi');
        }
      }
    } catch (error) {
      console.error('❌ Error deleting promotion:', error);
      
      // ✅ ENHANCED ERROR MESSAGES
      if (error.message.includes('được sử dụng trong')) {
        toast.error(
          `❌ ${error.message}\n\n💡 Thử thay đổi trạng thái thành "Không hoạt động" thay vì xóa.`,
          { 
            autoClose: 8000,
            position: "top-center",
            style: { whiteSpace: 'pre-line' }
          }
        );
      } else {
        toast.error('Lỗi khi xóa khuyến mãi: ' + error.message);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Modal content
  const modalContent = () => {
    // Loading state
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-2">Đang tải thông tin khuyến mãi...</p>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="alert alert-danger">
          <h5>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Có lỗi xảy ra
          </h5>
          <p className="mb-0">{error}</p>
        </div>
      );
    }

    // Form content
    return (
      <div className={styles.promotionForm}>
        {hasChanges && (
          <div className="alert alert-warning d-flex align-items-center mb-3">
            <i className="fas fa-edit me-2"></i>
            <span>Có thay đổi chưa được lưu</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">
              Tên khuyến mãi <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${form.promotionName !== originalData.promotionName ? 'border-warning' : ''}`}
              name="promotionName"
              value={form.promotionName}
              onChange={handleChange}
              placeholder="VD: Khuyến mãi mùa hè"
              required
              disabled={submitLoading}
            />
            {form.promotionName !== originalData.promotionName && (
              <small className="text-warning">
                <i className="fas fa-edit me-1"></i>
                Đã thay đổi từ: "{originalData.promotionName}"
              </small>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">
              Phần trăm giảm giá (%) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className={`form-control ${form.discountPercent !== originalData.discountPercent ? 'border-warning' : ''}`}
              name="discountPercent"
              value={form.discountPercent}
              onChange={handleChange}
              placeholder="VD: 20"
              min="0"
              max="100"
              step="0.01"
              required
              disabled={submitLoading}
            />
            {form.discountPercent !== originalData.discountPercent && (
              <small className="text-warning">
                <i className="fas fa-edit me-1"></i>
                Đã thay đổi từ: {originalData.discountPercent}%
              </small>
            )}
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">
                Ngày bắt đầu <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`form-control ${form.startDate !== originalData.startDate ? 'border-warning' : ''}`}
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
                disabled={submitLoading}
              />
              {form.startDate !== originalData.startDate && (
                <small className="text-warning">
                  <i className="fas fa-edit me-1"></i>
                  Đã thay đổi từ: {originalData.startDate ? new Date(originalData.startDate).toLocaleDateString('vi-VN') : ''}
                </small>
              )}
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">
                Ngày kết thúc <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`form-control ${form.endDate !== originalData.endDate ? 'border-warning' : ''}`}
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
                disabled={submitLoading}
              />
              {form.endDate !== originalData.endDate && (
                <small className="text-warning">
                  <i className="fas fa-edit me-1"></i>
                  Đã thay đổi từ: {originalData.endDate ? new Date(originalData.endDate).toLocaleDateString('vi-VN') : ''}
                </small>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">
              Trạng thái <span className="text-danger">*</span>
            </label>
            <select
              className={`form-control ${form.status !== originalData.status ? 'border-warning' : ''}`}
              name="status"
              value={form.status}
              onChange={handleChange}
              required
              disabled={submitLoading}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {form.status !== originalData.status && (
              <small className="text-warning">
                <i className="fas fa-edit me-1"></i>
                Đã thay đổi từ: {statusOptions.find(opt => opt.value === originalData.status)?.label}
              </small>
            )}
            <small className="form-text text-muted d-block mt-1">
              {form.status === 'Active' && '✅ Khuyến mãi sẽ có thể sử dụng khi trong thời gian hiệu lực'}
              {form.status === 'Inactive' && '⏸️ Khuyến mãi sẽ không thể sử dụng'}
              {form.status === 'Draft' && '📝 Lưu dưới dạng bản nháp, chưa công khai'}
              {form.status === 'Suspended' && '🚫 Tạm ngưng sử dụng khuyến mãi'}
              {form.status === 'Expired' && '⏰ Khuyến mãi đã hết hạn'}
            </small>
          </div>

          <div className="mb-4">
            <label className="form-label">Mô tả</label>
            <textarea
              className={`form-control ${form.description !== originalData.description ? 'border-warning' : ''}`}
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              placeholder="Mô tả chi tiết về khuyến mãi..."
              disabled={submitLoading}
            />
            {form.description !== originalData.description && (
              <small className="text-warning">
                <i className="fas fa-edit me-1"></i>
                Mô tả đã được thay đổi
              </small>
            )}
          </div>

          <div className="d-flex gap-2 justify-content-between">
            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={submitLoading}
              >
                <i className="fas fa-times me-1"></i>
                Đóng
              </button>
              
              {hasChanges && (
                <button 
                  type="button" 
                  className="btn btn-outline-warning"
                  onClick={handleReset}
                  disabled={submitLoading}
                >
                  <i className="fas fa-undo me-1"></i>
                  Khôi phục
                </button>
              )}
            </div>

            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-outline-danger"
                onClick={handleDelete}
                disabled={submitLoading}
              >
                <i className="fas fa-trash me-1"></i>
                Xóa
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitLoading || !hasChanges}
              >
                {submitLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1"></i>
                    Cập nhật khuyến mãi
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  return (
    <SimpleModal 
      isOpen={isOpen} 
      onClose={handleCancel}
      title={
        <div className="d-flex justify-content-between align-items-center w-100">
          <span>
            <i className="fas fa-edit me-2"></i>
            Chỉnh sửa khuyến mãi
          </span>
          {hasChanges && (
            <span className="badge bg-warning ms-2">
              <i className="fas fa-edit me-1"></i>
              Có thay đổi
            </span>
          )}
        </div>
      }
    >
      {modalContent()}
    </SimpleModal>
  );
}

export default EditPromotionModal;