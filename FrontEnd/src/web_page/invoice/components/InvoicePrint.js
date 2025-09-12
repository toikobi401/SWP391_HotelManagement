import React, { forwardRef, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import SimpleModal from '../../UI component/Modal/SimpleModal';
import styles from './InvoicePrint.module.css';

// ✅ SỬA: Component chính giờ là Modal wrapper
const InvoicePrint = ({ 
  isOpen, 
  onClose, 
  invoiceData, 
  loading = false,
  // ✅ GIỮ NGUYÊN: Các props có sẵn cho backward compatibility
  ...otherProps 
}) => {
  const printRef = useRef();

  // ✅ THÊM: Handle print using react-to-print
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `HoaDon_${invoiceData?.InvoiceID}_${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 15mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
      }
    `,
    onAfterPrint: () => {
      console.log('✅ Print completed successfully');
    },
    onPrintError: (error) => {
      console.error('❌ Print error:', error);
      alert('Lỗi khi in hóa đơn: ' + error.message);
    }
  });

  // ✅ THÊM: Handle download PDF
  const handleDownloadPDF = async () => {
    if (!printRef.current || !invoiceData) {
      alert('Không có dữ liệu để tạo PDF');
      return;
    }

    try {
      const options = {
        margin: [10, 10, 10, 10],
        filename: `HoaDon_${invoiceData.InvoiceID}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        }
      };

      await html2pdf().set(options).from(printRef.current).save();
      console.log('✅ PDF generated successfully');

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      alert('Lỗi khi tạo PDF: ' + error.message);
    }
  };

  // ✅ THÊM: Nếu không có props modal, render như component bình thường (backward compatibility)
  if (!isOpen && isOpen !== false) {
    return <InvoicePrintContent ref={printRef} invoiceData={invoiceData} {...otherProps} />;
  }

  // ✅ THÊM: Loading state
  if (loading) {
    return (
      <SimpleModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className={styles.modalTitle}>
            <i className="fas fa-file-invoice"></i>
            <span>Đang tải hóa đơn...</span>
          </div>
        }
      >
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải dữ liệu hóa đơn, vui lòng chờ...</p>
        </div>
      </SimpleModal>
    );
  }

  // ✅ THÊM: Error state
  if (!invoiceData) {
    return (
      <SimpleModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className={styles.modalTitle}>
            <i className="fas fa-exclamation-triangle text-danger"></i>
            <span>Lỗi tải dữ liệu</span>
          </div>
        }
      >
        <div className={styles.errorContainer}>
          <i className="fas fa-exclamation-triangle"></i>
          <h4>Không thể tải dữ liệu hóa đơn</h4>
          <p>Vui lòng thử lại sau hoặc liên hệ hỗ trợ kỹ thuật.</p>
          <button 
            className={`btn btn-primary ${styles.retryBtn}`}
            onClick={() => window.location.reload()}
          >
            <i className="fas fa-redo"></i>
            Thử lại
          </button>
        </div>
      </SimpleModal>
    );
  }

  // ✅ MAIN MODAL RENDER
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={styles.modalTitle}>
          <i className="fas fa-file-invoice"></i>
          <span>Xem trước hóa đơn #{invoiceData.InvoiceID}</span>
        </div>
      }
      // ✅ THÊM: Style inline để override z-index nếu cần
      style={{
        zIndex: 10005
      }}
    >
      <div className={styles.printModalContainer}>
        {/* ✅ THÊM: Action Buttons */}
        <div className={styles.modalActions}>
          <button
            className={`btn btn-primary ${styles.actionBtn}`}
            onClick={handlePrint}
            title="In hóa đơn"
          >
            <i className="fas fa-print"></i>
            In hóa đơn
          </button>
          
          <button
            className={`btn btn-success ${styles.actionBtn}`}
            onClick={handleDownloadPDF}
            title="Tải PDF"
          >
            <i className="fas fa-download"></i>
            Tải PDF
          </button>
          
          <button
            className={`btn btn-secondary ${styles.actionBtn}`}
            onClick={onClose}
            title="Đóng"
          >
            <i className="fas fa-times"></i>
            Đóng
          </button>
        </div>

        {/* ✅ THÊM: Print Content */}
        <div className={styles.printPreview}>
          <InvoicePrintContent 
            ref={printRef} 
            invoiceData={invoiceData}
            {...otherProps}
          />
        </div>

        {/* ✅ THÊM: Footer */}
        <div className={styles.modalFooter}>
          <small className="text-muted">
            <i className="fas fa-info-circle"></i>
            Sử dụng nút "In hóa đơn" để in trực tiếp hoặc "Tải PDF" để lưu file
          </small>
        </div>
      </div>
    </SimpleModal>
  );
};

// ✅ TÁCH RIÊNG: Logic render hóa đơn gốc thành component con
const InvoicePrintContent = forwardRef(({ invoiceData }, ref) => {
  // ✅ GIỮ NGUYÊN: Tất cả logic nghiệp vụ có sẵn
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate subtotal for rooms
  const calculateRoomSubtotal = () => {
    if (!invoiceData?.Rooms?.length) return 0;
    
    return invoiceData.Rooms.reduce((total, room) => {
      const nights = parseInt(room.NumberOfNights) || 0;
      const price = parseFloat(room.RoomPrice) || 0;
      return total + (nights * price);
    }, 0);
  };

  // Calculate subtotal for services
  const calculateServiceSubtotal = () => {
    if (!invoiceData?.Services?.length) return 0;
    
    return invoiceData.Services.reduce((total, service) => {
      const quantity = parseInt(service.Quantity) || 0;
      const price = parseFloat(service.ServicePrice) || 0;
      return total + (quantity * price);
    }, 0);
  };

  // Calculate totals
  const roomSubtotal = calculateRoomSubtotal();
  const serviceSubtotal = calculateServiceSubtotal();
  const subtotal = roomSubtotal + serviceSubtotal;
  
  // Promotion discount
  const promotionDiscount = invoiceData?.PromotionDiscount || 0;
  const discountAmount = (subtotal * promotionDiscount) / 100;
  
  // Final total
  const finalTotal = subtotal - discountAmount;

  // Get payment status info
  const getPaymentStatusInfo = (status) => {
    const statusMap = {
      'Pending': { label: 'Chưa thanh toán', color: '#ffc107', icon: 'fas fa-clock' },
      'Partial': { label: 'Thanh toán một phần', color: '#fd7e14', icon: 'fas fa-adjust' },
      'Paid': { label: 'Đã thanh toán', color: '#28a745', icon: 'fas fa-check-circle' },
      'Refunded': { label: 'Đã hoàn tiền', color: '#6f42c1', icon: 'fas fa-undo' },
      'Cancelled': { label: 'Đã hủy', color: '#dc3545', icon: 'fas fa-times-circle' }
    };
    
    return statusMap[status] || { label: status, color: '#6c757d', icon: 'fas fa-question-circle' };
  };

  const paymentStatus = getPaymentStatusInfo(invoiceData?.PaymentStatus);

  if (!invoiceData) {
    return (
      <div className={styles.invoicePrint} ref={ref}>
        <div className={styles.noData}>
          <p>Không có dữ liệu hóa đơn để hiển thị</p>
        </div>
      </div>
    );
  }

  // ✅ GIỮ NGUYÊN: Toàn bộ JSX render logic có sẵn
  return (
    <div className={styles.invoicePrint} ref={ref}>
      {/* ✅ HEADER */}
      <div className={styles.header}>
        <div className={styles.hotelInfo}>
          <h1>HOTELHUB</h1>
          <p>FPT University, Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất, Hà Nội</p>
          <p>Điện thoại: 0865.124.996 | Email: datltthe194235@gmail.com</p>
        </div>
        <div className={styles.invoiceTitle}>
          <h2>HÓA ĐƠN THANH TOÁN</h2>
          <p>Invoice #{invoiceData.InvoiceID}</p>
          <p>Ngày tạo: {formatDate(invoiceData.CreateAt)}</p>
        </div>
      </div>

      {/* ✅ INVOICE INFO */}
      <div className={styles.invoiceInfo}>
        <div className={styles.billTo}>
          <h3>Thông tin khách hàng:</h3>
          <p><strong>Họ tên:</strong> {invoiceData.CustomerName || 'N/A'}</p>
          <p><strong>Email:</strong> {invoiceData.CustomerEmail || 'N/A'}</p>
          <p><strong>Số điện thoại:</strong> {invoiceData.CustomerPhone || 'N/A'}</p>
          {invoiceData.BookingID && (
            <p><strong>Mã đặt phòng:</strong> #{invoiceData.BookingID}</p>
          )}
        </div>
        <div className={styles.invoiceDetails}>
          <h3>Chi tiết hóa đơn:</h3>
          <p><strong>Mã hóa đơn:</strong> #{invoiceData.InvoiceID}</p>
          <p><strong>Ngày tạo:</strong> {formatDate(invoiceData.CreateAt)}</p>
          <p><strong>Trạng thái:</strong> 
            <span 
              className={styles.statusBadge}
              style={{ color: paymentStatus.color }}
            >
              <i className={paymentStatus.icon}></i> {paymentStatus.label}
            </span>
          </p>
          <p><strong>Phương thức thanh toán:</strong> {invoiceData.PaymentMethod || 'N/A'}</p>
        </div>
      </div>

      {/* ✅ ROOMS TABLE */}
      {invoiceData.Rooms && invoiceData.Rooms.length > 0 && (
        <div className={styles.invoiceSection}>
          <h3>Chi tiết phòng:</h3>
          <table className={styles.invoiceTable}>
            <thead>
              <tr>
                <th>Số phòng</th>
                <th>Loại phòng</th>
                <th>Ngày nhận</th>
                <th>Ngày trả</th>
                <th>Số đêm</th>
                <th>Giá/đêm</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.Rooms.map((room, index) => {
                const nights = parseInt(room.NumberOfNights) || 0;
                const price = parseFloat(room.RoomPrice) || 0;
                const total = nights * price;
                
                return (
                  <tr key={index}>
                    <td>{room.RoomNumber}</td>
                    <td>{room.RoomType}</td>
                    <td>{formatDate(room.CheckInDate)}</td>
                    <td>{formatDate(room.CheckOutDate)}</td>
                    <td>{nights}</td>
                    <td>{formatCurrency(price)}</td>
                    <td>{formatCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="6" className={styles.textRight}><strong>Tổng tiền phòng:</strong></td>
                <td><strong>{formatCurrency(roomSubtotal)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ✅ SERVICES TABLE */}
      {invoiceData.Services && invoiceData.Services.length > 0 && (
        <div className={styles.invoiceSection}>
          <h3>Chi tiết dịch vụ:</h3>
          <table className={styles.invoiceTable}>
            <thead>
              <tr>
                <th>Tên dịch vụ</th>
                <th>Mô tả</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.Services.map((service, index) => {
                const quantity = parseInt(service.Quantity) || 0;
                const price = parseFloat(service.ServicePrice) || 0;
                const total = quantity * price;
                
                return (
                  <tr key={index}>
                    <td>{service.ServiceName}</td>
                    <td>{service.Description || 'N/A'}</td>
                    <td>{quantity}</td>
                    <td>{formatCurrency(price)}</td>
                    <td>{formatCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" className={styles.textRight}><strong>Tổng tiền dịch vụ:</strong></td>
                <td><strong>{formatCurrency(serviceSubtotal)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ✅ TOTALS */}
      <div className={styles.invoiceTotals}>
        <div className={styles.totalsContainer}>
          <div className={styles.totalRow}>
            <span>Tổng tiền phòng:</span>
            <span>{formatCurrency(roomSubtotal)}</span>
          </div>
          
          {serviceSubtotal > 0 && (
            <div className={styles.totalRow}>
              <span>Tổng tiền dịch vụ:</span>
              <span>{formatCurrency(serviceSubtotal)}</span>
            </div>
          )}
          
          <div className={styles.totalRow}>
            <span>Tạm tính:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {promotionDiscount > 0 && (
            <>
              <div className={styles.totalRow}>
                <span>Khuyến mãi ({promotionDiscount}%):</span>
                <span className={styles.discountAmount}>-{formatCurrency(discountAmount)}</span>
              </div>
              {invoiceData.PromotionName && (
                <div className={styles.promotionInfo}>
                  <small>* Áp dụng khuyến mãi: {invoiceData.PromotionName}</small>
                </div>
              )}
            </>
          )}

          <div className={`${styles.totalRow} ${styles.finalTotal}`}>
            <span>TỔNG CỘNG:</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>

          {invoiceData.PaidAmount && (
            <>
              <div className={styles.totalRow}>
                <span>Đã thanh toán:</span>
                <span className={styles.paidAmount}>{formatCurrency(invoiceData.PaidAmount)}</span>
              </div>
              <div className={`${styles.totalRow} ${styles.remainingAmount}`}>
                <span>Còn lại:</span>
                <span>{formatCurrency(finalTotal - invoiceData.PaidAmount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ FOOTER */}
      <div className={styles.footer}>
        <div className={styles.footerSection}>
          <h4>Ghi chú:</h4>
          <p>{invoiceData.Notes || 'Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!'}</p>
        </div>
        
        <div className={styles.footerSection}>
          <h4>Điều khoản thanh toán:</h4>
          <ul>
            <li>Vui lòng kiểm tra kỹ thông tin trước khi thanh toán</li>
            <li>Mọi thắc mắc xin liên hệ quầy lễ tân</li>
            <li>Hóa đơn có giá trị trong 30 ngày kể từ ngày xuất</li>
          </ul>
        </div>

        <div className={styles.signature}>
          <div className={styles.signatureBlock}>
            <p>Khách hàng</p>
            <p>(Ký tên)</p>
          </div>
          <div className={styles.signatureBlock}>
            <p>Nhân viên thu ngân</p>
            <p>(Ký tên & đóng dấu)</p>
          </div>
        </div>

        <div className={styles.printInfo}>
          <p>Hóa đơn được in lúc: {formatDate(new Date())}</p>
          <p>© 2024 Hotel Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
});

InvoicePrintContent.displayName = 'InvoicePrintContent';
InvoicePrint.displayName = 'InvoicePrint';

export default InvoicePrint;