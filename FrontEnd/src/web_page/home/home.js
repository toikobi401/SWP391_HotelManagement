import Banner from "../UI component/banner_slide/banner_slide";
    import './home.css';
    import { useEffect, useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useAuth } from '../../contexts/AuthContext'; // ✅ Thêm dòng này
    import BookingatHomepage from '../UI component/booking online at homepage/BookingatHomepage';
    import Banner1 from '../..//images/banner_1.jpg'
    import P1 from '../..//images/img_1.jpg'
    import P2 from '../..//images/img_2.jpg'
    import P3 from '../..//images/img_3.jpg'
    import P4 from '../..//images/img_4.jpg'
    import P5 from '../..//images/img_5.jpg'
    import P6 from '../..//images/img_6.jpg'
    import P7 from '../..//images/img_7.jpg'
    import P8 from '../..//images/phong_doi_1.webp';
    import P9 from '../..//images/phong_gia_dinh_2.jpg';
    import P10 from '../..//images/phong_don_1.jpeg';
    import Person1 from '../..//images/person_1.jpg'
    import Person2 from '../..//images/person_2.jpg'
    import Person3 from '../..//images/person_3.jpg'
    import Person4 from '../..//images/person_4.jpg'
    import defaultAvatar from '../..//images/default-avatar.png';


    function Home() {
        const { user, isLoggedIn } = useAuth(); // ✅ Thêm dòng này để kích hoạt AuthContext
        const navigate = useNavigate();
        const [promotions, setPromotions] = useState([]);
        const [currentPromotion, setCurrentPromotion] = useState(null);
        const [roomTypes, setRoomTypes] = useState([]);
        // ✅ THÊM: Blog states
        const [blogs, setBlogs] = useState([]);
        const [blogLoading, setBlogLoading] = useState(false);
        const [loading, setLoading] = useState(true);
        const [countdown, setCountdown] = useState({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0
        });

        // ✅ THÊM: State cho highlighted feedbacks
        const [highlightedFeedbacks, setHighlightedFeedbacks] = useState([]);
        const [feedbackLoading, setFeedbackLoading] = useState(false);

        // ✅ MAPPING FUNCTION CHO ROOM TYPE VÀ IMAGES
        const getRoomImageByType = (typeName) => {
            console.log('🖼️ Getting image for room type:', typeName);
            
            const imageMap = {
                'Phòng thường': P1,
                'Phòng gia đình': P9,
                'Phòng đơn': P10,
                'Phòng đôi': P8,
                'Phòng cao cấp': P2,
                'Phòng tiết kiệm': P3,    
                'Phòng đơn tiết kiệm': P3, 
                'Phòng VIP': P3,          
            };
            
            const fallbackMap = {
                'thường': P1,
                'đơn': P10,
                'đôi': P8,
                'gia đình': P9,
                'cao cấp': P2,
                'tiết kiệm':P3, 
                'vip': P2,       
                'luxury': P2,
                'deluxe': P4,
                'suite': P3,
                'family': P9,
                'single': P10,
                'double': P8,
                'standard': P1,
                'budget': P7,
                'economy': P7
            };
            
            if (imageMap[typeName]) {
                console.log('✅ Found exact match:', typeName, '→', 'Image found');
                return imageMap[typeName];
            }
            
            const lowerTypeName = typeName.toLowerCase();
            console.log('🔍 Searching partial match for:', lowerTypeName);
            
            for (const [key, image] of Object.entries(fallbackMap)) {
                if (lowerTypeName.includes(key.toLowerCase())) {
                    console.log('✅ Found partial match:', key, '→', 'Image found');
                    return image;
                }
            }
            
            console.log('⚠️ No match found for:', typeName, 'using default P1');
            return P1;
        };

        // ✅ FUNCTION ĐỂ FORMAT GIÁ TIỀN
        const formatPrice = (price) => {
            return `${price.toLocaleString('vi-VN')}đ`;
        };

        // ✅ FUNCTION ĐỂ TRANSLATE MÔ TẢ
        const translateDescription = (description) => {
            const translations = {
                'Phòng tiêu chuẩn với tiện nghi cơ bản': 'Phòng đơn giản nhưng đầy đủ tiện nghi.',
                'Phòng rộng rãi phù hợp cho gia đình': 'Phòng rộng rãi, thích hợp cho gia đình.',
                'Phòng với 1 giường đơn, phù hợp với ngân sách thấp': 'Phòng nhỏ gọn, ấm cúng.',
                'Phòng với 1 giường đôi, thoải mái cho 2 người': 'Phòng dành cho cặp đôi, lãng mạn và tiện nghi.',
                'Phòng với 1 giường đôi, đầy đủ tiện nghi cao cấp': 'Phòng sang trọng, đầy đủ tiện nghi cao cấp.',
                'Phòng giá rẻ với tiện nghi cơ bản': 'Phòng đơn tiết kiệm, phù hợp với ngân sách hạn chế.'
            };
            
            return translations[description] || description || 'Phòng thoải mái với đầy đủ tiện nghi.';
        };

        // ✅ THÊM: Function để fetch blogs
        const fetchBlogs = async () => {
            setBlogLoading(true);
            try {
                console.log('📖 Fetching blogs from API...');
                const response = await fetch('http://localhost:3000/api/blogs/published?limit=6&sortBy=CreateAt&sortOrder=DESC');
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Blogs fetched successfully:', result);
                    
                    if (result.success && result.data) {
                        setBlogs(result.data);
                        console.log('📖 Blogs set to state:', result.data.length, 'blogs');
                    } else {
                        console.log('⚠️ No blogs data in response');
                        setBlogs([]);
                    }
                } else {
                    console.error('❌ Failed to fetch blogs:', response.status, response.statusText);
                    setBlogs([]);
                }
            } catch (error) {
                console.error('❌ Error fetching blogs:', error);
                setBlogs([]);
            } finally {
                setBlogLoading(false);
            }
        };

        // ✅ THÊM: Function để convert image từ nvarchar sang displayable format
        const convertImageToDisplayFormat = (imageData) => {
            if (!imageData) {
                console.log('🖼️ No image data provided');
                return null;
            }
            
            try {
                console.log('🖼️ Converting image data:', {
                    type: typeof imageData,
                    length: imageData.length,
                    preview: imageData.substring(0, 50) + '...'
                });
                
                // Nếu là string và có dạng base64, thêm data URI prefix
                if (typeof imageData === 'string') {
                    // Kiểm tra xem đã có data URI prefix chưa
                    if (imageData.startsWith('data:image')) {
                        console.log('✅ Image already has data URI prefix');
                        return imageData;
                    }
                    
                    // Kiểm tra xem có phải base64 string không
                    if (imageData.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
                        // Thêm data URI prefix cho JPEG
                        const convertedImage = `data:image/jpeg;base64,${imageData}`;
                        console.log('✅ Converted to base64 data URI');
                        return convertedImage;
                    }
                    
                    // Nếu là URL hoặc path, return as is
                    if (imageData.startsWith('http') || imageData.startsWith('/')) {
                        console.log('✅ Using image URL as is');
                        return imageData;
                    }
                    
                    // Thử convert bằng cách thêm data URI prefix (fallback)
                    const fallbackImage = `data:image/jpeg;base64,${imageData}`;
                    console.log('⚠️ Using fallback conversion');
                    return fallbackImage;
                }
                
                console.log('❌ Unable to convert image data');
                return null;
            } catch (error) {
                console.error('❌ Error converting image:', error);
                return null;
            }
        };

        // ✅ THÊM: Function để fetch highlighted feedbacks
        const fetchHighlightedFeedbacks = async () => {
            setFeedbackLoading(true);
            try {
                console.log('⭐ Fetching highlighted feedbacks from API...');
                const response = await fetch('http://localhost:3000/api/feedbacks/highlighted');
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Highlighted feedbacks fetched successfully:', result);
                    
                    if (result.success && result.data) {
                        // ✅ THÊM: Process image data cho mỗi feedback
                        const processedFeedbacks = result.data.map(feedback => {
                            console.log('🔄 Processing feedback:', {
                                id: feedback.feedbackID,
                                customerName: feedback.customerName,
                                hasImage: !!feedback.customerImage,
                                imageType: typeof feedback.customerImage
                            });
                            
                            return {
                                ...feedback,
                                customerImageConverted: convertImageToDisplayFormat(feedback.customerImage)
                            };
                        });
                        
                        setHighlightedFeedbacks(processedFeedbacks);
                        console.log('⭐ Highlighted feedbacks set to state:', processedFeedbacks.length, 'feedbacks');
                    } else {
                        console.log('⚠️ No highlighted feedbacks data in response');
                        setHighlightedFeedbacks([]);
                    }
                } else {
                    console.error('❌ Failed to fetch highlighted feedbacks:', response.status, response.statusText);
                    setHighlightedFeedbacks([]);
                }
            } catch (error) {
                console.error('❌ Error fetching highlighted feedbacks:', error);
                setHighlightedFeedbacks([]);
            } finally {
                setFeedbackLoading(false);
            }
        };

        // ✅ FUNCTION ĐỂ FORMAT NGÀY THÁNG
        const formatDate = (dateString) => {
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (error) {
                return 'Không xác định';
            }
        };

        // ✅ FUNCTION ĐỂ TẠO EXCERPT TỪ CONTENT
        const createExcerpt = (content, maxLength = 150) => {
            if (!content) return 'Nội dung đang được cập nhật...';
            
            const textContent = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
            if (textContent.length <= maxLength) {
                return textContent;
            }
            
            return textContent.substring(0, maxLength).trim() + '...';
        };

        // ✅ FUNCTION ĐỂ LẤY BLOG IMAGE (default nếu không có)
        const getBlogImage = (blog) => {
            if (blog.image) {
                return blog.image;
            }
            
            // Default images dựa trên category
            const categoryImages = {
                1: P4, // Kinh nghiệm du lịch
                2: P5, // Ẩm thực & Nhà hàng  
                3: P6, // Hướng dẫn tham quan
            };
            
            return categoryImages[blog.CategoryID] || P7;
        };

        // ✅ FETCH DATA TỪ API
        useEffect(() => {
            const fetchData = async () => {
                setLoading(true);
                try {
                    // Fetch promotions, room types và blogs cùng lúc
                    const [promotionsResponse, roomTypesResponse] = await Promise.all([
                        fetch('http://localhost:3000/api/promotions/active').catch(err => ({ ok: false })),
                        fetch('http://localhost:3000/api/room-types').catch(err => ({ ok: false }))
                    ]);

                    // Handle promotions
                    if (promotionsResponse.ok) {
                        const promotionsData = await promotionsResponse.json();
                        console.log('Promotions data:', promotionsData);
                        setPromotions(promotionsData);
                        if (promotionsData.length > 0) {
                            setCurrentPromotion(promotionsData[0]);
                            console.log('Current promotion set:', promotionsData[0]);
                        } else {
                            setFallbackPromotion();
                        }
                    } else {
                        console.log('Promotions response not ok, using fallback');
                        setFallbackPromotion();
                    }

                    // Handle room types
                    if (roomTypesResponse.ok) {
                        const roomTypesData = await roomTypesResponse.json();
                        console.log('Room types data:', roomTypesData);
                        setRoomTypes(roomTypesData.data || roomTypesData);
                    } else {
                        console.log('Room types response not ok, using fallback');
                        setFallbackRoomTypes();
                    }

                    // ✅ THÊM: Fetch blogs
                    await fetchBlogs();

                    // ✅ THÊM: Fetch highlighted feedbacks
                    await fetchHighlightedFeedbacks();

                } catch (error) {
                    console.error('Error fetching data:', error);
                    setFallbackPromotion();
                    setFallbackRoomTypes();
                } finally {
                    setLoading(false);
                }
            };

            const setFallbackPromotion = () => {
                const fallbackPromotion = {
                    promotionName: "Ưu đãi mùa hè",
                    discountPercent: 50,
                    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                    description: "Giảm giá đặc biệt cho mùa hè"
                };
                setCurrentPromotion(fallbackPromotion);
                console.log('Fallback promotion set:', fallbackPromotion);
            };

            const setFallbackRoomTypes = () => {
                const fallbackRoomTypes = [
                    {
                        TypeId: 1,
                        TypeName: "Phòng thường",
                        Description: "Phòng tiêu chuẩn với tiện nghi cơ bản",
                        BasePrice: 350000
                    },
                    {
                        TypeId: 2,
                        TypeName: "Phòng gia đình",
                        Description: "Phòng rộng rãi phù hợp cho gia đình",
                        BasePrice: 500000
                    },
                    {
                        TypeId: 4,
                        TypeName: "Phòng đơn",
                        Description: "Phòng với 1 giường đơn, phù hợp với ngân sách thấp",
                        BasePrice: 250000
                    },
                    {
                        TypeId: 5,
                        TypeName: "Phòng đôi",
                        Description: "Phòng với 1 giường đôi, thoải mái cho 2 người",
                        BasePrice: 300000
                    },
                    {
                        TypeId: 6,
                        TypeName: "Phòng cao cấp",
                        Description: "Phòng với 1 giường đôi, đầy đủ tiện nghi cao cấp",
                        BasePrice: 800000
                    },
                    {
                        TypeId: 7,
                        TypeName: "Phòng tiết kiệm",
                        Description: "Phòng giá rẻ với tiện nghi cơ bản",
                        BasePrice: 100000
                    }
                ];
                setRoomTypes(fallbackRoomTypes);
                console.log('Fallback room types set:', fallbackRoomTypes);
            };

            fetchData();
        }, []);

        // Countdown timer
        useEffect(() => {
            console.log('Countdown effect triggered, currentPromotion:', currentPromotion);
            
            if (!currentPromotion?.endDate) {
                console.log('No endDate found');
                return;
            }

            const updateCountdown = () => {
                const now = new Date().getTime();
                const endTime = new Date(currentPromotion.endDate).getTime();
                const distance = endTime - now;

                console.log('Countdown update - Distance:', distance);

                if (distance > 0) {
                    const newCountdown = {
                        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                        seconds: Math.floor((distance % (1000 * 60)) / 1000)
                    };
                    setCountdown(newCountdown);
                    console.log('Countdown set:', newCountdown);
                } else {
                    setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                    console.log('Countdown expired');
                }
            };

            const timer = setInterval(updateCountdown, 1000);
            updateCountdown();

            return () => clearInterval(timer);
        }, [currentPromotion]);

        useEffect(() => {
            const checkAuth = async () => {
                if (!localStorage.getItem('isLoggedIn')) {
                    return;
                }

                try {
                    const response = await fetch('http://localhost:3000/api/check-auth', {
                        credentials: 'include'
                    });
                    const data = await response.json();
                    
                    if (!data.authenticated) {
                        localStorage.removeItem('isLoggedIn');
                        localStorage.removeItem('user');
                    }
                } catch (err) {
                    console.error('Auth check failed:', err);
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('user');
                }
            };

            checkAuth();
        }, [navigate]);

        // ✅ GENERATE ROOMS DATA TỪ ROOMTYPES
        const rooms = roomTypes.map(roomType => ({
            id: roomType.TypeId,
            name: roomType.TypeName,
            price: formatPrice(roomType.BasePrice),
            description: translateDescription(roomType.Description),
            image: getRoomImageByType(roomType.TypeName),
            basePrice: roomType.BasePrice,
            originalDescription: roomType.Description
        }));

        console.log('Render - currentPromotion:', currentPromotion);
        console.log('Render - roomTypes:', roomTypes);
        console.log('Render - rooms:', rooms);
        console.log('Render - blogs:', blogs); // ✅ THÊM LOG CHO BLOGS

        // ✅ LOADING STATE
        if (loading) {
            return (
                <div>
                    <Banner/>
                    <div className="section-body-home">
                        <div className="container text-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <h5>Đang tải thông tin phòng, khuyến mãi và blog...</h5>
                            <p className="text-muted">Vui lòng đợi trong giây lát</p>
                        </div>
                    </div>
                </div>
            );
        }
    

        return (
            <div>
                <Banner/>

                <div className="section-body-home">
                    {/* Facilities Section */}
                    <div className="site-section">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-6 mx-auto text-center mb-5 section-heading">
                                    <h2 className="mb-5">TIỆN NGHI TIÊU BIỂU</h2>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-pool display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Hồ bơi</h2>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-desk display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Gọi thức ăn nhanh</h2>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-exit display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Thoát hiểm an toàn</h2>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-parking display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Bãi đỗ xe</h2>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-hair-dryer display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Tạo mẫu tóc</h2>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-minibar display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Quầy bar</h2>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-drink display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Thức uống</h2>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-4 col-lg-3">
                                    <div className="text-center p-4 item">
                                        <span className="flaticon-cab display-3 mb-3 d-block text-primary"></span>
                                        <h2 className="h5">Thuê ô tô</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                                    {/* Promotional Section */}
                    {currentPromotion && (
                        <div className="py-5 upcoming-events" style={{
                            backgroundImage: `url(${Banner1})`, 
                            backgroundAttachment: 'fixed',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}>
                            <div className="container">
                                <div className="row align-items-center ">
                                    <div className="col-md-6">
                                        <h2 className="text-white">
                                            {currentPromotion.promotionName} giảm {currentPromotion.discountPercent}% giá phòng
                                        </h2>
                                        <p className="text-white mb-3">
                                            {currentPromotion.description}
                                        </p>
                                        <button 
                                            className="btn-promo" 
                                            onClick={() => navigate('/booking')} // Đi trực tiếp không cần dữ liệu
                                            type="button"
                                        >
                                            Đặt ngay
                                        </button>
                                    </div>
                                    <div className="col-md-6">
                                        <span className="caption text-white">Thời gian còn lại</span>
                                        <div className="countdown-container">
                                            <div className="countdown-item">
                                                <span className="countdown-number">{countdown.days.toString().padStart(2, '0')}</span>
                                                <span className="countdown-label">Ngày</span>
                                            </div>
                                            <div className="countdown-item">
                                                <span className="countdown-number">{countdown.hours.toString().padStart(2, '0')}</span>
                                                <span className="countdown-label">Giờ</span>
                                            </div>
                                            <div className="countdown-item">
                                                <span className="countdown-number">{countdown.minutes.toString().padStart(2, '0')}</span>
                                                <span className="countdown-label">Phút</span>
                                            </div>
                                            <div className="countdown-item">
                                                <span className="countdown-number">{countdown.seconds.toString().padStart(2, '0')}</span>
                                                <span className="countdown-label">Giây</span>
                                            </div>
                                        </div>
                                    </div>
                                    <BookingatHomepage/>
                                </div>
                            </div>
                        </div>
                    )}

                    

                    <div
    className="py-5 upcoming-events"
    style={{
        backgroundImage: `url(${Banner1})`,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    }}
    >

    </div>

                    {/* Room Information Section */}
                    <div className="site-section block-15 room-info">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-6 mx-auto text-center mb-5 section-heading">
                                    <h2>Thông tin phòng</h2>
                                    {roomTypes.length > 0 && (
                                        <p className="text-muted mt-3">
                                            Khám phá {roomTypes.length} loại phòng đa dạng với mức giá từ{' '}
                                            {formatPrice(Math.min(...roomTypes.map(rt => rt.BasePrice)))}{' '}
                                            đến {formatPrice(Math.max(...roomTypes.map(rt => rt.BasePrice)))}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="row">
                                {rooms.length > 0 ? (
                                    rooms.map((room, index) => (
                                        <div className="col-md-6 col-lg-4" key={room.id || index}>
                                            <div className="media-with-text room-card">
                                                <div className="img-border-sm">
                                                    <img 
                                                        src={room.image} 
                                                        alt={room.name} 
                                                        className="img-fluid room-image"
                                                        onError={(e) => {
                                                            e.target.src = P1;
                                                        }}
                                                    />
                                                    <div className="price-badge">
                                                        {room.price}/đêm
                                                    </div>
                                                </div>
                                                <div className="room-content">
                                                    <h2 className="heading">
                                                        <button
                                                            type="button"
                                                            className="room-title btn btn-link p-0"
                                                            style={{ textDecoration: 'none', color: 'inherit', background: 'none', border: 'none', cursor: 'pointer' }}
                                                            onClick={() => navigate('/rooms')}
                                                        >
                                                            {room.name}
                                                        </button>
                                                    </h2>
                                                    <div className="post-date room-price">
                                                        {room.price} / đêm
                                                    </div>
                                                    <p className="room-description">
                                                        {room.description}
                                                    </p>
                                                    <div className="room-features">
                                                        <span className="feature-item">
                                                            <i className="fas fa-wifi text-primary"></i>
                                                            WiFi miễn phí
                                                        </span>
                                                        <span className="feature-item">
                                                            <i className="fas fa-snowflake text-primary"></i>
                                                            Điều hòa
                                                        </span>
                                                        <span className="feature-item">
                                                            <i className="fas fa-tv text-primary"></i>
                                                            TV LCD
                                                        </span>
                                                    </div>
                                                    <div className="room-actions mt-3">
                                                        <button 
                                                            className="btn btn-primary btn-sm me-2"
                                                            onClick={() => navigate('/booking')}
                                                        >
                                                            <i className="fas fa-calendar-check me-1"></i>
                                                            Đặt ngay
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-12 text-center">
                                        <div className="alert alert-info">
                                            <i className="fas fa-info-circle me-2"></i>
                                            Hiện tại không có thông tin phòng. Vui lòng thử lại sau.
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {roomTypes.length > 0 && (
                                <div className="row mt-5">
                                    <div className="col-12">
                                        <div className="room-summary">
                                            <div className="row text-center">
                                                <div className="col-md-3 col-6">
                                                    <div className="summary-item">
                                                        <h4 className="text-primary">{roomTypes.length}🛏️</h4>
                                                        <p className="text-muted mb-0">Loại phòng</p>
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-6">
                                                    <div className="summary-item">
                                                        <h4 className="text-success">
                                                            {formatPrice(Math.min(...roomTypes.map(rt => rt.BasePrice)))}💰
                                                        </h4>
                                                        <p className="text-muted mb-0">Giá từ</p>
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-6">
                                                    <div className="summary-item">
                                                        <h4 className="text-warning">24/7⏰</h4>
                                                        <p className="text-muted mb-0">Phục vụ</p>
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-6">
                                                    <div className="summary-item">
                                                        <h4 className="text-info">5⭐</h4>
                                                        <p className="text-muted mb-0">Đánh giá</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ✅ THÊM: Blog Section */}
                    <div className="site-section bg-light blog-section">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-6 mx-auto text-center mb-5 section-heading">
                                    <h2>Bài Viết Mới Nhất</h2>
                                    <p className="text-muted">
                                        Khám phá những câu chuyện thú vị, mẹo du lịch và trải nghiệm độc đáo
                                    </p>
                                </div>
                            </div>
                            
                            {blogLoading ? (
                                <div className="row">
                                    <div className="col-12 text-center">
                                        <div className="spinner-border text-primary mb-3" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="text-muted">Đang tải bài viết...</p>
                                    </div>
                                </div>
                            ) : blogs.length > 0 ? (
                                <>
                                    <div className="row">
                                        {blogs.map((blog, index) => (
                                            <div className="col-md-6 col-lg-4 mb-4" key={blog.PostID || index}>
                                                <div className="blog-card h-100">
                                                    <div className="blog-image">
                                                        <img 
                                                            src={getBlogImage(blog)} 
                                                            alt={blog.Title}
                                                            className="img-fluid"
                                                            onError={(e) => {
                                                                e.target.src = P7; // Default fallback
                                                            }}
                                                        />
                                                        <div className="blog-category">
                                                            {blog.CategoryName || 'Khách sạn'}
                                                        </div>
                                                    </div>
                                                    <div className="blog-content">
                                                        <div className="blog-meta">
                                                            <span className="blog-date">
                                                                <i className="fas fa-calendar me-1"></i>
                                                                {formatDate(blog.CreateAt)}
                                                            </span>
                                                            <span className="blog-author">
                                                                <i className="fas fa-user me-1"></i>
                                                                {blog.AuthorName || 'Admin'}
                                                            </span>
                                                        </div>
                                                        <h3 className="blog-title">
                                                            <button
                                                                type="button"
                                                                className="btn btn-link p-0"
                                                                style={{ textAlign: 'left', textDecoration: 'underline', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
                                                                onClick={() => navigate(`/blog/${blog.PostID}`)}
                                                            >
                                                                {blog.Title}
                                                            </button>
                                                        </h3>
                                                        <p className="blog-excerpt">
                                                            {createExcerpt(blog.Content)}
                                                        </p>
                                                        <div className="blog-actions">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => navigate(`/blog/${blog.PostID}`)}
                                                            >
                                                                <i className="fas fa-arrow-right me-1"></i>
                                                                Đọc tiếp
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* ✅ View All Blogs Button */}
                                    <div className="row mt-4">
                                        <div className="col-12 text-center">
                                            <button
                                                className="btn btn-primary btn-lg"
                                                onClick={() => navigate('/blogs')}
                                            >
                                                <i className="fas fa-newspaper me-2"></i>
                                                Xem Tất Cả Bài Viết
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="row">
                                    <div className="col-12 text-center">
                                        <div className="alert alert-info">
                                            <i className="fas fa-info-circle me-2"></i>
                                            Hiện tại chưa có bài viết nào. Hãy quay lại sau!
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Customer Testimonials Section */}
                    <div className="site-section block-14 bg-light">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-6 mx-auto text-center mb-5 section-heading">
                                    <h2>Phản hồi từ khách hàng</h2>
                                </div>
                            </div>

                            <div className="nonloop-block-14 owl-carousel">
                                {feedbackLoading ? (
                                    <div className="p-4 text-center">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Đang tải...</span>
                                        </div>
                                        <p className="mt-2">Đang tải phản hồi từ khách hàng...</p>
                                    </div>
                                ) : highlightedFeedbacks && highlightedFeedbacks.length > 0 ? (
                                    highlightedFeedbacks.map((feedback) => (
                                        <div key={feedback.feedbackID} className="p-4">
                                            <div className="block-testimony">
                                                <div className="person">
                                                    <img 
                                                        src={feedback.customerImageConverted || defaultAvatar} 
                                                        alt={feedback.customerName} 
                                                        onError={(e) => {
                                                            console.log('❌ Image failed to load, using fallback');
                                                            e.target.src = defaultAvatar; // Fallback image
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <h2>{feedback.customerName || 'Khách hàng'}</h2>
                                                    {/* ✅ THÊM: Hiển thị rating với stars */}
                                                    <div className="stars mb-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <i
                                                                key={star}
                                                                className={`fa fa-star ${
                                                                    star <= (feedback.overallRating || 5) 
                                                                        ? 'text-warning' 
                                                                        : 'text-muted'
                                                                }`}
                                                            ></i>
                                                        ))}
                                                        <span className="rating-score ms-2">
                                                            {feedback.overallRating}/5
                                                        </span>
                                                    </div>
                                                    <blockquote>
                                                        "{feedback.comment}"
                                                    </blockquote>
                                                    {/* ✅ THÊM: Hiển thị ngày tạo feedback */}
                                                    <small className="text-muted">
                                                        {formatDate(feedback.createAt)}
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // ✅ Fallback testimonials nếu không có data
                                    <>
                                        <div className="p-4">
                                            <div className="block-testimony">
                                                <div className="person">
                                                    <img src={defaultAvatar} alt="Khách hàng" />
                                                </div>
                                                <div>
                                                    <h2>Nguyễn Văn An</h2>
                                                    <div className="stars mb-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <i key={star} className="fa fa-star text-warning"></i>
                                                        ))}
                                                        <span className="rating-score ms-2">5/5</span>
                                                    </div>
                                                    <blockquote>
                                                        "Dịch vụ tuyệt vời! Phòng ốc sạch sẽ, tiện nghi đầy đủ. Nhân viên thân thiện và nhiệt tình. 
                                                        Vị trí thuận tiện cho việc di chuyển. Chắc chắn sẽ quay lại trong tương lai."
                                                    </blockquote>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="block-testimony">
                                                <div className="person">
                                                    <img src={Person2} alt="Khách hàng" />
                                                </div>
                                                <div>
                                                    <h2>Trần Thị Bình</h2>
                                                    <div className="stars mb-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <i key={star} className="fa fa-star text-warning"></i>
                                                        ))}
                                                        <span className="rating-score ms-2">5/5</span>
                                                    </div>
                                                    <blockquote>
                                                        "Không gian yên tĩnh, thích hợp cho cả gia đình. Bữa sáng phong phú, 
                                                        đồ ăn ngon. Giá cả hợp lý cho chất lượng dịch vụ được cung cấp."
                                                    </blockquote>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="block-testimony">
                                                <div className="person">
                                                    <img src={Person3} alt="Khách hàng" />
                                                </div>
                                                <div>
                                                    <h2>Lê Minh Cường</h2>
                                                    <div className="stars mb-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <i key={star} className="fa fa-star text-warning"></i>
                                                        ))}
                                                        <span className="rating-score ms-2">5/5</span>
                                                    </div>
                                                    <blockquote>
                                                        "Đội ngũ nhân viên chuyên nghiệp, nhiệt tình. Phòng ốc thoáng mát, 
                                                        view đẹp. Sẽ giới thiệu cho bạn bè và người thân."
                                                    </blockquote>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="block-testimony">
                                                <div className="person">
                                                    <img src={Person4} alt="Khách hàng" />
                                                </div>
                                                <div>
                                                    <h2>Phạm Thu Dung</h2>
                                                    <div className="stars mb-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <i key={star} className="fa fa-star text-warning"></i>
                                                        ))}
                                                        <span className="rating-score ms-2">5/5</span>
                                                    </div>
                                                    <blockquote>
                                                        "An ninh tốt, địa điểm thuận tiện. Phòng được trang bị đầy đủ tiện nghi. 
                                                        Nhân viên phục vụ chu đáo, nhiệt tình. Rất hài lòng với kỳ nghỉ tại đây."
                                                    </blockquote>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="py-5 quick-contact-info">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-4 text-center">
                                    <div>
                                        <span className="icon-room text-white h2 d-block"></span>
                                        <h2>Địa điểm</h2>
                                        <p className="mb-0">
                                            FPT University <br/> 
                                            Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long <br/> 
                                            Thạch Hoà, Thạch Thất, Hà Nội
                                        </p>
                                    </div>
                                </div>
                                <div className="col-md-4 text-center">
                                    <div>
                                        <span className="icon-clock-o text-white h2 d-block"></span>
                                        <h2>Giờ phục vụ</h2>
                                        <p className="mb-0">
                                            Thứ 2 - Thứ 6: 8:00 - 22:00 <br/>
                                            Thứ 7 - Chủ nhật: 7:00 - 23:00 <br/>
                                            Hỗ trợ 24/7
                                        </p>
                                    </div>
                                </div>
                                <div className="col-md-4 text-center">
                                    <div>
                                        <span className="icon-comments text-white h2 d-block"></span>
                                        <h2>Liên hệ</h2>
                                        <p className="mb-0">
                                            Email: datltthe194235@gmail.com <br/>
                                            Hotline: 0865.124.996
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    export default Home;