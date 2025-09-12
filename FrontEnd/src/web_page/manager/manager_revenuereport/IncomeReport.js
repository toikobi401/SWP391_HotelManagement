import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
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
import styles from './IncomeReport.module.css';

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

const IncomeReport = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('week');
    const [selectedRange, setSelectedRange] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ✅ THAY THẾ: Real API call instead of mock data
    const handleGenerateReport = async () => {
        if (!selectedRange) {
            alert('Vui lòng chọn khoảng thời gian');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            console.log('📊 Generating report with params:', {
                period: selectedPeriod,
                range: selectedRange,
                year: selectedYear
            });

            const response = await revenueReportService.getIncomeReport(
                selectedPeriod, 
                selectedRange, 
                selectedYear
            );

            if (response.success) {
                const apiData = response.data;
                
                // ✅ Transform API data to match chart format
                const transformedData = {
                    labels: apiData.labels || [],
                    roomData: apiData.roomData || [],
                    fnbData: apiData.serviceData || [], // Map service to F&B for now
                    serviceData: apiData.otherData || [],
                    total: apiData.totals?.grandTotal || 0,
                    roomTotal: apiData.totals?.roomTotal || 0,
                    fnbTotal: apiData.totals?.serviceTotal || 0,
                    serviceTotal: apiData.totals?.otherTotal || 0,
                    period: selectedPeriod,
                    range: selectedRange,
                    year: selectedYear,
                    details: apiData.details || [],
                    invoiceCount: apiData.totals?.totalInvoices || 0,
                    bookingCount: apiData.totals?.totalBookings || 0
                };

                console.log('✅ Transformed report data:', transformedData);
                setReportData(transformedData);
            } else {
                throw new Error(response.message || 'Không thể tạo báo cáo');
            }
        } catch (error) {
            console.error('❌ Error generating report:', error);
            setError(error.message || 'Có lỗi xảy ra khi tạo báo cáo');
            
            // ✅ Fallback to mock data if API fails
            console.log('📊 Falling back to mock data...');
            const mockData = generateMockData(selectedPeriod, selectedRange);
            setReportData(mockData);
        } finally {
            setLoading(false);
        }
    };

    // ✅ KEEP: Mock data generator as fallback
    const generateMockData = (period, range) => {
        const baseData = {
            week: {
                labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'],
                roomData: [12000000, 15000000, 13000000, 18000000, 22000000, 25000000, 20000000],
                fnbData: [3000000, 4000000, 3500000, 5000000, 6000000, 7000000, 5500000],
                serviceData: [2000000, 2500000, 2200000, 3000000, 3500000, 4000000, 3200000]
            },
            month: {
                labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
                roomData: [65000000, 72000000, 68000000, 85000000],
                fnbData: [18000000, 22000000, 20000000, 25000000],
                serviceData: [12000000, 15000000, 13000000, 18000000]
            },
            quarter: {
                labels: ['Tháng 1', 'Tháng 2', 'Tháng 3'],
                roomData: [250000000, 280000000, 320000000],
                fnbData: [75000000, 85000000, 95000000],
                serviceData: [45000000, 52000000, 58000000]
            }
        };

        const data = baseData[period];
        const total = data.roomData.reduce((a, b) => a + b, 0) + 
                     data.fnbData.reduce((a, b) => a + b, 0) + 
                     data.serviceData.reduce((a, b) => a + b, 0);

        return {
            ...data,
            total,
            roomTotal: data.roomData.reduce((a, b) => a + b, 0),
            fnbTotal: data.fnbData.reduce((a, b) => a + b, 0),
            serviceTotal: data.serviceData.reduce((a, b) => a + b, 0),
            period,
            range,
            year: selectedYear
        };
    };

    // ✅ CẬP NHẬT: Use service helper function
    const getPeriodOptions = () => {
        return revenueReportService.generatePeriodOptions(selectedPeriod, selectedYear);
    };

    // Chart configurations
    const barChartData = reportData ? {
        labels: reportData.labels,
        datasets: [
            {
                label: 'Đặt phòng',
                data: reportData.roomData,
                backgroundColor: '#8B1538',
                borderRadius: 4
            },
            {
                label: 'F&B',
                data: reportData.fnbData,
                backgroundColor: '#D2B48C',
                borderRadius: 4
            },
            {
                label: 'Dịch vụ',
                data: reportData.serviceData,
                backgroundColor: '#A0522D',
                borderRadius: 4
            }
        ]
    } : null;

    const lineChartData = reportData ? {
        labels: reportData.labels,
        datasets: [
            {
                label: 'Tổng doanh thu',
                data: reportData.labels.map((_, index) => 
                    reportData.roomData[index] + reportData.fnbData[index] + reportData.serviceData[index]
                ),
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
    } : null;

    const doughnutChartData = reportData ? {
        labels: ['Đặt phòng', 'F&B', 'Dịch vụ'],
        datasets: [
            {
                data: [reportData.roomTotal, reportData.fnbTotal, reportData.serviceTotal],
                backgroundColor: ['#8B1538', '#D2B48C', '#A0522D'],
                borderWidth: 3,
                borderColor: '#fff'
            }
        ]
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y?.toLocaleString('vi-VN') || context.parsed?.toLocaleString('vi-VN')} VND`;
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
        <div className={styles.incomeReportContainer}>
            <div className={styles.header}>
                <h1>Báo cáo Doanh thu Chi tiết</h1>
                <p>Phân tích doanh thu theo thời gian</p>
            </div>

            {/* Time Selection */}
            <div className={styles.timeSelection}>
                <div className={styles.selectionCard}>
                    <h3>Chọn khoảng thời gian báo cáo</h3>
                    
                    <div className={styles.periodButtons}>
                        <button 
                            className={`${styles.periodBtn} ${selectedPeriod === 'week' ? styles.active : ''}`}
                            onClick={() => {
                                setSelectedPeriod('week');
                                setSelectedRange('');
                                setReportData(null);
                            }}
                        >
                            Tuần
                        </button>
                        <button 
                            className={`${styles.periodBtn} ${selectedPeriod === 'month' ? styles.active : ''}`}
                            onClick={() => {
                                setSelectedPeriod('month');
                                setSelectedRange('');
                                setReportData(null);
                            }}
                        >
                            Tháng
                        </button>
                        <button 
                            className={`${styles.periodBtn} ${selectedPeriod === 'quarter' ? styles.active : ''}`}
                            onClick={() => {
                                setSelectedPeriod('quarter');
                                setSelectedRange('');
                                setReportData(null);
                            }}
                        >
                            Quý
                        </button>
                    </div>

                    <div className={styles.yearSelection}>
                        <label htmlFor="yearSelect">Năm:</label>
                        <select 
                            id="yearSelect"
                            value={selectedYear} 
                            onChange={(e) => {
                                setSelectedYear(parseInt(e.target.value));
                                setSelectedRange('');
                                setReportData(null);
                            }}
                            className={styles.yearSelect}
                        >
                            {Array.from({length: 5}, (_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className={styles.rangeSelection}>
                        <label htmlFor="timeRange">Chọn {selectedPeriod === 'week' ? 'tuần' : selectedPeriod === 'month' ? 'tháng' : 'quý'}:</label>
                        <select 
                            id="timeRange"
                            value={selectedRange} 
                            onChange={(e) => setSelectedRange(e.target.value)}
                            className={styles.rangeSelect}
                        >
                            <option value="">-- Chọn khoảng thời gian --</option>
                            {getPeriodOptions().map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className={styles.errorMessage}>
                            <p>{error}</p>
                        </div>
                    )}

                    <button 
                        className={styles.generateBtn}
                        onClick={handleGenerateReport}
                        disabled={loading || !selectedRange}
                    >
                        {loading ? 'Đang tạo báo cáo...' : 'Tạo báo cáo'}
                    </button>
                </div>
            </div>

            {/* Report Results */}
            {reportData && (
                <div className={styles.reportResults}>
                    {/* Summary Cards */}
                    <div className={styles.summaryCards}>
                        <div className={styles.summaryCard}>
                            <h4>Tổng doanh thu</h4>
                            <div className={styles.amount}>{formatCurrency(reportData.total)}</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <h4>Đặt phòng</h4>
                            <div className={styles.amount}>{formatCurrency(reportData.roomTotal)}</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <h4>F&B</h4>
                            <div className={styles.amount}>{formatCurrency(reportData.fnbTotal)}</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <h4>Dịch vụ</h4>
                            <div className={styles.amount}>{formatCurrency(reportData.serviceTotal)}</div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className={styles.chartsGrid}>
                        <div className={styles.chartCard}>
                            <h3>Phân bổ doanh thu</h3>
                            <div className={styles.chartContainer}>
                                <Doughnut data={doughnutChartData} options={{
                                    ...chartOptions,
                                    scales: undefined
                                }} />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <h3>Doanh thu chi tiết theo {selectedPeriod === 'week' ? 'ngày' : selectedPeriod === 'month' ? 'tuần' : 'tháng'}</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={barChartData} options={chartOptions} />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <h3>Xu hướng tổng doanh thu</h3>
                            <div className={styles.chartContainer}>
                                <Line data={lineChartData} options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        legend: {
                                            display: false
                                        }
                                    }
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className={styles.detailTable}>
                        <h3>Bảng chi tiết doanh thu</h3>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Đặt phòng</th>
                                        <th>F&B</th>
                                        <th>Dịch vụ</th>
                                        <th>Tổng cộng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.labels.map((label, index) => (
                                        <tr key={index}>
                                            <td>{label}</td>
                                            <td>{formatCurrency(reportData.roomData[index])}</td>
                                            <td>{formatCurrency(reportData.fnbData[index])}</td>
                                            <td>{formatCurrency(reportData.serviceData[index])}</td>
                                            <td className={styles.totalCell}>
                                                {formatCurrency(
                                                    reportData.roomData[index] + 
                                                    reportData.fnbData[index] + 
                                                    reportData.serviceData[index]
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className={styles.totalRow}>
                                        <td><strong>Tổng cộng</strong></td>
                                        <td><strong>{formatCurrency(reportData.roomTotal)}</strong></td>
                                        <td><strong>{formatCurrency(reportData.fnbTotal)}</strong></td>
                                        <td><strong>{formatCurrency(reportData.serviceTotal)}</strong></td>
                                        <td><strong>{formatCurrency(reportData.total)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncomeReport;