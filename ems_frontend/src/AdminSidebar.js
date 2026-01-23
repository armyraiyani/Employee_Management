import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api/axios';
import Modal from './Modal';

function AdminSidebar() {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        const fetchAdminProfile = async () => {
            try {
                // Fetch 'me' - since we are logged in as admin, this returns admin info
                const res = await api.get('profile/me/');
                setAdmin(res.data);
            } catch (err) {
                console.error("Failed to fetch admin profile", err);
            }
        };
        fetchAdminProfile();
    }, []);

    const handleLogoutConfirm = () => {
        localStorage.clear();
        navigate('/');
    };

    if (!admin) return null;

    return (
        <div className="admin-profile-sidebar animate-slide-right">
            <div className="admin-info-section">
                <div className="admin-avatar">
                    {(admin.first_name || 'A')[0].toUpperCase()}
                </div>
                <div className="admin-text">
                    <h3>{admin.first_name} {admin.last_name}</h3>
                    <span className="role-badge">ADMINISTRATOR</span>
                </div>
            </div>

            <div className="sidebar-footer">
                <button
                    className="logout-btn-sidebar"
                    onClick={() => setShowLogoutModal(true)}
                >
                    ⏻ Logout
                </button>
            </div>

            <Modal
                isOpen={showLogoutModal}
                title="Confirm Logout"
                message="Are you sure you want to sign out of the Admin Console?"
                type="confirm"
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogoutConfirm}
            />
        </div>
    );
}

export default AdminSidebar;
