import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './ReceptionistInvoiceList.module.css';
import InvoiceFilters from './components/InvoiceFilters';
import InvoiceTable from './components/InvoiceTable';
import { useInvoiceManagement } from './hooks/useInvoiceManagement';
import { useInvoiceFilters } from './hooks/useInvoiceFilters';

const ReceptionistInvoiceList = () => {
    const { user, isReceptionist, isManager } = useAuth();
    const navigate = useNavigate();
    
    const {
        invoices,
        allInvoices,
        filteredInvoices,
        loading,
        error,
        pagination,
        fetchInvoices,
        refreshInvoices,
        updateInvoiceStatus,
        createInvoiceForBooking,
        changePage,
        changePageSize,
        applyFilters
    } = useInvoiceManagement();

    const {
        filters,
        updateFilter,
        resetFilters,
        getActiveFiltersCount
    } = useInvoiceFilters();

    const [selectedInvoices, setSelectedInvoices] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState('table');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!isReceptionist && !isManager) {
            navigate('/unauthorized');
            return;
        }
    }, [user, navigate, isReceptionist, isManager]);

    // ✅ SỬA: CHỈ load data 1 lần khi component mount hoặc search/status thay đổi
    useEffect(() => {
        console.log('🔄 Loading data due to search/status change:', {
            search: filters.search,
            status: filters.status
        });
        
        fetchInvoices({
            search: filters.search,
            status: filters.status
        });
    }, [filters.search, filters.status]); // ✅ QUAN TRỌNG: CHỈ dependency này

    // ✅ SỬA: Apply client-side filters khi filters khác thay đổi
    useEffect(() => {
        console.log('🔍 Applying client-side filters:', {
            dateRange: filters.dateRange,
            startDate: filters.startDate,
            endDate: filters.endDate,
            amountRange: filters.amountRange,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
        });
        
        applyFilters(filters);
    }, [filters.dateRange, filters.startDate, filters.endDate, filters.amountRange, filters.sortBy, filters.sortOrder]);

    // ✅ SỬA: Pagination handlers CHỈ gọi changePage/changePageSize
    const handlePageChange = (newPage) => {
        console.log('🔄 ReceptionistInvoiceList: Changing to page:', newPage);
        changePage(newPage); // CHỈ gọi changePage, KHÔNG gọi updateFilter
    };

    const handlePageSizeChange = (newPageSize) => {
        console.log('📏 ReceptionistInvoiceList: Changing page size to:', newPageSize);
        changePageSize(newPageSize); // CHỈ gọi changePageSize, KHÔNG gọi updateFilter
    };

    // ✅ GIỮ NGUYÊN: Các handlers khác
    const handleInvoiceSelect = (invoiceId, isSelected) => {
        if (isSelected) {
            setSelectedInvoices([...selectedInvoices, invoiceId]);
        } else {
            setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId));
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        try {
            for (const invoiceId of selectedInvoices) {
                await updateInvoiceStatus(invoiceId, newStatus);
            }
            setSelectedInvoices([]);
        } catch (error) {
            console.error('Error updating bulk status:', error);
        }
    };

    const handleViewInvoice = (invoiceId) => {
        console.log('View invoice:', invoiceId);
    };

    const handleCreateInvoice = async (bookingId) => {
        try {
            await createInvoiceForBooking(bookingId);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating invoice:', error);
        }
    };

    const stats = {
        total: filteredInvoices.length,
        pending: filteredInvoices.filter(inv => inv.PaymentStatus === 'Pending').length,
        paid: filteredInvoices.filter(inv => inv.PaymentStatus === 'Paid').length,
        partial: filteredInvoices.filter(inv => inv.PaymentStatus === 'Partial').length,
        currentPageSize: pagination.pageSize,
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        showing: invoices.length
    };

    console.log('📊 ReceptionistInvoiceList render state:', {
        allInvoicesCount: allInvoices.length,
        filteredInvoicesCount: filteredInvoices.length,
        currentPageInvoicesCount: invoices.length,
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        loading,
        error,
        stats
    });

    if (error) {
        return (
            <div className={styles.receptionistInvoicePage}>
                <div className={styles.pageContainer}>
                    <div className={styles.errorContainer}>
                        <div className={styles.errorContent}>
                            <i className="fas fa-exclamation-triangle"></i>
                            <h3>Lỗi tải dữ liệu</h3>
                            <p>{error}</p>
                            <button 
                                className="btn btn-primary"
                                onClick={() => fetchInvoices()}
                            >
                                <i className="fas fa-redo me-2"></i>
                                Thử lại
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.receptionistInvoicePage}>
            <div className={styles.pageContainer}>
                <div className={styles.pageHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleLeft}>
                            <div className={styles.titleIcon}>
                                <i className="fas fa-file-invoice-dollar"></i>
                            </div>
                            <div>
                                <h1 className={styles.titleText}>Quản lý hóa đơn</h1>
                                <p className={styles.titleSubtext}>
                                    Hiển thị {stats.showing} / {stats.total} hóa đơn
                                    {getActiveFiltersCount() > 0 && ` (đã lọc từ ${allInvoices.length} tổng)`}
                                </p>
                            </div>
                        </div>
                        <div className={styles.titleRight}>
                            <button 
                                className={styles.headerBtn}
                                onClick={() => setShowCreateModal(true)}
                            >
                                <i className="fas fa-plus"></i>
                                Tạo hóa đơn
                            </button>
                            <button 
                                className={`${styles.headerBtn} ${styles.headerBtnPrimary}`}
                                onClick={refreshInvoices}
                                disabled={loading}
                            >
                                <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                                Làm mới
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.statsOverview}>
                    <div className={`${styles.statCard} ${styles.statCardTotal}`}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Tổng hóa đơn</span>
                            <div className={styles.statIcon}>
                                <i className="fas fa-file-invoice"></i>
                            </div>
                        </div>
                        <h3 className={styles.statValue}>{stats.total}</h3>
                        <p className={styles.statSubvalue}>
                            Trang {stats.currentPage}/{stats.totalPages}
                        </p>
                    </div>

                    <div className={`${styles.statCard} ${styles.statCardPending}`}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Chưa thanh toán</span>
                            <div className={styles.statIcon}>
                                <i className="fas fa-clock"></i>
                            </div>
                        </div>
                        <h3 className={styles.statValue}>{stats.pending}</h3>
                        <p className={styles.statSubvalue}>
                            {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% tổng số
                        </p>
                    </div>

                    <div className={`${styles.statCard} ${styles.statCardPaid}`}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Đã thanh toán</span>
                            <div className={styles.statIcon}>
                                <i className="fas fa-check-circle"></i>
                            </div>
                        </div>
                        <h3 className={styles.statValue}>{stats.paid}</h3>
                        <p className={styles.statSubvalue}>
                            {stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}% tổng số
                        </p>
                    </div>

                    <div className={`${styles.statCard} ${styles.statCardPartial}`}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Thanh toán một phần</span>
                            <div className={styles.statIcon}>
                                <i className="fas fa-adjust"></i>
                            </div>
                        </div>
                        <h3 className={styles.statValue}>{stats.partial}</h3>
                        <p className={styles.statSubvalue}>
                            {stats.total > 0 ? Math.round((stats.partial / stats.total) * 100) : 0}% tổng số
                        </p>
                    </div>
                </div>

                <div className={styles.mainContent}>
                    <InvoiceFilters 
                        filters={filters}
                        onFilterChange={updateFilter}
                        onReset={resetFilters}
                        activeFiltersCount={getActiveFiltersCount()}
                        loading={loading}
                    />
                    
                    <InvoiceTable 
                        invoices={invoices}
                        loading={loading}
                        error={error}
                        onView={handleViewInvoice}
                        onUpdateStatus={updateInvoiceStatus}
                        pagination={pagination}
                        onPageChange={handlePageChange} // ✅ Clean handler
                        onPageSizeChange={handlePageSizeChange} // ✅ Clean handler
                        selectedInvoices={selectedInvoices}
                        onInvoiceSelect={handleInvoiceSelect}
                        onBulkAction={handleBulkStatusUpdate}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReceptionistInvoiceList;