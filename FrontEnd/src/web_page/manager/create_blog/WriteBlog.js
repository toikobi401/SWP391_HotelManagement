import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import './BlogForm.css';

function WriteBlog() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [status, setStatus] = useState(true);
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const { user } = useAuth();

    // ✅ Blog categories
    const blogCategories = [
        {
            CategoryID: 1,
            CategoryName: 'Kinh nghiệm du lịch',
            Description: 'Chia sẻ bí quyết du lịch, mẹo đặt phòng, hành trình khám phá địa phương…'
        },
        {
            CategoryID: 2,
            CategoryName: 'Ẩm thực & Nhà hàng',
            Description: 'Giới thiệu món ăn đặc sản, ẩm thực tại khách sạn và các địa điểm ăn uống nổi bật gần đó.'
        },
        {
            CategoryID: 3,
            CategoryName: 'Hướng dẫn tham quan',
            Description: 'Gợi ý các điểm đến nổi tiếng, tour tham quan, hoạt động vui chơi giải trí quanh khách sạn.'
        }
    ];

 

    // ✅ SỬA: Handle form submission với error handling chi tiết
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('📝 Form submission started...');

        if (!user) {
            toast.error('Bạn cần đăng nhập để tạo bài viết');
            return;
        }

        if (!title.trim()) {
            toast.error('Vui lòng nhập tiêu đề bài viết');
            return;
        }

        if (!content.trim()) {
            toast.error('Vui lòng nhập nội dung bài viết');
            return;
        }

        if (!categoryId) {
            toast.error('Vui lòng chọn danh mục bài viết');
            return;
        }

        try {
            setLoading(true);
            
            // ✅ Prepare blog data
            const blogData = {
                Title: title.trim(),
                Content: content.trim(),
                AuthorID: user.UserID,
                CategoryID: parseInt(categoryId),
                Status: status
            };

            // ✅ Handle image if selected
            if (image) {
                console.log('🖼️ Processing image...');
                const imageBase64 = await convertImageToBase64(image);
                blogData.image = imageBase64;
                console.log('✅ Image converted to base64, size:', imageBase64.length);
            }

            console.log('📝 Blog data prepared:', {
                ...blogData,
                imageSize: blogData.image ? 'Has image' : 'No image'
            });

            // ✅ SỬA: Network request với detailed error handling
            console.log('🌐 Sending request to server...');
            
            // Test if server is reachable first
            try {
                const healthCheck = await fetch('http://localhost:3000/health');
                if (!healthCheck.ok) {
                    throw new Error(`Server health check failed: ${healthCheck.status}`);
                }
                console.log('✅ Server is reachable');
            } catch (healthError) {
                console.error('❌ Server health check failed:', healthError);
                throw new Error(`Không thể kết nối với server. Vui lòng kiểm tra server có đang chạy không.`);
            }

            const response = await fetch('http://localhost:3000/api/blogs', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(blogData)
            });

            console.log('📡 Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📝 Server response:', result);

            if (result.success) {
                toast.success('Tạo bài viết thành công!');
                console.log('✅ Blog created successfully:', result.data);
                
                // Reset form
                setTitle('');
                setContent('');
                setCategoryId('');
                setImage(null);
                setImagePreview(null);
                setStatus(true);
                
                // Navigate back
                setTimeout(() => {
                    navigate('/manager/rooms');
                }, 1500);
            } else {
                throw new Error(result.message || 'Không thể tạo bài viết');
            }

        } catch (error) {
            console.error('❌ Error creating blog:', error);
            
            // ✅ Specific error messages
            let errorMessage = 'Lỗi tạo bài viết: ';
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage += 'Không thể kết nối với server. Vui lòng kiểm tra:\n' +
                                '1. Server backend có đang chạy không?\n' + 
                                '2. Server có chạy trên port 3000 không?\n' +
                                '3. Kiểm tra firewall hoặc antivirus.';
            } else {
                errorMessage += error.message;
            }
            
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Convert image to base64
    const convertImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // ✅ Handle image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn file hình ảnh');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước file không được vượt quá 5MB');
                return;
            }

            setImage(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // ✅ Remove image
    const removeImage = () => {
        setImage(null);
        setImagePreview(null);
        const fileInput = document.getElementById('imageInput');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const currentDate = new Date().toLocaleString('vi-VN', { 
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="blog-form-container">
            <div className="form-header">
                <h2>
                    <i className="fas fa-edit me-2"></i>
                    Tạo bài viết mới
                </h2>
                <p className="text-muted">Chia sẻ kinh nghiệm và kiến thức của bạn với khách hàng</p>
            </div>

            <form onSubmit={handleSubmit}>

                {/* ✅ Tiêu đề */}
                <div className="form-group mb-3">
                    <label htmlFor="title">
                        <i className="fas fa-heading me-1"></i>
                        Tiêu đề bài viết <span className="text-danger">*</span>
                    </label>
                    <input
                        id="title"
                        type="text"
                        className="form-control"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Nhập tiêu đề hấp dẫn cho bài viết..."
                        maxLength={255}
                        required
                    />
                    <small className="form-text text-muted">
                        {title.length}/255 ký tự
                    </small>
                </div>
                
                {/* ✅ Danh mục */}
                <div className="form-group mb-3">
                    <label htmlFor="category">
                        <i className="fas fa-tags me-1"></i>
                        Danh mục <span className="text-danger">*</span>
                    </label>
                    <select
                        id="category"
                        className="form-control"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                    >
                        <option value="">-- Chọn danh mục --</option>
                        {blogCategories.map(category => (
                            <option key={category.CategoryID} value={category.CategoryID}>
                                {category.CategoryName}
                            </option>
                        ))}
                    </select>
                    {categoryId && (
                        <small className="form-text text-info">
                            <i className="fas fa-info-circle me-1"></i>
                            {blogCategories.find(c => c.CategoryID === parseInt(categoryId))?.Description}
                        </small>
                    )}
                </div>
                
                {/* ✅ Nội dung */}
                <div className="form-group mb-3">
                    <label htmlFor="content">
                        <i className="fas fa-align-left me-1"></i>
                        Nội dung bài viết <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="content"
                        className="form-control"
                        rows="12"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Viết nội dung bài viết của bạn tại đây..."
                        required
                    />
                    <small className="form-text text-muted">
                        {content.length} ký tự
                    </small>
                </div>
                
                {/* ✅ Tác giả (readonly) */}
                <div className="form-group mb-3">
                    <label>
                        <i className="fas fa-user me-1"></i>
                        Tác giả
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        value={user?.Fullname || user?.Username || 'Unknown User'}
                        readOnly
                    />
                </div>
                
                {/* ✅ Ngày tạo (readonly) */}
                <div className="form-group mb-3">
                    <label>
                        <i className="fas fa-calendar me-1"></i>
                        Ngày tạo
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        value={currentDate}
                        readOnly
                    />
                </div>
                
                {/* ✅ Hình ảnh */}
                <div className="form-group mb-3">
                    <label htmlFor="imageInput">
                        <i className="fas fa-image me-1"></i>
                        Hình ảnh đại diện (tùy chọn)
                    </label>
                    <input
                        id="imageInput"
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    <small className="form-text text-muted">
                        Chọn hình ảnh (JPEG, PNG, GIF) - Tối đa 5MB
                    </small>
                    
                    {/* ✅ Image preview */}
                    {imagePreview && (
                        <div className="image-preview mt-2">
                            <div className="preview-container">
                                <img 
                                    src={imagePreview} 
                                    alt="Preview" 
                                    className="img-thumbnail"
                                    style={{ maxWidth: '200px', maxHeight: '200px' }}
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-sm btn-danger ms-2"
                                    onClick={removeImage}
                                >
                                    <i className="fas fa-times"></i> Xóa
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ✅ Trạng thái */}
                <div className="form-group mb-4">
                    <label>
                        <i className="fas fa-toggle-on me-1"></i>
                        Trạng thái
                    </label>
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="radio"
                            id="published"
                            name="status"
                            checked={status === true}
                            onChange={() => setStatus(true)}
                        />
                        <label className="form-check-label" htmlFor="published">
                            <i className="fas fa-eye text-success me-1"></i>
                            Xuất bản ngay
                        </label>
                    </div>
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="radio"
                            id="draft"
                            name="status"
                            checked={status === false}
                            onChange={() => setStatus(false)}
                        />
                        <label className="form-check-label" htmlFor="draft">
                            <i className="fas fa-eye-slash text-warning me-1"></i>
                            Lưu nháp
                        </label>
                    </div>
                </div>
                
                {/* ✅ Action buttons */}
                <div className="form-actions d-flex gap-2">
                    <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save me-1"></i>
                                {status ? 'Xuất bản' : 'Lưu nháp'}
                            </>
                        )}
                    </button>
                    
                    <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => navigate('/manager/rooms')}
                        disabled={loading}
                    >
                        <i className="fas fa-times me-1"></i>
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
}

export default WriteBlog;