import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from './api/axios';
import Modal from './Modal';
import LeaveManagement from './LeaveManagement';

function Navbar() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: null
    });
    const [isLeaveDrawerOpen, setIsLeaveDrawerOpen] = useState(false);
    const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
    const [isEmployeeNotifDrawerOpen, setIsEmployeeNotifDrawerOpen] = useState(false);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const formatNotifTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    useEffect(() => {
        if (token) {
            fetchUserProfile();
        }

        if (token && role === 'ADMIN') {
            fetchPendingLeaves();
        } else if (token && role === 'EMPLOYEE') {
            fetchEmployeeNotifications();
        }


        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [token]);

    useEffect(() => {
        if (role === 'ADMIN') {
            setUnreadCount(pendingLeaves.filter(n => !n.is_seen_by_admin).length);
        } else {
            setUnreadCount(pendingLeaves.filter(n => !n.is_seen_by_employee).length);
        }
    }, [pendingLeaves, role]);

    const fetchUserProfile = async () => {

        try {
            const res = await api.get('profile/me/');
            setUser(res.data);
        } catch (err) {
            console.error("Failed to fetch user profile", err);
        }
    };

    const fetchPendingLeaves = async () => {
        try {
            const [leaveRes, profileRes] = await Promise.all([
                api.get('/leaves/all/'),
                api.get('/profile/requests/')
            ]);

            const leaves = leaveRes.data.filter(l => l.status === 'PENDING').map(l => ({ ...l, type: 'LEAVE' }));
            const profiles = profileRes.data.filter(p => p.status === 'PENDING').map(p => ({ ...p, type: 'PROFILE' }));

            if (role === 'ADMIN') {
                const res = await api.get('/admin/notifications/');
                setPendingLeaves(res.data);
            } else {
                fetchEmployeeNotifications();
            }
        } catch (err) {
            console.error("Failed to fetch pending leaves", err);
        }
    };

    const fetchEmployeeNotifications = async () => {
        try {
            const res = await api.get('/notifications/');
            setPendingLeaves(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const fetchAllNotificationHistory = async () => {
        try {
            const res = await api.get('/notifications/history/');

            setNotificationHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch notification history", err);
        }
    };

    const handleLogoutClick = () => {
        setModalState({
            isOpen: true,
            title: 'Confirm Logout',
            message: 'Would you like to save your account details for a faster login next time?',
            type: 'logout-confirm',
            onConfirm: (saveDetails) => performLogout(saveDetails)
        });
        setShowDropdown(false);
    };

    const performLogout = (saveDetails) => {
        // Clear view timestamp - REMOVED to persist notification count across logins
        // if (user?.id) {
        //     localStorage.removeItem(`last_notif_view_${user.id}`);
        // }

        if (saveDetails) {
            const username = localStorage.getItem('last_username');
            const password = localStorage.getItem('last_password');

            if (username && password) {
                // Fetch existing accounts
                const savedAccounts = JSON.parse(localStorage.getItem('saved_accounts') || '[]');

                // Add or update the current account
                const accountData = {
                    username,
                    password,
                    firstName: user?.first_name || '',
                    lastName: user?.last_name || '',
                    email: user?.email || '',
                    role: role || 'EMPLOYEE',
                    lastUsed: new Date().toISOString()
                };

                const existingIndex = savedAccounts.findIndex(acc => acc.username === username);
                if (existingIndex > -1) {
                    savedAccounts[existingIndex] = accountData;
                } else {
                    savedAccounts.push(accountData);
                }

                localStorage.setItem('saved_accounts', JSON.stringify(savedAccounts));
                localStorage.setItem('remember_me_on_login', 'true');
            }
        }

        // Always clear session data
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('last_username');
        localStorage.removeItem('last_password');

        navigate('/');
        setModalState({ ...modalState, isOpen: false });
    };

    const handleAction = async (id, status, type) => {
        try {
            if (type === 'LEAVE') {
                await api.post(`/leaves/${id}/handle/`, { status });
            } else if (type === 'PROFILE') {
                await api.post(`/profile/requests/${id}/handle/`, { action: status === 'APPROVED' ? 'APPROVE' : 'REJECT' });
            }
            fetchPendingLeaves();
        } catch (err) {
            console.error(`Error handling ${type} request`, err);
        }
    };

    const handleAdminDismiss = async (id, type) => {
        try {
            await api.post('/admin/notifications/dismiss/', { id, type });
            fetchPendingLeaves();
        } catch (err) {
            console.error("Error dismissing notification", err);
        }
    };

    const markAsSeen = async (id, type) => {
        try {
            await api.post('/notifications/mark-seen/', { id, type });
            fetchEmployeeNotifications();
        } catch (err) {
            console.error("Error marking as seen", err);
        }
    };

    const handleEmployeeDismiss = async (id, type) => {
        try {
            await api.post('/notifications/dismiss/', { id, type });
            // Refresh counts/list
            if (showNotifications) fetchEmployeeNotifications();
            if (isEmployeeNotifDrawerOpen) fetchAllNotificationHistory();
        } catch (err) {
            console.error("Error dismissing notification", err);
        }
    };

    const closeModal = () => setModalState({ ...modalState, isOpen: false });

    const getInitials = () => {
        if (role === 'ADMIN') return 'A';
        if (!user) return 'U';
        return (user.first_name || user.username || 'U')[0].toUpperCase();
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>EMS</Link>
            </div>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                <div className="navbar-links">
                    <NavLink to="/" className="nav-link" end>Home</NavLink>
                    {token && role === 'ADMIN' && <NavLink to="/admin" className="nav-link">Employee List</NavLink>}
                    {token && <NavLink to="/attendance" className="nav-link">Attendance</NavLink>}
                    {token && role === 'EMPLOYEE' && <NavLink to="/employee/payroll" className="nav-link">My Salary</NavLink>}
                    {token && role === 'EMPLOYEE' && <NavLink to="/employee" className="nav-link" end>Profile</NavLink>}
                </div>

                {token && (
                    <div className="notification-container" ref={notificationRef}>
                        <div
                            className="nav-notification-bell"
                            onClick={() => {
                                // Mark all seen locally via timestamp
                                if (user?.id) {
                                    localStorage.setItem(`last_notif_view_${user.id}`, new Date().toISOString());
                                }
                                setUnreadCount(0);

                                // For employees, also sync with backend marks as seen
                                if (role === 'EMPLOYEE' && unreadCount > 0) {
                                    api.post('/notifications/mark-all-seen/').catch(err => console.error(err));
                                } else if (role === 'ADMIN' && unreadCount > 0) {
                                    api.post('/admin/notifications/mark-all-seen/').catch(err => console.error(err));
                                }

                                if (role === 'ADMIN') {
                                    setIsAdminDrawerOpen(true);
                                } else {
                                    setShowNotifications(!showNotifications);
                                }
                            }}
                        >
                            🔔 {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
                        </div>

                        {showNotifications && role === 'EMPLOYEE' && (
                            <div className="notification-dropdown animate-fade-in">
                                <div className="notif-header">
                                    <h4>{role === 'ADMIN' ? 'Leave Requests' : 'Notifications'}</h4>
                                </div>
                                <div className="notif-body">
                                    {pendingLeaves.length === 0 ? (
                                        <p className="no-notif">No new notifications</p>
                                    ) : (
                                        pendingLeaves.map(item => (
                                            <div key={`${item.type}-${item.id}`} className="notif-item">
                                                <div className="notif-info">
                                                    {role === 'ADMIN' ? (
                                                        <>
                                                            <strong>{item.employee_name}</strong>
                                                            {item.type === 'LEAVE' ? (
                                                                <span>Applied for {item.leave_type}</span>
                                                            ) : (
                                                                <span>Requested profile update ({item.new_phone_number || item.new_address})</span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {item.type === 'PAYROLL' ? (
                                                                <div>
                                                                    <span>💰 <strong>Salary Payment Processed</strong></span>
                                                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>View details for amount and notes.</div>
                                                                </div>
                                                            ) : item.status === 'APPROVED' ? (
                                                                <span>Your request is <strong>accepted</strong>.</span>
                                                            ) : (
                                                                <span>Your request is <strong>rejected</strong>.</span>
                                                            )}
                                                        </>
                                                    )}
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                                                        {formatNotifTime(item.created_at)}
                                                    </div>
                                                </div>
                                                <div className="notif-actions">
                                                    {role === 'ADMIN' ? (
                                                        <>
                                                            <button className="confirm-mini-btn" onClick={() => handleAction(item.id, 'APPROVED', item.type)}>✓</button>
                                                            <button className="cancel-mini-btn" onClick={() => handleAction(item.id, 'REJECTED', item.type)}>✕</button>
                                                        </>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button className="confirm-mini-btn" onClick={() => markAsSeen(item.id, item.type)}>✓</button>
                                                            <button className="cancel-mini-btn" onClick={() => handleEmployeeDismiss(item.id, item.type)}>×</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="notif-footer">
                                    <button
                                        onClick={() => {
                                            if (role === 'ADMIN') {
                                                setIsAdminDrawerOpen(true);
                                            } else {
                                                fetchAllNotificationHistory();
                                                setIsEmployeeNotifDrawerOpen(true);
                                            }
                                            setShowNotifications(false);
                                        }}
                                        className="view-all-notif"
                                    >
                                        {role === 'ADMIN' ? 'View All in Drawer' : 'More Details'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {token ? (
                    <div className="navbar-profile-container" ref={dropdownRef}>
                        <div
                            className={`navbar-avatar-btn ${role === 'EMPLOYEE' ? 'dots-mode' : ''}`}
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            {role === 'EMPLOYEE' ? '⋮' : getInitials()}
                        </div>

                        {showDropdown && (
                            <div className={`navbar-dropdown-menu animate-fade-in ${role === 'EMPLOYEE' ? 'mini-dropdown' : ''}`}>
                                {role === 'ADMIN' ? (
                                    <div className="dropdown-footer">
                                        <button onClick={handleLogoutClick} className="dropdown-logout-btn">
                                            ⏻ Logout
                                        </button>
                                    </div>
                                ) : user ? (
                                    <>
                                        <div className="dropdown-footer">
                                            <button onClick={handleLogoutClick} className="dropdown-logout-btn">
                                                ⏻ Logout
                                            </button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                ) : (
                    <Link to="/login" className="nav-button">Login</Link>
                )}
            </div>

            <LeaveManagement
                isOpen={isLeaveDrawerOpen}
                onClose={() => setIsLeaveDrawerOpen(false)}
                employee={user}
            />

            {/* Admin Notification Drawer */}
            <div className={`leave-drawer-overlay ${isAdminDrawerOpen ? 'active' : ''}`} onClick={() => setIsAdminDrawerOpen(false)}>
                <div className="leave-drawer-content" onClick={(e) => e.stopPropagation()}>
                    <div className="drawer-header">
                        <h2>Pending Actions</h2>
                        <button className="close-drawer-btn" onClick={() => setIsAdminDrawerOpen(false)}>×</button>
                    </div>

                    <div className="drawer-body">
                        {pendingLeaves.length === 0 ? (
                            <div className="no-history">
                                <p>No pending requests at the moment.</p>
                            </div>
                        ) : (
                            <div className="history-list">
                                {pendingLeaves.map(item => (
                                    <div key={`${item.type}-${item.id}`} className="history-card">
                                        <div className="history-card-header">
                                            <div className="leave-info-meta">
                                                <span className="emp-tag">{item.employee_name}</span>
                                                <span className="leave-type-tag">
                                                    {item.type === 'LEAVE' ? item.leave_type : 'Profile Update'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>• {formatNotifTime(item.created_at)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span className={`status-badge ${item.status.toLowerCase()}`}>
                                                    {item.status}
                                                </span>
                                                <button
                                                    className="close-drawer-btn"
                                                    style={{ fontSize: '18px', padding: '0 5px', color: '#94a3b8' }}
                                                    onClick={() => handleAdminDismiss(item.id, item.type)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                        <div className="history-card-body">
                                            {item.type === 'LEAVE' ? (
                                                <>
                                                    <p><strong>Dates:</strong> {item.start_date} to {item.end_date} {item.is_half_day && '(Half Day)'}</p>
                                                    <p className="reason-text"><strong>Reason:</strong> "{item.reason}"</p>
                                                </>
                                            ) : (
                                                <div className="notif-details" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                                                    {item.new_username && <p>👤 New Username: {item.new_username}</p>}
                                                    {item.new_email && <p>📧 New Email: {item.new_email}</p>}
                                                    {item.new_address && <p>📍 New Address: {item.new_address}</p>}
                                                    {item.new_phone_number && <p>📞 New Phone: {item.new_phone_number}</p>}
                                                </div>
                                            )}

                                            {item.status === 'PENDING' && (
                                                <div className="approval-actions">
                                                    <button className="approve-btn" onClick={() => handleAction(item.id, 'APPROVED', item.type)}>Approve</button>
                                                    <button className="reject-btn" onClick={() => handleAction(item.id, 'REJECTED', item.type)}>Reject</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Employee Notification Drawer */}
            <div className={`leave-drawer-overlay ${isEmployeeNotifDrawerOpen ? 'active' : ''}`} onClick={() => setIsEmployeeNotifDrawerOpen(false)}>
                <div className="leave-drawer-content" onClick={(e) => e.stopPropagation()}>
                    <div className="drawer-header">
                        <h2>Notifications</h2>
                        <button className="close-drawer-btn" onClick={() => setIsEmployeeNotifDrawerOpen(false)}>×</button>
                    </div>

                    <div className="drawer-body">
                        {notificationHistory.length === 0 ? (
                            <div className="no-history">
                                <p>No notifications yet.</p>
                            </div>
                        ) : (
                            <div className="history-list">
                                {notificationHistory.map(item => (
                                    <div key={`${item.type}-${item.id}`} className="history-card">
                                        <div className="history-card-header">
                                            <div className="leave-info-meta">
                                                <span className="leave-type-tag">
                                                    {item.type === 'PAYROLL' ? 'Salary Credited' : (item.type === 'LEAVE_UPDATE' ? item.leave_type : 'Profile Update')}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>• {formatNotifTime(item.created_at)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span className={`status-badge ${item.status.toLowerCase()}`}>
                                                    {item.status}
                                                </span>
                                                <button
                                                    className="close-drawer-btn"
                                                    style={{ fontSize: '18px', padding: '0 5px', color: '#94a3b8' }}
                                                    onClick={() => handleEmployeeDismiss(item.id, item.type)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                        <div className="history-card-body">
                                            {item.type === 'PAYROLL' ? (
                                                <div className="history-details-grid" style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Payment Details</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                                                        <div style={{ fontSize: '24px', background: '#dbeafe', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>💸</div>
                                                        <div>
                                                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>₹{item.amount}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Credited on {new Date(item.payment_date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '10px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #d1fae5' }}>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#059669' }}>
                                                            ✅ Payment Successful
                                                        </p>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#047857' }}>Salary for {new Date(item.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })} has been processed.</p>

                                                        {item.message && (
                                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #a7f3d0' }}>
                                                                <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic' }}>"{item.message}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : item.type === 'LEAVE_UPDATE' ? (
                                                <div className="history-details-grid" style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Leave Details</p>
                                                    <p style={{ margin: '5px 0' }}><strong>Type:</strong> {item.leave_type}</p>
                                                    <p style={{ margin: '5px 0' }}><strong>Dates:</strong> {item.start_date} to {item.end_date} {item.is_half_day && <span style={{ color: '#3b82f6', fontWeight: '700' }}>(Half Day)</span>}</p>
                                                    <p className="reason-text" style={{ margin: '5px 0' }}><strong>Reason:</strong> "{item.reason}"</p>
                                                    <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', background: item.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${item.status === 'APPROVED' ? '#dcfce7' : '#fee2e2'}` }}>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: item.status === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
                                                            {item.status === 'APPROVED' ? '✅ Request Accepted' : '❌ Request Rejected'}
                                                        </p>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>The admin has {item.status.toLowerCase()} your leave application.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="history-details-grid" style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Profile Changes Requested</p>
                                                    <div className="notif-details" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {item.new_username && <p style={{ margin: 0 }}><strong>👤 Username:</strong> {item.new_username}</p>}
                                                        {item.new_email && <p style={{ margin: 0 }}><strong>📧 Email:</strong> {item.new_email}</p>}
                                                        {item.new_address && <p style={{ margin: 0 }}><strong>📍 Address:</strong> {item.new_address}</p>}
                                                        {item.new_phone_number && <p style={{ margin: 0 }}><strong>📞 Phone:</strong> {item.new_phone_number}</p>}
                                                    </div>
                                                    <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', background: item.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${item.status === 'APPROVED' ? '#dcfce7' : '#fee2e2'}` }}>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: item.status === 'APPROVED' ? '#16a34a' : '#dc2626' }}>
                                                            {item.status === 'APPROVED' ? '✅ Changes Accepted' : '❌ Request Rejected'}
                                                        </p>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Your profile information has been {item.status.toLowerCase()}.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
            />
        </nav >
    );
}

export default Navbar;

