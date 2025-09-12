import React, { useState, useEffect } from 'react';
import { useParams, useNavigate,Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './BlogDetail.css';

// Import default images
import P4 from '../../images/img_4.jpg';
import P5 from '../../images/img_5.jpg';
import P6 from '../../images/img_6.jpg';
import P7 from '../../images/img_7.jpg';

function BlogDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [relatedBlogs, setRelatedBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Fetch blog detail
    const fetchBlogDetail = async () => {
        setLoading(true);
        try {
            console.log('📖 Fetching blog detail for ID:', id);
            
            const response = await fetch(`http://localhost:3000/api/blogs/${id}`);
            const result = await response.json();

            if (response.ok && result.success) {
                setBlog(result.data);
                console.log('✅ Blog detail fetched:', result.data);
                
                // Fetch related blogs by category
                if (result.data.CategoryID) {
                    await fetchRelatedBlogs(result.data.CategoryID, id);
                }
            } else {
                throw new Error(result.message || 'Không thể tải bài viết');
            }
        } catch (error) {
            console.error('❌ Error fetching blog detail:', error);
            setError(error.message);
            toast.error(`Lỗi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Fetch related blogs
    const fetchRelatedBlogs = async (categoryId, currentBlogId) => {
        try {
            const response = await fetch(`http://localhost:3000/api/blogs/category/${categoryId}?limit=4`);
            const result = await response.json();

            if (response.ok && result.success) {
                // Filter out current blog
                const filtered = result.data.filter(blog => blog.PostID !== parseInt(currentBlogId));
                setRelatedBlogs(filtered.slice(0, 3)); // Take only 3 related blogs
                console.log('✅ Related blogs fetched:', filtered.length);
            }
        } catch (error) {
            console.error('❌ Error fetching related blogs:', error);
        }
    };

    useEffect(() => {
        if (id) {
            fetchBlogDetail();
        }
    }, [id]);

    // ✅ Get blog image with fallback
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

    // ✅ Format content with paragraphs
    const formatContent = (content) => {
        if (!content) return '';
        
        // Split by double newlines to create paragraphs
        const paragraphs = content.split(/\n\s*\n/);
        
        return paragraphs.map((paragraph, index) => {
            if (paragraph.trim()) {
                return (
                    <p key={index} className="blog-paragraph">
                        {paragraph.trim()}
                    </p>
                );
            }
            return null;
        }).filter(Boolean);
    };

    // ✅ Share functions
    const shareOnFacebook = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(blog?.Title || '');
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
    };

    const shareOnTwitter = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(blog?.Title || '');
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Đã sao chép link bài viết!');
    };

    // ✅ Loading state
    if (loading) {
        return (
            <div className="blog-detail-container">
                <div className="container">
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h5>Đang tải bài viết...</h5>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Error state
    if (error || !blog) {
        return (
            <div className="blog-detail-container">
                <div className="container">
                    <div className="text-center py-5">
                        <div className="alert alert-danger">
                            <h4>
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Không tìm thấy bài viết
                            </h4>
                            <p>{error || 'Bài viết không tồn tại hoặc đã bị xóa.'}</p>
                            <button 
                                className="btn btn-primary"
                                onClick={() => navigate('/blogs')}
                            >
                                <i className="fas fa-arrow-left me-1"></i>
                                Về trang blog
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="blog-detail-container">
            {/* ✅ Breadcrumb */}
            <div className="breadcrumb-section">
                <div className="container">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item">
                                <a href="/">
                                    <i className="fas fa-home me-1"></i>
                                    Trang chủ
                                </a>
                            </li>
                            <li className="breadcrumb-item">
                                <a href="/blogs">Blog</a>
                            </li>
                            <li className="breadcrumb-item">
                                <a href={`/blogs/category/${blog.CategoryID}`}>
                                    {blog.CategoryName}
                                </a>
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">
                                {blog.Title}
                            </li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="container">
                <div className="row">
                    {/* ✅ Main content */}
                    <div className="col-lg-8">
                        <article className="blog-article">
                            {/* ✅ Article header */}
                            <header className="article-header">
                                <div className="article-category">
                                    <span className="category-badge">
                                        {blog.CategoryName}
                                    </span>
                                </div>
                                
                                <h1 className="article-title">{blog.Title}</h1>
                                
                                <div className="article-meta">
                                    <div className="meta-item">
                                        <i className="fas fa-user text-primary me-1"></i>
                                        <span>Tác giả: <strong>{blog.AuthorName}</strong></span>
                                    </div>
                                    <div className="meta-item">
                                        <i className="fas fa-calendar text-primary me-1"></i>
                                        <span>{blog.formattedDate}</span>
                                    </div>
                                    <div className="meta-item">
                                        <i className="fas fa-clock text-primary me-1"></i>
                                        <span>{blog.readTime} phút đọc</span>
                                    </div>
                                    <div className="meta-item">
                                        <i className="fas fa-file-text text-primary me-1"></i>
                                        <span>{blog.wordCount} từ</span>
                                    </div>
                                </div>
                            </header>

                            {/* ✅ Featured image */}
                            <div className="article-image">
                                <img 
                                    src={getBlogImage(blog)} 
                                    alt={blog.Title}
                                    className="img-fluid rounded"
                                    onError={(e) => {
                                        e.target.src = P7;
                                    }}
                                />
                            </div>

                            {/* ✅ Article content */}
                            <div className="article-content">
                                {formatContent(blog.Content)}
                            </div>

                            {/* ✅ Article footer */}
                            <footer className="article-footer">
                                <div className="row align-items-center">
                                    <div className="col-md-6">
                                        <div className="article-tags">
                                            <span className="tags-label">Danh mục:</span>
                                            <span className="tag">{blog.CategoryName}</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="article-share">
                                            <span className="share-label">Chia sẻ:</span>
                                            <button 
                                                className="share-btn facebook"
                                                onClick={shareOnFacebook}
                                                title="Chia sẻ lên Facebook"
                                            >
                                                <i className="fab fa-facebook-f"></i>
                                            </button>
                                            <button 
                                                className="share-btn twitter"
                                                onClick={shareOnTwitter}
                                                title="Chia sẻ lên Twitter"
                                            >
                                                <i className="fab fa-twitter"></i>
                                            </button>
                                            <button 
                                                className="share-btn copy"
                                                onClick={copyLink}
                                                title="Sao chép link"
                                            >
                                                <i className="fas fa-link"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </footer>
                        </article>

                        {/* ✅ Navigation to previous/next blog */}
                        <div className="blog-navigation">
                            <div className="row">
                                <div className="col-6">
                                    <button 
                                        className="btn btn-outline-primary w-100"
                                        onClick={() => navigate('/blogs')}
                                    >
                                        <i className="fas fa-arrow-left me-1"></i>
                                        Về trang blog
                                    </button>
                                </div>
                                <div className="col-6">
                                    <button 
                                        className="btn btn-primary w-100"
                                        onClick={() => navigate('/')}
                                    >
                                        Trang chủ
                                        <i className="fas fa-arrow-right ms-1"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Sidebar */}
                    <div className="col-lg-4">
                        <aside className="blog-sidebar">
                            {/* ✅ Author info */}
                            <div className="sidebar-widget author-widget">
                                <h5 className="widget-title">Về tác giả</h5>
                                <div className="author-info">
                                    <div className="author-avatar">
                                        <i className="fas fa-user-circle"></i>
                                    </div>
                                    <div className="author-details">
                                        <h6>{blog.AuthorName}</h6>
                                        <p className="text-muted">
                                            Chuyên gia chia sẻ kinh nghiệm du lịch và khách sạn
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ✅ Related blogs */}
                            {relatedBlogs.length > 0 && (
                                <div className="sidebar-widget related-posts">
                                    <h5 className="widget-title">Bài viết liên quan</h5>
                                    <div className="related-posts-list">
                                        {relatedBlogs.map((relatedBlog) => (
                                            <div 
                                                key={relatedBlog.PostID} 
                                                className="related-post-item"
                                                onClick={() => navigate(`/blog/${relatedBlog.PostID}`)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="related-post-image">
                                                    <img 
                                                        src={getBlogImage(relatedBlog)} 
                                                        alt={relatedBlog.Title}
                                                        onError={(e) => {
                                                            e.target.src = P7;
                                                        }}
                                                    />
                                                </div>
                                                <div className="related-post-content">
                                                    <h6 className="related-post-title">
                                                        {relatedBlog.Title}
                                                    </h6>
                                                    <span className="related-post-date">
                                                        {new Date(relatedBlog.CreateAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ✅ Quick contact */}
                            <div className="sidebar-widget contact-widget">
                                <h5 className="widget-title">Liên hệ với chúng tôi</h5>
                                <div className="contact-info">
                                    <div className="contact-item">
                                        <i className="fas fa-phone text-primary"></i>
                                        <span>0865.124.996</span>
                                    </div>
                                    <div className="contact-item">
                                        <i className="fas fa-envelope text-primary"></i>
                                        <span>datltthe194235@gmail.com</span>
                                    </div>
                                    <div className="contact-item">
                                        <i className="fas fa-map-marker-alt text-primary"></i>
                                        <span>FPT University, Hòa Lạc</span>
                                    </div>
                                </div>
                                <Link to="/contact" className="btn btn-primary btn-sm mt-3">
                                    <i className="fas fa-paper-plane me-1"></i>
                                    Gửi tin nhắn
                                </Link>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BlogDetail;