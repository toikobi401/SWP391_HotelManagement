class RoomType {
    constructor(typeId = null, typeName = '', description = '', basePrice = 0, image = null) {
        this.TypeId = typeId;
        this.TypeName = typeName;
        this.Description = description;
        this.BasePrice = basePrice;
        this.Image = image; // ✅ THÊM IMAGE PROPERTY
        this.rooms = []; // Array để chứa các Room thuộc RoomType này
        
        // ✅ THÊM METADATA TỪ DATABASE
        this.TotalRooms = 0;
        this.AvailableRooms = 0;
        this.OccupiedRooms = 0;
        this.ReservedRooms = 0;
        this.MaintenanceRooms = 0;
    }

    // ✅ GETTER/SETTER CHO IMAGE
    getImage() {
        return this.Image;
    }

    setImage(image) {
        this.Image = image;
    }

    // ✅ XỬ LÝ IMAGE URL
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

    // ✅ SỬA LẠI VALIDATION ĐỂ BAO GỒM IMAGE
    validate() {
        const errors = [];

        if (!this.TypeName || this.TypeName.trim() === '') {
            errors.push('Tên loại phòng không được để trống');
        }

        if (this.TypeName && this.TypeName.length > 50) {
            errors.push('Tên loại phòng không được vượt quá 50 ký tự');
        }

        if (!this.Description || this.Description.trim() === '') {
            errors.push('Mô tả không được để trống');
        }

        if (this.Description && this.Description.length > 255) {
            errors.push('Mô tả không được vượt quá 255 ký tự');
        }

        if (this.BasePrice < 0) {
            errors.push('Giá cơ bản phải lớn hơn hoặc bằng 0');
        }

        if (this.BasePrice > 999999999) {
            errors.push('Giá cơ bản quá lớn');
        }

        // ✅ VALIDATION CHO IMAGE
        if (this.Image && Buffer.isBuffer(this.Image) && this.Image.length > 10485760) { // 10MB
            errors.push('Kích thước hình ảnh không được vượt quá 10MB');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ✅ CẬP NHẬT toJSON ĐỂ BAO GỒM IMAGE
    toJSON() {
        return {
            TypeId: this.TypeId,
            TypeName: this.TypeName,
            Description: this.Description,
            BasePrice: this.BasePrice,
            FormattedPrice: this.getFormattedPrice(),
            Image: this.getImageUrl(), // ✅ RETURN IMAGE URL
            RoomCount: this.getRoomCount(),
            AvailableRoomCount: this.getAvailableRooms().length,
            TotalRooms: this.TotalRooms || 0,
            AvailableRooms: this.AvailableRooms || 0,
            OccupiedRooms: this.OccupiedRooms || 0,
            ReservedRooms: this.ReservedRooms || 0,
            MaintenanceRooms: this.MaintenanceRooms || 0,
            rooms: this.rooms.map(room => ({
                RoomID: room.RoomID,
                RoomNumber: room.RoomNumber,
                Status: room.Status,
                Floor: room.Floor,
                CurrentPrice: room.CurrentPrice,
                Capacity: room.Capacity
            }))
        };
    }

    // ✅ CẬP NHẬT fromDatabase ĐỂ XỬ LÝ IMAGE
    static fromDatabase(row) {
        const roomType = new RoomType(
            row.TypeId,
            row.TypeName,
            row.Description,
            row.BasePrice,
            row.Image // ✅ BAO GỒM IMAGE
        );

        // ✅ THÊM METADATA NẾU CÓ
        if (row.TotalRooms !== undefined) roomType.TotalRooms = row.TotalRooms;
        if (row.AvailableRooms !== undefined) roomType.AvailableRooms = row.AvailableRooms;
        if (row.OccupiedRooms !== undefined) roomType.OccupiedRooms = row.OccupiedRooms;
        if (row.ReservedRooms !== undefined) roomType.ReservedRooms = row.ReservedRooms;
        if (row.MaintenanceRooms !== undefined) roomType.MaintenanceRooms = row.MaintenanceRooms;

        return roomType;
    }

    // ✅ CẬP NHẬT toDatabaseObject ĐỂ BAO GỒM IMAGE
    toDatabaseObject() {
        const obj = {
            TypeName: this.TypeName,
            Description: this.Description,
            BasePrice: this.BasePrice
        };

        // ✅ THÊM IMAGE NẾU CÓ
        if (this.Image) {
            obj.Image = this.Image;
        }

        // Chỉ thêm TypeId nếu có (cho update)
        if (this.TypeId) {
            obj.TypeId = this.TypeId;
        }

        return obj;
    }

    // ✅ CẬP NHẬT getDefaultRoomTypes VỚI IMAGE
    static getDefaultRoomTypes() {
        return [
            new RoomType(null, 'Phòng thường', 'Phòng tiêu chuẩn với tiện nghi cơ bản', 350000, null),
            new RoomType(null, 'Phòng gia đình', 'Phòng rộng rãi phù hợp cho gia đình', 500000, null),
            new RoomType(null, 'Phòng đơn', 'Phòng với 1 giường đơn, phù hợp với ngân sách thấp', 250000, null),
            new RoomType(null, 'Phòng đôi', 'Phòng với 1 giường đôi, thoải mái cho 2 người', 300000, null),
            new RoomType(null, 'Phòng cao cấp', 'Phòng với 1 giường đôi, đầy đủ tiện nghi cao cấp', 800000, null),
            new RoomType(null, 'Phòng tiết kiệm', 'Phòng giá rẻ với tiện nghi cơ bản', 100000, null)
        ];
    }

    // ✅ THÊM HELPER METHODS CHO IMAGE
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

    // ✅ ROOM STATUS HELPERS
    getOccupancyRate() {
        if (this.TotalRooms === 0) return 0;
        return Math.round(((this.OccupiedRooms + this.ReservedRooms) / this.TotalRooms) * 100);
    }

    getAvailabilityRate() {
        if (this.TotalRooms === 0) return 0;
        return Math.round((this.AvailableRooms / this.TotalRooms) * 100);
    }

    isFullyBooked() {
        return this.AvailableRooms === 0 && this.TotalRooms > 0;
    }

    // ✅ EXISTING METHODS... (giữ nguyên các method cũ)
    getTypeId() { return this.TypeId; }
    getTypeName() { return this.TypeName; }
    getDescription() { return this.Description; }
    getBasePrice() { return this.BasePrice; }
    getRooms() { return this.rooms; }
    
    setTypeId(typeId) { this.TypeId = typeId; }
    setTypeName(typeName) { this.TypeName = typeName; }
    setDescription(description) { this.Description = description; }
    setBasePrice(basePrice) { this.BasePrice = basePrice; }
    
    addRoom(room) {
        if (room && !this.rooms.find(r => r.RoomID === room.RoomID)) {
            this.rooms.push(room);
        }
    }
    
    removeRoom(roomId) {
        this.rooms = this.rooms.filter(room => room.RoomID !== roomId);
    }
    
    getRoomCount() { return this.rooms.length; }
    
    getAvailableRooms() {
        return this.rooms.filter(room => 
            room.Status && (room.Status.toLowerCase() === 'available' || room.Status.toLowerCase() === 'còn trống')
        );
    }
    
    getFormattedPrice() {
        return this.BasePrice.toLocaleString('vi-VN') + 'đ';
    }
    
    clone() {
        const cloned = new RoomType(
            this.TypeId,
            this.TypeName,
            this.Description,
            this.BasePrice,
            this.Image
        );
        cloned.rooms = [...this.rooms];
        cloned.TotalRooms = this.TotalRooms;
        cloned.AvailableRooms = this.AvailableRooms;
        cloned.OccupiedRooms = this.OccupiedRooms;
        cloned.ReservedRooms = this.ReservedRooms;
        cloned.MaintenanceRooms = this.MaintenanceRooms;
        return cloned;
    }
    
    equals(other) {
        if (!(other instanceof RoomType)) return false;
        return this.TypeId === other.TypeId &&
               this.TypeName === other.TypeName &&
               this.Description === other.Description &&
               this.BasePrice === other.BasePrice;
    }
    
    toString() {
        return `RoomType(${this.TypeId}): ${this.TypeName} - ${this.getFormattedPrice()}`;
    }
}

export default RoomType;