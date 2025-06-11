import React, { useState, useEffect } from 'react';
import './ShowAvailableRoom.css';

const ShowAvailableRoom = () => {
    // States
    const [allRooms, setAllRooms] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]); // ✅ THÊM STATE CHO ROOMTYPES
    const [filters, setFilters] = useState({
        priceRange: 'all',
        roomType: 'all',
        floor: 'all',
        status: 'all',
        search: ''
    });
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true); // ✅ THÊM LOADING STATE
    const itemsPerPage = 10;

    // ✅ FUNCTIONS ĐỂ LẤY THÔNG TIN TỪ ROOMTYPES
    const getRoomTypeById = (typeId) => {
        return roomTypes.find(type => type.TypeId === typeId);
    };

    const getRoomTypeName = (typeId) => {
        const roomType = getRoomTypeById(typeId);
        return roomType ? roomType.TypeName : `Loại phòng ${typeId}`;
    };

    const getBasePrice = (typeId) => {
        const roomType = getRoomTypeById(typeId);
        return roomType ? roomType.BasePrice : 0;
    };

    const getRoomTypeDescription = (typeId) => {
        const roomType = getRoomTypeById(typeId);
        return roomType ? roomType.Description : '';
    };

    // ✅ CẬP NHẬT FILTER OPTIONS SỬ DỤNG ROOMTYPES ĐỘNG
    const getFilterOptions = () => {
        const roomTypeOptions = roomTypes.map(type => ({
            value: type.TypeId.toString(),
            label: `🏠 ${type.TypeName}`
        }));

        return {
            priceRanges: [
                { value: 'all', label: '💰 Tất cả mức giá' },
                { value: 'under-300k', label: '💵 Dưới 300.000đ' },
                { value: '300k-500k', label: '💶 300.000đ - 500.000đ' },
                { value: '500k-800k', label: '💷 500.000đ - 800.000đ' },
                { value: 'above-800k', label: '💸 Trên 800.000đ' }
            ],
            roomTypes: [
                { value: 'all', label: '🏠 Tất cả loại phòng' },
                ...roomTypeOptions
            ],
            floors: [
                { value: 'all', label: '🏢 Tất cả tầng' },
                { value: '1', label: '1️⃣ Tầng 1' },
                { value: '2', label: '2️⃣ Tầng 2' },
                { value: '3', label: '3️⃣ Tầng 3' },
                { value: '4', label: '4️⃣ Tầng 4' },
                { value: '5', label: '5️⃣ Tầng 5' }
            ],
            statuses: [
                { value: 'all', label: '📊 Tất cả trạng thái' },
                { value: 'available', label: '✅ Có sẵn' },
                { value: 'occupied', label: '🔴 Đang sử dụng' },
                { value: 'reserved', label: '🟡 Đã đặt' },
                { value: 'maintenance', label: '🔧 Bảo trì' }
            ]
        };
    };

    // Amenity translations (giữ nguyên)
    const amenityTranslations = {
        'Kitchenette': 'Bếp mini',
        'Sea view': 'View biển',
        'Jacuzzi': 'Bồn tắm sục',
        'Smart TV': 'TV thông minh',
        'Controlls tablet': 'Máy tính bảng điều khiển'
    };

    // Translation functions (giữ nguyên)
    const translateDescription = (description) => {
        if (!description) return '';
        
        const descriptionTranslations = {
            'Room with 1 single bed, suitable with low budget': 'Phòng với 1 giường đơn, phù hợp với ngân sách thấp',
            'Room with 2 double beds': 'Phòng với 2 giường đôi',
            'Room with 1 double bed': 'Phòng với 1 giường đôi',
            'Room with 2 single beds': 'Phòng với 2 giường đơn',
            'Room with 1 double bed, full of high class amenities': 'Phòng với 1 giường đôi, đầy đủ tiện nghi cao cấp',
        };
        
        if (descriptionTranslations[description]) {
            return descriptionTranslations[description];
        }
        
        const vietnameseRegex = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;
        if (vietnameseRegex.test(description)) {
            return description;
        }
        
        return description.charAt(0).toUpperCase() + description.slice(1);
    };

    const formatTranslatedDescription = (description, maxLength = 50) => {
        if (!description) return '';
        const translated = translateDescription(description);
        return translated.length > maxLength 
            ? `${translated.substring(0, maxLength)}...`
            : translated;
    };

    // ✅ CẬP NHẬT CALCULATE TOTAL PRICE SỬ DỤNG GETBASEPRICE
    const calculateTotalPrice = (typeId, amenities) => {
        const basePrice = getBasePrice(typeId);
        const amenityPrice = amenities ? amenities.length * 50000 : 0;
        return basePrice + amenityPrice;
    };

    // Status functions (giữ nguyên)
    const normalizeStatus = (status) => {
        if (!status) return 'available';
        const statusLower = status.toLowerCase().trim();
        
        const statusMap = {
            'còn trống': 'available',
            'available': 'available',
            'có sẵn': 'available',
            'empty': 'available',
            'free': 'available',
            'đang sử dụng': 'occupied',
            'occupied': 'occupied',
            'đã thuê': 'occupied',
            'in use': 'occupied',
            'busy': 'occupied',
            'đã đặt': 'reserved',
            'reserved': 'reserved',
            'booked': 'reserved',
            'pending': 'reserved',
            'bảo trì': 'maintenance',
            'maintenance': 'maintenance',
            'cleaning': 'maintenance',
            'repair': 'maintenance'
        };
        
        return statusMap[statusLower] || 'available';
    };

    const getStatusClass = (status) => {
        const normalizedStatus = normalizeStatus(status);
        switch (normalizedStatus) {
            case 'available':
                return 'status-available';
            case 'reserved':
                return 'status-reserved';
            case 'occupied':
                return 'status-occupied';
            case 'maintenance':
                return 'status-maintenance';
            default:
                return 'status-available';
        }
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <i className="fas fa-sort text-muted"></i>;
        }
        return sortConfig.direction === 'ascending' 
            ? <i className="fas fa-sort-up text-primary"></i>
            : <i className="fas fa-sort-down text-primary"></i>;
    };

    const resetFilters = () => {
        setFilters({
            priceRange: 'all',
            roomType: 'all',
            floor: 'all',
            status: 'all',
            search: ''
        });
        setSortConfig({ key: null, direction: 'ascending' });
        setCurrentPage(1);
    };

    // ✅ FETCH DATA TỪ API
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch cả rooms và room types cùng lúc
                const [roomsResponse, roomTypesResponse] = await Promise.all([
                    fetch('http://localhost:3000/api/rooms'),
                    fetch('http://localhost:3000/api/room-types')
                ]);

                if (roomsResponse.ok && roomTypesResponse.ok) {
                    const roomsData = await roomsResponse.json();
                    const roomTypesData = await roomTypesResponse.json();
                    
                    console.log('Fetched rooms data:', roomsData);
                    console.log('Fetched room types data:', roomTypesData);
                    
                    setAllRooms(roomsData);
                    setRoomTypes(roomTypesData.data || roomTypesData); // Handle different response formats
                } else {
                    console.error('Failed to fetch data');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter and sort handlers (giữ nguyên)
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.priceRange !== 'all') count++;
        if (filters.roomType !== 'all') count++;
        if (filters.floor !== 'all') count++;
        if (filters.status !== 'all') count++;
        if (filters.search.trim() !== '') count++;
        return count;
    };

    const handleSearchChange = (e) => {
        setFilters(prev => ({
            ...prev,
            search: e.target.value
        }));
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // ✅ CẬP NHẬT FILTERED AND SORTED ROOMS SỬ DỤNG GETROOMTYPENAME
    const filteredAndSortedRooms = React.useMemo(() => {
        let filtered = allRooms.filter(room => {
            // Search filter - cập nhật sử dụng getRoomTypeName
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const roomNumber = room.RoomNumber?.toString().toLowerCase() || '';
                const description = room.Description?.toLowerCase() || '';
                const roomType = getRoomTypeName(room.TypeID)?.toLowerCase() || '';
                
                if (!roomNumber.includes(searchTerm) && 
                    !description.includes(searchTerm) && 
                    !roomType.includes(searchTerm)) {
                    return false;
                }
            }

            // Price filter - sử dụng calculateTotalPrice đã cập nhật
            if (filters.priceRange !== 'all') {
                const totalPrice = calculateTotalPrice(room.TypeID, room.amenities);
                switch (filters.priceRange) {
                    case 'under-300k':
                        if (totalPrice >= 300000) return false;
                        break;
                    case '300k-500k':
                        if (totalPrice < 300000 || totalPrice >= 500000) return false;
                        break;
                    case '500k-800k':
                        if (totalPrice < 500000 || totalPrice >= 800000) return false;
                        break;
                    case 'above-800k':
                        if (totalPrice < 800000) return false;
                        break;
                }
            }

            // Room type filter
            if (filters.roomType !== 'all' && room.TypeID.toString() !== filters.roomType) {
                return false;
            }

            // Floor filter
            if (filters.floor !== 'all' && room.Floor.toString() !== filters.floor) {
                return false;
            }

            // Status filter
            if (filters.status !== 'all') {
                const normalizedStatus = normalizeStatus(room.Status);
                if (normalizedStatus !== filters.status) {
                    return false;
                }
            }

            return true;
        });

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue, bValue;
                
                switch (sortConfig.key) {
                    case 'roomNumber':
                        aValue = parseInt(a.RoomNumber) || 0;
                        bValue = parseInt(b.RoomNumber) || 0;
                        break;
                    case 'roomType':
                        aValue = getRoomTypeName(a.TypeID);
                        bValue = getRoomTypeName(b.TypeID);
                        break;
                    case 'floor':
                        aValue = a.Floor;
                        bValue = b.Floor;
                        break;
                    case 'capacity':
                        aValue = a.Capacity;
                        bValue = b.Capacity;
                        break;
                    case 'status':
                        aValue = normalizeStatus(a.Status);
                        bValue = normalizeStatus(b.Status);
                        break;
                    case 'price':
                        aValue = calculateTotalPrice(a.TypeID, a.amenities);
                        bValue = calculateTotalPrice(b.TypeID, b.amenities);
                        break;
                    default:
                        aValue = a[sortConfig.key];
                        bValue = b[sortConfig.key];
                }

                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [allRooms, filters, sortConfig, roomTypes]); // ✅ THÊM roomTypes VÀO DEPENDENCY

    // Pagination calculations
    const totalPages = Math.ceil(filteredAndSortedRooms.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentRooms = filteredAndSortedRooms.slice(startIndex, endIndex);

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortConfig]);

    // Pagination handlers
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const getPageNumbers = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta); 
             i <= Math.min(totalPages - 1, currentPage + delta); 
             i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
    };

    // Status counts
    const getStatusCounts = () => {
        const counts = {
            total: allRooms.length,
            available: 0,
            occupied: 0,
            reserved: 0,
            maintenance: 0
        };

        allRooms.forEach(room => {
            const status = normalizeStatus(room.Status);
            counts[status] = (counts[status] || 0) + 1;
        });

        return counts;
    };

    const statusCounts = getStatusCounts();
    const filterOptions = getFilterOptions(); // ✅ SỬ DỤNG FUNCTION ĐỘNG

    // ✅ THÊM LOADING STATE
    if (loading) {
        return (
            <div className="available-rooms">
                <div className="container">
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <div className="mt-3">
                            <h5>Đang tải dữ liệu phòng và loại phòng...</h5>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Rest of the component remains the same, just update room type display
    return (
        <section className="available-rooms">
            <div className="container">
                {/* Header */}
                <div className="section-heading text-center mb-4">
                    <h2>🏨 Quản lý phòng khách sạn</h2>
                    <div className="contact-info">
                        <i className="fas fa-phone text-primary"></i>
                        <span className="ms-2">Hotline: +84 123 456 789</span>
                        <span className="mx-3">|</span>
                        <i className="fas fa-envelope text-primary"></i>
                        <span className="ms-2">Email: hotel@example.com</span>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="stats-summary card mb-4">
                    <div className="card-body">
                        <div className="row text-center">
                            <div className="col-md-2 col-6">
                                <div className="stat-item">
                                    <h4 className="text-primary">
                                        <i className="fas fa-bed"></i>
                                        {statusCounts.total}
                                    </h4>
                                    <small className="text-muted">Tổng phòng</small>
                                </div>
                            </div>
                            <div className="col-md-2 col-6">
                                <div className="stat-item">
                                    <h4 className="text-success">
                                        <i className="fas fa-check-circle"></i>
                                        {statusCounts.available}
                                    </h4>
                                    <small className="text-muted">Có sẵn</small>
                                </div>
                            </div>
                            <div className="col-md-2 col-6">
                                <div className="stat-item">
                                    <h4 className="text-warning">
                                        <i className="fas fa-clock"></i>
                                        {statusCounts.reserved}
                                    </h4>
                                    <small className="text-muted">Đã đặt</small>
                                </div>
                            </div>
                            <div className="col-md-2 col-6">
                                <div className="stat-item">
                                    <h4 className="text-danger">
                                        <i className="fas fa-user"></i>
                                        {statusCounts.occupied}
                                    </h4>
                                    <small className="text-muted">Đang sử dụng</small>
                                </div>
                            </div>
                            <div className="col-md-2 col-6">
                                <div className="stat-item">
                                    <h4 className="text-secondary">
                                        <i className="fas fa-tools"></i>
                                        {statusCounts.maintenance}
                                    </h4>
                                    <small className="text-muted">Bảo trì</small>
                                </div>
                            </div>
                            <div className="col-md-2 col-6">
                                <div className="stat-item">
                                    <h4 className="text-info">
                                        <i className="fas fa-list"></i>
                                        {filteredAndSortedRooms.length}
                                    </h4>
                                    <small className="text-muted">Hiển thị</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="filter-section">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">
                                    <i className="fas fa-filter me-2"></i>
                                    Bộ lọc tìm kiếm
                                </h5>
                                <div className="filter-actions d-flex align-items-center">
                                    {getActiveFiltersCount() > 0 && (
                                        <span className="badge bg-warning text-dark me-2">
                                            {getActiveFiltersCount()} bộ lọc đang áp dụng
                                        </span>
                                    )}
                                    <button 
                                        className="btn btn-outline-light btn-sm"
                                        onClick={resetFilters}
                                        title="Xóa tất cả bộ lọc"
                                    >
                                        <i className="fas fa-undo me-1"></i>
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            {/* Search Bar */}
                            <div className="row mb-3">
                                <div className="col-md-12">
                                    <label className="form-label">
                                        <i className="fas fa-search"></i>
                                        Tìm kiếm
                                    </label>
                                    <div className="input-group input-group-lg">
                                        <span className="input-group-text bg-primary text-white">
                                            <i className="fas fa-search"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Tìm theo số phòng, mô tả, loại phòng..."
                                            value={filters.search}
                                            onChange={handleSearchChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filter Controls */}
                            <div className="row">
                                <div className="col-md-3 mb-3">
                                    <label className="form-label">
                                        <i className="fas fa-dollar-sign"></i>
                                        Mức giá
                                    </label>
                                    <select
                                        className="form-control form-control-lg"
                                        value={filters.priceRange}
                                        onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                                    >
                                        {filterOptions.priceRanges.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-3 mb-3">
                                    <label className="form-label">
                                        <i className="fas fa-home"></i>
                                        Loại phòng
                                    </label>
                                    <select
                                        className="form-control form-control-lg"
                                        value={filters.roomType}
                                        onChange={(e) => handleFilterChange('roomType', e.target.value)}
                                    >
                                        {filterOptions.roomTypes.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-3 mb-3">
                                    <label className="form-label">
                                        <i className="fas fa-building"></i>
                                        Tầng
                                    </label>
                                    <select
                                        className="form-control form-control-lg"
                                        value={filters.floor}
                                        onChange={(e) => handleFilterChange('floor', e.target.value)}
                                    >
                                        {filterOptions.floors.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-3 mb-3">
                                    <label className="form-label">
                                        <i className="fas fa-info-circle"></i>
                                        Trạng thái
                                    </label>
                                    <select
                                        className="form-control form-control-lg"
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        {filterOptions.statuses.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Filters */}
                            <div className="quick-filters">
                                <small className="text-muted mb-2 d-block">Bộ lọc nhanh:</small>
                                <button 
                                    className="btn btn-outline-success btn-sm me-2 mb-2"
                                    onClick={() => handleFilterChange('status', 'available')}
                                >
                                    <i className="fas fa-check me-1"></i>
                                    Phòng trống
                                </button>
                                <button 
                                    className="btn btn-outline-warning btn-sm me-2 mb-2"
                                    onClick={() => handleFilterChange('priceRange', 'under-300k')}
                                >
                                    <i className="fas fa-tag me-1"></i>
                                    Giá rẻ
                                </button>
                                <button 
                                    className="btn btn-outline-info btn-sm me-2 mb-2"
                                    onClick={() => handleFilterChange('priceRange', 'above-800k')}
                                >
                                    <i className="fas fa-star me-1"></i>
                                    Cao cấp
                                </button>
                                <button 
                                    className="btn btn-outline-secondary btn-sm me-2 mb-2"
                                    onClick={() => handleFilterChange('floor', '1')}
                                >
                                    <i className="fas fa-arrow-down me-1"></i>
                                    Tầng 1
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Info */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                        <i className="fas fa-list me-2"></i>
                        Danh sách phòng 
                        <span className="badge bg-primary ms-2">
                            {filteredAndSortedRooms.length} phòng
                        </span>
                    </h5>
                    <small className="text-muted">
                        Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredAndSortedRooms.length)} 
                        trong tổng số {filteredAndSortedRooms.length} phòng
                    </small>
                </div>

                {/* Rooms Table */}
                <div className="table-responsive">
                    <table className="table rooms-table">
                        <thead>
                            <tr>
                                <th 
                                    className="sortable-header" 
                                    onClick={() => handleSort('roomNumber')}
                                >
                                    Số phòng {getSortIcon('roomNumber')}
                                </th>
                                <th>Hình ảnh</th>
                                <th 
                                    className="sortable-header" 
                                    onClick={() => handleSort('roomType')}
                                >
                                    Loại phòng {getSortIcon('roomType')}
                                </th>
                                <th 
                                    className="sortable-header" 
                                    onClick={() => handleSort('floor')}
                                >
                                    Tầng {getSortIcon('floor')}
                                </th>
                                <th 
                                    className="sortable-header" 
                                    onClick={() => handleSort('capacity')}
                                >
                                    Sức chứa {getSortIcon('capacity')}
                                </th>
                                <th 
                                    className="sortable-header" 
                                    onClick={() => handleSort('status')}
                                >
                                    Trạng thái {getSortIcon('status')}
                                </th>
                                <th 
                                    className="sortable-header" 
                                    onClick={() => handleSort('price')}
                                >
                                    Giá {getSortIcon('price')}
                                </th>
                                <th>Tiện nghi</th>
                                <th>Mô tả</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRooms.map(room => (
                                <tr key={room.RoomID} className="room-row">
                                    <td>
                                        <span className="room-number-badge">
                                            {room.RoomNumber}
                                        </span>
                                    </td>
                                    <td>
                                        {room.imageBase64 ? (
                                            <img 
                                                src={`data:image/jpeg;base64,${room.imageBase64}`}
                                                alt={`Room ${room.RoomNumber}`}
                                                className="room-thumbnail"
                                            />
                                        ) : (
                                            <div className="room-thumbnail d-flex align-items-center justify-content-center bg-light">
                                                <i className="fas fa-image text-muted"></i>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className="room-type-badge">
                                            {getRoomTypeName(room.TypeID)} {/* ✅ SỬ DỤNG getRoomTypeName */}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="floor-badge">
                                            Tầng {room.Floor}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="capacity-badge">
                                            <i className="fas fa-user"></i>
                                            {room.Capacity}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusClass(room.Status)}`}>
                                            {normalizeStatus(room.Status) === 'available' && '✅ Có sẵn'}
                                            {normalizeStatus(room.Status) === 'reserved' && '🟡 Đã đặt'}
                                            {normalizeStatus(room.Status) === 'occupied' && '🔴 Đang sử dụng'}
                                            {normalizeStatus(room.Status) === 'maintenance' && '🔧 Bảo trì'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="price-info">
                                            <div className="base-price">
                                                Giá gốc: {getBasePrice(room.TypeID).toLocaleString('vi-VN')}đ {/* ✅ SỬ DỤNG getBasePrice */}
                                            </div>
                                            {room.amenities && room.amenities.length > 0 && (
                                                <div className="amenity-price">
                                                    + Tiện nghi: {(room.amenities.length * 50000).toLocaleString('vi-VN')}đ
                                                </div>
                                            )}
                                            <div className="total-price fw-bold">
                                                Tổng: {calculateTotalPrice(room.TypeID, room.amenities).toLocaleString('vi-VN')}đ
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="amenities-cell">
                                            {room.amenities && room.amenities.length > 0 ? (
                                                <>
                                                    <div className="amenities-count">
                                                        <i className="fas fa-star text-warning"></i>
                                                        {room.amenities.length} tiện nghi
                                                    </div>
                                                    <div className="amenities-list">
                                                        {room.amenities.slice(0, 3).map((amenity, index) => (
                                                            <span key={index} className="amenity-tag">
                                                                {amenityTranslations[amenity.AmenityName] || amenity.AmenityName}
                                                            </span>
                                                        ))}
                                                        {room.amenities.length > 3 && (
                                                            <span className="amenity-tag">
                                                                +{room.amenities.length - 3} khác
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-muted">Không có</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="description-cell">
                                            {formatTranslatedDescription(room.Description)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                        <nav aria-label="Rooms pagination">
                            <ul className="pagination">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button 
                                        className="page-link" 
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>
                                </li>
                                
                                {getPageNumbers().map((pageNumber, index) => (
                                    <li 
                                        key={index} 
                                        className={`page-item ${pageNumber === currentPage ? 'active' : ''} ${pageNumber === '...' ? 'disabled' : ''}`}
                                    >
                                        {pageNumber === '...' ? (
                                            <span className="page-link">...</span>
                                        ) : (
                                            <button 
                                                className="page-link" 
                                                onClick={() => handlePageChange(pageNumber)}
                                            >
                                                {pageNumber}
                                            </button>
                                        )}
                                    </li>
                                ))}
                                
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button 
                                        className="page-link" 
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}

                {/* No results message */}
                {filteredAndSortedRooms.length === 0 && !loading && (
                    <div className="text-center py-5">
                        <div className="mb-3">
                            <i className="fas fa-search text-muted" style={{ fontSize: '3rem' }}></i>
                        </div>
                        <h5 className="text-muted">Không tìm thấy phòng nào</h5>
                        <p className="text-muted">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                        <button 
                            className="btn btn-outline-primary"
                            onClick={resetFilters}
                        >
                            <i className="fas fa-undo me-2"></i>
                            Xóa tất cả bộ lọc
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ShowAvailableRoom;