import { useState, useEffect, useCallback } from 'react';
import api from './api/axios';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';

function AdminPayrollHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Payment Detail Modal State
    const [paymentModal, setPaymentModal] = useState(null);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await api.get('payroll/admin-global-history/');
            // alert(`DEBUG: Server returned ${Array.isArray(res.data) ? res.data.length : (res.data.results?.length || 0)} records.\nRAW: ${JSON.stringify(res.data).slice(0, 200)}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setHistory(data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch history", err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="dashboard-container">
            <Navbar />
            <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
                <button onClick={() => navigate('/admin')} style={{ marginBottom: '20px', cursor: 'pointer', background: 'none', border: 'none', color: '#64748b' }}>← Back to Dashboard</button>

                <h1 style={{ marginBottom: '20px' }}>Global Payment History</h1>

                <div className="creative-card animate-slide-up">
                    <table className="creative-table">
                        <thead>
                            <tr>
                                <th>Date Paid</th>
                                <th>Employee</th>
                                <th>Month Paid For</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th style={{ textAlign: 'center' }}>Receipt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        No payments recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                history.map((record) => (
                                    <tr key={record.id} onClick={() => setPaymentModal({
                                        employee: `${record.first_name} ${record.last_name}`,
                                        amount: record.amount,
                                        date: record.created_at
                                    })} style={{ cursor: 'pointer' }}>
                                        <td>{new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString()}</td>
                                        <td>
                                            <strong>{record.first_name} {record.last_name}</strong>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>@{record.employee_name}</div>
                                        </td>
                                        <td>{new Date(record.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            ₹{record.amount}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="view-mini-btn" style={{ fontSize: '12px', padding: '4px 8px' }}>
                                                📄 View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
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
                            <p style={{ color: '#64748b', fontSize: '14px' }}>Transaction Details</p>

                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginTop: '20px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>EMPLOYEE</span>
                                    <span style={{ fontWeight: 'bold', color: '#334155' }}>{paymentModal.employee}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>AMOUNT PAID</span>
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
        </div>
    );
}

export default AdminPayrollHistory;
