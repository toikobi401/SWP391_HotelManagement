// AddPromotion.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './AddPromotion.module.css';

function AddPromotion() {
  const [form, setForm] = useState({
    promotionName: '',
    discountPercent: '',
    startDate: '',
    endDate: '',
    description: '',
    status: 'Active' // ✅ THÊM status field với default value
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ THÊM: Status options
  const statusOptions = [
    { value: 'Active', label: 'Hoạt động', color: 'success' },
    { value: 'Inactive', label: 'Không hoạt động', color: 'secondary' },
    { value: 'Draft', label: 'Bản nháp', color: 'warning' },
    { value: 'Suspended', label: 'Tạm ngưng', color: 'danger' }
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
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
      setLoading(true);

      const promotionData = {
        promotionName: form.promotionName.trim(),
        discountPercent: parseFloat(form.discountPercent),
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim(),
        status: form.status // ✅ THÊM status vào request
      };

      console.log('📤 Sending promotion data:', promotionData);

      const response = await fetch('http://localhost:3000/api/promotions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promotionData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Tạo khuyến mãi thành công!');
        navigate('/manager/promotions');
      } else {
        throw new Error(result.message || 'Có lỗi xảy ra khi tạo khuyến mãi');
      }

    } catch (error) {
      console.error('❌ Error creating promotion:', error);
      toast.error(error.message || 'Lỗi kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/manager/promotions');
  };

  return (
    <div className={`container mt-4 ${styles.promotionForm}`}>
      <div className="card shadow p-4">
        <h3 className="mb-4 text-success">➕ Thêm khuyến mãi mới</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Tên khuyến mãi <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              name="promotionName"
              value={form.promotionName}
              onChange={handleChange}
              placeholder="VD: Khuyến mãi mùa hè"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Phần trăm giảm giá (%) <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control"
              name="discountPercent"
              value={form.discountPercent}
              onChange={handleChange}
              placeholder="VD: 20"
              min="0"
              max="100"
              required
              disabled={loading}
            />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Ngày bắt đầu <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Ngày kết thúc <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* ✅ THÊM: Status selection */}
          <div className="mb-3">
            <label className="form-label">Trạng thái <span className="text-danger">*</span></label>
            <select
              className="form-control"
              name="status"
              value={form.status}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="form-text text-muted">
              {form.status === 'Active' && '✅ Khuyến mãi sẽ có thể sử dụng ngay khi trong thời gian hiệu lực'}
              {form.status === 'Inactive' && '⏸️ Khuyến mãi sẽ không thể sử dụng'}
              {form.status === 'Draft' && '📝 Lưu dưới dạng bản nháp, chưa công khai'}
              {form.status === 'Suspended' && '🚫 Tạm ngưng sử dụng khuyến mãi'}
            </small>
          </div>

          <div className="mb-4">
            <label className="form-label">Mô tả</label>
            <textarea
              className="form-control"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              placeholder="Mô tả chi tiết về khuyến mãi..."
              disabled={loading}
            />
          </div>

          <div className="d-flex gap-2 justify-content-end">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang tạo...
                </>
              ) : (
                'Tạo khuyến mãi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPromotion;
