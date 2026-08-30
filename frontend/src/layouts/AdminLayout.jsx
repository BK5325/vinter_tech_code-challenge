import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const NAV = [
  { to: '/admin', end: true, icon: '📊', label: 'Dashboard' },
  { section: 'Management' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/challenges', icon: '🏆', label: 'Challenges' },
  { to: '/admin/questions', icon: '❓', label: 'Question Bank' },
  { section: 'Activity' },
  { to: '/admin/attempts', icon: '📝', label: 'Attempts' },
  { to: '/admin/scores', icon: '🎯', label: 'Scores' },
  { to: '/admin/rankings', icon: '🥇', label: 'Rankings' },
  { section: 'Monitoring' },
  { to: '/admin/security', icon: '🛡️', label: 'Security Events' },
  { to: '/admin/reports', icon: '📈', label: 'Reports & Exports' },
  { to: '/admin/audit-logs', icon: '📋', label: 'Audit Logs' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    success('Logged out successfully.');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sidebar-logo-icon">⚡</div>
          <div style={{ fontWeight: 700 }}>Admin Console</div>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={() => setSidebarOpen(true)}>☰</button>
      </div>

      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Admin navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">⚡</div>
            <div>
              <div className="sidebar-logo-text">VinterTech</div>
              <div className="sidebar-logo-sub">Admin Console</div>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost mobile-only-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) =>
            item.section ? (
              <div key={i} className="sidebar-section-label">{item.section}</div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name truncate">{user?.name}</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-full mt-2"
            style={{ justifyContent: 'flex-start', gap: '0.75rem', paddingLeft: '0.75rem' }}
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
