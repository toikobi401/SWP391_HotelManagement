import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import InvoiceDetailModal from './InvoiceDetailModal';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import styles from './InvoiceTable.module.css';

const InvoiceTable = ({
  invoices = [],
  loading = false,
  error = null,
  onView,
  onUpdateStatus,
  pagination = null,
  onPageChange,
  onPageSizeChange
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'CreateAt',
    direction: 'desc'
  });
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  
  // ✅ State cho modal
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort invoices
  const sortedInvoices = useMemo(() => {
    let sortableInvoices = [...safeInvoices];
    if (sortConfig.key) {
      sortableInvoices.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableInvoices;
  }, [safeInvoices, sortConfig]);

  // Handle select invoice
  const handleSelectInvoice = (invoiceId, isSelected) => {
    if (isSelected) {
      setSelectedInvoices([...selectedInvoices, invoiceId]);
    } else {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId));
    }
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedInvoices(safeInvoices.map(invoice => invoice.InvoiceID));
    } else {
      setSelectedInvoices([]);
    }
  };

  // ✅ Handle view invoice
  const handleViewInvoice = (invoiceId) => {
    console.log('🔍 Opening invoice modal for ID:', invoiceId);
    setSelectedInvoiceId(invoiceId);
    setShowDetailModal(true);
  };

  // ✅ Handle close modal
  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedInvoiceId(null);
  };

  // ✅ Handle modal actions
  const handleModalUpdateStatus = async (invoiceId, newStatus) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(invoiceId, newStatus);
        console.log('✅ Status updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating status from modal:', error);
    }
  };

  const handleModalProcessPayment = async (invoiceId, paymentData) => {
    try {
      console.log('💰 Payment processed from modal:', { invoiceId, paymentData });
      if (onUpdateStatus) {
        const currentInvoice = safeInvoices.find(inv => inv.InvoiceID === invoiceId);
        if (currentInvoice) {
          await onUpdateStatus(invoiceId, currentInvoice.PaymentStatus);
        }
      }
    } catch (error) {
      console.error('❌ Error processing payment from modal:', error);
    }
  };

  // Get sort icon
  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return 'fas fa-sort text-muted';
    }
    return sortConfig.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status) => {
    const colors = {
      'Pending': '#ffc107',
      'Partial': '#fd7e14',
      'Paid': '#28a745',
      'Refunded': '#6f42c1',
      'Cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  // ✅ Get booking type badge function
  const getBookingTypeBadge = (bookingType, bookingTypeLabel) => {
    const isOnline = bookingType === 1 || bookingType === true;
    const isWalkIn = bookingType === 0 || bookingType === false;
    
    if (isWalkIn) {
      return (
        <span className={`${styles.bookingTypeBadge} ${styles.walkin}`} title="Walk-in Booking">
          <i className="fas fa-walking"></i>
          Walk-in
        </span>
      );
    } else if (isOnline) {
      return (
        <span className={`${styles.bookingTypeBadge} ${styles.online}`} title="Online Booking">
          <i className="fas fa-globe"></i>
          Online
        </span>
      );
    } else {
      return (
        <span className={`${styles.bookingTypeBadge} ${styles.unknown}`} title="Unknown Type">
          <i className="fas fa-question"></i>
          N/A
        </span>
      );
    }
  };

  // ✅ Customer helper functions
  const getCustomerName = (invoice) => {
    if (invoice.GuestName) return invoice.GuestName;
    if (invoice.CustomerName) return invoice.CustomerName;
    return 'Walk-in Guest';
  };

  const getCustomerPhone = (invoice) => {
    if (invoice.WalkInGuestPhoneNumber) return invoice.WalkInGuestPhoneNumber;
    if (invoice.CustomerPhone) return invoice.CustomerPhone;
    return null;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    return phone;
  };

  // ✅ THÊM: Excel Export Function
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      console.log('📊 Starting Excel export...');

      // Prepare data for Excel
      const excelData = safeInvoices.map((invoice, index) => ({
        'STT': index + 1,
        'ID Hóa đơn': `HD${String(invoice.InvoiceID).padStart(6, '0')}`,
        'ID Booking': `BK${String(invoice.BookingID).padStart(6, '0')}`,
        'Tên khách hàng': getCustomerName(invoice),
        'Số điện thoại': getCustomerPhone(invoice) || 'Không có',
        'Loại booking': getBookingTypeLabel(invoice.BookingType),
        'Số khách': invoice.numberOfGuest || 'N/A',
        'Tổng tiền (VND)': invoice.TotalAmount || 0,
        'Đã thanh toán (VND)': invoice.PaidAmount || 0,
        'Còn lại (VND)': invoice.RemainingAmount || 0,
        'Trạng thái thanh toán': getPaymentStatusLabel(invoice.PaymentStatus),
        'Ngày tạo': formatDateForExcel(invoice.CreateAt),
        'Cập nhật cuối': formatDateForExcel(invoice.UpdateAt),
        'Nhân viên lễ tân': invoice.ReceptionistName || 'N/A',
        'Ghi chú đặc biệt': invoice.SpecialRequest || 'Không có'
      }));

      console.log(`📋 Prepared ${excelData.length} rows for Excel export`);

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // ID Hóa đơn
        { wch: 15 },  // ID Booking
        { wch: 25 },  // Tên khách hàng
        { wch: 15 },  // Số điện thoại
        { wch: 12 },  // Loại booking
        { wch: 10 },  // Số khách
        { wch: 18 },  // Tổng tiền
        { wch: 18 },  // Đã thanh toán
        { wch: 18 },  // Còn lại
        { wch: 20 },  // Trạng thái
        { wch: 20 },  // Ngày tạo
        { wch: 20 },  // Cập nhật cuối
        { wch: 20 },  // Nhân viên
        { wch: 30 }   // Ghi chú
      ];
      worksheet['!cols'] = columnWidths;

      // Style the header row
      const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "366092" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }

      // Style data rows
      for (let row = 1; row <= headerRange.e.r; row++) {
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!worksheet[cellAddress]) continue;

          // Stripe rows
          const fillColor = row % 2 === 0 ? "F8F9FA" : "FFFFFF";
          
          worksheet[cellAddress].s = {
            alignment: { horizontal: "left", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "E5E5E5" } },
              bottom: { style: "thin", color: { rgb: "E5E5E5" } },
              left: { style: "thin", color: { rgb: "E5E5E5" } },
              right: { style: "thin", color: { rgb: "E5E5E5" } }
            },
            fill: { fgColor: { rgb: fillColor } }
          };

          // Special formatting for money columns
          if (col >= 7 && col <= 9) { // Money columns
            worksheet[cellAddress].s.alignment.horizontal = "right";
            worksheet[cellAddress].s.numFmt = "#,##0";
          }

          // Center align for STT, Status
          if (col === 0 || col === 10) {
            worksheet[cellAddress].s.alignment.horizontal = "center";
          }
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách hóa đơn');

      // Create summary sheet
      const summaryData = createSummaryData(safeInvoices);
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [
        { wch: 25 }, // Mô tả
        { wch: 20 }, // Giá trị
        { wch: 15 }  // Tỷ lệ
      ];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Tổng hợp');

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
      const filename = `DanhSachHoaDon_${timestamp}.xlsx`;

      // Export file
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        compression: true 
      });
      
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      saveAs(blob, filename);

      console.log('✅ Excel export completed:', filename);
      
      // Show success notification
      if (window.showToast) {
        window.showToast(`Xuất Excel thành công: ${filename}`, 'success');
      } else {
        alert(`Xuất Excel thành công: ${filename}`);
      }

    } catch (error) {
      console.error('❌ Excel export error:', error);
      
      if (window.showToast) {
        window.showToast('Lỗi khi xuất Excel: ' + error.message, 'error');
      } else {
        alert('Lỗi khi xuất Excel: ' + error.message);
      }
    } finally {
      setExporting(false);
    }
  };

  // ✅ THÊM: Helper functions for Excel export
  const formatDateForExcel = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return 'N/A';
    }
  };

  const getPaymentStatusLabel = (status) => {
    const statusMap = {
      'Pending': 'Chưa thanh toán',
      'Partial': 'Thanh toán một phần',
      'Paid': 'Đã thanh toán',
      'Refunded': 'Đã hoàn tiền',
      'Cancelled': 'Đã hủy'
    };
    return statusMap[status] || status || 'Không xác định';
  };

  const getBookingTypeLabel = (bookingType) => {
    if (bookingType === 0 || bookingType === false) return 'Walk-in';
    if (bookingType === 1 || bookingType === true) return 'Online';
    return 'Không xác định';
  };

  const createSummaryData = (invoices) => {
    const total = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (inv.PaidAmount || 0), 0);
    const remainingAmount = invoices.reduce((sum, inv) => sum + (inv.RemainingAmount || 0), 0);

    const statusCounts = invoices.reduce((acc, inv) => {
      const status = inv.PaymentStatus || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const bookingTypeCounts = invoices.reduce((acc, inv) => {
      const type = getBookingTypeLabel(inv.BookingType);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return [
      { 'Mô tả': 'TỔNG QUAN', 'Giá trị': '', 'Tỷ lệ (%)': '' },
      { 'Mô tả': 'Tổng số hóa đơn', 'Giá trị': total.toLocaleString(), 'Tỷ lệ (%)': '100%' },
      { 'Mô tả': 'Tổng giá trị (VND)', 'Giá trị': totalAmount.toLocaleString(), 'Tỷ lệ (%)': '100%' },
      { 'Mô tả': 'Đã thu (VND)', 'Giá trị': paidAmount.toLocaleString(), 'Tỷ lệ (%)': `${((paidAmount/totalAmount)*100 || 0).toFixed(1)}%` },
      { 'Mô tả': 'Còn lại (VND)', 'Giá trị': remainingAmount.toLocaleString(), 'Tỷ lệ (%)': `${((remainingAmount/totalAmount)*100 || 0).toFixed(1)}%` },
      { 'Mô tả': '', 'Giá trị': '', 'Tỷ lệ (%)': '' },
      { 'Mô tả': 'TRẠNG THÁI THANH TOÁN', 'Giá trị': '', 'Tỷ lệ (%)': '' },
      ...Object.entries(statusCounts).map(([status, count]) => ({
        'Mô tả': getPaymentStatusLabel(status),
        'Giá trị': count.toLocaleString(),
        'Tỷ lệ (%)': `${((count/total)*100).toFixed(1)}%`
      })),
      { 'Mô tả': '', 'Giá trị': '', 'Tỷ lệ (%)': '' },
      { 'Mô tả': 'LOẠI BOOKING', 'Giá trị': '', 'Tỷ lệ (%)': '' },
      ...Object.entries(bookingTypeCounts).map(([type, count]) => ({
        'Mô tả': type,
        'Giá trị': count.toLocaleString(),
        'Tỷ lệ (%)': `${((count/total)*100).toFixed(1)}%`
      })),
      { 'Mô tả': '', 'Giá trị': '', 'Tỷ lệ (%)': '' },
      { 'Mô tả': 'Thời gian xuất', 'Giá trị': new Date().toLocaleString('vi-VN'), 'Tỷ lệ (%)': '' }
    ];
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.invoiceTableContainer}>
        <div className={styles.invoiceTableLoading}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Đang tải...</span>
          </div>
          <p>Đang tải danh sách hóa đơn...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.invoiceTableContainer}>
        <div className={styles.invoiceTableEmpty}>
          <i className="fas fa-exclamation-triangle"></i>
          <h5>Lỗi tải dữ liệu</h5>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (safeInvoices.length === 0) {
    return (
      <div className={styles.invoiceTableContainer}>
        <div className={styles.invoiceTableEmpty}>
          <i className="fas fa-file-invoice"></i>
          <h5>Không có hóa đơn nào</h5>
          <p>Chưa có dữ liệu hóa đơn để hiển thị</p>
        </div>
      </div>
    );
  }

  // ✅ XÓA FUNCTION DUPLICATE - chỉ giữ một phiên bản
  const handlePageChange = (newPage) => {
    console.log('🔄 InvoiceTable: Page change to:', newPage);
    if (onPageChange && typeof onPageChange === 'function') {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    console.log('📏 InvoiceTable: Page size change to:', newPageSize);
    if (onPageSizeChange && typeof onPageSizeChange === 'function') {
      onPageSizeChange(newPageSize);
    }
  };

  return (
    <>
      <div className={styles.invoiceTableContainer}>
        {/* Table Header */}
        <div className={styles.invoiceTableHeader}>
          <div className={styles.tableTitle}>
            <i className="fas fa-file-invoice-dollar"></i>
            <h4>Danh sách hóa đơn</h4>
          </div>
          <div className={styles.tableActions}>
            {/* ✅ Export Excel Button */}
            <button
              className={`${styles.tableBtn} ${styles.primary}`}
              onClick={handleExportExcel}
              disabled={loading || exporting || safeInvoices.length === 0}
              title="Xuất danh sách ra file Excel"
            >
              {exporting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Đang xuất...
                </>
              ) : (
                <>
                  <i className="fas fa-file-excel"></i>
                  Xuất Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className={styles.tableWrapper}>
          <table className={styles.invoiceTable}>
            <thead>
              <tr>
                {/* <th onClick={() => handleSort('InvoiceID')}>
                  ID {getSortIcon('InvoiceID')}
                </th>
                <th onClick={() => handleSort('BookingID')}>
                  Booking {getSortIcon('BookingID')}
                </th> */}
                <th>Khách hàng</th>
                <th onClick={() => handleSort('TotalAmount')}>
                  Tổng tiền {getSortIcon('TotalAmount')}
                </th>
                <th onClick={() => handleSort('PaymentStatus')}>
                  Trạng thái {getSortIcon('PaymentStatus')}
                </th>
                <th onClick={() => handleSort('CreateAt')}>
                  Ngày tạo {getSortIcon('CreateAt')}
                </th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((invoice) => (
                <tr key={invoice.InvoiceID} className={styles.invoiceRow}>
                  {/* <td>
                    <span className={styles.idBadge}>#{invoice.InvoiceID}</span>
                  </td>
                  <td>
                    <span className={styles.bookingIdBadge}>#{invoice.BookingID}</span>
                  </td> */}
                  <td className={styles.customerInfo}>
                    <div className={styles.customerName}>
                      {getCustomerName(invoice)}
                    </div>
                    <div className={styles.phoneInfo}>
                      {getCustomerPhone(invoice)}
                    </div>
                  </td>
                  <td className={styles.moneyValue}>
                    {formatCurrency(invoice.TotalAmount)}
                    {invoice.RemainingAmount > 0 && (
                      <div className={styles.remainingAmountPositive}>
                        Còn: {formatCurrency(invoice.RemainingAmount)}
                      </div>
                    )}
                  </td>
                  <td>
                    <InvoiceStatusBadge 
                      status={invoice.PaymentStatus} 
                      size="small" 
                    />
                  </td>
                  <td>{formatDate(invoice.CreateAt)}</td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionButtons}>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnView}`}
                        onClick={() => handleViewInvoice(invoice.InvoiceID)}
                        title="Xem chi tiết"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className={styles.invoiceTablePagination}>
            <div className={styles.paginationInfo}>
              <i className="fas fa-info-circle"></i>
              Hiển thị {safeInvoices.length} / {pagination.totalCount} hóa đơn
            </div>
            
            <div className={styles.paginationControls}>
              <button
                className={`${styles.paginationBtn} ${!pagination.hasPrev ? styles.disabled : ''}`}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <span className={styles.pageInfo}>
                Trang {pagination.currentPage} / {pagination.totalPages}
              </span>
              
              <button
                className={`${styles.paginationBtn} ${!pagination.hasNext ? styles.disabled : ''}`}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            
            <div className={styles.pageSizeSelector}>
              <label>Hiển thị:</label>
              <select
                className={styles.pageSizeSelect}
                value={pagination.pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          isOpen={showDetailModal}
          onClose={handleCloseModal}
          onUpdateStatus={handleModalUpdateStatus}
          onProcessPayment={handleModalProcessPayment}
        />
      )}
    </>
  );
};

export default InvoiceTable;

