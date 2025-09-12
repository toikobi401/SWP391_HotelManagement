import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import SimpleModal from '../../UI component/Modal/SimpleModal';
import styles from './ServiceModal.module.css';

const categories = [
  'Spa & Wellness',
  'Ăn uống',
  'Vận chuyển',
  'Tour & Hoạt động',
  'Dịch vụ phòng',
  'Giặt ủi',
  'Dịch vụ doanh nghiệp',
  'Giải trí',
  'Trẻ em & Gia đình',
  'Sức khỏe & Thể thao',
  'Mua sắm',
  'Sự kiện đặc biệt',
  'Khác',
];

const ServiceModal = ({ 
  isOpen, 
  onClose, 
  serviceData = null, 
  onSave,
  mode = 'add' // 'add' hoặc 'edit'
}) => {
  const [service, setService] = useState({
    ServiceName: '',
    Description: '',
    Price: '',
    Category: 'Khác',
    IsActive: true,
    Duration: 0,
    MaxCapacity: 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // ✅ Reset form khi modal mở/đóng
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && serviceData) {
        // Load dữ liệu cho edit mode
        setService({
          ServiceName: serviceData.ServiceName || '',
          Description: serviceData.Description || '',
          Price: serviceData.Price || '',
          Category: serviceData.Category || 'Khác',
          IsActive: serviceData.IsActive !== undefined ? serviceData.IsActive : true,
          Duration: serviceData.Duration || 0,
          MaxCapacity: serviceData.MaxCapacity || 0,
        });
      } else {
        // Reset form cho add mode
        setService({
          ServiceName: '',
          Description: '',
          Price: '',
          Category: 'Khác',
          IsActive: true,
          Duration: 0,
          MaxCapacity: 0,
        });
      }
      setError('');
      setSuccess('');
      setValidationErrors({});
    }
  }, [isOpen, mode, serviceData]);

  // ✅ Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setService((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // ✅ Validation
  const validateForm = () => {
    const errors = {};

    if (!service.ServiceName.trim()) {
      errors.ServiceName = 'Tên dịch vụ là bắt buộc';
    } else if (service.ServiceName.trim().length < 3) {
      errors.ServiceName = 'Tên dịch vụ phải có ít nhất 3 ký tự';
    }

    if (!service.Description.trim()) {
      errors.Description = 'Mô tả là bắt buộc';
    } else if (service.Description.trim().length < 10) {
      errors.Description = 'Mô tả phải có ít nhất 10 ký tự';
    }

    if (!service.Price || parseFloat(service.Price) <= 0) {
      errors.Price = 'Giá phải lớn hơn 0';
    }

    if (!service.Duration || parseInt(service.Duration) <= 0) {
      errors.Duration = 'Thời gian phải lớn hơn 0 phút';
    }

    if (!service.MaxCapacity || parseInt(service.MaxCapacity) <= 0) {
      errors.MaxCapacity = 'Sức chứa tối đa phải lớn hơn 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Vui lòng kiểm tra lại thông tin nhập');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const servicePayload = {
        ...service,
        Price: parseFloat(service.Price),
        Duration: parseInt(service.Duration),
        MaxCapacity: parseInt(service.MaxCapacity),
      };

      if (mode === 'edit' && serviceData) {
        servicePayload.ServiceID = serviceData.ServiceID;
      }

      await onSave(servicePayload, mode);
      
      setSuccess(mode === 'add' ? 'Thêm dịch vụ thành công!' : 'Cập nhật dịch vụ thành công!');
      
      // Đóng modal sau 1.5 giây
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error(`Error ${mode} service:`, err);
      setError(err.message || `Lỗi khi ${mode === 'add' ? 'thêm' : 'cập nhật'} dịch vụ`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle close với confirmation nếu có thay đổi
  const handleClose = () => {
    const hasChanges = mode === 'add' 
      ? Object.values(service).some(value => value !== '' && value !== 0 && value !== 'Khác' && value !== true)
      : serviceData && Object.keys(service).some(key => 
          service[key] !== serviceData[key]
        );

    if (hasChanges && !loading) {
      if (window.confirm('Bạn có chắc muốn đóng? Thông tin chưa lưu sẽ bị mất.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className={styles.modalTitle}>
          <i className={`fas ${mode === 'add' ? 'fa-plus-circle' : 'fa-edit'}`}></i>
          <span>{mode === 'add' ? 'Thêm dịch vụ mới' : 'Chỉnh sửa dịch vụ'}</span>
        </div>
      }
    >
      <div className={styles.serviceModal}>
        {/* ✅ Status Messages */}
        {error && (
          <Alert variant="danger" className="mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" className="mb-3">
            <i className="fas fa-check-circle me-2"></i>
            {success}
          </Alert>
        )}

        {/* ✅ Form */}
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              {/* Service Name */}
              <Form.Group className="mb-3">
                <Form.Label className={styles.formLabel}>
                  <i className="fas fa-concierge-bell me-2"></i>
                  Tên dịch vụ <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="ServiceName"
                  value={service.ServiceName}
                  onChange={handleChange}
                  placeholder="Nhập tên dịch vụ..."
                  isInvalid={!!validationErrors.ServiceName}
                  className={styles.formControl}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.ServiceName}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Description */}
              <Form.Group className="mb-3">
                <Form.Label className={styles.formLabel}>
                  <i className="fas fa-align-left me-2"></i>
                  Mô tả <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="Description"
                  value={service.Description}
                  onChange={handleChange}
                  placeholder="Mô tả chi tiết về dịch vụ..."
                  isInvalid={!!validationErrors.Description}
                  className={styles.formControl}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.Description}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Price */}
              <Form.Group className="mb-3">
                <Form.Label className={styles.formLabel}>
                  <i className="fas fa-dollar-sign me-2"></i>
                  Giá (VND) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="Price"
                  value={service.Price}
                  onChange={handleChange}
                  placeholder="0"
                  step="1000"
                  min="0"
                  isInvalid={!!validationErrors.Price}
                  className={styles.formControl}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.Price}
                </Form.Control.Feedback>
                {service.Price && (
                  <Form.Text className="text-muted">
                    💰 {parseInt(service.Price).toLocaleString('vi-VN')} VND
                  </Form.Text>
                )}
              </Form.Group>

              {/* Category */}
              <Form.Group className="mb-3">
                <Form.Label className={styles.formLabel}>
                  <i className="fas fa-tags me-2"></i>
                  Danh mục
                </Form.Label>
                <Form.Select 
                  name="Category" 
                  value={service.Category} 
                  onChange={handleChange}
                  className={styles.formControl}
                  disabled={loading}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              {/* Duration */}
              <Form.Group className="mb-3">
                <Form.Label className={styles.formLabel}>
                  <i className="fas fa-clock me-2"></i>
                  Thời gian (phút) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="Duration"
                  value={service.Duration}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  isInvalid={!!validationErrors.Duration}
                  className={styles.formControl}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.Duration}
                </Form.Control.Feedback>
                {service.Duration > 0 && (
                  <Form.Text className="text-muted">
                    ⏱️ {Math.floor(service.Duration / 60)}h {service.Duration % 60}m
                  </Form.Text>
                )}
              </Form.Group>

              {/* Max Capacity */}
              <Form.Group className="mb-3">
                <Form.Label className={styles.formLabel}>
                  <i className="fas fa-users me-2"></i>
                  Sức chứa tối đa <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="MaxCapacity"
                  value={service.MaxCapacity}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  isInvalid={!!validationErrors.MaxCapacity}
                  className={styles.formControl}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.MaxCapacity}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Active Status */}
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="IsActive"
                  checked={service.IsActive}
                  onChange={handleChange}
                  label={
                    <span className={styles.checkboxLabel}>
                      <i className={`fas ${service.IsActive ? 'fa-check-circle' : 'fa-times-circle'} me-2`}></i>
                      Dịch vụ đang hoạt động
                    </span>
                  }
                  className={styles.formCheck}
                  disabled={loading}
                />
              </Form.Group>

              {/* Preview Info */}
              <div className={styles.previewCard}>
                <h6 className={styles.previewTitle}>
                  <i className="fas fa-eye me-2"></i>
                  Xem trước
                </h6>
                <div className={styles.previewContent}>
                  <p><strong>Tên:</strong> {service.ServiceName || 'Chưa nhập'}</p>
                  <p><strong>Danh mục:</strong> {service.Category}</p>
                  <p><strong>Giá:</strong> {service.Price ? `${parseInt(service.Price).toLocaleString('vi-VN')} VND` : 'Chưa nhập'}</p>
                  <p><strong>Thời gian:</strong> {service.Duration || 0} phút</p>
                  <p><strong>Sức chứa:</strong> {service.MaxCapacity || 0} người</p>
                  <p><strong>Trạng thái:</strong> 
                    <span className={`ms-2 ${service.IsActive ? 'text-success' : 'text-danger'}`}>
                      {service.IsActive ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </p>
                </div>
              </div>
            </Col>
          </Row>

          {/* ✅ Action Buttons */}
          <div className={styles.modalActions}>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
              className={styles.saveBtn}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {mode === 'add' ? 'Đang thêm...' : 'Đang cập nhật...'}
                </>
              ) : (
                <>
                  <i className={`fas ${mode === 'add' ? 'fa-plus' : 'fa-save'} me-2`}></i>
                  {mode === 'add' ? 'Thêm dịch vụ' : 'Cập nhật dịch vụ'}
                </>
              )}
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={handleClose}
              disabled={loading}
              className={styles.cancelBtn}
            >
              <i className="fas fa-times me-2"></i>
              Hủy
            </Button>
          </div>
        </Form>
      </div>
    </SimpleModal>
  );
};

export default ServiceModal;