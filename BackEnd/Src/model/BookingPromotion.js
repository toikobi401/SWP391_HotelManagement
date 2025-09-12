class BookingPromotion {
  constructor(bookingPromotionID = null, promotionID, bookingID) {
    this.bookingPromotionID = bookingPromotionID;
    this.promotionID = promotionID;
    this.bookingID = bookingID;
  }

  static validateBookingPromotion(data) {
    const errors = [];
    
    if (!data.bookingID || !Number.isInteger(data.bookingID) || data.bookingID <= 0) {
      errors.push({ field: 'bookingID', message: 'Booking ID không hợp lệ' });
    }
    
    if (!data.promotionID || !Number.isInteger(data.promotionID) || data.promotionID <= 0) {
      errors.push({ field: 'promotionID', message: 'Promotion ID không hợp lệ' });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedData: errors.length === 0 ? {
        bookingID: data.bookingID,
        promotionID: data.promotionID
      } : null
    };
  }

  toJSON() {
    return {
      bookingPromotionID: this.bookingPromotionID,
      promotionID: this.promotionID,
      bookingID: this.bookingID
    };
  }

  static fromDatabase(data) {
    return new BookingPromotion(
      data.BookingPromotionID,
      data.PromotionID,
      data.BookingID
    );
  }

  toDatabaseObject() {
    return {
      BookingPromotionID: this.bookingPromotionID,
      PromotionID: this.promotionID,
      BookingID: this.bookingID
    };
  }
}

export default BookingPromotion;