class InvoiceItem {
    constructor(
        invoiceItemID = null,
        invoiceID = null,
        itemType = '',
        itemID = null,
        itemName = '',
        quantity = 1,
        unitPrice = 0.0,
        subTotal = 0.0,
        description = ''
    ) {
        this.InvoiceItemID = invoiceItemID;
        this.InvoiceID = invoiceID;
        this.ItemType = itemType; // 'Room', 'Service', 'Promotion', 'Fee', etc.
        this.ItemID = itemID; // Reference ID to the actual item (RoomID, ServiceID, etc.)
        this.ItemName = itemName;
        this.Quantity = parseInt(quantity) || 1;
        this.UnitPrice = parseFloat(unitPrice) || 0.0;
        this.SubTotal = parseFloat(subTotal) || 0.0;
        this.Description = description || '';

        // Auto-calculate subtotal if not provided
        if (this.SubTotal === 0.0 && this.Quantity > 0 && this.UnitPrice > 0) {
            this.calculateSubTotal();
        }
    }

    // ✅ CREATE FROM DATABASE RECORD
    static fromDatabase(record) {
        if (!record) return null;

        return new InvoiceItem(
            record.InvoiceItemID,
            record.InvoiceID,
            record.ItemType,
            record.ItemID,
            record.ItemName,
            record.Quantity,
            record.UnitPrice,
            record.SubTotal,
            record.Description
        );
    }

    // ✅ ITEM TYPE CONSTANTS
    static get ITEM_TYPES() {
        return {
            ROOM: 'Room',
            SERVICE: 'Service',
            PROMOTION: 'Promotion',
            FEE: 'Fee',
            TAX: 'Tax',
            DISCOUNT: 'Discount',
            EXTRA: 'Extra'
        };
    }

