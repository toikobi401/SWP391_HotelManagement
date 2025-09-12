import { useState, useCallback } from 'react';

export const useInvoiceFilters = () => {
    const [filters, setFilters] = useState({
        // ✅ REMOVE: page, pageSize - không cần track trong filters
        search: '',
        status: '',
        dateRange: '',
        startDate: '',
        endDate: '',
        amountRange: '',
        sortBy: 'CreateAt',
        sortOrder: 'desc'
    });

    // ✅ Update single filter
    const updateFilter = useCallback((key, value) => {
        // ✅ IGNORE page/pageSize changes trong filters
        if (key === 'page' || key === 'pageSize') {
            console.log('⚠️ Ignoring page/pageSize in filters');
            return;
        }
        
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            
            // ✅ Date range logic giữ nguyên
            if (key === 'dateRange' && value !== 'custom') {
                const now = new Date();
                let startDate = '';
                let endDate = '';
                
                switch (value) {
                    case 'today':
                        startDate = now.toISOString().split('T')[0];
                        endDate = startDate;
                        break;
                    case 'yesterday':
                        const yesterday = new Date(now);
                        yesterday.setDate(yesterday.getDate() - 1);
                        startDate = yesterday.toISOString().split('T')[0];
                        endDate = startDate;
                        break;
                    case 'this_week':
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - now.getDay());
                        startDate = startOfWeek.toISOString().split('T')[0];
                        endDate = now.toISOString().split('T')[0];
                        break;
                    case 'last_week':
                        const lastWeekStart = new Date(now);
                        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
                        const lastWeekEnd = new Date(lastWeekStart);
                        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
                        startDate = lastWeekStart.toISOString().split('T')[0];
                        endDate = lastWeekEnd.toISOString().split('T')[0];
                        break;
                    case 'this_month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                        endDate = now.toISOString().split('T')[0];
                        break;
                    case 'last_month':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                        startDate = lastMonth.toISOString().split('T')[0];
                        endDate = lastMonthEnd.toISOString().split('T')[0];
                        break;
                    default:
                        startDate = '';
                        endDate = '';
                }
                
                newFilters.startDate = startDate;
                newFilters.endDate = endDate;
            }
            
            return newFilters;
        });
    }, []);

    // ✅ GIỮ NGUYÊN: Các methods khác
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
            // page: 1 // Reset page when bulk updating
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            // không có page
            search: '',
            status: '',
            dateRange: '',
            startDate: '',
            endDate: '',
            amountRange: '',
            sortBy: 'CreateAt',
            sortOrder: 'desc'
        });
    }, []);

    // ✅ GIỮ NGUYÊN: Các utility methods
    const getActiveFiltersCount = useCallback(() => {
        let count = 0;
        
        if (filters.search) count++;
        if (filters.status) count++;
        if (filters.dateRange || (filters.startDate && filters.endDate)) count++;
        if (filters.amountRange) count++;
        if (filters.sortBy !== 'CreateAt' || filters.sortOrder !== 'desc') count++;
        
        return count;
    }, [filters]);

    const hasActiveFilters = useCallback(() => {
        return getActiveFiltersCount() > 0;
    }, [getActiveFiltersCount]);

    const getFilterSummary = useCallback(() => {
        const summary = [];
        
        if (filters.search) {
            summary.push(`Tìm kiếm: "${filters.search}"`);
        }
        
        if (filters.status) {
            const statusNames = {
                'Pending': 'Chưa thanh toán',
                'Partial': 'Thanh toán một phần',
                'Paid': 'Đã thanh toán',
                'Refunded': 'Đã hoàn tiền',
                'Cancelled': 'Đã hủy'
            };
            summary.push(`Trạng thái: ${statusNames[filters.status] || filters.status}`);
        }
        
        if (filters.dateRange) {
            const dateRangeNames = {
                'today': 'Hôm nay',
                'yesterday': 'Hôm qua',
                'this_week': 'Tuần này',
                'last_week': 'Tuần trước',
                'this_month': 'Tháng này',
                'last_month': 'Tháng trước',
                'custom': 'Tùy chỉnh'
            };
            summary.push(`Thời gian: ${dateRangeNames[filters.dateRange] || filters.dateRange}`);
        } else if (filters.startDate && filters.endDate) {
            summary.push(`Từ ${filters.startDate} đến ${filters.endDate}`);
        }
        
        if (filters.amountRange) {
            const amountRangeNames = {
                '0-500000': 'Dưới 500.000đ',
                '500000-1000000': '500.000đ - 1.000.000đ',
                '1000000-2000000': '1.000.000đ - 2.000.000đ',
                '2000000-5000000': '2.000.000đ - 5.000.000đ',
                '5000000+': 'Trên 5.000.000đ'
            };
            summary.push(`Số tiền: ${amountRangeNames[filters.amountRange] || filters.amountRange}`);
        }
        
        return summary;
    }, [filters]);

    const getQueryParams = useCallback(() => {
        const params = new URLSearchParams();
        
        // ✅ CHỈ THÊM: search và status cho API call
        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);
        
        return params;
    }, [filters]);

    return {
        filters,
        updateFilter,
        updateFilters,
        resetFilters,
        getActiveFiltersCount,
        hasActiveFilters,
        getFilterSummary,
        getQueryParams
    };
};