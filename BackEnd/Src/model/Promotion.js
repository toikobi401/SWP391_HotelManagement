class Promotion {
    constructor(promotionID, promotionName, discountPercent, startDate, endDate, description) {
        this.promotionID = promotionID;
        this.promotionName = promotionName;
        this.discountPercent = discountPercent;
        this.startDate = startDate;
        this.endDate = endDate;
        this.description = description;
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

    // Method to check if promotion is currently active
    isActive() {
        const currentDate = new Date();
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        return currentDate >= start && currentDate <= end;
    }

    // Method to validate promotion data
    isValid() {
        return this.promotionName && 
               this.promotionName.length <= 50 &&
               this.discountPercent >= 0 && 
               this.discountPercent <= 100 &&
               this.startDate &&
               this.endDate &&
               new Date(this.startDate) <= new Date(this.endDate) &&
               this.description &&
               this.description.length <= 255;
    }

    // Convert to JSON
    toJSON() {
        return {
            promotionID: this.promotionID,
            promotionName: this.promotionName,
            discountPercent: this.discountPercent,
            startDate: this.startDate,
            endDate: this.endDate,
            description: this.description
        };
    }
}

export default Promotion;