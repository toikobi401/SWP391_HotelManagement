import styles from './banner_slide.module.css'
import Banner1 from '../../../images/banner_1.jpg';
import Banner2 from '../../../images/banner_2.jpg';
import Banner3 from '../../../images/banner_3.jpg';
import { Carousel } from 'react-bootstrap';
import React from 'react';

function banner() {
    return ( 
      <div className = {`${styles.slider}`} >
      <Carousel className={`${styles.home_slider}`}>
      <Carousel.Item>
        <div
          className={`${styles.site_blocks_cover} ${styles.overlay}`}
          style={{ backgroundImage: `url(${Banner1})` }}
        >
          <div className="container">
            <div className="row align-items-center justify-content-center">
              <div className={`col-md-7 text-center ${styles.text_content}`}>
                <h1 className={`mb-2 ${styles.banner_title}`}>Welcome To Suites</h1>
                <h2 className={styles.caption}>Hotel & Resort</h2>
              </div>
            </div>
          </div>
        </div>
      </Carousel.Item>
      <Carousel.Item>
        <div
          className={`${styles.site_blocks_cover} ${styles.overlay}`}
          style={{ backgroundImage: `url(${Banner2})` }}
        >
          <div className="container">
            <div className="row align-items-center justify-content-center">
              <div className={`col-md-7 text-center ${styles.text_content}`}>
                <h1 className={`mb-2 ${styles.banner_title}`}>Unique Experience</h1>
                <h2 className={styles.caption}>Enjoy With Us</h2>
              </div>
            </div>
          </div>
        </div>
      </Carousel.Item>
      <Carousel.Item>
        <div
          className={`${styles.site_blocks_cover} ${styles.overlay}`}
          style={{ backgroundImage: `url(${Banner3})` }}
        >
          <div className="container">
            <div className="row align-items-center justify-content-center">
              <div className={`col-md-7 text-center ${styles.text_content}`}>
                <h1 className={`mb-2 ${styles.banner_title}`}>Relaxing Room</h1>
                <h2 className={styles.caption}>Your Room, Your Stay</h2>
              </div>
            </div>
          </div>
        </div>
      </Carousel.Item>
    </Carousel>
    </div>
     );
}

export default banner;
