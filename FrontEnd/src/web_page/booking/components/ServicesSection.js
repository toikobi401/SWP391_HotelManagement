import React from 'react';
import styles from '../BookingForm.module.css';

const ServicesSection = ({
  selectedServices,
  availableServices,
  servicesLoading,
  setShowServiceModal,
  handleServiceToggle
}) => {
  const getSelectedServicesDetails = () => {
    return selectedServices.map(serviceId => {
      const service = availableServices.find(s => s.id === serviceId);
      return service || null;
    }).filter(Boolean);
  };

  return (
    <div className={`${styles.formSection} ${styles.servicesSection}`}>
      <div className={styles.servicesSectionHeader}>
        <h3><i className="fas fa-concierge-bell"></i> Dịch vụ khách sạn</h3>
        <div className={styles.servicesControls}>
          <button
            type="button"
            className={styles.servicesExpandButton}
            onClick={() => setShowServiceModal(true)}
            disabled={servicesLoading}
          >
            <i className="fas fa-plus-circle"></i>
            Chọn dịch vụ
            {selectedServices.length > 0 && (
              <span className={styles.selectedBadge}>
                {selectedServices.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <div className={styles.selectedServicesSummary}>
          <h6><i className="fas fa-check-circle"></i> Dịch vụ đã chọn ({selectedServices.length}):</h6>
          <div className={styles.selectedServicesList}>
            {getSelectedServicesDetails().map(service => (
              <div key={service.id} className={styles.selectedServiceItem}>
                <div className={styles.selectedServiceInfo}>
                  <span className={styles.selectedServiceName}>{service.name}</span>
                  <span className={styles.selectedServicePrice}>
                    {service.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.removeServiceButton}
                  onClick={() => handleServiceToggle(service.id)}
                  title="Bỏ chọn dịch vụ"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedServices.length === 0 && !servicesLoading && (
        <div className={styles.noServicesSelected}>
          <i className="fas fa-info-circle"></i>
          <span>Chưa chọn dịch vụ nào. Nhấn "Chọn dịch vụ" để xem danh sách.</span>
        </div>
      )}
    </div>
  );
};

export default ServicesSection;