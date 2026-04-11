import React from 'react';
import '../styles/Modal.css';

const Modal = ({ isOpen, onClose, title, message, onConfirm, confirmText = "OK" }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          {onConfirm ? (
            <>
              <button className="cancel-btn" onClick={onClose}>Cancel</button>
              <button className="confirm-btn" onClick={() => {
                onConfirm();
                onClose();
              }}>{confirmText}</button>
            </>
          ) : (
            <button className="action-btn" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
