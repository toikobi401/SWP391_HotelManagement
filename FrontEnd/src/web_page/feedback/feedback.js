import React, { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import "./feedback.css";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

const ratingFields = [
  { name: "overallRating", label: "Overall Rating" },
  { name: "seviceRating", label: "Service" },  
  { name: "cleanlinessRating", label: "Cleanliness" },
  { name: "locationRating", label: "Location" },
  { name: "breakfastRating", label: "Breakfast" },
];

function FeedbackForm() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [ratings, setRatings] = useState({
    overallRating: 0,
    seviceRating: 0,  
    cleanlinessRating: 0,
    locationRating: 0,
    breakfastRating: 0,
  });
  const [bookingID, setBookingID] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ THÊM: Lấy BookingID từ URL parameters khi component mount
  useEffect(() => {
    const bookingIDFromURL = searchParams.get('bookingID');
    if (bookingIDFromURL) {
      setBookingID(bookingIDFromURL);
      console.log('📋 Received BookingID from URL:', bookingIDFromURL);
    }
  }, [searchParams]);

  const handleRatingChange = (field, value) => {
    setRatings(prev => ({
      ...prev,
      [field]: value
    }));
    setError(""); // Clear error when user makes changes
  };

  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };

  const handleBookingIDChange = (e) => {
    setBookingID(e.target.value);
    setError(""); // Clear error when user makes changes
  };

  const validateForm = () => {
    // Check if user is logged in
    if (!user) {
      setError("Bạn cần đăng nhập để gửi đánh giá");
      return false;
    }

    // Check required ratings (Overall, Service, Cleanliness are required)
    if (ratings.overallRating === 0 || ratings.seviceRating === 0 || ratings.cleanlinessRating === 0) {
      setError("Vui lòng đánh giá đầy đủ các mục bắt buộc (Overall, Service, Cleanliness)");
      return false;
    }

    // Check booking ID
    if (!bookingID.trim()) {
      setError("Vui lòng nhập Booking ID");
      return false;
    }

    // Validate rating values (1-5)
    for (const [key, value] of Object.entries(ratings)) {
      if (value !== 0 && (value < 1 || value > 5)) {
        setError("Đánh giá phải từ 1 đến 5 sao");
        return false;
      }
    }

    return true;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const feedbackData = {
        overallRating: ratings.overallRating,
        seviceRating: ratings.seviceRating,
        cleanlinessRating: ratings.cleanlinessRating,
        locationRating: ratings.locationRating || null,
        breakfastRating: ratings.breakfastRating || null,
        customerID: user.UserID,
        bookingID: parseInt(bookingID),
        comment: comment // ✅ THÊM: Send comment data
      };

      console.log('Sending feedback data:', feedbackData);

      const response = await fetch('http://localhost:3000/api/feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(feedbackData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Cảm ơn bạn đã gửi đánh giá! Phản hồi của bạn rất quan trọng với chúng tôi.");
        
        // Reset form
        setRatings({
          overallRating: 0,
          seviceRating: 0,
          cleanlinessRating: 0,
          locationRating: 0,
          breakfastRating: 0,
        });
        setBookingID("");
        setComment("");
        setError("");
      } else {
        console.error('API Error:', result);
        setError(result.message || "Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại.");
        toast.error(result.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error('Network Error:', error);
      setError("Lỗi kết nối. Vui lòng kiểm tra internet và thử lại.");
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (field, currentRating) => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      return (
        <label key={starValue} className="star-label">
          <input
            type="radio"
            name={field}
            value={starValue}
            checked={currentRating === starValue}
            onChange={() => handleRatingChange(field, starValue)}
            style={{ display: 'none' }}
          />
          <span 
            className={currentRating >= starValue ? 'selected' : ''}
            style={{ 
              cursor: 'pointer',
              fontSize: '24px',
              color: currentRating >= starValue ? '#FFD700' : '#ddd',
              transition: 'color 0.2s'
            }}
          >
            ★
          </span>
        </label>
      );
    });
  };

  return (
    <div className="feedback__hero-overlay">
      <div className="feedback-form-container">
        <div className="feedback__header">
          <h1>Đánh giá dịch vụ khách sạn</h1>
          <p>Chia sẻ trải nghiệm của bạn để giúp chúng tôi cải thiện dịch vụ</p>
        </div>

        <form onSubmit={handleSend}>
          {/* Booking ID Input */}
          <div className="mb-3">
            <label htmlFor="bookingID" className="form-label">
              <strong>Booking ID <span className="text-danger">*</span></strong>
            </label>
            <input
              type="number"
              id="bookingID"
              className="form-control"
              value={bookingID}
              onChange={handleBookingIDChange}
              placeholder="Nhập Booking ID của bạn"
              required
            />
            <small className="form-text text-muted">
              Vui lòng nhập Booking ID để chúng tôi có thể liên kết đánh giá với đặt phòng của bạn
            </small>
          </div>

          {/* Rating Fields */}
          {ratingFields.map(({ name, label }) => {
            const isRequired = ['overallRating', 'seviceRating', 'cleanlinessRating'].includes(name);
            return (
              <div key={name} className="rating-row">
                <label>
                  <strong>
                    {label} 
                    {isRequired && <span className="text-danger"> *</span>}
                  </strong>
                </label>
                <div className="star-rating">
                  {renderStars(name, ratings[name])}
                  <span className="ms-2 text-muted">
                    ({ratings[name]}/5)
                  </span>
                </div>
              </div>
            );
          })}

          {/* Comment Field */}
          <div className="mb-3 mt-4">
            <label htmlFor="comment" className="form-label">
              <strong>Nhận xét thêm (tùy chọn)</strong>
            </label>
            <textarea
              id="comment"
              className="form-control"
              rows="4"
              value={comment}
              onChange={handleCommentChange}
              placeholder="Chia sẻ thêm về trải nghiệm của bạn..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {/* User Info Display */}
          {user && (
            <div className="alert alert-info">
              <i className="fas fa-user me-2"></i>
              Đánh giá sẽ được gửi bởi: <strong>{user.Fullname || user.Username}</strong>
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex gap-3 justify-content-center">
            <button 
              type="submit" 
              className="btn btn-primary send-btn px-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang gửi...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Gửi đánh giá
                </>
              )}
            </button>
            <button 
              type="button" 
              className="btn btn-outline-secondary cancel-btn px-4"
              onClick={() => {
                setRatings({
                  overallRating: 0,
                  seviceRating: 0,
                  cleanlinessRating: 0,
                  locationRating: 0,
                  breakfastRating: 0,
                });
                setBookingID("");
                setComment("");
                setError("");
              }}
              disabled={loading}
            >
              <i className="fas fa-undo me-2"></i>
              Đặt lại
            </button>
          </div>
        </form>

        {/* Instructions */}
        <div className="alert alert-light mt-4">
          <h6><i className="fas fa-info-circle me-2"></i>Hướng dẫn đánh giá:</h6>
          <ul className="mb-0">
            <li><strong>Overall Rating, Service, Cleanliness:</strong> Bắt buộc phải đánh giá</li>
            <li><strong>Location, Breakfast:</strong> Tùy chọn, có thể bỏ trống</li>
            <li><strong>Booking ID:</strong> Cần thiết để liên kết với đặt phòng của bạn</li>
            <li><strong>Scale:</strong> 1 sao = Rất kém, 5 sao = Xuất sắc</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default FeedbackForm;