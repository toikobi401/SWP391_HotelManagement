class Room {
    constructor() {
        this.RoomID = 0;
        this.RoomNumber = '';
        this.Floor = 0;
        this.CurrentPrice = 0;
        this.Description = '';
        this.Capacity = 0;
        this.CreateAt = new Date();
        this.UpadateAt = new Date();
        this.Status = '';
        this.TypeID = 0;
        this.amenities = []; // Array để lưu trữ các amenity của room
    }

    static fromDatabase(data) {
        const room = new Room();
        Object.assign(room, {
            RoomID: data.RoomID,
            RoomNumber: data.RoomNumber,
            Floor: data.Floor,
            CurrentPrice: data.CurrentPrice,
            Description: data.Description,
            Capacity: data.Capacity,
            CreateAt: new Date(data.CreateAt),
            UpadateAt: new Date(data.UpadateAt),
            Status: data.Status,
            TypeID: data.TypeID,
            amenities: [] // Khởi tạo amenities array rỗng
        });
        return room;
    }

    toJSON() {
        return {
            RoomID: this.RoomID,
            RoomNumber: this.RoomNumber,
            Floor: this.Floor,
            CurrentPrice: this.CurrentPrice,
            Description: this.Description,
            Capacity: this.Capacity,
            CreateAt: this.CreateAt,
            UpadateAt: this.UpadateAt,
            Status: this.Status,
            TypeID: this.TypeID,
            amenities: this.amenities // Include amenities in JSON
        };
    }

    // Thêm amenity vào room
    addAmenity(amenity) {
        if (!this.amenities.find(a => a.AmenityID === amenity.AmenityID)) {
            this.amenities.push(amenity);
        }
    }

    // Xóa amenity khỏi room
    removeAmenity(amenityId) {
        this.amenities = this.amenities.filter(a => a.AmenityID !== amenityId);
    }

    // Lấy tất cả amenities
    getAmenities() {
        return this.amenities;
    }

    // Kiểm tra room có amenity cụ thể không
    hasAmenity(amenityId) {
        return this.amenities.some(a => a.AmenityID === amenityId);
    }

    // Lấy số lượng amenities
    getAmenityCount() {
        return this.amenities.length;
    }

    // Tính tổng giá phụ thu amenities
    calculateAmenityPrice(pricePerAmenity = 50000) {
        return this.amenities.length * pricePerAmenity;
    }

    // Validate room data
    validate() {
        if (!this.RoomNumber || this.RoomNumber.trim() === '') {
            throw new Error('Room number is required');
        }
        if (this.Floor < 1) {
            throw new Error('Invalid floor number');
        }
        if (this.CurrentPrice < 0) {
            throw new Error('Invalid price');
        }
        if (this.Capacity < 1) {
            throw new Error('Invalid capacity');
        }
        if (!this.TypeID) {
            throw new Error('Room type is required');
        }
    }
}

export default Room;