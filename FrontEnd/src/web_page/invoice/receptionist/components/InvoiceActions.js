import React, { useState } from 'react';
import styles from './InvoiceActions.module.css';
import InvoicePrint from '../../components/InvoicePrint'; // ✅ Import InvoicePrint modal component

const InvoiceActions = ({ 
    invoice, 
    onView, 
    onUpdateStatus, 
    layout = 'vertical' 
}) => {
    const [loading, setLoading] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false); // ✅ State cho print modal
    const [printLoading, setPrintLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);

    // Status change options
    const statusOptions = [
        { value: 'Pending', label: 'Chưa thanh toán', icon: 'fas fa-clock', color: '#ffc107' },
        { value: 'Partial', label: 'Thanh toán một phần', icon: 'fas fa-adjust', color: '#fd7e14' },
        { value: 'Paid', label: 'Đã thanh toán', icon: 'fas fa-check-circle', color: '#28a745' },
        { value: 'Refunded', label: 'Đã hoàn tiền', icon: 'fas fa-undo', color: '#6f42c1' },
        { value: 'Cancelled', label: 'Đã hủy', icon: 'fas fa-times-circle', color: '#dc3545' }
    ];

    // Handle status change
    const handleStatusChange = async (newStatus) => {
        if (newStatus === invoice.PaymentStatus) {
            return;
        }

        setLoading(true);
        try {
            await onUpdateStatus(invoice.InvoiceID, newStatus);
            setShowStatusMenu(false);
        } catch (error) {
            console.error('Error updating invoice status:', error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ SỬA: Load invoice data cho print modal - trả về đầy đủ dữ liệu
    const loadInvoiceData = async () => {
        if (invoiceData) return invoiceData; // Return cached data if available

        setPrintLoading(true);
        try {
            console.log('🔍 Loading invoice data for print:', invoice.InvoiceID);
            
            // Fetch detailed invoice data with items
            const response = await fetch(`http://localhost:3000/api/invoices/${invoice.InvoiceID}/details`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const invoiceDetails = result.data;
                    
                    // ✅ Format data cho InvoicePrint component
                    const printData = {
                        // Basic invoice info
                        InvoiceID: invoiceDetails.InvoiceID,
                        BookingID: invoiceDetails.BookingID,
                        CreateAt: invoiceDetails.CreateAt,
                        TotalAmount: invoiceDetails.TotalAmount,
                        PaymentStatus: invoiceDetails.PaymentStatus,
                        PaidAmount: invoiceDetails.PaidAmount || 0,
                        RemainingAmount: invoiceDetails.RemainingAmount || invoiceDetails.TotalAmount,

                        // Guest info - multiple fallback sources
                        GuestName: invoiceDetails.WalkInGuestName || 
                                  invoiceDetails.CustomerName || 
                                  invoiceDetails.guestInfo?.guestName || 
                                  'N/A',
                        GuestEmail: invoiceDetails.WalkInGuestEmail || 
                                   invoiceDetails.CustomerEmail || 
                                   invoiceDetails.guestInfo?.guestEmail || 
                                   'N/A',
                        GuestPhone: invoiceDetails.WalkInGuestPhone || 
                                   invoiceDetails.CustomerPhone || 
                                   invoiceDetails.guestInfo?.guestPhoneNumber || 
                                   'N/A',

                        // Booking details
                        CheckInDate: invoiceDetails.CheckInDate,
                        CheckOutDate: invoiceDetails.CheckOutDate,
                        NumberOfGuest: invoiceDetails.NumberOfGuest,
                        SpecialRequest: invoiceDetails.SpecialRequest,

                        // Receptionist info
                        ReceptionistName: invoiceDetails.ReceptionistName || 'N/A',
                        ReceptionistEmail: invoiceDetails.ReceptionistEmail || 'N/A',

                        // ✅ Items breakdown - group by type
                        RoomItems: invoiceDetails.items?.filter(item => item.ItemType === 'Room') || [],
                        ServiceItems: invoiceDetails.items?.filter(item => item.ItemType === 'Service') || [],
                        PromotionItems: invoiceDetails.items?.filter(item => item.ItemType === 'Promotion') || [],
                        FeeItems: invoiceDetails.items?.filter(item => item.ItemType === 'Fee') || [],

                        // ✅ Calculate pricing breakdown
                        RoomSubtotal: invoiceDetails.items?.filter(item => item.ItemType === 'Room')
                            .reduce((sum, item) => sum + (item.SubTotal || 0), 0) || 0,
                        ServiceSubtotal: invoiceDetails.items?.filter(item => item.ItemType === 'Service')
                            .reduce((sum, item) => sum + (item.SubTotal || 0), 0) || 0,
                        LateCheckoutFee: invoiceDetails.items?.filter(item => item.ItemType === 'Fee')
                            .reduce((sum, item) => sum + (item.SubTotal || 0), 0) || 0,
                        PromotionDiscount: Math.abs(invoiceDetails.items?.filter(item => item.ItemType === 'Promotion')
                            .reduce((sum, item) => sum + (item.SubTotal || 0), 0) || 0),

                        // Hotel info
                        HotelInfo: {
                            name: 'HOTELHUB',
                            address: 'FPT University, Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất, Hà Nội',
                            phone: '0865.124.996',
                            email: 'dallthe194235@gmail.com'
                        }
                    };

                    console.log('✅ Invoice data loaded for print:', printData);
                    setInvoiceData(printData);
                    return printData;
                }
            }

            throw new Error('Failed to load invoice details');
        } catch (error) {
            console.error('❌ Error loading invoice data:', error);
            toast.error('Không thể tải dữ liệu hóa đơn');
            return null;
        } finally {
            setPrintLoading(false);
        }
    };

    // ✅ SỬA: Handle print preview - đảm bảo có dữ liệu trước khi mở modal
    const handlePrintPreview = async () => {
        console.log('🖨️ Print preview requested for invoice:', invoice.InvoiceID);
        
        const data = await loadInvoiceData();
        if (data) {
            setShowPrintModal(true);
        } else {
            toast.error('Không thể tải dữ liệu để in hóa đơn');
        }
    };

    // Quick actions based on current status
    const getQuickActions = () => {
        const actions = [];

        switch (invoice.PaymentStatus) {
            case 'Pending':
                actions.push({
                    label: 'Đánh dấu đã thanh toán',
                    icon: 'fas fa-check-circle',
                    color: '#28a745',
                    action: () => handleStatusChange('Paid')
                });
                break;
            case 'Partial':
                actions.push({
                    label: 'Hoàn thành thanh toán',
                    icon: 'fas fa-check-circle',
                    color: '#28a745',
                    action: () => handleStatusChange('Paid')
                });
                break;
            case 'Paid':
                actions.push({
                    label: 'Yêu cầu hoàn tiền',
                    icon: 'fas fa-undo',
                    color: '#6f42c1',
                    action: () => handleStatusChange('Refunded')
                });
                break;
            default:
                break;
        }

        return actions;
    };

    const quickActions = getQuickActions();

    // ✅ Handle view với proper logging
    const handleView = () => {
        console.log('🔍 InvoiceActions: handleView called for invoice:', invoice.InvoiceID);
        
        if (onView && typeof onView === 'function') {
            onView(invoice.InvoiceID); // ✅ Truyền ID thay vì object
        } else {
            console.error('❌ onView prop is not a function:', typeof onView);
        }
    };

    if (layout === 'horizontal') {
        return (
            <>
                <div className={`${styles.invoiceActions} ${styles.horizontal}`}>
                    <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                        onClick={handleView} // ✅ Sử dụng wrapper function
                        title="Xem chi tiết hóa đơn"
                    >
                        <i className="fas fa-eye"></i>
                    </button>
                    
                    <button
                        className={`${styles.btn} ${styles.btnOutlineSecondary} ${styles.btnSm}`}
                        onClick={handlePrintPreview}
                        disabled={loading || printLoading}
                        title="In hóa đơn"
                    >
                        {printLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-print"></i>}
                    </button>
                </div>

                {/* ✅ THAY ĐỔI: Sử dụng InvoicePrint modal component */}
                <InvoicePrint
                    isOpen={showPrintModal}
                    onClose={handleClosePrintModal}
                    invoiceData={invoiceData}
                    loading={printLoading}
                />
            </>
        );
    }

    return (
        <>
            <div className={`${styles.invoiceActions} ${styles.vertical}`}>
                {/* Main Action Buttons */}
                <div className={styles.actionButtons}>
                    <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                        onClick={handleView} // ✅ Sử dụng wrapper function
                        title="Xem chi tiết hóa đơn"
                    >
                        <i className="fas fa-eye"></i>
                    </button>
                    
                    <button
                        className={`${styles.btn} ${styles.btnOutlineSecondary} ${styles.btnSm}`}
                        onClick={handlePrintPreview}
                        disabled={loading || printLoading}
                        title="In hóa đơn"
                    >
                        {printLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-print"></i>}
                    </button>
                </div>

                {/* Quick Actions */}
                {quickActions.length > 0 && (
                    <div className={styles.quickActions}>
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                className={`${styles.btn} ${styles.btnSm} ${styles.quickAction}`}
                                style={{ 
                                    borderColor: action.color,
                                    color: action.color 
                                }}
                                onClick={action.action}
                                disabled={loading}
                                title={action.label}
                            >
                                <i className={action.icon}></i>
                            </button>
                        ))}
                    </div>
                )}

                {/* Status Dropdown */}
                <div className={styles.statusDropdown}>
                    <button
                        className={`${styles.btn} ${styles.btnOutlinePrimary} ${styles.btnSm} ${styles.dropdownToggle}`}
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        disabled={loading}
                    >
                        <i className="fas fa-exchange-alt"></i>
                        Đổi trạng thái
                    </button>
                    
                    {showStatusMenu && (
                        <div className={`${styles.dropdownMenu} ${styles.show}`}>
                            {statusOptions
                                .filter(option => option.value !== invoice.PaymentStatus)
                                .map(option => (
                                    <button
                                        key={option.value}
                                        className={styles.dropdownItem}
                                        onClick={() => handleStatusChange(option.value)}
                                        disabled={loading}
                                    >
                                        <i 
                                            className={option.icon} 
                                            style={{ color: option.color }}
                                        ></i>
                                        {option.label}
                                    </button>
                                ))
                            }
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ THAY ĐỔI: Sử dụng InvoicePrint modal component */}
            <InvoicePrint
                isOpen={showPrintModal}
                onClose={handleClosePrintModal}
                invoiceData={invoiceData}
                loading={printLoading}
            />
        </>
    );
};

export default InvoiceActions;