    // ✅ VALIDATION METHODS
    validate() {
        const errors = [];

        // Validate InvoiceID
        if (!this.InvoiceID || this.InvoiceID <= 0) {
            errors.push('InvoiceID is required and must be positive');
        }

        // Validate ItemType
        if (!this.ItemType || this.ItemType.trim() === '') {
            errors.push('ItemType is required');
        }

        // Validate ItemName
        if (!this.ItemName || this.ItemName.trim() === '') {
            errors.push('ItemName is required');
        }

        // ✅ SỬA: Quantity phải dương (tuân thủ database constraint)
        if (this.Quantity <= 0) {
            errors.push('Quantity must be positive (database constraint CHK_Quantity)');
        }

        // ✅ SỬA: UnitPrice phải không âm
        if (this.UnitPrice < 0) {
            errors.push('UnitPrice cannot be negative (database constraint CHK_UnitPrice)');
        }

        // ✅ SỬA: SubTotal có thể âm cho discount items
        // Không validate SubTotal >= 0 nữa vì promotion cần SubTotal âm

        // Validate ItemName length
        if (this.ItemName.length > 255) {
            errors.push('ItemName too long (max 255 characters)');
        }

        // Validate Description length
        if (this.Description && this.Description.length > 500) {
            errors.push('Description too long (max 500 characters)');
        }

        // ✅ SỬA: Business logic validation - Đặc biệt cho promotion items
        if (this.ItemType === InvoiceItem.ITEM_TYPES.PROMOTION) {
            // Promotion items: Quantity = 1, UnitPrice = discount amount, SubTotal = -discount amount
            if (this.Quantity !== 1) {
                errors.push('Promotion items must have Quantity = 1');
            }
            if (this.SubTotal > 0) {
                errors.push('Promotion items must have negative SubTotal');
            }
            if (this.UnitPrice !== Math.abs(this.SubTotal)) {
                errors.push('For promotion items: UnitPrice must equal absolute value of SubTotal');
            }
        } else {
            // Non-promotion items: SubTotal should equal Quantity * UnitPrice
            const expectedSubTotal = this.Quantity * this.UnitPrice;
            if (Math.abs(this.SubTotal - expectedSubTotal) > 0.01) {
                errors.push(`SubTotal should equal Quantity × UnitPrice (${expectedSubTotal})`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            validatedData: this
        };
    }

    // ✅ CALCULATE SUBTOTAL
    calculateSubTotal() {
        this.SubTotal = this.Quantity * this.UnitPrice;
        return this.SubTotal;
    }

    // ✅ UPDATE QUANTITY
    updateQuantity(newQuantity) {
        const quantity = parseInt(newQuantity);
        
        if (quantity <= 0) {
            throw new Error('Quantity must be positive');
        }

        this.Quantity = quantity;
        this.calculateSubTotal();
        
        return this.SubTotal;
    }

    // ✅ UPDATE UNIT PRICE
    updateUnitPrice(newPrice) {
        const price = parseFloat(newPrice);
        
        if (price < 0) {
            throw new Error('Unit price cannot be negative');
        }

        this.UnitPrice = price;
        this.calculateSubTotal();
        
        return this.SubTotal;
    }

    // ✅ APPLY DISCOUNT
    applyDiscount(discountPercent) {
        const discount = parseFloat(discountPercent);
        
        if (discount < 0 || discount > 100) {
            throw new Error('Discount percent must be between 0 and 100');
        }

        const discountAmount = this.UnitPrice * (discount / 100);
        this.UnitPrice = this.UnitPrice - discountAmount;
        this.calculateSubTotal();

        return {
            discountAmount: discountAmount,
            newUnitPrice: this.UnitPrice,
            newSubTotal: this.SubTotal
        };
    }

    // ✅ GET ITEM TYPE DISPLAY NAME
    getItemTypeDisplayName() {
        const displayNames = {
            'Room': 'Phòng',
            'Service': 'Dịch vụ',
            'Promotion': 'Khuyến mãi',
            'Fee': 'Phí',
            'Tax': 'Thuế',
            'Discount': 'Giảm giá',
            'Extra': 'Phụ thu'
        };

        return displayNames[this.ItemType] || this.ItemType;
    }

    // ✅ IS ROOM CHARGE
    isRoomCharge() {
        return this.ItemType === InvoiceItem.ITEM_TYPES.ROOM;
    }

    // ✅ IS SERVICE CHARGE
    isServiceCharge() {
        return this.ItemType === InvoiceItem.ITEM_TYPES.SERVICE;
    }

    // ✅ IS DISCOUNT
    isDiscount() {
        return this.ItemType === InvoiceItem.ITEM_TYPES.DISCOUNT || 
               this.ItemType === InvoiceItem.ITEM_TYPES.PROMOTION;
    }

    // ✅ GETTERS
    getInvoiceItemID() { return this.InvoiceItemID; }
    getInvoiceID() { return this.InvoiceID; }
    getItemType() { return this.ItemType; }
    getItemID() { return this.ItemID; }
    getItemName() { return this.ItemName; }
    getQuantity() { return this.Quantity; }
    getUnitPrice() { return this.UnitPrice; }
    getSubTotal() { return this.SubTotal; }
    getDescription() { return this.Description; }

    // ✅ SETTERS
    setInvoiceID(invoiceID) { 
        this.InvoiceID = invoiceID;
        return this;
    }
    
    setItemType(itemType) { 
        this.ItemType = itemType;
        return this;
    }
    
    setItemID(itemID) { 
        this.ItemID = itemID;
        return this;
    }
    
    setItemName(itemName) { 
        this.ItemName = itemName;
        return this;
    }
    
    setQuantity(quantity) { 
        return this.updateQuantity(quantity);
    }
    
    setUnitPrice(unitPrice) { 
        return this.updateUnitPrice(unitPrice);
    }
    
    setDescription(description) { 
        this.Description = description || '';
        return this;
    }

    // ✅ TO JSON FOR API RESPONSES
    toJSON() {
        return {
            InvoiceItemID: this.InvoiceItemID,
            InvoiceID: this.InvoiceID,
            ItemType: this.ItemType,
            ItemTypeDisplayName: this.getItemTypeDisplayName(),
            ItemID: this.ItemID,
            ItemName: this.ItemName,
            Quantity: this.Quantity,
            UnitPrice: this.UnitPrice,
            SubTotal: this.SubTotal,
            Description: this.Description,
            FormattedUnitPrice: InvoiceItem.formatCurrency(this.UnitPrice),
            FormattedSubTotal: InvoiceItem.formatCurrency(this.SubTotal),
            IsRoomCharge: this.isRoomCharge(),
            IsServiceCharge: this.isServiceCharge(),
            IsDiscount: this.isDiscount()
        };
    }

    // ✅ TO DATABASE FORMAT
    toDatabase() {
        return {
            InvoiceItemID: this.InvoiceItemID,
            InvoiceID: this.InvoiceID,
            ItemType: this.ItemType,
            ItemID: this.ItemID,
            ItemName: this.ItemName,
            Quantity: this.Quantity,
            UnitPrice: this.UnitPrice,
            SubTotal: this.SubTotal,
            Description: this.Description
        };
    }

    // ✅ STATIC HELPER METHODS
    static formatCurrency(amount, locale = 'vi-VN', currency = 'VND') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static validateItemType(itemType) {
        const validTypes = Object.values(InvoiceItem.ITEM_TYPES);
        return validTypes.includes(itemType);
    }

    // ✅ CREATE ROOM CHARGE ITEM
    static createRoomChargeItem(roomID, roomName, nights, pricePerNight, description = '') {
        return new InvoiceItem(
            null,
            null, // Will be set when added to invoice
            InvoiceItem.ITEM_TYPES.ROOM,
            roomID,
            `Phòng ${roomName}`,
            nights,
            pricePerNight,
            0, // Will be calculated
            description || `Phí phòng ${roomName} - ${nights} đêm`
        );
    }

    // ✅ CREATE SERVICE CHARGE ITEM
    static createServiceChargeItem(serviceID, serviceName, quantity, unitPrice, description = '') {
        return new InvoiceItem(
            null,
            null, // Will be set when added to invoice
            InvoiceItem.ITEM_TYPES.SERVICE,
            serviceID,
            serviceName,
            quantity,
            unitPrice,
            0, // Will be calculated
            description || `Dịch vụ ${serviceName}`
        );
    }

    // ✅ SỬA: CREATE DISCOUNT ITEM với quantity dương
    static createDiscountItem(promotionID, promotionName, discountAmount, description = '') {
        return new InvoiceItem(
            null,
            null,
            InvoiceItem.ITEM_TYPES.PROMOTION,
            promotionID,
            `Khuyến mãi - ${promotionName}`,
            1, // ✅ Quantity dương (tuân thủ constraint)
            Math.abs(discountAmount), // ✅ UnitPrice dương (giá trị discount)
            -Math.abs(discountAmount), // ✅ SubTotal âm (để trừ vào tổng)
            description || `Khuyến mãi ${promotionName}`
        );
    }

    // ✅ CREATE TAX ITEM
    static createTaxItem(taxName, taxPercent, baseAmount, description = '') {
        const taxAmount = baseAmount * (taxPercent / 100);
        return new InvoiceItem(
            null,
            null, // Will be set when added to invoice
            InvoiceItem.ITEM_TYPES.TAX,
            null,
            `${taxName} (${taxPercent}%)`,
            1,
            taxAmount,
            0, // Will be calculated
            description || `${taxName} - ${taxPercent}% trên ${InvoiceItem.formatCurrency(baseAmount)}`
        );
    }

    // ✅ CLONE INVOICE ITEM
    clone() {
        return new InvoiceItem(
            null, // New item, no ID
            this.InvoiceID,
            this.ItemType,
            this.ItemID,
            this.ItemName,
            this.Quantity,
            this.UnitPrice,
            this.SubTotal,
            this.Description
        );
    }

    // ✅ COMPARE WITH ANOTHER INVOICE ITEM
    equals(otherItem) {
        if (!otherItem || !(otherItem instanceof InvoiceItem)) {
            return false;
        }

        return this.ItemType === otherItem.ItemType &&
               this.ItemID === otherItem.ItemID &&
               this.ItemName === otherItem.ItemName &&
               this.Quantity === otherItem.Quantity &&
               this.UnitPrice === otherItem.UnitPrice;
    }

    // ✅ TO STRING REPRESENTATION
    toString() {
        return `InvoiceItem[ID=${this.InvoiceItemID}, Type=${this.ItemType}, Name=${this.ItemName}, Qty=${this.Quantity}, Price=${this.UnitPrice}, Total=${this.SubTotal}]`;
    }
}

export default InvoiceItem;