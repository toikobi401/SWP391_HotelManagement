class Guest {
  constructor(guestPhoneNumber, guestName, guestEmail = null, receptionistID, createAt = null, updateAt = null) {
    this.guestPhoneNumber = guestPhoneNumber;
    this.guestName = guestName;
    this.guestEmail = guestEmail;
    this.receptionistID = receptionistID;
    this.createAt = createAt || new Date();
    this.updateAt = updateAt || new Date();
  }

  // Validation methods
  static validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      return { isValid: false, message: 'Số điện thoại không được để trống' };
    }
    
    // Remove spaces and special characters
    const cleanPhone = phoneNumber.toString().replace(/[\s\-\(\)]/g, '');
    
    // Check if it's exactly 10 digits and starts with 0
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return { isValid: false, message: 'Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0' };
    }
    
    return { isValid: true, phone: cleanPhone };
  }

  static validateGuestName(name) {
    if (!name || name.trim().length === 0) {
      return { isValid: false, message: 'Tên khách hàng không được để trống' };
    }
    
    if (name.trim().length < 2) {
      return { isValid: false, message: 'Tên khách hàng phải có ít nhất 2 ký tự' };
    }
    
    if (name.trim().length > 100) {
      return { isValid: false, message: 'Tên khách hàng không được vượt quá 100 ký tự' };
    }
    
    // Check for valid name characters (letters, spaces, Vietnamese characters)
    const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
    if (!nameRegex.test(name.trim())) {
      return { isValid: false, message: 'Tên khách hàng chỉ được chứa chữ cái và khoảng trắng' };
    }
    
    return { isValid: true, name: name.trim() };
  }

  static validateEmail(email) {
    if (!email) {
      return { isValid: true, email: null }; // Email is optional
    }
    
    if (email.length > 100) {
      return { isValid: false, message: 'Email không được vượt quá 100 ký tự' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Email không đúng định dạng' };
    }
    
    return { isValid: true, email: email.toLowerCase().trim() };
  }

  static validateReceptionistID(receptionistID) {
    if (!receptionistID) {
      return { isValid: false, message: 'ID nhân viên lễ tân không được để trống' };
    }
    
    if (!Number.isInteger(receptionistID) || receptionistID <= 0) {
      return { isValid: false, message: 'ID nhân viên lễ tân phải là số nguyên dương' };
    }
    
    return { isValid: true, receptionistID };
  }

  // Validate all fields
  static validateGuest(guestData) {
    const errors = [];
    
    // Validate phone number
    const phoneValidation = this.validatePhoneNumber(guestData.guestPhoneNumber);
    if (!phoneValidation.isValid) {
      errors.push({ field: 'guestPhoneNumber', message: phoneValidation.message });
    }
    
    // Validate guest name
    const nameValidation = this.validateGuestName(guestData.guestName);
    if (!nameValidation.isValid) {
      errors.push({ field: 'guestName', message: nameValidation.message });
    }
    
    // Validate email (optional)
    const emailValidation = this.validateEmail(guestData.guestEmail);
    if (!emailValidation.isValid) {
      errors.push({ field: 'guestEmail', message: emailValidation.message });
    }
    
    // Validate receptionist ID
    const receptionistValidation = this.validateReceptionistID(guestData.receptionistID);
    if (!receptionistValidation.isValid) {
      errors.push({ field: 'receptionistID', message: receptionistValidation.message });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedData: errors.length === 0 ? {
        guestPhoneNumber: phoneValidation.phone,
        guestName: nameValidation.name,
        guestEmail: emailValidation.email,
        receptionistID: receptionistValidation.receptionistID
      } : null
    };
  }

  // Instance methods
  validate() {
    return Guest.validateGuest({
      guestPhoneNumber: this.guestPhoneNumber,
      guestName: this.guestName,
      guestEmail: this.guestEmail,
      receptionistID: this.receptionistID
    });
  }

  toJSON() {
    return {
      guestPhoneNumber: this.guestPhoneNumber,
      guestName: this.guestName,
      guestEmail: this.guestEmail,
      receptionistID: this.receptionistID,
      createAt: this.createAt,
      updateAt: this.updateAt
    };
  }

  toString() {
    return `Guest(${this.guestPhoneNumber}, ${this.guestName}, ${this.guestEmail || 'No Email'})`;
  }

  // Static factory method
  static fromDatabaseRow(row) {
    return new Guest(
      row.GuestPhoneNumber?.trim(),
      row.GuestName,
      row.GuestEmail,
      row.ReceptionistID,
      row.CreateAt,
      row.UpdateAt
    );
  }

  // Prepare data for database insertion
  toDatabaseObject() {
    return {
      GuestPhoneNumber: this.guestPhoneNumber,
      GuestName: this.guestName,
      GuestEmail: this.guestEmail,
      ReceptionistID: this.receptionistID,
      CreateAt: this.createAt,
      UpdateAt: this.updateAt
    };
  }
}

export default Guest;