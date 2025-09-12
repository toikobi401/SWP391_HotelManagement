import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './SimpleModal.css';

const SimpleModal = ({ isOpen, onClose, children, title }) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="simple-modal-overlay" onClick={onClose}>
            <div className="simple-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="simple-modal-header">
                    <h3 className="simple-modal-title">{title}</h3>
                    <button 
                        type="button" 
                        className="simple-modal-close" 
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="simple-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );

    // Use portal to render modal at body level
    return ReactDOM.createPortal(modalContent, document.body);
};

export default SimpleModal;
