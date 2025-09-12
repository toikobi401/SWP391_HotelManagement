import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import InvoicePrint from '../../components/InvoicePrint';
import axios from 'axios';
import styles from './InvoiceDetailModal.module.css';


const InvoiceDetailModal = ({
  invoiceId,
  isOpen,
  onClose,
  onUpdateStatus,
  onProcessPayment
}) => {
  const [invoice, setInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Thêm state cho QR modal riêng biệt
  const [showQRPaymentModal, setShowQRPaymentModal] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState(null);
  const [qrPaymentLoading, setQrPaymentLoading] = useState(false);

  // ✅ QUAN TRỌNG: Load data khi modal mở và có invoiceId
  useEffect(() => {
    console.log('📋 InvoiceDetailModal useEffect:', { isOpen, invoiceId });
    
    if (isOpen && invoiceId) {
      loadInvoiceDetails();
    } else {
      // Reset state khi đóng modal
      resetModalState();
    }
  }, [isOpen, invoiceId]);

  // ✅ RESET STATE
  const resetModalState = () => {
    setInvoice(null);
    setInvoiceItems([]);
    setPaymentHistory([]);
    setError(null);
    setActiveTab('details');
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setShowPrintModal(false);
  };

  // ✅ LOAD INVOICE DETAILS - Sử dụng API calls trực tiếp
  const loadInvoiceDetails = async () => {
    if (!invoiceId) {
      console.error('❌ No invoiceId provided to loadInvoiceDetails');
      setError('Không có ID hóa đơn');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading invoice details for ID:', invoiceId);

      // ✅ 1. FETCH INVOICE BASIC INFO
      const invoiceResponse = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Invoice response status:', invoiceResponse.status);

      if (!invoiceResponse.ok) {
        throw new Error(`HTTP ${invoiceResponse.status}: Failed to fetch invoice`);
      }

      const invoiceData = await invoiceResponse.json();
      console.log('✅ Invoice data received:', invoiceData);

      if (invoiceData.success && invoiceData.data) {
        setInvoice(invoiceData.data);
        
        // ✅ 2. FETCH INVOICE ITEMS RIÊNG BIỆT từ InvoiceItemController
        try {
          console.log('🔄 Loading invoice items for invoice:', invoiceId);
          
          const itemsResponse = await fetch(`http://localhost:3000/api/invoice-items?invoiceId=${invoiceId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            console.log('📋 Invoice items response:', itemsData);
            
            if (itemsData.success && Array.isArray(itemsData.data)) {
              setInvoiceItems(itemsData.data);
              console.log('✅ Invoice items loaded:', itemsData.data.length, 'items');
            } else {
              console.warn('⚠️ Invalid invoice items data format');
              setInvoiceItems([]);
            }
          } else {
            console.warn('⚠️ Failed to load invoice items:', itemsResponse.status);
            setInvoiceItems([]);
          }
        } catch (itemsError) {
          console.warn('⚠️ Error loading invoice items:', itemsError.message);
          setInvoiceItems([]);
        }
      } else {
        throw new Error(invoiceData.message || 'Invalid invoice data format');
      }

      // ✅ 3. FETCH PAYMENT HISTORY (giữ nguyên existing logic)
      try {
        const paymentResponse = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/payment-history`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          if (paymentData.success && Array.isArray(paymentData.data)) {
            setPaymentHistory(paymentData.data);
            console.log('💰 Payment history loaded:', paymentData.data.length, 'records');
          }
        }
      } catch (paymentError) {
        console.warn('⚠️ Could not load payment history:', paymentError.message);
      }

    } catch (error) {
      console.error('❌ Error loading invoice details:', error);
      setError(`Lỗi tải chi tiết hóa đơn: ${error.message}`);
      setInvoice(null);
      setInvoiceItems([]);
      setPaymentHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Sửa handleProcessPayment để mở QR modal riêng khi chọn chuyển khoản
  const handleProcessPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán hợp lệ');
      return;
    }

    if (parseFloat(paymentAmount) > (invoice?.RemainingAmount || 0)) {
      toast.error('Số tiền thanh toán không được vượt quá số tiền còn lại');
      return;
    }

    if (paymentMethod === 'Transfer' || paymentMethod === 'Chuyển khoản' || paymentMethod === 'VietQR') {
      try {
        setQrPaymentLoading(true);
        setQrPaymentData(null);

        const payload = {
          invoiceId,
          amount: parseFloat(paymentAmount),
          description: `HOTELHUB INV${invoiceId}`,
          template: 'compact'
        };
        const response = await axios.post('/api/payment/vietqr/generate', payload, {
          baseURL: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
          withCredentials: true
        });
        if (response.data && response.data.success) {
          setQrPaymentData(response.data.data || response.data);
          setShowQRPaymentModal(true);
          setShowPaymentModal(false); // Đóng modal payment gốc
        } else {
          toast.error(response.data?.message || 'Không thể tạo mã QR');
        }
      } catch (error) {
        toast.error(error.response?.data?.error || error.message || 'Lỗi khi tạo mã QR');
      } finally {
        setQrPaymentLoading(false);
      }
      return;
    }

    try {
      console.log('💰 Processing payment:', {
        invoiceId,
        amount: parseFloat(paymentAmount),
        method: paymentMethod
      });

      const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/deposit-payment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          depositAmount: parseFloat(paymentAmount),
          paymentMethod: paymentMethod,
          notes: `Thanh toán ${paymentMethod} cho hóa đơn #${invoiceId}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('Thanh toán thành công!');
          setShowPaymentModal(false);
          setPaymentAmount('');
          
          // ✅ Reload invoice data để cập nhật status
          await loadInvoiceDetails();
          
          // ✅ Notify parent component nếu có callback
          if (onProcessPayment) {
            onProcessPayment(invoiceId, {
              amount: parseFloat(paymentAmount),
              method: paymentMethod
            });
          }
        } else {
          throw new Error(result.message || 'Thanh toán thất bại');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi thanh toán');
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      toast.error(`Lỗi thanh toán: ${error.message}`);
    }
  };

  // ✅ UPDATE STATUS - Sử dụng API call trực tiếp
  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === invoice?.PaymentStatus) {
      return;
    }

    try {
      console.log('🔄 Updating invoice status:', { invoiceId, newStatus });

      const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentStatus: newStatus
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(`Cập nhật trạng thái thành công: ${newStatus}`);
          
          // ✅ Reload invoice data để cập nhật
          await loadInvoiceDetails();
          
          // ✅ Notify parent component nếu có callback
          if (onUpdateStatus) {
            onUpdateStatus(invoiceId, newStatus);
          }
        } else {
          throw new Error(result.message || 'Cập nhật thất bại');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi cập nhật trạng thái');
      }
    } catch (error) {
      console.error('❌ Status update error:', error);
      toast.error(`Lỗi cập nhật trạng thái: ${error.message}`);
    }
  };

  // ✅ ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, onClose]);

  // ✅ Helper functions
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

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

  const getItemsByType = (type) => {
    return invoiceItems.filter(item => 
      item.ItemType && item.ItemType.toLowerCase() === type.toLowerCase()
    );
  };

  // ✅ Handle print
  const handlePrint = () => {
    console.log('🖨️ Print button clicked, preparing invoice data...');
    
    if (!invoice) {
      console.error('❌ No invoice data available for printing');
      return;
    }

    // ✅ Tạo object dữ liệu đầy đủ cho InvoicePrint component
    const printData = {
      // Basic invoice info
      InvoiceID: invoice.InvoiceID,
      BookingID: invoice.BookingID,
      CreateAt: invoice.CreateAt,
      TotalAmount: invoice.TotalAmount,
      PaymentStatus: invoice.PaymentStatus,
      PaidAmount: invoice.PaidAmount || 0,
      RemainingAmount: invoice.RemainingAmount || invoice.TotalAmount,

      // Guest info
      GuestName: customer.name || invoice.WalkInGuestName || invoice.CustomerName || 'N/A',
      GuestEmail: customer.email || invoice.WalkInGuestEmail || invoice.CustomerEmail || 'N/A',
      GuestPhone: customer.phone || invoice.WalkInGuestPhone || invoice.CustomerPhone || 'N/A',
      GuestType: invoice.BookingType === 0 ? 'Walk-in' : 'Online',

      // Booking details
      CheckInDate: invoice.CheckInDate,
      CheckOutDate: invoice.CheckOutDate,
      NumberOfGuest: invoice.NumberOfGuest || invoice.numberOfGuest,
      SpecialRequest: invoice.SpecialRequest,

      // Receptionist info
      ReceptionistName: invoice.ReceptionistName || 'N/A',
      ReceptionistEmail: invoice.ReceptionistEmail || 'N/A',

      // ✅ Items breakdown - sử dụng dữ liệu đã load
      RoomItems: roomItems || [],
      ServiceItems: serviceItems || [],
      PromotionItems: promotionItems || [],
      FeeItems: feeItems || [],

      // ✅ Pricing breakdown - tính toán từ items
      RoomSubtotal: roomTotal,
      ServiceSubtotal: serviceTotal,
      LateCheckoutFee: feeTotal,
      PromotionDiscount: promotionDiscount,
      Subtotal: roomTotal + serviceTotal + feeTotal,
      FinalTotal: invoice.TotalAmount,

      // Hotel info
      HotelInfo: {
        name: 'HOTELHUB',
        address: 'FPT University, Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất, Hà Nội',
        phone: '0865.124.996',
        email: 'dallthe194235@gmail.com'
      }
    };

    console.log('✅ Print data prepared:', {
      hasInvoiceID: !!printData.InvoiceID,
      hasGuestName: !!printData.GuestName,
      roomItemsCount: printData.RoomItems.length,
      serviceItemsCount: printData.ServiceItems.length,
      totalAmount: printData.TotalAmount
    });

    setShowPrintModal(true);
  };

  const handleClosePrintModal = () => {
    setShowPrintModal(false);
  };

  // ✅ KHÔNG RENDER NẾU KHÔNG MỞ
  if (!isOpen) {
    return null;
  }

  // ✅ Calculate totals
  const roomItems = getItemsByType('Room');
  const serviceItems = getItemsByType('Service');
  const promotionItems = getItemsByType('Promotion');
  const feeItems = getItemsByType('Fee');

  const roomTotal = roomItems.reduce((sum, item) => sum + (item.SubTotal || 0), 0);
  const serviceTotal = serviceItems.reduce((sum, item) => sum + (item.SubTotal || 0), 0);
  const promotionDiscount = Math.abs(promotionItems.reduce((sum, item) => sum + (item.SubTotal || 0), 0));
  const feeTotal = feeItems.reduce((sum, item) => sum + (item.SubTotal || 0), 0);

  const customer = invoice && invoice.customerInfo ? invoice.customerInfo : {};

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
          {/* ✅ Header - Match RoomSelectionModal */}
          <div className={styles.modalHeader}>
            <h4>
              <i className="fas fa-file-invoice-dollar"></i>
              Chi tiết hóa đơn #{invoiceId}
            </h4>
            <button
              className={styles.modalCloseBtn}
              onClick={onClose}
              aria-label="Đóng modal"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* ✅ Body with clean states */}
          <div className={styles.modalBody}>
            {loading && (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <h4>Đang tải thông tin hóa đơn...</h4>
                <p>Vui lòng chờ trong giây lát</p>
              </div>
            )}

            {error && !loading && (
              <div className={styles.errorState}>
                <i className="fas fa-exclamation-triangle"></i>
                <h4>Lỗi tải dữ liệu</h4>
                <p>{error}</p>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => loadInvoiceDetails()}
                >
                  <i className="fas fa-redo"></i>
                  Thử lại
                </button>
              </div>
            )}

            {!loading && !error && invoice && (
              <>
                {/* ✅ Tabs - Clean style */}
                <div className={styles.tabsContainer}>
                  <button
                    className={`${styles.tab} ${activeTab === 'details' ? styles.active : ''}`}
                    onClick={() => setActiveTab('details')}
                  >
                    <i className="fas fa-info-circle"></i>
                    Thông tin chi tiết
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'items' ? styles.active : ''}`}
                    onClick={() => setActiveTab('items')}
                  >
                    <i className="fas fa-list"></i>
                    Danh sách mục
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'payments' ? styles.active : ''}`}
                    onClick={() => setActiveTab('payments')}
                  >
                    <i className="fas fa-credit-card"></i>
                    Lịch sử thanh toán
                  </button>
                </div>

                {/* ✅ Tab Content */}
                <div className={styles.tabContent}>
                  {activeTab === 'details' && (
                    <div className={styles.detailsTab}>
                      <div className={styles.invoiceOverview}>
                        <div className={styles.overviewLeft}>
                          <div className={styles.invoiceInfo}>
                            <h4>
                              <i className="fas fa-file-invoice"></i>
                              Thông tin hóa đơn
                            </h4>
                            <div className={styles.infoGrid}>
                              <div className={styles.infoItem}>
                                <span className={styles.label}>Mã hóa đơn:</span>
                                <span className={styles.value}>#{invoice.InvoiceID}</span>
                              </div>
                              <div className={styles.infoItem}>
                                <span className={styles.label}>Booking ID:</span>
                                <span className={styles.value}>#{invoice.BookingID}</span>
                              </div>
                              <div className={styles.infoItem}>
                                <span className={styles.label}>Ngày tạo:</span>
                                <span className={styles.value}>{formatDate(invoice.CreateAt)}</span>
                              </div>
                              <div className={styles.infoItem}>
                                <span className={styles.label}>Trạng thái:</span>
                                <span className={styles.value}>
                                  <InvoiceStatusBadge status={invoice.PaymentStatus} size="normal" />
                                </span>
                              </div>
                            </div>
                          </div>

                          {invoice.numberOfGuest && (
                            <div className={styles.guestInfo}>
                              <h4>
                                <i className="fas fa-users"></i>
                                Thông tin khách
                              </h4>
                              <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                  <span className={styles.label}>Số lượng khách:</span>
                                  <span className={styles.value}>{invoice.numberOfGuest} người</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Thông tin khách hàng */}
                          <div className={styles.customerInfo}>
                            <h4>
                              <i className="fas fa-user"></i>
                              Thông tin khách hàng
                            </h4>
                            <div className={styles.infoGrid}>
                              <div className={styles.infoItem}>
                                <span className={styles.label}>Họ tên:</span>
                                <span className={styles.value}>{customer.name || 'N/A'}</span>
                              </div>
                              <div className={styles.infoItem}>
                                <span className={styles.label}>Email:</span>
                                <span className={styles.value}>{customer.email || 'N/A'}</span>
                              </div>
                              <div className={styles.infoItem}>
                                <span className={styles.label}>Số điện thoại:</span>
                                <span className={styles.value}>{customer.phone || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={styles.overviewRight}>
                          <div className={styles.paymentSummary}>
                            <h4>
                              <i className="fas fa-calculator"></i>
                              Tóm tắt thanh toán
                            </h4>
                            <div className={styles.summaryItem}>
                              <span>Tổng tiền:</span>
                              <span className={styles.amount}>{formatCurrency(invoice.TotalAmount)}</span>
                            </div>
                            <div className={styles.summaryItem}>
                              <span>Đã thanh toán:</span>
                              <span className={`${styles.amount} ${styles.paid}`}>{formatCurrency(invoice.PaidAmount || 0)}</span>
                            </div>
                            <div className={styles.summaryItem}>
                              <span>Còn lại:</span>
                              <span className={`${styles.amount} ${styles.remaining}`}>{formatCurrency(invoice.RemainingAmount || 0)}</span>
                            </div>
                          </div>

                          <div className={styles.quickActions}>
                            <h4>
                              <i className="fas fa-bolt"></i>
                              Thao tác nhanh
                            </h4>
                            <div className={styles.actionButtons}>
                              {invoice.PaymentStatus === 'Pending' && (
                                <button 
                                  className={styles.actionBtnSuccess}
                                  onClick={() => setShowPaymentModal(true)}
                                >
                                  <i className="fas fa-credit-card"></i>
                                  Thanh toán
                                </button>
                              )}
                              
                              {invoice.PaymentStatus === 'Partial' && (
                                <button 
                                  className={styles.actionBtnWarning}
                                  onClick={() => setShowPaymentModal(true)}
                                >
                                  <i className="fas fa-credit-card"></i>
                                  Thanh toán tiếp
                                </button>
                              )}

                              <button
                                className={styles.actionBtnInfo}
                                onClick={handlePrint}
                                disabled={loading}
                              >
                                <i className="fas fa-print"></i>
                                In hóa đơn
                              </button>
                              
                              <div className={styles.statusActions}>
                                <label>Cập nhật trạng thái:</label>
                                <select 
                                  value={invoice.PaymentStatus}
                                  onChange={(e) => handleStatusUpdate(e.target.value)}
                                  className={styles.statusSelect}
                                >
                                  <option value="Pending">Chưa thanh toán</option>
                                  <option value="Partial">Thanh toán một phần</option>
                                  <option value="Paid">Đã thanh toán</option>
                                  <option value="Refunded">Đã hoàn tiền</option>
                                  <option value="Cancelled">Đã hủy</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'items' && (
                    <div className={styles.itemsTab}>
                      {/* ✅ HIỂN THỊ: Room Items */}
                      {roomItems.length > 0 && (
                        <div className={styles.itemSection}>
                          <h4>
                            <i className="fas fa-bed"></i>
                            Chi tiết phòng ({roomItems.length})
                          </h4>
                          <div className={styles.itemsGrid}>
                            {roomItems.map((item, index) => (
                              <div key={index} className={styles.itemCard}>
                                <div className={styles.itemHeader}>
                                  <i className="fas fa-door-open"></i>
                                  <span className={styles.itemName}>{item.ItemName}</span>
                                </div>
                                <div className={styles.itemDetails}>
                                  <div className={styles.itemRow}>
                                    <span>Số lượng:</span>
                                    <span>{item.Quantity} đêm</span>
                                  </div>
                                  <div className={styles.itemRow}>
                                    <span>Đơn giá:</span>
                                    <span>{formatCurrency(item.UnitPrice)}/đêm</span>
                                  </div>
                                  <div className={styles.itemRow}>
                                    <span>Thành tiền:</span>
                                    <strong>{formatCurrency(item.SubTotal)}</strong>
                                  </div>
                                </div>
                                {item.Description && (
                                  <div className={styles.itemDescription}>{item.Description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ✅ HIỂN THỊ: Service Items */}
                      {serviceItems.length > 0 && (
                        <div className={styles.itemSection}>
                          <h4>
                            <i className="fas fa-concierge-bell"></i>
                            Chi tiết dịch vụ ({serviceItems.length})
                          </h4>
                          <div className={styles.itemsGrid}>
                            {serviceItems.map((item, index) => (
                              <div key={index} className={styles.itemCard}>
                                <div className={styles.itemHeader}>
                                  <i className="fas fa-spa"></i>
                                  <span className={styles.itemName}>{item.ItemName}</span>
                                </div>
                                <div className={styles.itemDetails}>
                                  <div className={styles.itemRow}>
                                    <span>Số lượng:</span>
                                    <span>{item.Quantity}</span>
                                  </div>
                                  <div className={styles.itemRow}>
                                    <span>Đơn giá:</span>
                                    <span>{formatCurrency(item.UnitPrice)}</span>
                                  </div>
                                  <div className={styles.itemRow}>
                                    <span>Thành tiền:</span>
                                    <strong>{formatCurrency(item.SubTotal)}</strong>
                                  </div>
                                </div>
                                {item.Description && (
                                  <div className={styles.itemDescription}>{item.Description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ✅ HIỂN THỊ: Promotion Items */}
                      {promotionItems.length > 0 && (
                        <div className={styles.itemSection}>
                          <h4>
                            <i className="fas fa-tags"></i>
                            Khuyến mãi ({promotionItems.length})
                          </h4>
                          <div className={styles.itemsGrid}>
                            {promotionItems.map((item, index) => (
                              <div key={index} className={`${styles.itemCard} ${styles.promotionCard}`}>
                                <div className={styles.itemHeader}>
                                  <i className="fas fa-percent"></i>
                                  <span className={styles.itemName}>{item.ItemName}</span>
                                </div>
                                <div className={styles.itemDetails}>
                                  <div className={styles.itemRow}>
                                    <span>Loại:</span>
                                    <span className={styles.promotionBadge}>Khuyến mãi</span>
                                  </div>
                                  <div className={styles.itemRow}>
                                    <span>Giảm giá:</span>
                                    <strong className={styles.discountAmount}>
                                      -{formatCurrency(Math.abs(item.SubTotal))}
                                    </strong>
                                  </div>
                                </div>
                                {item.Description && (
                                  <div className={styles.itemDescription}>{item.Description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ✅ HIỂN THỊ: Empty state */}
                      {invoiceItems.length === 0 && (
                        <div className={styles.emptyItems}>
                          <i className="fas fa-inbox"></i>
                          <h5>Không có mục nào</h5>
                          <p>Hóa đơn này chưa có chi tiết mục nào.</p>
                        </div>
                      )}

                      {/* ✅ HIỂN THỊ: Grand Total Summary */}
                      <div className={styles.grandTotalSection}>
                        <div className={styles.totalBreakdown}>
                          <div className={styles.breakdownRow}>
                            <span>Tổng phòng:</span>
                            <span>{formatCurrency(roomTotal)}</span>
                          </div>
                          {serviceTotal > 0 && (
                            <div className={styles.breakdownRow}>
                              <span>Tổng dịch vụ:</span>
                              <span>{formatCurrency(serviceTotal)}</span>
                            </div>
                          )}
                          {promotionDiscount > 0 && (
                            <div className={`${styles.breakdownRow} ${styles.discountRow}`}>
                              <span>Tổng giảm giá:</span>
                              <span>-{formatCurrency(promotionDiscount)}</span>
                            </div>
                          )}
                          <div className={`${styles.breakdownRow} ${styles.grandTotalRow}`}>
                            <span>Tổng cộng:</span>
                            <strong>{formatCurrency(invoice?.TotalAmount || 0)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className={styles.paymentsTab}>
                      <div className={styles.paymentSummaryCard}>
                        <h4>
                          <i className="fas fa-chart-pie"></i>
                          Tóm tắt thanh toán
                        </h4>
                        <div className={styles.paymentStats}>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Tổng tiền:</span>
                            <span className={styles.statValue}>{formatCurrency(invoice.TotalAmount)}</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Đã thanh toán:</span>
                            <span className={`${styles.statValue} ${styles.paid}`}>{formatCurrency(invoice.PaidAmount || 0)}</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Còn lại:</span>
                            <span className={`${styles.statValue} ${styles.remaining}`}>{formatCurrency(invoice.RemainingAmount || 0)}</span>
                          </div>
                          <div className={styles.statItem}>
                            <span className={styles.statLabel}>Tỷ lệ thanh toán:</span>
                            <span className={styles.statValue}>
                              {((invoice.PaidAmount || 0) / invoice.TotalAmount * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.paymentHistory}>
                        <h4>
                          <i className="fas fa-history"></i>
                          Lịch sử thanh toán
                        </h4>
                        {paymentHistory.length > 0 ? (
                          <div className={styles.paymentList}>
                            {paymentHistory.map((payment, index) => (
                              <div key={index} className={styles.paymentItem}>
                                <div className={styles.paymentInfo}>
                                  <div className={styles.paymentHeader}>
                                    <span className={styles.paymentMethod}>
                                      <i className={`fas ${payment.PaymentMethod === 'Cash' ? 'fa-money-bill-wave' : 'fa-credit-card'}`}></i>
                                      {payment.PaymentMethod}
                                    </span>
                                    <span className={styles.paymentDate}>
                                      {formatDate(payment.PaymentDate)}
                                    </span>
                                  </div>
                                  <div className={styles.paymentDetails}>
                                    <span className={styles.paymentAmount}>
                                      {formatCurrency(payment.Amount)}
                                    </span>
                                    <span className={`${styles.paymentStatus} ${styles[payment.Status?.toLowerCase()]}`}>
                                      {payment.Status}
                                    </span>
                                  </div>
                                  {payment.TransactionID && (
                                    <div className={styles.transactionId}>
                                      Mã GD: {payment.TransactionID}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.emptyPayments}>
                            <i className="fas fa-receipt"></i>
                            <p>Chưa có lịch sử thanh toán</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Payment Modal */}
          {showPaymentModal && (
            <div className={styles.paymentModalOverlay} onClick={() => setShowPaymentModal(false)}>
              <div className={styles.paymentModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.paymentModalHeader}>
                  <h4>
                    <i className="fas fa-credit-card"></i>
                    Xử lý thanh toán
                  </h4>
                  <button onClick={() => setShowPaymentModal(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className={styles.paymentModalBody}>
                  <div className={styles.paymentInfo}>
                    <p>Tổng tiền: <strong>{formatCurrency(invoice?.TotalAmount)}</strong></p>
                    <p>Đã thanh toán: <strong>{formatCurrency(invoice?.PaidAmount || 0)}</strong></p>
                    <p>Còn lại: <strong>{formatCurrency(invoice?.RemainingAmount || 0)}</strong></p>
                  </div>
                  
                  <div className={styles.paymentForm}>
                    <div className={styles.formGroup}>
                      <label>Phương thức thanh toán:</label>
                      <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={styles.formControl}
                      >
                        <option value="Cash">Tiền mặt</option>
                        <option value="Card">Thẻ</option>
                        <option value="Transfer">Chuyển khoản</option>
                      </select>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Số tiền thanh toán:</label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min={1}
                        max={invoice?.RemainingAmount || 0}
                        className={styles.formControl}
                        placeholder="Nhập số tiền thanh toán"
                      />
                    </div>
                  </div>

                  <div className={styles.paymentModalFooter}>
                    <button 
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={handleProcessPayment}
                      disabled={qrLoading}
                    >
                      {qrLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check"></i>
                          Xác nhận thanh toán
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Print Modal */}
          {showPrintModal && (
            <InvoicePrint 
              isOpen={showPrintModal}
              onClose={handleClosePrintModal}
              invoiceData={invoice ? {
                // Basic invoice info
                InvoiceID: invoice.InvoiceID,
                BookingID: invoice.BookingID,
                CreateAt: invoice.CreateAt,
                TotalAmount: invoice.TotalAmount,
                PaymentStatus: invoice.PaymentStatus,
                PaidAmount: invoice.PaidAmount || 0,
                RemainingAmount: invoice.RemainingAmount || invoice.TotalAmount,

                // Guest info
                GuestName: customer.name || invoice.WalkInGuestName || invoice.CustomerName || 'N/A',
                GuestEmail: customer.email || invoice.WalkInGuestEmail || invoice.CustomerEmail || 'N/A',
                GuestPhone: customer.phone || invoice.WalkInGuestPhone || invoice.CustomerPhone || 'N/A',
                GuestType: invoice.BookingType === 0 ? 'Walk-in' : 'Online',

                // Booking details
                CheckInDate: invoice.CheckInDate,
                CheckOutDate: invoice.CheckOutDate,
                NumberOfGuest: invoice.NumberOfGuest || invoice.numberOfGuest,
                SpecialRequest: invoice.SpecialRequest,

                // Receptionist info
                ReceptionistName: invoice.ReceptionistName || 'N/A',
                ReceptionistEmail: invoice.ReceptionistEmail || 'N/A',

                // Items breakdown
                RoomItems: roomItems || [],
                ServiceItems: serviceItems || [],
                PromotionItems: promotionItems || [],
                FeeItems: feeItems || [],

                // Pricing breakdown
                RoomSubtotal: roomTotal,
                ServiceSubtotal: serviceTotal,
                LateCheckoutFee: feeTotal,
                PromotionDiscount: promotionDiscount,
                Subtotal: roomTotal + serviceTotal + feeTotal,
                FinalTotal: invoice.TotalAmount,

                // Hotel info
                HotelInfo: {
                  name: 'HOTELHUB',
                  address: 'FPT University, Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất, Hà Nội',
                  phone: '0865.124.996',
                  email: 'dallthe194235@gmail.com'
                }
              } : null}
              loading={loading}
            />
          )}

          {/* QR Modal - VietQR */}
          {showQRModal && qrData && (
            <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
              <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
                <div className="qr-modal-header">
                  <h3>
                    <i className="fas fa-qrcode"></i>
                    Thanh toán bằng mã QR
                  </h3>
                  <button className="qr-modal-close" onClick={() => setShowQRModal(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="qr-modal-body">
                  {qrLoading ? (
                    <div className="qr-loading">
                      <i className="fas fa-spinner fa-spin"></i>
                      <p>Đang tạo mã QR...</p>
                    </div>
                  ) : (
                    <div className="qr-code-container">
                      <div className="qr-code-wrapper">
                        <img
                          className="qr-code-image"
                          src={qrData.qrUrl || qrData.qrCode || qrData.qr_url || qrData.imageUrl}
                          alt="QR Code"
                        />
                      </div>
                      <div className="bank-info">
                        <h4>
                          <i className="fas fa-university"></i>
                          Thông tin chuyển khoản
                        </h4>
                        <div className="bank-details">
                          <div className="bank-detail-item">
                            <span className="label">Số tiền</span>
                            <span className="value amount">
                              {(qrData.amount || paymentAmount).toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                          <div className="bank-detail-item">
                            <span className="label">Nội dung</span>
                            <span className="value content">
                              {qrData.transferInfo?.content || qrData.description}
                            </span>
                          </div>
                          <div className="bank-detail-item">
                            <span className="label">Số tài khoản</span>
                            <span className="value">
                              {qrData.transferInfo?.accountNo || qrData.accountNo}
                            </span>
                          </div>
                          <div className="bank-detail-item">
                            <span className="label">Ngân hàng</span>
                            <span className="value">
                              {qrData.transferInfo?.bankName || qrData.bankName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="qr-modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowQRModal(false)}>
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* QR PAYMENT MODAL - tách riêng, chỉ hiển thị khi showQRPaymentModal */}
          {showQRPaymentModal && qrPaymentData && (
            <div className="qr-modal-overlay" onClick={() => setShowQRPaymentModal(false)}>
              <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
                <div className="qr-modal-header">
                  <h3>
                    <i className="fas fa-qrcode"></i>
                    Thanh toán bằng mã QR
                  </h3>
                  <button className="qr-modal-close" onClick={() => setShowQRPaymentModal(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="qr-modal-body">
                  {qrPaymentLoading ? (
                    <div className="qr-loading">
                      <i className="fas fa-spinner fa-spin"></i>
                      <p>Đang tạo mã QR...</p>
                    </div>
                  ) : (
                    <div className="qr-code-container">
                      <div className="qr-code-wrapper">
                        <img
                          className="qr-code-image"
                          src={qrPaymentData.qrUrl || qrPaymentData.qrCode || qrPaymentData.qr_url || qrPaymentData.imageUrl}
                          alt="QR Code"
                        />
                      </div>
                      <div className="bank-info">
                        <h4>
                          <i className="fas fa-university"></i>
                          Thông tin chuyển khoản
                        </h4>
                        <div className="bank-details">
                          <div className="bank-detail-item">
                            <span className="label">Số tiền</span>
                            <span className="value amount">
                              {(qrPaymentData.amount || paymentAmount).toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                          <div className="bank-detail-item">
                            <span className="label">Nội dung</span>
                            <span className="value content">
                              {qrPaymentData.transferInfo?.content || qrPaymentData.description}
                            </span>
                          </div>
                          <div className="bank-detail-item">
                            <span className="label">Số tài khoản</span>
                            <span className="value">
                              {qrPaymentData.transferInfo?.accountNo || qrPaymentData.accountNo}
                            </span>
                          </div>
                          <div className="bank-detail-item">
                            <span className="label">Ngân hàng</span>
                            <span className="value">
                              {qrPaymentData.transferInfo?.bankName || qrPaymentData.bankName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="qr-modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowQRPaymentModal(false)}>
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InvoiceDetailModal;
