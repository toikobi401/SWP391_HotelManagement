class BookingService {
  constructor(bookingID, serviceID, createAt = null, updateAt = null) {
    this.bookingID = bookingID;
    this.serviceID = serviceID; 
    this.createAt = createAt || new Date();
    this.updateAt = updateAt || new Date();
  }

  static validateBookingService(data) {
    const errors = [];
    
    if (!data.bookingID || !Number.isInteger(data.bookingID) || data.bookingID <= 0) {
      errors.push({ field: 'bookingID', message: 'Booking ID không hợp lệ' });
    }
    
    if (!data.serviceID || !Number.isInteger(data.serviceID) || data.serviceID <= 0) {
      errors.push({ field: 'serviceID', message: 'Service ID không hợp lệ' });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedData: errors.length === 0 ? {
        bookingID: data.bookingID,
        serviceID: data.serviceID,
        createAt: new Date(),
        updateAt: new Date()
      } : null
    };
  }

  toJSON() {
    return {
      bookingID: this.bookingID,
      serviceID: this.serviceID,
      createAt: this.createAt,
      updateAt: this.updateAt
    };
  }

  static fromDatabase(data) {
    return new BookingService(
      data.BookingID,
      data.ServiceID,
      data.CreateAt,
      data.UpdateAt
    );
  }

  toDatabaseObject() {
    return {
      BookingID: this.bookingID,
      ServiceID: this.serviceID,
      CreateAt: this.createAt,
      UpdateAt: this.updateAt
    };
  }
}

export default BookingService;