import React, { useState } from 'react';

const AttendanceCalendar = ({ attendanceData, holidays, schedule, joiningDate }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Helper function to check if a date is an off day
    const isOffDay = (dayOfWeek) => {
        if (!schedule || !schedule.off_days) return false;
        const offDays = schedule.off_days.split(',').map(d => d.trim());
        return offDays.includes(dayOfWeek.toString());
    };

    const prevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
        setSelectedDay(null);
    };

    const nextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
        setSelectedDay(null);
    };

    const handleDayClick = (day, record, holiday, isPending) => {
        if (!record && !holiday && !isPending) return;
        setSelectedDay({ day, record, holiday, isPending });
    };

    const renderDays = () => {
        const totalDays = daysInMonth(currentYear, currentMonth);
        const startDay = firstDayOfMonth(currentYear, currentMonth);
        const days = [];

        // Fill previous month gaps
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Fill current month days
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Skip days before joining
            if (joiningDate && dateStr < joiningDate) {
                days.push(<div key={day} className="calendar-day empty"></div>);
                continue;
            }

            const record = attendanceData.find(r => r.date === dateStr);
            const holiday = holidays.find(h => h.date === dateStr);
            const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
            const isConfiguredOffDay = isOffDay(dayOfWeek);

            const todayVal = new Date();
            todayVal.setHours(0, 0, 0, 0);
            const currentDayVal = new Date(currentYear, currentMonth, day);

            let statusClass = '';
            let statusIcon = '';

            if (holiday) {
                statusClass = 'holiday';
                statusIcon = '🌴';
            } else if (record) {
                statusClass = record.status.toLowerCase().replace(' ', '-');
                switch (record.status) {
                    case 'Present': statusIcon = '✅'; break;
                    case 'Absent': statusIcon = '❌'; break;
                    case 'Half Day': statusIcon = '🕒'; break;
                    case 'Pending': statusIcon = '⌛'; break;
                    case 'Leave': statusIcon = '✉️'; break;
                    case 'Off Day': statusIcon = 'OFF'; break;
                    default: statusIcon = '';
                }
            } else if (isConfiguredOffDay) {
                statusClass = 'off-day';
                statusIcon = 'OFF';
            } else if (currentDayVal > todayVal) {
                statusClass = 'pending';
                statusIcon = '🕒';
            }

            const isPending = statusClass === 'pending';

            days.push(
                <div
                    key={day}
                    className={`calendar-day ${statusClass} ${record || holiday || isConfiguredOffDay || isPending ? 'clickable' : ''}`}
                    onClick={() => handleDayClick(day, record, holiday, isPending)}
                >
                    <span className="day-number">{day}</span>
                    {statusIcon && <span className="status-icon" title={record?.status || holiday?.name || 'Off Day'}>{statusIcon}</span>}
                    {record && (
                        <div className="day-details-hint" style={{ display: 'flex', justifyContent: 'center' }}>
                            <div className="hint-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.3)' }}></div>
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    const formatTime = (timeStr) => {
        if (!timeStr || timeStr === '--:--' || timeStr === '-') return '--:--';
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

    const formatDate = (day) => {
        return `${day} ${monthNames[currentMonth]} ${currentYear}`;
    };

    return (
        <div className="attendance-calendar-container animate-fade-in">
            <div className="calendar-header">
                <button onClick={prevMonth} className="nav-btn">‹</button>
                <h2>{monthNames[currentMonth]} {currentYear}</h2>
                <button onClick={nextMonth} className="nav-btn">›</button>
            </div>
            <div className="calendar-weekdays">
                <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
            </div>
            <div className="calendar-grid">
                {renderDays()}
            </div>
            <div className="calendar-legend">
                <div className="legend-item"><span className="dot present"></span> Present</div>
                <div className="legend-item"><span className="dot half-day"></span> Half Day</div>
                <div className="legend-item"><span className="dot absent"></span> Absent</div>
                <div className="legend-item"><span className="dot leave"></span> Leave</div>
                <div className="legend-item"><span className="dot off-day"></span> Off Day</div>
                <div className="legend-item"><span className="dot pending"></span> Pending</div>
                <div className="legend-item"><span className="dot holiday"></span> Holiday</div>
            </div>

            {selectedDay && (
                <div className="calendar-modal-overlay" onClick={() => setSelectedDay(null)}>
                    <div className="calendar-modal-card animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="modal-close" onClick={() => setSelectedDay(null)}>×</div>
                        <div className="modal-header">
                            <span className="modal-date">{formatDate(selectedDay.day)}</span>
                            {selectedDay.holiday ? (
                                <span className="modal-status holiday-badge">🌴 Holiday</span>
                            ) : selectedDay.isPending ? (
                                <span className="modal-status status-pending">🕒 Pending</span>
                            ) : (
                                <span className={`modal-status status-${selectedDay.record.status.toLowerCase().replace(' ', '-')}`}>
                                    {selectedDay.record.status}
                                </span>
                            )}
                        </div>
                        <div className="modal-body">
                            {selectedDay.holiday ? (
                                <div className="holiday-info">
                                    <h3 style={{ color: '#22d3ee' }}>{selectedDay.holiday.name}</h3>
                                    <p>Enjoy your day off!</p>
                                </div>
                            ) : selectedDay.isPending ? (
                                <div className="holiday-info">
                                    <h3>Not Yet Logged</h3>
                                    <p>Attendance records will appear once you check in on this date.</p>
                                </div>
                            ) : (
                                <div className="attendance-info">
                                    <div className="info-item">
                                        <div className="info-label-row">
                                            <span>📥</span>
                                            <label>CHECK IN</label>
                                        </div>
                                        <div className="info-value">{formatTime(selectedDay.record.check_in_time)}</div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label-row">
                                            <span>📤</span>
                                            <label>CHECK OUT</label>
                                        </div>
                                        <div className="info-value">{formatTime(selectedDay.record.check_out_time)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceCalendar;
