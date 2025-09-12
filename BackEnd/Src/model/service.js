class Service {
    constructor() {
        this.ServiceID = 0;
        this.ServiceName = '';
        this.Description = '';
        this.Price = 0;
        this.Category = ''; // ✅ SỬA: Category thay vì CategoryID
        this.IsActive = true;
        this.Image = null; // ✅ THÊM: Image field (varbinary)
        this.Duration = 0; // ✅ THÊM: Duration field
        this.MaxCapacity = 0; // ✅ THÊM: MaxCapacity field
        this.CreateAt = new Date();
        this.UpdateAt = new Date();
        this.bookings = []; // Array để lưu trữ các booking sử dụng service này
    }

    static fromDatabase(data) {
        const service = new Service();
        Object.assign(service, {
            ServiceID: data.ServiceID,
            ServiceName: data.ServiceName,
            Description: data.Description,
            Price: data.Price,
            Category: data.Category, // ✅ SỬA: Category thay vì CategoryID
            IsActive: data.IsActive,
            Image: data.Image, // ✅ THÊM: Image field
            Duration: data.Duration, // ✅ THÊM: Duration field
            MaxCapacity: data.MaxCapacity, // ✅ THÊM: MaxCapacity field
            CreateAt: data.CreateAt ? new Date(data.CreateAt) : new Date(),
            UpdateAt: data.UpdateAt ? new Date(data.UpdateAt) : new Date(),
            bookings: [] // Khởi tạo bookings array rỗng
        });
        return service;
    }

    toJSON() {
        return {
            ServiceID: this.ServiceID,
            ServiceName: this.ServiceName,
            Description: this.Description,
            Price: this.Price,
            FormattedPrice: this.getFormattedPrice(),
            Category: this.Category, // ✅ SỬA: Category thay vì CategoryID
            IsActive: this.IsActive,
            Image: this.getImageUrl(), // ✅ THÊM: Image URL
            Duration: this.Duration, // ✅ THÊM: Duration
            MaxCapacity: this.MaxCapacity, // ✅ THÊM: MaxCapacity
            CreateAt: this.CreateAt,
            UpdateAt: this.UpdateAt,
            BookingCount: this.getBookingCount(),
            Status: this.getStatus()
        };
    }

    // ✅ THÊM: Image handling methods
    getImageUrl() {
        if (this.Image) {
            // Nếu Image là buffer từ database, convert thành base64
            if (Buffer.isBuffer(this.Image)) {
                return `data:image/jpeg;base64,${this.Image.toString('base64')}`;
            }
            // Nếu Image là string URL
            if (typeof this.Image === 'string') {
                return this.Image;
            }
        }
        return null;
    }

    hasImage() {
        return this.Image !== null && this.Image !== undefined;
    }

    setImageFromBuffer(buffer) {
        if (Buffer.isBuffer(buffer)) {
            this.Image = buffer;
        } else {
            throw new Error('Invalid buffer for image');
        }
    }

    setImageFromBase64(base64String) {
        try {
            this.Image = Buffer.from(base64String, 'base64');
        } catch (error) {
            throw new Error('Invalid base64 string for image');
        }
    }

    // Getter methods
    getServiceID() {
        return this.ServiceID;
    }

    getServiceName() {
        return this.ServiceName;
    }

    getDescription() {
        return this.Description;
    }

    getPrice() {
        return this.Price;
    }

    getCategory() { // ✅ SỬA: getCategory thay vì getCategoryID
        return this.Category;
    }

    getIsActive() {
        return this.IsActive;
    }

    getImage() { // ✅ THÊM: getImage method
        return this.Image;
    }

    getDuration() { // ✅ THÊM: getDuration method
        return this.Duration;
    }

    getMaxCapacity() { // ✅ THÊM: getMaxCapacity method
        return this.MaxCapacity;
    }

    getCreateAt() {
        return this.CreateAt;
    }

    getUpdateAt() {
        return this.UpdateAt;
    }

    // Setter methods
    setServiceID(serviceID) {
        this.ServiceID = serviceID;
    }

    setServiceName(serviceName) {
        this.ServiceName = serviceName;
    }

    setDescription(description) {
        this.Description = description;
    }

    setPrice(price) {
        this.Price = price;
    }

    setCategory(category) { // ✅ SỬA: setCategory thay vì setCategoryID
        this.Category = category;
    }

    setIsActive(isActive) {
        this.IsActive = isActive;
    }

    setImage(image) { // ✅ THÊM: setImage method
        this.Image = image;
    }

    setDuration(duration) { // ✅ THÊM: setDuration method
        this.Duration = duration;
    }

    setMaxCapacity(maxCapacity) { // ✅ THÊM: setMaxCapacity method
        this.MaxCapacity = maxCapacity;
    }

    setCreateAt(createAt) {
        this.CreateAt = createAt;
    }

    setUpdateAt(updateAt) {
        this.UpdateAt = updateAt;
    }

    // Helper methods
    getFormattedPrice() {
        return this.Price.toLocaleString('vi-VN') + 'đ';
    }

    getStatus() {
        return this.IsActive ? 'Hoạt động' : 'Ngưng hoạt động';
    }

    isActive() {
        return this.IsActive === true;
    }

    // ✅ THÊM: Duration formatting
    getFormattedDuration() {
        if (this.Duration < 60) {
            return `${this.Duration} phút`;
        } else {
            const hours = Math.floor(this.Duration / 60);
            const minutes = this.Duration % 60;
            return minutes > 0 ? `${hours}h ${minutes}p` : `${hours} giờ`;
        }
    }

    // ✅ THÊM: Capacity check methods
    isCapacityAvailable(requestedCapacity) {
        return requestedCapacity <= this.MaxCapacity;
    }

    getRemainingCapacity(currentBookings = 0) {
        return Math.max(0, this.MaxCapacity - currentBookings);
    }

    // Booking management methods (giữ nguyên)
    addBooking(booking) {
        if (!this.bookings.find(b => b.BookingID === booking.BookingID)) {
            this.bookings.push({
                BookingID: booking.BookingID,
                BookingDate: booking.BookingDate,
                TotalPrice: booking.TotalPrice
            });
        }
    }

    removeBooking(bookingId) {
        this.bookings = this.bookings.filter(b => b.BookingID !== bookingId);
    }

    getBookings() {
        return this.bookings;
    }

    getBookingCount() {
        return this.bookings.length;
    }

    getTotalRevenue() {
        return this.bookings.reduce((total, booking) => total + (booking.TotalPrice || 0), 0);
    }

    // ✅ CẬP NHẬT: Validation với các field mới
    validate() {
        const errors = [];

        // Service Name validation
        if (!this.ServiceName || this.ServiceName.trim() === '') {
            errors.push('Tên dịch vụ là bắt buộc');
        } else if (this.ServiceName.length > 100) {
            errors.push('Tên dịch vụ không được vượt quá 100 ký tự');
        } else if (this.ServiceName.trim().length < 3) {
            errors.push('Tên dịch vụ phải có ít nhất 3 ký tự');
        }

        // Description validation
        if (!this.Description || this.Description.trim() === '') {
            errors.push('Mô tả dịch vụ là bắt buộc');
        } else if (this.Description.length > 500) {
            errors.push('Mô tả dịch vụ không được vượt quá 500 ký tự');
        } else if (this.Description.trim().length < 10) {
            errors.push('Mô tả dịch vụ phải có ít nhất 10 ký tự');
        }

        // Price validation
        if (typeof this.Price !== 'number' || isNaN(this.Price)) {
            errors.push('Giá dịch vụ phải là số');
        } else if (this.Price <= 0) {
            errors.push('Giá dịch vụ phải lớn hơn 0');
        } else if (this.Price > 100000000) {
            errors.push('Giá dịch vụ không được vượt quá 100.000.000đ');
        }

        // Category validation
        const validCategories = [
            'Spa & Wellness', 'Ăn uống', 'Vận chuyển', 'Tour & Hoạt động',
            'Dịch vụ phòng', 'Giặt ủi', 'Dịch vụ doanh nghiệp', 'Giải trí',
            'Trẻ em & Gia đình', 'Sức khỏe & Thể thao', 'Mua sắm', 
            'Sự kiện đặc biệt', 'Khác'
        ];
        if (this.Category && !validCategories.includes(this.Category)) {
            errors.push('Danh mục dịch vụ không hợp lệ');
        }

        // Duration validation
        if (typeof this.Duration !== 'number' || isNaN(this.Duration)) {
            errors.push('Thời gian dịch vụ phải là số');
        } else if (this.Duration <= 0) {
            errors.push('Thời gian dịch vụ phải lớn hơn 0 phút');
        } else if (this.Duration > 1440) {
            errors.push('Thời gian dịch vụ không được vượt quá 24 giờ');
        }

        // MaxCapacity validation
        if (typeof this.MaxCapacity !== 'number' || isNaN(this.MaxCapacity)) {
            errors.push('Sức chứa tối đa phải là số');
        } else if (this.MaxCapacity <= 0) {
            errors.push('Sức chứa tối đa phải lớn hơn 0');
        } else if (this.MaxCapacity > 1000) {
            errors.push('Sức chứa tối đa không được vượt quá 1000');
        }

        // Image validation
        if (this.Image && Buffer.isBuffer(this.Image) && this.Image.length > 10485760) {
            errors.push('Kích thước hình ảnh không được vượt quá 10MB');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Method để set thời gian cập nhật
    setUpdateTime(time = new Date()) {
        this.UpdateAt = time;
    }

    // Method để lấy thời gian cập nhật cuối
    getLastUpdateTime() {
        return this.UpdateAt || this.CreateAt;
    }

    // Clone method
    clone() {
        const cloned = new Service();
        Object.assign(cloned, {
            ServiceID: this.ServiceID,
            ServiceName: this.ServiceName,
            Description: this.Description,
            Price: this.Price,
            Category: this.Category, // ✅ SỬA
            IsActive: this.IsActive,
            Image: this.Image, // ✅ THÊM
            Duration: this.Duration, // ✅ THÊM
            MaxCapacity: this.MaxCapacity, // ✅ THÊM
            CreateAt: new Date(this.CreateAt),
            UpdateAt: new Date(this.UpdateAt),
            bookings: [...this.bookings]
        });
        return cloned;
    }

    // Compare method
    equals(other) {
        if (!(other instanceof Service)) return false;
        return this.ServiceID === other.ServiceID &&
               this.ServiceName === other.ServiceName &&
               this.Description === other.Description &&
               this.Price === other.Price &&
               this.IsActive === other.IsActive &&
               this.Category === other.Category && // ✅ SỬA
               this.Duration === other.Duration && // ✅ THÊM
               this.MaxCapacity === other.MaxCapacity; // ✅ THÊM
    }

    // String representation
    toString() {
        return `Service(${this.ServiceID}): ${this.ServiceName} - ${this.getFormattedPrice()} - ${this.getFormattedDuration()} - ${this.getStatus()}`;
    }

    // ✅ CẬP NHẬT: Static methods với các field mới
    static getDefaultServices() {
        return [
            {
                ServiceName: 'Massage thư giãn',
                Description: 'Dịch vụ massage chuyên nghiệp giúp thư giãn và giảm stress',
                Price: 200000,
                Category: 'Spa & Wellness',
                IsActive: true,
                Duration: 60,
                MaxCapacity: 10
            },
            {
                ServiceName: 'Dịch vụ giặt ủi',
                Description: 'Giặt ủi quần áo nhanh chóng và chất lượng cao',
                Price: 50000,
                Category: 'Phòng',
                IsActive: true,
                Duration: 120,
                MaxCapacity: 50
            },
            {
                ServiceName: 'Dịch vụ đưa đón sân bay',
                Description: 'Đưa đón khách từ khách sạn đến sân bay và ngược lại',
                Price: 300000,
                Category: 'Vận chuyển',
                IsActive: true,
                Duration: 90,
                MaxCapacity: 4
            },
            {
                ServiceName: 'Phục vụ phòng 24/7',
                Description: 'Dịch vụ phục vụ đồ ăn và thức uống tại phòng',
                Price: 100000,
                Category: 'Phòng',
                IsActive: true,
                Duration: 30,
                MaxCapacity: 100
            },
            {
                ServiceName: 'Tour du lịch địa phương',
                Description: 'Hướng dẫn tham quan các địa điểm nổi tiếng',
                Price: 500000,
                Category: 'Du lịch',
                IsActive: true,
                Duration: 480,
                MaxCapacity: 20
            }
        ];
    }

    // Static validation for bulk operations
    static validateBulk(services) {
        const results = [];
        services.forEach((service, index) => {
            const validation = service.validate();
            if (!validation.isValid) {
                results.push({
                    index: index,
                    service: service,
                    errors: validation.errors
                });
            }
        });
        return {
            isValid: results.length === 0,
            errors: results
        };
    }
}

export default Service;