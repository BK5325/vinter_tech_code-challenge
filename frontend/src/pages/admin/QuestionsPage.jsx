import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionService } from '../../services/questionService';
import { challengeService } from '../../services/challengeService';
import { useToast } from '../../context/ToastContext';

const EMPTY_OPTION = () => ({ text: '', _id: Date.now().toString() });

const defaultForm = {
  questionText: '', questionType: 'OMR',
  options: [EMPTY_OPTION(), EMPTY_OPTION(), EMPTY_OPTION(), EMPTY_OPTION()],
  correctAnswer: '', multipleCorrect: false,
  evaluationMode: 'CASE_INSENSITIVE',
  marks: 1, negativeMarks: 0,
  difficulty: 'MEDIUM', category: 'General', explanation: '',
};

function QuestionForm({ question, challengeId, onSave, onCancel }) {
  const [form, setForm] = useState(question ? { ...defaultForm, ...question } : { ...defaultForm, challengeId });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const setOption = (i, v) => setForm((p) => { const opts = [...p.options]; opts[i] = { ...opts[i], text: v }; return { ...p, options: opts }; });
  const addOption = () => setForm((p) => ({ ...p, options: [...p.options, EMPTY_OPTION()] }));
  const removeOption = (i) => setForm((p) => { const opts = p.options.filter((_, idx) => idx !== i); return { ...p, options: opts }; });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.questionText.trim()) { toast.error('Question text is required.'); return; }
    if (form.questionType !== 'SHORT_ANSWER' && form.options.some((o) => !o.text.trim())) {
      toast.error('All options must have text.'); return;
    }
    if (!form.correctAnswer && form.questionType !== 'SHORT_ANSWER') {
      toast.error('Correct answer is required.'); return;
    }
    setLoading(true);
    try {
      const payload = { ...form, challengeId };
      if (question?._id) {
        await questionService.update(question._id, payload);
        toast.success('Question updated.');
      } else {
        await questionService.create(payload);
        toast.success('Question created.');
      }
      onSave();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label required">Question Text</label>
          <textarea className="form-textarea" placeholder="Enter the question..." value={form.questionText} onChange={(e) => set('questionText', e.target.value)} style={{ minHeight: 100 }} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Question Type</label>
            <select className="form-select" value={form.questionType} onChange={(e) => set('questionType', e.target.value)}>
              <option value="OMR">OMR (Single Choice)</option>
              <option value="MCQ">MCQ</option>
              <option value="SHORT_ANSWER">Short Answer</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Marks</label>
            <input type="number" className="form-input" min={0} step={0.5} value={form.marks} onChange={(e) => set('marks', parseFloat(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Negative Marks</label>
            <input type="number" className="form-input" min={0} step={0.25} value={form.negativeMarks} onChange={(e) => set('negativeMarks', parseFloat(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <select className="form-select" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input type="text" className="form-input" placeholder="e.g. Python, Logic" value={form.category} onChange={(e) => set('category', e.target.value)} />
          </div>
        </div>

        {/* Options (OMR/MCQ) */}
        {form.questionType !== 'SHORT_ANSWER' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div className="form-label" style={{ margin: 0 }}>Options</div>
              {form.questionType === 'MCQ' && (
                <label className="checkbox-label" style={{ fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.multipleCorrect} onChange={(e) => set('multipleCorrect', e.target.checked)} />
                  Multiple correct answers
                </label>
              )}
              <button type="button" className="btn btn-sm btn-secondary" onClick={addOption}>+ Add Option</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {form.options.map((opt, i) => (
                <div key={opt._id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  {!form.multipleCorrect ? (
                    <input type="radio" name="correctAnswer" value={opt._id || i}
                      checked={String(form.correctAnswer) === String(opt._id || i)}
                      onChange={() => set('correctAnswer', opt._id || i)}
                      style={{ accentColor: 'var(--color-primary-500)', flexShrink: 0 }}
                    />
                  ) : (
                    <input type="checkbox" value={opt._id || i}
                      checked={Array.isArray(form.correctAnswer) && form.correctAnswer.includes(opt._id || i)}
                      onChange={(e) => {
                        const val = opt._id || i;
                        const current = Array.isArray(form.correctAnswer) ? form.correctAnswer : [];
                        set('correctAnswer', e.target.checked ? [...current, val] : current.filter((v) => v !== val));
                      }}
                      style={{ accentColor: 'var(--color-primary-500)', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{letters[i] || i + 1}</div>
                  <input type="text" className="form-input" placeholder={`Option ${letters[i] || i + 1}`} value={opt.text} onChange={(e) => setOption(i, e.target.value)} style={{ flex: 1 }} />
                  {form.options.length > 2 && (
                    <button type="button" className="btn btn-sm btn-danger btn-icon" onClick={() => removeOption(i)} title="Remove option">×</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
              {!form.multipleCorrect ? '🔘 Select the radio button next to the correct answer.' : '☑️ Check all correct answers.'}
            </div>
          </div>
        )}

        {/* Short Answer */}
        {form.questionType === 'SHORT_ANSWER' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Correct Answer</label>
              <input type="text" className="form-input" placeholder="Expected answer" value={form.correctAnswer} onChange={(e) => set('correctAnswer', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Evaluation Mode</label>
              <select className="form-select" value={form.evaluationMode} onChange={(e) => set('evaluationMode', e.target.value)}>
                <option value="CASE_INSENSITIVE">Case Insensitive</option>
                <option value="EXACT">Exact Match</option>
                <option value="TRIMMED">Trimmed (case insensitive)</option>
              </select>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="form-group">
          <label className="form-label">Explanation (shown after submission if enabled)</label>
          <textarea className="form-textarea" placeholder="Explain the correct answer..." value={form.explanation} onChange={(e) => set('explanation', e.target.value)} style={{ minHeight: 80 }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : (question ? '✅ Update Question' : '✅ Add Question')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </form>
  );
}

export default function QuestionsPage() {
  const { id: paramId } = useParams();
  const [challengeId, setChallengeId] = useState(paramId || '');
  const [challenge, setChallenge] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchChallengeId, setSearchChallengeId] = useState(paramId || '');
  const toast = useToast();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const [chalData, qData] = await Promise.all([
        challengeService.getById(challengeId),
        questionService.getAll({ challengeId }),
      ]);
      setChallenge(chalData.data.challenge);
      setQuestions(qData.data.questions);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [challengeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (qId) => {
    try {
      await questionService.delete(qId);
      toast.success('Question deleted.');
      setDeleteConfirm(null);
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDuplicate = async (qId) => {
    try {
      await questionService.duplicate(qId);
      toast.success('Question duplicated.');
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const diffColor = { EASY: 'success', MEDIUM: 'warning', HARD: 'danger' };
  const typeLabel = { OMR: 'Single Choice', MCQ: 'MCQ', SHORT_ANSWER: 'Short Answer' };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">❓ Question Bank</h1>
          {challenge && <p className="page-subtitle">Challenge: <strong>{challenge.title}</strong> — {questions.length} questions · {challenge.totalMarks} total marks</p>}
        </div>
        {!showForm && challengeId && (
          <button className="btn btn-primary" onClick={() => { setEditQuestion(null); setShowForm(true); }}>➕ Add Question</button>
        )}
      </div>

      {!challengeId && (
        <div className="card mb-4">
          <p className="mb-3" style={{ color: 'var(--color-text-2)' }}>Enter a Challenge ID to manage its questions, or navigate from the Challenges page.</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input type="text" className="form-input" placeholder="Challenge ID..." value={searchChallengeId} onChange={(e) => setSearchChallengeId(e.target.value)} style={{ maxWidth: 360 }} />
            <button className="btn btn-primary" onClick={() => setChallengeId(searchChallengeId)}>Load Questions</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-4 animate-slide-up">
          <h3 style={{ marginBottom: '1.25rem' }}>{editQuestion ? 'Edit Question' : 'Add New Question'}</h3>
          <QuestionForm
            question={editQuestion}
            challengeId={challengeId}
            onSave={() => { setShowForm(false); setEditQuestion(null); fetchData(); }}
            onCancel={() => { setShowForm(false); setEditQuestion(null); }}
          />
        </div>
      )}

      {loading ? (
        <div className="loading-page"><div className="spinner spinner-lg" /><span>Loading questions...</span></div>
      ) : questions.length === 0 && challengeId ? (
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <div className="empty-state-title">No questions yet</div>
          <div className="empty-state-desc">Add questions to this challenge to get started.</div>
          <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>Add First Question</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {questions.map((q, idx) => (
            <div key={q._id} className="card" style={{ borderLeft: '3px solid var(--color-primary-600)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, color: 'var(--color-text-3)' }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>{q.questionText}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary">{typeLabel[q.questionType]}</span>
                    <span className={`badge badge-${diffColor[q.difficulty]}`}>{q.difficulty}</span>
                    <span className="badge badge-gray">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    {q.negativeMarks > 0 && <span className="badge badge-danger">-{q.negativeMarks}</span>}
                    <span className="badge badge-gray">{q.category}</span>
                  </div>
                  {q.questionType !== 'SHORT_ANSWER' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
                      {q.options?.map((o, i) => (
                        <span key={o._id || i} style={{ padding: '0.2rem 0.5rem', background: 'var(--color-surface-2)', borderRadius: 4 }}>
                          {String.fromCharCode(65 + i)}: {o.text}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.questionType === 'SHORT_ANSWER' && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-success-500)' }}>Answer: {String(q.correctAnswer)}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditQuestion(q); setShowForm(true); window.scrollTo(0, 0); }}>✏️</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleDuplicate(q._id)} title="Duplicate">📋</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(q._id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">Delete Question?</h2>
              <p style={{ color: 'var(--color-text-3)', marginTop: '0.25rem' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
