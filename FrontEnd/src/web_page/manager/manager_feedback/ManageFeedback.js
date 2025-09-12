import React, { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import "./ManageFeedback.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

function ManageFeedback() {
  // ✅ States for API data
  const [feedbacks, setFeedbacks] = useState([]);
  const [averageRatings, setAverageRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  
  // ✅ Filter states
  const [filter, setFilter] = useState("all");
  const [dateOrder, setDateOrder] = useState("all");
  const [dateCreated, setDateCreated] = useState("");
  const [tempFilter, setTempFilter] = useState("all");
  const [tempDateOrder, setTempDateOrder] = useState("all");
  const [tempDateCreated, setTempDateCreated] = useState("");
  const [openComment, setOpenComment] = useState(null);
  
  // ✅ Chart visibility state
  const [showCharts, setShowCharts] = useState(true);

  // ✅ Fetch feedbacks from API
  const fetchFeedbacks = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/feedbacks?page=${page}&limit=10`, {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        console.log('🔍 [DEBUG] API Response data:', result.data.slice(0, 2)); // Log 2 items đầu
        
        // ✅ Convert data to match component format với highlighted
        const convertedFeedbacks = result.data.map(fb => {
          console.log('🔍 [DEBUG] Converting feedback:', {
            feedbackID: fb.feedbackID,
            customerName: fb.customerName,
            customerUsername: fb.customerUsername,
            customerID: fb.customerID
          });
          
          return {
            id: fb.feedbackID,
            user: fb.customerName || fb.customerUsername || 'Khách hàng ẩn danh',
            customerName: fb.customerName,
            customerUsername: fb.customerUsername,
            customerEmail: fb.customerEmail,
            OverallRating: fb.overallRating,
            ServiceRating: fb.serviceRating,
            CleanlinessRating: fb.cleanlinessRating,
            LocationRating: fb.locationRating || 0,
            BreakfastRating: fb.breakfastRating || 0,
            comment: fb.comment || 'Không có nhận xét',
            date: fb.createAt ? new Date(fb.createAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            bookingID: fb.bookingID,
            customerID: fb.customerID,
            highlighted: fb.highlighted || false // ✅ THÊM: Highlighted status
          };
        });
        
        setFeedbacks(convertedFeedbacks);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalFeedbacks(result.pagination?.total || 0);
      } else {
        toast.error('Không thể tải danh sách feedback');
        setFeedbacks([]);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error('Lỗi kết nối khi tải feedback');
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch average ratings for charts
  const fetchAverageRatings = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/feedbacks/statistics/averages', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setAverageRatings({
          overallRating: parseFloat(result.data.overallRating),
          serviceRating: parseFloat(result.data.serviceRating),
          cleanlinessRating: parseFloat(result.data.cleanlinessRating),
          locationRating: parseFloat(result.data.locationRating),
          breakfastRating: parseFloat(result.data.breakfastRating),
          totalFeedbacks: result.data.totalFeedbacks,
          highlightedFeedbacks: result.data.highlightedFeedbacks, // ✅ THÊM: Highlighted count
          averageOverall: parseFloat(result.data.averageOverall)
        });
      }
    } catch (error) {
      console.error('Error fetching average ratings:', error);
    }
  };

  // ✅ SỬA: Toggle highlight status thay vì delete
  const toggleHighlight = async (id, currentHighlighted) => {
    try {
      const response = await fetch(`http://localhost:3000/api/feedbacks/${id}/highlight`, {
        method: 'PATCH',
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        const action = result.data.highlighted ? 'highlighted' : 'unhighlighted';
        toast.success(`Feedback đã được ${action === 'highlighted' ? 'đánh dấu nổi bật' : 'bỏ đánh dấu nổi bật'}`);
        
        // ✅ Update local state
        setFeedbacks(prevFeedbacks => 
          prevFeedbacks.map(fb => 
            fb.id === id 
              ? { ...fb, highlighted: result.data.highlighted }
              : fb
          )
        );
        
        // Refresh statistics to get updated highlighted count
        fetchAverageRatings();
      } else {
        toast.error('Không thể thay đổi trạng thái highlight');
      }
    } catch (error) {
      console.error('Error toggling highlight:', error);
      toast.error('Lỗi khi thay đổi trạng thái highlight');
    }
  };

  // ✅ Apply local filters to fetched data
  const applyLocalFilters = (data) => {
    let result = data;

    // Filter by overall rating
    if (filter !== "all") {
      result = result.filter((fb) => fb.OverallRating === Number(filter));
    }

    // Filter by date created
    if (dateCreated) {
      result = result.filter((fb) => fb.date === dateCreated);
    }

    // Sort data
    if (dateOrder === "newest") {
      result = [...result].sort((a, b) => b.date.localeCompare(a.date));
    } else if (dateOrder === "oldest") {
      result = [...result].sort((a, b) => a.date.localeCompare(b.date));
    } else if (dateOrder === "overall-asc") {
      result = [...result].sort((a, b) => a.OverallRating - b.OverallRating);
    } else if (dateOrder === "overall-desc") {
      result = [...result].sort((a, b) => b.OverallRating - a.OverallRating);
    }

    return result;
  };

  const filteredFeedbacks = applyLocalFilters(feedbacks);

  // ✅ Chart configurations
  const barChartData = {
    labels: ['Overall', 'Service', 'Cleanliness', 'Location', 'Breakfast'],
    datasets: [
      {
        label: 'Điểm đánh giá trung bình',
        data: [
          averageRatings.overallRating || 0,
          averageRatings.serviceRating || 0,
          averageRatings.cleanlinessRating || 0,
          averageRatings.locationRating || 0,
          averageRatings.breakfastRating || 0
        ],
        backgroundColor: ['#8B1538', '#D2B48C', '#A0522D', '#2563eb', '#ffc107'],
        borderRadius: 4
      }
    ]
  };

  const doughnutChartData = {
    labels: ['5 sao', '4 sao', '3 sao', '2 sao', '1 sao'],
    datasets: [
      {
        data: [
          feedbacks.filter(fb => fb.OverallRating === 5).length,
          feedbacks.filter(fb => fb.OverallRating === 4).length,
          feedbacks.filter(fb => fb.OverallRating === 3).length,
          feedbacks.filter(fb => fb.OverallRating === 2).length,
          feedbacks.filter(fb => fb.OverallRating === 1).length
        ],
        backgroundColor: ['#10b981', '#3b82f6', '#fbbf24', '#f97316', '#ef4444'],
        borderWidth: 3,
        borderColor: '#fff'
      }
    ]
  };

  // ✅ Monthly feedback trend (mock data based on current feedbacks)
  const getMonthlyTrend = () => {
    const monthlyData = Array(12).fill(0);
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    
    feedbacks.forEach(fb => {
      const month = new Date(fb.date).getMonth();
      monthlyData[month]++;
    });

    return {
      labels: monthNames,
      datasets: [
        {
          label: 'Số lượng feedback',
          data: monthlyData,
          borderColor: '#8B1538',
          backgroundColor: 'rgba(139, 21, 56, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#8B1538',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (context.dataset.label?.includes('điểm')) {
              return `${context.dataset.label}: ${context.parsed.y}/5.0`;
            }
            return `${context.dataset.label}: ${context.parsed.y || context.parsed}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5
      }
    }
  };

  // ✅ Handle filter actions
  const handleClearFilters = () => {
    setFilter("all");
    setDateOrder("all");
    setDateCreated("");
    setTempFilter("all");
    setTempDateOrder("all");
    setTempDateCreated("");
  };

  const handleApplyFilters = () => {
    setFilter(tempFilter);
    setDateCreated(tempDateCreated);
    setDateOrder(tempDateOrder);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchFeedbacks(page);
  };

  // ✅ Initial data fetch
  useEffect(() => {
    fetchFeedbacks();
    fetchAverageRatings();
  }, []);

  // ✅ Format date helper
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  // ✅ Render stars helper
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fas fa-star ${i <= rating ? 'text-warning' : 'text-muted'}`}
          style={{ fontSize: '14px', marginRight: '2px' }}
        ></i>
      );
    }
    return stars;
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-manage__hero-overlay">
      <div className="feedback-manage-container">
        <div className="feedback-header">
          <h2>Quản lý Feedback</h2>
          <div className="feedback-stats">
            <span>Hiện tại: {filteredFeedbacks.length} feedback</span>
            <span>Tổng cộng: {totalFeedbacks}</span>
            <span>Nổi bật: {averageRatings.highlightedFeedbacks || 0}</span>
          </div>
        </div>

        {/* ✅ Statistics Cards - SỬA: Thêm Highlighted card */}
        <div className="row mb-4">
          <div className="col-md-2">
            <div className="card text-center border-info">
              <div className="card-body">
                <h6 className="card-title">Overall</h6>
                <div className="mb-2">{renderStars(Math.round(averageRatings.overallRating || 0))}</div>
                <p className="card-text">{(averageRatings.overallRating || 0).toFixed(1)}/5.0</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center border-primary">
              <div className="card-body">
                <h6 className="card-title">Service</h6>
                <div className="mb-2">{renderStars(Math.round(averageRatings.serviceRating || 0))}</div>
                <p className="card-text">{(averageRatings.serviceRating || 0).toFixed(1)}/5.0</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center border-success">
              <div className="card-body">
                <h6 className="card-title">Cleanliness</h6>
                <div className="mb-2">{renderStars(Math.round(averageRatings.cleanlinessRating || 0))}</div>
                <p className="card-text">{(averageRatings.cleanlinessRating || 0).toFixed(1)}/5.0</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center border-warning">
              <div className="card-body">
                <h6 className="card-title">Location</h6>
                <div className="mb-2">{renderStars(Math.round(averageRatings.locationRating || 0))}</div>
                <p className="card-text">{(averageRatings.locationRating || 0).toFixed(1)}/5.0</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center border-secondary">
              <div className="card-body">
                <h6 className="card-title">Breakfast</h6>
                <div className="mb-2">{renderStars(Math.round(averageRatings.breakfastRating || 0))}</div>
                <p className="card-text">{(averageRatings.breakfastRating || 0).toFixed(1)}/5.0</p>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center bg-warning text-dark">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="fas fa-star me-1"></i>
                  Nổi bật
                </h6>
                <h4>{averageRatings.highlightedFeedbacks || 0}</h4>
                <p className="card-text">Feedbacks</p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Chart Toggle Button */}
        <div className="d-flex justify-content-end mb-3">
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowCharts(!showCharts)}
          >
            <i className={`fas ${showCharts ? 'fa-chart-bar' : 'fa-eye'} me-2`}></i>
            {showCharts ? 'Ẩn biểu đồ' : 'Hiện biểu đồ'}
          </button>
        </div>

        {/* ✅ Charts Section */}
        {showCharts && (
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Phân bố đánh giá Overall</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: '250px' }}>
                    <Doughnut data={doughnutChartData} options={{
                      ...chartOptions,
                      scales: undefined
                    }} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-8">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Điểm đánh giá trung bình theo tiêu chí</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: '250px' }}>
                    <Bar data={barChartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 mt-3">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Xu hướng feedback theo tháng</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: '250px' }}>
                    <Line data={getMonthlyTrend()} options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: undefined
                        }
                      }
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Existing Filter Section */}
        <div className="feedback-filters">
          <div className="filter-group">
            <label htmlFor="rating-filter">Lọc theo Overall Rating</label>
            <select
              id="rating-filter"
              className="filter-select"
              value={tempFilter}
              onChange={(e) => setTempFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              {[5, 4, 3, 2, 1].map((star) => (
                <option key={star} value={star}>
                  {star} sao
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="date-created">Ngày tạo</label>
            <input
              id="date-created"
              type="date"
              className="filter-input"
              value={tempDateCreated}
              onChange={(e) => setTempDateCreated(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="sort-order">Sắp xếp</label>
            <select
              id="sort-order"
              className="filter-select"
              value={tempDateOrder}
              onChange={(e) => setTempDateOrder(e.target.value)}
            >
              <option value="all">Toàn bộ</option>
              <option value="newest">Gần nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="overall-asc">Đánh giá thấp nhất</option>
              <option value="overall-desc">Đánh giá cao nhất</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="apply-filters-btn" onClick={handleApplyFilters}>
              Lọc
            </button>
            <button className="clear-filters-btn" onClick={handleClearFilters}>
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* ✅ SỬA: Feedback Table với nút Highlight */}
        <div className="feedback-table-wrapper">
          <table className="feedback-table">
            <thead>
              <tr>
                <th>Người gửi</th>
                <th>Booking ID</th>
                <th>Ngày gửi</th>
                <th>Overall</th>
                <th>Service</th>
                <th>Cleanliness</th>
                <th>Location</th>
                <th>Breakfast</th>
                <th>Comment</th>
                <th>Highlight</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    Đang tải...
                  </td>
                </tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data">
                    Không có feedback nào.
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((fb) => (
                  <tr key={fb.id} className={fb.highlighted ? 'highlighted-row' : ''}>
                    <td>
                      {fb.highlighted && <i className="fas fa-star text-warning me-1" title="Feedback nổi bật"></i>}
                      <div className="customer-name">
                        <strong>{fb.customerName || fb.customerUsername || 'Khách hàng ẩn danh'}</strong>
                        {fb.customerUsername && fb.customerName && (
                          <div className="text-muted small">@{fb.customerUsername}</div>
                        )}
                      </div>
                    </td>
                    <td>{fb.bookingID}</td>
                    <td>{formatDate(fb.date)}</td>
                    <td>
                      <span className={`rating rating-${fb.OverallRating}`}>
                        {fb.OverallRating} ★
                      </span>
                    </td>
                    <td>
                      <span className={`rating rating-${fb.ServiceRating}`}>
                        {fb.ServiceRating} ★
                      </span>
                    </td>
                    <td>
                      <span className={`rating rating-${fb.CleanlinessRating}`}>
                        {fb.CleanlinessRating} ★
                      </span>
                    </td>
                    <td>
                      <span className={`rating rating-${fb.LocationRating || 0}`}>
                        {fb.LocationRating || 'N/A'} {fb.LocationRating ? '★' : ''}
                      </span>
                    </td>
                    <td>
                      <span className={`rating rating-${fb.BreakfastRating || 0}`}>
                        {fb.BreakfastRating || 'N/A'} {fb.BreakfastRating ? '★' : ''}
                      </span>
                    </td>
                    <td
                      className="comment-cell"
                      title={fb.comment}
                      onClick={() => setOpenComment(fb.comment)}
                      style={{ cursor: "pointer" }}
                    >
                      {fb.comment}
                    </td>
                    <td>
                      <button
                        className={`highlight-btn ${fb.highlighted ? 'highlighted' : ''}`}
                        onClick={() => toggleHighlight(fb.id, fb.highlighted)}
                        disabled={loading}
                        title={fb.highlighted ? 'Bỏ đánh dấu nổi bật' : 'Đánh dấu nổi bật'}
                      >
                        <i className={`fas fa-star ${fb.highlighted ? 'text-warning' : 'text-muted'}`}></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        {totalPages > 1 && (
          <nav className="mt-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trước
                </button>
              </li>
              {[...Array(totalPages)].map((_, index) => (
                <li
                  key={index + 1}
                  className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}
                >
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(index + 1)}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </button>
              </li>
            </ul>
          </nav>
        )}

        {/* ✅ Comment Modal */}
        {openComment && (
          <div className="comment-modal" onClick={() => setOpenComment(null)}>
            <div className="comment-modal-content" onClick={e => e.stopPropagation()}>
              <span className="close-btn" onClick={() => setOpenComment(null)}>&times;</span>
              <h5>Chi tiết nhận xét</h5>
              <div>{openComment}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageFeedback;