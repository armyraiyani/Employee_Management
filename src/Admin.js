import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api/axios';
import Navbar from './Navbar';
import Modal from './Modal';

function Admin() {
  // Admin Component - Verified State
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessInfo, setShowSuccessInfo] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [payrollMap, setPayrollMap] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'success', onConfirm: null });
  const [fieldErrors, setFieldErrors] = useState({ fullName: '', department_name: '', contact: '' });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const symbols = "!@#$%^&*";
    const allChars = chars + symbols;
    let password = "";

    // Ensure at least one symbol and one number for complexity
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    password += "0123456789".charAt(Math.floor(Math.random() * 10));

    for (let i = 0; i < 8; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // Simplified Form Data
  const [formData, setFormData] = useState({
    fullName: '',
    department_name: '',
    contact: ''
  });

  const navigate = useNavigate();

  // ...

  // Payment Detail Modal State
  const [paymentModal, setPaymentModal] = useState(null);

  const fetchData = async () => {
    try {
      const timestamp = Date.now();

      // Fetch employees
      try {
        const empRes = await api.get(`employees/?t=${timestamp}`);
        setEmployees(empRes.data);
      } catch (e) { console.error("Employees fetch failed", e); }

      // Fetch departments
      try {
        const deptRes = await api.get(`departments/?t=${timestamp}`);
        setDepartments(deptRes.data);
      } catch (e) { console.error("Departments fetch failed", e); }

      // Fetch Payroll Status for current month
      try {
        const payrollRes = await api.get(`payroll/status/?month=${currentMonth}-01&t=${timestamp}`);
        // Convert list to map: emp_id -> full_record
        const map = {};
        payrollRes.data.forEach(p => {
          map[p.employee_id] = p; // Store full record
        });
        setPayrollMap(map);
      } catch (e) { console.error("Payroll fetch failed", e); }

    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth]); // Refetch if month changes



  const handleProcessAttendance = async () => {
    setModalConfig({
      isOpen: true,
      title: 'Confirm Attendance Processing',
      message: `Are you sure you want to process attendance for ${currentMonth}?`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          const res = await api.post('attendance/process-daily/', { date: `${currentMonth}-01` });
          setModalConfig({
            isOpen: true,
            title: 'Success',
            message: res.data.message || 'Attendance processed successfully!',
            type: 'success',
            onConfirm: null
          });
          fetchData();
        } catch (err) {
          setModalConfig({
            isOpen: true,
            title: 'Error',
            message: err.response?.data?.error || 'Failed to process attendance',
            type: 'error',
            onConfirm: null
          });
        }
      }
    });
  };

  const handlePayAll = () => {
    // Check if any employees have already been paid for this month
    const alreadyPaid = employees.some(emp => {
      const payrollInfo = payrollMap[emp.id];
      return payrollInfo?.salary_status === 'PAID';
    });

    if (alreadyPaid) {
      setModalConfig({
        isOpen: true,
        title: 'Already Paid',
        message: 'You can pay only once in a month. Salaries for this month have already been processed.',
        type: 'error',
        onConfirm: null
      });
      return;
    }

    // Format the month for display (e.g., "January 2026")
    const monthDate = new Date(currentMonth + '-01');
    const monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Check if the selected month is in the future
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const isFutureMonth = currentMonth > currentYearMonth;

    if (isFutureMonth) {
      setModalConfig({
        isOpen: true,
        title: 'Future Payment Not Allowed',
        message: 'You cannot bulk pay for a future month. Attendance data is required for calculation.',
        type: 'error',
        onConfirm: null
      });
      return;
    }

    const message = `Are you sure you want to pay all employees their monthly salaries for ${monthName}?`;

    setModalConfig({
      isOpen: true,
      title: 'Confirm Bulk Salary Payment',
      message: message,
      type: 'confirm',
      onConfirm: async () => {
        try {
          const res = await api.post('payroll/pay-all/', { month: `${currentMonth}-01` });
          setModalConfig({
            isOpen: true,
            title: 'Payment Complete',
            message: `Successfully paid ${res.data.paid_count} employees. Skipped: ${res.data.skipped_count}`,
            type: 'success',
            onConfirm: null
          });
          fetchData(); // Refresh to update salary status
        } catch (err) {
          setModalConfig({
            isOpen: true,
            title: 'Payment Failed',
            message: err.response?.data?.error || 'Failed to process bulk payment',
            type: 'error',
            onConfirm: null
          });
        }
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Real-time validation
    let error = '';
    if (name === 'fullName') {
      if (/\d/.test(value)) error = 'Invalid: Numbers not allowed';
      else {
        const parts = value.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
          error = 'Invalid: First and last name cannot be same';
        }
      }
    } else if (name === 'department_name') {
      if (/[^a-zA-Z\s]/.test(value)) error = 'Invalid: Letters only';
    } else if (name === 'contact') {
      if (/[^0-9]/.test(value)) error = 'Invalid: Numbers only';
      else if (value.length > 10) error = 'Invalid: Max 10 digits';
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();

    // Final validation check
    if (fieldErrors.fullName || fieldErrors.department_name || fieldErrors.contact) return;

    const nameParts = formData.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setFieldErrors(prev => ({ ...prev, fullName: 'Please enter both first and last name' }));
      return;
    }
    if (nameParts[0].toLowerCase() === (nameParts[1] || '').toLowerCase()) {
      setFieldErrors(prev => ({ ...prev, fullName: 'First and last name cannot be same' }));
      return;
    }

    if (formData.contact.length !== 10) {
      setFieldErrors(prev => ({ ...prev, contact: 'Invalid: Must be exactly 10 digits' }));
      return;
    }

    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Employee';

    // Auto-generate unique username
    const generatedUsername = (firstName + (lastName ? '_' + lastName : '') + Math.floor(1000 + Math.random() * 9000)).toLowerCase().replace(/\s+/g, '');

    // Auto-generate unique complex password
    const generatedPassword = generateRandomPassword();

    const payload = {
      username: generatedUsername,
      password: generatedPassword,
      first_name: firstName,
      last_name: lastName,
      designation: 'Team Member',
      salary: 0,
      department_name: formData.department_name,
      phone_number: formData.contact
    };

    try {
      await api.post('add-employee/', payload);
      setShowAddModal(false);
      setNewCredentials({ username: generatedUsername, password: generatedPassword });
      setShowSuccessInfo(true);
      setFormData({ fullName: '', department_name: '', contact: '' });
      fetchData();
      console.log(`Employee Added! Username: ${generatedUsername}`);
    } catch (err) {
      console.error('Failed to add employee.', err);
      setError('Failed to add employee. Username might already exist.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`employees/${id}/delete/`);
      console.log('Employee deleted successfully');
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to delete employee', err);
    }
  };

  const formatName = (input) => {
    if (!input) return 'UNKNOWN';

    let firstPart = '';
    let lastPart = '';

    if (typeof input === 'object') {
      firstPart = (input.first_name || input.user_username || input.username || 'USER');
      lastPart = (input.last_name || '');
    } else {
      firstPart = input;
    }

    let first = firstPart.replace(/\d+/g, '').replace(/[\._]/g, ' ').trim();
    let last = lastPart.replace(/\d+/g, '').replace(/[\._]/g, ' ').trim();

    if (last.toUpperCase() === 'EMPLOYEE' && first.length > 0) last = '';

    const uFirst = first.toUpperCase();
    const uLast = last.toUpperCase();

    if (uLast && uFirst.includes(uLast)) return uFirst;
    return `${uFirst} ${uLast}`.trim();
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container admin-theme">
        <header className="dashboard-header">
          <div>
            <h1>Team Directory</h1>
            <p style={{ color: '#64748b' }}>A curated view of your organization's talent.</p>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="creative-add-btn" onClick={() => {
              if (!showAddModal) {
                setFormData({ fullName: '', department_name: '', contact: '' });
              }
              setShowAddModal(prev => !prev);
            }}>
              {showAddModal ? '× Close' : '+ Add Employee'}
            </button>
          </div>
        </header>




        {/* Simplified & Creative Add Form */}
        {showAddModal && (
          <div className="creative-form-section animate-slide-down">
            <div className="form-info-sidebar">
              <h3>Quick Add</h3>
              <p>Fill in the 3 essential details to onboard a new member instantly.</p>
              <div className="info-badge">Auto-generating credentials...</div>
            </div>
            <form onSubmit={handleAddEmployee} className="simplified-form" autoComplete="off">
              <div className="form-row-trio">
                <div className="creative-input-group">
                  <label>Employee Profile (Full Name)</label>
                  <input
                    name="fullName"
                    placeholder="e.g. John Doe"
                    required
                    onChange={handleInputChange}
                    value={formData.fullName}
                    autoComplete="off"
                    style={{ borderColor: fieldErrors.fullName ? '#ef4444' : '' }}
                  />
                  {fieldErrors.fullName && <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{fieldErrors.fullName}</small>}
                </div>
                <div className="creative-input-group">
                  <label>Department Name</label>
                  <input
                    name="department_name"
                    placeholder="e.g. Engineering, Sales, IT"
                    required
                    onChange={handleInputChange}
                    value={formData.department_name}
                    autoComplete="off"
                    list="dept-list"
                    style={{ borderColor: fieldErrors.department_name ? '#ef4444' : '' }}
                  />
                  <datalist id="dept-list">
                    {departments
                      .filter(d => employees.some(emp => emp.department && emp.department.name === d.name))
                      .map(d => <option key={d.id} value={d.name} />)
                    }
                  </datalist>
                  {fieldErrors.department_name && <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{fieldErrors.department_name}</small>}
                </div>
                <div className="creative-input-group">
                  <label>Contact Number</label>
                  <input
                    name="contact"
                    placeholder="e.g. 9876543210"
                    required
                    onChange={handleInputChange}
                    value={formData.contact}
                    autoComplete="off"
                    style={{ borderColor: fieldErrors.contact ? '#ef4444' : '' }}
                  />
                  {fieldErrors.contact && <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{fieldErrors.contact}</small>}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button type="submit" className="btn-save-creative">Complete Onboarding</button>
              </div>
            </form>
          </div>
        )}

        {/* Success Credentials Modal */}
        {showSuccessInfo && newCredentials && (
          <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="success-credential-card animate-slide-down">
              <div className="success-icon-wrapper">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 style={{ color: '#1e293b', marginBottom: '10px' }}>Onboarding Complete!</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px', padding: '0 10px' }}>
                Please share these credentials with the new team member to grant them access.
              </p>

              <div className="credential-box-premium">
                <div className="credential-item">
                  <small className="credential-label">USERNAME</small>
                  <div className="credential-value-wrapper">
                    <div className="credential-value">{newCredentials.username}</div>
                    <button className="copy-mini-btn" onClick={() => handleCopy(newCredentials.username)}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="credential-item">
                  <small className="credential-label">PASSWORD</small>
                  <div className="credential-value-wrapper">
                    <div className="credential-value" style={{ color: '#7c3aed' }}>{newCredentials.password}</div>
                    <button className="copy-mini-btn" onClick={() => handleCopy(newCredentials.password)}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '8px', display: 'block' }}>
                    (Default credentials for first-time access)
                  </small>
                </div>
              </div>

              <button
                className="close-dashboard-btn"
                style={{ width: '100%', padding: '15px' }}
                onClick={() => setShowSuccessInfo(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* Creative Filter & Search Bar */}
        <div className="creative-filter-bar animate-slide-up" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '25px', padding: '25px' }}>

          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
            <div className="department-pills-container" style={{ margin: 0, flex: 1 }}>
              <span className="pill-label" style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#94a3b8',
                letterSpacing: '1px',
                marginBottom: '10px',
                display: 'block'
              }}>FILTER BY TEAM:</span>
              <div className="pills-scroll-wrapper" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className={`dept-pill-btn ${filterDept === '' ? 'active' : ''}`}
                  onClick={() => setFilterDept('')}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '50px',
                    border: '1px solid #e2e8f0',
                    background: filterDept === '' ? '#3b82f6' : 'white',
                    color: filterDept === '' ? 'white' : '#64748b',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: filterDept === '' ? '0 10px 15px -3px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  All Members
                </button>
                {departments
                  .filter(d => d.status && employees.some(emp => emp.department && emp.department.name === d.name))
                  .map(d => (
                    <button
                      key={d.id}
                      className={`dept-pill-btn ${filterDept === d.name ? 'active' : ''}`}
                      onClick={() => setFilterDept(d.name)}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '50px',
                        border: '1px solid #e2e8f0',
                        background: filterDept === d.name ? '#3b82f6' : 'white',
                        color: filterDept === d.name ? 'white' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: filterDept === d.name ? '0 10px 15px -3px rgba(59, 130, 246, 0.3)' : 'none'
                      }}
                    >
                      {d.name.toUpperCase()}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div className="search-box-premium" style={{ width: '100%', maxWidth: 'none', margin: 0, position: 'relative' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, role or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>}

            {/* Search Suggestions Dropdown */}
            {searchTerm.trim() && (
              <div className="search-suggestions-overlay" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                zIndex: 1000,
                marginTop: '10px',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #f1f5f9'
              }}>
                {employees.filter((emp, idx) => {
                  const term = searchTerm.toLowerCase().trim();
                  const isNumeric = /^\d+$/.test(term);

                  if (isNumeric) {
                    return String(idx + 1) === term;
                  }

                  const nameStr = formatName(emp).toLowerCase();
                  const roleStr = (emp.designation || 'Specialist').toLowerCase();

                  // Match if search term starts any word in name or role
                  const searchRegex = new RegExp("\\b" + term, "i");
                  return searchRegex.test(nameStr) || searchRegex.test(roleStr);
                }).map(emp => (
                  <div
                    key={emp.id}
                    className="suggestion-item"
                    onClick={() => navigate(`/employee/${emp.id}`)}
                    style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid #f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#7c3aed',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {formatName(emp).charAt(0)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{formatName(emp)}</span>
                      <small style={{ color: '#94a3b8', fontSize: '11px' }}>{emp.designation || 'Specialist'} • #{employees.indexOf(emp) + 1}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Traditional List as Primary View */}
        <div className="directory-list-section animate-slide-up">
          <div className="section-header-compact">
            <h2>Detailed Employee Index</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="billing-month-compact">
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
              </div>
              <button
                onClick={() => navigate('/admin/payroll/history')}
                className="payment-history-btn"
              >
                <span className="btn-icon">📜</span>
                <span>Payment History</span>
              </button>
              <button
                onClick={handlePayAll}
                className="pay-all-btn"
              >
                <span className="btn-icon">💰</span>
                <span>Pay All</span>
              </button>
              <span className="count-badge">
                {employees.filter((emp, idx) => {
                  const matchesDept = filterDept === '' || (emp.department && emp.department.name === filterDept);
                  const term = searchTerm.toLowerCase().trim();
                  if (!term) return matchesDept;

                  const isNumeric = /^\d+$/.test(term);
                  if (isNumeric) return matchesDept && String(idx + 1) === term;

                  const nameStr = formatName(emp).toLowerCase();
                  const roleStr = (emp.designation || 'Specialist').toLowerCase();
                  const searchRegex = new RegExp("\\b" + term, "i");
                  const matchesSearch = searchRegex.test(nameStr) || searchRegex.test(roleStr);

                  return matchesDept && matchesSearch;
                }).length} Members
              </span>
            </div>
          </div>
          <div className="admin-table-container">
            <table className="creative-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Employee Profile</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Salary Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '40px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees
                  .filter((emp, idx) => {
                    const matchesDept = filterDept === '' || (emp.department && emp.department.name === filterDept);
                    const term = searchTerm.toLowerCase().trim();
                    if (!term) return matchesDept;

                    const isNumeric = /^\d+$/.test(term);
                    if (isNumeric) return matchesDept && String(idx + 1) === term;

                    const nameStr = formatName(emp).toLowerCase();
                    const roleStr = (emp.designation || 'Specialist').toLowerCase();
                    const searchRegex = new RegExp("\\b" + term, "i");
                    const matchesSearch = searchRegex.test(nameStr) || searchRegex.test(roleStr);

                    return matchesDept && matchesSearch;
                  })
                  .map((emp, index) => {
                    const displayName = formatName(emp);
                    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2);
                    const colors = ['#7c3aed', '#2563eb', '#db2777', '#059669', '#ea580c'];
                    const bgColor = colors[index % colors.length];
                    const payrollInfo = payrollMap[emp.id];
                    const salaryStatus = payrollInfo?.salary_status || 'PENDING';

                    return (
                      <tr key={emp.id} onClick={() => navigate(`/employee/${emp.id}`)}>
                        <td>{index + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="index-avatar" style={{ background: bgColor }}>
                              {initials || 'E'}
                            </div>
                            <div className="user-info-cell">
                              <strong style={{ fontSize: '15px' }}>{displayName}</strong>
                              <small>{emp.designation || 'Specialist'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {emp.department ? (
                            <span className="dept-pill" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                              {emp.department.name.toUpperCase()}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>Not Assigned</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '600', color: '#334155' }}>{emp.phone_number || 'No Phone'}</span>
                            {emp.user_email && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.user_email}</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {salaryStatus === 'PAID' ? (
                              <span
                                className="status-badge approved"
                                style={{ minWidth: '80px', textAlign: 'center', cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentModal({
                                    employee: displayName,
                                    amount: payrollInfo.amount_paid || '---',
                                    date: payrollInfo.payment_date || '---'
                                  });
                                }}
                                title="Click to view receipt"
                              >
                                PAID ℹ️
                              </span>
                            ) : (
                              <span className="status-badge pending" style={{ minWidth: '80px', textAlign: 'center' }}>
                                PENDING
                              </span>
                            )}

                            {salaryStatus === 'PENDING' && (
                              <button
                                className="btn-pay-now"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/payroll/pay/${emp.id}`);
                                }}
                                style={{
                                  background: '#22c55e',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="action-stack" style={{ justifyContent: 'flex-end', paddingRight: '20px' }}>
                            <button className="creative-btn creative-btn-view" onClick={(e) => { e.stopPropagation(); navigate(`/employee/${emp.id}`); }}>
                              <span>👁️</span> View
                            </button>
                            <button
                              className="creative-btn creative-btn-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalConfig({
                                  isOpen: true,
                                  title: 'Confirm Deletion',
                                  message: `Are you sure you want to delete ${displayName}? This action cannot be undone.`,
                                  type: 'confirm',
                                  onConfirm: () => {
                                    handleDelete(emp.id);
                                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                            >
                              <span>🗑️</span> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Detail Modal */}
        {paymentModal && (
          <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
            <div className="modal-content animate-slide-up" style={{ maxWidth: '400px', cursor: 'default' }} onClick={e => e.stopPropagation()}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                <h2 style={{ color: '#1e293b', marginBottom: '5px' }}>Payment Verified</h2>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Salary has been processed for this employee.</p>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginTop: '20px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>EMPLOYEE</span>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{paymentModal.employee}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>MONTHLY AMOUNT PAID</span>
                    <span style={{ fontWeight: 'bold', color: '#166534' }}>₹{paymentModal.amount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>PAYMENT DATE</span>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{new Date(paymentModal.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setPaymentModal(null)}
                  style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
          onConfirm={modalConfig.onConfirm}
        />

      </div>
    </div>
  );
}

export default Admin;
