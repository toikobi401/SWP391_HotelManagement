class Feedback {
    constructor({
        feedbackID = null,
        overallRating = null,
        seviceRating = null,
        cleanlinessRating = null,
        locationRating = null,
        breakfastRating = null,
        createAt = null,
        customerID = null,
        bookingID = null,
        comment = null,
        highlighted = null // ✅ THÊM: Highlighted field
    } = {}) {
        this.feedbackID = feedbackID;
        this.overallRating = this.validateRating(overallRating, 'OverallRating');
        this.seviceRating = this.validateRating(seviceRating, 'ServiceRating');
        this.cleanlinessRating = this.validateRating(cleanlinessRating, 'CleanlinessRating');
        this.locationRating = this.validateRating(locationRating, 'LocationRating', false);
        this.breakfastRating = this.validateRating(breakfastRating, 'BreakfastRating', false);
        this.createAt = createAt || new Date();
        this.customerID = customerID;
        this.bookingID = bookingID;
        this.comment = comment;
        this.highlighted = highlighted !== null ? Boolean(highlighted) : false; // ✅ THÊM: Set highlighted với default false
    }

    // Validate rating giá trị từ 1-5
    validateRating(rating, fieldName, required = true) {
        if (rating === null || rating === undefined) {
            if (required) {
                throw new Error(`${fieldName} is required`);
            }
            return null;
        }

        const numRating = parseFloat(rating);
        
        if (isNaN(numRating)) {
            throw new Error(`${fieldName} must be a valid number`);
        }

        if (numRating < 1 || numRating > 5) {
            throw new Error(`${fieldName} must be between 1 and 5`);
        }

        return numRating;
    }

    // Validate toàn bộ object
    validate() {
        const errors = [];

        // Validate required ratings
        if (!this.overallRating) {
            errors.push('OverallRating is required and must be between 1-5');
        }

        if (!this.seviceRating) {
            errors.push('ServiceRating is required and must be between 1-5');
        }

        if (!this.cleanlinessRating) {
            errors.push('CleanlinessRating is required and must be between 1-5');
        }

        // Validate BookingID is required
        if (!this.bookingID) {
            errors.push('BookingID is required');
        }

        // ✅ THÊM: Validate highlighted if provided
        if (this.highlighted !== null && typeof this.highlighted !== 'boolean') {
            errors.push('Highlighted must be a boolean value');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        return true;
    }

    // Convert to database object
    toDbObject() {
        return {
            FeedbackID: this.feedbackID,
            OverallRating: this.overallRating,
            SeviceRating: this.seviceRating, // Giữ tên như trong DB (có typo)
            CleanlinessRating: this.cleanlinessRating,
            LocationRating: this.locationRating,
            BreakfastRating: this.breakfastRating,
            CreateAt: this.createAt,
            CustomerID: this.customerID,
            BookingID: this.bookingID,
            Comment: this.comment,
            Highlighted: this.highlighted // ✅ THÊM: Highlighted field
        };
    }

    // Create from database result
    static fromDbResult(row) {
        return new Feedback({
            feedbackID: row.FeedbackID,
            overallRating: row.OverallRating,
            seviceRating: row.SeviceRating,
            cleanlinessRating: row.CleanlinessRating,
            locationRating: row.LocationRating,
            breakfastRating: row.BreakfastRating,
            createAt: row.CreateAt,
            customerID: row.CustomerID,
            bookingID: row.BookingID,
            comment: row.Comment,
            highlighted: row.Highlighted // ✅ THÊM: Highlighted from DB
        });
    }

    // Calculate average rating
    getAverageRating() {
        const ratings = [this.overallRating, this.seviceRating, this.cleanlinessRating];
        
        if (this.locationRating) ratings.push(this.locationRating);
        if (this.breakfastRating) ratings.push(this.breakfastRating);

        const validRatings = ratings.filter(r => r !== null && r !== undefined);
        
        if (validRatings.length === 0) return 0;
        
        return (validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length).toFixed(1);
    }

    // ✅ THÊM: Method để toggle highlighted status
    toggleHighlighted() {
        this.highlighted = !this.highlighted;
        return this;
    }

    // ✅ THÊM: Method để set highlighted status
    setHighlighted(highlighted) {
        this.highlighted = Boolean(highlighted);
        return this;
    }

    // Convert to JSON for API response
    toJSON() {
        return {
            feedbackID: this.feedbackID,
            overallRating: this.overallRating,
            serviceRating: this.seviceRating,
            cleanlinessRating: this.cleanlinessRating,
            locationRating: this.locationRating,
            breakfastRating: this.breakfastRating,
            averageRating: parseFloat(this.getAverageRating()),
            createAt: this.createAt,
            customerID: this.customerID,
            bookingID: this.bookingID,
            comment: this.comment,
            highlighted: this.highlighted // ✅ THÊM: Highlighted in JSON response
        };
    }
}

export default Feedback;