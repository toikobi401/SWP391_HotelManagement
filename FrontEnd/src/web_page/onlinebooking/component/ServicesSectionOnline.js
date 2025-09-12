import React, { useState } from 'react';
import styles from './ServicesSectionOnline.module.css';
import { useServicesOnline } from '../hooks/useServicesOnline';

const ServicesSectionOnline = ({ 
  selectedServices, 
  setSelectedServices, 
  nextStep, 
  prevStep, 
  availableServices = [], // ✅ THÊM: Nhận từ parent
  servicesLoading = false,
  servicesError = ''
}) => {
  const [showServiceModal, setShowServiceModal] = useState(false);

  // ✅ SỬA: Sử dụng services từ parent nếu có, fallback về hook
  const serviceStateFromHook = useServicesOnline();
  
  // ✅ Ưu tiên sử dụng data từ parent, fallback về hook
  const serviceState = {
    availableServices: availableServices.length > 0 ? availableServices : serviceStateFromHook.availableServices,
    servicesLoading: servicesLoading || serviceStateFromHook.servicesLoading,
    servicesError: servicesError || serviceStateFromHook.servicesError,
    serviceCategories: serviceStateFromHook.serviceCategories,
    activeCategory: serviceStateFromHook.activeCategory,
    setActiveCategory: serviceStateFromHook.setActiveCategory,
    servicesView: serviceStateFromHook.servicesView,
    setServicesView: serviceStateFromHook.setServicesView,
    serviceSearch: serviceStateFromHook.serviceSearch,
    setServiceSearch: serviceStateFromHook.setServiceSearch,
    getFilteredServices: serviceStateFromHook.getFilteredServices,
    calculateServiceTotal: serviceStateFromHook.calculateServiceTotal
  };

  const {
    availableServices: effectiveAvailableServices,
    servicesLoading: effectiveServicesLoading,
    servicesError: effectiveServicesError,
    serviceCategories,
    activeCategory,
    setActiveCategory,
    servicesView,
    setServicesView,
    serviceSearch,
    setServiceSearch,
    getFilteredServices,
    calculateServiceTotal
  } = serviceState;

  const handleServiceToggle = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        console.log(`➖ Removed service: ${serviceId}`);
        return prev.filter(id => id !== serviceId);
      } else {
        console.log(`➕ Added service: ${serviceId}`);
        return [...prev, serviceId];
      }
    });
  };

  const getSelectedServicesDetails = () => {
    return selectedServices.map(serviceId => {
      const service = effectiveAvailableServices.find(s => s.id === serviceId);
      return service || null;
    }).filter(Boolean);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} phút`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}phút` : `${hours} giờ`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} ngày`;
    }
  };

  // ✅ SỬA: Tính tổng từ database services
  const totalServiceCost = calculateServiceTotal(selectedServices);

  console.log('🛎️ ServicesSectionOnline state:', {
    selectedServices: selectedServices.length,
    availableServices: effectiveAvailableServices.length,
    totalCost: totalServiceCost,
    servicesLoading: effectiveServicesLoading,
    servicesError: effectiveServicesError
  });

  return (
    <div className={styles.servicesSection}>
      <h2 className={styles.title}>Chọn dịch vụ bổ sung</h2>
      
      {/* Services Section Header */}
      <div className={styles.servicesSectionHeader}>
        <div className={styles.servicesSummary}>
          <span>Đã chọn {selectedServices.length} dịch vụ</span>
          {totalServiceCost > 0 && (
            <span className={styles.totalCost}>
              Tổng: {totalServiceCost.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.servicesExpandButton}
          onClick={() => setShowServiceModal(true)}
          disabled={effectiveServicesLoading}
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

      {/* Selected Services List */}
      {selectedServices.length > 0 && (
        <div className={styles.selectedServicesList}>
          <h6>
            <i className="fas fa-check-circle"></i>
            Dịch vụ đã chọn ({selectedServices.length}):
          </h6>
          <div className={styles.selectedItems}>
            {getSelectedServicesDetails().map(service => (
              <div key={service.id} className={styles.selectedServiceItem}>
                <div className={styles.serviceInfo}>
                  <span className={styles.serviceName}>{service.name}</span>
                  <span className={styles.servicePrice}>
                    {service.price.toLocaleString('vi-VN')}đ
                  </span>
                  {service.duration > 0 && (
                    <span className={styles.serviceDuration}>
                      Thời gian: {formatDuration(service.duration)}
                    </span>
                  )}
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

      {/* No Services Selected */}
      {selectedServices.length === 0 && !effectiveServicesLoading && (
        <div className={styles.noServicesSelected}>
          <i className="fas fa-info-circle"></i>
          <span>Chưa chọn dịch vụ nào. Nhấn "Chọn dịch vụ" để xem danh sách.</span>
        </div>
      )}

      {/* Loading State */}
      {effectiveServicesLoading && (
        <div className={styles.loadingState}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Đang tải dịch vụ...</span>
          </div>
          <p>Đang tải dịch vụ từ database...</p>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className={styles.serviceModal} onClick={() => setShowServiceModal(false)}>
          <div className={styles.serviceModalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.serviceModalHeader}>
              <h4>
                <i className="fas fa-concierge-bell me-2"></i>
                Chọn dịch vụ
              </h4>
              <button
                type="button"
                className={styles.serviceModalClose}
                onClick={() => setShowServiceModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
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

              {/* Category Filter */}
              {serviceCategories.length > 0 && (
                <div className={styles.categoryDropdownWrapper}>
                  <select
                    className={styles.categoryDropdown}
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                  >
                    {serviceCategories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'Tất cả dịch vụ' : category}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Services Grid */}
              {effectiveServicesLoading ? (
                <div className={styles.servicesLoading}>
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                  <p>Đang tải danh sách dịch vụ...</p>
                </div>
              ) : effectiveServicesError ? (
                <div className={styles.servicesError}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>{effectiveServicesError}</p>
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
                            {service.duration > 0 && (
                              <div className={styles.serviceMeta}>
                                <i className="fas fa-clock"></i>
                                <span>{formatDuration(service.duration)}</span>
                              </div>
                            )}
                            {service.maxCapacity > 0 && (
                              <div className={styles.serviceMeta}>
                                <i className="fas fa-users"></i>
                                <span>Tối đa {service.maxCapacity} người</span>
                              </div>
                            )}
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

            {/* Modal Footer */}
            <div className={styles.serviceModalFooter}>
              <div className={styles.modalFooterInfo}>
                <span>Đã chọn {selectedServices.length} dịch vụ</span>
                {totalServiceCost > 0 && (
                  <strong>Tổng: {totalServiceCost.toLocaleString('vi-VN')}đ</strong>
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
      )}

      {/* Navigation Actions */}
      <div className={styles.formActions}>
        <button 
          className={styles.btnBack} 
          onClick={prevStep}
        >
          <i className="fas fa-arrow-left"></i>
          Quay lại
        </button>
        <button 
          className={styles.btnNext} 
          onClick={nextStep}
        >
          Tiếp tục
          <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
};

export default ServicesSectionOnline;