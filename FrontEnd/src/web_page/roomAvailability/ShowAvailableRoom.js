import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../home/home.css';
import './ShowAvailableRoom.css'; // Thêm CSS riêng cho table
import EditRoomForm from '../manager/manager_room/EditRoomForm';


const ShowAvailableRoom = () => {
    // ✅ SỬA: Đảm bảo allRooms luôn được khởi tạo là array
    const [allRooms, setAllRooms] = useState([]); // ✅ Default là empty array
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

    const { isLoggedIn, user, logout, hasRole } = useAuth();
    const navigate = useNavigate();
    
    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // State cho modal edit room
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState(null);

    // Filter options - Cải thiện
    const filterOptions = {
        priceRanges: [
            { value: 'all', label: '💰 Tất cả mức giá' },
            { value: 'under-300k', label: '💵 Dưới 300.000đ' },
            { value: '300k-500k', label: '💶 300.000đ - 500.000đ' },
            { value: '500k-800k', label: '💷 500.000đ - 800.000đ' },
            { value: 'above-800k', label: '💸 Trên 800.000đ' }
        ],
        roomTypes: [
            { value: 'all', label: '🏠 Tất cả loại phòng' },
            { value: '1', label: '🛏️ Phòng thường' },
            { value: '2', label: '👨‍👩‍👧‍👦 Phòng gia đình' },
            { value: '4', label: '🛌 Phòng đơn' },
            { value: '5', label: '💑 Phòng đôi' },
            { value: '6', label: '⭐ Phòng cao cấp' },
            { value: '7', label: '💡 Phòng tiết kiệm' }
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

    // Base prices for room types
    const BASE_PRICES = {
        1: 300000, // Phòng thường
        2: 500000, // Phòng gia đình
        4: 250000, // Phòng đơn
        5: 400000, // Phòng đôi
        6: 800000, // Phòng cao cấp
        7: 200000  // Phòng tiết kiệm
    };

    // Room type names
    const ROOM_TYPE_NAMES = {
        1: 'Phòng thường',
        2: 'Phòng gia đình',
        4: 'Phòng đơn',
        5: 'Phòng đôi',
        6: 'Phòng cao cấp',
        7: 'Phòng tiết kiệm'
    };

    // Amenity translations
    const amenityTranslations = {
        'Kitchenette': 'Bếp mini',
        'Sea view': 'View biển',
        'Jacuzzi': 'Bồn tắm sục',
        'Smart TV': 'TV thông minh',
        'Controlls tablet': 'Máy tính bảng điều khiển'
    };

    // Thêm function để dịch mô tả phòng
    const translateDescription = (description) => {
        if (!description) return '';
        
        // Từ điển dịch mô tả
        const descriptionTranslations = {
            // Các mô tả hoàn chỉnh từ database
            'Room with 1 single bed, suitable with low budget': 'Phòng với 1 giường đơn, phù hợp với ngân sách thấp',
            'Room with 2 double beds': 'Phòng với 2 giường đôi',
            'Room with 1 double bed': 'Phòng với 1 giường đôi',
            'Room with 2 single beds': 'Phòng với 2 giường đơn',
            'Room with 1 double bed, full of high class amenities': 'Phòng với 1 giường đôi, đầy đủ tiện nghi cao cấp',
            
            // Các từ khóa riêng lẻ
            'room': 'phòng',
            'with': 'với',
            'single bed': 'giường đơn',
            'double bed': 'giường đôi',
            'double beds': 'giường đôi',
            'single beds': 'giường đơn',
            'suitable': 'phù hợp',
            'low budget': 'ngân sách thấp',
            'budget': 'ngân sách',
            'high class': 'cao cấp',
            'amenities': 'tiện nghi',
            'full of': 'đầy đủ',
            'luxury': 'sang trọng',
            'economic': 'tiết kiệm',
            'family': 'gia đình',
            'normal': 'thường',
            'standard': 'tiêu chuẩn',
            'comfortable': 'thoải mái',
            'spacious': 'rộng rãi',
            'modern': 'hiện đại',
            'elegant': 'thanh lịch',
            'cozy': 'ấm cúng',
            'bright': 'sáng sủa',
            'quiet': 'yên tĩnh',
            'beautiful': 'đẹp',
            'clean': 'sạch sẽ',
            'fresh': 'tươi mới',
            'convenient': 'tiện lợi',
            'perfect': 'hoàn hảo',
            'ideal': 'lý tưởng',
            'excellent': 'tuyệt vời',
            'amazing': 'tuyệt vời',
            'wonderful': 'tuyệt vời',
            'air conditioning': 'điều hòa không khí',
            'free wifi': 'wifi miễn phí',
            'balcony': 'ban công',
            'bathroom': 'phòng tắm',
            'shower': 'vòi sen',
            'bathtub': 'bồn tắm',
            'window': 'cửa sổ',
            'view': 'view',
            'sea view': 'view biển',
            'city view': 'view thành phố',
            'garden view': 'view vườn',
            'mountain view': 'view núi',
            'floor': 'tầng',
            'number': 'số',
            
            // Các mô tả cụ thể từ database mẫu
            'Phòng tầng 6 số 1': 'Phòng tầng 6 số 1',
            'Phòng tầng 6 số 2': 'Phòng tầng 6 số 2',
            'Phòng tầng 6 số 3': 'Phòng tầng 6 số 3',
            'Phòng tầng 6 số 4': 'Phòng tầng 6 số 4',
            'Phòng tầng 6 số 5': 'Phòng tầng 6 số 5',
            'Phòng tầng 6 số 6': 'Phòng tầng 6 số 6',
            'Phòng tầng 6 số 7': 'Phòng tầng 6 số 7',
            'Phòng tầng 6 số 8': 'Phòng tầng 6 số 8',
            'Phòng tầng 6 số 9': 'Phòng tầng 6 số 9',
            'Phòng tầng 6 số 10': 'Phòng tầng 6 số 10',
            'Phòng tầng 6 số 11': 'Phòng tầng 6 số 11',
            'Phòng tầng 6 số 12': 'Phòng tầng 6 số 12',
            'Phòng tầng 6 số 13': 'Phòng tầng 6 số 13',
            'Phòng tầng 6 số 14': 'Phòng tầng 6 số 14',
            'Phòng tầng 6 số 15': 'Phòng tầng 6 số 15',
            'Phòng tầng 6 số 16': 'Phòng tầng 6 số 16',
            'Phòng tầng 6 số 17': 'Phòng tầng 6 số 17',
            'Phòng tầng 6 số 18': 'Phòng tầng 6 số 18',
            'Phòng tầng 6 số 19': 'Phòng tầng 6 số 19',
            'Phòng tầng 6 số 20': 'Phòng tầng 6 số 20'
        };
        
        // Nếu mô tả đã có sẵn trong từ điển, trả về ngay
        if (descriptionTranslations[description]) {
            return descriptionTranslations[description];
        }
        
        // Nếu mô tả đã là tiếng Việt (có chứa ký tự tiếng Việt), trả về nguyên bản
        const vietnameseRegex = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;
        if (vietnameseRegex.test(description)) {
            return description;
        }
        
        // Dịch từng từ khóa
        let translatedText = description.toLowerCase();
        
        // Dịch các cụm từ hoàn chỉnh trước
        Object.entries(descriptionTranslations).forEach(([english, vietnamese]) => {
            if (english.includes(' ')) { // Chỉ xử lý cụm từ
                const regex = new RegExp(english.toLowerCase(), 'gi');
                translatedText = translatedText.replace(regex, vietnamese);
            }
        });
        
        // Sau đó dịch các từ đơn lẻ
        Object.entries(descriptionTranslations).forEach(([english, vietnamese]) => {
            if (!english.includes(' ')) { // Chỉ xử lý từ đơn
                const regex = new RegExp(`\\b${english.toLowerCase()}\\b`, 'gi');
                translatedText = translatedText.replace(regex, vietnamese);
            }
        });
        
        // Viết hoa chữ cái đầu
        return translatedText.charAt(0).toUpperCase() + translatedText.slice(1);
    };

    // Helper function để format mô tả đã dịch
    const formatTranslatedDescription = (description, maxLength = 50) => {
        if (!description) return '';
        const translated = translateDescription(description);
        return translated.length > maxLength 
            ? `${translated.substring(0, maxLength)}...`
            : translated;
    };

    // Thêm function để chuẩn hóa status từ database
    const normalizeStatus = (status) => {
        if (!status) return 'available';
        const statusLower = status.toLowerCase().trim();
        
        // Mapping các trạng thái có thể có từ database
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

    // Get status class for styling - DI CHUYỂN LÊN TRƯỚC useMemo
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

    // Get sort icon - DI CHUYỂN LÊN TRƯỚC useMemo
    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <i className="fas fa-sort text-muted"></i>;
        }
        return sortConfig.direction === 'ascending' 
            ? <i className="fas fa-sort-up text-primary"></i>
            : <i className="fas fa-sort-down text-primary"></i>;
    };

    // Reset filters - CHUYỂN LÊN TRƯỚC để tránh duplicate
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

    // Fetch available rooms
    useEffect(() => {
        fetchAllRooms(); // Thay đổi từ fetchAvailableRooms
    }, []);

    // Đổi tên function để phù hợp hơn
    const fetchAllRooms = async () => {
        try {
            console.log('🔄 Fetching all rooms from API...');
            
            const response = await fetch('http://localhost:3000/api/rooms', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Room fetch response status:', response.status);

            if (response.ok) {
                const responseData = await response.json();
                console.log('✅ Rooms data received:', responseData);
                
                // ✅ SỬA: Đảm bảo luôn set array, kiểm tra cẩn thận
                if (responseData && responseData.success === true && Array.isArray(responseData.data)) {
                    setAllRooms(responseData.data);
                    console.log(`✅ Set ${responseData.data.length} rooms to state`);
                } else if (responseData && Array.isArray(responseData.data)) {
                    // Trường hợp responseData.success undefined nhưng data vẫn là array
                    setAllRooms(responseData.data);
                    console.log(`✅ Set ${responseData.data.length} rooms to state (no success flag)`);
                } else if (Array.isArray(responseData)) {
                    // Trường hợp response trực tiếp là array
                    setAllRooms(responseData);
                    console.log(`✅ Set ${responseData.length} rooms to state (direct array)`);
                } else {
                    console.warn('⚠️ Invalid response format:', responseData);
                    setAllRooms([]); // ✅ Set empty array
                    toast.warning('Dữ liệu phòng không hợp lệ từ server');
                }
            } else {
                console.error('❌ Failed to fetch rooms:', response.status);
                const errorData = await response.json().catch(() => ({}));
                console.error('Error details:', errorData);
                setAllRooms([]); // ✅ Set empty array in case of error
                toast.error('Không thể tải danh sách phòng từ server');
            }
        } catch (error) {
            console.error('❌ Error fetching rooms:', error);
            setAllRooms([]); // ✅ Set empty array in case of error
            toast.error('Lỗi kết nối server khi tải danh sách phòng');
        }
    };

    // Filter handler
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    // Count active filters
    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.priceRange !== 'all') count++;
        if (filters.roomType !== 'all') count++;
        if (filters.floor !== 'all') count++;
        if (filters.status !== 'all') count++;
        if (filters.search.trim() !== '') count++;
        return count;
    };

    // Search handler
    const handleSearchChange = (e) => {
        setFilters(prev => ({
            ...prev,
            search: e.target.value
        }));
    };

    // Sort handler
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Apply filters and sorting - cập nhật để bao gồm phân trang
    const filteredAndSortedRooms = React.useMemo(() => {
        console.log('🔍 FilteredAndSortedRooms - Input data:', {
            allRoomsLength: allRooms.length,
            filtersActive: Object.values(filters).some(f => f !== 'all' && f !== ''),
            sortConfigKey: sortConfig.key
        });

        if (!Array.isArray(allRooms) || allRooms.length === 0) {
            console.log('⚠️ allRooms is empty or not array');
            return [];
        }

        try {
            let filtered = [...allRooms]; // ✅ Copy array để tránh mutate original

            // Apply search filter
            if (filters.search && filters.search.trim()) {
                const searchTerm = filters.search.toLowerCase().trim();
                filtered = filtered.filter(room => {
                    if (!room) return false;
                    
                    const roomNumber = room.RoomNumber?.toString().toLowerCase() || '';
                    const description = room.Description?.toString().toLowerCase() || '';
                    const typeName = room.TypeName?.toString().toLowerCase() || '';
                    
                    return roomNumber.includes(searchTerm) ||
                           description.includes(searchTerm) ||
                           typeName.includes(searchTerm);
                });
            }

            // Apply room type filter
            if (filters.roomType !== 'all') {
                filtered = filtered.filter(room => {
                    if (!room) return false;
                    return String(room.TypeID) === filters.roomType;
                });
            }

            // Apply floor filter
            if (filters.floor !== 'all') {
                filtered = filtered.filter(room => {
                    if (!room) return false;
                    return String(room.Floor) === filters.floor;
                });
            }

            // Apply status filter
            if (filters.status !== 'all') {
                filtered = filtered.filter(room => {
                    if (!room) return false;
                    const normalizedStatus = normalizeStatus(room.Status);
                    return normalizedStatus === filters.status;
                });
            }

            // ✅ SỬA: Apply price range filter - sử dụng BASE_PRICES trực tiếp
            if (filters.priceRange !== 'all') {
                filtered = filtered.filter(room => {
                    if (!room) return false;
                    // ✅ SỬA: Chỉ dùng BASE_PRICES, không tính amenities
                    const roomPrice = BASE_PRICES[room.TypeID] || 0;
                    
                    switch (filters.priceRange) {
                        case 'under-300k':
                            return roomPrice < 300000;
                        case '300k-500k':
                            return roomPrice >= 300000 && roomPrice < 500000;
                        case '500k-800k':
                            return roomPrice >= 500000 && roomPrice < 800000;
                        case 'above-800k':
                            return roomPrice >= 800000;
                        default:
                            return true;
                    }
                });
            }

            // ✅ SỬA: Apply sorting - sử dụng BASE_PRICES cho price sort
            if (sortConfig.key) {
                filtered.sort((a, b) => {
                    let aValue, bValue;

                    switch (sortConfig.key) {
                        case 'roomNumber':
                            aValue = parseInt(a.RoomNumber) || 0;
                            bValue = parseInt(b.RoomNumber) || 0;
                            break;
                        case 'floor':
                            aValue = parseInt(a.Floor) || 0;
                            bValue = parseInt(b.Floor) || 0;
                            break;
                        case 'price':
                            // ✅ SỬA: Chỉ dùng BASE_PRICES
                            aValue = BASE_PRICES[a.TypeID] || 0;
                            bValue = BASE_PRICES[b.TypeID] || 0;
                            break;
                        case 'status':
                            aValue = normalizeStatus(a.Status);
                            bValue = normalizeStatus(b.Status);
                            break;
                        case 'capacity':
                            aValue = parseInt(a.Capacity) || 0;
                            bValue = parseInt(b.Capacity) || 0;
                            break;
                        case 'roomType':
                            aValue = a.TypeName || '';
                            bValue = b.TypeName || '';
                            break;
                        default:
                            return 0;
                    }

                    if (sortConfig.direction === 'ascending') {
                        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                    } else {
                        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                    }
                });
            }

            console.log(`✅ Filtered ${filtered.length} rooms from ${allRooms.length} total`);
            return filtered;
            
        } catch (error) {
            console.error('❌ Error in filtering/sorting:', error);
            return [];
        }
        
    }, [allRooms, filters, sortConfig]); // ✅ Đảm bảo dependencies đúng

    // Tính toán phân trang
    const totalPages = Math.ceil(filteredAndSortedRooms.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentRooms = filteredAndSortedRooms.slice(startIndex, endIndex);

    // Reset về trang 1 khi filter thay đổi
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortConfig]);

    // Xử lý thay đổi trang
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Scroll to top của bảng
        document.querySelector('.rooms-table')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    };

    // Tạo các số trang để hiển thị
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            const half = Math.floor(maxVisiblePages / 2);
            let start = Math.max(1, currentPage - half);
            let end = Math.min(totalPages, currentPage + half);
            
            if (currentPage <= half) {
                end = maxVisiblePages;
            } else if (currentPage + half >= totalPages) {
                start = totalPages - maxVisiblePages + 1;
            }
            
            for (let i = start; i <= end; i++) {
                pageNumbers.push(i);
            }
        }
        
        return pageNumbers;
    };

    // Thêm function để đếm trạng thái
    const getStatusCounts = () => {
        const counts = {
            available: 0,
            reserved: 0,
            occupied: 0,
            maintenance: 0,
            total: filteredAndSortedRooms.length
        };
        
        filteredAndSortedRooms.forEach(room => {
            const normalizedStatus = normalizeStatus(room.Status);
            if (counts.hasOwnProperty(normalizedStatus)) {
                counts[normalizedStatus]++;
            }
        });
        
        return counts;
    };

    // Cập nhật stats
    const statusCounts = getStatusCounts();

    // ✅ THÊM FUNCTION XỬ LÝ EDIT ROOM
    const handleEditRoom = (roomId) => {
        console.log('🔧 Opening edit modal for room:', roomId);
        setSelectedRoomId(roomId);
        setEditModalOpen(true);
    };

    // ✅ THÊM FUNCTION XỬ LÝ CLOSE MODAL
    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setSelectedRoomId(null);
    };

    // ✅ THÊM FUNCTION XỬ LÝ SUCCESS EDIT
    const handleEditSuccess = () => {
        setEditModalOpen(false);
        setSelectedRoomId(null);
        fetchAllRooms(); // Refresh danh sách phòng
        toast.success('Cập nhật phòng thành công!');
    };

    // ✅ THÊM FUNCTION XỬ LÝ DELETE ROOM
    const handleDeleteRoom = async (roomId) => {
        // Find room info for confirmation
        const room = allRooms.find(r => r.RoomID === roomId);
        const roomNumber = room?.RoomNumber || roomId;

        // Confirm deletion
        if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ${roomNumber}?\n\nHành động này không thể hoàn tác.`)) {
            try {
                console.log('🗑️ Deleting room:', roomId);
                
                const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const responseData = await response.json();

                if (response.ok && responseData.success) {
                    toast.success(`Xóa phòng ${roomNumber} thành công!`);
                    // Refresh room list
                    fetchAllRooms();
                } else {
                    throw new Error(responseData.message || 'Không thể xóa phòng');
                }
            } catch (error) {
                console.error('❌ Error deleting room:', error);
                toast.error(error.message || 'Lỗi kết nối khi xóa phòng');
            }
        }
    };

    return (
        <div className="site-section bg-light available-rooms">
            <div className="container">
                {/* Section Title */}
                <div className="row">
                    <div className="col-md-8 mx-auto text-center mb-5 section-heading">
                        <h2 className="mb-3">Quản lý phòng trống</h2>
                        <p className="text-muted">Danh sách tất cả các phòng hiện có và thông tin chi tiết</p>
                    </div>
                </div>
                
                {/* Simple Booking Info */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="alert alert-info text-center">
                            <h5><i className="fas fa-info-circle"></i> Thông tin đặt phòng</h5>
                            
                            <div className="contact-info">
                                <strong><i className="fas fa-phone"></i> Hotline: 0865.124.996</strong> | 
                                <strong> <i className="fas fa-envelope"></i> Email: support@hotelhub.fpt.edu.vn</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Filter and Search Section */}
                <div className="filter-section mb-4">
                    <div className="card shadow-sm">
                        <div className="card-header bg-primary text-white">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">
                                    <i className="fas fa-filter"></i> Bộ lọc và tìm kiếm
                                </h5>
                                <div className="filter-actions">
                                    {getActiveFiltersCount() > 0 && (
                                        <span className="badge badge-warning mr-2">
                                            {getActiveFiltersCount()} bộ lọc đang áp dụng
                                        </span>
                                    )}
                                    <button 
                                        className="btn btn-outline-light btn-sm"
                                        onClick={resetFilters}
                                        title="Đặt lại tất cả bộ lọc"
                                    >
                                        <i className="fas fa-undo"></i> Đặt lại
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            {/* Search Row */}
                            <div className="row mb-3">
                                <div className="col-md-6 mx-auto">
                                    <div className="input-group input-group-lg">
                                        <div className="input-group-prepend">
                                            <span className="input-group-text bg-primary text-white">
                                                <i className="fas fa-search"></i>
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Tìm kiếm theo số phòng, mô tả hoặc loại phòng..."
                                            value={filters.search}
                                            onChange={handleSearchChange}
                                        />
                                        {filters.search && (
                                            <div className="input-group-append">
                                                <button 
                                                    className="btn btn-outline-secondary"
                                                    onClick={() => handleFilterChange('search', '')}
                                                    title="Xóa tìm kiếm"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Filter Controls */}
                            <div className="row">
                                <div className="col-md-3 mb-3">
                                    <label className="form-label font-weight-bold">
                                        <i className="fas fa-money-bill-wave text-success"></i> Mức giá
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
                                    <label className="form-label font-weight-bold">
                                        <i className="fas fa-bed text-info"></i> Loại phòng
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
                                    <label className="form-label font-weight-bold">
                                        <i className="fas fa-building text-warning"></i> Tầng
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
                                    <label className="form-label font-weight-bold">
                                        <i className="fas fa-info-circle text-danger"></i> Trạng thái
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

                            {/* Quick Filter Buttons */}
                            <div className="row">
                                <div className="col-12">
                                    <div className="quick-filters">
                                        <span className="font-weight-bold mr-3">Lọc nhanh:</span>
                                        <button 
                                            className={`btn btn-sm mr-2 ${filters.status === 'available' ? 'btn-success' : 'btn-outline-success'}`}
                                            onClick={() => handleFilterChange('status', filters.status === 'available' ? 'all' : 'available')}
                                        >
                                            <i className="fas fa-check-circle"></i> Phòng trống
                                        </button>
                                        <button 
                                            className={`btn btn-sm mr-2 ${filters.roomType === '6' ? 'btn-warning' : 'btn-outline-warning'}`}
                                            onClick={() => handleFilterChange('roomType', filters.roomType === '6' ? 'all' : '6')}
                                        >
                                            <i className="fas fa-star"></i> Phòng cao cấp
                                        </button>
                                        <button 
                                            className={`btn btn-sm mr-2 ${filters.priceRange === 'under-300k' ? 'btn-info' : 'btn-outline-info'}`}
                                            onClick={() => handleFilterChange('priceRange', filters.priceRange === 'under-300k' ? 'all' : 'under-300k')}
                                        >
                                            <i className="fas fa-tag"></i> Giá rẻ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary with improved stats - cập nhật để hiển thị thông tin phân trang */}
                <div className="row mb-3 filter-summary">
                    <div className="col-12">
                        <div className="stats-summary card">
                            <div className="card-body">
                                <div className="row text-center">
                                    <div className="col-md-2">
                                        <div className="stat-item">
                                            <h4 className="text-primary">
                                                <i className="fas fa-list"></i> {statusCounts.total}
                                            </h4>
                                            <small className="text-muted">Tổng phòng</small>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="stat-item">
                                            <h4 className="text-info">
                                                <i className="fas fa-eye"></i> {currentRooms.length}
                                            </h4>
                                            <small className="text-muted">Đang hiển thị</small>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="stat-item">
                                            <h4 className="text-success">
                                                <i className="fas fa-check-circle"></i> {statusCounts.available}
                                            </h4>
                                            <small className="text-muted">Phòng trống</small>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="stat-item">
                                            <h4 className="text-warning">
                                                <i className="fas fa-clock"></i> {statusCounts.reserved}
                                            </h4>
                                            <small className="text-muted">Đã đặt</small>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="stat-item">
                                            <h4 className="text-danger">
                                                <i className="fas fa-user"></i> {statusCounts.occupied}
                                            </h4>
                                            <small className="text-muted">Đang sử dụng</small>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="stat-item">
                                            <h4 className="text-secondary">
                                                <i className="fas fa-tools"></i> {statusCounts.maintenance}
                                            </h4>
                                            <small className="text-muted">Bảo trì</small>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Thêm hàng thứ hai cho thông tin phân trang */}
                                <div className="row mt-3 text-center">
                                    <div className="col-md-4">
                                        <div className="stat-item">
                                            <h5 className="text-primary mb-1">
                                                <i className="fas fa-file"></i> {currentPage}/{totalPages}
                                            </h5>
                                            <small className="text-muted">Trang hiện tại</small>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="stat-item">
                                            <h5 className="text-info mb-1">
                                                <i className="fas fa-percentage"></i> {statusCounts.total > 0 ? Math.round((statusCounts.available / statusCounts.total) * 100) : 0}%
                                            </h5>
                                            <small className="text-muted">Tỷ lệ phòng trống</small>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="stat-item">
                                            <h5 className="text-warning mb-1">
                                                <i className="fas fa-chart-line"></i> {statusCounts.total > 0 ? Math.round(((statusCounts.occupied + statusCounts.reserved) / statusCounts.total) * 100) : 0}%
                                            </h5>
                                            <small className="text-muted">Tỷ lệ đã thuê/đặt</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="row mt-2">
                                    <div className="col-12 text-center">
                                        <small className="text-muted">
                                            <i className="fas fa-sync-alt"></i> Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
                                            {statusCounts.total > 0 && (
                                                <span className="ml-3">
                                                    <i className="fas fa-info-circle"></i> Hiển thị {startIndex + 1}-{Math.min(endIndex, statusCounts.total)} của {statusCounts.total} phòng
                                                </span>
                                            )}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Table - đã xóa cột hình ảnh */}
                <div className="row rooms-table-container">
                    <div className="col-12">
                        <div className="table-responsive">
                            <table className="table table-striped table-hover rooms-table">
                                <thead className="thead-dark">
                                    <tr>
                                        <th 
                                            scope="col" 
                                            onClick={() => handleSort('roomNumber')}
                                            className="sortable-header"
                                        >
                                            <i className="fas fa-door-open"></i> Số phòng {getSortIcon('roomNumber')}
                                        </th>
                                        <th 
                                            scope="col"
                                            onClick={() => handleSort('type')}
                                            className="sortable-header"
                                        >
                                            <i className="fas fa-bed"></i> Loại phòng {getSortIcon('type')}
                                        </th>
                                        <th 
                                            scope="col"
                                            onClick={() => handleSort('floor')}
                                            className="sortable-header"
                                        >
                                            <i className="fas fa-building"></i> Tầng {getSortIcon('floor')}
                                        </th>
                                        <th 
                                            scope="col"
                                            onClick={() => handleSort('capacity')}
                                            className="sortable-header"
                                        >
                                            <i className="fas fa-users"></i> Sức chứa {getSortIcon('capacity')}
                                        </th>
                                        <th 
                                            scope="col"
                                            onClick={() => handleSort('status')}
                                            className="sortable-header"
                                        >
                                            <i className="fas fa-info-circle"></i> Trạng thái {getSortIcon('status')}
                                        </th>
                                        <th 
                                            scope="col"
                                            onClick={() => handleSort('price')}
                                            className="sortable-header"
                                        >
                                            <i className="fas fa-money-bill-wave"></i> Giá/đêm {getSortIcon('price')}
                                        </th>
                                        <th scope="col">
                                            <i className="fas fa-star"></i> Tiện nghi
                                        </th>
                                        <th scope="col">
                                            <i className="fas fa-clipboard"></i> Mô tả
                                        </th>
                            { hasRole(1) && (
                                        <th scope="col">
                                            <i className="fas fa-clipboard"></i> Quản lý
                                        </th>
                            )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRooms.map((room, index) => (
                                        <tr key={room.RoomID || index} className="room-row">
                                            <td className="room-number-cell">
                                                <span className="room-number-badge">
                                                    {room.RoomNumber}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="room-type-badge">
                                                    {ROOM_TYPE_NAMES[room.TypeID] || 'Không xác định'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="floor-badge">
                                                    Tầng {room.Floor}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="capacity-badge">
                                                    <i className="fas fa-user"></i> {room.Capacity}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getStatusClass(room.Status)}`}>
                                                    {room.Status || 'Có sẵn'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="price-info">
                                                    <div className="base-price">
                                                        <strong>{BASE_PRICES[room.TypeID]?.toLocaleString('vi-VN')}đ/đêm</strong>
                                                    </div>
                                                    {/* ✅ XÓA: Amenity price calculation không cần thiết
                                                    {room.amenities && room.amenities.length > 0 && (
                                                        <div className="amenity-price">
                                                            +{(room.amenities.length * 50000).toLocaleString('vi-VN')}đ
                                                        </div>
                                                    )}
                                                    <div className="total-price">
                                                        <strong>{calculateTotalPrice(room.TypeID, room.amenities).toLocaleString('vi-VN')}đ</strong>
                                                    </div>
                                                    */}
                                                </div>
                                            </td>
                                            <td className="amenities-cell">
                                                <div className="amenities-count">
                                                    <i className="fas fa-star"></i> {room.amenities?.length || 0} tiện nghi
                                                </div>
                                                <div className="amenities-list">
                                                    {room.amenities?.map((amenity, index) => (
                                                        <span key={index} className="amenity-tag">
                                                            {amenityTranslations[amenity.AmenityName] || amenity.AmenityName}
                                                        </span>
                                                    )) || <span className="text-muted">Không có</span>}
                                                </div>
                                            </td>
                                            <td>
                                                {room.Description ? (
                                                    <div className="description-cell" title={translateDescription(room.Description)}>
                                                        {formatTranslatedDescription(room.Description, 50)}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">
                                                        <i className="fas fa-minus"></i> Không có mô tả
                                                    </span>
                                                )}
                                            </td>

                        {hasRole(1) && (
                            <td className="room-actions">
                                <button 
                                    className="btn btn-sm btn-outline-primary me-2"
                                    onClick={() => handleEditRoom(room.RoomID)}
                                    title="Chỉnh sửa phòng"
                                    type="button"
                                >
                                    <i className="fas fa-edit me-1"></i>
                                    Sửa
                                </button>
                                <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteRoom(room.RoomID)}
                                    title="Xóa phòng"
                                    type="button"
                                >
                                    <i className="fas fa-trash me-1"></i>
                                    Xóa
                                </button>
                            </td>
                        )}

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="row mt-4">
                        <div className="col-12">
                            <nav aria-label="Room pagination">
                                <ul className="pagination justify-content-center">
                                    {/* Previous Button */}
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                        <button 
                                            className="page-link"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            aria-label="Previous"
                                        >
                                            <i className="fas fa-chevron-left"></i>
                                            <span className="d-none d-sm-inline ml-1">Trước</span>
                                        </button>
                                    </li>

                                    {/* First page */}
                                    {currentPage > 3 && totalPages > 5 && (
                                        <>
                                            <li className="page-item">
                                                <button 
                                                    className="page-link"
                                                    onClick={() => handlePageChange(1)}
                                                >
                                                    1
                                                </button>
                                            </li>
                                            {currentPage > 4 && (
                                                <li className="page-item disabled">
                                                    <span className="page-link">...</span>
                                                </li>
                                            )}
                                        </>
                                    )}

                                    {/* Page Numbers */}
                                    {getPageNumbers().map(pageNumber => (
                                        <li 
                                            key={pageNumber} 
                                            className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
                                        >
                                            <button 
                                                className="page-link"
                                                onClick={() => handlePageChange(pageNumber)}
                                            >
                                                {pageNumber}
                                            </button>
                                        </li>
                                    ))}

                                    {/* Last page */}
                                    {currentPage < totalPages - 2 && totalPages > 5 && (
                                        <>
                                            {currentPage < totalPages - 3 && (
                                                <li className="page-item disabled">
                                                    <span className="page-link">...</span>
                                                </li>
                                            )}
                                            <li className="page-item">
                                                <button 
                                                    className="page-link"
                                                    onClick={() => handlePageChange(totalPages)}
                                                >
                                                    {totalPages}
                                                </button>
                                            </li>
                                        </>
                                    )}

                                    {/* Next Button */}
                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                        <button 
                                            className="page-link"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            aria-label="Next"
                                        >
                                            <span className="d-none d-sm-inline mr-1">Sau</span>
                                            <i className="fas fa-chevron-right"></i>
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                )}

                {/* No rooms found message - cập nhật condition */}
                {filteredAndSortedRooms.length === 0 && (
                    <div className="row">
                        <div className="col-12 text-center">
                            <div className="alert alert-warning">
                                <h4><i className="fas fa-exclamation-triangle"></i> Không tìm thấy phòng phù hợp</h4>
                                <p>Vui lòng điều chỉnh bộ lọc hoặc tìm kiếm khác.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ✅ THÊM EDIT ROOM MODAL */}
                {editModalOpen && selectedRoomId && (
                    <EditRoomForm 
                        isModal={true}
                        isOpen={editModalOpen}
                        onClose={handleCloseEditModal}
                        roomId={selectedRoomId}
                        onSuccess={handleEditSuccess}
                    />
                )}
            </div>
        </div>
    );
};

export default ShowAvailableRoom;