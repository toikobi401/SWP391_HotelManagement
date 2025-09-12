import axios from '../config/axios';

// ✅ Revenue Report Service
export const revenueReportService = {
    // Get income report by period
    getIncomeReport: async (period = 'week', range = '', year = new Date().getFullYear()) => {
        try {
            console.log('📊 Fetching income report:', { period, range, year });
            
            const response = await axios.get('/api/revenue-report/income-report', {
                params: { period, range, year }
            });
            
            console.log('✅ Income report response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching income report:', error);
            throw error;
        }
    },

    // Get detailed revenue report
    getDetailedReport: async (startDate, endDate, groupBy = 'month') => {
        try {
            console.log('📊 Fetching detailed report:', { startDate, endDate, groupBy });
            
            const response = await axios.get('/api/revenue-report/report-detail', {
                params: { startDate, endDate, groupBy }
            });
            
            console.log('✅ Detailed report response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching detailed report:', error);
            throw error;
        }
    },

    // Get revenue statistics
    getRevenueStatistics: async (startDate, endDate) => {
        try {
            console.log('📊 Fetching revenue statistics:', { startDate, endDate });
            
            const response = await axios.get('/api/revenue-report/statistics', {
                params: { startDate, endDate }
            });
            
            console.log('✅ Revenue statistics response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching revenue statistics:', error);
            throw error;
        }
    },

    // Get top performing items
    getTopItems: async (startDate, endDate, limit = 10, itemType = 'all') => {
        try {
            console.log('📊 Fetching top items:', { startDate, endDate, limit, itemType });
            
            const response = await axios.get('/api/revenue-report/top-items', {
                params: { startDate, endDate, limit, itemType }
            });
            
            console.log('✅ Top items response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching top items:', error);
            throw error;
        }
    },

    // Get monthly comparison
    getMonthlyComparison: async (year = new Date().getFullYear(), compareWith = year - 1) => {
        try {
            console.log('📊 Fetching monthly comparison:', { year, compareWith });
            
            const response = await axios.get('/api/revenue-report/monthly-comparison', {
                params: { year, compareWith }
            });
            
            console.log('✅ Monthly comparison response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching monthly comparison:', error);
            throw error;
        }
    },

    // Helper function to get current week number
    getCurrentWeek: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.floor(diff / oneWeek) + 1;
    },

    // Helper function to get current month
    getCurrentMonth: () => {
        return new Date().getMonth() + 1;
    },

    // Helper function to get current quarter
    getCurrentQuarter: () => {
        const month = new Date().getMonth() + 1;
        return Math.ceil(month / 3);
    },

    // Helper function to format date for API
    formatDateForAPI: (date) => {
        if (!date) return null;
        return new Date(date).toISOString().split('T')[0];
    },

    // Helper function to get date range for period
    getDateRangeForPeriod: (period, range, year = new Date().getFullYear()) => {
        const currentYear = parseInt(year);
        let startDate, endDate;

        switch (period) {
            case 'week':
                if (range) {
                    const weekNumber = parseInt(range);
                    // Calculate start and end date for specific week
                    const firstDayOfYear = new Date(currentYear, 0, 1);
                    const daysToAdd = (weekNumber - 1) * 7;
                    startDate = new Date(firstDayOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
                    endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
                } else {
                    // Last 4 weeks
                    endDate = new Date();
                    startDate = new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000);
                }
                break;

            case 'month':
                if (range) {
                    const monthNumber = parseInt(range);
                    startDate = new Date(currentYear, monthNumber - 1, 1);
                    endDate = new Date(currentYear, monthNumber, 0); // Last day of month
                } else {
                    // Last 6 months
                    endDate = new Date();
                    startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1);
                }
                break;

            case 'quarter':
                if (range) {
                    const quarterNumber = parseInt(range);
                    const startMonth = (quarterNumber - 1) * 3;
                    startDate = new Date(currentYear, startMonth, 1);
                    endDate = new Date(currentYear, startMonth + 3, 0); // Last day of quarter
                } else {
                    // Last 4 quarters
                    endDate = new Date();
                    startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), 1);
                }
                break;

            default:
                // Default to current month
                startDate = new Date(currentYear, new Date().getMonth(), 1);
                endDate = new Date();
        }

        return {
            startDate: revenueReportService.formatDateForAPI(startDate),
            endDate: revenueReportService.formatDateForAPI(endDate)
        };
    },

    // Generate period options for dropdown
    generatePeriodOptions: (period, year = new Date().getFullYear()) => {
        const options = [];
        const currentYear = parseInt(year);

        switch (period) {
            case 'week':
                // Generate weeks for the year (simplified - just 52 weeks)
                for (let week = 1; week <= 52; week++) {
                    options.push({
                        value: week.toString(),
                        label: `Tuần ${week} - ${currentYear}`
                    });
                }
                break;

            case 'month':
                const months = [
                    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
                    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
                    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
                ];
                months.forEach((month, index) => {
                    options.push({
                        value: (index + 1).toString(),
                        label: `${month} ${currentYear}`
                    });
                });
                break;

            case 'quarter':
                const quarters = ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'];
                quarters.forEach((quarter, index) => {
                    options.push({
                        value: (index + 1).toString(),
                        label: `${quarter} ${currentYear}`
                    });
                });
                break;
        }

        return options;
    }
};

export default revenueReportService;
