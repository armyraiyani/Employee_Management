import { useState, useEffect, useCallback } from 'react';
import api from './api/axios';
import Navbar from './Navbar';

function MyPayroll() {
    const [history, setHistory] = useState([]);
    const [selectedPayslip, setSelectedPayslip] = useState(null);
    const [payslipDetails, setPayslipDetails] = useState(null);
    const [showAttendanceReport, setShowAttendanceReport] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [allAttendance, setAllAttendance] = useState([]);
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM


    useEffect(() => {
        fetchHistory();
    }, []);

    // Fetch deduction details when payslip is selected
    useEffect(() => {
        const fetchDetails = async () => {
            console.log('Selected payslip', selectedPayslip);
            if (!selectedPayslip || !selectedPayslip.employee) {
                setPayslipDetails(null);
                return;
            }
            try {
                const apiUrl = `payroll/calculate/?employee_id=${selectedPayslip.employee}&month=${selectedPayslip.month}`;
                console.log('Requesting', apiUrl);
                const res = await api.get(apiUrl);
                console.log('Payslip details API response', res.data);
                setPayslipDetails(res.data);
            } catch (err) {
                console.error('Failed to fetch payslip details', err);
                setPayslipDetails(null);
            }
        };
        fetchDetails();
    }, [selectedPayslip]);

    const fetchHistory = async () => {
        try {
            const res = await api.get('payroll/history/');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setHistory(data);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const handleViewPayslip = (record) => {
        setSelectedPayslip(record);
    };

    const calculateStats = useCallback((month) => {
        const filtered = allAttendance.filter(r => r.date.startsWith(month));
        const stats = {
            present: filtered.filter(r => r.status === 'Present').length,
            halfDay: filtered.filter(r => r.status === 'Half Day').length,
            absent: filtered.filter(r => r.status === 'Absent').length,
            late: filtered.filter(r => r.remarks === 'Late').length,
            total: filtered.length
        };
        setAttendanceStats(stats);
    }, [allAttendance]);

    useEffect(() => {
        if (showAttendanceReport && allAttendance.length > 0) {
            calculateStats(reportMonth);
        }
    }, [reportMonth, allAttendance, showAttendanceReport, calculateStats]);

    const generateAttendanceReport = async () => {
        try {
            const res = await api.get('attendance/');
            setAllAttendance(res.data);
            setShowAttendanceReport(true);
            // useEffect will trigger calculation
        } catch (err) {
            alert("Failed to generate report");
        }
    };

    const downloadPaymentReport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Date,Month,Status,Amount\n"
            + history.map(r => `${r.payment_date},${r.month},${r.status},${r.amount} `).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "payment_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="employee-hub-wrapper">
            <Navbar />

            <div className="hub-container">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', gridColumn: 'span 2' }}>

                    {/* Header Section */}
                    <div className="hub-header">
                        <div className="hub-avatar-large">💰</div>
                        <div className="hub-welcome" style={{ flex: 1 }}>
                            <h1>My Salary & Reports</h1>
                            <p>Manage your financial records and attendance summaries.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={generateAttendanceReport} className="hub-btn hub-btn-outline" style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                                📊 Attendance Report
                            </button>
                            <button onClick={downloadPaymentReport} className="hub-btn hub-btn-outline" style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                                ⬇️ Payment Report
                            </button>
                        </div>
                    </div>

                    {/* Salary History Table */}
                    <div className="hub-card">
                        <div className="hub-section-title">
                            <span>📅</span> Payment History
                        </div>
                        <div className="table-wrapper-premium" style={{ border: 'none', background: 'transparent' }}>
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>Payment Date</th>
                                        <th>Salary Month</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-state" style={{ padding: '50px' }}>
                                                No payment history found.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((record) => (
                                            <tr key={record.id}>
                                                <td><span className="payment-date">{new Date(record.payment_date).toLocaleDateString()}</span></td>
                                                <td>{new Date(record.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</td>
                                                <td>
                                                    <span className="hub-status-badge">PAID</span>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: '800', color: '#fff', fontSize: '16px' }}>
                                                    ₹{record.amount}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleViewPayslip(record)}
                                                        className="hub-btn hub-btn-outline"
                                                        style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', margin: '0 auto' }}
                                                    >
                                                        📄 View Payslip
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payslip Modal */}
            {selectedPayslip && (
                <div className="calendar-modal-overlay" onClick={() => setSelectedPayslip(null)}>
                    <div className="calendar-modal-card animate-scale-up" style={{ width: 'min(92vw, 780px)', maxHeight: '90vh', padding: '0', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', padding: '25px', color: 'white', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: '800' }}>Official Payslip</h3>
                            <button onClick={() => setSelectedPayslip(null)} className="modal-close" style={{ top: '20px', right: '20px', color: '#fff' }}>×</button>
                        </div>
                        <div style={{ padding: '40px', background: 'transparent', color: '#fff' }} id="printable-payslip">
                            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                                <h2 style={{ color: '#60a5fa', margin: '0 0 5px 0', fontSize: '28px', fontWeight: '900' }}>EMS CORP</h2>
                                <p style={{ color: '#94a3b8', margin: 0, fontWeight: '600' }}>Salary Slip for {new Date(selectedPayslip.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                                <div>
                                    <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '5px', fontWeight: '800', textTransform: 'uppercase' }}>EMPLOYEE</p>
                                    <strong style={{ display: 'block', fontSize: '16px', color: '#fff' }}>{selectedPayslip.first_name} {selectedPayslip.last_name}</strong>
                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>ID: EMP-{selectedPayslip.employee}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '5px', fontWeight: '800', textTransform: 'uppercase' }}>PAYMENT DATE</p>
                                    <strong style={{ display: 'block', fontSize: '16px', color: '#fff' }}>{new Date(selectedPayslip.payment_date).toLocaleDateString()}</strong>
                                </div>
                            </div>

                            <table style={{ width: '100%', marginBottom: '30px', borderCollapse: 'collapse' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '11px', color: '#64748b', fontWeight: '800' }}>DESCRIPTION</th>
                                        <th style={{ textAlign: 'right', padding: '12px', fontSize: '11px', color: '#64748b', fontWeight: '800' }}>AMOUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '15px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '600' }}>Monthly Salary</td>
                                        <td style={{ padding: '15px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', fontWeight: '700' }}>
                                            ₹{selectedPayslip.monthly_salary ?? selectedPayslip.amount}
                                        </td>
                                    </tr>
                                    {payslipDetails && (
                                        <>
                                            <tr>
                                                <td style={{ padding: '15px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '600', fontSize: '13px', color: '#ef4444' }}>
                                                    Deductions:
                                                </td>
                                                <td style={{ padding: '15px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}></td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px 12px', paddingLeft: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: '#94a3b8' }}>
                                                    Absents ({payslipDetails.stats.absent} days)
                                                </td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: '#ef4444', fontSize: '12px' }}>
                                                    -₹{payslipDetails.deductions.absent}
                                                </td>
                                            </tr>
                                            <tr style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                                                <td style={{ padding: '12px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700', fontSize: '13px', color: '#ef4444' }}>
                                                    Total Deduction
                                                </td>
                                                <td style={{ padding: '12px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', fontWeight: '700', color: '#ef4444', fontSize: '13px' }}>
                                                    -₹{payslipDetails.total_deduction}
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                    <tr style={{ background: 'rgba(37, 99, 235, 0.1)' }}>
                                        <td style={{ padding: '20px 12px', fontWeight: '800', color: '#60a5fa', fontSize: '16px' }}>NET PAYABLE</td>
                                        <td style={{ padding: '20px 12px', textAlign: 'right', fontWeight: '900', fontSize: '22px', color: '#fff' }}>
                                            ₹{(() => {
                                                const monthly = parseFloat(selectedPayslip.monthly_salary ?? selectedPayslip.amount) || 0;
                                                const ded = parseFloat(payslipDetails?.total_deduction ?? 0) || 0;
                                                const net = monthly - ded;
                                                return net.toFixed(2);
                                            })()}
                                        </td>
                                    </tr>
                                    <tr style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                                        <td style={{ padding: '20px 12px', fontWeight: '800', color: '#10b981', fontSize: '16px' }}>Admin Paid Salary</td>
                                        <td style={{ padding: '20px 12px', textAlign: 'right', fontWeight: '900', fontSize: '22px', color: '#10b981' }}>
                                            ₹{selectedPayslip.amount}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ textAlign: 'center' }}>
                                <button
                                    className="hub-btn hub-btn-primary"
                                    onClick={() => window.print()}
                                    style={{ padding: '12px 40px', width: 'auto' }}
                                >
                                    Print / Save PDF
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '15px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: '600' }}>This is a computer generated document and does not require a signature.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Report Modal */}
            {showAttendanceReport && attendanceStats && (
                <div className="calendar-modal-overlay" onClick={() => setShowAttendanceReport(false)}>
                    <div className="calendar-modal-card animate-scale-up" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowAttendanceReport(false)} className="modal-close">×</button>
                        <div className="modal-header" style={{ textAlign: 'center' }}>
                            <div className="modal-date">Summary Report</div>
                            <div className="modal-status" style={{ fontSize: '28px' }}>Attendance Metrics</div>

                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                                <input
                                    type="month"
                                    value={reportMonth}
                                    onChange={(e) => setReportMonth(e.target.value)}
                                    className="creative-input-group input"
                                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#000000', fontWeight: '700' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                            <div className="info-item">
                                <label>Days Present</label>
                                <div className="info-value" style={{ color: '#34d399' }}>{attendanceStats.present}</div>
                            </div>
                            <div className="info-item">
                                <label>Days Absent</label>
                                <div className="info-value" style={{ color: '#ef4444' }}>{attendanceStats.absent}</div>
                            </div>
                            <div className="info-item">
                                <label>Late Arrivals</label>
                                <div className="info-value" style={{ color: '#f59e0b' }}>{attendanceStats.late}</div>
                            </div>
                            <div className="info-item">
                                <label>Half Days</label>
                                <div className="info-value" style={{ color: '#94a3b8' }}>{attendanceStats.halfDay}</div>
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '25px', fontWeight: '600' }}>
                            Stats for {new Date(reportMonth + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                        </p>
                        <button className="hub-btn hub-btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowAttendanceReport(false)}>
                            Close Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyPayroll;
