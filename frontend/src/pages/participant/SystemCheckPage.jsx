import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const CHECK_ITEMS = [
  {
    id: 'internet',
    label: 'Internet Connection',
    description: 'Checking connectivity...',
    check: () => navigator.onLine,
  },
  {
    id: 'browser',
    label: 'Browser Compatibility',
    description: 'Checking browser support...',
    check: () => typeof window !== 'undefined' && typeof document !== 'undefined',
  },
  {
    id: 'javascript',
    label: 'JavaScript Enabled',
    description: 'Verifying JavaScript...',
    check: () => true, // If this runs, JS is enabled
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen Support',
    description: 'Checking fullscreen API...',
    check: () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.mozRequestFullScreen),
  },
  {
    id: 'cookies',
    label: 'Session Support',
    description: 'Checking session cookies...',
    check: () => navigator.cookieEnabled,
  },
];

export default function SystemCheckPage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [checks, setChecks] = useState(CHECK_ITEMS.map((c) => ({ ...c, status: 'pending' })));
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const runChecks = async () => {
      const results = [];
      for (let i = 0; i < CHECK_ITEMS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (cancelled) return;
        const item = CHECK_ITEMS[i];
        let status = 'pass';
        try {
          const result = item.check();
          status = result ? 'pass' : (item.id === 'fullscreen' ? 'warning' : 'fail');
        } catch {
          status = 'warning';
        }
        results.push({ ...item, status });
        setChecks([...results, ...CHECK_ITEMS.slice(i + 1).map((c) => ({ ...c, status: 'pending' }))]);
      }
      if (!cancelled) setAllDone(true);
    };
    runChecks();
    return () => { cancelled = true; };
  }, []);

  const hasFail = checks.some((c) => c.status === 'fail');
  const allChecked = checks.every((c) => c.status !== 'pending');

  const statusConfig = {
    pending: { icon: '⏳', color: 'var(--color-text-3)', label: 'Checking...' },
    pass:    { icon: '✅', color: 'var(--color-success-500)', label: 'PASS' },
    warning: { icon: '⚠️', color: 'var(--color-warning-500)', label: 'WARNING' },
    fail:    { icon: '❌', color: 'var(--color-danger-500)', label: 'FAIL' },
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 560 }} className="animate-slide-up">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>System Check</h1>
          <p style={{ color: 'var(--color-text-3)' }}>Verifying your browser is ready for the challenge</p>
        </div>

        <div className="card mb-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {checks.map((check, i) => {
              const cfg = statusConfig[check.status];
              return (
                <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: i < checks.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ fontSize: '1.25rem', width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {check.status === 'pending' ? <div className="spinner" style={{ borderTopColor: 'var(--color-primary-500)' }} /> : cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9375rem' }}>{check.label}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{check.description}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {check.status !== 'pending' ? cfg.label : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Camera note */}
        <div className="alert alert-dark alert-info mb-4" style={{ fontSize: '0.875rem' }}>
          <span>🔒</span>
          <span>No camera or microphone access is required or requested for this assessment.</span>
        </div>

        {allChecked && hasFail && (
          <div className="alert alert-dark alert-danger mb-4">
            <span>⚠️</span>
            <span>Some checks failed. You may still proceed, but the experience may be degraded. Ensure you have a stable internet connection.</span>
          </div>
        )}

        {allChecked && !hasFail && (
          <div className="alert alert-dark alert-success mb-4">
            <span>✅</span>
            <span>All checks passed! Your browser is ready for the challenge.</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate(`/challenge/${challengeId}/instructions`)}>← Back</button>
          <button
            className="btn btn-primary btn-lg"
            disabled={!allChecked}
            onClick={() => navigate(`/challenge/${challengeId}/countdown`)}
          >
            {!allChecked ? 'Checking...' : 'Proceed to Challenge →'}
          </button>
        </div>
      </div>
    </div>
  );
}
