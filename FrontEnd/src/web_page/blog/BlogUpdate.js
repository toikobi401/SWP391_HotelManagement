import React, { useState, useEffect } from 'react';
import SimpleModal from '../UI component/Modal/SimpleModal';
import styles from './BlogUpdate.module.css';
import { toast } from 'react-toastify';

const BlogUpdate = ({ isOpen, onClose, blog, onUpdated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [status, setStatus] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (blog) {
            setTitle(blog.Title || '');
            setContent(blog.Content || '');
            setCategoryId(blog.CategoryID || '');
            setStatus(blog.Status !== false);
        }
    }, [blog]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/blogs/${blog.PostID}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Title: title,
                    Content: content,
                    CategoryID: categoryId,
                    Status: status
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                toast.success('Cập nhật bài viết thành công');
                onUpdated && onUpdated();
            } else {
                toast.error(data.message || 'Cập nhật thất bại');
            }
        } catch (error) {
            toast.error('Lỗi khi cập nhật bài viết');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !blog) return null;

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Cập nhật bài viết">
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label>Tiêu đề</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Nội dung</label>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        required
                        rows={6}
                        className={styles.textarea}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Danh mục</label>
                    <select
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        required
                        className={styles.select}
                    >
                        <option value="">-- Chọn danh mục --</option>
                        <option value="1">Kinh nghiệm du lịch</option>
                        <option value="2">Ẩm thực & Nhà hàng</option>
                        <option value="3">Hướng dẫn tham quan</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label>Trạng thái</label>
                    <select
                        value={status ? '1' : '0'}
                        onChange={e => setStatus(e.target.value === '1')}
                        className={styles.select}
                    >
                        <option value="1">Xuất bản</option>
                        <option value="0">Nháp</option>
                    </select>
                </div>
                <div className={styles.actions}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default BlogUpdate;