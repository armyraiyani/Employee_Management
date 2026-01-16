import React from 'react';

const Modal = ({ isOpen, title, message, onClose, type = 'success', onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content animate-slide-up">
                <div className={`modal-header ${type}`}>
                    <h3>{title}</h3>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    {type === 'confirm' ? (
                        <>
                            <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
                            <button className="modal-btn confirm" onClick={onConfirm}>Confirm</button>
                        </>
                    ) : type === 'logout-confirm' ? (
                        <>
                            <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
                            <button className="modal-btn secondary" onClick={() => onConfirm(false)}>Just Logout</button>
                            <button className="modal-btn confirm" style={{ background: '#4f46e5' }} onClick={() => onConfirm(true)}>Save & Logout</button>
                        </>
                    ) : (
                        <button className="modal-btn success" onClick={onClose}>OK</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;
