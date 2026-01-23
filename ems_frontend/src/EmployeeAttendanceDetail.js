import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import api from './api/axios';

function EmployeeAttendanceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [employee, setEmployee] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [schedule, setSchedule] = useState({});

    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const formatName = (emp) => {
        if (!emp) return 'UNKNOWN';
        let first = (emp.first_name || emp.user_username || 'USER').replace(/\d+/g, '').replace(/[\._]/g, ' ').trim();
        let last = (emp.last_name || '').replace(/\d+/g, '').replace(/[\._]/g, ' ').trim();

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empRes, attRes, holRes, schRes, leaveRes] = await Promise.all([
                    api.get(`employees/${id}/`),
                    api.get(`employees/${id}/attendance/`),
                    api.get('attendance/holidays/'),
                    api.get('attendance/schedule/'),
                    api.get('leaves/all/') // Fetch all leaves to filter for this employee
                ]);
                setEmployee(empRes.data);
                setRecords(attRes.data);
                setHolidays(holRes.data);
                setSchedule(schRes.data);
                // Filter leaves for this employee only
                const myLeaves = leaveRes.data.filter(l => l.employee === parseInt(id) && l.status === 'APPROVED');
                setLeaves(myLeaves);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const isOffDay = (dateStr) => {
        if (!schedule.off_days) return false;
        try {
            const day = new Date(dateStr + 'T00:00:00').getDay();
            return schedule.off_days.split(',').map(d => d.trim()).includes(day.toString());
        } catch (e) { return false; }
    };

    if (loading) return <div className="loader">Loading history...</div>;

    // Pre-calculate all days and stats
    const year = parseInt(selectedMonth.split('-')[0]);
    const monthIdx = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, monthIdx, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let stats = { present: 0, half: 0, absent: 0, holiday: 0 };
    const monthData = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;

        // Only show records from the joining date onwards
        if (employee && employee.date_of_joining && dateStr < employee.date_of_joining) {
            continue;
        }

        const record = records.find(r => r.date === dateStr);
        const isHol = holidays.some(h => h.date === dateStr);
        const isOff = isOffDay(dateStr);
        const leave = leaves.find(l => dateStr >= l.start_date && dateStr <= l.end_date);

        let status = '';
        let color = '#334155';
        let bg = 'transparent';
        let checkIn = '--:--';
        let checkOut = '--:--';

        if (record) {
            status = record.status.toUpperCase();
            checkIn = record.check_in_time || '--:--';
            checkOut = record.check_out_time || '--:--';

            if (status === 'PRESENT') { stats.present++; color = '#15803d'; bg = '#f0fdf4'; }
            else if (status === 'HALF DAY') { stats.half++; color = '#1d4ed8'; bg = '#eff6ff'; }
            else if (status === 'ABSENT') { stats.absent++; color = '#b91c1c'; bg = '#fef2f2'; }
            else if (status === 'LEAVE') { color = '#92400e'; bg = '#fffbeb'; }
        } else if (leave) {
            status = `ON LEAVE (${leave.leave_type})`;
            color = '#92400e'; bg = '#fffbeb';
        } else if (isHol) {
            status = 'HOLIDAY';
            stats.holiday++;
            color = '#0e7490'; bg = '#ecfeff';
        } else if (isOff) {
            status = 'OFF DAY';
            color = '#64748b';
        } else if (dateStr <= todayStr) {
            status = 'ABSENT';
            stats.absent++;
            color = '#b91c1c'; bg = '#fef2f2';
        }

        // Add to month data list if status is determined (or empty row for future)
        monthData.push({
            date: dateStr,
            status,
            color,
            bg,
            checkIn,
            checkOut
        });
    }

    return (
        <div className="history-page-wrapper">
            <Navbar />
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <div>
                        <h1 style={{ textTransform: 'uppercase' }}>{formatName(employee)}'S ATTENDANCE</h1>
                        <p>Detailed daily logs and timing</p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                color: '#334155',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                outline: 'none',
                                fontWeight: '600',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                            }}
                        />
                        <button className="back-btn-up" onClick={() => navigate(-1)}>Back</button>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '25px' }}>
                    <div className="stat-card" style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Total Days</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc' }}>{daysInMonth}</div>
                    </div>
                    <div className="stat-card" style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Present</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d399' }}>{stats.present}</div>
                    </div>
                    <div className="stat-card" style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Half Day</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#60a5fa' }}>{stats.half}</div>
                    </div>
                    <div className="stat-card" style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Absent</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>{stats.absent}</div>
                    </div>
                    <div className="stat-card" style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Holiday</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#22d3ee' }}>{stats.holiday}</div>
                    </div>
                </div>

                <div className="attendance-main-card">
                    <div className="table-wrapper-premium">
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthData.map((d, index) => (
                                    <tr key={index} style={{ background: d.bg }}>
                                        <td>{d.date}</td>
                                        <td>
                                            {d.status && (
                                                <span
                                                    className="status-badge"
                                                    style={{
                                                        background: d.color === '#64748b' ? '#f1f5f9' : undefined,
                                                        color: d.color,
                                                        border: `1px solid ${d.color}20`
                                                    }}
                                                >
                                                    {d.status}
                                                </span>
                                            )}
                                        </td>
                                        <td>{formatTime12h(d.checkIn)}</td>
                                        <td>{formatTime12h(d.checkOut)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            );
        </div>);
}

export default EmployeeAttendanceDetail;
