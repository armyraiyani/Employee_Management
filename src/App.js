import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Home from './Home';
import Admin from './Admin';
import Attendance from './Attendance';
import Employee from './Employee';
import EmployeeDetail from './EmployeeDetail';
import EmployeeAttendanceDetail from './EmployeeAttendanceDetail';
import MyPayroll from './MyPayroll';
import PayrollAction from './PayrollAction';
import AdminPayrollHistory from './AdminPayrollHistory';
import { Overview, Features, Security, AboutUs, Contact, PrivacyPolicy } from './InfoPages';
import './App.css';

const PrivateRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Footer Info Pages */}
        <Route path="/overview" element={<Overview />} />
        <Route path="/features" element={<Features />} />
        <Route path="/security" element={<Security />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        <Route
          path="/attendance"
          element={
            <PrivateRoute>
              <Attendance />
            </PrivateRoute>
          }
        />

        <Route
          path="/employee/:id"
          element={
            <PrivateRoute>
              <EmployeeDetail />
            </PrivateRoute>
          }
        />

        <Route
          path="/employee/:id/attendance"
          element={
            <PrivateRoute allowedRole="ADMIN">
              <EmployeeAttendanceDetail />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRole="ADMIN">
              <Admin />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/payroll/pay/:id"
          element={
            <PrivateRoute allowedRole="ADMIN">
              <PayrollAction />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/payroll/history"
          element={
            <PrivateRoute allowedRole="ADMIN">
              <AdminPayrollHistory />
            </PrivateRoute>
          }
        />

        <Route
          path="/employee/payroll"
          element={
            <PrivateRoute>
              <MyPayroll />
            </PrivateRoute>
          }
        />

        <Route
          path="/employee"
          element={
            <PrivateRoute>
              <Employee />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
