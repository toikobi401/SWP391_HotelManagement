import React from 'react';
import styles from './SubmittionPage.module.css';
import CheckInOutTable from './CheckInOutTable';

const SubmittionPage = () => {
  return (
    <div className={styles.container}>
      <div className="mb-4">
        <h2 className={styles.title}>
          <i className="fas fa-clipboard-check me-2"></i>
          Quản lý trạng thái booking
        </h2>
        <p className="text-muted">
          Quản lý và cập nhật trạng thái các booking: Pending → Confirmed → CheckedIn → CheckedOut / Cancelled
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.subtitle}>
          <i className="fas fa-list me-2"></i>
          Danh sách booking
        </h3>
        <CheckInOutTable />
      </div>
    </div>
  );
};

export default SubmittionPage;