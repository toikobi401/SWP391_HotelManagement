import express from 'express';
import BlogDBContext from '../dal/BlogDBContext.js';
import Blog from '../model/Blog.js';

const router = express.Router();

class BlogController {
    constructor() {
        this.blogDB = new BlogDBContext();
    }

    // ✅ GET /api/blogs - Get all blog posts with pagination and filters
    async getAllBlogs(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                categoryId,
                authorId,
                status,
                search,
                sortBy = 'CreateAt',
                sortOrder = 'DESC'
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                categoryId: categoryId ? parseInt(categoryId) : null,
                authorId: authorId ? parseInt(authorId) : null,
                status: status !== undefined ? status === 'true' : null,
                searchTerm: search || '',
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            };

            console.log('📋 Getting all blogs with options:', options);

            const result = await this.blogDB.list(options);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: 'Blogs retrieved successfully',
                    data: result.data.map(blog => blog.toJSON()),
                    pagination: result.pagination
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.getAllBlogs:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/blogs/published - Get only published blog posts
    async getPublishedBlogs(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                categoryId,
                search,
                sortBy = 'CreateAt',
                sortOrder = 'DESC'
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                categoryId: categoryId ? parseInt(categoryId) : null,
                searchTerm: search || '',
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            };

            console.log('📋 Getting published blogs with options:', options);

            const result = await this.blogDB.getPublishedPosts(options);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: 'Published blogs retrieved successfully',
                    data: result.data.map(blog => blog.toJSON()),
                    pagination: result.pagination
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.getPublishedBlogs:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/blogs/:id - Get blog post by ID
    async getBlogById(req, res) {
        try {
            const blogId = parseInt(req.params.id);
            
            if (!blogId || blogId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid blog ID provided'
                });
            }

            console.log(`📖 Fetching blog with ID: ${blogId}`);
            
            const result = await this.blogDB.get(blogId);
            
