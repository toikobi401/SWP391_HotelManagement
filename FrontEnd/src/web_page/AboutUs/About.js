import React from 'react';
import './About.css';
import Banner2 from '../..//images/banner_2.jpg'
import Person3 from '../..//images/person_3.jpg'

function About() {
  return (
    <div className="about">
      {/* Hero Section */}
      <section className="about__hero">
        <div className="about__hero-overlay">
          <div className="container">
            <div className="about__hero-content">
              <h1 className="about__hero-title">Hotel HUB</h1>
              <p className="about__hero-subtitle">Nơi kết nối công nghệ và dịch vụ khách sạn</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="about__content">
        <div className="container">
          {/* Introduction Section */}
          <div className="about__section about__intro">
            <div className="row align-items-center">
              <div className="col-lg-6">
                <div className="about__text-content">
                  <h2 className="about__section-title">Giới thiệu về Hotel HUB</h2>
                  <p className="about__description">
                    <strong>Hotel HUB</strong> là hệ thống quản lý khách sạn thông minh được phát triển 
                    nhằm cách mạng hóa cách thức vận hành của các cơ sở lưu trú hiện đại. Chúng tôi mang 
                    đến giải pháp toàn diện từ việc đặt phòng trực tuyến đến quản lý dịch vụ và chăm sóc khách hàng.
                  </p>
                  <p className="about__description">
                    Sản phẩm được phát triển bởi 
                    <strong> G2-SE1919NJ</strong> , 
                    kết hợp giữa kiến thức học thuật và kinh nghiệm thực tiễn.
                  </p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="about__image-placeholder">
                  <img src={Banner2} alt="introduction" className="about__image" />
                </div>
              </div>
            </div>
          </div>


          {/* Features Section */}
          <div className="about__section about__features">
            <div className="text-center mb-5">
              <h2 className="about__section-title">Tính năng nổi bật</h2>
              <p className="about__section-subtitle">
                Những công nghệ hiện đại được tích hợp trong hệ thống Hotel HUB
              </p>
            </div>
            <div className="row">
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="about__feature-card">
                  <div className="about__feature-icon">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <h4 className="about__feature-title">Đặt phòng thông minh</h4>
                  <p className="about__feature-text">
                    Hệ thống đặt phòng trực tuyến với khả năng cập nhật theo thời gian thực
                  </p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="about__feature-card">
                  <div className="about__feature-icon">
                    <i className="fas fa-star"></i>
                  </div>
                  <h4 className="about__feature-title">Quản lý đánh giá</h4>
                  <p className="about__feature-text">
                    Thu thập và phân tích phản hồi từ khách hàng một cách tự động
                  </p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="about__feature-card">
                  <div className="about__feature-icon">
                    <i className="fas fa-concierge-bell"></i>
                  </div>
                  <h4 className="about__feature-title">Dịch vụ tích hợp</h4>
                  <p className="about__feature-text">
                    Quản lý Spa, Nhà hàng, Bar và các tiện ích khác trong một hệ thống
                  </p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="about__feature-card">
                  <div className="about__feature-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h4 className="about__feature-title">Báo cáo thông minh</h4>
                  <p className="about__feature-text">
                    Hệ thống báo cáo tổng quan và chi tiết với dashboard trực quan
                  </p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="about__feature-card">
                  <div className="about__feature-icon">
                    <i className="fas fa-mobile-alt"></i>
                  </div>
                  <h4 className="about__feature-title">Đa nền tảng</h4>
                  <p className="about__feature-text">
                    Giao diện thân thiện, tương thích trên mọi thiết bị và trình duyệt
                  </p>
                </div>
              </div>
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="about__feature-card">
                  <div className="about__feature-icon">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <h4 className="about__feature-title">Bảo mật cao</h4>
                  <p className="about__feature-text">
                    Hệ thống bảo mật đa lớp đảm bảo an toàn thông tin khách hàng
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="about__section about__team">
            <div className="row align-items-center">
              <div className="col-lg-6">
                <div className="about__image-placeholder">
                  <img src={Person3} alt="team" className="team__image" />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="about__text-content">
                  <h2 className="about__section-title">Đội ngũ phát triển</h2>
                  <p className="about__description">
                    Dự án được phát triển bởi nhóm 
                    <strong>G2 - SE1919NJ</strong>. Chúng tôi đã trải qua quá trình 
                    nghiên cứu kỹ lưỡng và làm việc nhóm chuyên nghiệp để tạo ra một sản phẩm 
                    thực tiễn, đáp ứng nhu cầu thực tế của ngành khách sạn.
                  </p>
                  <div className="about__stats">
                    <div className="about__stat-item">
                      <div className="about__stat-number">3</div>
                      <div className="about__stat-label">Tháng phát triển</div>
                    </div>
                    <div className="about__stat-item">
                      <div className="about__stat-number">5</div>
                      <div className="about__stat-label">Thành viên nhóm</div>
                    </div>
                    <div className="about__stat-item">
                      <div className="about__stat-number">100+</div>
                      <div className="about__stat-label">Giờ coding</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

export default About;