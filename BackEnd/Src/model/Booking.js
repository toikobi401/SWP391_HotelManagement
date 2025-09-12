class Booking {
  constructor(
    bookingID = null,
    customerID = null,
    receptionistID = null,
    numberOfGuest,
    specialRequest = null,
    bookingType, // bit: 0 = Walk-in, 1 = Online
    bookingAt,
    guestID = null,
    createAt = null,
    updateAt = null,
    walkInGuestPhoneNumber = null,
    bookingStatus = 'Pending'
  ) {
    this.bookingID = bookingID;
    this.customerID = customerID;
    this.receptionistID = receptionistID;
    this.numberOfGuest = numberOfGuest;
    this.specialRequest = specialRequest;
    this.bookingType = bookingType;
    this.bookingAt = bookingAt;
    this.guestID = guestID;
    this.createAt = createAt || new Date();
    this.updateAt = updateAt || new Date();
    this.walkInGuestPhoneNumber = walkInGuestPhoneNumber;
    this.bookingStatus = bookingStatus;
  }

  // Validation methods theo schema thực tế
  static validateBooking(bookingData) {
    const errors = [];
    
    // NumberOfGuest is required
    if (!bookingData.numberOfGuest || bookingData.numberOfGuest < 1) {
      errors.push({ field: 'numberOfGuest', message: 'Số khách phải lớn hơn 0' });
    }
    
    // BookingType is required (bit)
    if (bookingData.bookingType === null || bookingData.bookingType === undefined) {
      errors.push({ field: 'bookingType', message: 'Loại booking không được để trống' });
    }
    
    // BookingAt is required
    if (!bookingData.bookingAt) {
      errors.push({ field: 'bookingAt', message: 'Thời gian booking không được để trống' });
    }
    
    // BookingStatus is required
    if (!bookingData.bookingStatus) {
      errors.push({ field: 'bookingStatus', message: 'Trạng thái booking không được để trống' });
    }
    
    // For walk-in bookings, either GuestID or WalkInGuestPhoneNumber should be provided
    if (bookingData.bookingType === 0) { // Walk-in
      if (!bookingData.guestID && !bookingData.walkInGuestPhoneNumber) {
        errors.push({ field: 'guestInfo', message: 'Walk-in booking cần GuestID hoặc WalkInGuestPhoneNumber' });
      }
    }
    
    // For online bookings, CustomerID should be provided
    if (bookingData.bookingType === 1) { // Online
      if (!bookingData.customerID) {
        errors.push({ field: 'customerID', message: 'Online booking cần CustomerID' });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to JSON
  toJSON() {
    return {
      bookingID: this.bookingID,
      customerID: this.customerID,
      receptionistID: this.receptionistID,
      numberOfGuest: this.numberOfGuest,
      specialRequest: this.specialRequest,
      bookingType: this.bookingType,
      bookingAt: this.bookingAt,
      guestID: this.guestID,
      createAt: this.createAt,
      updateAt: this.updateAt,
      walkInGuestPhoneNumber: this.walkInGuestPhoneNumber,
      bookingStatus: this.bookingStatus
    };
  }

  // Convert to database object
  toDatabaseObject() {
    return {
      BookingID: this.bookingID,
      CustomerID: this.customerID,
      ReceptionistID: this.receptionistID,
      NumberOfGuest: this.numberOfGuest,
      SpecialRequest: this.specialRequest,
      BookingType: this.bookingType,
      BookingAt: this.bookingAt,
      GuestID: this.guestID,
      CreateAt: this.createAt,
      UpdateAt: this.updateAt,
      WalkInGuestPhoneNumber: this.walkInGuestPhoneNumber,
      BookingStatus: this.bookingStatus
    };
  }

  // Static factory method from database
  static fromDatabase(data) {
    return new Booking(
      data.BookingID,
      data.CustomerID,
      data.ReceptionistID,
      data.NumberOfGuest,
      data.SpecialRequest,
      data.BookingType,
      data.BookingAt,
      data.GuestID,
      data.CreateAt,
      data.UpdateAt,
      data.WalkInGuestPhoneNumber,
      data.BookingStatus
    );
  }
}

export default Booking;