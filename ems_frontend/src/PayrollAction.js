import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api/axios';
import Navbar from './Navbar';
import Modal from './Modal';

function PayrollAction() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [salary, setSalary] = useState('');
    const [message, setMessage] = useState('');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7) + '-01'); // YYYY-MM-01

    const [calcData, setCalcData] = useState(null);
    const [calculating, setCalculating] = useState(false);

    // Modal State
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: null
    });

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const res = await api.get(`employees/${id}/`);
                setEmployee(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch employee", err);
                setModalState({
                    isOpen: true,
                    title: 'Error',
                    message: 'Employee not found',
                    type: 'error',
                    onClose: () => navigate('/admin')
                });
            }
        };
        fetchEmployee();
    }, [id, navigate]);

    useEffect(() => {
        const fetchCalculation = async () => {
            if (!id || !month) return;
            setCalculating(true);
            try {
                const res = await api.get(`payroll/calculate/?employee_id=${id}&month=${month}`);
                setCalcData(res.data);
                setSalary(res.data.base_salary);

                // If they joined mid-month and we are showing the 1st, update to their actual start date
                if (res.data.joining_date && month.slice(-2) === '01') {
                    setMonth(res.data.joining_date);
                }
            } catch (err) {
                console.error("Failed to calculate deductions", err);
            } finally {
                setCalculating(false);
            }
        };
        fetchCalculation();
    }, [id, month]);

    const handlePaymentClick = () => {
        const finalAmount = parseFloat(salary || 0) - (calcData?.total_deduction || 0);
        const isDeducted = calcData && calcData.total_deduction > 0;
        setModalState({
            isOpen: true,
            title: 'Confirm Payment',
            message: `Are you sure you want to process a payment of ₹${finalAmount.toFixed(2)}${isDeducted ? ' (Deducted)' : ''} to ${employee.first_name}?`,
            type: 'confirm',
            onConfirm: processPayment
        });
    };

    const processPayment = async () => {
        const finalAmount = parseFloat(salary || 0) - (calcData?.total_deduction || 0);
        try {
            await api.post('payroll/pay/', {
                employee_id: id,
                amount: finalAmount,
                month: month,
                message: message
            });
            setModalState({
                isOpen: true,
                title: 'Success',
                message: 'Payment processed successfully!',
                type: 'success',
                onClose: () => navigate('/admin')
            });
        } catch (err) {
            console.error("Payment failed", err);
            setModalState({
                isOpen: true,
                title: 'Payment Failed',
                message: err.response?.data?.error || "Unknown Error",
                type: 'error',
                onClose: () => setModalState(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const closeModal = () => {
        if (modalState.onClose) {
            modalState.onClose();
        } else {
            setModalState(prev => ({ ...prev, isOpen: false }));
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="dashboard-container">
            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
            <Navbar />
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                <button onClick={() => navigate('/admin')} style={{ marginBottom: '20px', cursor: 'pointer', background: 'none', border: 'none', color: '#64748b' }}>← Back to List</button>

                <div className="creative-card animate-slide-up" style={{ padding: '30px' }}>
                    <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Process Salary Payment</h2>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '13px', marginBottom: '5px' }}>EMPLOYEE</label>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{employee.first_name} {employee.last_name}</div>
                            <div style={{ color: '#94a3b8', fontSize: '14px' }}>{employee.designation} • {employee.department?.name || 'No Dept'}</div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ color: '#64748b', fontSize: '13px' }}>PAYING FOR MONTH</label>
                                {calcData?.joining_date && (
                                    <span style={{
                                        fontSize: '11px',
                                        color: '#0369a1',
                                        fontWeight: 'bold',
                                        background: '#e0f2fe',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        border: '1px solid #bae6fd'
                                    }}>
                                        Joined: {calcData.joining_date}
                                    </span>
                                )}
                            </div>
                            <input
                                type="date"
                                value={month}
                                max={new Date().toISOString().slice(0, 7) + '-31'}
                                onChange={(e) => setMonth(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '13px', marginBottom: '5px' }}>ACTUAL SALARY {calcData?.joining_date ? '(PRO-RATED)' : ''}</label>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '20px', marginRight: '10px' }}>₹</span>
                                <input
                                    type="number"
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    placeholder="Actual Amount"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '18px', fontWeight: 'bold', opacity: calculating ? 0.5 : 1 }}
                                />
                                {calculating && <div className="spinner-small" style={{ marginLeft: '-30px', border: '2px solid #f3f3f3', borderTop: '2px solid #3498db', borderRadius: '50%', width: '15px', height: '15px', animation: 'spin 1s linear infinite' }}></div>}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                *Calculated based on working days from joining date (ignoring absences)
                            </div>
                        </div>

                        {calcData && (
                            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>Attendance Breakdown</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '8px', fontSize: '14px' }}>
                                    <div style={{ paddingBottom: '5px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                                        Total Working Days: <span style={{ fontWeight: 'bold' }}>{calcData.work_days}</span>
                                    </div>

                                    {calcData.stats.absent > 0 && (
                                        <div style={{ color: '#b91c1c' }}>
                                            Absents: <span style={{ fontWeight: 'bold' }}>{calcData.stats.absent} (-₹{calcData.deductions.absent})</span>
                                        </div>
                                    )}
                                    {calcData.stats.half_day > 0 && (
                                        <div style={{ color: '#b91c1c' }}>
                                            Half Days: <span style={{ fontWeight: 'bold' }}>{calcData.stats.half_day} (-₹{calcData.deductions.half_day})</span>
                                        </div>
                                    )}
                                    {calcData.stats.extra_leaves > 0 && (
                                        <div style={{ color: '#b91c1c' }}>
                                            Extra Leaves: <span style={{ fontWeight: 'bold' }}>{calcData.stats.extra_leaves} (-₹{calcData.deductions.extra_leave})</span>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '2px solid #cbd5e1', color: '#0f172a', fontWeight: 'bold', fontSize: '16px' }}>
                                        Total Salary: <span>₹{(parseFloat(salary || 0) - (calcData.total_deduction || 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', color: '#64748b', fontSize: '13px', marginBottom: '5px' }}>SHORT MESSAGE (OPTIONAL)</label>
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="e.g. Performance Bonus"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px dashed #22c55e', color: '#15803d', fontSize: '13px' }}>
                            <strong style={{ display: 'block', marginBottom: '5px' }}>⚠️ Mock Payment</strong>
                            Clicking "Pay Salary" will record this transaction in the system database. No real money transfer occurs.
                        </div>

                        <button
                            onClick={handlePaymentClick}
                            className="btn-save-creative"
                            style={{ width: '100%', marginTop: '10px', fontSize: '16px', padding: '15px' }}
                        >
                            Pay Salary
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalState.isOpen}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
            />
        </div>
    );
}

export default PayrollAction;
