import React, { useState, useEffect } from 'react';
import axios from './api/axios';
import './Leave.css';

const LeaveManagement = ({ isOpen, onClose, employee, onLeaveApproved }) => {
    const [leaveType, setLeaveType] = useState('Sick Leave');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [contactNumber, setContactNumber] = useState(employee?.phone_number || '');
    const [attachment, setAttachment] = useState(null);
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchLeaveHistory();
        }
    }, [isOpen]);

    const fetchLeaveHistory = async () => {
        try {
            const endpoint = localStorage.getItem('role') === 'ADMIN' ? '/leaves/all/' : '/leaves/';
            const response = await axios.get(endpoint);
            setLeaveHistory(response.data);
        } catch (error) {
            console.error("Error fetching leave history", error);
        }
    };

    const handleApproval = async (id, status) => {
        try {
            await axios.post(`/leaves/${id}/handle/`, { status });
            fetchLeaveHistory();
            // Notify parent component to refetch attendance data when leave is approved
            if (status === 'APPROVED' && onLeaveApproved) {
                onLeaveApproved();
            }
        } catch (error) {
            console.error("Error updating leave status", error);
        }
    };

    const getBaseDays = () => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const calculateDays = () => {
        const baseDays = getBaseDays();
        return (isHalfDay && baseDays === 1) ? 0.5 : baseDays;
    };

    const handleFileChange = (e) => {
        setAttachment(e.target.files[0]);
    };

    const today = new Date().toISOString().split('T')[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (phoneError) return;
        setMessage({ type: '', text: '' });

        if (startDate < today) {
            setMessage({ type: 'error', text: 'You cannot apply for leave on a past date.' });
            return;
        }

        const baseDays = getBaseDays();
        if (isHalfDay && baseDays > 1) {
            setMessage({ type: 'error', text: 'Half Day leave is only allowed for single-day requests.' });
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('leave_type', leaveType);
        formData.append('start_date', startDate);
        formData.append('end_date', endDate);
        formData.append('reason', reason);
        formData.append('is_half_day', isHalfDay);
        formData.append('contact_number', contactNumber);
        if (attachment) {
            formData.append('attachment', attachment);
        }

        try {
            await axios.post('/leaves/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage({ type: 'success', text: 'Leave request submitted successfully!' });
            setReason('');
            setStartDate('');
            setEndDate('');
            setAttachment(null);
            fetchLeaveHistory();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to submit leave request.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`leave-drawer-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
            <div className="leave-drawer-content" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                    <h2>Leave Management System</h2>
                    <button className="close-drawer-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="drawer-tabs">
                    <button className="tab-btn active">
                        {localStorage.getItem('role') === 'ADMIN' ? 'All Leave Requests' : 'Apply for Leave'}
                    </button>
                </div>

                <div className="drawer-body">
                    {message.text && (
                        <div className={`form-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {localStorage.getItem('role') !== 'ADMIN' && (
                        <form className="leave-form-premium" onSubmit={handleSubmit}>
                            {/* ... existing form groups ... */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Employee Name</label>
                                    <input type="text" value={employee?.user_username || ''} disabled readOnly />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Leave Type</label>
                                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} required>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Annual Leave">Annual / Paid Leave</option>
                                    <option value="Unpaid Leave">Unpaid Leave</option>
                                    <option value="Emergency Leave">Emergency Leave</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input type="date" className="date-picker-premium" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input type="date" className="date-picker-premium" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-info-row">
                                <span className={`days-badge ${isHalfDay && getBaseDays() > 1 ? 'invalid' : ''}`}>
                                    Total Days: {calculateDays()}
                                </span>
                                <label className={`checkbox-label ${isHalfDay && getBaseDays() > 1 ? 'invalid-half-day' : ''}`}>
                                    <input type="checkbox" checked={isHalfDay} onChange={(e) => setIsHalfDay(e.target.checked)} />
                                    Half Day
                                </label>
                            </div>

                            <div className="form-group">
                                <label>Reason for Leave</label>
                                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="3" required placeholder="Explain your reason..."></textarea>
                            </div>

                            <div className="form-group">
                                <label>Contact Details during Leave</label>
                                <input
                                    type="text"
                                    value={contactNumber}
                                    style={{ borderColor: phoneError ? '#ef4444' : '' }}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/[^0-9]/.test(val)) setPhoneError('Invalid characters');
                                        else if (val.length > 10) setPhoneError('Max 10 digits');
                                        else setPhoneError('');
                                        setContactNumber(val);
                                    }}
                                    placeholder="Phone number"
                                />
                                {phoneError && <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>{phoneError}</small>}
                            </div>

                            <div className="form-group">
                                <label>Attachment (Optional)</label>
                                <input type="file" onChange={handleFileChange} className="file-input-premium" />
                            </div>

                            <button type="submit" className="submit-leave-btn" disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </form>
                    )}

                    <div className="leave-history-section">
                        <h3>Leave History</h3>
                        <div className="history-list">
                            {leaveHistory.length === 0 ? (
                                <p className="no-history">No leave requests found.</p>
                            ) : (
                                leaveHistory.map((leave) => (
                                    <div key={leave.id} className="history-card">
                                        <div className="history-card-header">
                                            <div className="leave-info-meta">
                                                <span className="leave-type-tag">{leave.leave_type}</span>
                                                {localStorage.getItem('role') === 'ADMIN' && (
                                                    <span className="emp-tag"> - {leave.employee_name}</span>
                                                )}
                                            </div>
                                            <span className={`status-badge ${leave.status.toLowerCase()}`}>{leave.status}</span>
                                        </div>
                                        <div className="history-card-body">
                                            <p><strong>Duration:</strong> {leave.start_date} to {leave.end_date}</p>
                                            <p className="reason-text"><strong>Reason:</strong> {leave.reason}</p>
                                        </div>
                                        {localStorage.getItem('role') === 'ADMIN' && leave.status === 'PENDING' && (
                                            <div className="approval-actions">
                                                <button className="approve-btn" onClick={() => handleApproval(leave.id, 'APPROVED')}>Accept</button>
                                                <button className="reject-btn" onClick={() => handleApproval(leave.id, 'REJECTED')}>Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveManagement;
