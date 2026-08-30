import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.user.name}!`);
      if (data.user.role === 'ADMIN') navigate('/admin');
      else if (data.user.role === 'STAFF') navigate('/staff');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide-up" role="main">
        <div className="auth-logo">
          <div className="auth-logo-icon" aria-hidden="true">⚡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-text)' }}>VinterTech</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>Code Challenge Platform</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle" style={{ marginBottom: '1.75rem' }}>Sign in to your account to continue</p>

        {error && (
          <div className="alert alert-dark alert-danger mb-4" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label required">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label required">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              id="login-submit"
            >
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-3)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create account</Link>
        </p>

       
      </div>
    </div>
  );
}
