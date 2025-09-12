class Blog {
    constructor({
        PostID = null,
        Title = '',
        Content = '',
        AuthorID = null,
        CategoryID = null,
        image = null,
        CreateAt = null,
        UpdateAt = null,
        Status = true
    } = {}) {
        this.PostID = PostID;
        this.Title = Title;
        this.Content = Content;
        this.AuthorID = AuthorID;
        this.CategoryID = CategoryID;
        this.image = image;
        this.CreateAt = CreateAt;
        this.UpdateAt = UpdateAt;
        this.Status = Status;
    }

    // ✅ Validation methods
    validate() {
        const errors = [];

        // Title validation
        if (!this.Title || this.Title.trim() === '') {
            errors.push('Title is required');
        } else if (this.Title.length > 255) {
            errors.push('Title must not exceed 255 characters');
        }

        // Content validation
        if (!this.Content || this.Content.trim() === '') {
            errors.push('Content is required');
        }

        // AuthorID validation
        if (!this.AuthorID || !Number.isInteger(this.AuthorID) || this.AuthorID <= 0) {
            errors.push('Valid AuthorID is required');
        }

        // CategoryID validation
        if (!this.CategoryID || !Number.isInteger(this.CategoryID) || this.CategoryID <= 0) {
            errors.push('Valid CategoryID is required');
        }

        // ✅ SỬA: Image không bắt buộc
        // Image validation - Optional
        // if (!this.image) {
        //     errors.push('Image is required');
        // }

        // Status validation (bit field)
        if (typeof this.Status !== 'boolean') {
            errors.push('Status must be a boolean value');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ✅ Convert to database format
    toDatabaseObject() {
        const currentDateTime = new Date();
        
        return {
            Title: this.Title?.trim(),
            Content: this.Content?.trim(),
            AuthorID: this.AuthorID,
            CategoryID: this.CategoryID,
            image: this.image,
            CreateAt: this.CreateAt || currentDateTime,
            UpdateAt: this.UpdateAt || currentDateTime,
            Status: this.Status
        };
    }

    // ✅ SỬA: Convert from database result
    static fromDatabaseResult(dbResult) {
        if (!dbResult) return null;

        return new Blog({ // ✅ SỬA: Blog thay vì BlogPost
            PostID: dbResult.PostID,
            Title: dbResult.Title,
            Content: dbResult.Content,
            AuthorID: dbResult.AuthorID,
            CategoryID: dbResult.CategoryID,
            image: dbResult.image,
            CreateAt: dbResult.CreateAt,
            UpdateAt: dbResult.UpdateAt,
            Status: dbResult.Status
        });
    }

    // ✅ Convert to JSON response format
    toJSON() {
        return {
            PostID: this.PostID,
            Title: this.Title,
            Content: this.Content,
            AuthorID: this.AuthorID,
            CategoryID: this.CategoryID,
            image: this.image ? this.convertImageToBase64() : null,
            CreateAt: this.CreateAt,
            UpdateAt: this.UpdateAt,
            Status: this.Status,
            // ✅ THÊM: Additional fields nếu có
            AuthorName: this.AuthorName,
            CategoryName: this.CategoryName
        };
    }

    // ✅ Convert image buffer to base64 for frontend
    convertImageToBase64() {
        if (!this.image || !Buffer.isBuffer(this.image)) {
            return null;
        }
        
        try {
            return `data:image/jpeg;base64,${this.image.toString('base64')}`;
        } catch (error) {
            console.error('Error converting image to base64:', error);
            return null;
        }
    }

    // ✅ Set image from base64 string
    setImageFromBase64(base64String) {
        if (!base64String) {
            this.image = null;
            return;
        }

        try {
            // Remove data:image/...;base64, prefix if exists
            const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
            this.image = Buffer.from(base64Data, 'base64');
        } catch (error) {
            console.error('Error converting base64 to buffer:', error);
            this.image = null;
        }
    }

    // ✅ Update timestamps
    updateTimestamp() {
        this.UpdateAt = new Date();
    }

    // ✅ Set as published
    publish() {
        this.Status = true;
        this.updateTimestamp();
    }

    // ✅ Set as draft/unpublished
    unpublish() {
        this.Status = false;
        this.updateTimestamp();
    }

    // ✅ Check if published
    isPublished() {
        return this.Status === true;
    }

    // ✅ Get formatted creation date
    getFormattedCreateDate() {
        if (!this.CreateAt) return null;
        return new Date(this.CreateAt).toLocaleDateString('vi-VN');
    }

    // ✅ Get formatted update date
    getFormattedUpdateDate() {
        if (!this.UpdateAt) return null;
        return new Date(this.UpdateAt).toLocaleDateString('vi-VN');
    }

    // ✅ Get content preview (first 150 characters)
    getContentPreview(maxLength = 150) {
        if (!this.Content) return '';
        
        const content = this.Content.trim();
        if (content.length <= maxLength) {
            return content;
        }
        
        return content.substring(0, maxLength).trim() + '...';
    }

    // ✅ Clone method
    clone() {
        return new Blog({ // ✅ SỬA: Blog thay vì BlogPost
            PostID: this.PostID,
            Title: this.Title,
            Content: this.Content,
            AuthorID: this.AuthorID,
            CategoryID: this.CategoryID,
            image: this.image,
            CreateAt: this.CreateAt,
            UpdateAt: this.UpdateAt,
            Status: this.Status
        });
    }

    // ✅ SỬA: Static method to create new post
    static createNew({
        Title,
        Content,
        AuthorID,
        CategoryID,
        image,
        Status = true
    }) {
        const currentDateTime = new Date();
        
        return new Blog({ // ✅ SỬA: Blog thay vì BlogPost
            Title,
            Content,
            AuthorID,
            CategoryID,
            image,
            CreateAt: currentDateTime,
            UpdateAt: currentDateTime,
            Status
        });
    }

    // ✅ toString method for debugging
    toString() {
        return `Blog(ID: ${this.PostID}, Title: "${this.Title}", Author: ${this.AuthorID}, Category: ${this.CategoryID}, Status: ${this.Status})`;
    }
}

export default Blog;