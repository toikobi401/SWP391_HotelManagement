import Navba from '../navbar/navbar';
import Banner from '../banner_slide/banner_slide';

function header() {
    return ( 
        <div>
        <div>
        <div>
            <Navba/>       
        </div>
        </div>
        </div>
     );
}

// ✅ Đảm bảo Header có z-index cao nhất
const Header = () => {
    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1001, // ✅ Cao hơn sidebar (999)
            height: '80px',
            background: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            {/* Header content */}
        </header>
    );
};

export default header;