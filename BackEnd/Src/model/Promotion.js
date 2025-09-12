class Promotion {
    constructor(promotionID, promotionName, discountPercent, startDate, endDate, description, status = 'Active') {
        this.promotionID = promotionID;
        this.promotionName = promotionName;
        this.discountPercent = discountPercent;
        this.startDate = startDate;
        this.endDate = endDate;
        this.description = description;
        this.status = status;
    }

    // Getter methods
    getPromotionID() {
        return this.promotionID;
    }

    getPromotionName() {
        return this.promotionName;
    }

    getDiscountPercent() {
        return this.discountPercent;
    }

    getStartDate() {
        return this.startDate;
    }

    getEndDate() {
        return this.endDate;
    }

    getDescription() {
        return this.description;
    }

    getStatus() {
        return this.status;
    }

    // Setter methods
    setPromotionID(promotionID) {
        this.promotionID = promotionID;
    }

    setPromotionName(promotionName) {
        this.promotionName = promotionName;
    }

    setDiscountPercent(discountPercent) {
        this.discountPercent = discountPercent;
    }

    setStartDate(startDate) {
        this.startDate = startDate;
    }

    setEndDate(endDate) {
        this.endDate = endDate;
    }

    setDescription(description) {
        this.description = description;
    }

    setStatus(status) {
        this.status = status;
    }

    // Method to check if promotion is currently active
    isActive() {
        const currentDate = new Date();
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        return this.status === 'Active' && currentDate >= start && currentDate <= end;
    }

    // Method kiểm tra status có hợp lệ không
    isValidStatus() {
        const validStatuses = ['Active', 'Inactive', 'Expired', 'Draft', 'Suspended'];
        return validStatuses.includes(this.status);
    }

    // Method to validate promotion data
    isValid() {
        try {
            return this.promotionName && 
                   this.promotionName.length <= 50 &&
                   this.discountPercent >= 0 && 
                   this.discountPercent <= 100 &&
                   this.startDate &&
                   this.endDate &&
                   new Date(this.startDate) <= new Date(this.endDate) &&
                   (!this.description || this.description.length <= 255) &&
                   this.isValidStatus();
        } catch (error) {
            return false;
        }
    }

    // Convert to JSON
    toJSON() {
        return {
            promotionID: this.promotionID,
            promotionName: this.promotionName,
            discountPercent: this.discountPercent,
            startDate: this.startDate,
            endDate: this.endDate,
            description: this.description,
            status: this.status
        };
    }

    // Method to convert to database object
    toDbObject() {
        return {
            PromotionName: this.promotionName,
            DiscountPercent: this.discountPercent,
            StartDate: this.startDate,
            EndDate: this.endDate,
            Description: this.description,
            Status: this.status
        };
    }

    // Static method to create from database row
    static fromDbRow(row) {
        return new Promotion(
            row.PromotionID,
            row.PromotionName,
            row.DiscountPercent,
            row.StartDate,
            row.EndDate,
            row.Description,
            row.Status || 'Active'
        );
    }
}

export default Promotion;