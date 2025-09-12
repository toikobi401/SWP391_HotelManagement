// PromotionList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import EditPromotionModal from './EditPromotionModal';
// ✅ XÓA: DeletePromotionModal import
import './PromotionList.css';

function PromotionList() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: '',
    discount: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  
  // Modal states - ✅ XÓA: deleteModalOpen và selectedPromotion states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState(null);

  // Status options
  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'Active', label: 'Hoạt động', color: 'success' },
    { value: 'Inactive', label: 'Không hoạt động', color: 'secondary' },
    { value: 'Draft', label: 'Bản nháp', color: 'warning' },
    { value: 'Expired', label: 'Hết hạn', color: 'danger' },
    { value: 'Suspended', label: 'Tạm ngưng', color: 'info' }
  ];

  // Fetch promotions from API
  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching promotions from API...');
      
      const response = await fetch('http://localhost:3000/api/promotions', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Promotions fetched:', result);
        
        if (result.success && Array.isArray(result.data)) {
          setPromotions(result.data);
        } else {
          throw new Error(result.message || 'Invalid response format');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching promotions:', error);
      toast.error('Lỗi khi tải danh sách khuyến mãi: ' + error.message);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit promotion
  const handleEditPromotion = (promotionId) => {
    console.log('🔍 Opening edit modal for promotion:', promotionId);
    setSelectedPromotionId(promotionId);
    setEditModalOpen(true);
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    console.log('🔒 Closing edit modal');
    setEditModalOpen(false);
    setSelectedPromotionId(null);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    console.log('✅ Edit successful, refreshing promotions list');
    fetchPromotions(); // Refresh the promotions list
  };

  // ✅ ENHANCED: Handle delete promotion với error handling chi tiết
  const handleDeletePromotion = async (promotionId, promotionName) => {
    // ✅ KIỂM TRA USAGE TRƯỚC KHI XÓA
    try {
      console.log(`🔍 Checking usage for promotion ${promotionId} before deletion...`);
      
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
            `❌ Không thể xóa khuyến mãi "${promotionName}"!\n\n` +
            `Khuyến mãi này đang được sử dụng trong ${checkResult.data.totalReferences} bản ghi: ${usageDetails}\n\n` +
            `💡 Đề xuất: Thay đổi trạng thái thành "Không hoạt động" thay vì xóa.`,
            { 
              autoClose: 8000,
              position: "top-center",
              style: { whiteSpace: 'pre-line' }
            }
          );
          
          // ✅ HIỂN THỊ MODAL XÁC NHẬN CHUYỂN TRẠNG THÁI
          const changeStatus = window.confirm(
            `Khuyến mãi "${promotionName}" không thể xóa vì đang được sử dụng.\n\n` +
            `Bạn có muốn chuyển trạng thái thành "Không hoạt động" thay thế?\n\n` +
            `(Điều này sẽ ngưng việc sử dụng khuyến mãi mà không ảnh hưởng đến dữ liệu hiện có)`
          );
          
          if (changeStatus) {
            try {
              await handleStatusToggle(promotionId, 'Active'); // Sẽ chuyển thành Inactive
              toast.success(`✅ Đã chuyển khuyến mãi "${promotionName}" thành trạng thái "Không hoạt động"`);
            } catch (statusError) {
              toast.error('Lỗi khi thay đổi trạng thái khuyến mãi');
            }
          }
          
          return; // Exit early, không tiếp tục xóa
        }
      }
    } catch (checkError) {
      console.warn('⚠️ Could not check promotion usage, proceeding with caution:', checkError);
      // Continue with deletion attempt, but with extra confirmation
    }

    // ✅ Confirmation dialog if usage check passed or failed
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN khuyến mãi "${promotionName}"?\n\n` +
      `⚠️ CẢNH BÁO: Hành động này sẽ xóa hoàn toàn khuyến mãi khỏi cơ sở dữ liệu và KHÔNG THỂ KHÔI PHỤC!\n\n` +
      `Nhấn OK để xác nhận xóa, hoặc Cancel để hủy.`
    );

    if (!confirmed) {
      return;
    }

    // ✅ Double confirmation cho hard delete
    const doubleConfirmed = window.confirm(
      `🚨 XÁC NHẬN LẦN CUỐI:\n\n` +
      `Bạn thực sự muốn XÓA VĨNH VIỄN khuyến mãi "${promotionName}"?\n\n` +
      `Dữ liệu sẽ bị mất hoàn toàn và không thể khôi phục!`
    );

    if (!doubleConfirmed) {
      return;
    }

    try {
      console.log(`🗑️ Hard deleting promotion ${promotionId}`);
      
      // ✅ Gọi API với force=true để hard delete
      const response = await fetch(`http://localhost:3000/api/promotions/${promotionId}?force=true&confirm=true`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`✅ Đã xóa vĩnh viễn khuyến mãi "${promotionName}" thành công!`);
        fetchPromotions(); // Refresh list
      } else {
        // ✅ ENHANCED ERROR HANDLING
        if (result.data && result.data.cannotDelete) {
          toast.error(
            `❌ ${result.message}\n\n💡 Đề xuất: ${result.data.suggestion || 'Thay đổi trạng thái thay vì xóa'}`,
            { 
              autoClose: 10000,
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
      } else if (error.message.includes('FOREIGN KEY') || error.message.includes('ràng buộc')) {
        toast.error(
          `❌ Không thể xóa khuyến mãi vì có ràng buộc dữ liệu!\n\n` +
          `Khuyến mãi này đang được tham chiếu bởi các bản ghi khác trong hệ thống.\n\n` +
          `💡 Đề xuất: Thay đổi trạng thái thành "Không hoạt động".`,
          { 
            autoClose: 10000,
            position: "top-center",
            style: { whiteSpace: 'pre-line' }
          }
        );
      } else {
        toast.error('Lỗi khi xóa khuyến mãi: ' + error.message);
      }
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    const color = statusOption?.color || 'secondary';
    const label = statusOption?.label || status;
    
    return (
      <span className={`badge bg-${color}`}>
        {label}
      </span>
    );
  };

  // Check if promotion is currently active
  const isPromotionActive = (promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    return promotion.status === 'Active' && 
           now >= startDate && 
           now <= endDate;
  };

  // Handle status toggle
  const handleStatusToggle = async (promotionId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    
    if (!window.confirm(`Bạn có chắc chắn muốn ${newStatus === 'Active' ? 'kích hoạt' : 'vô hiệu hóa'} khuyến mãi này?`)) {
      return;
    }

    try {
      console.log(`🔄 Updating promotion ${promotionId} status to ${newStatus}`);
      
      const response = await fetch(`http://localhost:3000/api/promotions/${promotionId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`${newStatus === 'Active' ? 'Kích hoạt' : 'Vô hiệu hóa'} khuyến mãi thành công!`);
        fetchPromotions(); // Refresh list
      } else {
        throw new Error(result.message || 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      toast.error('Lỗi khi cập nhật trạng thái: ' + error.message);
    }
  };

  // Filter promotions
  const filteredPromotions = promotions.filter(promo => {
    const matchesName = promo.promotionName.toLowerCase().includes(filters.name.toLowerCase());
    const matchesDiscount = filters.discount === '' || promo.discountPercent === parseInt(filters.discount);
    const matchesStartDate = filters.startDate === '' || promo.startDate === filters.startDate;
    const matchesEndDate = filters.endDate === '' || promo.endDate === filters.endDate;
    const matchesStatus = filters.status === '' || promo.status === filters.status;
    
    return matchesName && matchesDiscount && matchesStartDate && matchesEndDate && matchesStatus;
  });

  // Sort promotions
  const sortedPromotions = [...filteredPromotions].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Handle dates
    if (sortConfig.key === 'startDate' || sortConfig.key === 'endDate') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    // Handle numbers
    if (sortConfig.key === 'discountPercent') {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sort
  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      name: '',
      discount: '',
      startDate: '',
      endDate: '',
      status: ''
    });
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return 'fas fa-sort';
    return sortConfig.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  };

  // Get promotion statistics
  const getStats = () => {
    const total = promotions.length;
    const active = promotions.filter(p => p.status === 'Active').length;
    const inactive = promotions.filter(p => p.status === 'Inactive').length;
    const draft = promotions.filter(p => p.status === 'Draft').length;
    const expired = promotions.filter(p => p.status === 'Expired').length;
    
    return { total, active, inactive, draft, expired };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-2">Đang tải danh sách khuyến mãi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 promotion-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="fas fa-tags me-2 text-primary"></i>
            Quản lý khuyến mãi
          </h2>
          <p className="text-muted mb-0">Tạo và quản lý các chương trình khuyến mãi cho khách sạn</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchPromotions}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-1"></i>
            Làm mới
          </button>
          <Link to="/manager/promotions/add" className="btn btn-success">
            <i className="fas fa-plus me-1"></i>
            Thêm khuyến mãi
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h3 className="mb-1">{stats.total}</h3>
              <small>Tổng số</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h3 className="mb-1">{stats.active}</h3>
              <small>Hoạt động</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-secondary text-white">
            <div className="card-body text-center">
              <h3 className="mb-1">{stats.inactive}</h3>
              <small>Không hoạt động</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-warning text-white">
            <div className="card-body text-center">
              <h3 className="mb-1">{stats.draft}</h3>
              <small>Bản nháp</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-danger text-white">
            <div className="card-body text-center">
              <h3 className="mb-1">{stats.expired}</h3>
              <small>Hết hạn</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <h3 className="mb-1">{filteredPromotions.length}</h3>
              <small>Hiển thị</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-filter me-2"></i>
            Bộ lọc
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Tên khuyến mãi</label>
              <input
                type="text"
                className="form-control"
                name="name"
                placeholder="Nhập tên khuyến mãi"
                value={filters.name}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Giảm giá (%)</label>
              <input
                type="number"
                className="form-control"
                name="discount"
                placeholder="VD: 10"
                value={filters.discount}
                onChange={handleFilterChange}
                min="0"
                max="100"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Ngày bắt đầu</label>
              <input
                type="date"
                className="form-control"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Ngày kết thúc</label>
              <input
                type="date"
                className="form-control"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Trạng thái</label>
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <button
                className="btn btn-outline-danger w-100"
                onClick={handleClearFilters}
                title="Xóa bộ lọc"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Promotion Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Danh sách khuyến mãi ({sortedPromotions.length})
          </h5>
        </div>
        <div className="card-body">
          {sortedPromotions.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-tags fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Không có khuyến mãi nào</h5>
              <p className="text-muted">
                {promotions.length === 0 
                  ? 'Chưa có khuyến mãi nào được tạo.' 
                  : 'Không có khuyến mãi nào phù hợp với bộ lọc hiện tại.'
                }
              </p>
              {promotions.length === 0 && (
                <Link to="/manager/promotions/add" className="btn btn-primary">
                  <i className="fas fa-plus me-1"></i>
                  Tạo khuyến mãi đầu tiên
                </Link>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('promotionName')}>
                      Tên khuyến mãi <i className={getSortIcon('promotionName')}></i>
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('discountPercent')}>
                      Giảm giá <i className={getSortIcon('discountPercent')}></i>
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('startDate')}>
                      Ngày bắt đầu <i className={getSortIcon('startDate')}></i>
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('endDate')}>
                      Ngày kết thúc <i className={getSortIcon('endDate')}></i>
                    </th>
                    <th>Mô tả</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                      Trạng thái <i className={getSortIcon('status')}></i>
                    </th>
                    <th style={{ width: '200px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPromotions.map((promo) => (
                    <tr key={promo.promotionID}>
                      <td>
                        <strong>{promo.promotionName}</strong>
                        {isPromotionActive(promo) && (
                          <span className="badge bg-success ms-2">
                            <i className="fas fa-clock me-1"></i>
                            Đang áp dụng
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-primary fs-6">
                          {promo.discountPercent}%
                        </span>
                      </td>
                      <td>{formatDate(promo.startDate)}</td>
                      <td>{formatDate(promo.endDate)}</td>
                      <td>
                        <span title={promo.description} style={{ cursor: 'help' }}>
                          {promo.description?.length > 50 
                            ? promo.description.substring(0, 50) + '...'
                            : promo.description || 'Không có mô tả'
                          }
                        </span>
                      </td>
                      <td>{getStatusBadge(promo.status)}</td>
                      <td>
                        {/* ✅ SỬA: Đơn giản hóa action buttons */}
                        <div className="btn-group" role="group">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEditPromotion(promo.promotionID)}
                            title="Chỉnh sửa"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className={`btn btn-sm ${promo.status === 'Active' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            onClick={() => handleStatusToggle(promo.promotionID, promo.status)}
                            title={promo.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          >
                            <i className={`fas ${promo.status === 'Active' ? 'fa-pause' : 'fa-play'}`}></i>
                          </button>
                          
                          {/* ✅ SỬA: Nút xóa đơn giản */}
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeletePromotion(promo.promotionID, promo.promotionName)}
                            title="Xóa vĩnh viễn"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Edit Promotion Modal */}
      <EditPromotionModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        promotionId={selectedPromotionId}
        onSuccess={handleEditSuccess}
      />

      {/* ✅ XÓA: DeletePromotionModal component */}
    </div>
  );
}

export default PromotionList;
