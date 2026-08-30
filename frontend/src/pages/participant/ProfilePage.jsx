import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', institution: user?.institution || '', course: user?.course || '', studentId: user?.studentId || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [tab, setTab] = useState('profile');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/users/${user._id}`, { name: form.name, phone: form.phone, institution: form.institution, course: form.course, studentId: form.studentId });
      await refreshUser();
      toast.success('Profile updated.');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match.'); return; }
    setChangingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message); }
    finally { setChangingPw(false); }
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'P';

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 700 }}>
      {/* Avatar Header */}
      <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.75rem', color: 'white', flexShrink: 0, boxShadow: 'var(--shadow-glow)' }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem' }}>{user?.name}</h1>
          <div style={{ color: 'var(--color-text-3)', fontSize: '0.9rem' }}>{user?.email}</div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-primary">{user?.role}</span>
            {user?.institution && <span className="badge badge-gray">{user.institution}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'profile' ? ' active' : ''}`} onClick={() => setTab('profile')}>👤 Profile</button>
        <button className={`tab-btn${tab === 'password' ? ' active' : ''}`} onClick={() => setTab('password')}>🔑 Change Password</button>
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="card animate-fade-in">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="profile-name" className="form-label required">Full Name</label>
              <input id="profile-name" type="text" className="form-input" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
              <div className="form-hint">Email cannot be changed.</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="profile-phone" className="form-label">Phone</label>
                <input id="profile-phone" type="tel" className="form-input" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="profile-studentid" className="form-label">Student ID</label>
                <input id="profile-studentid" type="text" className="form-input" value={form.studentId} onChange={(e) => setForm(p => ({ ...p, studentId: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="profile-institution" className="form-label">Institution</label>
                <input id="profile-institution" type="text" className="form-input" value={form.institution} onChange={(e) => setForm(p => ({ ...p, institution: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="profile-course" className="form-label">Course</label>
                <input id="profile-course" type="text" className="form-input" value={form.course} onChange={(e) => setForm(p => ({ ...p, course: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Saving...</> : '✅ Save Changes'}
            </button>
          </div>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={handlePasswordChange} className="card animate-fade-in">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="current-pw" className="form-label required">Current Password</label>
              <input id="current-pw" type="password" className="form-input" value={pwForm.currentPassword} onChange={(e) => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} required autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label htmlFor="new-pw" className="form-label required">New Password</label>
              <input id="new-pw" type="password" className="form-input" placeholder="Minimum 8 characters" value={pwForm.newPassword} onChange={(e) => setPwForm(p => ({ ...p, newPassword: e.target.value }))} required autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-pw" className="form-label required">Confirm New Password</label>
              <input id="confirm-pw" type="password" className="form-input" placeholder="Repeat new password" value={pwForm.confirmPassword} onChange={(e) => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} required autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={changingPw}>
              {changingPw ? <><span className="spinner" /> Changing...</> : '🔑 Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
