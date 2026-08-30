import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challengeService } from '../../services/challengeService';

const COUNTDOWN_SECONDS = 60;

export default function CountdownPage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    challengeService.getById(challengeId)
      .then((d) => setChallenge(d.data.challenge))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [challengeId]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(intervalRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const canStart = seconds === 0 && agreed;

  const handleStart = () => {
    if (!canStart) return;
    navigate(`/challenge/${challengeId}/start`);
  };

  const pad = (n) => String(n).padStart(2, '0');
  const progress = ((COUNTDOWN_SECONDS - seconds) / COUNTDOWN_SECONDS) * 100;
  const circumference = 2 * Math.PI * 80; // r=80

  if (loading) return <div className="loading-page" style={{ minHeight: '100vh' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }} className="animate-slide-up">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Get Ready!</h1>
          <p style={{ color: 'var(--color-text-3)' }}>{challenge?.title}</p>
        </div>

        {/* Circular countdown */}
        <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 2rem' }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
            <circle
              cx="100" cy="100" r="80" fill="none"
              stroke={seconds <= 10 ? 'var(--color-danger-500)' : seconds <= 30 ? 'var(--color-warning-500)' : 'var(--color-primary-500)'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.3s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="countdown-display" style={{ fontSize: '3.5rem' }}>{pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
              {seconds > 0 ? 'Wait for countdown' : '✅ Ready!'}
            </div>
          </div>
        </div>

        {/* Agreement */}
        <div className="card mb-4" style={{ textAlign: 'left' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>📋 Student Declaration</h3>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
            By starting this challenge, I confirm that:
            <ul style={{ margin: '0.75rem 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <li>I have read and understood all the challenge rules and instructions.</li>
              <li>I will not use any unauthorized external resources during the challenge.</li>
              <li>I will not share challenge content with others.</li>
              <li>I understand that my browser activity will be monitored during the assessment.</li>
              <li>I agree to abide by the assessment rules throughout the challenge.</li>
            </ul>
          </div>
          <label className="checkbox-label" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
            <input
              type="checkbox"
              id="agreement-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
              I have read and agree to the rules and student declaration above.
            </span>
          </label>
        </div>

        {seconds > 0 && (
          <div className="alert alert-dark alert-warning mb-4" style={{ justifyContent: 'center' }}>
            <span>⏳</span>
            <span>Please wait {seconds} seconds before starting. You may use this time to read the rules.</span>
          </div>
        )}

        <button
          id="start-challenge-btn"
          className="btn btn-primary btn-lg btn-full"
          disabled={!canStart}
          onClick={handleStart}
          style={{ fontSize: '1.1rem', padding: '1rem' }}
        >
          {!agreed && seconds === 0 ? '☑️ Please accept the declaration above' :
           seconds > 0 ? `⏳ Waiting (${seconds}s)...` :
           '🚀 Start Challenge Now'}
        </button>
      </div>
    </div>
  );
}
