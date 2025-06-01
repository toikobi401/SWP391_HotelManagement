import styles from './register.module.css'
import '../.././fonts/flaticon/font/flaticon.css';
import '../.././fonts/icomoon/style.css';

import Google from '../../images/Google__G__logo.svg.webp'

function register() {
    return ( 
        <div>
      <div className={styles.register_bg}>
        <div className={styles.register_box}>
          <a href="index.html" className={styles.site_logo}>Holtel HUB</a>
          <a href="/" className={`btn btn-outline-secondary ${styles.btn_back}`}>&larr; Quay lại trang chủ</a>
          <div className={styles.register_title}>Đăng ký</div>
          <form method="POST" action="/register">
            <div className={styles.form_group}>
              <label htmlFor="username">Tên đăng nhập</label>
              <input type="text" className="form-control mt-1" id="username" name="username" required />
            </div>
            <div className={styles.form_group}>
              <label className="mt-4" htmlFor="password">Mật khẩu</label>
              <input type="password" className="form-control mt-1" id="password" name="password" required />
            </div>
            <div className={styles.form_group}>
              <label className="mt-4" htmlFor="password">Xác nhận mật khẩu</label>
              <input type="password" className="form-control mt-1" id="password" name="password" required />
            </div>
            <button type="submit" className={`btn btn-primary btn-block mt-3 ${styles.btn_submit}`}>Đăng ký</button>
            <span className={`text-center my-3 d-block`}>Hoặc</span>

            <div className={styles.social_register}>
             

              <a href="#" className={`btn btn-block py-2 btn-google ${styles.gg} ${styles.mauchu}`}>
                <span> <img src={`${Google}`} /></span> Đăng nhập với Google
              </a>

              
            </div>

            <br />

            <a href="/login">
              <span className={styles.Hai}>Đăng Nhập</span>
            </a>
          </form>
        </div>
      </div>
    </div>
     );
}

export default register;