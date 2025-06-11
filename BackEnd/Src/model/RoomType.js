class RoomType {
    constructor(typeId = null, typeName = '', description = '', basePrice = 0) {
        this.TypeId = typeId;
        this.TypeName = typeName;
        this.Description = description;
        this.BasePrice = basePrice;
        this.rooms = []; // Array để chứa các Room thuộc RoomType này
    }

    // Getter methods
    getTypeId() {
        return this.TypeId;
    }

    getTypeName() {
        return this.TypeName;
    }

    getDescription() {
        return this.Description;
    }

    getBasePrice() {
        return this.BasePrice;
    }

    getRooms() {
        return this.rooms;
    }

    // Setter methods
    setTypeId(typeId) {
        this.TypeId = typeId;
    }

    setTypeName(typeName) {
        this.TypeName = typeName;
    }

    setDescription(description) {
        this.Description = description;
    }

    setBasePrice(basePrice) {
        this.BasePrice = basePrice;
    }

    // Business methods
    addRoom(room) {
        if (room && !this.rooms.find(r => r.RoomID === room.RoomID)) {
            this.rooms.push(room);
        }
    }

    removeRoom(roomId) {
        this.rooms = this.rooms.filter(room => room.RoomID !== roomId);
    }

    getRoomCount() {
        return this.rooms.length;
    }

    getAvailableRooms() {
        return this.rooms.filter(room => 
            room.Status && room.Status.toLowerCase() === 'available'
        );
    }

    // Format price for display
    getFormattedPrice() {
        return this.BasePrice.toLocaleString('vi-VN') + 'đ';
    }

    // Validation methods
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

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Convert to JSON for API responses
    toJSON() {
        return {
            TypeId: this.TypeId,
            TypeName: this.TypeName,
            Description: this.Description,
            BasePrice: this.BasePrice,
            FormattedPrice: this.getFormattedPrice(),
            RoomCount: this.getRoomCount(),
            AvailableRoomCount: this.getAvailableRooms().length,
            rooms: this.rooms.map(room => ({
                RoomID: room.RoomID,
                RoomNumber: room.RoomNumber,
                Status: room.Status,
                Floor: room.Floor
            }))
        };
    }

    // Create from database row
    static fromDatabase(row) {
        return new RoomType(
            row.TypeId,
            row.TypeName,
            row.Description,
            row.BasePrice
        );
    }

    // Create for database insert/update
    toDatabaseObject() {
        const obj = {
            TypeName: this.TypeName,
            Description: this.Description,
            BasePrice: this.BasePrice
        };

        // Chỉ thêm TypeId nếu có (cho update)
        if (this.TypeId) {
            obj.TypeId = this.TypeId;
        }

        return obj;
    }

    // Static method để tạo các loại phòng mặc định
    static getDefaultRoomTypes() {
        return [
            new RoomType(null, 'Phòng thường', 'Phòng tiêu chuẩn với tiện nghi cơ bản', 350000),
            new RoomType(null, 'Phòng gia đình', 'Phòng rộng rãi phù hợp cho gia đình', 500000),
            new RoomType(null, 'Phòng đơn', 'Phòng với 1 giường đơn, phù hợp với ngân sách thấp', 250000),
            new RoomType(null, 'Phòng đôi', 'Phòng với 1 giường đôi, thoải mái cho 2 người', 300000),
            new RoomType(null, 'Phòng cao cấp', 'Phòng với 1 giường đôi, đầy đủ tiện nghi cao cấp', 800000),
            new RoomType(null, 'Phòng tiết kiệm', 'Phòng giá rẻ với tiện nghi cơ bản', 100000)
        ];
    }

    // Clone method
    clone() {
        const cloned = new RoomType(
            this.TypeId,
            this.TypeName,
            this.Description,
            this.BasePrice
        );
        cloned.rooms = [...this.rooms];
        return cloned;
    }

    // Comparison method
    equals(other) {
        if (!(other instanceof RoomType)) {
            return false;
        }
        return this.TypeId === other.TypeId &&
               this.TypeName === other.TypeName &&
               this.Description === other.Description &&
               this.BasePrice === other.BasePrice;
    }

    // String representation
    toString() {
        return `RoomType(${this.TypeId}): ${this.TypeName} - ${this.getFormattedPrice()}`;
    }
}

export default RoomType;