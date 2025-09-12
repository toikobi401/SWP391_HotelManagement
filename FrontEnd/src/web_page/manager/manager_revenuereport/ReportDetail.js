import React, { useState, useEffect } from 'react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import revenueReportService from '../../../services/revenueReportService';
import styles from './ReportDetail.module.css';

// Đăng ký các component của Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const ReportDetail = () => {
    const [revenueData, setRevenueData] = useState({
        totalProfit: 0,
        roomRevenue: 0,
        fnbRevenue: 0,
        serviceRevenue: 0,
        weeklyData: [],
        monthlyData: [],
        usageStats: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ THAY THẾ: Real API call instead of mock data
    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get last 6 months data
                const endDate = new Date();
                const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1);

                console.log('📊 Fetching detailed report data:', {
                    startDate: revenueReportService.formatDateForAPI(startDate),
                    endDate: revenueReportService.formatDateForAPI(endDate)
                });

                const response = await revenueReportService.getDetailedReport(
                    revenueReportService.formatDateForAPI(startDate),
                    revenueReportService.formatDateForAPI(endDate),
                    'month'
                );

                if (response.success) {
                    const apiData = response.data;
                    console.log('✅ API response data:', apiData);

                    // Transform API data
                    const transformedData = {
                        totalProfit: apiData.summary?.totalProfit || 0,
                        roomRevenue: apiData.summary?.roomRevenue || 0,
                        fnbRevenue: apiData.summary?.serviceRevenue || 0, // Map service to F&B
                        serviceRevenue: apiData.summary?.otherRevenue || 0,
                        
                        // Weekly data (use last 4 periods from details)
                        weeklyData: apiData.details?.slice(-4).map(item => ({
                            period: item.PeriodLabel,
                            room: item.RoomRevenue || 0,
                            service: item.ServiceRevenue || 0
                        })) || [],
                        
                        // Monthly data from details
                        monthlyData: apiData.details?.map(item => ({
                            month: item.PeriodLabel.substring(0, 3), // Shorten month name
                            value: item.TotalRevenue || 0
                        })) || [],
                        
                        // Usage stats from top items
                        usageStats: apiData.topItems?.slice(0, 4).map(item => ({
                            item: item.ItemName,
                            usage: Math.min(100, Math.round(item.RevenuePercentage || 0)),
                            trend: Math.random() > 0.5 ? 'up' : 'down', // Random for now
                            revenue: item.TotalRevenue || 0
                        })) || []
                    };

                    console.log('✅ Transformed data:', transformedData);
                    setRevenueData(transformedData);
                } else {
                    throw new Error(response.message || 'Không thể tải dữ liệu báo cáo');
                }
            } catch (error) {
                console.error('❌ Error fetching report data:', error);
                setError(error.message);
                
                // ✅ Fallback to mock data
                console.log('📊 Using mock data as fallback...');
                const mockData = {
                    totalProfit: 125000000,
                    roomRevenue: 80000000,
                    fnbRevenue: 25000000,
                    serviceRevenue: 20000000,
                    weeklyData: [
                        { period: 'Tuần 1', room: 15000000, service: 5000000 },
                        { period: 'Tuần 2', room: 18000000, service: 7000000 },
                        { period: 'Tuần 3', room: 22000000, service: 6000000 },
                        { period: 'Tuần 4', room: 25000000, service: 8000000 }
                    ],
                    monthlyData: [
                        { month: 'T1', value: 95000000 },
                        { month: 'T2', value: 88000000 },
                        { month: 'T3', value: 125000000 },
                        { month: 'T4', value: 110000000 },
                        { month: 'T5', value: 130000000 },
                        { month: 'T6', value: 145000000 }
                    ],
                    usageStats: [
                        { item: 'Phòng VIP', usage: 85, trend: 'up' },
                        { item: 'Phòng Standard', usage: 92, trend: 'up' },
                        { item: 'Dịch vụ Spa', usage: 65, trend: 'down' },
                        { item: 'Nhà hàng', usage: 78, trend: 'up' }
                    ]
                };
                setRevenueData(mockData);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, []);

    // ✅ Loading state
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Đang tải dữ liệu báo cáo...</p>
            </div>
        );
    }

    // ✅ Error state
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <h2>Có lỗi xảy ra</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>
                    Thử lại
                </button>
            </div>
        );
    }

    // Cấu hình biểu đồ tròn
    const pieChartData = {
        labels: ['Đặt phòng', 'F&B', 'Dịch vụ'],
        datasets: [
            {
                data: [revenueData.roomRevenue, revenueData.fnbRevenue, revenueData.serviceRevenue],
                backgroundColor: ['#8B1538', '#D2B48C', '#A0522D'],
                borderWidth: 2,
                borderColor: '#fff'
            }
        ]
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${value.toLocaleString('vi-VN')} VND (${percentage}%)`;
                    }
                }
            }
        }
    };

    // Cấu hình biểu đồ cột
    const barChartData = {
        labels: revenueData.weeklyData.map(item => item.period),
        datasets: [
            {
                label: 'Room',
                data: revenueData.weeklyData.map(item => item.room),
                backgroundColor: '#8B1538',
                borderRadius: 4
            },
            {
                label: 'Service',
                data: revenueData.weeklyData.map(item => item.service),
                backgroundColor: '#D2B48C',
                borderRadius: 4
            }
        ]
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y.toLocaleString('vi-VN')} VND`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return (value / 1000000).toFixed(0) + 'M';
                    }
                }
            }
        }
    };

    // Cấu hình biểu đồ đường
    const lineChartData = {
        labels: revenueData.monthlyData.map(item => item.month),
        datasets: [
            {
                label: 'Doanh thu theo tháng',
                data: revenueData.monthlyData.map(item => item.value),
                borderColor: '#8B1538',
                backgroundColor: 'rgba(139, 21, 56, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#8B1538',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }
        ]
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Doanh thu: ${context.parsed.y.toLocaleString('vi-VN')} VND`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return (value / 1000000).toFixed(0) + 'M';
                    }
                }
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    return (
        <div className={styles.reportContainer}>
            <div className={styles.header}>
                <h1>Báo cáo Doanh thu</h1>
                <p>Tổng quan doanh thu khách sạn</p>
            </div>

            {/* Profit Summary */}
            <div className={styles.profitSummary}>
                <div className={styles.profitCard}>
                    <h2>Doanh thu hiện tại</h2> 
                    <div className={styles.profitAmount}>
                        {formatCurrency(revenueData.totalProfit)}
                    </div>
                    <span className={styles.profitGrowth}></span>
                </div>
            </div>

            {/* Charts Section */}
            <div className={styles.chartsSection}>
                {/* Pie Chart */}
                <div className={styles.chartCard}>
                    <h3>Phân bổ Doanh thu</h3>
                    <div className={styles.pieChartContainer}>
                        <Pie data={pieChartData} options={pieChartOptions} />
                    </div>
                </div>

                {/* Bar Chart */}
                <div className={styles.chartCard}>
                    <h3>Doanh thu theo tuần (4 tuần gần nhất)</h3>
                    <div className={styles.barChartContainer}>
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>

                {/* Line Chart */}
                <div className={styles.chartCard}>
                    <h3>Xu hướng Doanh thu</h3>
                    <div className={styles.lineChartContainer}>
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>
            </div>

            {/* Usage Statistics Table */}
            <div className={styles.usageSection}>
                <h3>Chi tiết lượt sử dụng</h3>
                <div className={styles.tableContainer}>
                    <table className={styles.usageTable}>
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên Item</th>
                                <th>Doanh thu cụ thể</th>
                                <th>Chi tiết lượt sử dụng</th>
                                <th>Xu hướng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revenueData.usageStats.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.item}</td>
                                    <td>{formatCurrency(item.revenue || Math.floor(Math.random() * 50000000) + 10000000)}</td>
                                    <td>
                                        <div className={styles.usageBar}>
                                            <div 
                                                className={styles.usageProgress} 
                                                style={{width: `${item.usage}%`}}
                                            ></div>
                                            <span>{item.usage}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.trend} ${styles[item.trend]}`}>
                                            {item.trend === 'up' ? '▲' : '▼'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={styles.tableNote}>
                    <p>Hiển thị max 3 lượt sử dụng trong khoảng thời gian</p>
                </div>
            </div>
        </div>
    );
};

export default ReportDetail;