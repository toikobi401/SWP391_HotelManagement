import React, { useState } from 'react';
import styles from './InvoiceFilters.module.css';

const InvoiceFilters = ({
    filters,
    onFilterChange,
    onReset,
    activeFiltersCount,
    loading
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Payment status options
    const paymentStatusOptions = [
        { value: '', label: 'Tất cả trạng thái' },
        { value: 'Pending', label: 'Chưa thanh toán' },
        { value: 'Partial', label: 'Thanh toán một phần' },
        { value: 'Paid', label: 'Đã thanh toán' },
        { value: 'Refunded', label: 'Đã hoàn tiền' },
        { value: 'Cancelled', label: 'Đã hủy' }
    ];

    // Date range options
    const dateRangeOptions = [
        { value: '', label: 'Tất cả thời gian' },
        { value: 'today', label: 'Hôm nay' },
        { value: 'yesterday', label: 'Hôm qua' },
        { value: 'this_week', label: 'Tuần này' },
        { value: 'last_week', label: 'Tuần trước' },
        { value: 'this_month', label: 'Tháng này' },
        { value: 'last_month', label: 'Tháng trước' },
        { value: 'custom', label: 'Tùy chỉnh' }
    ];

    // Amount range options
    const amountRangeOptions = [
        { value: '', label: 'Tất cả mức giá' },
        { value: '0-500000', label: 'Dưới 500.000đ' },
        { value: '500000-1000000', label: '500.000đ - 1.000.000đ' },
        { value: '1000000-2000000', label: '1.000.000đ - 2.000.000đ' },
        { value: '2000000-5000000', label: '2.000.000đ - 5.000.000đ' },
        { value: '5000000+', label: 'Trên 5.000.000đ' }
    ];

    const handleFilterChange = (key, value) => {
        onFilterChange(key, value);
    };

    const handleSearchChange = (e) => {
        handleFilterChange('search', e.target.value);
    };

    const handleDateRangeChange = (value) => {
        handleFilterChange('dateRange', value);
    };

    return (
        <div className={styles.filtersContainer}>
            <div className={styles.filtersHeader}>
                <h3 className={styles.filtersTitle}>
                    <i className="fas fa-filter"></i>
                    Bộ lọc hóa đơn
                    {activeFiltersCount > 0 && (
                        <span className={styles.activeCount}>({activeFiltersCount})</span>
                    )}
                </h3>
                <button
                    className={styles.filtersToggle}
                    onClick={() => setIsExpanded(!isExpanded)}
                    disabled={loading}
                >
                    {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                </button>
            </div>

            <div className={`${styles.filtersBody} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                <div className={styles.filtersGrid}>
                    {/* Search Input */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            <i className="fas fa-search"></i>
                            Tìm kiếm
                        </label>
                        <div className={styles.searchInputGroup}>
                            <i className={styles.searchIcon}></i>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Tìm theo ID, khách hàng..."
                                value={filters.search || ''}
                                onChange={handleSearchChange}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Payment Status Filter */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            <i className="fas fa-credit-card"></i>
                            Trạng thái thanh toán
                        </label>
                        <select
                            className={styles.filterSelect}
                            value={filters.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            disabled={loading}
                        >
                            {paymentStatusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            <i className="fas fa-calendar"></i>
                            Khoảng thời gian
                        </label>
                        <select
                            className={styles.filterSelect}
                            value={filters.dateRange || ''}
                            onChange={(e) => handleDateRangeChange(e.target.value)}
                            disabled={loading}
                        >
                            {dateRangeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Date Range */}
                    {filters.dateRange === 'custom' && (
                        <>
                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>
                                    <i className="fas fa-calendar-day"></i>
                                    Từ ngày
                                </label>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={filters.startDate || ''}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>
                                    <i className="fas fa-calendar-day"></i>
                                    Đến ngày
                                </label>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={filters.endDate || ''}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    {/* Amount Range Filter */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            <i className="fas fa-dollar-sign"></i>
                            Khoảng số tiền
                        </label>
                        <select
                            className={styles.filterSelect}
                            value={filters.amountRange || ''}
                            onChange={(e) => handleFilterChange('amountRange', e.target.value)}
                            disabled={loading}
                        >
                            {amountRangeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filter Actions */}
                <div className={styles.filtersActions}>
                    <div className={styles.filtersLeft}>
                        <span className={styles.filterInfo}>
                            {activeFiltersCount > 0 && (
                                <>
                                    <i className="fas fa-filter"></i>
                                    {activeFiltersCount} bộ lọc đang áp dụng
                                </>
                            )}
                        </span>
                    </div>
                    
                    <div className={styles.filtersRight}>
                        <button
                            className={`${styles.filterBtn} ${styles.filterBtnSecondary}`}
                            onClick={onReset}
                            disabled={loading || activeFiltersCount === 0}
                        >
                            <i className="fas fa-undo"></i>
                            Đặt lại
                        </button>
                    </div>
                </div>

                {/* Active Filters Display */}
                {activeFiltersCount > 0 && (
                    <div className={styles.activeFilters}>
                        <div className={styles.activeFiltersTitle}>
                            <i className="fas fa-tags"></i>
                            Bộ lọc đang áp dụng:
                        </div>
                        <div className={styles.activeFiltersList}>
                            {filters.search && (
                                <div className={styles.activeFilter}>
                                    <i className="fas fa-search"></i>
                                    Tìm kiếm: "{filters.search}"
                                    <button
                                        className={styles.activeFilterRemove}
                                        onClick={() => handleFilterChange('search', '')}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}
                            
                            {filters.status && (
                                <div className={styles.activeFilter}>
                                    <i className="fas fa-credit-card"></i>
                                    Trạng thái: {paymentStatusOptions.find(opt => opt.value === filters.status)?.label}
                                    <button
                                        className={styles.activeFilterRemove}
                                        onClick={() => handleFilterChange('status', '')}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}
                            
                            {filters.dateRange && (
                                <div className={styles.activeFilter}>
                                    <i className="fas fa-calendar"></i>
                                    Thời gian: {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}
                                    <button
                                        className={styles.activeFilterRemove}
                                        onClick={() => handleFilterChange('dateRange', '')}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}
                            
                            {filters.amountRange && (
                                <div className={styles.activeFilter}>
                                    <i className="fas fa-dollar-sign"></i>
                                    Số tiền: {amountRangeOptions.find(opt => opt.value === filters.amountRange)?.label}
                                    <button
                                        className={styles.activeFilterRemove}
                                        onClick={() => handleFilterChange('amountRange', '')}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceFilters;