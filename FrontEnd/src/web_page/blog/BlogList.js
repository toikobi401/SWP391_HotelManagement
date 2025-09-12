import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import './BlogList.css';
import { useAuth } from '../../contexts/AuthContext'; // Đảm bảo đã import
import BlogUpdate from './BlogUpdate'; // Thêm import mới

// Import default images
import P4 from '../../images/img_4.jpg';
import P5 from '../../images/img_5.jpg';
import P6 from '../../images/img_6.jpg';
import P7 from '../../images/img_7.jpg';

function BlogList() {
    const { user, hasRole } = useAuth(); // Lấy thông tin user và hàm kiểm tra role
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // States
    const [blogs, setBlogs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedBlog, setSelectedBlog] = useState(null);
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'CreateAt');
    const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'DESC');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBlogs, setTotalBlogs] = useState(0);
    const [blogsPerPage] = useState(9);

    // ✅ Blog categories data
    const blogCategories = [
        {
            CategoryID: 1,
            CategoryName: 'Kinh nghiệm du lịch',
            Description: 'Chia sẻ bí quyết du lịch, mẹo đặt phòng, hành trình khám phá địa phương…',
            icon: 'fas fa-map-marked-alt',
            color: '#28a745'
        },
        {
            CategoryID: 2,
            CategoryName: 'Ẩm thực & Nhà hàng',
            Description: 'Giới thiệu món ăn đặc sản, ẩm thực tại khách sạn và các địa điểm ăn uống nổi bật gần đó.',
            icon: 'fas fa-utensils',
            color: '#ffc107'
        },
        {
            CategoryID: 3,
            CategoryName: 'Hướng dẫn tham quan',
            Description: 'Gợi ý các điểm đến nổi tiếng, tour tham quan, hoạt động vui chơi giải trí quanh khách sạn.',
            icon: 'fas fa-binoculars',
            color: '#17a2b8'
        }
    ];

    // ✅ Fetch blogs với filters
    const fetchBlogs = async (page = 1, search = '', category = '', sort = 'CreateAt', order = 'DESC') => {
        setSearchLoading(page === 1 ? false : true);
        if (page === 1) setLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: blogsPerPage.toString(),
                sortBy: sort,
                sortOrder: order
            });

            if (search.trim()) {
                params.append('search', search.trim());
            }

            if (category) {
                params.append('category', category);
            }

            console.log('📖 Fetching blogs with params:', Object.fromEntries(params));

            let url = 'http://localhost:3000/api/blogs/published';
            if (category && !search.trim()) {
                url = `http://localhost:3000/api/blogs/category/${category}`;
            } else if (search.trim()) {
                url = 'http://localhost:3000/api/blogs/search';
            }

            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                credentials: 'include', // ✅ Thêm dòng này để gửi cookie session
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();

            if (response.ok && result.success) {
                setBlogs(result.data || []);
                setTotalBlogs(result.pagination?.total || result.data?.length || 0);
                setTotalPages(Math.ceil((result.pagination?.total || result.data?.length || 0) / blogsPerPage));
                
                console.log('✅ Blogs fetched:', {
                    count: result.data?.length || 0,
                    total: result.pagination?.total || 0,
                    page: page
                });
            } else {
                console.error('❌ Failed to fetch blogs:', result.message);
                setBlogs([]);
                setTotalBlogs(0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('❌ Error fetching blogs:', error);
            toast.error('Lỗi khi tải danh sách bài viết');
            setBlogs([]);
            setTotalBlogs(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
            setSearchLoading(false);
        }
    };

    // ✅ Update URL params
    const updateUrlParams = (newParams) => {
        const params = new URLSearchParams(searchParams);
        
        Object.keys(newParams).forEach(key => {
            if (newParams[key]) {
                params.set(key, newParams[key]);
            } else {
                params.delete(key);
            }
        });

        setSearchParams(params);
    };

    // ✅ Handle search
    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        updateUrlParams({
            search: searchTerm,
            category: selectedCategory,
            sort: sortBy,
            order: sortOrder,
            page: '1'
        });
        fetchBlogs(1, searchTerm, selectedCategory, sortBy, sortOrder);
    };

    // ✅ Handle category filter
    const handleCategoryFilter = (categoryId) => {
        setSelectedCategory(categoryId);
        setCurrentPage(1);
        updateUrlParams({
            search: searchTerm,
            category: categoryId,
            sort: sortBy,
            order: sortOrder,
            page: '1'
        });
        fetchBlogs(1, searchTerm, categoryId, sortBy, sortOrder);
    };

    // ✅ Handle sort change
    const handleSortChange = (newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setCurrentPage(1);
        updateUrlParams({
            search: searchTerm,
            category: selectedCategory,
            sort: newSortBy,
            order: newSortOrder,
            page: '1'
        });
        fetchBlogs(1, searchTerm, selectedCategory, newSortBy, newSortOrder);
    };

    // ✅ Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page);
        updateUrlParams({
            search: searchTerm,
            category: selectedCategory,
            sort: sortBy,
            order: sortOrder,
            page: page.toString()
        });
        fetchBlogs(page, searchTerm, selectedCategory, sortBy, sortOrder);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ✅ Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setSortBy('CreateAt');
        setSortOrder('DESC');
        setCurrentPage(1);
        setSearchParams({});
        fetchBlogs(1, '', '', 'CreateAt', 'DESC');
    };

    // ✅ Get blog image
    const getBlogImage = (blog) => {
        if (blog?.image) {
            return blog.image;
        }
        
        const categoryImages = {
            1: P4, // Kinh nghiệm du lịch
            2: P5, // Ẩm thực & Nhà hàng  
            3: P6, // Hướng dẫn tham quan
        };
        
        return categoryImages[blog?.CategoryID] || P7;
    };

    // ✅ Create excerpt
    const createExcerpt = (content, maxLength = 120) => {
        if (!content) return 'Nội dung đang được cập nhật...';
        
        const textContent = content.replace(/<[^>]*>/g, '');
        if (textContent.length <= maxLength) {
            return textContent;
        }
        
        return textContent.substring(0, maxLength).trim() + '...';
    };

    // ✅ Format date
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

    // ✅ Get category info
    const getCategoryInfo = (categoryId) => {
        return blogCategories.find(cat => cat.CategoryID === categoryId) || {
            CategoryName: 'Khác',
            icon: 'fas fa-tag',
            color: '#6c757d'
        };
    };

    // ✅ Initial load
    useEffect(() => {
        fetchBlogs(currentPage, searchTerm, selectedCategory, sortBy, sortOrder);
    }, []);

    // Kiểm tra quyền quản lý
    const isManager = hasRole && hasRole(1);

    // Xử lý xóa bài viết
    const handleDeleteBlog = async (blogId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
        try {
            const response = await fetch(`http://localhost:3000/api/blogs/${blogId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok && data.success) {
                toast.success('Đã xóa bài viết thành công');
                // Reload lại danh sách blog
                fetchBlogs(currentPage, searchTerm, selectedCategory, sortBy, sortOrder);
            } else {
                toast.error(data.message || 'Xóa bài viết thất bại');
            }
        } catch (error) {
            toast.error('Lỗi khi xóa bài viết');
        }
    };

    return (
        <div className="blog-list-container">
            {/* ✅ Hero Section */}
            <div className="blog-hero">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-8 mx-auto text-center">
                            <h1 className="hero-title">
                                <i className="fas fa-newspaper me-3"></i>
                                Blog Du Lịch & Khách Sạn
                            </h1>
                            <p className="hero-subtitle">
                                Khám phá những câu chuyện thú vị, mẹo du lịch và trải nghiệm độc đáo 
                                từ các chuyên gia và khách hàng của chúng tôi
                            </p>
                            <div className="hero-stats">
                                <div className="stat-item">
                                    <strong>{totalBlogs}</strong>
                                    <span>Bài viết</span>
                                </div>
                                <div className="stat-item">
                                    <strong>{blogCategories.length}</strong>
                                    <span>Danh mục</span>
                                </div>
                                <div className="stat-item">
                                    <strong>24/7</strong>
                                    <span>Cập nhật</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                {/* ✅ Search & Filter Section */}
                <div className="blog-filters">
                    <div className="row">
                        <div className="col-lg-8">
                            {/* Search Form */}
                            <form onSubmit={handleSearch} className="search-form">
                                <div className="search-input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Tìm kiếm bài viết..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                                        {searchLoading ? (
                                            <div className="spinner-border spinner-border-sm" role="status"></div>
                                        ) : (
                                            <i className="fas fa-search"></i>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Category Filter */}
                            <div className="category-filter">
                                <button
                                    className={`category-btn ${!selectedCategory ? 'active' : ''}`}
                                    onClick={() => handleCategoryFilter('')}
                                >
                                    <i className="fas fa-th-large me-2"></i>
                                    Tất cả
                                </button>
                                {blogCategories.map(category => (
                                    <button
                                        key={category.CategoryID}
                                        className={`category-btn ${selectedCategory == category.CategoryID ? 'active' : ''}`}
                                        onClick={() => handleCategoryFilter(category.CategoryID.toString())}
                                        style={{ 
                                            '--category-color': category.color 
                                        }}
                                    >
                                        <i className={`${category.icon} me-2`}></i>
                                        {category.CategoryName}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="col-lg-4">
                            {/* Sort Options */}
                            <div className="sort-options">
                                <label className="sort-label">Sắp xếp:</label>
                                <select
                                    className="form-select"
                                    value={`${sortBy}-${sortOrder}`}
                                    onChange={(e) => {
                                        const [newSortBy, newSortOrder] = e.target.value.split('-');
                                        handleSortChange(newSortBy, newSortOrder);
                                    }}
                                >
                                    <option value="CreateAt-DESC">Mới nhất</option>
                                    <option value="CreateAt-ASC">Cũ nhất</option>
                                    <option value="Title-ASC">Tiêu đề A-Z</option>
                                    <option value="Title-DESC">Tiêu đề Z-A</option>
                                </select>
                            </div>

                            {/* Clear Filters */}
                            {(searchTerm || selectedCategory || sortBy !== 'CreateAt' || sortOrder !== 'DESC') && (
                                <button 
                                    className="btn btn-outline-secondary btn-sm clear-filters"
                                    onClick={clearFilters}
                                >
                                    <i className="fas fa-times me-1"></i>
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ✅ Results Info */}
                <div className="results-info">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <p className="results-text">
                                {loading ? (
                                    'Đang tải...'
                                ) : (
                                    <>
                                        Hiển thị <strong>{Math.min((currentPage - 1) * blogsPerPage + 1, totalBlogs)}</strong>
                                        {' '}-{' '}
                                        <strong>{Math.min(currentPage * blogsPerPage, totalBlogs)}</strong>
                                        {' '}trong số <strong>{totalBlogs}</strong> bài viết
                                        {searchTerm && (
                                            <>
                                                {' '}cho từ khóa "<strong>{searchTerm}</strong>"
                                            </>
                                        )}
                                        {selectedCategory && (
                                            <>
                                                {' '}trong danh mục "<strong>{getCategoryInfo(parseInt(selectedCategory)).CategoryName}</strong>"
                                            </>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="col-md-6 text-md-end">
                            <span className="page-info">
                                Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ✅ Blog Grid */}
                {loading ? (
                    <div className="loading-section">
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <h5>Đang tải bài viết...</h5>
                            <p className="text-muted">Vui lòng đợi trong giây lát</p>
                        </div>
                    </div>
                ) : blogs.length > 0 ? (
                    <>
                        <div className="blog-grid">
                            <div className="row">
                                {blogs.map((blog, index) => {
                                    const categoryInfo = getCategoryInfo(blog.CategoryID);
                                    return (
                                        <div className="col-lg-4 col-md-6 mb-4" key={blog.PostID}>
                                            <article className="blog-card">
                                                <div className="blog-image">
                                                    <img 
                                                        src={getBlogImage(blog)} 
                                                        alt={blog.Title}
                                                        className="img-fluid"
                                                        onError={(e) => {
                                                            e.target.src = P7;
                                                        }}
                                                    />
                                                    <div 
                                                        className="blog-category-badge"
                                                        style={{ backgroundColor: categoryInfo.color }}
                                                    >
                                                        <i className={`${categoryInfo.icon} me-1`}></i>
                                                        {blog.CategoryName || categoryInfo.CategoryName}
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
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => navigate(`/blog/${blog.PostID}`)}
                                                        >
                                                            <i className="fas fa-arrow-right me-1"></i>
                                                            Đọc tiếp
                                                        </button>
                                                        {isManager && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-warning btn-sm ms-2"
                                                                    onClick={() => {
                                                                        setSelectedBlog(blog);
                                                                        setShowUpdateModal(true);
                                                                    }}
                                                                >
                                                                    <i className="fas fa-edit"></i> Sửa
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger btn-sm ms-2"
                                                                    onClick={() => handleDeleteBlog(blog.PostID)}
                                                                >
                                                                    <i className="fas fa-trash"></i> Xóa
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ✅ Pagination */}
                        {totalPages > 1 && (
                            <div className="blog-pagination">
                                <nav aria-label="Blog pagination">
                                    <ul className="pagination justify-content-center">
                                        {/* Previous */}
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button 
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                <i className="fas fa-chevron-left"></i>
                                                <span className="d-none d-sm-inline ms-1">Trước</span>
                                            </button>
                                        </li>

                                        {/* Page numbers */}
                                        {[...Array(totalPages)].map((_, index) => {
                                            const page = index + 1;
                                            const showPage = (
                                                page === 1 || 
                                                page === totalPages || 
                                                (page >= currentPage - 2 && page <= currentPage + 2)
                                            );

                                            if (!showPage) {
                                                if (page === currentPage - 3 || page === currentPage + 3) {
                                                    return (
                                                        <li key={page} className="page-item disabled">
                                                            <span className="page-link">...</span>
                                                        </li>
                                                    );
                                                }
                                                return null;
                                            }

                                            return (
                                                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                                    <button 
                                                        className="page-link"
                                                        onClick={() => handlePageChange(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            );
                                        })}

                                        {/* Next */}
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <button 
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                <span className="d-none d-sm-inline me-1">Sau</span>
                                                <i className="fas fa-chevron-right"></i>
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="no-results">
                        <div className="text-center py-5">
                            <div className="no-results-icon">
                                <i className="fas fa-search"></i>
                            </div>
                            <h4>Không tìm thấy bài viết nào</h4>
                            <p className="text-muted">
                                {searchTerm || selectedCategory ? (
                                    <>
                                        Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.
                                        <br />
                                        <button 
                                            className="btn btn-link p-0"
                                            onClick={clearFilters}
                                        >
                                            Xóa tất cả bộ lọc
                                        </button>
                                    </>
                                ) : (
                                    'Hiện tại chưa có bài viết nào được xuất bản.'
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {/* ✅ Category Info Section */}
                {selectedCategory && (
                    <div className="category-info-section">
                        <div className="row">
                            <div className="col-12">
                                {(() => {
                                    const categoryInfo = getCategoryInfo(parseInt(selectedCategory));
                                    return (
                                        <div className="category-info-card">
                                            <div className="category-info-content">
                                                <div className="category-info-icon" style={{ color: categoryInfo.color }}>
                                                    <i className={categoryInfo.icon}></i>
                                                </div>
                                                <div className="category-info-text">
                                                    <h5>{categoryInfo.CategoryName}</h5>
                                                    <p>{categoryInfo.Description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ Blog Update Modal */}
            <BlogUpdate
                isOpen={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                blog={selectedBlog}
                onUpdated={() => {
                    setShowUpdateModal(false);
                    fetchBlogs(currentPage, searchTerm, selectedCategory, sortBy, sortOrder);
                }}
            />
        </div>
    );
}

export default BlogList;