import Banner from "../UI component/banner_slide/banner_slide";
import './home.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Banner1 from '../..//images/banner_1.jpg'
import P1 from '../..//images/img_1.jpg'
import P2 from '../..//images/img_2.jpg'
import P3 from '../..//images/img_3.jpg'
import P4 from '../..//images/img_4.jpg'
import P5 from '../..//images/img_5.jpg'
import P6 from '../..//images/img_6.jpg'
import P7 from '../..//images/img_7.jpg'
import Person1 from '../..//images/person_1.jpg'
import Person2 from '../..//images/person_2.jpg'
import Person3 from '../..//images/person_3.jpg'
import Person4 from '../..//images/person_4.jpg'


function Home() {
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            // Xóa localStorage khi khởi động
            if (!localStorage.getItem('isLoggedIn')) {
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/check-auth', {
                    credentials: 'include'
                });
                const data = await response.json();
                
                if (!data.authenticated) {
                    // Xóa thông tin đăng nhập nếu không hợp lệ
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('user');
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                // Xóa thông tin đăng nhập nếu có lỗi
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('user');
            }
        };

        checkAuth();
    }, [navigate]);

    return ( 
        <div>
            
            <Banner/>

            <div className=" section-body-home">
            <div class="site-section bg-light">
      <div class="container">
        <div class="row">
          <div class="col-md-6 mx-auto text-center mb-5 section-heading">
            <h2 class="mb-5">Danh sách phòng</h2>
          </div>
        </div>
        <div class="row">
          <div class="col-md-6 col-lg-4 mb-5">
            <div class="hotel-room text-center">
              <a href="#" class="d-block mb-0 thumbnail"><img src={`${P1}`} alt="Image" class="img-fluid"/></a>
              <div class="hotel-room-body">
                <h3 class="heading mb-0"><a href="#">Phòng thường</a></h3>
                <strong class="price">350.000đ / một đêm</strong>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-4 mb-5">
            <div class="hotel-room text-center">
              <a href="#" class="d-block mb-0 thumbnail"><img src={`${P2}`} alt="Image" class="img-fluid"/></a>
              <div class="hotel-room-body">
                <h3 class="heading mb-0"><a href="#">Phòng gia đình</a></h3>
                <strong class="price">500.000đ / một đêm</strong>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-4 mb-5">
            <div class="hotel-room text-center">
              <a href="#" class="d-block mb-0 thumbnail"><img src={`${P3}`} alt="Image" class="img-fluid"/></a>
              <div class="hotel-room-body">
                <h3 class="heading mb-0"><a href="#">Phòng đơn</a></h3>
                <strong class="price">250.000đ / một đêm</strong>
              </div>
            </div>
          </div>

          <div class="col-md-6 col-lg-4 mb-5">
            <div class="hotel-room text-center">
              <a href="#" class="d-block mb-0 thumbnail"><img src={`${P1}`} alt="Image" class="img-fluid"/></a>
              <div class="hotel-room-body">
                <h3 class="heading mb-0"><a href="#">Phòng đôi</a></h3>
                <strong class="price">300.000đ / một đêm</strong>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-4 mb-5">
            <div class="hotel-room text-center">
              <a href="#" class="d-block mb-0 thumbnail"><img src={`${P2}`} alt="Image" class="img-fluid"/></a>
              <div class="hotel-room-body">
                <h3 class="heading mb-0"><a href="#">Phòng cao cấp</a></h3>
                <strong class="price">800.000đ / một đêm</strong>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-4 mb-5">
            <div class="hotel-room text-center">
              <a href="#" class="d-block mb-0 thumbnail"><img src={`${P3}`} alt="Image" class="img-fluid"/></a>
              <div class="hotel-room-body">
                <h3 class="heading mb-0"><a href="#">Phòng đơn</a></h3>
                <strong class="price">100.000đ / một đêm</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <div class="site-section">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-md-6 mb-5 mb-md-0">
            
              <div class="img-border">
                <a href="https://vimeo.com/28959265" class="popup-vimeo image-play">
                  <span class="icon-wrap">
                    <span class="icon icon-play"></span>
                  </span>
                  <img src={`${P2}`} alt="" class="img-fluid"/>
                </a>
              </div>

              
            
          </div>
          <div class="col-md-5 ml-auto">
            

            <div class="section-heading text-left">
              <h2 class="mb-5">Thông tin</h2>
            </div>
            <p class="mb-4">Khách sạn Hoàng Hôn luôn mang vẻ đẹp hiện đại xen lẫn nét cổ kính. Đặt khách sạn sớm nhất để hưởng trọn ưu đãi, hứa hẹn một kì nghỉ với những ...</p>
            <p><a href="https://vimeo.com/28959265" class="popup-vimeo text-uppercase">Xem Video <span class="icon-arrow-right small"></span></a></p>
          </div>
        </div>
      </div>
    </div>

    <div class="site-section">
      <div class="container">
        <div class="row">
          <div class="col-md-6 mx-auto text-center mb-5 section-heading">
            <h2 class="mb-5">TÍNH NĂNG HIỆN CÓ</h2>
          </div>
        </div>
        <div class="row">
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-pool display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Hồ bơi</h2>
            </div>
          </div>
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-desk display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Gọi thức ăn nhanh</h2>
            </div>
          </div>
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-exit display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Thoát hiểm an toàn</h2>
            </div>
          </div>
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-parking display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Bãi đổ xe</h2>
            </div>
          </div>

          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-hair-dryer display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Tạo mẫu tóc</h2>
            </div>
          </div>

          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-minibar display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Quầy bar</h2>
            </div>
          </div>
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-drink display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Thức uống</h2>
            </div>
          </div>
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="text-center p-4 item">
              <span class="flaticon-cab display-3 mb-3 d-block text-primary"></span>
              <h2 class="h5">Thuê ô tô</h2>
            </div>
          </div>

          

          

          

        </div>
      </div>
    </div>
    
    <div class="py-5 upcoming-events" style={{backgroundImage: `url(${Banner1})`, backgroundAttachment: 'fixed'}}>
      <div class="container">
        <div class="row align-items-center promo">
          <div class="col-md-6">
            <h2 class="text-white">Summer Promo 50% Off</h2>
            <a href="#" class="text-white btn btn-outline-warning rounded-0 text-uppercase">Avail Now</a>
          </div>
          <div class="col-md-6">
            <span class="caption">The Promo will start in</span>
            <div id="date-countdown"></div>    
          </div>
        </div>
        
      </div>
    </div>

    <div class="site-section">
      <div class="container">
        <div class="row">
          <div class="col-md-6 mx-auto text-center mb-5 section-heading">
            <h2 class="mb-5">Phòng còn trống</h2>
          </div>
        </div>
        <div class="row no-gutters">
          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P1}`} alt="Image" class="img-fluid"/></a>
          </div>
          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P2}`} alt="Image" class="img-fluid"/></a>
          </div>
          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P3}`} alt="Image" class="img-fluid"/></a>
          </div>
          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P4}`} alt="Image" class="img-fluid"/></a>
          </div>

          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P5}`} alt="Image" class="img-fluid"/></a>
          </div>
          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P6}`} alt="Image" class="img-fluid"/></a>
          </div>
          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P7}`} alt="Image" class="img-fluid"/></a>
          </div>
          <div class="col-md-6 col-lg-3">
            <a href="#" class="image-popup img-opacity"><img src={`${P1}`} alt="Image" class="img-fluid"/></a>
          </div>

        </div>
      </div>
    </div>
    


    <div class="site-section block-15">
      <div class="container">
        <div class="row">
          <div class="col-md-6 mx-auto text-center mb-5 section-heading">
            <h2>Thông tin phòng</h2>
          </div>
        </div>


        <div class="nonloop-block-15 owl-carousel">
          

            <div class="media-with-text p-md-5">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P1}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
          
            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P2}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
          
            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P3}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>

            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P4}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
          
            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P5}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
          
            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P6}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
            
            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P7}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
          
            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P2}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
          
            <div class="media-with-text p-md-4">
              <div class="img-border-sm mb-4">
                <a href="#" class="popup-vimeo image-play">
                  <img src={`${P3}`} alt="" class="img-fluid"/>
                </a>
              </div>
              <h2 class="heading mb-0"><a href="#">Lorem Ipsum Dolor Sit Amet</a></h2>
              <span class="mb-3 d-block post-date">Dec 20th, 2018 &bullet; By <a href="#">Admin</a></span>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio dolores culpa qui aliquam placeat nobis veritatis tempora natus rerum obcaecati.</p>
            </div>
          


        </div>

      </div>
    </div>


    <div class="site-section block-14 bg-light">

      <div class="container">
        
        <div class="row">
          <div class="col-md-6 mx-auto text-center mb-5 section-heading">
            <h2>Phản hồi khách hàng</h2>
          </div>
        </div>

        <div class="nonloop-block-14 owl-carousel">
          
          <div class="p-4">
            <div class="d-flex block-testimony">
              <div class="person mr-3">
                <img src={`${Person1}`} alt="Image" class="img-fluid rounded"/>
              </div>
              <div>
                <h2 class="h5">Katie Johnson</h2>
                <blockquote>&ldquo;Lorem ipsum dolor sit amet, consectetur adipisicing elit. Alias accusantium qui optio, possimus necessitatibus voluptate aliquam velit nostrum tempora ipsam!&rdquo;</blockquote>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div class="d-flex block-testimony">
              <div class="person mr-3">
                <img src={`${Person2}`} alt="Image" class="img-fluid rounded"/>
              </div>
              <div>
                <h2 class="h5">Jane Mars</h2>
                <blockquote>&ldquo;Lorem ipsum dolor sit amet, consectetur adipisicing elit. Alias accusantium qui optio, possimus necessitatibus voluptate aliquam velit nostrum tempora ipsam!&rdquo;</blockquote>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div class="d-flex block-testimony">
              <div class="person mr-3">
                <img src={`${Person3}`} alt="Image" class="img-fluid rounded"/>
              </div>
              <div>
                <h2 class="h5">Shane Holmes</h2>
                <blockquote>&ldquo;Lorem ipsum dolor sit amet, consectetur adipisicing elit. Alias accusantium qui optio, possimus necessitatibus voluptate aliquam velit nostrum tempora ipsam!&rdquo;</blockquote>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div class="d-flex block-testimony">
              <div class="person mr-3">
                <img src={`${Person4}`} alt="Image" class="img-fluid rounded"/>
              </div>
              <div>
                <h2 class="h5">Mark Johnson</h2>
                <blockquote>&ldquo;Lorem ipsum dolor sit amet, consectetur adipisicing elit. Alias accusantium qui optio, possimus necessitatibus voluptate aliquam velit nostrum tempora ipsam!&rdquo;</blockquote>
              </div>
            </div>
          </div>

        </div>

      </div>
      
    </div>
    

    <div class="py-5 quick-contact-info">
      <div class="container">
        <div class="row">
          <div class="col-md-4 text-center">
            <div>
              <span class="icon-room text-white h2 d-block"></span>
              <h2>Location</h2>
              <p class="mb-0">New York - 2398 <br/>  10 Hadson Carl Street</p>
            </div>
          </div>
          <div class="col-md-4 text-center">
            <div>
              <span class="icon-clock-o text-white h2 d-block"></span>
              <h2>Service Times</h2>
              <p class="mb-0">Wednesdays at 6:30PM - 7:30PM <br/>
              Fridays at Sunset - 7:30PM <br/>
              Saturdays at 8:00AM - Sunset</p>
            </div>
          </div>
          <div class="col-md-4 text-center">
            <div>
              <span class="icon-comments text-white h2 d-block"></span>
              <h2>Get In Touch</h2>
              <p class="mb-0">Email: info@yoursite.com <br/>
              Phone: (123) 3240-345-9348 </p>
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