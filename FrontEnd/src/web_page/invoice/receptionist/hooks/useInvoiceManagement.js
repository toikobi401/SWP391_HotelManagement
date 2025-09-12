import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export const useInvoiceManagement = () => {
    const [allInvoices, setAllInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });

    // ✅ THÊM: Định nghĩa applyClientSideFilters TRƯỚC khi sử dụng
    const applyClientSideFilters = useCallback((invoices, filters) => {
        let filtered = [...invoices];

        // Date range filtering
        if (filters.startDate && filters.endDate) {
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);

            filtered = filtered.filter(invoice => {
                const invoiceDate = new Date(invoice.CreateAt);
                return invoiceDate >= startDate && invoiceDate <= endDate;
            });
        }

        // Amount range filtering
        if (filters.amountRange) {
            filtered = filtered.filter(invoice => {
                const amount = invoice.TotalAmount;
                switch (filters.amountRange) {
                    case '0-500000':
                        return amount < 500000;
                    case '500000-1000000':
                        return amount >= 500000 && amount < 1000000;
                    case '1000000-2000000':
                        return amount >= 1000000 && amount < 2000000;
                    case '2000000-5000000':
                        return amount >= 2000000 && amount < 5000000;
                    case '5000000+':
                        return amount >= 5000000;
                    default:
                        return true;
                }
            });
        }

        // Sorting
        if (filters.sortBy) {
            filtered.sort((a, b) => {
                const aValue = a[filters.sortBy];
                const bValue = b[filters.sortBy];
                const direction = filters.sortOrder === 'desc' ? -1 : 1;

                if (aValue < bValue) return -1 * direction;
                if (aValue > bValue) return 1 * direction;
                return 0;
            });
        }

        return filtered;
    }, []);

    // ✅ THÊM: Update pagination info
    const updatePaginationInfo = useCallback((filteredData, page, pageSize) => {
        const totalCount = filteredData.length;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const currentPage = Math.min(Math.max(page, 1), totalPages);

        console.log('📊 updatePaginationInfo:', {
            totalCount,
            totalPages,
            currentPage,
            pageSize
        });

        setPagination({
            currentPage,
            pageSize,
            totalCount,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
        });
    }, []);

    // ✅ Fetch invoices - SAU KHI đã khai báo applyClientSideFilters và updatePaginationInfo
    const fetchInvoices = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            
            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);

            console.log('🔍 Fetching all invoices with filters:', filters);

            const response = await fetch(`http://localhost:3000/api/invoices?${params}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const invoices = data.data || [];
                setAllInvoices(invoices);
                
                const filtered = applyClientSideFilters(invoices, filters);
                setFilteredInvoices(filtered);
                
                updatePaginationInfo(filtered, pagination.currentPage, pagination.pageSize);
                
                console.log('✅ Invoices loaded successfully:', {
                    total: invoices.length,
                    filtered: filtered.length,
                    currentPage: pagination.currentPage,
                    pageSize: pagination.pageSize
                });
            } else {
                throw new Error(data.message || 'Lỗi khi tải danh sách hóa đơn');
            }
        } catch (err) {
            console.error('❌ Error fetching invoices:', err);
            setError(err.message);
            setAllInvoices([]);
            setFilteredInvoices([]);
        } finally {
            setLoading(false);
        }
    }, [applyClientSideFilters, updatePaginationInfo, pagination.currentPage, pagination.pageSize]);

    // ✅ Get paginated invoices
    const getPaginatedInvoices = useCallback(() => {
        const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const paginated = filteredInvoices.slice(startIndex, endIndex);
        
        console.log('📄 Getting paginated invoices:', {
            currentPage: pagination.currentPage,
            pageSize: pagination.pageSize,
            startIndex,
            endIndex,
            totalFiltered: filteredInvoices.length,
            paginated: paginated.length
        });
        
        return paginated;
    }, [filteredInvoices, pagination.currentPage, pagination.pageSize]);

    // ✅ Change page
    const changePage = useCallback((newPage) => {
        console.log('🔄 useInvoiceManagement: changePage called:', { 
            current: pagination.currentPage, 
            new: newPage,
            totalPages: pagination.totalPages 
        });
        
        const validPage = Math.max(1, Math.min(newPage, pagination.totalPages));
        
        if (validPage === pagination.currentPage) {
            console.log('⚠️ Page unchanged, skipping update');
            return;
        }
        
        setPagination(prev => {
            const updated = {
                ...prev,
                currentPage: validPage,
                hasNext: validPage < prev.totalPages,
                hasPrev: validPage > 1
            };
            
            console.log('✅ Pagination updated - NO API CALL:', updated);
            return updated;
        });
    }, [pagination.currentPage, pagination.totalPages]);

    // ✅ Change page size
    const changePageSize = useCallback((newPageSize) => {
        console.log('📏 useInvoiceManagement: changePageSize called:', { 
            current: pagination.pageSize, 
            new: newPageSize 
        });
        
        const validatedPageSize = Math.min(Math.max(parseInt(newPageSize) || 10, 1), 50);
        
        if (validatedPageSize === pagination.pageSize) {
            console.log('⚠️ Page size unchanged, skipping update');
            return;
        }
        
        const newTotalPages = Math.ceil(filteredInvoices.length / validatedPageSize);
        const newCurrentPage = Math.min(pagination.currentPage, newTotalPages) || 1;
        
        setPagination(prev => {
            const updated = {
                ...prev,
                pageSize: validatedPageSize,
                currentPage: newCurrentPage,
                totalPages: newTotalPages,
                hasNext: newCurrentPage < newTotalPages,
                hasPrev: newCurrentPage > 1
            };
            
            console.log('✅ Page size updated - NO API CALL:', updated);
            return updated;
        });
    }, [filteredInvoices.length, pagination.pageSize, pagination.currentPage]);

    // ✅ Apply filters
    const applyFilters = useCallback((filters) => {
        console.log('🔍 Applying client-side filters:', filters);
        
        const filtered = applyClientSideFilters(allInvoices, filters);
        setFilteredInvoices(filtered);
        
        const newTotalPages = Math.ceil(filtered.length / pagination.pageSize);
        setPagination(prev => ({
            ...prev,
            currentPage: 1,
            totalCount: filtered.length,
            totalPages: newTotalPages,
            hasNext: 1 < newTotalPages,
            hasPrev: false
        }));
        
        console.log('✅ Filters applied - NO API CALL, data filtered on client');
    }, [allInvoices, applyClientSideFilters, pagination.pageSize]);

    // ✅ Refresh invoices
    const refreshInvoices = useCallback(async () => {
        console.log('🔄 Refreshing invoices - will call API');
        await fetchInvoices();
    }, [fetchInvoices]);

    // ✅ Update invoice status
    const updateInvoiceStatus = useCallback(async (invoiceId, newStatus) => {
        try {
            console.log('🔄 Updating invoice status:', { invoiceId, newStatus });

            const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/payment-status`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paymentStatus: newStatus
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setAllInvoices(prev => 
                    prev.map(invoice => 
                        invoice.InvoiceID === invoiceId 
                            ? { ...invoice, PaymentStatus: newStatus }
                            : invoice
                    )
                );
                
                setFilteredInvoices(prev => 
                    prev.map(invoice => 
                        invoice.InvoiceID === invoiceId 
                            ? { ...invoice, PaymentStatus: newStatus }
                            : invoice
                    )
                );
                
                console.log('✅ Invoice status updated successfully');
                return { success: true };
            } else {
                throw new Error(data.message || 'Lỗi khi cập nhật trạng thái');
            }
        } catch (err) {
            console.error('❌ Error updating invoice status:', err);
            throw err;
        }
    }, []);

    // ✅ Create invoice for booking
    const createInvoiceForBooking = useCallback(async (bookingId) => {
        try {
            console.log('💾 Creating invoice for booking:', bookingId);

            const response = await fetch('http://localhost:3000/api/invoices/create-for-booking', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bookingId })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Invoice created successfully:', data);
                await refreshInvoices();
                return { success: true, data: data.data };
            } else {
                throw new Error(data.message || 'Lỗi khi tạo hóa đơn');
            }
        } catch (err) {
            console.error('❌ Error creating invoice:', err);
            throw err;
        }
    }, [refreshInvoices]);

    // ✅ Get invoice by ID
    const getInvoiceById = useCallback(async (invoiceId) => {
        try {
            const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return { success: true, data: data.data };
            } else {
                throw new Error(data.message || 'Lỗi khi lấy thông tin hóa đơn');
            }
        } catch (err) {
            console.error('❌ Error getting invoice:', err);
            throw err;
        }
    }, []);

    // ✅ Process payment
    const processPayment = useCallback(async (invoiceId, paymentData) => {
        try {
            const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/deposit-payment`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await refreshInvoices();
                return { success: true, data: data.data };
            } else {
                throw new Error(data.message || 'Lỗi khi xử lý thanh toán');
            }
        } catch (err) {
            console.error('❌ Error processing payment:', err);
            throw err;
        }
    }, [refreshInvoices]);

    return {
        // State
        invoices: getPaginatedInvoices(),
        allInvoices,
        filteredInvoices,
        loading,
        error,
        pagination,
        
        // Actions
        fetchInvoices,
        refreshInvoices,
        updateInvoiceStatus,
        createInvoiceForBooking,
        getInvoiceById,
        processPayment,
        
        // Pagination actions
        changePage,
        changePageSize,
        applyFilters
    };
};