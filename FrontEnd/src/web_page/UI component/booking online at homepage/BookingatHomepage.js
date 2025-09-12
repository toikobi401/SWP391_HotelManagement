import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Thay vì Link
import './bookingonline.css';

function CheckinForm() {
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    numberOfGuest: 1
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date('2025-07-02').toISOString().split('T')[0];
  const navigate = useNavigate();

  useEffect(() => {
    let newErrors = {};
    if (formData.checkIn && new Date(formData.checkIn) < new Date(today)) {
      newErrors.checkIn = 'Ngày nhận phòng phải từ hôm nay trở đi!';
    }
    if (formData.checkOut && formData.checkIn && new Date(formData.checkOut) <= new Date(formData.checkIn)) {
      newErrors.checkOut = 'Ngày trả phòng phải sau ngày nhận phòng!';
    }
    if (formData.numberOfGuest < 1) {
      newErrors.numberOfGuest = 'Ít nhất 1 người!';
    } else if (formData.numberOfGuest > 10) {
      newErrors.numberOfGuest = 'Tối đa 10 người!';
    }
    setErrors(newErrors);
  },
 [formData.checkIn, formData.checkOut, formData.numberOfGuest]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Nếu muốn validate thì kiểm tra errors ở đây
    // navigate('/booking');
    
    // Validate form
    if (!formData.checkIn || !formData.checkOut || !formData.numberOfGuest) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();
    
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

    // ✅ Truyền dữ liệu sang OnlineBookingForm
    navigate('/booking', {
      state: {
        bookingData: {
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          numberOfGuest: parseInt(formData.numberOfGuest)
        }
      }
    });
  };

  return (
    <div className="container mt-3">
      <div
        className="card-bookingform p-3 bookimgformathome"
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          backgroundColor: 'transparent'
        }}
      >
        <h2 className="text-center mb-3" style={{ color: '#fff', fontSize: '33px' }}>Đặt Phòng Online</h2>
        <form onSubmit={handleSubmit}>
          <div className="d-flex flex-wrap gap-3 justify-content-between align-items-end">

            <div className="form-group" style={{ minWidth: '200px' }}>
              <label htmlFor="checkIn" className="form-label">Ngày nhận 📅📥</label>
              <input
                style={{ backgroundColor: 'transparent', color: '#fff' }}
                type="date"
                id="checkIn"
                name="checkIn"
                value={formData.checkIn}
                onChange={handleChange}
                className={`form-control ${errors.checkIn ? 'is-invalid' : ''}`}
                min={today}
                required
              />
              {errors.checkIn && <div className="invalid-feedback">{errors.checkIn}</div>}
            </div>

            <div className="form-group" style={{ minWidth: '200px' }}>
              <label htmlFor="checkOut" className="form-label">Ngày trả 🗓️📤</label>
              <input
                style={{ backgroundColor: 'transparent', color: '#fff' }}
                type="date"
                id="checkOut"
                name="checkOut"
                value={formData.checkOut}
                onChange={handleChange}
                className={`form-control ${errors.checkOut ? 'is-invalid' : ''}`}
                min={formData.checkIn || today}
                required
              />
              {errors.checkOut && <div className="invalid-feedback">{errors.checkOut}</div>}
            </div>

            <div className="form-group" style={{ minWidth: '180px' }}>
              <label htmlFor="numberOfGuest" className="form-label">Người lớn 👨</label>
              <input
                style={{
                  backgroundColor: 'transparent',
                  color: '#fff',
                  fontSize: '16px',
                  height: '42px'
                }}
                type="number"
                id="numberOfGuest"
                name="numberOfGuest"
                value={formData.numberOfGuest}
                onChange={handleChange}
                className={`form-control ${errors.numberOfGuest ? 'is-invalid' : ''}`}
                min="1"
                max="10"
                required
              />
              {errors.numberOfGuest && <div className="invalid-feedback">{errors.numberOfGuest}</div>}
            </div>

            <div className="form-group" style={{ minWidth: '160px' }}>
              <label className="form-label" style={{ visibility: 'hidden' }}>Tìm Phòng</label>
              <button
                type="submit"
                className="btn btn-primary w-100"
                style={{ backgroundColor: '#FF0000', borderColor: '#FF0000', fontSize: '14px', padding: '10px', textAlign: 'center' }}
              >
                Tìm Phòng
              </button>
            </div>

          </div>

          {success && (
            <div className="alert alert-success mt-3 text-center" role="alert" style={{ fontSize: '14px', color: '#00FFFF', padding: '8px' }}>
              Đặt phòng thành công!
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default CheckinForm;
