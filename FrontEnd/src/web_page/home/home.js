import Banner from "../UI component/banner_slide/banner_slide";
import './home.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

function Home() {
    const navigate = useNavigate();
    const [promotions, setPromotions] = useState([]);
    const [currentPromotion, setCurrentPromotion] = useState(null);
    const [roomTypes, setRoomTypes] = useState([]); // ✅ THÊM STATE CHO ROOMTYPES
    const [loading, setLoading] = useState(true); // ✅ THÊM LOADING STATE
    const [countdown, setCountdown] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    // ✅ XÓA BASE_PRICES CONSTANTS - SẼ LẤY TỪ API
    // const BASE_PRICES = {
    //     1: 350000,  // Phòng thường
    //     2: 500000,  // Phòng gia đình
    //     4: 250000,  // Phòng đơn
    //     5: 300000,  // Phòng đôi
    //     6: 800000,  // Phòng cao cấp
    //     7: 100000   // Phòng tiết kiệm
    // };

    // ✅ MAPPING FUNCTION CHO ROOM TYPE VÀ IMAGES
    const getRoomImageByType = (typeName) => {
        const imageMap = {
            'Phòng thường': P1,
            'Phòng gia đình': P9,
            'Phòng đơn': P10,
            'Phòng đôi': P8,
            'Phòng cao cấp': P2,
            'Phòng tiết kiệm': P3,
            'Phòng đơn tiết kiệm': P3,
            'Phòng VIP': P2,
        };
        
        // Fallback mapping cho các tên tương tự
        const fallbackMap = {
            'phòng': P1,
            'đơn': P10,
            'đôi': P8,
            'gia đình': P9,
            'cao cấp': P2,
            'tiết kiệm': P3,
            'vip': P2
        };
        
        // Tìm exact match trước
        if (imageMap[typeName]) {
            return imageMap[typeName];
        }
        
        // Tìm partial match
        const lowerTypeName = typeName.toLowerCase();
        for (const [key, image] of Object.entries(fallbackMap)) {
            if (lowerTypeName.includes(key)) {
                return image;
            }
        }
        
        // Default fallback
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

    // ✅ FETCH DATA TỪ API
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch cả promotions và room types cùng lúc
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

        // ✅ FALLBACK ROOM TYPES
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
        updateCountdown(); // Chạy ngay lập tức

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
                        <h5>Đang tải thông tin phòng và khuyến mãi...</h5>
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

                {/* ✅ ROOM INFORMATION SECTION - SỬ DỤNG DYNAMIC DATA */}
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
                                                        e.target.src = P1; // Fallback image
                                                    }}
                                                />
                                                {/* ✅ PRICE BADGE */}
                                                <div className="price-badge">
                                                    {room.price}/đêm
                                                </div>
                                            </div>
                                            <div className="room-content">
                                                <h2 className="heading">
                                                    <a href="#" className="room-title">
                                                        {room.name}
                                                    </a>
                                                </h2>
                                                <div className="post-date room-price">
                                                    {room.price} / đêm
                                                </div>
                                                <p className="room-description">
                                                    {room.description}
                                                </p>
                                                {/* ✅ ROOM FEATURES */}
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
                                                {/* ✅ ROOM ACTIONS */}
                                                <div className="room-actions mt-3">
                                                    <button 
                                                        className="btn btn-primary btn-sm me-2"
                                                        onClick={() => navigate('/booking')}
                                                    >
                                                        <i className="fas fa-calendar-check me-1"></i>
                                                        Đặt ngay
                                                    </button>
                                                    <button 
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => navigate('/rooms')}
                                                    >
                                                        <i className="fas fa-eye me-1"></i>
                                                        Xem chi tiết
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
                        
                        {/* ✅ ROOM TYPE SUMMARY */}
                        {roomTypes.length > 0 && (
                            <div className="row mt-5">
                                <div className="col-12">
                                    <div className="room-summary">
                                        <div className="row text-center">
                                            <div className="col-md-3 col-6">
                                                <div className="summary-item">
                                                    <h4 className="text-primary">{roomTypes.length}</h4>
                                                    <p className="text-muted mb-0">Loại phòng</p>
                                                </div>
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <div className="summary-item">
                                                    <h4 className="text-success">
                                                        {formatPrice(Math.min(...roomTypes.map(rt => rt.BasePrice)))}
                                                    </h4>
                                                    <p className="text-muted mb-0">Giá từ</p>
                                                </div>
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <div className="summary-item">
                                                    <h4 className="text-warning">24/7</h4>
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

                {/* Promotional Section - Always show if promotion exists */}
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
                                    <a href="/booking" className="btn-promo">Đặt ngay</a>
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
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer Testimonials Section */}
                <div className="site-section block-14 bg-light">
                    <div className="container">
                        <div className="row">
                            <div className="col-md-6 mx-auto text-center mb-5 section-heading">
                                <h2>Phản hồi từ khách hàng</h2>
                            </div>
                        </div>

                        <div className="nonloop-block-14 owl-carousel">
                            <div className="p-4">
                                <div className="block-testimony">
                                    <div className="person">
                                        <img src={Person1} alt="Khách hàng" />
                                    </div>
                                    <div>
                                        <h2>Nguyễn Văn An</h2>
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
                                        <blockquote>
                                            "An ninh tốt, địa điểm thuận tiện. Phòng được trang bị đầy đủ tiện nghi. 
                                            Nhân viên phục vụ chu đáo, nhiệt tình. Rất hài lòng với kỳ nghỉ tại đây."
                                        </blockquote>
                                    </div>
                                </div>
                            </div>
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