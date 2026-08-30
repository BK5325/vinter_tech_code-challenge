import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { attemptService } from '../../services/attemptService';
import { useSecurityMonitor } from '../../hooks/useSecurityMonitor';
import api from '../../services/api';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const pad = (n) => String(Math.floor(n)).padStart(2, '0');
const formatTime = (secs) => {
  const s = Math.max(0, secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sc)}` : `${pad(m)}:${pad(sc)}`;
};

const AUTOSAVE_DEBOUNCE_MS = 800;

/* ─── Question Palette ────────────────────────────────────────────────────── */
function QuestionPalette({ questions, answers, currentIdx, onNavigate }) {
  const getStatus = (qId) => {
    const a = answers[qId];
    const hasAnswer = a?.answerData !== null && a?.answerData !== undefined && a?.answerData !== '';
    const isReview = a?.markedForReview;
    if (hasAnswer && isReview) return 'answered-review';
    if (isReview) return 'review';
    if (hasAnswer) return 'answered';
    return 'not-answered';
  };

  const counts = { answered: 0, 'not-answered': 0, review: 0, 'answered-review': 0 };
  questions.forEach((q) => { const s = getStatus(q._id); counts[s] = (counts[s] || 0) + 1; });

  return (
    <div className="palette-sidebar">
      <div className="palette-title">Question Navigation</div>

      {/* Legend */}
      <div className="palette-legend">
        {[
          { status: 'answered', dot: 'rgba(34,197,94,0.8)', label: `Answered (${counts.answered})` },
          { status: 'not-answered', dot: 'var(--color-surface-3)', label: `Not Answered (${counts['not-answered']})` },
          { status: 'review', dot: 'rgba(245,158,11,0.8)', label: `Marked for Review (${counts.review})` },
          { status: 'answered-review', dot: 'rgba(99,102,241,0.8)', label: `Answered + Review (${counts['answered-review']})` },
        ].map((item) => (
          <div key={item.status} className="palette-legend-item">
            <div className="palette-dot" style={{ background: item.dot }} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="palette-grid">
        {questions.map((q, idx) => {
          const status = getStatus(q._id);
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={q._id}
              className={`palette-btn ${status}${isCurrent ? ' current' : ''}`}
              onClick={() => onNavigate(idx)}
              title={`Question ${idx + 1} — ${status.replace('-', ' ')}`}
              aria-label={`Go to question ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Timer Component ─────────────────────────────────────────────────────── */
