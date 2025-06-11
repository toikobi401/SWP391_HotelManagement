class Amenity {
    constructor() {
        this.AmenityID = 0;
        this.AmenityName = '';
        this.Description = '';
        this.rooms = []; // Array để lưu trữ các room có amenity này
    }

    static fromDatabase(data) {
        const amenity = new Amenity();
        Object.assign(amenity, {
            AmenityID: data.AmenityID,
            AmenityName: data.AmenityName,
            Description: data.Description,
            rooms: data.rooms || [] // Initialize rooms from data
        });
        return amenity;
    }

    toJSON() {
        return {
            AmenityID: this.AmenityID,
            AmenityName: this.AmenityName,
            Description: this.Description,
            rooms: this.rooms // Include rooms in JSON
        };
    }

    // Thêm room vào amenity
    addRoom(room) {
        if (!this.rooms.find(r => r.RoomID === room.RoomID)) {
            this.rooms.push({
                RoomID: room.RoomID,
                RoomNumber: room.RoomNumber,
                Floor: room.Floor,
                Status: room.Status
            });
        }
    }

    // Xóa room khỏi amenity
    removeRoom(roomId) {
        this.rooms = this.rooms.filter(r => r.RoomID !== roomId);
    }

    // Lấy tất cả rooms
    getRooms() {
        return this.rooms;
    }

    // Kiểm tra amenity có trong room cụ thể không
    hasRoom(roomId) {
        return this.rooms.some(r => r.RoomID === roomId);
    }

    // Lấy số lượng rooms có amenity này
    getRoomCount() {
        return this.rooms.length;
    }

    // Lấy rooms theo trạng thái
    getRoomsByStatus(status) {
        return this.rooms.filter(r => r.Status === status);
    }

    // Lấy rooms theo tầng
    getRoomsByFloor(floor) {
        return this.rooms.filter(r => r.Floor === floor);
    }

    // Validate amenity data
    validate() {
        if (!this.AmenityName || this.AmenityName.trim() === '') {
            throw new Error('Amenity name is required');
        }
        if (!this.Description || this.Description.trim() === '') {
            throw new Error('Description is required');
        }
    }
}

export default Amenity;