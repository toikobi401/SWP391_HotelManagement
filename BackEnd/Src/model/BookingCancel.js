class BookingCancel {
  constructor(
    cancelID = null,
    bookingID = null,
    cancelType = null,
    cancelReason = null
  ) {
    this.cancelID = cancelID;
    this.bookingID = bookingID;
    this.cancelType = cancelType;
    this.cancelReason = cancelReason;
  }

  // Validation methods theo schema thực tế
  static validateBookingCancel(cancelData) {
    const errors = [];
    
    // BookingID is required
    if (!cancelData.bookingID) {
      errors.push({ field: 'bookingID', message: 'BookingID không được để trống' });
    }
    
    // CancelType is required và không được vượt quá 50 ký tự
    if (!cancelData.cancelType) {
      errors.push({ field: 'cancelType', message: 'Loại hủy không được để trống' });
    } else if (cancelData.cancelType.length > 50) {
      errors.push({ field: 'cancelType', message: 'Loại hủy không được vượt quá 50 ký tự' });
    }
    
    // CancelReason không được vượt quá 255 ký tự (optional)
    if (cancelData.cancelReason && cancelData.cancelReason.length > 255) {
      errors.push({ field: 'cancelReason', message: 'Lý do hủy không được vượt quá 255 ký tự' });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate instance
  validate() {
    const validation = BookingCancel.validateBookingCancel(this);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    return true;
  }

  // Convert to JSON
  toJSON() {
    return {
      cancelID: this.cancelID,
      bookingID: this.bookingID,
      cancelType: this.cancelType,
      cancelReason: this.cancelReason
    };
  }

  // Convert to database object
  toDatabaseObject() {
    return {
      CancelID: this.cancelID,
      BookingID: this.bookingID,
      CancelType: this.cancelType,
      CancelReason: this.cancelReason
    };
  }

  // Static factory method from database
  static fromDatabase(data) {
    return new BookingCancel(
      data.CancelID,
      data.BookingID,
      data.CancelType,
      data.CancelReason
    );
  }

  // Static factory method from database result
  static fromDbResult(row) {
    return new BookingCancel(
      row.CancelID,
      row.BookingID,
      row.CancelType,
      row.CancelReason
    );
  }

  // Helper method để lấy các loại cancel type phổ biến
  static getCancelTypes() {
    return [
      'Customer Request',
      'Hotel Policy',
      'No Show',
      'Payment Issue',
      'Force Majeure',
      'System Error',
      'Other'
    ];
  }

  // Helper method để kiểm tra cancel type có hợp lệ không
  static isValidCancelType(cancelType) {
    const validTypes = this.getCancelTypes();
    return validTypes.includes(cancelType);
  }
}

export default BookingCancel;