function Timer({ endsAt, onExpire }) {
  const [remaining, setRemaining] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const secs = Math.max(0, Math.round((new Date(endsAt) - new Date()) / 1000));
      setRemaining(secs);
      if (secs === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  const cls = remaining <= 60 ? 'danger' : remaining <= 300 ? 'warning' : '';

  return (
    <div className={`timer ${cls}`} aria-label={`Time remaining: ${formatTime(remaining)}`} aria-live="polite">
      <span aria-hidden="true">⏱</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
        {formatTime(remaining)}
      </span>
    </div>
  );
}

/* ─── Answer Area ─────────────────────────────────────────────────────────── */
function AnswerArea({ question, savedAnswer, optionOrder, onAnswer }) {
  if (!question) return null;

  const orderedOptions = () => {
    if (!optionOrder || !question.options) return question.options || [];
    const orderList = optionOrder[question._id?.toString()] || optionOrder[question._id] || [];
    if (!orderList.length) return question.options;
    const optMap = {};
    question.options.forEach((o) => { optMap[o._id?.toString() || o._id] = o; });
    return orderList.map((id) => optMap[id]).filter(Boolean);
  };

  const options = orderedOptions();
  const selected = savedAnswer?.answerData;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  if (question.questionType === 'OMR') {
    return (
      <div className="options-grid" role="radiogroup" aria-label="Answer options">
        {options.map((opt, i) => {
          const isSelected = String(selected) === String(opt._id || opt._id?.toString());
          return (
            <div
              key={opt._id || i}
              className={`option-item${isSelected ? ' selected' : ''}`}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onAnswer(isSelected ? null : (opt._id || opt._id?.toString()))}
              onKeyDown={(e) => e.key === 'Enter' && onAnswer(isSelected ? null : (opt._id || opt._id?.toString()))}
            >
              <div className="option-letter">{letters[i] || i + 1}</div>
              <div className="option-text">{opt.text}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.questionType === 'MCQ') {
    if (question.multipleCorrect) {
      const selectedArr = Array.isArray(selected) ? selected.map(String) : [];
      return (
        <div className="options-grid" role="group" aria-label="Answer options (select all that apply)">
          <div className="form-hint mb-2" style={{ color: 'var(--color-warning-500)' }}>☑️ Select all correct answers</div>
          {options.map((opt, i) => {
            const optId = String(opt._id || i);
            const isSelected = selectedArr.includes(optId);
            return (
              <div
                key={optId}
                className={`option-item${isSelected ? ' selected' : ''}`}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => {
                  const next = isSelected ? selectedArr.filter((v) => v !== optId) : [...selectedArr, optId];
                  onAnswer(next.length ? next : null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const next = isSelected ? selectedArr.filter((v) => v !== optId) : [...selectedArr, optId];
                    onAnswer(next.length ? next : null);
                  }
                }}
              >
                <div className="option-letter">{letters[i] || i + 1}</div>
                <div className="option-text">{opt.text}</div>
              </div>
            );
          })}
        </div>
      );
    }
    // Single correct MCQ
    return (
      <div className="options-grid" role="radiogroup" aria-label="Answer options">
        {options.map((opt, i) => {
          const optId = String(opt._id || i);
          const isSelected = String(selected) === optId;
          return (
            <div
              key={optId}
              className={`option-item${isSelected ? ' selected' : ''}`}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onAnswer(isSelected ? null : optId)}
              onKeyDown={(e) => e.key === 'Enter' && onAnswer(isSelected ? null : optId)}
            >
              <div className="option-letter">{letters[i] || i + 1}</div>
              <div className="option-text">{opt.text}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.questionType === 'SHORT_ANSWER') {
    return (
      <div>
        <label htmlFor="short-answer-input" className="form-label mb-2" style={{ display: 'block' }}>
          Your Answer
        </label>
        <input
          id="short-answer-input"
          type="text"
          className="short-answer-input"
          placeholder="Type your answer here..."
          value={selected || ''}
          onChange={(e) => onAnswer(e.target.value || null)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="form-hint mt-2">Answer is evaluated case-insensitively unless specified otherwise.</div>
      </div>
    );
  }

  return null;
}

/* ─── Main Challenge Interface ────────────────────────────────────────────── */
export default function ChallengeInterface() {
  const { challengeId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: { answerData, markedForReview } }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('idle'); // idle | saving | saved | error
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [violations, setViolations] = useState(0);
  const [violationWarning, setViolationWarning] = useState('');

  const autosaveTimerRef = useRef(null);
  const lastSavedRef = useRef(null);

  // ── Start / Recover Attempt ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const d = await attemptService.start(challengeId);
        const { attempt: att, answers: savedAnswers } = d.data;
        setAttempt(att);

        // Fetch ordered questions from backend
        const qRes = await api.get(`/challenges/${challengeId}/questions-participant?attemptId=${att._id}`);
        const orderedQuestions = qRes.data?.data?.questions || [];

        // Build answers map
        const answerMap = {};
        savedAnswers.forEach((a) => {
          answerMap[a.questionId.toString()] = { answerData: a.answerData, markedForReview: a.markedForReview };
        });

        setQuestions(orderedQuestions.length ? orderedQuestions : att.questionOrder.map((id) => ({ _id: id })));
        setAnswers(answerMap);

        if (d.data.isRecovery) {
          toast.info('Your previous session has been restored. Continuing from where you left off.');
        }
      } catch (err) {
        toast.error(err.message);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [challengeId]);

  // ── Security Monitor ────────────────────────────────────────────────────
  const handleViolation = useCallback((eventType) => {
    const warningEvents = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT'];
    if (warningEvents.includes(eventType)) {
      setViolations((v) => v + 1);
      const msgs = {
        TAB_SWITCH: '⚠️ Tab switch detected. Please stay on the challenge screen.',
        WINDOW_BLUR: '⚠️ Window lost focus. Please keep the challenge window active.',
        FULLSCREEN_EXIT: '⚠️ Fullscreen exited. Please return to fullscreen mode.',
        COPY_ATTEMPT: '⚠️ Copy attempt detected and blocked.',
      };
      setViolationWarning(msgs[eventType] || '⚠️ Security event detected.');
      setTimeout(() => setViolationWarning(''), 4000);
    }
  }, []);

  const { requestFullscreen } = useSecurityMonitor({
    attemptId: attempt?._id,
    enabled: !!attempt && !submitted,
    onViolation: handleViolation,
  });

  // ── Autosave ────────────────────────────────────────────────────────────
  const saveAnswer = useCallback(async (questionId, answerData) => {
    if (!attempt?._id || submitted) return;
    setSavingStatus('saving');
    try {
      await attemptService.saveAnswer(attempt._id, questionId, answerData);
      setSavingStatus('saved');
      lastSavedRef.current = new Date();
    } catch {
      setSavingStatus('error');
    }
  }, [attempt, submitted]);

  const handleAnswer = useCallback((answerData) => {
    const question = questions[currentIdx];
    if (!question) return;
    const qId = question._id.toString();

    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], answerData } }));

    // Debounced autosave
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveAnswer(qId, answerData);
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [currentIdx, questions, saveAnswer]);

  const handleToggleReview = useCallback(async () => {
    const question = questions[currentIdx];
    if (!question || !attempt?._id) return;
    const qId = question._id.toString();
    const current = answers[qId]?.markedForReview || false;
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], markedForReview: !current } }));
    try {
      await attemptService.toggleReview(attempt._id, qId, !current);
    } catch { /* silent */ }
  }, [currentIdx, questions, answers, attempt]);

  const handleClearAnswer = useCallback(async () => {
    const question = questions[currentIdx];
    if (!question || !attempt?._id) return;
    const qId = question._id.toString();
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], answerData: null } }));
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    await saveAnswer(qId, null);
  }, [currentIdx, questions, attempt, saveAnswer]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!attempt?._id || submitting || submitted) return;
    setSubmitting(true);
    setSubmitConfirm(false);
    try {
      await attemptService.submit(attempt._id);
      setSubmitted(true);
      toast.success('Challenge submitted successfully!');
      navigate(`/dashboard/result/${attempt._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [attempt, submitting, submitted, navigate]);

  // ── Timer Expiry ────────────────────────────────────────────────────────
  const handleTimerExpire = useCallback(async () => {
    if (submitted || submitting || !attempt?._id) return;
    toast.warning('Time is up! Submitting your challenge...');
    try {
      await attemptService.submit(attempt._id);
      setSubmitted(true);
      navigate(`/dashboard/result/${attempt._id}`);
    } catch { /* auto-submit already handled server-side */ }
  }, [attempt, submitted, submitting, navigate]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const goTo = (idx) => {
    if (idx >= 0 && idx < questions.length) setCurrentIdx(idx);
  };

  if (loading) {
    return (
      <div className="loading-page" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
        <span>Preparing your challenge...</span>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const currentAnswer = currentQuestion ? answers[currentQuestion._id?.toString()] : null;
  const isMarkedForReview = currentAnswer?.markedForReview || false;
  const optionOrder = attempt?.optionOrder || {};

  const answeredCount = questions.filter((q) => {
    const a = answers[q._id?.toString()];
    return a?.answerData !== null && a?.answerData !== undefined && a?.answerData !== '';
  }).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="challenge-layout" style={{ userSelect: 'none' }}>
      {/* Main Area */}
      <div className="challenge-main">
        {/* Header */}
        <header className="challenge-header">
          <div>
            <div className="challenge-title">{attempt?.challengeId?.title || 'Challenge'}</div>
            <div className="challenge-meta">{user?.name} · Question {currentIdx + 1} of {questions.length}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {violationWarning && (
              <div style={{ padding: '0.5rem 0.875rem', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', color: '#fbbf24', fontSize: '0.8125rem', maxWidth: 300 }}>
                {violationWarning}
              </div>
            )}
            {attempt?.endsAt && (
              <Timer endsAt={attempt.endsAt} onExpire={handleTimerExpire} />
            )}
            <button
              className="btn btn-danger"
              onClick={() => setSubmitConfirm(true)}
              disabled={submitting || submitted}
              id="submit-challenge-btn"
            >
              {submitting ? <><span className="spinner" /> Submitting...</> : '🏁 Submit'}
            </button>
          </div>
        </header>

        {/* Question Body */}
        <div className="challenge-body" style={{ flex: 1 }}>
          {currentQuestion && (
            <div className="animate-fade-in" key={currentIdx}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div className="question-number">Question {currentIdx + 1}</div>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <span className="badge badge-gray">{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}</span>
                  {currentQuestion.negativeMarks > 0 && <span className="badge badge-danger">-{currentQuestion.negativeMarks}</span>}
                  <span className="badge badge-gray">{currentQuestion.difficulty}</span>
                </div>
              </div>

              <div className="question-text" aria-label="Question">{currentQuestion.questionText}</div>

              <AnswerArea
                question={currentQuestion}
                savedAnswer={currentAnswer}
                optionOrder={optionOrder}
                onAnswer={handleAnswer}
              />
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <nav className="challenge-nav" aria-label="Question navigation">
          <button
            className="btn btn-secondary"
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            id="prev-question-btn"
          >← Previous</button>

          <button
            className={`btn ${isMarkedForReview ? 'btn-warning' : 'btn-secondary'}`}
            onClick={handleToggleReview}
            id="mark-review-btn"
            style={{ background: isMarkedForReview ? 'rgba(245,158,11,0.15)' : '', borderColor: isMarkedForReview ? 'rgba(245,158,11,0.5)' : '', color: isMarkedForReview ? '#fbbf24' : '' }}
          >
            {isMarkedForReview ? '⭐ Marked' : '☆ Mark for Review'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleClearAnswer}
            disabled={!currentAnswer?.answerData}
            id="clear-answer-btn"
          >🗑 Clear</button>

          <button
            className="btn btn-primary"
            onClick={() => goTo(currentIdx + 1)}
            disabled={currentIdx === questions.length - 1}
            id="next-question-btn"
          >Next →</button>

          <div className={`autosave-status ${savingStatus}`} aria-live="polite">
            {savingStatus === 'saving' && '💾 Saving...'}
            {savingStatus === 'saved' && `✅ Saved ${lastSavedRef.current ? new Date(lastSavedRef.current).toLocaleTimeString() : ''}`}
            {savingStatus === 'error' && '⚠️ Save failed'}
          </div>
        </nav>
      </div>

      {/* Question Palette Sidebar */}
      <QuestionPalette
        questions={questions}
        answers={answers}
        currentIdx={currentIdx}
        onNavigate={goTo}
      />

      {/* Submit Confirmation Modal */}
      {submitConfirm && (
        <div className="modal-overlay" onClick={() => setSubmitConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">🏁 Submit Challenge?</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem 0' }}>
              {[
                { label: 'Answered', value: answeredCount, color: 'var(--color-success-500)', icon: '✅' },
                { label: 'Not Answered', value: unansweredCount, color: 'var(--color-danger-500)', icon: '⭕' },
                { label: 'Marked for Review', value: questions.filter((q) => answers[q._id?.toString()]?.markedForReview).length, color: 'var(--color-warning-500)', icon: '⭐' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span>{item.icon}</span><span style={{ color: 'var(--color-text-2)' }}>{item.label}</span></div>
                  <span style={{ fontWeight: 700, color: item.color, fontSize: '1.1rem' }}>{item.value}</span>
                </div>
              ))}
            </div>
            {unansweredCount > 0 && (
              <div className="alert alert-dark alert-warning mt-4">
                <span>⚠️</span>
                <span>You have {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}. Once submitted, you cannot change your answers.</span>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSubmitConfirm(false)}>Continue Answering</button>
              <button className="btn btn-danger" onClick={handleSubmit} disabled={submitting} id="confirm-submit-btn">
                {submitting ? <><span className="spinner" /> Submitting...</> : '🏁 Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
