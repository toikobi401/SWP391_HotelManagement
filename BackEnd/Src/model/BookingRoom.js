class BookingRoom {
  constructor(bookingRoomID = null, bookingID, roomID, checkInAt = null, checkOutAt = null) {
    this.bookingRoomID = bookingRoomID;
    this.bookingID = bookingID;
    this.roomID = roomID;
    this.checkInAt = checkInAt || new Date();
    this.checkOutAt = checkOutAt || new Date();
  }

  static validateBookingRoom(data) {
    const errors = [];
    
    if (!data.bookingID || !Number.isInteger(data.bookingID) || data.bookingID <= 0) {
      errors.push({ field: 'bookingID', message: 'Booking ID không hợp lệ' });
    }
    
    if (!data.roomID || !Number.isInteger(data.roomID) || data.roomID <= 0) {
      errors.push({ field: 'roomID', message: 'Room ID không hợp lệ' });
    }
    
    // ✅ SỬA: Validate dates instead of quantity/price
    if (data.checkInAt) {
      const checkIn = new Date(data.checkInAt);
      if (isNaN(checkIn.getTime())) {
        errors.push({ field: 'checkInAt', message: 'Ngày check-in không hợp lệ' });
      }
    }
    
    if (data.checkOutAt) {
      const checkOut = new Date(data.checkOutAt);
      if (isNaN(checkOut.getTime())) {
        errors.push({ field: 'checkOutAt', message: 'Ngày check-out không hợp lệ' });
      }
    }
    
    if (data.checkInAt && data.checkOutAt) {
      const checkIn = new Date(data.checkInAt);
      const checkOut = new Date(data.checkOutAt);
      if (checkIn >= checkOut) {
        errors.push({ field: 'dateRange', message: 'Ngày check-out phải sau ngày check-in' });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedData: errors.length === 0 ? {
        bookingID: data.bookingID,
        roomID: data.roomID,
        checkInAt: data.checkInAt ? new Date(data.checkInAt) : new Date(),
        checkOutAt: data.checkOutAt ? new Date(data.checkOutAt) : new Date()
      } : null
    };
  }

  toJSON() {
    return {
      bookingRoomID: this.bookingRoomID,
      bookingID: this.bookingID,
      roomID: this.roomID,
      checkInAt: this.checkInAt,
      checkOutAt: this.checkOutAt
    };
  }

  static fromDatabase(data) {
    return new BookingRoom(
      data.BookingRoomID,
      data.BookingID,
      data.RoomID,
      data.CheckInAt,
      data.CheckOutAt
    );
  }
}

export default BookingRoom;