import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api/axios';
import Navbar from './Navbar';
import LeaveManagement from './LeaveManagement';
import Modal from './Modal';

function Employee() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ address: '', phone_number: '' });
  const [phoneError, setPhoneError] = useState('');
  const [isLeaveDrawerOpen, setIsLeaveDrawerOpen] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null });
  const navigate = useNavigate();

  const formatName = (emp) => {
    if (!emp) return 'UNKNOWN';
    const first = (emp.first_name || emp.user_username || '').replace(/_/g, ' ').replace(/\d+/g, '').trim();
    const last = (emp.last_name || 'EMPLOYEE').trim();
    return `${first} ${last}`.toUpperCase();
  };

  const getInitials = (emp) => {
    if (!emp) return 'U';
    return (emp.first_name || emp.user_username || 'U')[0].toUpperCase();
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('employees/');
      const data = response.data[0];
      console.log('Employee data received:', data);
      console.log('Resume field:', data.resume);
      console.log('Resume_2 field:', data.resume_2);
      setEmployee(data);
      setEditData({
        address: data.address || '',
        phone_number: data.phone_number || ''
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch profile info.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (phoneError) return;
    try {
      await api.post('profile/update/', editData);
      setModalState({
        isOpen: true,
        title: 'Request Sent',
        message: 'Your profile update request has been sent to the administrator for approval.',
        type: 'success',
        onConfirm: () => setModalState({ ...modalState, isOpen: false })
      });
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      console.error('Failed to send update request.', err);
    }
  };

  const handleLogoutConfirm = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="employee-hub-wrapper">
      <Navbar />
      <div className="hub-container">
        <div className="hub-main-content">
          {/* Welcome Header */}
          <div className="hub-header">
            <div className="hub-avatar-large">
              {getInitials(employee)}
            </div>
            <div className="hub-welcome">
              <h1>{formatName(employee)}</h1>
              <p>{employee?.designation || 'Team Member'} | {employee?.id || '...'}</p>
            </div>
          </div>

          {/* Personal Details Card */}
          <div className="hub-card">
            <div className="hub-section-title">
              <span>📍</span> Personal Information
            </div>
            <div className="hub-info-grid">
              <div className="hub-info-item">
                <label>Phone Number</label>
                {isEditing ? (
                  <input
                    className="form-input"
                    value={editData.phone_number}
                    style={{ borderColor: phoneError ? '#ef4444' : '' }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/[^0-9]/.test(val)) setPhoneError('Invalid characters');
                      else if (val.length > 10) setPhoneError('Max 10 digits');
                      else setPhoneError('');
                      setEditData({ ...editData, phone_number: val });
                    }}
                  />
                ) : (
                  <p>{employee?.phone_number || 'Not Provided'}</p>
                )}
                {isEditing && phoneError && <small style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '5px' }}>{phoneError}</small>}
              </div>
              <div className="hub-info-item">
                <label>Email Address</label>
                <p>{employee?.email || 'Not Provided'}</p>
              </div>
              <div className="hub-info-item" style={{ gridColumn: 'span 2' }}>
                <label>Residence Address</label>
                {isEditing ? (
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px' }}
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  />
                ) : (
                  <p>{employee?.address || 'Not Provided'}</p>
                )}
              </div>
            </div>
            {isEditing && (
              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button className="hub-btn hub-btn-primary" onClick={handleSaveProfile} style={{ width: 'auto' }}>
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Professional Info Card */}
          <div className="hub-card">
            <div className="hub-section-title">
              <span>💼</span> Professional Details
            </div>
            <div className="hub-info-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="hub-info-item">
                <label>Department</label>
                <p><span className="hub-status-badge">{employee?.department?.name || 'Unassigned'}</span></p>
              </div>
              <div className="hub-info-item">
                <label>Annual Salary</label>
                <p style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>₹{Number(employee?.salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="hub-info-item">
                <label>Monthly Salary</label>
                <p style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>₹{((employee?.salary || 0) / 12).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Helper functions for Resume */}
          {(() => {
            const handleDualResumeUpload = async (e, slot) => {
              const file = e.target.files[0];
              if (!file) return;
              const formData = new FormData();
              // slot is 1 or 2. If 1, field is 'resume', if 2, 'resume_2'
              const fieldName = slot === 2 ? 'resume_2' : 'resume';
              formData.append(fieldName, file);

              try {
                await api.post('profile/update/', formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data'
                  }
                });
                setModalState({
                  isOpen: true,
                  title: 'Upload Successful',
                  message: `Resume ${slot} has been updated.`,
                  type: 'success',
                  onConfirm: () => window.location.reload()
                });
              } catch (err) {
                console.error('Upload failed.', err);
              }
            };

            const handleDualResumeDelete = (slot) => {
              setModalState({
                isOpen: true,
                title: 'Confirm Deletion',
                message: `Are you sure you want to delete Resume ${slot}?`,
                type: 'confirm',
                onConfirm: async () => {
                  try {
                    await api.post(`employees/${employee.id}/delete-resume/`, { resume_index: slot });
                    setModalState({
                      isOpen: true,
                      title: 'Deleted',
                      message: 'Resume deleted successfully.',
                      type: 'success',
                      onConfirm: () => window.location.reload()
                    });
                  } catch (err) {
                    setModalState({ isOpen: true, title: 'Error', message: 'Failed to delete resume.', type: 'error' });
                  }
                }
              });
            };

            // Helper component for a single slot
            const ResumeSlot = ({ slot }) => {
              const fileKey = slot === 2 ? 'resume_2' : 'resume';
              const fileUrl = employee?.[fileKey];
              const fileName = fileUrl ? fileUrl.split('/').pop() : 'No file uploaded';

              return (
                <div className="hub-resume-box" style={{ marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>Resume Slot {slot}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      {fileUrl ? `File: ${fileName}` : 'Empty'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {fileUrl && (
                      <>
                        <a href={`http://localhost:8000${fileUrl}`} target="_blank" rel="noreferrer" className="hub-btn hub-btn-outline" style={{ padding: '8px 15px' }}>
                          View
                        </a>
                        <button
                          className="hub-btn hub-btn-outline"
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleDualResumeDelete(slot)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <input
                      type="file"
                      id={`resumeUpload${slot}`}
                      style={{ display: 'none' }}
                      onChange={(e) => handleDualResumeUpload(e, slot)}
                    />
                    <button
                      className="hub-btn hub-btn-primary"
                      style={{ padding: '8px 15px', fontSize: '12px' }}
                      onClick={() => document.getElementById(`resumeUpload${slot}`).click()}
                    >
                      {fileUrl ? 'Update' : 'Upload'}
                    </button>
                  </div>
                </div>
              );
            };

            // Assign to window or use render prop if strict scoping issues, but here we can just return the render
            // Actually, JSX logic inside render:
            return (
              <div className="hub-card">
                <div className="hub-section-title">
                  <span>📄</span> Career Assets
                </div>
                {/* Render Slot 1 */}
                <ResumeSlot slot={1} />
                {/* Render Slot 2 */}
                <ResumeSlot slot={2} />
              </div>
            );
          })()}
        </div>

        {/* Sidebar Actions */}
        <div className="hub-sidebar">
          <div className="sidebar-action-card">
            <div className="hub-section-title" style={{ fontSize: '12px', marginBottom: '15px' }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="hub-btn hub-btn-outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? '✖ Cancel Editing' : '📝 Edit Data'}
              </button>
              <button className="hub-btn hub-btn-outline" onClick={() => setIsLeaveDrawerOpen(true)}>
                📅 Manage Leaves
              </button>
              <button className="hub-btn hub-btn-outline" onClick={() => navigate('/employee/payroll')}>
                💰 My Salary
              </button>
              <button
                className="hub-btn hub-btn-logout"
                onClick={() => setModalState({
                  isOpen: true,
                  title: 'Confirm Logout',
                  message: 'Are you sure you want to sign out?',
                  type: 'confirm',
                  onConfirm: handleLogoutConfirm
                })}
              >
                ⏻ Logout
              </button>
            </div>
          </div>

          <div className="sidebar-action-card" style={{ background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
            <p style={{ fontSize: '13px', color: '#0d9488', margin: 0, fontWeight: '600' }}>
              Need help? Contact support if you find any issues with your data.
            </p>
          </div>
        </div>
      </div>

      <LeaveManagement
        isOpen={isLeaveDrawerOpen}
        onClose={() => setIsLeaveDrawerOpen(false)}
        employee={employee}
      />

      <Modal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onConfirm={modalState.onConfirm}
      />
    </div >
  );
}

export default Employee;
