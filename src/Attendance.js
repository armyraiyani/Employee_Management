import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import api from './api/axios';
import AttendanceCalendar from './AttendanceCalendar';
import './Attendance.css';

function Attendance() {
    const [attendanceData, setAttendanceData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [marking, setMarking] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [holidays, setHolidays] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
    const [showHolidaySidebar, setShowHolidaySidebar] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [schedule, setSchedule] = useState({
        standard_check_in: '09:00:00',
        standard_check_out: '18:00:00',
        check_in_tolerance: 15,
        check_out_tolerance: 15,
        half_day_threshold: '14:00:00',
        off_days: '0'
    });
    const [alert, setAlert] = useState({ show: false, message: '' });
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reportDetail, setReportDetail] = useState(null);
    const [showMonthReport, setShowMonthReport] = useState(false);
    const [statFilter, setStatFilter] = useState('All'); // 'All', 'Present', 'Absent', 'Half Day'
    const [prompt, setPrompt] = useState({ show: false, message: '', onConfirm: null });
    const [showReferenceSidebar, setShowReferenceSidebar] = useState(false);
    const GAZETTED_2026 = [
        { date: '2026-01-14', name: 'Makar Sankranti' },
        { date: '2026-01-26', name: 'Republic Day' },
        { date: '2026-02-26', name: 'Maha Shivaratri' },
        { date: '2026-03-04', name: 'Holi' },
        { date: '2026-03-20', name: 'Eid-ul-Fitr' },
        { date: '2026-04-03', name: 'Good Friday' },
        { date: '2026-04-14', name: 'Ambedkar Jayanti' },
        { date: '2026-06-07', name: 'Eid-ul-Adha' },
        { date: '2026-08-03', name: 'Raksha Bandhan' },
        { date: '2026-08-15', name: 'Independence Day' },
        { date: '2026-10-02', name: 'Gandhi Jayanti' },
        { date: '2026-10-21', name: 'Dussehra' },
        { date: '2026-11-08', name: 'Diwali' },
        { date: '2026-12-25', name: 'Christmas' }
    ];
    const role = localStorage.getItem('role');
    const navigate = useNavigate();

    const fetchAttendance = async () => {
        try {
            const timestamp = Date.now();
            const [attRes, empRes, holRes, schRes, leaveRes] = await Promise.all([
                api.get(`attendance/?t=${timestamp}`),
                role === 'ADMIN' ? api.get(`employees/?t=${timestamp}`) : api.get(`profile/me/?t=${timestamp}`),
                api.get(`attendance/holidays/?t=${timestamp}`),
                api.get(`attendance/schedule/?t=${timestamp}`),
                api.get(role === 'ADMIN' ? `leaves/all/?t=${timestamp}` : `leaves/?t=${timestamp}`)
            ]);
            setAttendanceData(attRes.data);
            if (role === 'ADMIN') {
                setEmployees(empRes.data);
            } else {
                setEmployees([empRes.data]); // Contain self in employees array for unified access
            }
            setHolidays(holRes.data);
            setSchedule(schRes.data);
            setLeaves(leaveRes.data);
            setLoading(false);
        } catch (err) {
            console.error("Attendance fetch error:", err);
            setError('Failed to load attendance records.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, []);

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

    const formatTime12h = (timeStr) => {
        if (!timeStr || timeStr === '--:--' || timeStr === '-' || timeStr.includes('--')) return '--:--';
        try {
            const parts = timeStr.split(':');
            let h = parseInt(parts[0]);
            const m = parts[1];
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12;
            return `${h}:${m} ${ampm}`;
        } catch (e) {
            return timeStr;
        }
    };

    const isOffDay = (dateStr) => {
        if (!schedule.off_days) return false;
        try {
            const day = new Date(dateStr + 'T00:00:00').getDay();
            return schedule.off_days.split(',').map(d => d.trim()).includes(day.toString());
        } catch (e) { return false; }
    };

    const handleMarkAttendance = async (action) => {
        // Enforce single check-in/out on frontend
        const today = new Date().toISOString().split('T')[0];
        const record = attendanceData.find(r => r.date === today && (role === 'EMPLOYEE' ? true : false));
        // Note: For employees, attData usually only contains their own records 
        // if the API is scoped. But let's check correctly.

        const existing = attendanceData.find(r => r.date === today);

        if (action === 'check-in' && existing?.check_in_time) {
            triggerAlert("you can do only once");
            return;
        }
        if (action === 'check-out' && existing?.check_out_time) {
            triggerAlert("you can do only once");
            return;
        }

        setMarking(true);
        try {
            await api.post('attendance/mark/', { action });
            fetchAttendance();
        } catch (err) {
            console.error("Mark error:", err);
            if (err.response?.data?.message) {
                // If backend returns already checked in/out, use the specific message
                if (err.response.data.message.toLowerCase().includes("already")) {
                    triggerAlert("you can do only once");
                } else {
                    triggerAlert(err.response.data.message);
                }
            }
        } finally {
            setMarking(false);
        }
    };

    const triggerAlert = (msg) => {
        setAlert({ show: true, message: msg });
        setTimeout(() => setAlert({ show: false, message: '' }), 500);
    };

    const handleAddHoliday = async () => {
        if (!newHoliday.name || !newHoliday.date) {
            setAlert({ show: true, message: 'Please fill all details' });
            setTimeout(() => setAlert({ show: false, message: '' }), 2000);
            return;
        }

        // Validate holiday name - must contain at least one vowel and be alphabetic with spaces/hyphens
        const namePattern = /^[a-zA-Z\s\-']+$/;
        const hasVowel = /[aeiouAEIOU]/.test(newHoliday.name);

        if (!namePattern.test(newHoliday.name)) {
            setAlert({ show: true, message: 'Invalid holiday name. Use only letters, spaces, and hyphens.' });
            setTimeout(() => setAlert({ show: false, message: '' }), 2000);
            return;
        }

        if (!hasVowel || newHoliday.name.trim().length < 3) {
            setAlert({ show: true, message: 'Please enter a valid holiday name (minimum 3 characters).' });
            setTimeout(() => setAlert({ show: false, message: '' }), 2000);
            return;
        }

        // Validate date - must be a valid date
        const selectedDate = new Date(newHoliday.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(selectedDate.getTime())) {
            setAlert({ show: true, message: 'Invalid date selected.' });
            setTimeout(() => setAlert({ show: false, message: '' }), 2000);
            return;
        }

        // Check if date is too far in the past (more than 1 year ago)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (selectedDate < oneYearAgo) {
            setAlert({ show: true, message: 'Cannot add holidays from more than 1 year ago.' });
            setTimeout(() => setAlert({ show: false, message: '' }), 2000);
            return;
        }

        // Check for duplicate holidays (same date)
        const duplicateByDate = holidays.find(h => h.date === newHoliday.date);
        if (duplicateByDate) {
            setAlert({ show: true, message: `A holiday "${duplicateByDate.name}" already exists on ${new Date(newHoliday.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.` });
            setTimeout(() => setAlert({ show: false, message: '' }), 3000);
            return;
        }

        // Check for duplicate holidays (same name - case insensitive)
        const normalizedInputName = newHoliday.name.toLowerCase().trim();
        const duplicateByName = holidays.find(h => h.name.toLowerCase().trim() === normalizedInputName);
        if (duplicateByName) {
            setAlert({ show: true, message: `Holiday "${duplicateByName.name}" is already given on ${new Date(duplicateByName.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.` });
            setTimeout(() => setAlert({ show: false, message: '' }), 3000);
            return;
        }

        // Real-world holiday validation - FLEXIBLE MODE
        const normalizedName = newHoliday.name.toLowerCase().trim();
        const [year, month, day] = newHoliday.date.split('-');
        const monthDay = `${month}-${day}`;

        // Normalize function: remove spaces, apostrophes, hyphens for flexible matching
        const normalize = (str) => str.toLowerCase().replace(/[\s\-']/g, '');

        // Enhanced validation: Check if it looks like a real holiday name
        const isValidHolidayPattern = (name) => {
            // Must be at least 3 characters
            if (name.length < 3) return false;

            // Must be alphabetic with spaces, hyphens, apostrophes only (NO NUMBERS OR SPECIAL CHARS)
            if (!/^[a-zA-Z\s\-']+$/.test(name)) return false;

            const cleanName = name.replace(/[\s\-']/g, '').toLowerCase();

            // Must contain at least 2 vowels (most real words have multiple vowels)
            const vowelCount = (cleanName.match(/[aeiou]/g) || []).length;
            if (vowelCount < 2) return false;

            // Vowel to consonant ratio check (real words have reasonable ratios)
            const consonantCount = (cleanName.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
            if (vowelCount === 0 || consonantCount / vowelCount > 4) return false;

            // Should not have more than 3 consecutive consonants
            if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(cleanName)) return false;

            // Should not have more than 3 consecutive vowels (rare in real words)
            if (/[aeiou]{4,}/i.test(cleanName)) return false;

            // Should not have repeating characters more than 2 times
            if (/(.)\1{2,}/.test(cleanName)) return false;

            // Check for common gibberish patterns (alternating random consonants and vowels)
            // Real words don't usually have patterns like "xuxux" or "hshsh"
            if (/([bcdfghjklmnpqrstvwxyz][aeiou])\1{2,}/i.test(cleanName)) return false;

            // Must have at least one common letter combination found in real words
            const commonPatterns = [
                /th|ch|sh|ph|wh|tion|sion|ness|ment|ing|ed|er|ly|al|ar|en|on|an|in|or|at|es|is|it/i,
                /dh|bh|gh|kh|ji|ti|di|ni|ri|vi|li|mi|si|ya|va|ma|na|ra|la|ka|da|ba|ga/i, // Indian language patterns
                /aa|ee|oo|ai|ei|ou|au|ay|ey|oy/i // Common vowel combinations
            ];

            const hasCommonPattern = commonPatterns.some(pattern => pattern.test(cleanName));
            if (!hasCommonPattern && cleanName.length > 6) return false;

            return true;
        };

        // Known holidays database for exact date validation
        const knownHolidaysWithDates = {
            // Fixed date holidays
            'christmas': '12-25',
            'new year': '01-01',
            'newyear': '01-01',
            'newyearsday': '01-01',
            'independence day': '08-15',
            'independenceday': '08-15',
            'republic day': '01-26',
            'republicday': '01-26',
            'gandhi jayanti': '10-02',
            'gandhijayanti': '10-02',
            'ambedkar jayanti': '04-14',
            'ambedkarjayanti': '04-14',
            'labour day': '05-01',
            'labourday': '05-01',
            'may day': '05-01',
            'mayday': '05-01',
            'makar sankranti': '01-14',
            'makarsankranti': '01-14',
            'sankranti': '01-14',
            'pongal': '01-14',
            'lohri': '01-13',
            'valentinesday': '02-14',
            'valentineday': '02-14',
            'womensday': '03-08',
            'womenday': '03-08',
            'environmentday': '06-05',
            'yogaday': '06-21',
            'teachersday': '09-05',
            'teacherday': '09-05',
            'childrensday': '11-14',
            'childrenday': '11-14',
        };

        // 2026 specific movable holidays
        const movableHolidays2026 = {
            'holi': '2026-03-04',
            'dhuleti': '2026-03-05',
            'rangpanchami': '2026-03-09',
            'mahashivaratri': '2026-02-26',
            'shivaratri': '2026-02-26',
            'eidulfitr': '2026-03-20',
            'eid': '2026-03-20',
            'goodfriday': '2026-04-03',
            'eiduladha': '2026-06-07',
            'bakrid': '2026-06-07',
            'dussehra': '2026-10-21',
            'vijayadashami': '2026-10-21',
            'diwali': '2026-11-08',
            'deepavali': '2026-11-08',
        };

        // Validate the holiday name pattern
        if (!isValidHolidayPattern(normalizedName)) {
            setAlert({ show: true, message: `"${newHoliday.name}" doesn't appear to be a valid holiday name. Please use proper words.` });
            setTimeout(() => setAlert({ show: false, message: '' }), 3500);
            return;
        }

        // For known holidays, validate the exact date
        const normalizedInput = normalize(normalizedName);
        let dateValidationFailed = false;
        let expectedDateStr = '';

        // Check if it's a known fixed-date holiday
        for (const [holidayName, expectedDate] of Object.entries(knownHolidaysWithDates)) {
            if (normalize(holidayName) === normalizedInput) {
                if (expectedDate !== monthDay) {
                    dateValidationFailed = true;
                    expectedDateStr = expectedDate;
                }
                break;
            }
        }

        // Check if it's a known 2026 movable holiday
        if (year === '2026') {
            for (const [holidayName, expectedFullDate] of Object.entries(movableHolidays2026)) {
                if (normalize(holidayName) === normalizedInput) {
                    if (expectedFullDate !== newHoliday.date) {
                        dateValidationFailed = true;
                        expectedDateStr = expectedFullDate;
                    }
                    break;
                }
            }
        }

        if (dateValidationFailed) {
            // Show confirmation instead of blocking
            setPrompt({
                show: true,
                message: `"${newHoliday.name}" typically falls on ${new Date(expectedDateStr.includes('-') ? `2026-${expectedDateStr}` : expectedDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, but you selected ${new Date(newHoliday.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Are you sure you want to continue?`,
                onConfirm: async () => {
                    try {
                        await api.post('attendance/holidays/', newHoliday);
                        setNewHoliday({ date: '', name: '' });
                        setAlert({ show: true, message: 'Holiday added successfully!' });
                        setTimeout(() => setAlert({ show: false, message: '' }), 1500);
                        fetchAttendance();
                    } catch (e) {
                        setAlert({ show: true, message: 'Failed to add holiday' });
                        setTimeout(() => setAlert({ show: false, message: '' }), 2000);
                    }
                }
            });
            return;
        }

        // Show confirmation for all holiday saves
        setPrompt({
            show: true,
            message: `Add "${newHoliday.name}" on ${new Date(newHoliday.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} as a holiday?`,
            onConfirm: async () => {
                try {
                    await api.post('attendance/holidays/', newHoliday);
                    setNewHoliday({ date: '', name: '' });
                    setAlert({ show: true, message: 'Holiday added successfully!' });
                    setTimeout(() => setAlert({ show: false, message: '' }), 1500);
                    fetchAttendance();
                } catch (e) {
                    setAlert({ show: true, message: 'Failed to add holiday' });
                    setTimeout(() => setAlert({ show: false, message: '' }), 2000);
                }
            }
        });
    };

    const deleteHoliday = async (id) => {
        setPrompt({
            show: true,
            message: "Permantly remove this holiday from the schedule?",
            onConfirm: async () => {
                try {
                    await api.delete(`attendance/holidays/${id}/`);
                    fetchAttendance();
                } catch (e) {
                    setAlert({ show: true, message: "Failed to delete" });
                    setTimeout(() => setAlert({ show: false, message: '' }), 2000);
                }
            }
        });
    };

    const handleUpdateSchedule = async () => {
        try {
            await api.post('attendance/schedule/', schedule);
            setShowScheduleModal(false);
            fetchAttendance();
        } catch (e) {
            console.error("Update failed", e);
            alert("Failed to update schedule");
        }
    };

    const getStatusBadge = (status, onClick = null) => {
        const cursorStyle = onClick ? { cursor: 'pointer' } : {};
        switch (status) {
            case 'Present': return <span className="status-badge present" style={cursorStyle} onClick={onClick}>Present</span>;
            case 'Absent': return <span className="status-badge absent" style={cursorStyle} onClick={onClick}>Absent</span>;
            case 'Pending': return <span className="status-badge pending" style={cursorStyle} onClick={onClick}>Pending</span>;
            case 'Half Day': return <span className="status-badge half-day" style={cursorStyle} onClick={onClick}>Half Day</span>;
            case 'Leave': return <span className="status-badge leave" style={cursorStyle} onClick={onClick}>On Leave</span>;
            case 'Holiday': return <span className="status-badge holiday" style={{ ...cursorStyle, background: '#ecfdf5', color: '#059669', border: '1px solid #10b981' }} onClick={onClick}>Holiday</span>;
            case 'Off Day': return <span className="status-badge holiday" style={{ ...cursorStyle, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }} onClick={onClick}>Off Day</span>;
            default: return <span className="status-badge absent" style={cursorStyle} onClick={onClick}>Absent</span>;
        }
    };

    const getRemarksColor = (remarks) => {
        if (!remarks || remarks === '-') return '#64748b'; // Muted Slate
        if (remarks === 'Late') return '#ef4444'; // Red
        if (remarks.toLowerCase().includes('leave') || remarks.toLowerCase().includes('sync')) return '#d97706'; // Amber/Orange
        return '#10b981'; // Green for On Time / Positive
    };

    const handleStatusOverride = async (empId, date, currentStatus) => {
        if (role !== 'ADMIN') return;

        // As per requirement: allow forcing Absent on click of Present, 
        // but we'll allow toggling in general for quality of life.
        const targetStatus = currentStatus === 'Absent' ? 'Present' : 'Absent';

        setPrompt({
            show: true,
            message: `Do you want to manually mark ${formatName(employees.find(e => e.id === empId))} as ${targetStatus.toUpperCase()} for ${date}?`,
            onConfirm: async () => {
                try {
                    await api.post('attendance/override/', {
                        employee_id: empId,
                        date: date,
                        status: targetStatus
                    });
                    fetchAttendance();
                    setAlert({ show: true, message: `Updated to ${targetStatus}` });
                    setTimeout(() => setAlert({ show: false, message: '' }), 1500);
                } catch (e) {
                    setAlert({ show: true, message: "Manual update failed" });
                    setTimeout(() => setAlert({ show: false, message: '' }), 2000);
                }
            }
        });
    };

    // Filter logic for Admin: One row per employee for the selected date
    const getAdminAttendanceSheet = () => {
        const isHoliday = holidays.some(h => h.date === selectedDate);

        return employees
            .filter(emp => !emp.date_of_joining || emp.date_of_joining <= selectedDate)
            .map(emp => {
                const records = attendanceData.filter(r => r.employee === emp.id && r.date === selectedDate);
                const latest = records.length > 0 ? records[0] : null;

                // Check for Approved Leave
                const isOnLeave = leaves.some(leave =>
                    leave.employee === emp.id &&
                    leave.status === 'APPROVED' &&
                    selectedDate >= leave.start_date &&
                    selectedDate <= leave.end_date
                );

                const todayStr = new Date().toISOString().split('T')[0];
                const isDateOff = isOffDay(selectedDate);

                // Determine status with refined logic
                let finalStatus;
                if (isOnLeave) {
                    finalStatus = 'Leave';
                } else if (isHoliday) {
                    finalStatus = 'Holiday';
                } else if (isDateOff) {
                    finalStatus = 'Off Day';
                } else if (latest) {
                    // If there's a record, use its status
                    finalStatus = latest.status;
                } else {
                    // No attendance record
                    if (selectedDate > todayStr) {
                        finalStatus = 'Pending';
                    } else if (selectedDate === todayStr) {
                        // Check if shift has started
                        const now = new Date();
                        const currentTime = now.toTimeString().split(' ')[0];
                        const shiftStartTime = schedule.standard_check_in || '09:00:00';

                        if (currentTime < shiftStartTime) {
                            finalStatus = 'Pending';
                        } else {
                            finalStatus = 'Absent';
                        }
                    } else {
                        // Past date with no record
                        finalStatus = 'Absent';
                    }
                }

                return {
                    ...emp,
                    status: finalStatus,
                    check_in: latest ? latest.check_in_time : '--:--',
                    check_out: latest ? latest.check_out_time : '--:--',
                    remarks: latest ? latest.remarks : (isOnLeave ? 'On Leave' : (isDateOff ? 'Weekly Off' : '-'))
                };
            });
    };

    return (
        <div className="attendance-page-wrapper">
            <Navbar />

            <div className="attendance-header-section">
                <div className="header-glow"></div>
                <div className="dashboard-container">
                    <div className="attendance-header-content">
                        <div>
                            <h1 style={{ color: '#0f172a', fontWeight: '900' }}>Attendance Dashboard</h1>
                            <p style={{ color: '#64748b' }}>{role === 'ADMIN' ? 'Staff presence overview' : 'Your personal attendance history'}</p>
                        </div>

                        {role === 'EMPLOYEE' && (
                            <div className="view-toggle-container-header">
                                <div className="toggle-group-premium">
                                    <button
                                        className={`toggle-btn-premium ${viewMode === 'table' ? 'active' : ''}`}
                                        onClick={() => setViewMode('table')}
                                    >
                                        List
                                    </button>
                                    <button
                                        className={`toggle-btn-premium ${viewMode === 'calendar' ? 'active' : ''}`}
                                        onClick={() => setViewMode('calendar')}
                                    >
                                        Calendar
                                    </button>
                                    <div className={`toggle-slider ${viewMode}`}></div>
                                </div>
                            </div>
                        )}

                        <div className="attendance-actions">
                            {role === 'ADMIN' && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="month"
                                            className="date-picker-premium"
                                            style={{ paddingRight: '45px' }}
                                            value={reportMonth}
                                            onChange={(e) => setReportMonth(e.target.value)}
                                        />
                                        <button
                                            onClick={() => setShowMonthReport(true)}
                                            style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                                            title="View Monthly Summary"
                                        >
                                            📊
                                        </button>
                                    </div>
                                    <input
                                        type="date"
                                        className="date-picker-premium"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                            )}
                            {role === 'EMPLOYEE' && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button
                                        className="mark-btn check-in"
                                        disabled={marking}
                                        onClick={() => handleMarkAttendance('check-in')}
                                    >
                                        Check In
                                    </button>
                                    <button
                                        className="mark-btn check-out"
                                        disabled={marking}
                                        onClick={() => handleMarkAttendance('check-out')}
                                    >
                                        Check Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-container">
                <div className="attendance-content-grid">
                    {/* ... stats grid ... */}
                    {/* Summary Cards for Admin */}
                    {/* ... (keep existing code for admin stats and employee stats) ... */}
                    {/* Summary Cards for Admin */}
                    {role === 'ADMIN' && (
                        <div className="sidebar-stats" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', width: '100%' }}>
                            {/* Stats Filtering Bar */}
                            <div className="stat-pill" style={{ background: '#fff', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                    className={`stat-pill-item ${statFilter === 'All' ? 'active-filter' : ''}`}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: '0.3s' }}
                                    onClick={() => setStatFilter('All')}
                                >
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{employees.length}</div>
                                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Show All</span>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
                                <div
                                    className={`stat-pill-item ${statFilter === 'Present' ? 'active-filter' : ''}`}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: '0.3s' }}
                                    onClick={() => setStatFilter(statFilter === 'Present' ? 'All' : 'Present')}
                                >
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a' }}>
                                        {getAdminAttendanceSheet().filter(r => r.status === 'Present').length}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Present Today</span>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
                                <div
                                    className={`stat-pill-item ${statFilter === 'Absent' ? 'active-filter' : ''}`}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: '0.3s' }}
                                    onClick={() => setStatFilter(statFilter === 'Absent' ? 'All' : 'Absent')}
                                >
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>
                                        {getAdminAttendanceSheet().filter(r => r.status === 'Absent').length}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Absent Today</span>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
                                <div
                                    className={`stat-pill-item ${statFilter === 'Half Day' ? 'active-filter' : ''}`}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: '0.3s' }}
                                    onClick={() => setStatFilter(statFilter === 'Half Day' ? 'All' : 'Half Day')}
                                >
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706' }}>
                                        {getAdminAttendanceSheet().filter(r => r.status === 'Half Day').length}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#d97706', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Half Day</span>
                                </div>
                            </div>

                            {/* Shift & Holidays Bar (Same as upper) */}
                            <div className="stat-pill" style={{ background: '#fff', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                    <button
                                        className="mini-setting-btn-premium"
                                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', flex: 1 }}
                                        onClick={() => setShowScheduleModal(true)}
                                    >
                                        <span className="btn-icon" style={{ background: '#f5f3ff' }}>⚙️</span>
                                        <div className="btn-text-wrapper">
                                            <span className="btn-label-top" style={{ color: '#1e293b' }}>Shift</span>
                                            <span className="btn-label-bottom">Settings</span>
                                        </div>
                                    </button>
                                    <button
                                        className="mini-setting-btn-premium"
                                        style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', flex: 1, color: '#0f766e' }}
                                        onClick={() => setShowHolidaySidebar(true)}
                                    >
                                        <span className="btn-icon" style={{ background: '#ecfdf5' }}>🌴</span>
                                        <div className="btn-text-wrapper">
                                            <span className="btn-label-top" style={{ color: '#0f766e' }}>Office</span>
                                            <span className="btn-label-bottom">Holidays</span>
                                        </div>
                                    </button>
                                </div>
                                <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '15px', minWidth: '100px' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Active Shift</div>
                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                        {formatTime12h(schedule.standard_check_in)} - {formatTime12h(schedule.standard_check_out)}
                                    </div>
                                </div>
                                <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '15px', minWidth: '80px' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Half Day</div>
                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                        {formatTime12h(schedule.half_day_threshold)}
                                    </div>
                                </div>
                                <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '15px', minWidth: '90px' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Off Days</div>
                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6' }}>
                                        {schedule.off_days?.split(',').map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(d.trim())]).join(', ') || 'None'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Cards for Employee */}
                    {role === 'EMPLOYEE' && (
                        <div className="sidebar-stats" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 0.8fr)', gap: '12px', marginBottom: '20px', width: '100%' }}>
                            <div className="stat-pill" style={{ background: '#fff', padding: '12px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ flex: 1.2 }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.3px' }}>My Active Shift</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
                                        {formatTime12h(schedule.standard_check_in)} - {formatTime12h(schedule.standard_check_out)}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', opacity: 0.8 }}>
                                        ± {schedule.check_in_tolerance}m In / {schedule.check_out_tolerance}m Out
                                    </div>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.3px' }}>Half Day</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{formatTime12h(schedule.half_day_threshold)}</div>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }}></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.3px' }}>Off Days</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#3b82f6' }}>
                                        {schedule.off_days?.split(',').map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(d.trim())]).join(', ') || 'None'}
                                    </div>
                                </div>
                            </div>
                            <div className="stat-pill" style={{ background: '#f0fdfa', padding: '10px', borderRadius: '14px', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 8px rgba(20, 184, 166, 0.05)' }} onClick={() => setShowHolidaySidebar(true)}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '18px', marginBottom: '0px' }}>🌴</div>
                                    <div style={{ fontSize: '10px', color: '#0f766e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Holidays</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {viewMode === 'calendar' && role === 'EMPLOYEE' ? (
                        <AttendanceCalendar
                            attendanceData={attendanceData}
                            holidays={holidays}
                            schedule={schedule}
                            joiningDate={employees[0]?.date_of_joining}
                        />
                    ) : (
                        <div className="attendance-main-card animate-slide-up">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>{role === 'ADMIN' ? `Daily Status: ${selectedDate}` : 'My Logs'}</h3>
                                {role === 'EMPLOYEE' && <span className="count-badge">{attendanceData.length} records</span>}
                            </div>

                            {loading ? (
                                <div className="table-loader">Syncing workforce data...</div>
                            ) : error ? (
                                <div className="error-card">{error}</div>
                            ) : isOffDay(selectedDate) ? (
                                <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏡</div>
                                    <h2 style={{ color: '#1e293b', fontWeight: '800', marginBottom: '10px' }}>Off Day / Weekend</h2>
                                    <p style={{ color: '#64748b', fontSize: '15px' }}>Attendance tracking is disabled for this day as per the office schedule.</p>
                                </div>
                            ) : (
                                <div className="table-wrapper-premium">
                                    <table className="premium-table">
                                        <thead>
                                            <tr>
                                                {role === 'ADMIN' ? (
                                                    <>
                                                        <th>Employee Name</th>
                                                        <th>Department</th>
                                                        <th>Status</th>
                                                        <th>Remarks</th>
                                                        <th>Check In</th>
                                                        <th>Check Out</th>
                                                        <th>Full History</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th>Date</th>
                                                        <th>Status</th>
                                                        <th>Remarks</th>
                                                        <th>Check In</th>
                                                        <th>Check Out</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {role === 'ADMIN' ? (
                                                getAdminAttendanceSheet()
                                                    .filter(row => statFilter === 'All' || row.status === statFilter)
                                                    .map((row) => (
                                                        <tr key={row.id}>
                                                            <td className="emp-name-cell" style={{ textTransform: 'uppercase' }}>{formatName(row)}</td>
                                                            <td>{row.department?.name || 'Unassigned'}</td>
                                                            <td>{getStatusBadge(row.status, () => handleStatusOverride(row.id, selectedDate, row.status))}</td>
                                                            <td style={{ fontWeight: '500', color: getRemarksColor(row.remarks) }}>
                                                                {row.remarks || '-'}
                                                            </td>
                                                            <td className="time-text">{formatTime12h(row.check_in)}</td>
                                                            <td className="time-text">{formatTime12h(row.check_out)}</td>
                                                            <td>
                                                                <button
                                                                    className="view-mini-btn"
                                                                    onClick={() => navigate(`/employee/${row.id}/attendance`)}
                                                                >
                                                                    View Logs
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                            ) : (
                                                attendanceData.map((record) => (
                                                    <tr key={record.id}>
                                                        <td><span className="date-text">{record.date}</span></td>
                                                        <td>{getStatusBadge(record.status)}</td>
                                                        <td style={{ fontWeight: '500', color: getRemarksColor(record.remarks) }}>
                                                            {record.remarks || '-'}
                                                        </td>
                                                        <td className="time-text">{formatTime12h(record.check_in_time)}</td>
                                                        <td className="time-text">{formatTime12h(record.check_out_time)}</td>
                                                    </tr>
                                                ))
                                            )}
                                            {((role === 'ADMIN' && employees.length === 0) || (role === 'EMPLOYEE' && attendanceData.length === 0)) && (
                                                <tr>
                                                    <td colSpan={role === 'ADMIN' ? 7 : 5} className="empty-state">
                                                        No attendance logs found for this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Holiday Sidebar */}
            <div className={`notification-sidebar ${showHolidaySidebar ? 'active' : ''}`} style={{ zIndex: 2005, borderLeft: '4px solid #10b981' }}>
                <div className="sidebar-header">
                    <div>
                        <h3 style={{ margin: 0, color: '#065f46' }}>🌴 Holidays</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#059669' }}>Manage annual breaks</p>
                    </div>
                    <button className="close-sidebar" onClick={() => setShowHolidaySidebar(false)}>×</button>
                </div>
                <div className="sidebar-content">
                    {role === 'ADMIN' && (
                        <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                            <button
                                onClick={() => setShowReferenceSidebar(true)}
                                className="btn-save-creative"
                                style={{ width: '100%', background: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                📅 FESTIVAL LIST
                            </button>
                        </div>
                    )}
                    {(() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const upcoming = holidays.filter(h => h.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
                        const past = holidays.filter(h => h.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));

                        // Group upcoming by month
                        const groupedUpcoming = upcoming.reduce((acc, h) => {
                            const month = new Date(h.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            if (!acc[month]) acc[month] = [];
                            acc[month].push(h);
                            return acc;
                        }, {});

                        return (
                            <>
                                <h5 style={{ margin: '0 0 15px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🚀</span> UPCOMING HOLIDAYS
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
                                    {Object.entries(groupedUpcoming).map(([month, items]) => (
                                        <div key={month} style={{ marginBottom: '15px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '5px', borderLeft: '2px solid #e2e8f0' }}>
                                                {month}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {items.map(h => (
                                                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 15px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '13px' }}>{h.name}</div>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                                {new Date(h.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {upcoming.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>No upcoming holidays scheduled.</p>
                                        </div>
                                    )}
                                </div>

                                {past.length > 0 && (
                                    <>
                                        <h5 style={{ margin: '0 0 15px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                            <span>📜</span> PAST HOLIDAYS
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0.7 }}>
                                            {past.map(h => (
                                                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '700', color: '#64748b', fontSize: '13px', textDecoration: 'line-through' }}>{h.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                                                            {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                    {role === 'ADMIN' && (
                                                        <button
                                                            onClick={() => deleteHoliday(h.id)}
                                                            style={{ height: '28px', width: '28px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Schedule Settings Modal */}
            {showScheduleModal && role === 'ADMIN' && (
                <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div className="shift-settings-card animate-slide-up" style={{ width: '450px', background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚙️</div>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: '800' }}>Shift Configuration</h3>
                            <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#64748b' }}>Configure global work hours and thresholds.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="creative-input-group">
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Standard Check-In</label>
                                <input
                                    className="creative-input-group input"
                                    type="time"
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: '600' }}
                                    value={schedule.standard_check_in.substring(0, 5)}
                                    onChange={(e) => setSchedule({ ...schedule, standard_check_in: e.target.value + ':00' })}
                                />
                            </div>
                            <div className="creative-input-group">
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Check-In Tolerance (Min)</label>
                                <input
                                    className="creative-input-group input"
                                    type="number"
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: '600' }}
                                    value={schedule.check_in_tolerance}
                                    onChange={(e) => setSchedule({ ...schedule, check_in_tolerance: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="creative-input-group">
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Standard Check-Out</label>
                                <input
                                    className="creative-input-group input"
                                    type="time"
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: '600' }}
                                    value={schedule.standard_check_out.substring(0, 5)}
                                    onChange={(e) => setSchedule({ ...schedule, standard_check_out: e.target.value + ':00' })}
                                />
                            </div>
                            <div className="creative-input-group">
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Check-Out Tolerance (Min)</label>
                                <input
                                    className="creative-input-group input"
                                    type="number"
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: '600' }}
                                    value={schedule.check_out_tolerance}
                                    onChange={(e) => setSchedule({ ...schedule, check_out_tolerance: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="creative-input-group">
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Half Day Threshold (Time)</label>
                            <input
                                className="creative-input-group input"
                                type="time"
                                style={{ width: '100%', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: '600' }}
                                value={schedule.half_day_threshold.substring(0, 5)}
                                onChange={(e) => setSchedule({ ...schedule, half_day_threshold: e.target.value + ':00' })}
                            />
                            <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '5px', display: 'block' }}>Checking out after this time but before shift end marks as Half Day.</small>
                        </div>

                        <div className="creative-input-group" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '1px' }}>Weekly Off Days</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, idx) => {
                                    const isSel = schedule.off_days?.split(',').includes(idx.toString());
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => {
                                                let current = schedule.off_days ? schedule.off_days.split(',') : [];
                                                if (isSel) current = current.filter(d => d !== idx.toString());
                                                else current.push(idx.toString());
                                                setSchedule({ ...schedule, off_days: current.join(',') });
                                            }}
                                            style={{
                                                padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                                                border: '1px solid #e2e8f0', cursor: 'pointer',
                                                background: isSel ? '#3b82f6' : 'white',
                                                color: isSel ? 'white' : '#64748b'
                                            }}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '40px' }}>
                            <button className="btn-save-creative" onClick={handleUpdateSchedule} style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '16px', fontWeight: '700', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>Save Configurations</button>
                            <button
                                className="close-dashboard-btn"
                                onClick={() => setShowScheduleModal(false)}
                                style={{ width: '100%', padding: '12px', background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Dismiss Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(showHolidaySidebar || showReferenceSidebar) && <div className="sidebar-overlay" style={{ zIndex: 1999 }} onClick={() => { setShowHolidaySidebar(false); setShowReferenceSidebar(false); }}></div>}

            {/* Reference Holiday Sidebar */}
            <div className={`notification-sidebar ${showReferenceSidebar ? 'active' : ''}`} style={{ zIndex: 2010, borderLeft: '4px solid #3b82f6' }}>
                <div className="sidebar-header">
                    <div>
                        <h3 style={{ margin: 0, color: '#1e3a8a' }}>📅 2026 Festivals</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>Reference Gazetted List</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {role === 'ADMIN' && (
                            <button
                                onClick={() => {
                                    setPrompt({
                                        show: true,
                                        message: "Import all 2026 Festivals shown here? This will populate your calendar.",
                                        onConfirm: async () => {
                                            for (const h of GAZETTED_2026) {
                                                if (!holidays.some(existing => existing.date === h.date)) {
                                                    await api.post('attendance/holidays/', h);
                                                }
                                            }
                                            fetchAttendance();
                                        }
                                    });
                                }}
                                style={{ fontSize: '10px', background: '#3b82f6', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                            >
                                IMPORT ALL
                            </button>
                        )}
                        <button className="close-sidebar" onClick={() => setShowReferenceSidebar(false)}>×</button>
                    </div>
                </div>
                <div className="sidebar-content">
                    {role === 'ADMIN' && (
                        <div style={{ marginBottom: '25px', background: '#eff6ff', padding: '15px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                            <h5 style={{ margin: '0 0 15px', color: '#1e3a8a', fontSize: '14px', borderBottom: '1px solid #bfdbfe', paddingBottom: '8px' }}>✨ Add Custom Holiday</h5>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', display: 'block', marginBottom: '5px' }}>HOLIDAY TITLE</label>
                                <input
                                    className="creative-input-group input"
                                    type="text"
                                    placeholder="e.g. Independence Day"
                                    style={{ width: '100%', background: 'white' }}
                                    value={newHoliday.name}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', display: 'block', marginBottom: '5px' }}>SELECT DATE</label>
                                <input
                                    className="creative-input-group input"
                                    type="date"
                                    style={{ width: '100%', background: 'white' }}
                                    value={newHoliday.date}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                />
                            </div>
                            <button className="btn-save-creative" style={{ width: '100%', background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }} onClick={handleAddHoliday}>
                                💾 Save Holiday
                            </button>
                            <p style={{ fontSize: '10px', color: '#64748b', marginTop: '10px', marginBottom: 0, textAlign: 'center' }}>
                                Only recognized holidays can be added
                            </p>
                        </div>
                    )}

                    <h5 style={{ margin: '0 0 15px', color: '#1e3a8a', fontSize: '13px', fontWeight: '800' }}>ALL HOLIDAYS</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(() => {
                            // Merge GAZETTED_2026 with custom holidays from database
                            const allHolidaysList = [...GAZETTED_2026];

                            // Add custom holidays that aren't in GAZETTED_2026
                            holidays.forEach(dbHoliday => {
                                if (!GAZETTED_2026.some(g => g.date === dbHoliday.date)) {
                                    allHolidaysList.push({
                                        date: dbHoliday.date,
                                        name: dbHoliday.name
                                    });
                                }
                            });

                            // Sort by date
                            allHolidaysList.sort((a, b) => a.date.localeCompare(b.date));

                            return allHolidaysList.map(h => {
                                const alreadyAdded = holidays.some(existing => existing.date === h.date);
                                const isCustom = !GAZETTED_2026.some(g => g.date === h.date);

                                return (
                                    <div key={h.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 15px', borderRadius: '12px', border: `1px solid ${isCustom ? '#dbeafe' : '#e2e8f0'}`, boxShadow: isCustom ? '0 2px 4px rgba(59, 130, 246, 0.1)' : 'none' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {h.name}
                                                {isCustom && <span style={{ fontSize: '9px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>CUSTOM</span>}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                {new Date(h.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                        {role === 'ADMIN' && (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {!alreadyAdded ? (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                await api.post('attendance/holidays/', h);
                                                                fetchAttendance();
                                                            }}
                                                            style={{
                                                                fontSize: '10px',
                                                                padding: '5px 10px',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                background: '#10b981',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                fontWeight: '700'
                                                            }}
                                                        >
                                                            ADD
                                                        </button>
                                                        {isCustom && (
                                                            <button
                                                                onClick={() => {
                                                                    const holidayToDelete = holidays.find(existing => existing.date === h.date);
                                                                    if (holidayToDelete) {
                                                                        setPrompt({
                                                                            show: true,
                                                                            message: `Remove "${h.name}" from the holiday list permanently?`,
                                                                            onConfirm: async () => {
                                                                                try {
                                                                                    await api.delete(`attendance/holidays/${holidayToDelete.id}/`);
                                                                                    fetchAttendance();
                                                                                } catch (e) {
                                                                                    setAlert({ show: true, message: "Failed to delete" });
                                                                                    setTimeout(() => setAlert({ show: false, message: '' }), 2000);
                                                                                }
                                                                            }
                                                                        });
                                                                    }
                                                                }}
                                                                style={{
                                                                    fontSize: '14px',
                                                                    padding: '5px 8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #fecaca',
                                                                    background: '#fef2f2',
                                                                    color: '#dc2626',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '700',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.background = '#fee2e2';
                                                                    e.target.style.borderColor = '#f87171';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.background = '#fef2f2';
                                                                    e.target.style.borderColor = '#fecaca';
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            const holidayToDelete = holidays.find(existing => existing.date === h.date);
                                                            if (holidayToDelete) {
                                                                deleteHoliday(holidayToDelete.id);
                                                            }
                                                        }}
                                                        style={{
                                                            fontSize: '10px',
                                                            padding: '5px 10px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontWeight: '700'
                                                        }}
                                                    >
                                                        DELETE
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* Success/Error Alert Overlay */}
            {
                alert.show && (
                    <div className="center-alert-overlay">
                        <div className="center-alert-card">
                            <div className="alert-icon">⚠️</div>
                            <div className="alert-text">{alert.message}</div>
                        </div>
                    </div>
                )
            }

            {/* Premium Confirmation Prompt */}
            {
                prompt.show && (
                    <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10005 }}>
                        <div className="shift-settings-card animate-slide-up" style={{ width: '380px', background: 'white', padding: '35px', borderRadius: '25px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
                            <div style={{ fontSize: '45px', marginBottom: '15px' }}>⚡</div>
                            <h3 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '20px', fontWeight: '800' }}>Confirm Action</h3>
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>{prompt.message}</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    className="btn-save-creative"
                                    style={{ flex: 1, background: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                                    onClick={() => { prompt.onConfirm(); setPrompt({ ...prompt, show: false }); }}
                                >
                                    Confirm
                                </button>
                                <button
                                    className="btn-save-creative"
                                    style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}
                                    onClick={() => setPrompt({ ...prompt, show: false })}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Monthly Report Modal */}
            {
                showMonthReport && role === 'ADMIN' && (
                    <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                        <div className="shift-settings-card animate-slide-up" style={{ width: '500px', background: 'white', padding: '35px', borderRadius: '25px', textAlign: 'center' }}>
                            {!reportDetail ? (
                                <>
                                    <div style={{ fontSize: '50px', marginBottom: '15px' }}>📈</div>
                                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '800' }}>
                                        Staff Monthly Summary
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>
                                        Stats for {new Date(reportMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </p>

                                    {(() => {
                                        const year = parseInt(reportMonth.split('-')[0]);
                                        const month = parseInt(reportMonth.split('-')[1]);
                                        const today = new Date();
                                        const todayStr = today.toISOString().split('T')[0];

                                        const lastDayOfMonth = new Date(year, month, 0).getDate();
                                        const isCurrentMonth = reportMonth === today.toISOString().slice(0, 7);
                                        const endDay = isCurrentMonth ? today.getDate() : lastDayOfMonth;

                                        // Refactored to store lists
                                        let stats = { present: [], half: [], absent: [], leave: [] };
                                        const empList = employees;
                                        const attMap = {};

                                        attendanceData.forEach(r => {
                                            const key = `${r.date}_${r.employee}`;
                                            attMap[key] = r;
                                        });

                                        for (let d = 1; d <= endDay; d++) {
                                            const dateStr = `${reportMonth}-${String(d).padStart(2, '0')}`;
                                            const isHol = holidays.some(h => h.date === dateStr);
                                            const isOff = isOffDay(dateStr);

                                            empList.forEach(emp => {
                                                const empName = emp.first_name || emp.user_username || `Emp #${emp.id}`;
                                                // 1. Check if on approved leave
                                                const leaveRecord = leaves.find(l =>
                                                    l.employee === emp.id &&
                                                    l.status === 'APPROVED' &&
                                                    dateStr >= l.start_date &&
                                                    dateStr <= l.end_date
                                                );

                                                // 2. Check for attendance record
                                                const key = `${dateStr}_${emp.id}`;
                                                const record = attMap[key];

                                                if (record) {
                                                    const commonData = {
                                                        name: empName,
                                                        date: dateStr,
                                                        in: record.check_in_time,
                                                        out: record.check_out_time,
                                                        remarks: record.remarks
                                                    };
                                                    if (record.status === 'Present') stats.present.push(commonData);
                                                    else if (record.status === 'Half Day') stats.half.push(commonData);
                                                    else if (record.status === 'Absent') stats.absent.push({ name: empName, date: dateStr });
                                                    else if (record.status === 'Leave') stats.leave.push({ name: empName, date: dateStr, type: 'Planned', remarks: record.remarks });
                                                } else if (leaveRecord) {
                                                    stats.leave.push({ name: empName, date: dateStr, type: leaveRecord.leave_type, remarks: leaveRecord.reason });
                                                } else if (!isHol && !isOff && dateStr <= todayStr) {
                                                    // Working day, no leave, no record -> Absent
                                                    stats.absent.push({ name: empName, date: dateStr });
                                                }
                                            });
                                        }

                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div
                                                    onClick={() => setReportDetail({ title: 'PRESENT', color: '#16a34a', data: stats.present })}
                                                    style={{ background: '#f0fdf4', padding: '15px', borderRadius: '15px', border: '1px solid #dcfce7', cursor: 'pointer', transition: '0.2s' }}
                                                >
                                                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '800' }}>PRESENT</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803d' }}>{stats.present.length}</div>
                                                </div>
                                                <div
                                                    onClick={() => setReportDetail({ title: 'ABSENT', color: '#ef4444', data: stats.absent })}
                                                    style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', border: '1px solid #fee2e2', cursor: 'pointer', transition: '0.2s' }}
                                                >
                                                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '800' }}>ABSENT</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#b91c1c' }}>{stats.absent.length}</div>
                                                </div>
                                                <div
                                                    onClick={() => setReportDetail({ title: 'HALF DAY', color: '#3b82f6', data: stats.half })}
                                                    style={{ background: '#eff6ff', padding: '15px', borderRadius: '15px', border: '1px solid #dbeafe', cursor: 'pointer', transition: '0.2s' }}
                                                >
                                                    <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '800' }}>HALF DAY</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#1d4ed8' }}>{stats.half.length}</div>
                                                </div>
                                                <div
                                                    onClick={() => setReportDetail({ title: 'ON LEAVE', color: '#d97706', data: stats.leave })}
                                                    style={{ background: '#fffbeb', padding: '15px', borderRadius: '15px', border: '1px solid #fef3c7', cursor: 'pointer', transition: '0.2s' }}
                                                >
                                                    <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '800' }}>ON LEAVE</div>
                                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#92400e' }}>{stats.leave.length}</div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <button
                                        className="btn-save-creative"
                                        style={{ marginTop: '30px', width: '100%', background: '#1e293b' }}
                                        onClick={() => setShowMonthReport(false)}
                                    >
                                        Close Report
                                    </button>
                                </>
                            ) : (
                                <div className="animate-slide-up">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <button
                                            onClick={() => setReportDetail(null)}
                                            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                                        >
                                            ←
                                        </button>
                                        <h3 style={{ margin: 0, color: reportDetail.color, fontSize: '18px', fontWeight: '800' }}>
                                            {reportDetail.title} LIST
                                        </h3>
                                        <div style={{ width: '24px' }}></div>
                                    </div>

                                    <div style={{ maxHeight: '400px', overflowY: 'auto', textAlign: 'left' }}>
                                        {reportDetail.data.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No records found.</div>
                                        ) : (
                                            <table className="premium-table" style={{ fontSize: '12px' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Employee</th>
                                                        {(reportDetail.title === 'PRESENT' || reportDetail.title === 'HALF DAY') && (
                                                            <>
                                                                <th>In</th>
                                                                <th>Out</th>
                                                                <th>Remark</th>
                                                            </>
                                                        )}
                                                        {reportDetail.title === 'ON LEAVE' && (
                                                            <>
                                                                <th>Type</th>
                                                                <th>Reason</th>
                                                            </>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportDetail.data.sort((a, b) => a.date.localeCompare(b.date)).map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                                                            <td>
                                                                <strong>{item.name}</strong>
                                                            </td>
                                                            {(reportDetail.title === 'PRESENT' || reportDetail.title === 'HALF DAY') && (
                                                                <>
                                                                    <td>{item.in ? item.in.slice(0, 5) : '--:--'}</td>
                                                                    <td>{item.out ? item.out.slice(0, 5) : '--:--'}</td>
                                                                    <td style={{ color: '#64748b', fontStyle: 'italic', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.remarks}>{item.remarks || '-'}</td>
                                                                </>
                                                            )}
                                                            {reportDetail.title === 'ON LEAVE' && (
                                                                <>
                                                                    <td><span className="status-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>{item.type || 'Leave'}</span></td>
                                                                    <td style={{ color: '#64748b', fontStyle: 'italic', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.remarks}>{item.remarks || '-'}</td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default Attendance;
