import React, { useState, useEffect } from 'react';
import styles from './BookingForm.module.css';

const BookingForm = () => {
  const [formData, setFormData] = useState({
    roomType: '',
    numberOfRooms: 1,
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    customerName: '',
    phoneNumber: '',
    email: '',
    selectedServices: [], // Thêm dịch vụ đã chọn
    specialRequests: ''
  });

  // Danh sách dịch vụ mẫu (sau này có thể fetch từ API)
  const [availableServices, setAvailableServices] = useState([
    { id: 1, name: 'Spa & Massage', price: 500000, description: 'Dịch vụ spa và massage thư giãn' },
    { id: 2, name: 'Ăn sáng buffet', price: 200000, description: 'Buffet sáng đa dạng món Á - Âu' },
    { id: 3, name: 'Đưa đón sân bay', price: 300000, description: 'Dịch vụ đưa đón sân bay 24/7' },
    { id: 4, name: 'Thuê xe máy', price: 150000, description: 'Thuê xe máy theo ngày' },
    { id: 5, name: 'Tour du lịch', price: 800000, description: 'Tour tham quan các điểm du lịch nổi tiếng' },
    { id: 6, name: 'Giặt ủi', price: 100000, description: 'Dịch vụ giặt ủi quần áo' },
    { id: 7, name: 'Minibar', price: 50000, description: 'Minibar đầy đủ đồ uống và snack' },
    { id: 8, name: 'Late check-out', price: 200000, description: 'Trả phòng muộn đến 18:00' }
  ]);

  // useEffect để fetch dịch vụ từ API (tùy chọn)
  useEffect(() => {
    // Có thể fetch từ API thực tế
    // fetchServicesFromAPI();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Xử lý chọn/bỏ chọn dịch vụ
  const handleServiceToggle = (serviceId) => {
    setFormData(prevState => {
      const isSelected = prevState.selectedServices.includes(serviceId);
      const newSelectedServices = isSelected
        ? prevState.selectedServices.filter(id => id !== serviceId)
        : [...prevState.selectedServices, serviceId];
      
      return {
        ...prevState,
        selectedServices: newSelectedServices
      };
    });
  };

  // Tính tổng tiền dịch vụ
  const calculateServiceTotal = () => {
    return formData.selectedServices.reduce((total, serviceId) => {
      const service = availableServices.find(s => s.id === serviceId);
      return total + (service ? service.price : 0);
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Tạo object chi tiết cho dịch vụ đã chọn
    const selectedServicesDetails = formData.selectedServices.map(serviceId => {
      return availableServices.find(s => s.id === serviceId);
    });
    
    const bookingData = {
      ...formData,
      selectedServicesDetails,
      serviceTotal: calculateServiceTotal()
    };
    
    console.log('Form submitted:', bookingData);
  };

  return (
    <div className={styles.bookingFormContainer}>
      <h2 className={styles.formTitle}>Đặt phòng</h2>
      <form onSubmit={handleSubmit} className={styles.bookingForm}>
        <div className={styles.formGrid}>
          {/* Thông tin phòng */}
          <div className={styles.formSection}>
            <h3>Thông tin đặt phòng</h3>
            <div className={styles.field}>
              <label htmlFor="roomType">Loại phòng</label>
              <select
                id="roomType"
                name="roomType"
                value={formData.roomType}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn loại phòng</option>
                <option value="single">Phòng đơn</option>
                <option value="double">Phòng đôi</option>
                <option value="family">Phòng gia đình</option>
                <option value="luxury">Phòng VIP</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="numberOfRooms">Số lượng phòng</label>
              <input
                type="number"
                id="numberOfRooms"
                name="numberOfRooms"
                min="1"
                value={formData.numberOfRooms}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="numberOfGuests">Số người</label>
              <input
                type="number"
                id="numberOfGuests"
                name="numberOfGuests"
                min="1"
                value={formData.numberOfGuests}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Thời gian */}
          <div className={styles.formSection}>
            <h3>Thời gian</h3>
            <div className={styles.field}>
              <label htmlFor="checkIn">Ngày nhận phòng</label>
              <input
                type="datetime-local"
                id="checkIn"
                name="checkIn"
                value={formData.checkIn}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="checkOut">Ngày trả phòng</label>
              <input
                type="datetime-local"
                id="checkOut"
                name="checkOut"
                value={formData.checkOut}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Thông tin khách hàng */}
          <div className={styles.formSection}>
            <h3>Thông tin cá nhân</h3>
            <div className={styles.field}>
              <label htmlFor="customerName">Họ và tên</label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="phoneNumber">Số điện thoại</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                required
              />
            </div>


          </div>

          {/* Dịch vụ - THÊM MỚI */}
          <div className={styles.formSection}>
            <h3>Dịch vụ khách sạn</h3>
            <div className={styles.field}>
              <label>Chọn dịch vụ bổ sung (tùy chọn)</label>
              <div className={styles.servicesContainer}>
                {availableServices.map(service => (
                  <div key={service.id} className={styles.serviceItem}>
                    <label className={styles.serviceLabel}>
                      <input
                        type="checkbox"
                        checked={formData.selectedServices.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className={styles.serviceCheckbox}
                      />
                      <div className={styles.serviceDetails}>
                        <div className={styles.serviceName}>
                          <strong>{service.name}</strong>
                          <span className={styles.servicePrice}>
                            {service.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <div className={styles.serviceDescription}>
                          {service.description}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              {/* Tổng tiền dịch vụ */}
              {formData.selectedServices.length > 0 && (
                <div className={styles.serviceTotal}>
                  <strong>
                    Tổng tiền dịch vụ: {calculateServiceTotal().toLocaleString('vi-VN')}đ
                    <span className={styles.serviceCount}>
                      ({formData.selectedServices.length} dịch vụ đã chọn)
                    </span>
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Yêu cầu đặc biệt */}
          <div className={styles.formSection}>
            <h3>Yêu cầu thêm</h3>
            <div className={styles.field}>
              <label htmlFor="specialRequests">Yêu cầu đặc biệt</label>
              <textarea
                id="specialRequests"
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                rows="4"
                placeholder="Nhập yêu cầu đặc biệt của bạn..."
              />
            </div>
          </div>
        </div>

        <div className={styles.submitSection}>
          <button type="submit" className={styles.submitButton}>
            Đặt phòng
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;