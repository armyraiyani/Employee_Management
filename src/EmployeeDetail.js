import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import api from './api/axios';
import Modal from './Modal';

function EmployeeDetail() {
    const { id: paramId } = useParams();
    const navigate = useNavigate();
    const loggedUserId = localStorage.getItem('user_id');
    const isAdmin = localStorage.getItem('role') === 'ADMIN';
    const id = paramId || loggedUserId; // Default to self if no ID provided
    const isSelf = String(loggedUserId) === String(id);

    const [employee, setEmployee] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allEmployees, setAllEmployees] = useState([]);

    // Admin Edit States
    const [isEditingSalary, setIsEditingSalary] = useState(false);
    const [isEditingDept, setIsEditingDept] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [isEditingDesignation, setIsEditingDesignation] = useState(false);

    // Personal Edit State (Used by self or admin)
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);

    const [nameError, setNameError] = useState('');
    const [deptError, setDeptError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [editData, setEditData] = useState({});

    // Attendance & Schedule States
    const [holidays, setHolidays] = useState([]);
    const [schedule, setSchedule] = useState({ standard_check_in: '09:00:00', standard_check_out: '18:00:00', half_day_hours: 4.0 });
    const [showHolidaySidebar, setShowHolidaySidebar] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);
    const [adminPassForVerify, setAdminPassForVerify] = useState('');
    const [verifyMode, setVerifyMode] = useState(null); // 'SHOW' or 'RESET'
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [newPasswordForReset, setNewPasswordForReset] = useState('');

    // Modal State
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'success',
        onConfirm: null
    });

    const closeModal = () => setModalState({ ...modalState, isOpen: false });

    const formatName = (emp) => {
        if (!emp) return 'UNKNOWN';
        let first = (emp.first_name || emp.user_username || emp.username || 'USER')
            .replace(/\d+/g, '').replace(/[\._]/g, ' ').trim();
        let last = (emp.last_name || '').replace(/\d+/g, '').replace(/[\._]/g, ' ').trim();
        if (last.toUpperCase() === 'EMPLOYEE' && first.length > 0) last = '';
        const upperFirst = first.toUpperCase();
        const upperLast = last.toUpperCase();
        if (upperLast && upperFirst.includes(upperLast)) return upperFirst;
        return `${upperFirst} ${upperLast}`.trim();
    };

    const fetchData = async () => {
        try {
            const endpoint = paramId ? `employees/${paramId}/` : 'profile/me/';
            const timestamp = Date.now();

            // Parallel fetch for profile and attendance/schedule/holidays
            const results = await Promise.all([
                api.get(endpoint),
                api.get('departments/'),
                api.get(`attendance/schedule/?t=${timestamp}`),
                api.get(`attendance/?t=${timestamp}`),
                api.get(`attendance/holidays/?t=${timestamp}`).then(r => setHolidays(r.data)).catch(() => { }),
                api.get(`employees/`)
            ]);

            const empRes = results[0];
            const deptRes = results[1];
            const scholRes = results[2];
            const allEmpRes = results[5];

            setEmployee(empRes.data);
            setAllEmployees(allEmpRes.data);
            setDepartments(deptRes.data);
            setSchedule(scholRes.data);

            setEditData({
                salary: empRes.data.salary || '',
                department_name: empRes.data.department ? empRes.data.department.name : '',
                first_name: empRes.data.first_name || '',
                last_name: empRes.data.last_name || '',
                address: empRes.data.address || '',
                phone_number: empRes.data.phone_number || '',
                username: empRes.data.user_username || empRes.data.username || '',
                email: empRes.data.email || '',
                designation: empRes.data.designation || '',
                emailError: ''
            });
            setLoading(false);
        } catch (err) {
            console.error("Fetch error:", err);
            setError('Failed to fetch employee details.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);


    const handleCancelEdit = (field) => {
        if (field === 'name') {
            setEditData(prev => ({ ...prev, first_name: employee.first_name || '', last_name: employee.last_name || '' }));
            setIsEditingName(false);
            setNameError('');
        } else if (field === 'department') {
            setEditData(prev => ({ ...prev, department_name: employee.department?.name || '' }));
            setIsEditingDept(false);
            setDeptError('');
        } else if (field === 'salary') {
            setEditData(prev => ({ ...prev, salary: employee.salary || '' }));
            setIsEditingSalary(false);
        } else if (field === 'designation') {
            setEditData(prev => ({ ...prev, designation: employee.designation || '' }));
            setIsEditingDesignation(false);
        } else if (field === 'personal') {
            setEditData(prev => ({
                ...prev,
                username: employee.user_username || employee.username || '',
                email: employee.email || '',
                emailError: ''
            }));
            setIsEditingPersonal(false);
        } else if (field === 'address') {
            setEditData(prev => ({ ...prev, address: employee.address || '' }));
            setIsEditingAddress(false);
        } else if (field === 'phone') {
            setEditData(prev => ({ ...prev, phone_number: employee.phone_number || '' }));
            setIsEditingPhone(false);
            setPhoneError('');
        }
    };

    const handleSaveField = async (field) => {
        if (field === 'name') {
            if (/\d/.test(editData.first_name) || /\d/.test(editData.last_name)) {
                setNameError('Numbers are not allowed in name.');
                return;
            }
            if (!editData.last_name || editData.last_name.trim().length === 0) {
                setNameError('Last name is required.');
                return;
            }
            setNameError('');
        }
        if (field === 'department' && deptError) return;
        if (field === 'phone' && (phoneError || editData.phone_number.length !== 10)) {
            setPhoneError('Contact must be exactly 10 digits.');
            return;
        }

        try {
            const updateEndpoint = isAdmin
                ? `employees/${employee.id}/update/`
                : `profile/update/`;

            const response = await api.post(updateEndpoint, editData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // For admin direct updates, refresh the employee data silently (no modal)
            if (isAdmin) {
                setEmployee(response.data);
            } else if (field === 'personal') {
                // Employee submitted a request - show confirmation
                setModalState({
                    isOpen: true,
                    title: 'Request Submitted',
                    message: '✅ Profile update request submitted! An admin will review your changes.',
                    type: 'success'
                });
            }

            if (field === 'salary') setIsEditingSalary(false);
            if (field === 'department') setIsEditingDept(false);
            if (field === 'name') setIsEditingName(false);
            if (field === 'personal') setIsEditingPersonal(false);
            if (field === 'address') setIsEditingAddress(false);
            if (field === 'phone') setIsEditingPhone(false);
            if (field === 'designation') setIsEditingDesignation(false);

            // Re-sync to ensure clean data
            fetchData();
        } catch (err) {
            console.error('Failed to update ' + field, err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error occurred';
            setModalState({
                isOpen: true,
                title: 'Error',
                message: `❌ Failed to update ${field}. ${errorMessage}`,
                type: 'error'
            });
        }
    };

    const handleResumeUpload = async (e, slot) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        const fieldName = slot === 2 ? 'resume_2' : 'resume';
        formData.append(fieldName, file);

        try {
            const endpoint = paramId ? `employees/${paramId}/update/` : `profile/update/`;
            await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Fetch updated data from database
            const updatedEndpoint = paramId ? `employees/${paramId}/` : 'profile/me/';
            const response = await api.get(updatedEndpoint);
            setEmployee(response.data);

            setModalState({
                isOpen: true,
                title: 'Upload Successful',
                message: `Resume ${slot} has been saved successfully!`,
                type: 'success'
            });
        } catch (err) {
            setModalState({
                isOpen: true,
                title: 'Upload Failed',
                message: 'Failed to save resume. Please try again.',
                type: 'error'
            });
        }
    };

    const handleDeleteResume = (slot) => {
        setModalState({
            isOpen: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete Resume ${slot}?`,
            type: 'confirm',
            onConfirm: async () => {
                closeModal();
                try {
                    await api.post(`employees/${employee.id}/delete-resume/`, { resume_index: slot });

                    const updatedEndpoint = paramId ? `employees/${paramId}/` : 'profile/me/';
                    const response = await api.get(updatedEndpoint);
                    setEmployee(response.data);

                    setModalState({ isOpen: true, title: 'Deleted', message: 'Resume deleted successfully.', type: 'success' });
                } catch (err) {
                    console.error("Delete failed", err);
                    setModalState({ isOpen: true, title: 'Error', message: 'Failed to delete resume.', type: 'error' });
                }
            }
        });
    };
    const [fetchedPassword, setFetchedPassword] = useState(null);

    const handleAdminVerify = async () => {
        if (!adminPassForVerify) {
            setModalState({ isOpen: true, title: 'Required', message: 'Please enter your admin password.', type: 'error' });
            return;
        }

        try {
            if (verifyMode === 'SHOW') {
                const res = await api.post(`employees/${employee.id}/reveal-password/`, { admin_password: adminPassForVerify });
                if (res.data.status === 'success') {
                    setFetchedPassword(res.data.password);
                    setIsPasswordRevealed(true);
                    setVerifyMode(null);
                    setAdminPassForVerify('');
                }
            }
        } catch (err) {
            if (err.response?.data?.error && err.response.data.error.includes("hashed only")) {
                setModalState({
                    isOpen: true,
                    title: 'Reset Required',
                    message: "This password cannot be retrieved because it's hashed. Would you like to reset it?",
                    type: 'confirm',
                    onConfirm: () => {
                        closeModal();
                        setIsPasswordRevealed(false);
                        setVerifyMode(null);
                        setIsPasswordRevealed(false);
                        setVerifyMode(null);
                        setAdminPassForVerify('');
                        setNewPasswordForReset('');
                        setShowConfirmReset(true);
                    }
                });
            } else {
                setModalState({
                    isOpen: true,
                    title: 'Access Denied',
                    message: err.response?.data?.error || "Incorrect admin password.",
                    type: 'error'
                });
            }
            setAdminPassForVerify('');
        }
    };

    const proceedWithReset = async (adminPass) => {
        if (!newPasswordForReset) {
            setModalState({
                isOpen: true,
                title: 'Error',
                message: 'Please enter a new password.',
                type: 'error'
            });
            return;
        }
        setIsResetting(true);
        try {
            await api.post(`employees/${employee.id}/reset-password/`, { new_password: newPasswordForReset, admin_password: adminPass });
            fetchData();
            setModalState({
                isOpen: true,
                title: 'Success',
                message: `✅ Password reset successfully.`,
                type: 'success'
            });
            setShowConfirmReset(false);
            setFetchedPassword(newPasswordForReset); // Show the new password immediately
            setIsPasswordRevealed(true); // Auto-reveal after reset
            setNewPasswordForReset('');
            setAdminPassForVerify('');
        } catch (err) {
            console.error("Reset failed", err);
            setModalState({
                isOpen: true,
                title: 'Reset Failed',
                message: err.response?.data?.error || "Failed to reset password.",
                type: 'error'
            });
        } finally {
            setIsResetting(false);
        }
    };

    if (loading) return <div className="loader"></div>;
    if (error) return <div className="error-message" style={{ margin: '50px auto', maxWidth: '500px' }}>{error}</div>;
    if (!employee) return null;

    return (
        <div className="cyber-admin-view">
            <Navbar />

            <div className="cyber-dossier-layout">
                {/* Header Section */}
                <header className="cyber-header">
                    <div>
                        <h1 className="cyber-title-main">
                            {isSelf ? "My Profile" : "Employee Profile"}
                        </h1>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <button onClick={() => navigate(isAdmin ? '/admin' : '/')} className="back-btn-up">
                            {isAdmin ? '← Return to Directory' : '← Dashboard'}
                        </button>
                    </div>
                </header>

                {/* Column 1: Identity & Bio */}
                <div className="cyber-module photo-module">
                    <div className="cyber-avatar-ring">
                        <div className="cyber-avatar-img">
                            {(employee.first_name || 'U')[0].toUpperCase()}
                        </div>
                    </div>

                    {isEditingName ? (
                        <div className="cyber-inline-edit" style={{ background: 'rgba(99,102,241,0.1)', padding: '20px', borderRadius: '15px' }}>
                            <input
                                className="dossier-input-small"
                                style={{ marginBottom: '10px', borderColor: nameError ? '#ef4444' : '' }}
                                value={editData.first_name}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/\d/.test(val)) setNameError('Numbers are not allowed');
                                    else setNameError('');
                                    setEditData({ ...editData, first_name: val });
                                }}
                            />
                            <input
                                className="dossier-input-small"
                                style={{ marginBottom: '10px', borderColor: nameError ? '#ef4444' : '' }}
                                value={editData.last_name}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/\d/.test(val)) setNameError('Numbers are not allowed');
                                    else setNameError('');
                                    setEditData({ ...editData, last_name: val });
                                }}
                            />
                            {nameError && <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '10px', textAlign: 'center' }}>{nameError}</div>}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button className="confirm-mini-btn" onClick={(e) => { e.stopPropagation(); handleSaveField('name'); }}>✓ CONFIRM</button>
                                <button className="cancel-mini-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit('name'); }}>✕</button>
                            </div>
                        </div>
                    ) : (
                        <h2 className="hero-name" onClick={() => isAdmin && setIsEditingName(true)} style={{ cursor: isAdmin ? 'pointer' : 'default', margin: '0 0 10px' }}>
                            {formatName(employee)}
                        </h2>
                    )}

                    <div className="cyber-id-badge">#{allEmployees.findIndex(e => e.id === employee.id) + 1}</div>


                    <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
                        Operational Specialist within the <strong>{(employee.department?.name || 'GHOST').toUpperCase()}</strong> unit.
                        Assigned to high-impact projects and organizational growth.
                    </p>

                    <div className="stats-row">
                        <div className="mini-stat">
                            <label>Designation</label>
                            {isEditingDesignation ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        className="dossier-input-small"
                                        value={editData.designation}
                                        onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveField('designation')}
                                        autoFocus
                                        style={{ flex: 1 }}
                                    />
                                    <button className="confirm-mini-btn" onClick={(e) => { e.stopPropagation(); handleSaveField('designation'); }}>✓</button>
                                    <button className="cancel-mini-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit('designation'); }}>✕</button>
                                </div>
                            ) : (
                                <div className="val" onClick={() => isAdmin && setIsEditingDesignation(true)} style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                                    {employee.designation || 'Specialist'} {isAdmin && <span style={{ fontSize: '10px', color: '#6366f1' }}>✎</span>}
                                </div>
                            )}
                        </div>
                        <div className="mini-stat">
                            <label>Status</label>
                            <div className="val" style={{ color: '#10b981' }}>ACTIVE</div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Core Intelligence */}
                <div className="cyber-module data-module">
                    <h3>Primary Intelligence</h3>
                    <div className="cyber-data-grid">
                        <div className="cyber-field" onClick={() => isAdmin && setIsEditingDept(true)}>
                            <label className="cyber-label">Organizational Unit</label>
                            {isEditingDept ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            className="dossier-input-small"
                                            style={{ borderColor: deptError ? '#ef4444' : '', flex: 1 }}
                                            value={editData.department_name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (/[^a-zA-Z\s]/.test(val)) setDeptError('Invalid characters');
                                                else setDeptError('');
                                                setEditData({ ...editData, department_name: val.toUpperCase() });
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveField('department')}
                                            autoFocus
                                        />
                                        <button className="confirm-mini-btn" onClick={(e) => { e.stopPropagation(); handleSaveField('department'); }}>✓</button>
                                        <button className="cancel-mini-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit('department'); }}>✕</button>
                                    </div>
                                    {deptError && <small style={{ color: '#ef4444', fontSize: '11px' }}>{deptError}</small>}
                                </div>
                            ) : (
                                <div className="cyber-value">{(employee.department?.name || 'UNASSIGNED').toUpperCase()}</div>
                            )}
                        </div>

                        <div className="cyber-field" onClick={() => isAdmin && setIsEditingSalary(true)}>
                            <label className="cyber-label">Compensation Profile (Monthly / Annual)</label>
                            {isEditingSalary ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        className="dossier-input-small"
                                        value={editData.salary}
                                        onChange={(e) => setEditData({ ...editData, salary: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveField('salary')}
                                        autoFocus
                                        placeholder="Base Annual Salary"
                                        style={{ flex: 1 }}
                                    />
                                    <button className="confirm-mini-btn" onClick={(e) => { e.stopPropagation(); handleSaveField('salary'); }}>✓</button>
                                    <button className="cancel-mini-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit('salary'); }}>✕</button>
                                </div>
                            ) : (
                                <div className="cyber-value">
                                    ₹{((employee.salary / 12) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} <br />
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        (₹{Number(employee.salary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} / year)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="cyber-field">
                            <label className="cyber-label">Integration Date</label>
                            <div className="cyber-value monospaced">
                                {employee.date_of_joining ? employee.date_of_joining.replace(/-/g, '.') : 'Pending...'}
                            </div>
                        </div>

                        <div className="cyber-field" onClick={() => (isAdmin || isSelf) && setIsEditingPersonal(true)}>
                            <label className="cyber-label">Network Identity (Email / User)</label>
                            {isEditingPersonal ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <input
                                        className="dossier-input-small"
                                        value={editData.username}
                                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                        placeholder="Username"
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <input
                                            className="dossier-input-small"
                                            value={editData.email}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                                const error = val && !emailRegex.test(val) ? 'Invalid: Enter valid email format' : '';
                                                setEditData({ ...editData, email: val, emailError: error });
                                            }}
                                            placeholder="Email (e.g. user@company.com)"
                                            style={{ borderColor: editData.emailError ? '#ef4444' : '' }}
                                        />
                                        {editData.emailError && <small style={{ color: '#ef4444', fontSize: '11px' }}>{editData.emailError}</small>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="confirm-mini-btn" onClick={(e) => { e.stopPropagation(); handleSaveField('personal'); }}>✓ SAVE</button>
                                        <button className="cancel-mini-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit('personal'); }}>✕</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="cyber-value monospaced" style={{ fontSize: '0.9rem' }}>
                                    {employee.email || 'NO_EMAIL_RECORD'} <br />
                                    @{employee.user_username || employee.username}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        <button
                            className="view-mini-btn"
                            onClick={() => isAdmin ? setShowAccessModal(true) : navigate(`/employee/${employee.id}/attendance`)}
                        >
                            {isAdmin ? 'ACCESS_CREDENTIALS →' : 'ACCESS_LOGS →'}
                        </button>
                    </div>
                </div>

                {/* Column 3: Connectivity & Assets */}
                <div className="cyber-module data-module">
                    <h3>Connectivity Hub</h3>
                    <div className="cyber-data-grid">
                        <div className="cyber-field" onClick={() => isAdmin && setIsEditingAddress(true)}>
                            <label className="cyber-label">Physical Coordinates (Residence)</label>
                            {isEditingAddress ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        className="dossier-input-small"
                                        value={editData.address}
                                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveField('address')}
                                        autoFocus
                                        style={{ flex: 1 }}
                                    />
                                    <button className="confirm-mini-btn" onClick={(e) => { e.stopPropagation(); handleSaveField('address'); }}>✓</button>
                                    <button className="cancel-mini-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit('address'); }}>✕</button>
                                </div>
                            ) : (
                                <div className="cyber-value">{employee.address || 'UNKNOWN_LOCATION'}</div>
                            )}
                        </div>

                        <div className="cyber-field" onClick={() => isAdmin && setIsEditingPhone(true)}>
                            <label className="cyber-label">Encrypted Comms (Phone)</label>
                            {isEditingPhone ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            className="dossier-input-small"
                                            style={{ borderColor: phoneError ? '#ef4444' : '', flex: 1 }}
                                            value={editData.phone_number}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (/[^0-9]/.test(val)) setPhoneError('Invalid characters');
                                                else if (val.length > 10) setPhoneError('Max 10 digits');
                                                else setPhoneError('');
                                                setEditData({ ...editData, phone_number: val });
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveField('phone')}
                                            autoFocus
                                        />
                                        <button className="confirm-mini-btn" onClick={(e) => { e.stopPropagation(); handleSaveField('phone'); }}>✓</button>
                                        <button className="cancel-mini-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit('phone'); }}>✕</button>
                                    </div>
                                    {phoneError && <small style={{ color: '#ef4444', fontSize: '11px' }}>{phoneError}</small>}
                                </div>
                            ) : (
                                <div className="cyber-value monospaced">{employee.phone_number || 'NO_COMMS'}</div>
                            )}
                        </div>
                    </div>

                    <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#e2e8f0', fontSize: '14px', fontWeight: '600' }}>📁 Resume Documents</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        {[1, 2].map(slot => {
                            const fileKey = slot === 1 ? 'resume' : 'resume_2';
                            const fileUrl = employee?.[fileKey];
                            const fileName = fileUrl ? fileUrl.split('/').pop() : '';

                            return (
                                <div key={slot} style={{
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
                                    border: fileUrl ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(100,116,139,0.2)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    position: 'relative',
                                    transition: 'all 0.3s ease',
                                    cursor: fileUrl ? 'default' : 'pointer'
                                }}
                                    onClick={() => !fileUrl && document.getElementById(`resume-input-${slot}`).click()}
                                    onMouseEnter={(e) => !fileUrl && (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                                    onMouseLeave={(e) => !fileUrl && (e.currentTarget.style.borderColor = 'rgba(100,116,139,0.2)')}
                                >
                                    {/* Slot Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        background: fileUrl ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                        color: fileUrl ? '#10b981' : '#64748b',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '9px',
                                        fontWeight: '700',
                                        letterSpacing: '0.3px'
                                    }}>
                                        SLOT {slot}
                                    </div>

                                    {/* Delete Button */}
                                    {fileUrl && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteResume(slot); }}
                                            style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                borderRadius: '8px',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                padding: '4px 8px',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="Delete Resume"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            🗑
                                        </button>
                                    )}

                                    {/* Content */}
                                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                        <div style={{
                                            fontSize: '32px',
                                            marginBottom: '12px',
                                            opacity: fileUrl ? '1' : '0.4'
                                        }}>
                                            📄
                                        </div>

                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            color: fileUrl ? '#10b981' : '#64748b',
                                            marginBottom: '6px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.3px'
                                        }}>
                                            {fileUrl ? '✓ Uploaded' : 'Empty Slot'}
                                        </div>

                                        {fileUrl ? (
                                            <div style={{
                                                fontSize: '11px',
                                                color: '#94a3b8',
                                                marginBottom: '12px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                padding: '0 8px'
                                            }} title={fileName}>
                                                {fileName}
                                            </div>
                                        ) : (
                                            <div style={{
                                                fontSize: '10px',
                                                color: '#64748b',
                                                marginBottom: '12px'
                                            }}>
                                                Click to upload
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            {fileUrl ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`http://localhost:8000${fileUrl}`, '_blank');
                                                    }}
                                                    style={{
                                                        background: 'rgba(99,102,241,0.15)',
                                                        border: '1px solid rgba(99,102,241,0.3)',
                                                        borderRadius: '8px',
                                                        color: '#6366f1',
                                                        padding: '8px 16px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                                                >
                                                    👁 View
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        document.getElementById(`resume-input-${slot}`).click();
                                                    }}
                                                    style={{
                                                        background: 'rgba(99,102,241,0.15)',
                                                        border: '1px solid rgba(99,102,241,0.3)',
                                                        borderRadius: '6px',
                                                        color: '#6366f1',
                                                        padding: '6px 12px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                                                >
                                                    📤 Upload
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <input
                                        type="file"
                                        id={`resume-input-${slot}`}
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleResumeUpload(e, slot)}
                                        accept=".pdf,.doc,.docx"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sidebar & Overlays */}
            <Modal
                isOpen={modalState.isOpen}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
            />

            <div className={`notification-sidebar ${showHolidaySidebar ? 'active' : ''}`} style={{ background: '#020617', borderLeft: '2px solid #6366f1' }}>
                <div className="sidebar-header" style={{ padding: '30px', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', letterSpacing: '2px' }}>CALENDAR_FEED</h3>
                    <button className="close-sidebar" onClick={() => setShowHolidaySidebar(false)} style={{ color: '#fff' }}>×</button>
                </div>
                <div className="sidebar-content" style={{ padding: '30px' }}>
                    {holidays.map(h => (
                        <div key={h.id} className="cyber-module" style={{ marginBottom: '15px', padding: '15px' }}>
                            <div className="cyber-label" style={{ color: '#6366f1' }}>{new Date(h.date).toLocaleDateString()}</div>
                            <div className="cyber-value" style={{ fontSize: '0.9rem' }}>{h.name.toUpperCase()}</div>
                        </div>
                    ))}
                    {holidays.length === 0 && <p style={{ color: '#64748b', textAlign: 'center' }}>No events detected.</p>}
                </div>
            </div>
            {showHolidaySidebar && <div className="sidebar-overlay active" onClick={() => setShowHolidaySidebar(false)}></div>}

            {/* Access Credentials Modal */}
            {showAccessModal && (
                <div className="calendar-modal-overlay" onClick={() => {
                    setShowAccessModal(false);
                    setIsPasswordRevealed(false);
                    setVerifyMode(null);
                    setShowConfirmReset(false);
                }}>
                    <div className="calendar-modal-card animate-scale-up" onClick={e => e.stopPropagation()} style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '30px', maxWidth: '400px', borderRadius: '24px' }}>
                        <div className="modal-close" onClick={() => {
                            setShowAccessModal(false);
                            setIsPasswordRevealed(false);
                            setVerifyMode(null);
                            setShowConfirmReset(false);
                        }} style={{ color: '#64748b' }}>×</div>

                        <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '25px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>🔐</span> ACCESS_CREDENTIALS
                        </h3>

                        <div className="cyber-field" style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px' }}>
                            <label className="cyber-label" style={{ fontSize: '10px', color: '#6366f1' }}>USERNAME</label>
                            <div className="cyber-value" style={{ fontSize: '1.2rem', color: '#fff', fontWeight: '700', marginTop: '5px' }}>{employee.user_username || employee.username}</div>
                        </div>

                        <div className="cyber-field" style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px' }}>
                            <label className="cyber-label" style={{ fontSize: '10px', color: '#6366f1' }}>PASSWORD</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                                <div className="cyber-value monospaced" style={{ flex: 1, fontSize: '1.1rem', color: isPasswordRevealed ? '#10b981' : '#64748b', transition: '0.3s' }}>
                                    {isPasswordRevealed ? (fetchedPassword || 'Not Set') : '••••••••'}
                                </div>
                                {!isPasswordRevealed && (
                                    <button
                                        onClick={() => setVerifyMode('SHOW')}
                                        style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                        SHOW
                                    </button>
                                )}
                            </div>
                        </div>

                        {verifyMode && (
                            <div className="verify-container animate-fade-in" style={{ marginBottom: '25px', padding: '20px', background: 'rgba(99,102,241,0.1)', borderRadius: '15px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <label className="cyber-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '10px', display: 'block' }}>CONFIRM ADMIN IDENTITY</label>
                                <input
                                    type="password"
                                    className="dossier-input-small"
                                    placeholder="Enter your password"
                                    style={{ width: '100%', marginBottom: '15px' }}
                                    value={adminPassForVerify}
                                    onChange={(e) => setAdminPassForVerify(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdminVerify()}
                                    autoFocus
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="confirm-mini-btn" style={{ flex: 1 }} onClick={handleAdminVerify}>VERIFY</button>
                                    <button className="cancel-mini-btn" onClick={() => { setVerifyMode(null); setAdminPassForVerify(''); }}>CANCEL</button>
                                </div>
                            </div>
                        )}

                        {/* Reset functionality restored */}
                        {!showConfirmReset ? (
                            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                <button
                                    onClick={() => setShowConfirmReset(true)}
                                    style={{
                                        background: 'transparent',
                                        color: '#ef4444',
                                        border: '1px solid #ef4444',
                                        padding: '10px 15px',
                                        borderRadius: '10px',
                                        width: '100%',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: '0.3s'
                                    }}
                                >
                                    ⚠ RESET PASSWORD
                                </button>
                            </div>
                        ) : (
                            <div className="verify-container animate-fade-in" style={{ marginTop: '20px', padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '15px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <label className="cyber-label" style={{ fontSize: '11px', color: '#ef4444', marginBottom: '10px', display: 'block' }}>RESET DETAILS</label>
                                <p style={{ color: '#fff', fontSize: '12px', marginBottom: '15px', lineHeight: '1.4' }}>
                                    Set a new password for this employee. <br />
                                    <strong>Action cannot be undone.</strong>
                                </p>

                                <input
                                    type="text"
                                    className="dossier-input-small"
                                    placeholder="NEW PASSWORD TO SET"
                                    style={{ width: '100%', marginBottom: '10px', borderColor: '#60a5fa', color: '#60a5fa' }}
                                    value={newPasswordForReset}
                                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                                    autoComplete="off"
                                />

                                <input
                                    type="password"
                                    className="dossier-input-small"
                                    placeholder="CONFIRM YOUR ADMIN PASS"
                                    style={{ width: '100%', marginBottom: '15px', borderColor: '#ef4444' }}
                                    value={adminPassForVerify}
                                    onChange={(e) => setAdminPassForVerify(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="confirm-mini-btn" style={{ flex: 1, background: '#ef4444' }} onClick={() => proceedWithReset(adminPassForVerify)} disabled={isResetting}>
                                        {isResetting ? 'RESETTING...' : 'CONFIRM RESET'}
                                    </button>
                                    <button className="cancel-mini-btn" onClick={() => { setShowConfirmReset(false); setAdminPassForVerify(''); setNewPasswordForReset(''); }}>CANCEL</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeDetail;
