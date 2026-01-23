import api from './axios';

const endpoints = {
    // Authentication
    login: (credentials) => api.post('login/', credentials),
    register: (userData) => api.post('register/', userData),

    // Employees
    getEmployees: () => api.get('employees/'),
    getEmployeeDetail: (id) => api.get(`employees/${id}/`),
    addEmployee: (employeeData) => api.post('add-employee/', employeeData),
    updateEmployee: (id, data) => api.put(`employees/${id}/update/`, data),
    deleteEmployee: (id) => api.delete(`employees/${id}/delete/`),

    // Attendance
    getAttendance: () => api.get('attendance/'),
    checkIn: () => api.post('attendance/check-in/'),
    checkOut: () => api.post('attendance/check-out/'),
    getEmployeeAttendance: (employeeId) => api.get(`employees/${employeeId}/attendance/`),

    // Departments
    getDepartments: () => api.get('departments/'),

    // Profile (User)
    getMyProfile: () => api.get('profile/me/'),
    updateMyProfile: (data) => api.put('profile/update/', data),

    // Profile Requests (Admin)
    getProfileRequests: () => api.get('profile/requests/'),
    handleProfileRequest: (requestId, data) => api.post(`profile/requests/${requestId}/handle/`, data),
};

export default endpoints;
