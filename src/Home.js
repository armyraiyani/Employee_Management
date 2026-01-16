import { Link } from 'react-router-dom';
import Navbar from './Navbar';

function Home() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    return (
        <div className="home-wrapper">
            <Navbar />

            {/* Hero Section */}
            <div className="home-banner-container">
                <div className="banner-overlay-strip creative-hero">
                    <div className="hero-badge">🚀 Complete Workforce Management</div>
                    <h1 className="banner-title">Empower Your Workforce</h1>
                    <p className="banner-subtitle">Complete Employee Management System with Attendance Tracking, Leave Management, Payroll Processing, and Advanced Scheduling.</p>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-number">Real-Time</span>
                            <span className="stat-label">Attendance Sync</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-number">Automated</span>
                            <span className="stat-label">Payroll & Leave</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-number">Interactive</span>
                            <span className="stat-label">Calendars</span>
                        </div>
                    </div>

                    {!token ? (
                        <div className="hero-actions">
                            <Link to="/login" className="btn-primary-premium">Get Started</Link>
                            <Link to="/login" className="btn-outline-premium">Member Login</Link>
                        </div>
                    ) : (
                        <div className="hero-actions">
                            <Link to={role === 'ADMIN' ? "/admin" : "/employee"} className="btn-primary-premium">
                                Back to Dashboard &rarr;
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Why Choose Us Section */}
            <div className="content-section bg-gradient-light">
                <div className="container">
                    <div className="section-header">
                        <span className="section-tag">System Capabilities</span>
                        <h2 className="section-title">Why Choose Our EMS?</h2>
                    </div>
                    <div className="why-grid">
                        <div className="why-card active-blue">
                            <div className="why-icon">🛡️</div>
                            <h3>Enterprise Security</h3>
                            <p>Secure authentication, role-based access control, and protected employee data with encrypted communications.</p>
                        </div>
                        <div className="why-card">
                            <div className="why-icon">⚡</div>
                            <h3>Real-Time Synchronization</h3>
                            <p>Instant attendance updates, live payroll processing, and automatic leave-to-attendance syncing across the system.</p>
                        </div>
                        <div className="why-card">
                            <div className="why-icon">📱</div>
                            <h3>Fully Responsive Design</h3>
                            <p>Manage your team seamlessly on desktop, tablet, or mobile devices with consistent functionality.</p>
                        </div>
                        <div className="why-card">
                            <div className="why-icon">🎨</div>
                            <h3>Intuitive User Interface</h3>
                            <p>Color-coded status indicators, interactive calendars, and easy navigation for admins and employees.</p>
                        </div>
                        <div className="why-card">
                            <div className="why-icon">📊</div>
                            <h3>Comprehensive Analytics</h3>
                            <p>Monthly attendance reports with statistics, payroll history tracking, and leave analytics.</p>
                        </div>
                        <div className="why-card">
                            <div className="why-icon">🔄</div>
                            <h3>Automated Workflows</h3>
                            <p>Automatic daily attendance processing, leave status synchronization, and notification triggers for all stakeholders.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Features Showcase */}
            <div className="content-section features-premium">
                <div className="container">
                    <h2 className="section-title white">Core Management Modules</h2>
                    <div className="features-grid-premium">
                        <div className="feature-item">
                            <div className="feature-icon-box blue">📊</div>
                            <div className="feature-text">
                                <h3>Smart Attendance Tracking</h3>
                                <p>Real-time check-in/check-out, automated holiday marking, leave request management, and comprehensive attendance history with color-coded status (Present, Absent, Half Day, Leave, Holiday).</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box green">📂</div>
                            <div className="feature-text">
                                <h3>Employee Directory</h3>
                                <p>Centralized employee database with detailed profiles, department assignments, contact information, and role-based access control for admins and employees.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box orange">💸</div>
                            <div className="feature-text">
                                <h3>Payroll Management</h3>
                                <p>Automated salary processing, monthly payroll status tracking, payment history, and employee notifications for payroll updates.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box purple">🎯</div>
                            <div className="feature-text">
                                <h3>Leave Management</h3>
                                <p>Complete leave request workflow - apply with attachments, admin approval/rejection, automatic attendance sync, and real-time leave balance tracking.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box red">🏢</div>
                            <div className="feature-text">
                                <h3>Holiday & Off-Day Management</h3>
                                <p>Customizable holiday calendar with pre-loaded gazetted holidays, configurable weekly off days (e.g., Sun, Sat), and automatic calendar color coding.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box indigo">⚙️</div>
                            <div className="feature-text">
                                <h3>Work Schedule Configuration</h3>
                                <p>Flexible shift management - set check-in/check-out times, tolerance windows, half-day thresholds, and weekly off-day patterns.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box pink">📝</div>
                            <div className="feature-text">
                                <h3>Profile Management</h3>
                                <p>Employees can request profile updates (email, phone, address), admins approve/reject requests, and email notifications for all updates.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box cyan">📅</div>
                            <div className="feature-text">
                                <h3>Advanced Calendar Views</h3>
                                <p>Interactive attendance calendar with status visualization, monthly reporting with statistical breakdowns, and real-time attendance syncing.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Employee Benefits Section */}
            <div className="content-section benefits-section">
                <div className="container benefit-flex">
                    <div className="benefit-content">
                        <span className="section-tag">For Employees</span>
                        <h2 className="section-title left">Empowering Employees</h2>
                        <ul className="benefit-list">
                            <li><span>✅</span> Self-managed profile updates with admin approval</li>
                            <li><span>✅</span> Real-time leave request submission and status tracking</li>
                            <li><span>✅</span> Complete attendance history with detailed logs</li>
                            <li><span>✅</span> Transparent payroll information and payment history</li>
                            <li><span>✅</span> Interactive calendar with personal schedule visibility</li>
                            <li><span>✅</span> Instant notifications for all important updates</li>
                        </ul>
                    </div>
                    <div className="benefit-image-placeholder">
                        <div className="abstract-ui-card">
                            <div className="ui-header">My Dashboard</div>
                            <div className="ui-progress"></div>
                            <div className="ui-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Features Section */}
            <div className="content-section benefits-section">
                <div className="container benefit-flex" style={{ flexDirection: 'row-reverse' }}>
                    <div className="benefit-content">
                        <span className="section-tag">For Administrators</span>
                        <h2 className="section-title left">Complete Admin Control</h2>
                        <ul className="benefit-list">
                            <li><span>🔧</span> Employee management - add, edit, delete profiles</li>
                            <li><span>🔧</span> Attendance oversight - daily status tracking and reports</li>
                            <li><span>🔧</span> Leave request approvals with automatic calendar syncing</li>
                            <li><span>🔧</span> Holiday management with duplicate prevention</li>
                            <li><span>🔧</span> Shift configuration - set work hours and off-days</li>
                            <li><span>🔧</span> Payroll processing and salary payment management</li>
                            <li><span>🔧</span> Monthly attendance reports with statistics</li>
                            <li><span>🔧</span> Profile update request approvals</li>
                        </ul>
                    </div>
                    <div className="benefit-image-placeholder">
                        <div className="abstract-ui-card">
                            <div className="ui-header">Admin Panel</div>
                            <div className="ui-progress"></div>
                            <div className="ui-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="cta-section">
                <div className="cta-content">
                    <h2>Ready to Transfrom Your Workforce?</h2>
                    <p>Join thousands of companies managing their team more effectively.</p>
                    {!token && <Link to="/login" className="btn-cta">Start Your Journey Today</Link>}
                </div>
            </div>

            {/* Footer */}
            <footer className="home-footer-premium">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <h3>EmployeeMS</h3>
                        <p>Defining the future of workforce management since 2024.</p>
                    </div>
                    <div className="footer-links">
                        <h4>Platform</h4>
                        <Link to="/overview">Overview</Link>
                        <Link to="/features">Features</Link>
                        <Link to="/security">Security</Link>
                    </div>
                    <div className="footer-links">
                        <h4>Company</h4>
                        <Link to="/about">About Us</Link>
                        <Link to="/contact">Contact</Link>
                        <Link to="/privacy">Privacy Policy</Link>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2024 Employee Management System. Created for Excellence.</p>
                </div>
            </footer>
        </div>
    );
}

export default Home;
