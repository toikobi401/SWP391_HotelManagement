import React from 'react';
import './InvoiceStatusBadge.module.css';

const InvoiceStatusBadge = ({ status, size = 'normal', showIcon = true }) => {
    // ✅ Status configuration
    const statusConfig = {
        'Pending': {
            label: 'Chưa thanh toán',
            icon: 'fas fa-clock',
            className: 'status-pending',
            color: '#ffc107'
        },
        'Partial': {
            label: 'Thanh toán một phần',
            icon: 'fas fa-adjust',
            className: 'status-partial',
            color: '#fd7e14'
        },
        'Paid': {
            label: 'Đã thanh toán',
            icon: 'fas fa-check-circle',
            className: 'status-paid',
            color: '#28a745'
        },
        'Refunded': {
            label: 'Đã hoàn tiền',
            icon: 'fas fa-undo',
            className: 'status-refunded',
            color: '#6f42c1'
        },
        'Cancelled': {
            label: 'Đã hủy',
            icon: 'fas fa-times-circle',
            className: 'status-cancelled',
            color: '#dc3545'
        },
        'Overdue': {
            label: 'Quá hạn',
            icon: 'fas fa-exclamation-triangle',
            className: 'status-overdue',
            color: '#e83e8c'
        }
    };

    // ✅ Get status config
    const config = statusConfig[status] || {
        label: status || 'Không xác định',
        icon: 'fas fa-question',
        className: 'status-unknown',
        color: '#6c757d'
    };

    return (
        <span 
            className={`invoice-status-badge ${config.className} size-${size}`}
            style={{ 
                backgroundColor: config.color,
                borderColor: config.color 
            }}
        >
            {showIcon && (
                <i className={config.icon}></i>
            )}
            <span className="status-text">{config.label}</span>
        </span>
    );
};

export default InvoiceStatusBadge;