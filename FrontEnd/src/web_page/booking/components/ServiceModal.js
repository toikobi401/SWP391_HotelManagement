import React from 'react';
import styles from '../BookingForm.module.css';

const ServiceModal = ({
  showServiceModal,
  setShowServiceModal,
  serviceState,
  selectedServices,
  handleServiceToggle,
  calculateServiceTotal
}) => {
  const {
    servicesLoading,
    servicesError,
    serviceCategories,
    activeCategory,
    setActiveCategory,
    servicesView,
    setServicesView,
    serviceSearch,
    setServiceSearch,
    getFilteredServices
  } = serviceState;

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} phút`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}p` : `${hours} giờ`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} ngày`;
    }
  };

  if (!showServiceModal) return null;

  return (
    <div className={styles.serviceModal} onClick={() => setShowServiceModal(false)}>
      <div className={styles.serviceModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.serviceModalHeader}>
          <h4>Chọn dịch vụ</h4>
          <button
            type="button"
            className={styles.serviceModalClose}
            onClick={() => setShowServiceModal(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.serviceModalBody}>
          {/* Service Controls */}
          <div className={styles.serviceModalControls}>
            <div className={styles.serviceSearch}>
              <div className={styles.searchInputGroup}>
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Tìm kiếm dịch vụ..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewButton} ${servicesView === 'grid' ? styles.active : ''}`}
                onClick={() => setServicesView('grid')}
              >
                <i className="fas fa-th"></i>
              </button>
              <button
                type="button"
                className={`${styles.viewButton} ${servicesView === 'list' ? styles.active : ''}`}
                onClick={() => setServicesView('list')}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
          </div>
          {/* Category Dropdown */}
          <div className={styles.categoryDropdownWrapper}>
            <select
              className={styles.categoryDropdown}
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
            >
              {serviceCategories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Tất cả' : category}
                  {category !== 'all'
                    ? ` (${getFilteredServices().filter(s => s.category === category).length})`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          {/* Category Tabs */}
          {/* <div className={styles.categoryTabs}>
            {serviceCategories.map(category => (
              <button
                key={category}
                type="button"
                className={`${styles.categoryTab} ${activeCategory === category ? styles.active : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category === 'all' ? 'Tất cả' : category}
                {category !== 'all' && (
                  <span className={styles.categoryCount}>
                    ({getFilteredServices().filter(s => s.category === category).length})
                  </span>
                )}
              </button>
            ))}
          </div> */}

          {/* Services Loading */}
          {servicesLoading ? (
            <div className={styles.servicesLoading}>
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Đang tải dịch vụ...</span>
              </div>
              <p>Đang tải danh sách dịch vụ...</p>
            </div>
          ) : servicesError ? (
            <div className={styles.servicesError}>
              <i className="fas fa-exclamation-triangle"></i>
              <p>{servicesError}</p>
              <small>Đang sử dụng dữ liệu dự phòng.</small>
            </div>
          ) : (
            <div className={`${styles.servicesGrid} ${servicesView === 'list' ? styles.listView : ''}`}>
              {getFilteredServices().length === 0 ? (
                <div className={styles.noServicesFound}>
                  <i className="fas fa-search"></i>
                  <p>Không tìm thấy dịch vụ nào phù hợp.</p>
                </div>
              ) : (
                getFilteredServices().map(service => (
                  <div 
                    key={service.id} 
                    className={`${styles.serviceCard} ${selectedServices.includes(service.id) ? styles.selected : ''}`}
                    onClick={() => handleServiceToggle(service.id)}
                  >
                    <div className={styles.serviceCardHeader}>
                      <div className={styles.serviceCardTitle}>
                        <h5>{service.name}</h5>
                        <div className={styles.serviceCardBadge}>
                          {service.category}
                        </div>
                      </div>
                      <div className={styles.serviceCardCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service.id)}
                          onChange={() => handleServiceToggle(service.id)}
                        />
                      </div>
                    </div>

                    <div className={styles.serviceCardBody}>
                      <p className={styles.serviceDescription}>
                        {service.description}
                      </p>
                      
                      <div className={styles.serviceCardMeta}>
                        <div className={styles.serviceMeta}>
                          <i className="fas fa-clock"></i>
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                        <div className={styles.serviceMeta}>
                          <i className="fas fa-users"></i>
                          <span>Tối đa {service.maxCapacity} người</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.serviceCardFooter}>
                      <div className={styles.servicePrice}>
                        <strong>{service.price.toLocaleString('vi-VN')}đ</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className={styles.serviceModalFooter}>
          <div className={styles.modalFooterInfo}>
            <span>Đã chọn {selectedServices.length} dịch vụ</span>
            {selectedServices.length > 0 && (
              <strong>Tổng: {calculateServiceTotal().toLocaleString('vi-VN')}đ</strong>
            )}
          </div>
          <button
            type="button"
            className={styles.confirmSelectionButton}
            onClick={() => setShowServiceModal(false)}
          >
            Xác nhận ({selectedServices.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;