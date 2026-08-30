import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', institution: '', course: '', studentId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) { setError('Name, email, and password are required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, phone: form.phone, institution: form.institution, course: form.course, studentId: form.studentId });
      toast.success('Account created! Welcome to VinterTech.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up" role="main" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon" aria-hidden="true">⚡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-text)' }}>VinterTech</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>Code Challenge Platform</div>
          </div>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle" style={{ marginBottom: '1.75rem' }}>Join the platform as a participant</p>

        {error && (
          <div className="alert alert-dark alert-danger mb-4" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-name" className="form-label required">Full Name</label>
                <input id="reg-name" name="name" type="text" className="form-input" placeholder="John Doe" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email" className="form-label required">Email Address</label>
                <input id="reg-email" name="email" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-password" className="form-label required">Password</label>
                <input id="reg-password" name="password" type="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="reg-confirm" className="form-label required">Confirm Password</label>
                <input id="reg-confirm" name="confirmPassword" type="password" className="form-input" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: '0.75rem' }}>
                Optional Details
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-institution" className="form-label">College / Institution</label>
                  <input id="reg-institution" name="institution" type="text" className="form-input" placeholder="Your institution" value={form.institution} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-course" className="form-label">Course</label>
                  <input id="reg-course" name="course" type="text" className="form-input" placeholder="e.g. B.Tech CSE" value={form.course} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row mt-3">
                <div className="form-group">
                  <label htmlFor="reg-studentid" className="form-label">Student ID</label>
                  <input id="reg-studentid" name="studentId" type="text" className="form-input" placeholder="Roll number" value={form.studentId} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-phone" className="form-label">Phone</label>
                  <input id="reg-phone" name="phone" type="tel" className="form-input" placeholder="+91 9999999999" value={form.phone} onChange={handleChange} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} id="register-submit">
              {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-3)' }}>
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
