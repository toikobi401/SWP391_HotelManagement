import RoomDBContext from '../dal/RoomDBContext.js';
import AmenityDBContext from '../dal/AmenityDBContext.js';

class RoomAmenityService {
    constructor() {
        this.roomDB = new RoomDBContext();
        this.amenityDB = new AmenityDBContext();
    }

    // Đồng bộ thêm amenity vào room (cập nhật cả hai phía)
    async addAmenityToRoom(roomId, amenityId) {
        try {
            // Thêm vào database
            await this.amenityDB.addAmenityToRoom(roomId, amenityId);
            
            // Lấy dữ liệu mới để đồng bộ
            const room = await this.roomDB.getById(roomId);
            const amenity = await this.amenityDB.getById(amenityId);
            
            if (room && amenity) {
                // Thêm amenity vào room object nếu room có method addAmenity
                if (typeof room.addAmenity === 'function') {
                    room.addAmenity({
                        AmenityID: amenity.AmenityID,
                        AmenityName: amenity.AmenityName,
                        Description: amenity.Description
                    });
                }
                
                // Thêm room vào amenity object nếu amenity có method addRoom
                if (typeof amenity.addRoom === 'function') {
                    amenity.addRoom({
                        RoomID: room.RoomID,
                        RoomNumber: room.RoomNumber,
                        Floor: room.Floor,
                        Status: room.Status
                    });
                }
            }
            
            return { success: true, room, amenity };
        } catch (error) {
            console.error('Error in addAmenityToRoom service:', error);
            throw error;
        }
    }

    // Đồng bộ xóa amenity khỏi room
    async removeAmenityFromRoom(roomId, amenityId) {
        try {
            // Xóa khỏi database
            await this.amenityDB.removeAmenityFromRoom(roomId, amenityId);
            
            // Lấy dữ liệu mới để đồng bộ
            const room = await this.roomDB.getById(roomId);
            const amenity = await this.amenityDB.getById(amenityId);
            
            if (room && amenity) {
                // Xóa amenity khỏi room object nếu room có method removeAmenity
                if (typeof room.removeAmenity === 'function') {
                    room.removeAmenity(amenityId);
                }
                
                // Xóa room khỏi amenity object nếu amenity có method removeRoom
                if (typeof amenity.removeRoom === 'function') {
                    amenity.removeRoom(roomId);
                }
            }
            
            return { success: true, room, amenity };
        } catch (error) {
            console.error('Error in removeAmenityFromRoom service:', error);
            throw error;
        }
    }

    // Lấy thống kê quan hệ Room-Amenity
    async getRoomAmenityStats() {
        try {
            const rooms = await this.roomDB.getAll();
            const amenities = await this.amenityDB.getAllAmenities();
            
            const roomsWithAmenities = rooms.filter(r => {
                return (typeof r.getAmenityCount === 'function' && r.getAmenityCount() > 0) ||
                       (r.amenities && r.amenities.length > 0);
            }).length;

            const amenitiesInUse = amenities.filter(a => {
                return (typeof a.getRoomCount === 'function' && a.getRoomCount() > 0) ||
                       (a.rooms && a.rooms.length > 0);
            }).length;

            const totalAmenityCount = rooms.reduce((sum, r) => {
                if (typeof r.getAmenityCount === 'function') {
                    return sum + r.getAmenityCount();
                }
                return sum + (r.amenities ? r.amenities.length : 0);
            }, 0);

            const totalRoomCount = amenities.reduce((sum, a) => {
                if (typeof a.getRoomCount === 'function') {
                    return sum + a.getRoomCount();
                }
                return sum + (a.rooms ? a.rooms.length : 0);
            }, 0);
            
            return {
                totalRooms: rooms.length,
                totalAmenities: amenities.length,
                roomsWithAmenities: roomsWithAmenities,
                amenitiesInUse: amenitiesInUse,
                avgAmenitiesPerRoom: rooms.length > 0 ? totalAmenityCount / rooms.length : 0,
                avgRoomsPerAmenity: amenities.length > 0 ? totalRoomCount / amenities.length : 0
            };
        } catch (error) {
            console.error('Error getting room-amenity stats:', error);
            throw error;
        }
    }
}

export default RoomAmenityService;