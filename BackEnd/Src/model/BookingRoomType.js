class BookingRoomType {
  constructor(bookingRoomTypeID = null, bookingID, roomTypeID, quantity, checkInAt = null, checkOutAt = null) {
    this.bookingRoomTypeID = bookingRoomTypeID;
    this.bookingID = bookingID;
    this.roomTypeID = roomTypeID;
    this.quantity = quantity;
    this.checkInAt = checkInAt;
    this.checkOutAt = checkOutAt;
  }

  // ✅ VALIDATION METHOD
  static validateBookingRoomType(data) {
    const errors = [];
    
    // BookingID validation
    if (!data.bookingID || !Number.isInteger(data.bookingID) || data.bookingID <= 0) {
      errors.push({ field: 'bookingID', message: 'Booking ID không hợp lệ' });
    }
    
    // RoomTypeID validation
    if (!data.roomTypeID || !Number.isInteger(data.roomTypeID) || data.roomTypeID <= 0) {
      errors.push({ field: 'roomTypeID', message: 'Room Type ID không hợp lệ' });
    }
    
    // Quantity validation
    if (!data.quantity || !Number.isInteger(data.quantity) || data.quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Số lượng phải lớn hơn 0' });
    }
    
    if (data.quantity > 100) {
      errors.push({ field: 'quantity', message: 'Số lượng không được vượt quá 100' });
    }
    
    // CheckInAt validation (optional)
    if (data.checkInAt && !(data.checkInAt instanceof Date) && isNaN(Date.parse(data.checkInAt))) {
      errors.push({ field: 'checkInAt', message: 'Ngày check-in không hợp lệ' });
    }
    
    // CheckOutAt validation (optional)
    if (data.checkOutAt && !(data.checkOutAt instanceof Date) && isNaN(Date.parse(data.checkOutAt))) {
      errors.push({ field: 'checkOutAt', message: 'Ngày check-out không hợp lệ' });
    }
    
    // Check if checkOutAt is after checkInAt
    if (data.checkInAt && data.checkOutAt) {
      const checkIn = new Date(data.checkInAt);
      const checkOut = new Date(data.checkOutAt);
      if (checkOut <= checkIn) {
        errors.push({ field: 'checkOutAt', message: 'Ngày check-out phải sau ngày check-in' });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedData: errors.length === 0 ? {
        bookingID: data.bookingID,
        roomTypeID: data.roomTypeID,
        quantity: data.quantity,
        checkInAt: data.checkInAt ? new Date(data.checkInAt) : null,
        checkOutAt: data.checkOutAt ? new Date(data.checkOutAt) : null
      } : null
    };
  }

  // ✅ TO JSON FOR API RESPONSES
  toJSON() {
    return {
      bookingRoomTypeID: this.bookingRoomTypeID,
      bookingID: this.bookingID,
      roomTypeID: this.roomTypeID,
      quantity: this.quantity,
      checkInAt: this.checkInAt,
      checkOutAt: this.checkOutAt
    };
  }

  // ✅ FROM DATABASE RECORD
  static fromDatabase(data) {
    return new BookingRoomType(
      data.BookingRoomTypeID,
      data.BookingID,
      data.RoomTypeID,
      data.Quantity,
      data.CheckInAt,
      data.CheckOutAt
    );
  }

  // ✅ TO DATABASE OBJECT
  toDatabaseObject() {
    return {
      BookingRoomTypeID: this.bookingRoomTypeID,
      BookingID: this.bookingID,
      RoomTypeID: this.roomTypeID,
      Quantity: this.quantity,
      CheckInAt: this.checkInAt,
      CheckOutAt: this.checkOutAt
    };
  }

  // ✅ GETTERS
  getBookingRoomTypeID() {
    return this.bookingRoomTypeID;
  }

  getBookingID() {
    return this.bookingID;
  }

  getRoomTypeID() {
    return this.roomTypeID;
  }

  getQuantity() {
    return this.quantity;
  }

  getCheckInAt() {
    return this.checkInAt;
  }

  getCheckOutAt() {
    return this.checkOutAt;
  }

  // ✅ SETTERS
  setBookingID(bookingID) {
    if (!bookingID || bookingID <= 0) {
      throw new Error('Invalid booking ID');
    }
    this.bookingID = bookingID;
  }

  setRoomTypeID(roomTypeID) {
    if (!roomTypeID || roomTypeID <= 0) {
      throw new Error('Invalid room type ID');
    }
    this.roomTypeID = roomTypeID;
  }

  setQuantity(quantity) {
    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (quantity > 100) {
      throw new Error('Quantity cannot exceed 100');
    }
    this.quantity = quantity;
  }

  setCheckInAt(checkInAt) {
    if (checkInAt !== null && checkInAt !== undefined) {
      if (!(checkInAt instanceof Date)) {
        checkInAt = new Date(checkInAt);
      }
      if (isNaN(checkInAt.getTime())) {
        throw new Error('checkInAt must be a valid date');
      }
    }
    this.checkInAt = checkInAt;
  }

  setCheckOutAt(checkOutAt) {
    if (checkOutAt !== null && checkOutAt !== undefined) {
      if (!(checkOutAt instanceof Date)) {
        checkOutAt = new Date(checkOutAt);
      }
      if (isNaN(checkOutAt.getTime())) {
        throw new Error('checkOutAt must be a valid date');
      }
    }
    this.checkOutAt = checkOutAt;
  }

  // ✅ BUSINESS LOGIC METHODS
  updateQuantity(newQuantity) {
    const quantity = parseInt(newQuantity);
    
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    
    if (quantity > 100) {
      throw new Error('Quantity cannot exceed 100');
    }

    this.quantity = quantity;
    return this.quantity;
  }

  // ✅ HELPER METHODS
  getTotalRoomCount() {
    return this.quantity;
  }

  isValidForBooking() {
    return this.bookingID > 0 && this.roomTypeID > 0 && this.quantity > 0;
  }

  // ✅ STATIC HELPER METHODS
  static createFromBookingData(bookingID, roomTypeData) {
    const validation = BookingRoomType.validateBookingRoomType({
      bookingID: bookingID,
      roomTypeID: roomTypeData.roomTypeID || roomTypeData.roomTypeId,
      quantity: roomTypeData.quantity
    });

    if (!validation.isValid) {
      throw new Error('Invalid booking room type data: ' + validation.errors.map(e => e.message).join(', '));
    }

    return new BookingRoomType(
      null,
      validation.validatedData.bookingID,
      validation.validatedData.roomTypeID,
      validation.validatedData.quantity
    );
  }

  // ✅ COMPARISON METHODS
  equals(other) {
    if (!(other instanceof BookingRoomType)) {
      return false;
    }

    return (
      this.bookingID === other.bookingID &&
      this.roomTypeID === other.roomTypeID &&
      this.quantity === other.quantity
    );
  }

  // ✅ CLONE METHOD
  clone() {
    return new BookingRoomType(
      this.bookingRoomTypeID,
      this.bookingID,
      this.roomTypeID,
      this.quantity
    );
  }

  // ✅ STRING REPRESENTATION
  toString() {
    return `BookingRoomType(ID: ${this.bookingRoomTypeID}, BookingID: ${this.bookingID}, RoomTypeID: ${this.roomTypeID}, Quantity: ${this.quantity})`;
  }
}

export default BookingRoomType;