            if (result.success && result.data) {
                console.log('✅ Blog fetched successfully:', result.data.PostID);
                
                // ✅ THÊM: Format response với thông tin đầy đủ
                const blogData = result.data.toJSON ? result.data.toJSON() : result.data;
                
                return res.status(200).json({
                    success: true,
                    data: {
                        ...blogData,
                        // ✅ THÊM: Thông tin bổ sung
                        readTime: this.calculateReadTime(blogData.Content),
                        formattedDate: this.formatDate(blogData.CreateAt),
                        wordCount: this.getWordCount(blogData.Content)
                    },
                    message: 'Blog retrieved successfully'
                });
            } else {
                console.log('❌ Blog not found:', blogId);
                return res.status(404).json({
                    success: false,
                    message: 'Blog not found'
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.getBlogById:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ POST /api/blogs - Create new blog post
    async createBlog(req, res) {
        try {
            const {
                Title,
                Content,
                AuthorID,
                CategoryID,
                image,
                Status = true
            } = req.body;

            // Get AuthorID from authenticated user if not provided
            const authorId = AuthorID || req.user?.UserID;

            if (!authorId) {
                return res.status(400).json({
                    success: false,
                    message: 'Author ID is required',
                    data: null
                });
            }

            console.log('📝 Creating new blog post:', { Title, AuthorID: authorId, CategoryID });

            // Create new blog instance
            const newBlog = Blog.createNew({
                Title,
                Content,
                AuthorID: authorId,
                CategoryID,
                image,
                Status
            });

            // Handle base64 image if provided
            if (image && typeof image === 'string') {
                newBlog.setImageFromBase64(image);
            }

            const result = await this.blogDB.insert(newBlog);

            if (result.success) {
                return res.status(201).json({
                    success: true,
                    message: result.message,
                    data: result.data.toJSON()
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.createBlog:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ PUT /api/blogs/:id - Update blog post
    async updateBlog(req, res) {
        try {
            const { id } = req.params;
            const postId = parseInt(id);

            if (isNaN(postId) || postId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid blog post ID is required',
                    data: null
                });
            }

            // Get existing blog post
            const existingResult = await this.blogDB.get(postId);
            if (!existingResult.success) {
                return res.status(404).json({
                    success: false,
                    message: 'Blog post not found',
                    data: null
                });
            }

            const {
                Title,
                Content,
                AuthorID,
                CategoryID,
                image,
                Status
            } = req.body;

            console.log('📝 Updating blog post:', postId);

            // Update blog properties
            const blogToUpdate = existingResult.data;
            
            if (Title !== undefined) blogToUpdate.Title = Title;
            if (Content !== undefined) blogToUpdate.Content = Content;
            if (AuthorID !== undefined) blogToUpdate.AuthorID = AuthorID;
            if (CategoryID !== undefined) blogToUpdate.CategoryID = CategoryID;
            if (Status !== undefined) blogToUpdate.Status = Status;

            // Handle image update
            if (image !== undefined) {
                if (image === null || image === '') {
                    blogToUpdate.image = null;
                } else if (typeof image === 'string') {
                    blogToUpdate.setImageFromBase64(image);
                }
            }

            const result = await this.blogDB.update(blogToUpdate);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result.data.toJSON()
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.updateBlog:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ DELETE /api/blogs/:id - Delete blog post
    async deleteBlog(req, res) {
        try {
            const { id } = req.params;
            const postId = parseInt(id);

            if (isNaN(postId) || postId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid blog post ID is required',
                    data: null
                });
            }

            console.log('🗑️ Deleting blog post:', postId);

            const result = await this.blogDB.delete(postId);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result.data
                });
            } else {
                const statusCode = result.message.includes('not found') ? 404 : 500;
                return res.status(statusCode).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.deleteBlog:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ PATCH /api/blogs/:id/status - Update blog status (publish/unpublish)
    async updateBlogStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const postId = parseInt(id);

            if (isNaN(postId) || postId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid blog post ID is required',
                    data: null
                });
            }

            if (typeof status !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'Status must be a boolean value',
                    data: null
                });
            }

            console.log(`📝 ${status ? 'Publishing' : 'Unpublishing'} blog post:`, postId);

            const result = await this.blogDB.updateStatus(postId, status);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result.data
                });
            } else {
                const statusCode = result.message.includes('not found') ? 404 : 500;
                return res.status(statusCode).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.updateBlogStatus:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/blogs/category/:categoryId - Get blogs by category
    async getBlogsByCategory(req, res) {
        try {
            const { categoryId } = req.params;
            const {
                page = 1,
                limit = 10,
                search,
                sortBy = 'CreateAt',
                sortOrder = 'DESC'
            } = req.query;

            const categoryIdInt = parseInt(categoryId);

            if (isNaN(categoryIdInt) || categoryIdInt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid category ID is required',
                    data: null
                });
            }

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                searchTerm: search || '',
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            };

            console.log('📋 Getting blogs by category:', categoryIdInt);

            const result = await this.blogDB.getByCategory(categoryIdInt, options);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: 'Blogs retrieved successfully',
                    data: result.data.map(blog => blog.toJSON()),
                    pagination: result.pagination
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.getBlogsByCategory:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/blogs/author/:authorId - Get blogs by author
    async getBlogsByAuthor(req, res) {
        try {
            const { authorId } = req.params;
            const {
                page = 1,
                limit = 10,
                search,
                sortBy = 'CreateAt',
                sortOrder = 'DESC'
            } = req.query;

            const authorIdInt = parseInt(authorId);

            if (isNaN(authorIdInt) || authorIdInt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid author ID is required',
                    data: null
                });
            }

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                searchTerm: search || '',
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            };

            console.log('📋 Getting blogs by author:', authorIdInt);

            const result = await this.blogDB.getByAuthor(authorIdInt, options);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: 'Blogs retrieved successfully',
                    data: result.data.map(blog => blog.toJSON()),
                    pagination: result.pagination
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.getBlogsByAuthor:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ GET /api/blogs/search - Search blogs
    async searchBlogs(req, res) {
        try {
            const {
                q: searchTerm,
                page = 1,
                limit = 10,
                categoryId,
                status,
                sortBy = 'CreateAt',
                sortOrder = 'DESC'
            } = req.query;

            if (!searchTerm || searchTerm.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Search term is required',
                    data: null
                });
            }

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                categoryId: categoryId ? parseInt(categoryId) : null,
                status: status !== undefined ? status === 'true' : null,
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            };

            console.log('🔍 Searching blogs with term:', searchTerm);

            const result = await this.blogDB.search(searchTerm, options);

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: 'Search completed successfully',
                    data: result.data.map(blog => blog.toJSON()),
                    pagination: result.pagination,
                    searchTerm
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: result.message,
                    data: null
                });
            }

        } catch (error) {
            console.error('❌ Error in BlogController.searchBlogs:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ THÊM: Helper methods
    calculateReadTime(content) {
        if (!content) return 1;
        const wordsPerMinute = 200; // Average reading speed
        const wordCount = content.split(/\s+/).length;
        const readTime = Math.ceil(wordCount / wordsPerMinute);
        return readTime || 1;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Không xác định';
        }
    }

    getWordCount(content) {
        if (!content) return 0;
        return content.split(/\s+/).filter(word => word.length > 0).length;
    }
}

const blogController = new BlogController();

// ✅ Đưa các API vào router thay vì bind trực tiếp vào app
router.get('/', blogController.getAllBlogs.bind(blogController));
router.get('/published', blogController.getPublishedBlogs.bind(blogController));
router.get('/search', blogController.searchBlogs.bind(blogController));
router.get('/category/:categoryId', blogController.getBlogsByCategory.bind(blogController));
router.get('/author/:authorId', blogController.getBlogsByAuthor.bind(blogController));
router.get('/:id', blogController.getBlogById.bind(blogController));
router.post('/', blogController.createBlog.bind(blogController));
router.put('/:id', blogController.updateBlog.bind(blogController));
router.patch('/:id/status', blogController.updateBlogStatus.bind(blogController));
router.delete('/:id', blogController.deleteBlog.bind(blogController));

export default router;