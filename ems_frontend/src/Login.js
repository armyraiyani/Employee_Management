import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from './api/axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('EMPLOYEE');
  const [rememberMe, setRememberMe] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const accs = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
    setSavedAccounts(accs);

    // If we have accounts, maybe we pre-fill the last used one?
    // Or just let user click the card. We'll leave the form empty initially for clarity.
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('login/', { username, password });
      const { token, role, user_id } = response.data;

      // Auth data
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('user_id', user_id);

      // ALWAYS store temporarily for the logout "Save" feature
      localStorage.setItem('last_username', username);
      localStorage.setItem('last_password', password);

      // Handle Immediate Persistence (Remember Me checkbox)
      if (rememberMe) {
        const savedAccounts = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
        const accountData = {
          username,
          password,
          firstName: role === 'ADMIN' ? 'Admin' : 'Employee', // Placeholder if we don't have user object here
          lastName: '',
          email: '',
          role: role,
          lastUsed: new Date().toISOString()
        };

        const existingIndex = savedAccounts.findIndex(acc => acc.username === username);
        if (existingIndex > -1) {
          savedAccounts[existingIndex] = { ...savedAccounts[existingIndex], ...accountData };
        } else {
          savedAccounts.push(accountData);
        }
        localStorage.setItem('saved_accounts', JSON.stringify(savedAccounts));
        localStorage.setItem('remember_me_on_login', 'true');
      }

      // Redirect based on role
      if (role !== selectedRole) {
        setError(`Invalid credentials for ${selectedRole.toLowerCase()} role.`);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        return;
      }

      if (role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Invalid username or password. Please check your credentials.');
      } else {
        setError('Connection error. Please try again later.');
      }
      console.error("Login Error:", err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Enter your credentials to access your account</p>

        {error && <div className="error-message">{error}</div>}

        {savedAccounts.length > 0 && (
          <div className="saved-accounts-container" style={{ marginBottom: '25px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textAlign: 'left' }}>Saved Accounts</p>
            <div className="accounts-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {savedAccounts.map(acc => (
                <div key={acc.username} className="saved-account-card animate-fade-in" style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: '0.3s'
                }}
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword(acc.password);
                    setSelectedRole(acc.role);
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      background: 'linear-gradient(135deg, #4f46e5, #ec4899)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {acc.username[0].toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '14px' }}>
                        {acc.firstName ? `${acc.firstName} ${acc.lastName}` : acc.username}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {acc.role} • {acc.email || 'Saved credentials'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const filtered = savedAccounts.filter(a => a.username !== acc.username);
                      setSavedAccounts(filtered);
                      localStorage.setItem('saved_accounts', JSON.stringify(filtered));
                      if (filtered.length === 0) localStorage.removeItem('remember_me_on_login');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '18px',
                      cursor: 'pointer',
                      opacity: 0.6
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="role-switcher-container">
          <div
            className={`role-option ${selectedRole === 'ADMIN' ? 'active' : ''}`}
            onClick={() => setSelectedRole('ADMIN')}
          >
            Admin
          </div>
          <div
            className={`role-option ${selectedRole === 'EMPLOYEE' ? 'active' : ''}`}
            onClick={() => setSelectedRole('EMPLOYEE')}
          >
            Employee
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form" autoComplete="off">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group remember-me-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            <label htmlFor="rememberMe" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '14px', color: '#64748b' }}>
              Remember Me
            </label>
          </div>

          <button type="submit" className="login-button">Sign In</button>
        </form>

        <div className="auth-footer">
          <Link to="/" className="back-link">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
