import mssql from 'mssql';
import DBContext from './DBContext.js';
import Blog from '../model/Blog.js';

class BlogDBContext extends DBContext {
    constructor() {
        super();
    }

    // ✅ Get all blog posts with pagination and filters
    async list(options = {}) {
        try {
            const pool = await this.pool;
            const request = pool.request();

            const {
                page = 1,
                limit = 10,
                categoryId = null,
                authorId = null,
                status = null,
                searchTerm = '',
                sortBy = 'CreateAt',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;

            // Build WHERE clause
            let whereConditions = [];
            
            if (categoryId) {
                whereConditions.push('bp.CategoryID = @CategoryID');
                request.input('CategoryID', mssql.Int, categoryId);
            }
            
            if (authorId) {
                whereConditions.push('bp.AuthorID = @AuthorID');
                request.input('AuthorID', mssql.Int, authorId);
            }
            
            if (status !== null) {
                whereConditions.push('bp.Status = @Status');
                request.input('Status', mssql.Bit, status);
            }
            
            if (searchTerm) {
                whereConditions.push('(bp.Title LIKE @SearchTerm OR bp.Content LIKE @SearchTerm)');
                request.input('SearchTerm', mssql.NVarChar, `%${searchTerm}%`);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Input parameters for pagination
            request.input('Offset', mssql.Int, offset);
            request.input('Limit', mssql.Int, limit);

            // Main query with JOIN to get author and category info
            const query = `
                SELECT 
                    bp.PostID,
                    bp.Title,
                    bp.Content,
                    bp.AuthorID,
                    bp.CategoryID,
                    bp.image,
                    bp.CreateAt,
                    bp.UpdateAt,
                    bp.Status,
                    u.Fullname as AuthorName,
                    u.Username as AuthorUsername,
                    bc.CategoryName,
                    bc.Description as CategoryDescription
                FROM BlogPost bp
                LEFT JOIN [User] u ON bp.AuthorID = u.UserID
                LEFT JOIN BlogCategories bc ON bp.CategoryID = bc.CategoryID
                ${whereClause}
                ORDER BY bp.${sortBy} ${sortOrder}
                OFFSET @Offset ROWS
                FETCH NEXT @Limit ROWS ONLY
            `;

            console.log('📋 Executing blog list query:', query);
            const result = await request.query(query);

            // Get total count
            const countRequest = pool.request();
            if (categoryId) countRequest.input('CategoryID', mssql.Int, categoryId);
            if (authorId) countRequest.input('AuthorID', mssql.Int, authorId);
            if (status !== null) countRequest.input('Status', mssql.Bit, status);
            if (searchTerm) countRequest.input('SearchTerm', mssql.NVarChar, `%${searchTerm}%`);

            const countQuery = `
                SELECT COUNT(*) as Total
                FROM BlogPost bp
                ${whereClause}
            `;

            const countResult = await countRequest.query(countQuery);
            const total = countResult.recordset[0].Total;

            // Convert to Blog objects
            const blogs = result.recordset.map(row => {
                const blog = Blog.fromDatabaseResult(row);
                // Add additional info
                blog.AuthorName = row.AuthorName;
                blog.AuthorUsername = row.AuthorUsername;
                blog.CategoryName = row.CategoryName;
                blog.CategoryDescription = row.CategoryDescription;
                return blog;
            });

            return {
                success: true,
                data: blogs,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            console.error('❌ Error in BlogDBContext.list:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ✅ Get blog post by ID with detailed info
    async get(postId) {
        try {
            const pool = await this.pool;
            const request = pool.request();

            request.input('PostID', mssql.Int, postId);

            const query = `
                SELECT 
                    bp.PostID,
                    bp.Title,
                    bp.Content,
                    bp.AuthorID,
                    bp.CategoryID,
                    bp.image,
                    bp.CreateAt,
                    bp.UpdateAt,
                    bp.Status,
                    u.Fullname as AuthorName,
                    u.Username as AuthorUsername,
                    u.Email as AuthorEmail,
                    bc.CategoryName,
                    bc.Description as CategoryDescription
                FROM BlogPost bp
                LEFT JOIN [User] u ON bp.AuthorID = u.UserID
                LEFT JOIN BlogCategories bc ON bp.CategoryID = bc.CategoryID
                WHERE bp.PostID = @PostID
            `;

            console.log('📋 Getting blog post:', postId);
            const result = await request.query(query);

            if (result.recordset.length === 0) {
                return {
                    success: false,
                    message: 'Blog post not found',
                    data: null
                };
            }

            const row = result.recordset[0];
            const blog = Blog.fromDatabaseResult(row);
            
            // Add additional info
            blog.AuthorName = row.AuthorName;
            blog.AuthorUsername = row.AuthorUsername;
            blog.AuthorEmail = row.AuthorEmail;
            blog.CategoryName = row.CategoryName;
            blog.CategoryDescription = row.CategoryDescription;

            return {
                success: true,
                data: blog,
                message: 'Blog post retrieved successfully'
            };

        } catch (error) {
            console.error('❌ Error in BlogDBContext.get:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ✅ Insert new blog post
    async insert(blogModel) {
        try {
            // Validate the model
            const validation = blogModel.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: `Validation failed: ${validation.errors.join(', ')}`,
                    data: null
                };
            }

            const pool = await this.pool;
            const request = pool.request();

            const dbData = blogModel.toDatabaseObject();

            request.input('Title', mssql.NVarChar(255), dbData.Title);
            request.input('Content', mssql.NVarChar(mssql.MAX), dbData.Content);
            request.input('AuthorID', mssql.Int, dbData.AuthorID);
            request.input('CategoryID', mssql.Int, dbData.CategoryID);
            
            // ✅ SỬA: Handle null image properly
            if (dbData.image) {
                request.input('Image', mssql.VarBinary(mssql.MAX), dbData.image);
            } else {
                request.input('Image', mssql.VarBinary(mssql.MAX), null);
            }
            
            request.input('CreateAt', mssql.DateTime, dbData.CreateAt);
            request.input('UpdateAt', mssql.DateTime, dbData.UpdateAt);
            request.input('Status', mssql.Bit, dbData.Status);

            // ✅ SỬA: Query phải handle null image
            const query = `
                INSERT INTO BlogPost (Title, Content, AuthorID, CategoryID, image, CreateAt, UpdateAt, Status)
                OUTPUT INSERTED.PostID, INSERTED.CreateAt, INSERTED.UpdateAt
                VALUES (@Title, @Content, @AuthorID, @CategoryID, @Image, @CreateAt, @UpdateAt, @Status)
            `;

            console.log('📝 Creating new blog post:', {
                title: dbData.Title,
                authorId: dbData.AuthorID,
                categoryId: dbData.CategoryID,
                hasImage: !!dbData.image
            });
            
            const result = await request.query(query);

            if (result.recordset.length > 0) {
                const insertedData = result.recordset[0];
                blogModel.PostID = insertedData.PostID;
                blogModel.CreateAt = insertedData.CreateAt;
                blogModel.UpdateAt = insertedData.UpdateAt;

                return {
                    success: true,
                    data: blogModel,
                    message: 'Blog post created successfully'
                };
            } else {
                throw new Error('No data returned from insert operation');
            }

        } catch (error) {
            console.error('❌ Error in BlogDBContext.insert:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ✅ Update existing blog post
    async update(blogModel) {
        try {
            // Validate the model
            const validation = blogModel.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: `Validation failed: ${validation.errors.join(', ')}`,
                    data: null
                };
            }

            if (!blogModel.PostID) {
                return {
                    success: false,
                    message: 'PostID is required for update operation',
                    data: null
                };
            }

            const pool = await this.pool;
            const request = pool.request();

            // Update timestamp
            blogModel.updateTimestamp();
            const dbData = blogModel.toDatabaseObject();

            request.input('PostID', mssql.Int, blogModel.PostID);
            request.input('Title', mssql.NVarChar(255), dbData.Title);
            request.input('Content', mssql.NVarChar(mssql.MAX), dbData.Content);
            request.input('AuthorID', mssql.Int, dbData.AuthorID);
            request.input('CategoryID', mssql.Int, dbData.CategoryID);
            request.input('Image', mssql.VarBinary(mssql.MAX), dbData.image);
            request.input('UpdateAt', mssql.DateTime, dbData.UpdateAt);
            request.input('Status', mssql.Bit, dbData.Status);

            const query = `
                UPDATE BlogPost 
                SET Title = @Title,
                    Content = @Content,
                    AuthorID = @AuthorID,
                    CategoryID = @CategoryID,
                    image = @Image,
                    UpdateAt = @UpdateAt,
                    Status = @Status
                OUTPUT INSERTED.UpdateAt
                WHERE PostID = @PostID
            `;

            console.log('📝 Updating blog post:', blogModel.PostID);
            const result = await request.query(query);

            if (result.rowsAffected[0] > 0) {
                if (result.recordset.length > 0) {
                    blogModel.UpdateAt = result.recordset[0].UpdateAt;
                }

                return {
                    success: true,
                    data: blogModel,
                    message: 'Blog post updated successfully'
                };
            } else {
                return {
                    success: false,
                    message: 'Blog post not found or no changes made',
                    data: null
                };
            }

        } catch (error) {
            console.error('❌ Error in BlogDBContext.update:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ✅ Delete blog post
    async delete(postId) {
        try {
            const pool = await this.pool;
            const request = pool.request();

            request.input('PostID', mssql.Int, postId);

            const query = `
                DELETE FROM BlogPost 
                WHERE PostID = @PostID
            `;

            console.log('🗑️ Deleting blog post:', postId);
            const result = await request.query(query);

            if (result.rowsAffected[0] > 0) {
                return {
                    success: true,
                    message: 'Blog post deleted successfully',
                    data: { PostID: postId }
                };
            } else {
                return {
                    success: false,
                    message: 'Blog post not found',
                    data: null
                };
            }

        } catch (error) {
            console.error('❌ Error in BlogDBContext.delete:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ✅ Get published blog posts only
    async getPublishedPosts(options = {}) {
        return await this.list({ ...options, status: true });
    }

    // ✅ Get blog posts by category
    async getByCategory(categoryId, options = {}) {
        return await this.list({ ...options, categoryId });
    }

    // ✅ Get blog posts by author
    async getByAuthor(authorId, options = {}) {
        return await this.list({ ...options, authorId });
    }

    // ✅ Search blog posts
    async search(searchTerm, options = {}) {
        return await this.list({ ...options, searchTerm });
    }

    // ✅ Update blog status (publish/unpublish)
    async updateStatus(postId, status) {
        try {
            const pool = await this.pool;
            const request = pool.request();

            request.input('PostID', mssql.Int, postId);
            request.input('Status', mssql.Bit, status);
            request.input('UpdateAt', mssql.DateTime, new Date());

            const query = `
                UPDATE BlogPost 
                SET Status = @Status,
                    UpdateAt = @UpdateAt
                WHERE PostID = @PostID
            `;

            console.log(`📝 ${status ? 'Publishing' : 'Unpublishing'} blog post:`, postId);
            const result = await request.query(query);

            if (result.rowsAffected[0] > 0) {
                return {
                    success: true,
                    message: `Blog post ${status ? 'published' : 'unpublished'} successfully`,
                    data: { PostID: postId, Status: status }
                };
            } else {
                return {
                    success: false,
                    message: 'Blog post not found',
                    data: null
                };
            }

        } catch (error) {
            console.error('❌ Error in BlogDBContext.updateStatus:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // ✅ SỬA: getBlogById với JOIN để lấy thông tin đầy đủ
    async getBlogById(postId) {
        try {
            const pool = await this.pool;
            const request = pool.request();

            request.input('PostID', mssql.Int, postId);

            // ✅ SỬA: Query với JOIN để lấy thông tin author và category
            const query = `
                SELECT 
                    bp.PostID,
                    bp.Title,
                    bp.Content,
                    bp.AuthorID,
                    bp.CategoryID,
                    bp.image,
                    bp.CreateAt,
                    bp.UpdateAt,
                    bp.Status,
                    u.Fullname as AuthorName,
                    u.Username as AuthorUsername,
                    u.Email as AuthorEmail,
                    bc.CategoryName,
                    bc.Description as CategoryDescription
                FROM BlogPost bp
                LEFT JOIN [User] u ON bp.AuthorID = u.UserID
                LEFT JOIN BlogCategories bc ON bp.CategoryID = bc.CategoryID
                WHERE bp.PostID = @PostID AND bp.Status = 1
            `;

            console.log('📝 Executing getBlogById query for PostID:', postId);
            
            const result = await request.query(query);

            if (result.recordset.length > 0) {
                const blogData = result.recordset[0];
                
                // ✅ Tạo Blog object với thông tin đầy đủ
                const blog = Blog.fromDatabaseResult(blogData);
                
                // ✅ THÊM: Thông tin author và category
                blog.AuthorName = blogData.AuthorName || 'Unknown Author';
                blog.AuthorUsername = blogData.AuthorUsername;
                blog.AuthorEmail = blogData.AuthorEmail;
                blog.CategoryName = blogData.CategoryName || 'Uncategorized';
                blog.CategoryDescription = blogData.CategoryDescription;

                console.log('✅ Blog found and populated:', blog.PostID);
                
                return {
                    success: true,
                    data: blog,
                    message: 'Blog retrieved successfully'
                };
            } else {
                console.log('❌ No blog found with PostID:', postId);
                return {
                    success: false,
                    message: 'Blog not found',
                    data: null
                };
            }

        } catch (error) {
            console.error('❌ Error in BlogDBContext.getBlogById:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }
}

export default BlogDBContext;