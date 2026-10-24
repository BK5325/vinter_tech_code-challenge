import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionService } from '../../services/questionService';
import { challengeService } from '../../services/challengeService';
import { useToast } from '../../context/ToastContext';
import ImportQuestionsModal from './ImportQuestionsModal';

// Generate a valid 24-character hex string (ObjectId) so Mongoose accepts it for new options
const generateObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const randomChars = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => Math.floor(Math.random() * 16).toString(16));
  return timestamp + randomChars;
};

const EMPTY_OPTION = () => ({ text: '', _id: generateObjectId() });
const getDefaultForm = () => ({
  questionText: '',
  questionType: 'MCQ',
  options: [EMPTY_OPTION(), EMPTY_OPTION(), EMPTY_OPTION(), EMPTY_OPTION()],
  correctAnswer: '',
  multipleCorrect: false,
  evaluationMode: 'CASE_INSENSITIVE',
  marks: 1,
  negativeMarks: 0,
  difficulty: 'MEDIUM',
  category: 'General',
  explanation: '',
});

function QuestionForm({ question, challengeId, onSave, onCancel }) {
  const [form, setForm] = useState(
    question ? { ...getDefaultForm(), ...question } : { ...getDefaultForm(), challengeId }
  );
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const setOption = (i, v) =>
    setForm((p) => {
      const opts = [...p.options];
      opts[i] = { ...opts[i], text: v };
      return { ...p, options: opts };
    });
  const addOption = () => setForm((p) => ({ ...p, options: [...p.options, EMPTY_OPTION()] }));
  const removeOption = (i) =>
    setForm((p) => {
      const opts = p.options.filter((_, idx) => idx !== i);
      return { ...p, options: opts };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.questionText.trim()) {
      toast.error('Question text is required.');
      return;
    }

    const isChoiceType = form.questionType === 'OMR' || form.questionType === 'MCQ';

    if (isChoiceType && form.options.some((o) => !o.text.trim())) {
      toast.error('All options must have text.');
      return;
    }
    if (isChoiceType && !form.correctAnswer) {
      toast.error('Correct answer is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, challengeId };
      if (!isChoiceType) {
        payload.options = [];
      }
      if (form.questionType === 'LONG_ANSWER') {
        payload.evaluationMode = 'MANUAL';
      }

      if (question?._id) {
        await questionService.update(question._id, payload);
        toast.success('Question updated successfully.');
      } else {
        await questionService.create(payload);
        toast.success('Question created successfully.');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const isChoiceType = form.questionType === 'OMR' || form.questionType === 'MCQ';

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label required">Question Text</label>
          <textarea
            className="form-textarea"
            placeholder="Enter the question text or paste code snippet..."
            value={form.questionText}
            onChange={(e) => set('questionText', e.target.value)}
            style={{ minHeight: 110, fontFamily: form.questionText.includes('\n') ? 'var(--font-mono)' : 'inherit' }}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Question Type</label>
            <select
              className="form-select"
              value={form.questionType}
              onChange={(e) => {
                const newType = e.target.value;
                set('questionType', newType);
                if (newType === 'LONG_ANSWER') {
                  set('evaluationMode', 'MANUAL');
                }
              }}
            >
              <option value="MCQ">MCQ (Multiple Choice)</option>
              <option value="OMR">OMR (Single Choice)</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="LONG_ANSWER">Long Answer (Descriptive)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Marks</label>
            <input
              type="number"
              className="form-input"
              min={0}
              step={0.5}
              value={form.marks}
              onChange={(e) => set('marks', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Negative Marks</label>
            <input
              type="number"
              className="form-input"
              min={0}
              step={0.25}
              value={form.negativeMarks}
              onChange={(e) => set('negativeMarks', parseFloat(e.target.value) || 0)}
            />
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
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Python, Algorithms"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            />
          </div>
        </div>

        {/* Options (OMR/MCQ) */}
        {isChoiceType && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div className="form-label" style={{ margin: 0 }}>
                Answer Options
              </div>
              {form.questionType === 'MCQ' && (
                <label className="checkbox-label" style={{ fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={form.multipleCorrect}
                    onChange={(e) => {
                      const isMulti = e.target.checked;
                      set('multipleCorrect', isMulti);
                      if (!isMulti && Array.isArray(form.correctAnswer)) {
                        set('correctAnswer', form.correctAnswer[0] || '');
                      }
                    }}
                  />
                  Multiple correct answers
                </label>
              )}
              <button type="button" className="btn btn-sm btn-secondary" onClick={addOption}>
                + Add Option
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {form.options.map((opt, i) => (
                <div key={opt._id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  {!form.multipleCorrect ? (
                    <input
                      type="radio"
                      name="correctAnswer"
                      value={opt._id || i}
                      checked={String(form.correctAnswer) === String(opt._id || i)}
                      onChange={() => set('correctAnswer', opt._id || i)}
                      style={{ accentColor: 'var(--color-primary-500)', flexShrink: 0 }}
                    />
                  ) : (
                    <input
                      type="checkbox"
                      value={opt._id || i}
                      checked={Array.isArray(form.correctAnswer) && form.correctAnswer.includes(opt._id || i)}
                      onChange={(e) => {
                        const val = opt._id || i;
                        const current = Array.isArray(form.correctAnswer) ? form.correctAnswer : [];
                        set('correctAnswer', e.target.checked ? [...current, val] : current.filter((v) => v !== val));
                      }}
                      style={{ accentColor: 'var(--color-primary-500)', flexShrink: 0 }}
                    />
                  )}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--color-surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      flexShrink: 0,
                    }}
                  >
                    {letters[i] || i + 1}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Option ${letters[i] || i + 1}`}
                    value={opt.text}
                    onChange={(e) => setOption(i, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger btn-icon"
                      onClick={() => removeOption(i)}
                      title="Remove option"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
              {!form.multipleCorrect
                ? '🔘 Select the radio button next to the correct answer.'
                : '☑️ Check all options that are correct.'}
            </div>
          </div>
        )}

        {/* Short Answer */}
        {form.questionType === 'SHORT_ANSWER' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Correct Answer</label>
              <input
                type="text"
                className="form-input"
                placeholder="Expected short answer text"
                value={form.correctAnswer || ''}
                onChange={(e) => set('correctAnswer', e.target.value)}
              />
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

        {/* Long Answer */}
        {form.questionType === 'LONG_ANSWER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Expected Answer / Evaluation Guidelines</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Enter sample model answer, key points, grading criteria, or rubric..."
                value={form.correctAnswer || ''}
                onChange={(e) => set('correctAnswer', e.target.value)}
                style={{ minHeight: 120 }}
              />
              <div className="form-hint mt-1">
                Supports multiline text. Students will be provided with a descriptive response area, evaluated by staff/admin.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Evaluation Mode</label>
              <select className="form-select" value={form.evaluationMode} onChange={(e) => set('evaluationMode', e.target.value)}>
                <option value="MANUAL">Manual Administrator / Staff Evaluation</option>
              </select>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="form-group">
          <label className="form-label">Explanation (shown after submission if enabled)</label>
          <textarea
            className="form-textarea"
            placeholder="Explain why this answer is correct..."
            value={form.explanation}
            onChange={(e) => set('explanation', e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Saving...
              </>
            ) : question ? (
              '✅ Update Question'
            ) : (
              '✅ Add Question'
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

export default function QuestionsPage() {
  const { id: paramId } = useParams();
  const [challengeId, setChallengeId] = useState(paramId || '');
  const [challenges, setChallenges] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Bulk Selection states
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Delete Modals states
  const [deleteConfirm, setDeleteConfirm] = useState(null); // single delete question object or id
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllInput, setDeleteAllInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('order');
  const [sortOrder, setSortOrder] = useState('asc');

  const toast = useToast();
  const navigate = useNavigate();

  // Load all available challenges for the dropdown
  useEffect(() => {
    challengeService
      .getAll({ limit: 100 })
      .then((res) => {
        const list = res.data.challenges || [];
        setChallenges(list);
        if (!challengeId && list.length > 0) {
          setChallengeId(list[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch questions for active challenge and filters
  const fetchData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const [chalData, qData, catData] = await Promise.all([
        challengeService.getById(challengeId),
        questionService.getAll({
          challengeId,
          search: search || undefined,
          questionType: typeFilter || undefined,
          difficulty: difficultyFilter || undefined,
          category: categoryFilter || undefined,
          sortBy,
          sortOrder,
          limit: 200,
        }),
        questionService.getCategories({ challengeId }),
      ]);
      setChallenge(chalData.data.challenge);
      setQuestions(qData.data.questions || []);
      setCategories(catData.data.categories || []);
      // Clear selection if questions changed or challenge switched
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [challengeId, search, typeFilter, difficultyFilter, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Master Checkbox & Selection Handlers
  const visibleQuestionIds = useMemo(() => questions.map((q) => q._id), [questions]);
  const allSelected = visibleQuestionIds.length > 0 && visibleQuestionIds.every((id) => selectedIds.has(id));
  const someSelected = visibleQuestionIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleQuestionIds));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Single Delete
  const handleDelete = async (qId) => {
    setDeleting(true);
    try {
      await questionService.delete(qId);
      toast.success('Question deleted successfully.');
      setDeleteConfirm(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk Delete Selected
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await questionService.bulkDelete(Array.from(selectedIds));
      toast.success(res.data.message || `Deleted ${selectedIds.size} questions.`);
      setBulkDeleteConfirm(false);
      setSelectedIds(new Set());
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Delete All Questions in Challenge
  const handleDeleteAll = async () => {
    if (deleteAllInput !== 'DELETE ALL') {
      toast.error('You must type DELETE ALL to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const res = await questionService.deleteAll(challengeId, 'DELETE ALL');
      toast.success(res.data.message || 'All questions deleted from this challenge.');
      setDeleteAllConfirm(false);
      setDeleteAllInput('');
      setSelectedIds(new Set());
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Duplicate Question
  const handleDuplicate = async (qId) => {
    try {
      await questionService.duplicate(qId);
      toast.success('Question duplicated.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const diffColor = { EASY: 'success', MEDIUM: 'warning', HARD: 'danger' };
  const typeLabel = {
    OMR: 'Single Choice',
    MCQ: 'MCQ',
    SHORT_ANSWER: 'Short Answer',
    LONG_ANSWER: 'Long Answer',
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">❓ Question Bank</h1>
          {challenge ? (
            <p className="page-subtitle">
              Challenge: <strong>{challenge.title}</strong> — {questions.length} questions · {challenge.totalMarks || 0} total marks
            </p>
          ) : (
            <p className="page-subtitle">Manage coding & assessment questions across challenges</p>
          )}
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {challengeId && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowImportModal(true)}
                title="Paste questions in bulk to parse and import"
              >
                📥 Import Questions
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditQuestion(null);
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ➕ Add Question
              </button>

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => {
                  setDeleteAllInput('');
                  setDeleteAllConfirm(true);
                }}
                disabled={questions.length === 0}
                title="Delete all questions in the current challenge"
              >
                🗑️ Delete All Questions
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Challenge Selector Bar */}
      <div
        className="card mb-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'flex-end',
          background: 'var(--color-surface)',
          padding: '1rem',
        }}
      >
        {/* Challenge Switcher */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>
            Active Challenge
          </label>
          <select
            className="form-select"
            value={challengeId}
            onChange={(e) => {
              setChallengeId(e.target.value);
              navigate(`/admin/challenges/${e.target.value}/questions`, { replace: true });
            }}
          >
            {challenges.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>
            Search Questions
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Search text or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Question Type Filter */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>
            Question Type
          </label>
          <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Question Types</option>
            <option value="MCQ">MCQ (Multiple Choice)</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="LONG_ANSWER">Long Answer</option>
            <option value="OMR">OMR (Single Choice)</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>
            Difficulty
          </label>
          <select className="form-select" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>
            Category
          </label>
          <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>
            Sort By
          </label>
          <select
            className="form-select"
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('_');
              setSortBy(sb);
              setSortOrder(so);
            }}
          >
            <option value="order_asc">Default Order</option>
            <option value="marks_desc">Highest Marks</option>
            <option value="marks_asc">Lowest Marks</option>
            <option value="createdAt_desc">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Add / Edit Form Modal / Card */}
      {showForm && (
        <div className="card mb-4 animate-slide-up" style={{ border: '1px solid var(--color-primary-500)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>{editQuestion ? '✏️ Edit Question' : '➕ Add New Question'}</h3>
            <button
              type="button"
              className="btn btn-icon btn-ghost"
              onClick={() => {
                setShowForm(false);
                setEditQuestion(null);
              }}
            >
              ✕
            </button>
          </div>
          <QuestionForm
            question={editQuestion}
            challengeId={challengeId}
            onSave={() => {
              setShowForm(false);
              setEditQuestion(null);
              fetchData();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditQuestion(null);
            }}
          />
        </div>
      )}

      {/* Bulk Selection Bar (Always visible when questions exist) */}
      {questions.length > 0 && (
        <div
          className="card mb-3"
          style={{
            padding: '0.75rem 1.25rem',
            background: selectedIds.size > 0 ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-surface)',
            border: `1px solid ${selectedIds.size > 0 ? 'var(--color-primary-500)' : 'var(--color-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected && !allSelected;
                }}
                onChange={toggleSelectAll}
                style={{ accentColor: 'var(--color-primary-500)', width: 18, height: 18 }}
              />
              <span>Select All Visible</span>
            </label>

            <span style={{ color: 'var(--color-text-3)', fontSize: '0.9rem' }}>
              Selected: <strong style={{ color: selectedIds.size > 0 ? 'var(--color-primary-300)' : 'var(--color-text-2)' }}>{selectedIds.size}</strong> question{selectedIds.size !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {selectedIds.size > 0 && (
              <>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedIds(new Set())}>
                  Clear Selection
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger animate-pulse"
                  onClick={() => setBulkDeleteConfirm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>🗑️</span> Delete Selected ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner spinner-lg" />
          <span>Loading question bank...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <div className="empty-state-title">No questions found</div>
          <div className="empty-state-desc">
            {search || typeFilter || difficultyFilter || categoryFilter
              ? 'Try adjusting your search or filters.'
              : 'Add questions individually or use the Bulk Import to paste an entire quiz.'}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              ➕ Add First Question
            </button>
            <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
              📥 Import Questions
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {questions.map((q, idx) => {
            const isSelected = selectedIds.has(q._id);
            const isMultiline = q.questionText && (q.questionText.includes('\n') || q.questionText.length > 100);

            return (
              <div
                key={q._id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    isSelected ? 'var(--color-primary-500)' : 'var(--color-primary-600)'
                  }`,
                  background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--color-surface)',
                  transition: 'background 0.2s ease',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {/* Item Checkbox */}
                  <div style={{ paddingTop: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(q._id)}
                      style={{ accentColor: 'var(--color-primary-500)', width: 18, height: 18, cursor: 'pointer' }}
                      aria-label={`Select question ${idx + 1}`}
                    />
                  </div>

                  {/* Question Number Badge */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius)',
                      background: 'var(--color-surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      flexShrink: 0,
                      color: 'var(--color-text-3)',
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Question Main Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Question Text */}
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: '0.625rem',
                        color: 'var(--color-text)',
                        whiteSpace: isMultiline ? 'pre-wrap' : 'normal',
                        fontFamily: isMultiline && (q.questionText.includes('(') || q.questionText.includes('=')) ? 'var(--font-mono)' : 'inherit',
                        fontSize: '0.975rem',
                        lineHeight: '1.5',
                      }}
                    >
                      {q.questionText}
                    </div>

                    {/* Metadata Badges */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
                      <span className="badge badge-primary">{typeLabel[q.questionType] || q.questionType}</span>
                      <span className={`badge badge-${diffColor[q.difficulty] || 'secondary'}`}>{q.difficulty}</span>
                      <span className="badge badge-gray">
                        {q.marks} mark{q.marks !== 1 ? 's' : ''}
                      </span>
                      {q.negativeMarks > 0 && <span className="badge badge-danger">-{q.negativeMarks}</span>}
                      <span className="badge badge-gray">{q.category}</span>
                      {q.multipleCorrect && <span className="badge badge-info">Multiple Select</span>}
                    </div>

                    {/* Options (OMR/MCQ) */}
                    {(q.questionType === 'OMR' || q.questionType === 'MCQ') && q.options && q.options.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {q.options.map((o, i) => {
                          const optId = o._id?.toString() || o._id;
                          const isCorrect = Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.includes(optId) || q.correctAnswer.includes(String.fromCharCode(65 + i))
                            : String(q.correctAnswer) === String(optId) || String(q.correctAnswer) === String.fromCharCode(65 + i);

                          return (
                            <div
                              key={optId || i}
                              style={{
                                padding: '0.4rem 0.625rem',
                                background: isCorrect ? 'rgba(34,197,94,0.1)' : 'var(--color-surface-2)',
                                border: `1px solid ${isCorrect ? 'var(--color-success-500)' : 'var(--color-border)'}`,
                                borderRadius: 6,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <strong style={{ color: isCorrect ? 'var(--color-success-500)' : 'var(--color-text-3)' }}>
                                {String.fromCharCode(65 + i)}.
                              </strong>
                              <span style={{ color: isCorrect ? '#4ade80' : 'var(--color-text-2)', flex: 1 }}>{o.text}</span>
                              {isCorrect && <span style={{ color: 'var(--color-success-500)', fontSize: '0.75rem', fontWeight: 700 }}>✓ Correct</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer Display */}
                    {q.questionType === 'SHORT_ANSWER' && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--color-text-3)' }}>Correct Answer: </span>
                        <strong style={{ color: 'var(--color-success-500)' }}>{String(q.correctAnswer || '(blank)')}</strong>
                      </div>
                    )}

                    {/* Long Answer Display */}
                    {q.questionType === 'LONG_ANSWER' && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          background: 'rgba(34, 197, 94, 0.05)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-success-500)', marginBottom: '0.25rem' }}>
                          Expected Answer / Evaluation Guidelines:
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-2)' }}>
                          {q.correctAnswer || '(No expected answer provided)'}
                        </div>
                      </div>
                    )}

                    {/* Explanation Display */}
                    {q.explanation && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-3)',
                          background: 'rgba(99, 102, 241, 0.06)',
                          padding: '0.4rem 0.625rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        💡 <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setEditQuestion(q);
                        setShowForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      title="Edit question"
                    >
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDuplicate(q._id)} title="Duplicate">
                      📋
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteConfirm(q)}
                      title="Delete question"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Single Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">Delete Question?</h2>
              <p style={{ color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                Are you sure you want to delete this question? Any completed historical attempts will be safely preserved.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm._id)} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Selected Questions Confirmation */}
      {bulkDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setBulkDeleteConfirm(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">Delete Selected Questions?</h2>
              <p style={{ color: 'var(--color-text-3)', marginTop: '0.5rem' }}>
                You are about to delete <strong style={{ color: 'var(--color-danger-500)' }}>{selectedIds.size} selected question(s)</strong>.
              </p>
              <p style={{ color: 'var(--color-text-4)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                The challenge's total questions and total marks will be recalculated automatically. Historical assessment attempts will remain intact.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBulkDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleBulkDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : `Confirm Delete (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete All Questions Confirmation */}
      {deleteAllConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteAllConfirm(false)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--color-danger-500)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span> Delete ALL Questions?
              </h2>
              <div style={{ marginTop: '0.75rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                <p>
                  You are about to permanently remove all <strong>{questions.length} questions</strong> from the challenge:
                </p>
                <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', fontWeight: 700, margin: '0.5rem 0', color: 'var(--color-primary-300)' }}>
                  {challenge?.title}
                </div>
                <p style={{ color: 'var(--color-warning-500)', fontSize: '0.875rem' }}>
                  This operation cannot be undone. To prevent accidental deletion, please type <strong>DELETE ALL</strong> in the input box below:
                </p>
              </div>
            </div>

            <div style={{ padding: '0 1.5rem 1rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type DELETE ALL to confirm"
                value={deleteAllInput}
                onChange={(e) => setDeleteAllInput(e.target.value)}
                autoFocus
                style={{ borderColor: deleteAllInput === 'DELETE ALL' ? 'var(--color-danger-500)' : 'var(--color-border)' }}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteAllConfirm(false)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAll}
                disabled={deleteAllInput !== 'DELETE ALL' || deleting}
              >
                {deleting ? 'Deleting All...' : 'Permanently Delete All Questions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Bulk Import Questions Modal */}
      <ImportQuestionsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        challengeId={challengeId}
        challenges={challenges}
        onImportSuccess={(newChallengeId) => {
          if (newChallengeId) setChallengeId(newChallengeId);
          fetchData();
        }}
      />
    </div>
  );
}
