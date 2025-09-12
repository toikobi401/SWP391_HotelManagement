import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Alert, Row, Col, FormGroup, FormLabel } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ServiceModal from './ServiceModal';
import ServiceUsageModal from './ServiceUsageModal';
import styles from './ServiceList.module.css';

// ✅ XÓA: Mock data - sẽ lấy từ API
// const mockServices = [...];

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

function ServiceList() {
  // ✅ GIỮ NGUYÊN: Existing state variables
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceSort, setPriceSort] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ GIỮ NGUYÊN: Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedService, setSelectedService] = useState(null);

  // ✅ GIỮ NGUYÊN: Bulk operations
  const [selectedServices, setSelectedServices] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // ✅ GIỮ NGUYÊN: Usage modal
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedServiceForUsage, setSelectedServiceForUsage] = useState(null);

  // ✅ ENHANCED: Pagination với page size options
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // ✅ THÊM: Page size options
  const pageSizeOptions = [5, 10, 15, 20];

  // ✅ GIỮ NGUYÊN: useEffect cho loading services
  useEffect(() => {
    loadServices();
  }, [pagination.currentPage, pagination.pageSize, searchTerm, categoryFilter]);

  // ✅ GIỮ NGUYÊN: loadServices function
  const loadServices = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: pagination.pageSize,
        search: searchTerm,
        category: categoryFilter,
        sortBy: 'ServiceName',
        sortOrder: 'asc'
      });

      console.log('🔍 Fetching services with params:', params.toString());

      const response = await fetch(`http://localhost:3000/api/services?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Services data received:', data);

      if (data.success && Array.isArray(data.data)) {
        setServices(data.data);
        
        // ✅ ENHANCED: Update pagination với full info từ API
        if (data.meta && data.meta.pagination) {
          setPagination(prev => ({
            ...prev,
            totalCount: data.meta.pagination.totalCount,
            totalPages: data.meta.pagination.totalPages,
            currentPage: data.meta.pagination.currentPage,
            hasNext: data.meta.pagination.hasNext,
            hasPrev: data.meta.pagination.hasPrev
          }));
        }

        console.log(`✅ Loaded ${data.data.length} services from API`);
      } else {
        throw new Error('Invalid response format from server');
      }

    } catch (err) {
      console.error('❌ Error loading services:', err);
      setError(`Lỗi khi tải danh sách dịch vụ: ${err.message}`);
      setServices([]);
      toast.error('Không thể tải danh sách dịch vụ từ server');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle add service
  const handleAddService = () => {
    setSelectedService(null);
    setModalMode('add');
    setShowModal(true);
  };

  // ✅ Handle edit service
  const handleEditService = (service) => {
    setSelectedService(service);
    setModalMode('edit');
    setShowModal(true);
  };

  // ✅ SỬA: Handle save service với API call
  const handleSaveService = async (serviceData, mode) => {
    try {
      console.log(`💾 ${mode === 'add' ? 'Creating' : 'Updating'} service:`, serviceData);

      const url = mode === 'add' 
        ? 'http://localhost:3000/api/services'
        : `http://localhost:3000/api/services/${serviceData.ServiceID}`;
      
      const method = mode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method: method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serviceData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || `${mode === 'add' ? 'Thêm' : 'Cập nhật'} dịch vụ thành công!`);
        setShowModal(false);
        await loadServices(); // Reload services
      } else {
        throw new Error(result.message || `Lỗi khi ${mode === 'add' ? 'thêm' : 'cập nhật'} dịch vụ`);
      }
      
    } catch (err) {
      console.error(`❌ Error ${mode}ing service:`, err);
      toast.error(err.message);
    }
  };

  // ✅ SỬA: Handle delete service với API call
  const handleDeleteService = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) return;

    try {
      console.log('🗑️ Deleting service:', id);

      const response = await fetch(`http://localhost:3000/api/services/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Xóa dịch vụ thành công!');
        await loadServices(); // Reload services
      } else {
        throw new Error(result.message || 'Lỗi khi xóa dịch vụ');
      }

    } catch (err) {
      console.error('❌ Error deleting service:', err);
      toast.error(err.message);
    }
  };

  // ✅ Handle show usage modal
  const handleShowUsage = (service) => {
    setSelectedServiceForUsage(service);
    setShowUsageModal(true);
  };

  // Filter and sort services (client-side for additional filtering)
  const filteredServices = services
    .filter((s) => 
      (!priceSort || true) && // Price sorting handled by server
      (!dateFilter || new Date(s.CreateAt).toLocaleDateString() === new Date(dateFilter).toLocaleDateString())
    )
    .sort((a, b) => {
      if (priceSort === 'asc') return a.Price - b.Price;
      if (priceSort === 'desc') return b.Price - a.Price;
      return 0;
    });

  // Handle select service
  const handleSelectService = (serviceId, isSelected) => {
    setSelectedServices(prev => {
      if (isSelected) {
        return [...prev, serviceId];
      } else {
        return prev.filter(id => id !== serviceId);
      }
    });
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedServices(filteredServices.map(s => s.ServiceID));
    } else {
      setSelectedServices([]);
    }
  };

  // ✅ SỬA: Handle bulk actions với API calls
  const handleBulkAction = async (action, data = null) => {
    if (selectedServices.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một dịch vụ');
      return;
    }

    const confirmMessage = {
      activate: `Kích hoạt ${selectedServices.length} dịch vụ?`,
      deactivate: `Vô hiệu hóa ${selectedServices.length} dịch vụ?`,
      delete: `Xóa ${selectedServices.length} dịch vụ? Hành động này không thể hoàn tác!`,
      updateCategory: `Cập nhật danh mục cho ${selectedServices.length} dịch vụ?`
    };

    if (!window.confirm(confirmMessage[action])) return;

    setBulkLoading(true);
    try {
      console.log(`🔄 Bulk ${action} for services:`, selectedServices);

      const response = await fetch('http://localhost:3000/api/services/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          serviceIds: selectedServices,
          data
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        await loadServices();
        setSelectedServices([]);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('❌ Bulk action error:', error);
      toast.error('Lỗi khi thực hiện thao tác hàng loạt');
    } finally {
      setBulkLoading(false);
    }
  };

  // ✅ ENHANCED: Handle page change
  const handlePageChange = (newPage) => {
    if (loading) return;
    
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: newPage
      }));
    }
  };

  // ✅ ENHANCED: Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    if (loading) return;
    
    const validPageSize = parseInt(newPageSize);
    if (pageSizeOptions.includes(validPageSize)) {
      setPagination(prev => ({
        ...prev,
        pageSize: validPageSize,
        currentPage: 1 // Reset to first page when changing page size
      }));
    }
  };

  // ✅ THÊM: Go to first page
  const goToFirstPage = () => {
    handlePageChange(1);
  };

  // ✅ THÊM: Go to last page
  const goToLastPage = () => {
    handlePageChange(pagination.totalPages);
  };

  // ✅ THÊM: Get pagination range for display
  const getPaginationRange = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, pagination.currentPage - delta); 
         i <= Math.min(pagination.totalPages - 1, pagination.currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (pagination.currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (pagination.currentPage + delta < pagination.totalPages - 1) {
      rangeWithDots.push('...', pagination.totalPages);
    } else {
      rangeWithDots.push(pagination.totalPages);
    }

    return rangeWithDots;
  };

  // ✅ GIỮ NGUYÊN: Search handling with debounce
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, categoryFilter]);

  return (
    <div className={styles.container}>
      {/* ✅ GIỮ NGUYÊN: Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h2 className={styles.pageTitle}>
              <i className="fas fa-concierge-bell me-3"></i>
              Quản lý dịch vụ
            </h2>
            <p className={styles.pageSubtitle}>
              Quản lý tất cả dịch vụ của khách sạn
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button 
              variant="primary" 
              onClick={handleAddService}
              className={styles.addBtn}
              disabled={loading}
            >
              <i className="fas fa-plus me-2"></i>
              Thêm dịch vụ mới
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ GIỮ NGUYÊN: Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* ✅ GIỮ NGUYÊN: Filters Card */}
      <div className={styles.filtersCard}>
        <Row className="g-3">
          <Col md={3}>
            <FormGroup>
              <FormLabel className={styles.filterLabel}>
                <i className="fas fa-search me-2"></i>
                Tìm kiếm theo tên
              </FormLabel>
              <Form.Control
                type="text"
                placeholder="Nhập tên dịch vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.filterInput}
                disabled={loading}
              />
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <FormLabel className={styles.filterLabel}>
                <i className="fas fa-tags me-2"></i>
                Danh mục
              </FormLabel>
              <Form.Select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={styles.filterInput}
                disabled={loading}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Form.Select>
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <FormLabel className={styles.filterLabel}>
                <i className="fas fa-sort-amount-down me-2"></i>
                Sắp xếp theo giá
              </FormLabel>
              <Form.Select 
                value={priceSort} 
                onChange={(e) => setPriceSort(e.target.value)}
                className={styles.filterInput}
                disabled={loading}
              >
                <option value="">Mặc định</option>
                <option value="asc">Thấp đến cao</option>
                <option value="desc">Cao đến thấp</option>
              </Form.Select>
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <FormLabel className={styles.filterLabel}>
                <i className="fas fa-calendar me-2"></i>
                Ngày tạo
              </FormLabel>
              <Form.Control
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={styles.filterInput}
                disabled={loading}
              />
            </FormGroup>
          </Col>
        </Row>
      </div>

      {/* Bulk Actions */}
      {selectedServices.length > 0 && (
        <div className={styles.bulkActions}>
          <div className={styles.bulkInfo}>
            <span>Đã chọn {selectedServices.length} dịch vụ</span>
            <button 
              className="btn btn-link p-0"
              onClick={() => setSelectedServices([])}
              disabled={bulkLoading}
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <div className={styles.bulkButtons}>
            <button 
              className="btn btn-success btn-sm"
              onClick={() => handleBulkAction('activate')}
              disabled={bulkLoading}
            >
              <i className="fas fa-check"></i> Kích hoạt
            </button>
            <button 
              className="btn btn-warning btn-sm"
              onClick={() => handleBulkAction('deactivate')}
              disabled={bulkLoading}
            >
              <i className="fas fa-pause"></i> Vô hiệu hóa
            </button>
            <div className="dropdown">
              <button 
                className="btn btn-info btn-sm dropdown-toggle"
                data-bs-toggle="dropdown"
                disabled={bulkLoading}
              >
                <i className="fas fa-edit"></i> Cập nhật danh mục
              </button>
              <ul className="dropdown-menu">
                {categories.map(category => (
                  <li key={category}>
                    <button 
                      className="dropdown-item"
                      onClick={() => handleBulkAction('updateCategory', { category })}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => handleBulkAction('delete')}
              disabled={bulkLoading}
            >
              <i className="fas fa-trash"></i> Xóa
            </button>
          </div>
        </div>
      )}

      {/* ✅ ENHANCED: Table Card với Pagination Info */}
      <div className={styles.tableCard}>
        {/* ✅ THÊM: Table Header với Pagination Info */}
        <div className={styles.tableHeader}>
          <div className={styles.tableHeaderLeft}>
            <h3 className={styles.tableTitle}>
              <i className="fas fa-list me-2"></i>
              Danh sách dịch vụ
            </h3>
            {pagination.totalCount > 0 && (
              <span className={styles.tableSubtitle}>
                Hiển thị {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} 
                {' '}trong số {pagination.totalCount} dịch vụ
              </span>
            )}
          </div>
          
          {/* ✅ THÊM: Page Size Selector */}
          <div className={styles.tableHeaderRight}>
            <div className={styles.pageSizeSelector}>
              <label htmlFor="pageSize">Hiển thị:</label>
              <select
                id="pageSize"
                value={pagination.pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className={styles.pageSizeSelect}
                disabled={loading}
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>
                    {size} mục
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <div className="spinner-border text-primary me-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span>Đang tải danh sách dịch vụ...</span>
          </div>
        ) : (
          <>
            {/* ✅ GIỮ NGUYÊN: Table content */}
            <Table striped bordered hover responsive className={styles.servicesTable}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th>
                    <Form.Check 
                      type="checkbox"
                      checked={selectedServices.length === filteredServices.length && selectedServices.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className={styles.selectAllCheckbox}
                      disabled={loading}
                    />
                  </th>
                  <th>ID</th>
                  <th>Tên dịch vụ</th>
                  <th>Danh mục</th>
                  <th>Giá (VND)</th>
                  <th>Thời gian</th>
                  <th>Sức chứa</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => (
                  <tr key={service.ServiceID} className={styles.tableRow}>
                    <td>
                      <Form.Check 
                        type="checkbox"
                        checked={selectedServices.includes(service.ServiceID)}
                        onChange={(e) => handleSelectService(service.ServiceID, e.target.checked)}
                        className={styles.serviceCheckbox}
                        disabled={loading}
                      />
                    </td>
                    <td className={styles.serviceId}>#{service.ServiceID}</td>
                    <td className={styles.serviceName}>
                      <div>
                        <strong>{service.ServiceName}</strong>
                        <small className="text-muted d-block">
                          {service.Description.length > 50 
                            ? `${service.Description.substring(0, 50)}...`
                            : service.Description
                          }
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {service.Category}
                      </span>
                    </td>
                    <td className={styles.servicePrice}>
                      {service.Price.toLocaleString('vi-VN')} VND
                    </td>
                    <td>{service.Duration} phút</td>
                    <td>{service.MaxCapacity} người</td>
                    <td>{new Date(service.CreateAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${service.IsActive ? styles.active : styles.inactive}`}>
                        <i className={`fas ${service.IsActive ? 'fa-check-circle' : 'fa-times-circle'} me-1`}></i>
                        {service.IsActive ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEditService(service)}
                          className={styles.editBtn}
                          title="Chỉnh sửa"
                        >
                          <i className="fas fa-edit"></i>
                        </Button>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleShowUsage(service)}
                          className={styles.usageBtn}
                          title="Xem thông tin sử dụng"
                        >
                          <i className="fas fa-chart-line"></i>
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDeleteService(service.ServiceID)}
                          className={styles.deleteBtn}
                          title="Xóa"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* ✅ ENHANCED: Pagination Component */}
            {pagination.totalPages > 1 && (
              <div className={styles.paginationContainer}>
                <div className={styles.paginationInfo}>
                  <span className={styles.paginationText}>
                    <i className="fas fa-info-circle me-2"></i>
                    Trang {pagination.currentPage} / {pagination.totalPages}
                  </span>
                </div>
                
                <div className={styles.paginationControls}>
                  {/* First Page */}
                  <button
                    className={`${styles.paginationBtn} ${!pagination.hasPrev ? styles.disabled : ''}`}
                    onClick={goToFirstPage}
                    disabled={!pagination.hasPrev || loading}
                    title="Trang đầu"
                  >
                    <i className="fas fa-angle-double-left"></i>
                  </button>

                  {/* Previous Page */}
                  <button
                    className={`${styles.paginationBtn} ${!pagination.hasPrev ? styles.disabled : ''}`}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev || loading}
                    title="Trang trước"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  {/* Page Numbers với Smart Pagination */}
                  {pagination.totalPages <= 7 ? (
                    // Show all pages if total pages <= 7
                    [...Array(pagination.totalPages)].map((_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={page}
                          className={`${styles.paginationBtn} ${pagination.currentPage === page ? styles.activePage : ''}`}
                          onClick={() => handlePageChange(page)}
                          disabled={loading}
                        >
                          {page}
                        </button>
                      );
                    })
                  ) : (
                    // Smart pagination for many pages
                    getPaginationRange().map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`dots-${index}`} className={styles.paginationDots}>
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          className={`${styles.paginationBtn} ${pagination.currentPage === page ? styles.activePage : ''}`}
                          onClick={() => handlePageChange(page)}
                          disabled={loading}
                        >
                          {page}
                        </button>
                      );
                    })
                  )}
                  
                  {/* Next Page */}
                  <button
                    className={`${styles.paginationBtn} ${!pagination.hasNext ? styles.disabled : ''}`}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext || loading}
                    title="Trang sau"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>

                  {/* Last Page */}
                  <button
                    className={`${styles.paginationBtn} ${!pagination.hasNext ? styles.disabled : ''}`}
                    onClick={goToLastPage}
                    disabled={!pagination.hasNext || loading}
                    title="Trang cuối"
                  >
                    <i className="fas fa-angle-double-right"></i>
                  </button>
                </div>

                {/* ✅ THÊM: Quick Jump */}
                <div className={styles.quickJump}>
                  <span>Đi đến trang:</span>
                  <input
                    type="number"
                    min="1"
                    max={pagination.totalPages}
                    value={pagination.currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= pagination.totalPages) {
                        handlePageChange(page);
                      }
                    }}
                    className={styles.quickJumpInput}
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ✅ GIỮ NGUYÊN: Empty State */}
        {!loading && services.length === 0 && (
          <div className={styles.emptyState}>
            <i className="fas fa-concierge-bell"></i>
            <h5>Không có dịch vụ nào</h5>
            <p>Không tìm thấy dịch vụ nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        )}
      </div>

      {/* ✅ GIỮ NGUYÊN: Modals */}
      <ServiceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        serviceData={selectedService}
        onSave={handleSaveService}
        mode={modalMode}
      />

      <ServiceUsageModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        serviceId={selectedServiceForUsage?.ServiceID}
        serviceName={selectedServiceForUsage?.ServiceName}
      />
    </div>
  );
}

export default ServiceList;