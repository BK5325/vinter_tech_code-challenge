import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const NAV = [
  { to: '/staff', end: true, icon: '📊', label: 'Dashboard' },
  { to: '/staff/participants', icon: '👥', label: 'Participants' },
  { to: '/staff/scores', icon: '🎯', label: 'Scores' },
  { to: '/staff/rankings', icon: '🥇', label: 'Rankings' },
  { to: '/staff/security', icon: '🛡️', label: 'Security Events' },
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out.');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'S';

  return (
    <div className="app-layout">
      <aside className="sidebar" role="navigation" aria-label="Staff navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">⚡</div>
            <div>
              <div className="sidebar-logo-text">VinterTech</div>
              <div className="sidebar-logo-sub">Staff Portal</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name truncate">{user?.name}</div>
              <div className="sidebar-user-role">Staff</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-full mt-2" style={{ justifyContent: 'flex-start', gap: '0.75rem', paddingLeft: '0.75rem' }}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>
      <div className="main-content"><Outlet /></div>
    </div>
  );
}
