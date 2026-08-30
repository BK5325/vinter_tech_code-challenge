import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challengeService } from '../../services/challengeService';

export default function ChallengeInstructionsPage() {
  const { challengeId } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    challengeService.getById(challengeId)
      .then((d) => setChallenge(d.data.challenge))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [challengeId]);

  if (loading) return <div className="loading-page" style={{ minHeight: '100vh' }}><div className="spinner spinner-lg" /><span>Loading...</span></div>;
  if (!challenge) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 700 }} className="animate-slide-up">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📋</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{challenge.title}</h1>
          <p style={{ color: 'var(--color-text-3)' }}>Instructions & Rules</p>
        </div>

        {/* Challenge Details */}
        <div className="card mb-4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary-300)' }}>{challenge.duration}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Minutes</div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-accent-400)' }}>{challenge.totalQuestions}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Questions</div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success-500)' }}>{challenge.totalMarks}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Marks</div>
            </div>
          </div>
        </div>

        {/* Custom instructions */}
        {challenge.instructions && (
          <div className="card mb-4">
            <h3 style={{ marginBottom: '0.75rem' }}>📝 Challenge Instructions</h3>
            <div style={{ color: 'var(--color-text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{challenge.instructions}</div>
          </div>
        )}

        {/* General Rules */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: '1rem' }}>📏 General Rules</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              '✅ Ensure you have a stable internet connection before starting.',
              '✅ Use a desktop or laptop browser for the best experience.',
              '✅ Close unnecessary applications and browser tabs.',
              '✅ Stay on the challenge screen throughout the assessment.',
              '⚠️ Do not switch browser tabs or windows during the challenge.',
              '⚠️ Do not copy question text or answer options.',
              '⚠️ Do not use unauthorized external resources.',
              '⚠️ Challenge activity is monitored using browser-based security events.',
              '⚠️ Violations may result in warnings or automatic submission according to configured rules.',
              '🔒 The assessment timer runs on the server. Refreshing will not reset your time.',
              '💾 Your answers are automatically saved as you progress.',
            ].map((rule, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem', color: 'var(--color-text-2)', padding: '0.5rem 0', borderBottom: i < 10 ? '1px solid var(--color-border)' : 'none' }}>
                {rule}
              </div>
            ))}
          </div>
          <div className="alert alert-dark alert-info mt-4" style={{ fontSize: '0.875rem' }}>
            <span>ℹ️</span>
            <span>Browser-based monitoring detects tab switches, fullscreen exits, and copy attempts. These are indicators only and do not constitute confirmed violations. The system uses best-effort detection — it cannot prevent all external tools.</span>
          </div>
        </div>

        {/* Marking Scheme */}
        {challenge.negativeMarking && (
          <div className="card mb-4">
            <h3 style={{ marginBottom: '0.75rem' }}>⚖️ Marking Scheme</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius)', color: '#4ade80', fontWeight: 700 }}>
                Correct: +{challenge.marksPerQuestion}
              </div>
              <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', color: '#f87171', fontWeight: 700 }}>
                Wrong: -{challenge.negativeMarkValue}
              </div>
              <div style={{ padding: '0.75rem 1.25rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-text-3)', fontWeight: 700 }}>
                Unanswered: 0
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/dashboard')}>← Back</button>
          <button className="btn btn-primary btn-lg" onClick={() => navigate(`/challenge/${challengeId}/system-check`)}>
            Continue to System Check →
          </button>
        </div>
      </div>
    </div>
  );
}
