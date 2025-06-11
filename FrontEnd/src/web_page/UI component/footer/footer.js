import './footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="container footer__content">
                <div className="row footer-sections">
                    <div className="col-md-3 col-sm-6 footer-column">
                        <h3 className="footer__heading">Thông tin liên hệ</h3>
                        <ul className="footer-list">
                            {/* <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Trung tâm hỗ trợ
                                </a>
                            </li> */}
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Đặt phòng trực tuyến
                                </a>
                            </li>
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Hướng dẫn đặt phòng
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="col-md-3 col-sm-6 footer-column">
                        <h3 className="footer__heading">Về chúng tôi</h3>
                        <ul className="footer-list">
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Giới thiệu Hotel HUB
                                </a>
                            </li>
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Cơ hội nghề nghiệp
                                </a>
                            </li>
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Tin tức & Sự kiện
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="col-md-3 col-sm-6 footer-column">
                        <h3 className="footer__heading">Dịch vụ</h3>
                        <ul className="footer-list">
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Đặt phòng
                                </a>
                            </li>
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Nhà hàng & Bar
                                </a>
                            </li>
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    Dịch vụ Spa
                                </a>
                            </li>
                        </ul>
                    </div>
                    {/* <div className="col-md-3 col-sm-6 footer-column">
                        <h3 className="footer__heading">Kết nối với chúng tôi</h3>
                        <ul className="footer-list">
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    <i className="footer-item-icon fab fa-facebook"></i>
                                    Facebook
                                </a>
                            </li>
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    <i className="footer-item-icon fab fa-instagram"></i>
                                    Instagram
                                </a>
                            </li>
                            <li className="footer-item">
                                <a href="" className="footer-item__link">
                                    <i className="footer-item-icon fab fa-linkedin"></i>
                                    LinkedIn
                                </a>
                            </li>
                        </ul>
                    </div> */}
                </div>
            </div>

            <div className="w-100 footer-infor">
                <div className="container">
                    <div className="row">
                        <div className="footer-bottom col c-12">
                            <ul className="footer-bottom-list">
                                <li className="footer-bototm-item">
                                    <a className="footer-bottom-link" href="">ĐIỀU KHOẢN DỊCH VỤ</a>
                                </li>
                                <li className="footer-bototm-item">
                                    <a className="footer-bottom-link" href="">CHÍNH SÁCH BẢO MẬT</a>
                                </li>
                            </ul>
                            
                            <div className="footer-bottom-description">
                                <span className="footer-name">Dự án SWP391 - Hotel Management System</span>
                                <span className="footer-description">
                                    Địa chỉ: FPT University, Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất, Hà Nội
                                </span>
                                <span className="footer-description">Hotline: 0865124996 - Email: support@hotelhub.fpt.edu.vn</span>
                                <span className="footer-description">Mentor: ManhNC5 - Subject: SWP391 - Software Development Project</span>
                                <span className="footer-description">© 2025 - Developed by Gr2 - FPT University</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;