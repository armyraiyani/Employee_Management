import React from 'react';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';

const PageLayout = ({ title, children }) => {
    const navigate = useNavigate();
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white' }}>
            <Navbar />
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'transparent',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    ← Back to Home
                </button>
                <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px', background: 'linear-gradient(to right, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {title}
                </h1>
                <div style={{ background: '#1e293b', padding: '40px', borderRadius: '20px', border: '1px solid #334155', lineColor: '#cbd5e1', lineHeight: '1.6' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Overview = () => (
    <PageLayout title="Overview">
        <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '20px' }}>
            EmployeeMS is a comprehensive workforce management solution designed to streamline HR operations and enhance employee productivity.
        </p>
        <h3 style={{ color: 'white', marginTop: '30px' }}>Key Capabilities</h3>
        <ul style={{ color: '#94a3b8', listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>✨ Real-time Attendance Tracking</li>
            <li style={{ marginBottom: '10px' }}>✨ Automated Payroll Processing</li>
            <li style={{ marginBottom: '10px' }}>✨ Leave Management Workflow</li>
            <li style={{ marginBottom: '10px' }}>✨ Employee Self-Service Portal</li>
        </ul>
    </PageLayout>
);

export const Features = () => (
    <PageLayout title="Features">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[
                { title: 'Smart Attendance', desc: 'Geofencing and biometric integration ready attendance logging.' },
                { title: 'Payroll Automation', desc: 'One-click salary generation with tax and deduction calculations.' },
                { title: 'Leave Management', desc: 'Streamlined application and approval process with balance tracking.' },
                { title: 'Document Vault', desc: 'Secure storage for employee contracts, IDs, and resumes.' },
                { title: 'Analytics Dashboard', desc: 'Visual insights into workforce trends and attendance patterns.' },
                { title: 'Role-Based Access', desc: 'Granular permissions for Admins, HR, and Employees.' }
            ].map((f, i) => (
                <div key={i} style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h4 style={{ color: '#60a5fa', margin: '0 0 10px 0' }}>{f.title}</h4>
                    <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>{f.desc}</p>
                </div>
            ))}
        </div>
    </PageLayout>
);

export const Security = () => (
    <PageLayout title="Security">
        <p style={{ color: '#cbd5e1' }}>We take data security seriously. Your workforce data is protected with enterprise-grade security measures.</p>

        <div style={{ marginTop: '30px' }}>
            <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: 'white', display: 'block', marginBottom: '5px' }}>🔒 Data Encryption</strong>
                <span style={{ color: '#94a3b8' }}>All sensitive data is encrypted at rest and in transit using industry-standard protocols.</span>
            </div>
            <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: 'white', display: 'block', marginBottom: '5px' }}>🛡️ Access Control</strong>
                <span style={{ color: '#94a3b8' }}>Strict role-based access control (RBAC) ensures users only access information relevant to their role.</span>
            </div>
            <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: 'white', display: 'block', marginBottom: '5px' }}>☁️ Secure Infrastructure</strong>
                <span style={{ color: '#94a3b8' }}>Hosted on secure cloud infrastructure with regular backups and monitoring.</span>
            </div>
        </div>
    </PageLayout>
);

export const AboutUs = () => (
    <PageLayout title="About Us">
        <p style={{ color: '#cbd5e1' }}>
            EmployeeMS began with a simple mission: to make workforce management effortless for modern businesses.
        </p>
        <p style={{ color: '#94a3b8', marginTop: '20px' }}>
            Founded in 2024, we recognized that small and medium-sized enterprises were struggling with outdated spreadsheets and disjointed HR tools. We set out to build a unified platform that brings attendance, payroll, and employee data together in one intuitive interface.
        </p>
        <p style={{ color: '#94a3b8', marginTop: '20px' }}>
            Our team consists of HR experts, software engineers, and design enthusiasts passionate about the future of work.
        </p>
    </PageLayout>
);

export const Contact = () => (
    <PageLayout title="Contact Us">
        <p style={{ color: '#cbd5e1', marginBottom: '30px' }}>Have questions? We'd love to hear from you.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div>
                <h3 style={{ color: 'white', marginBottom: '15px' }}>Get in touch</h3>
                <div style={{ marginBottom: '15px', color: '#94a3b8' }}>📧 support@employeems.com</div>
                <div style={{ marginBottom: '15px', color: '#94a3b8' }}>📞 +1 (555) 123-4567</div>
                <div style={{ marginBottom: '15px', color: '#94a3b8' }}>🏢 123 Tech Park, Innovation Way, CA</div>
            </div>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input placeholder="Your Name" style={{ background: '#0f172a', border: '1px solid #334155', padding: '12px', borderRadius: '8px', color: 'white' }} />
                <input placeholder="Email Address" style={{ background: '#0f172a', border: '1px solid #334155', padding: '12px', borderRadius: '8px', color: 'white' }} />
                <textarea rows="4" placeholder="Message" style={{ background: '#0f172a', border: '1px solid #334155', padding: '12px', borderRadius: '8px', color: 'white' }}></textarea>
                <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Send Message</button>
            </form>
        </div>
    </PageLayout>
);

export const PrivacyPolicy = () => (
    <PageLayout title="Privacy Policy">
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Last Updated: January 2026</p>

        <h3 style={{ color: 'white', marginTop: '30px' }}>1. Information We Collect</h3>
        <p style={{ color: '#cbd5e1' }}>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This includes name, email, employment details, and attendance logs.</p>

        <h3 style={{ color: 'white', marginTop: '30px' }}>2. How We Use Information</h3>
        <p style={{ color: '#cbd5e1' }}>We use the information we collect to provide, maintain, and improve our services, process payroll, and communicate with you.</p>

        <h3 style={{ color: 'white', marginTop: '30px' }}>3. Data Sharing</h3>
        <p style={{ color: '#cbd5e1' }}>We do not share your personal information with third parties except as described in this policy or with your consent.</p>
    </PageLayout>
);
