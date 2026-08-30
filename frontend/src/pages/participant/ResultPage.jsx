import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resultService } from '../../services/adminService';

export default function ResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    resultService.getById(attemptId)
      .then((d) => setResult(d.data.result))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="loading-page" style={{ minHeight: '100vh' }}><div className="spinner spinner-lg" /><span>Loading result...</span></div>;
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2>Result Unavailable</h2>
        <p style={{ color: 'var(--color-text-3)', marginBottom: '1.5rem' }}>{error}</p>
        <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  );
  if (!result) return null;

  const pct = result.percentage?.toFixed(1);
  const pctNum = parseFloat(pct || 0);
  const grade = pctNum >= 90 ? { label: 'Excellent', color: '#4ade80', emoji: '🏆' }
    : pctNum >= 75 ? { label: 'Good', color: '#60a5fa', emoji: '⭐' }
    : pctNum >= 50 ? { label: 'Pass', color: '#fbbf24', emoji: '✅' }
    : { label: 'Needs Improvement', color: '#f87171', emoji: '📚' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-slide-up">

        {/* Hero Score Card */}
        <div className="card mb-6" style={{
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)',
          textAlign: 'center', padding: '2.5rem',
          borderTop: `4px solid ${grade.color}`,
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{grade.emoji}</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{result.challenge?.title}</h1>
          <div style={{ color: 'var(--color-text-3)', marginBottom: '1.5rem' }}>
            {result.status === 'AUTO_SUBMITTED' ? '⚠️ Auto-submitted' : 'Submitted'} · {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : ''}
          </div>

          {result.scoreHidden ? (
            <div className="alert alert-dark alert-info" style={{ display: 'inline-flex', margin: '0 auto' }}>
              <span>🔒</span> Score will be released by the administrator.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '4rem', fontWeight: 900, color: grade.color, lineHeight: 1 }}>{pct}%</span>
              </div>
              <div style={{ fontSize: '1.25rem', color: 'var(--color-text-3)', marginBottom: '0.25rem' }}>
                {result.score} / {result.totalMarks} marks
              </div>
              <div style={{ display: 'inline-block', padding: '0.375rem 1rem', background: `${grade.color}20`, border: `1px solid ${grade.color}40`, borderRadius: 'var(--radius-full)', color: grade.color, fontWeight: 700, fontSize: '0.875rem' }}>
                {grade.label}
              </div>
            </>
          )}
        </div>

        {/* Stats Row */}
        {!result.scoreHidden && (
          <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {[
              { label: 'Correct', value: result.correctCount, color: 'var(--color-success-500)', icon: '✅' },
              { label: 'Wrong', value: result.wrongCount, color: 'var(--color-danger-500)', icon: '❌' },
              { label: 'Unanswered', value: result.unansweredCount, color: 'var(--color-text-3)', icon: '⭕' },
              { label: 'Time Taken', value: result.timeTaken ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s` : '—', color: 'var(--color-primary-300)', icon: '⏱' },
              result.rank ? { label: 'Your Rank', value: `#${result.rank}`, color: 'var(--color-warning-500)', icon: '🥇' } : null,
              { label: 'Violations', value: result.violationCount, color: result.violationCount > 0 ? 'var(--color-warning-500)' : 'var(--color-text-3)', icon: '🛡️' },
            ].filter(Boolean).map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: stat.color }}>{stat.value ?? '—'}</div>
                <div className="stat-icon" aria-hidden="true">{stat.icon}</div>
              </div>
            ))}
          </div>
        )}

        {/* Answer Review */}
        {result.answers && result.answers.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>📝 Answer Review</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {result.answers.map((a, idx) => (
                <div key={a.question._id} className="card" style={{ borderLeft: `3px solid ${a.isCorrect ? 'var(--color-success-500)' : a.answerData ? 'var(--color-danger-500)' : 'var(--color-text-4)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>
                      <span style={{ color: 'var(--color-primary-400)', marginRight: '0.5rem' }}>Q{idx + 1}.</span>
                      {a.question.questionText}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                      <span className={`badge ${a.isCorrect ? 'badge-success' : a.answerData ? 'badge-danger' : 'badge-gray'}`}>
                        {a.isCorrect ? '✅ Correct' : a.answerData ? '❌ Wrong' : '⭕ Unanswered'}
                      </span>
                      <span className="badge badge-gray">{a.marksAwarded > 0 ? '+' : ''}{a.marksAwarded}</span>
                    </div>
                  </div>
                  {a.question.options && a.question.options.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {a.question.options.map((opt, oi) => {
                        const optId = opt._id?.toString();
                        const isCorrect = String(a.question.correctAnswer) === optId || (Array.isArray(a.question.correctAnswer) && a.question.correctAnswer.includes(optId));
                        const isSelected = String(a.answerData) === optId || (Array.isArray(a.answerData) && a.answerData.includes(optId));
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        return (
                          <div key={optId} style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                            background: isCorrect ? 'rgba(34,197,94,0.1)' : isSelected ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-2)',
                            border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : isSelected ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
                          }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: isCorrect ? 'var(--color-success-600)' : isSelected ? 'var(--color-danger-600)' : 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                              {letters[oi] || oi + 1}
                            </div>
                            <span style={{ flex: 1, fontSize: '0.9rem', color: isCorrect ? '#4ade80' : isSelected ? '#f87171' : 'var(--color-text-2)' }}>{opt.text}</span>
                            {isCorrect && <span style={{ fontSize: '0.8125rem', color: '#4ade80' }}>✅ Correct</span>}
                            {isSelected && !isCorrect && <span style={{ fontSize: '0.8125rem', color: '#f87171' }}>Your choice</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {a.question.questionType === 'SHORT_ANSWER' && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--color-text-3)' }}>Your answer: <strong style={{ color: 'var(--color-text-2)' }}>{a.answerData || '(blank)'}</strong></span>
                      <span style={{ color: 'var(--color-text-3)' }}>Correct: <strong style={{ color: 'var(--color-success-500)' }}>{a.question.correctAnswer}</strong></span>
                    </div>
                  )}
                  {a.question.explanation && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--color-text-2)' }}>
                      💡 {a.question.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-secondary btn-lg">← Dashboard</Link>
          <Link to="/dashboard/challenges" className="btn btn-primary btn-lg">More Challenges →</Link>
        </div>
      </div>
    </div>
  );
}
