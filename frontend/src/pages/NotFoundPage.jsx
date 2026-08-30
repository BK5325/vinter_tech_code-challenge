import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }} className="animate-slide-up">
        <div style={{ fontSize: '6rem', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 900, background: 'linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          404
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Page Not Found</h1>
        <p style={{ color: 'var(--color-text-3)', marginBottom: '2rem', maxWidth: 360 }}>
          The page you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</Link>
          <Link to="/login" className="btn btn-secondary btn-lg">Login</Link>
        </div>
      </div>
    </div>
  );
}
