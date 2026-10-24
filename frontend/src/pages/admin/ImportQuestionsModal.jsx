import React, { useState } from 'react';
import { parseRawQuestions } from '../../utils/questionParser';
import { questionService } from '../../services/questionService';
import { useToast } from '../../context/ToastContext';

export default function ImportQuestionsModal({ isOpen, onClose, challengeId, challenges = [], onImportSuccess }) {
  const toast = useToast();

  const [selectedChallengeId, setSelectedChallengeId] = useState(challengeId || '');
  const [format, setFormat] = useState('AUTO');
  const [defaultMarks, setDefaultMarks] = useState(2);
  const [defaultNegativeMarks, setDefaultNegativeMarks] = useState(0);
  const [defaultDifficulty, setDefaultDifficulty] = useState('MEDIUM');
  const [defaultCategory, setDefaultCategory] = useState('General');
  const [pastedText, setPastedText] = useState('');

  // Parsed state
  const [parsedData, setParsedData] = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' | 'preview'

  if (!isOpen) return null;

  const handleParse = () => {
    if (!pastedText.trim()) {
      toast.error('Please paste question content first.');
      return;
    }

    try {
      const result = parseRawQuestions(pastedText, {
        defaultMarks: Number(defaultMarks) || 1,
        defaultNegativeMarks: Number(defaultNegativeMarks) || 0,
        defaultDifficulty,
        defaultCategory,
        format,
      });

      if (!result.questions || result.questions.length === 0) {
        toast.error('No questions could be parsed from the provided text. Please check the format.');
        return;
      }

      setParsedData(result);
      setParsedQuestions(result.questions);
      setActiveTab('preview');
      toast.success(`Successfully parsed ${result.questions.length} question(s)!`);
    } catch (err) {
      toast.error(`Parsing error: ${err.message}`);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    setParsedQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Update status if correct answer is filled in
      if (field === 'correctAnswer') {
        const q = next[index];
        if (q.questionType === 'MCQ') {
          const hasAns = Array.isArray(value) ? value.length > 0 : Boolean(value);
          q.status = hasAns ? 'VALID' : 'MISSING_ANSWER';
        } else {
          q.status = value ? 'VALID' : 'REVIEW';
        }
      }

      return next;
    });
  };

  const handleOptionChange = (qIndex, optIndex, newText) => {
    setParsedQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qIndex].options];
      opts[optIndex] = { ...opts[optIndex], text: newText };
      next[qIndex].options = opts;
      return next;
    });
  };

  const handleRemoveQuestion = (index) => {
    setParsedQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleFinalImport = async () => {
    const targetChallengeId = selectedChallengeId || challengeId;
    if (!targetChallengeId) {
      toast.error('Please select a Challenge to import these questions into.');
      return;
    }

    if (parsedQuestions.length === 0) {
      toast.error('No questions available to import.');
      return;
    }

    // Validation checks
    const missingAnswers = parsedQuestions.filter(
      (q) => q.questionType === 'MCQ' && (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0))
    );

    if (missingAnswers.length > 0) {
      toast.error(
        `${missingAnswers.length} MCQ question(s) are missing correct answers. Please fill them in before importing.`
      );
      return;
    }

    setImporting(true);
    try {
      // Prepare payload
      const payload = {
        challengeId: targetChallengeId,
        questions: parsedQuestions.map((q) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options ? q.options.map((o) => ({ text: o.text })) : [],
          correctAnswer: q.correctAnswer,
          multipleCorrect: q.multipleCorrect,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          difficulty: q.difficulty,
          category: q.category,
          explanation: q.explanation,
          evaluationMode: q.evaluationMode,
        })),
      };

      const res = await questionService.bulkImport(payload);
      toast.success(res.data.message || `Successfully imported ${parsedQuestions.length} questions!`);
      onImportSuccess(targetChallengeId);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Bulk import failed.');
    } finally {
      setImporting(false);
    }
  };

  // Recalculate summary stats dynamically
  const currentTotalMarks = parsedQuestions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const validCount = parsedQuestions.filter((q) => q.status === 'VALID').length;
  const missingAnsCount = parsedQuestions.filter((q) => q.status === 'MISSING_ANSWER').length;
  const reviewCount = parsedQuestions.filter((q) => q.status === 'REVIEW' || q.status === 'INVALID_OPTIONS').length;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 'var(--z-modal)' }}>
      <div
        className="modal modal-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '1000px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-bg-2)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📥</span> Bulk Question Import
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-3)' }}>
              Paste an entire quiz or question paper with MCQs, multiline code, or descriptive questions.
            </p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose} style={{ fontSize: '1.2rem' }}>
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: '0.75rem 1rem',
              fontWeight: 700,
              borderBottom: activeTab === 'paste' ? '3px solid var(--color-primary-500)' : '3px solid transparent',
              color: activeTab === 'paste' ? 'var(--color-primary-300)' : 'var(--color-text-3)',
            }}
            onClick={() => setActiveTab('paste')}
          >
            1. Paste & Configure
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: '0.75rem 1rem',
              fontWeight: 700,
              borderBottom: activeTab === 'preview' ? '3px solid var(--color-primary-500)' : '3px solid transparent',
              color: activeTab === 'preview' ? 'var(--color-primary-300)' : 'var(--color-text-3)',
            }}
            onClick={() => {
              if (parsedQuestions.length > 0) setActiveTab('preview');
              else handleParse();
            }}
          >
            2. Preview & Edit ({parsedQuestions.length})
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {activeTab === 'paste' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Configuration Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {/* Challenge Target */}
                <div className="form-group">
                  <label className="form-label required">Target Challenge</label>
                  <select
                    className="form-select"
                    value={selectedChallengeId || challengeId}
                    onChange={(e) => setSelectedChallengeId(e.target.value)}
                  >
                    <option value="">Select a Challenge...</option>
                    {challenges.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title} ({c.totalQuestions || 0} Qs)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question Format */}
                <div className="form-group">
                  <label className="form-label">Question Format</label>
                  <select className="form-select" value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="AUTO">Auto Detect (MCQ / Short / Long)</option>
                    <option value="MCQ">Standard MCQ with Options</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="LONG_ANSWER">Long Descriptive Answer</option>
                  </select>
                </div>

                {/* Default Marks */}
                <div className="form-group">
                  <label className="form-label">Default Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    step={0.5}
                    value={defaultMarks}
                    onChange={(e) => setDefaultMarks(e.target.value)}
                  />
                </div>

                {/* Default Negative Marks */}
                <div className="form-group">
                  <label className="form-label">Default Negative Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    step={0.25}
                    value={defaultNegativeMarks}
                    onChange={(e) => setDefaultNegativeMarks(e.target.value)}
                  />
                </div>

                {/* Default Difficulty */}
                <div className="form-group">
                  <label className="form-label">Default Difficulty</label>
                  <select
                    className="form-select"
                    value={defaultDifficulty}
                    onChange={(e) => setDefaultDifficulty(e.target.value)}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                {/* Default Category */}
                <div className="form-group">
                  <label className="form-label">Default Category</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Python, SQL"
                    value={defaultCategory}
                    onChange={(e) => setDefaultCategory(e.target.value)}
                  />
                </div>
              </div>

              {/* Pasted Content Textarea */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label required" style={{ margin: 0 }}>
                    Pasted Questions Content
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: '0.8rem', color: 'var(--color-primary-400)' }}
                    onClick={() => {
                      setPastedText(`Python Quiz – Sample MCQs

1. What is the output of the following Python code?
x = 10
print(type(x))

A. <class 'bool'>
B. <class 'str'>
C. <class 'int'>
D. <class 'float'>

Answer: C
Marks: 2

2. What is the output of this code?
print(7 // 2)

A. 3
B. 1
C. 3.5
D. 4

Answer: A
Marks: 2

3. Which keyword is used to check an additional condition when the preceding if condition is false?

A. elif
B. switch
C. else if
D. then

Answer: A
Marks: 2

4. Explain the difference between a list and a tuple in Python with suitable examples.

Answer: A list is mutable, while a tuple is immutable. Lists use square brackets [], tuples use parentheses ().
Marks: 5
Difficulty: Medium
Category: Python Fundamentals`);
                    }}
                  >
                    📋 Insert Sample Template
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  rows={14}
                  placeholder={`Paste entire question set here...\n\nExample:\n1. What is the output of print(2 ** 3)?\nA. 6\nB. 8\nC. 9\nD. 16\nAnswer: B\nMarks: 2\n\n2. Explain Python generators with examples.\nAnswer: Generators yield values one at a time using the yield keyword.\nMarks: 5\nDifficulty: Medium`}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    minHeight: 320,
                  }}
                />
              </div>
            </div>
          ) : (
            /* PREVIEW TAB */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Summary Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>Total Questions</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)' }}>
                    {parsedQuestions.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>Valid Ready</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success-500)' }}>
                    {validCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>Missing Answers</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: missingAnsCount > 0 ? 'var(--color-warning-500)' : 'var(--color-text-3)' }}>
                    {missingAnsCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>Needs Review</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: reviewCount > 0 ? 'var(--color-accent-400)' : 'var(--color-text-3)' }}>
                    {reviewCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>Total Marks</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-300)' }}>
                    {currentTotalMarks}
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {parsedQuestions.map((q, idx) => {
                  const isEditing = editingIndex === idx;
                  const hasOptions = q.options && q.options.length > 0;

                  return (
                    <div
                      key={q._id || idx}
                      className="card"
                      style={{
                        padding: '1.25rem',
                        borderLeft: `4px solid ${
                          q.status === 'VALID'
                            ? 'var(--color-success-500)'
                            : q.status === 'MISSING_ANSWER'
                            ? 'var(--color-warning-500)'
                            : 'var(--color-accent-500)'
                        }`,
                        background: 'var(--color-surface-2)',
                      }}
                    >
                      {/* Top Header of Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'var(--color-surface-3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span className="badge badge-primary">{q.questionType}</span>
                          <span className={`badge badge-${q.difficulty === 'HARD' ? 'danger' : q.difficulty === 'EASY' ? 'success' : 'warning'}`}>
                            {q.difficulty}
                          </span>
                          <span className="badge badge-gray">{q.marks} Marks</span>
                          {q.negativeMarks > 0 && <span className="badge badge-danger">-{q.negativeMarks}</span>}
                          <span className="badge badge-gray">{q.category}</span>
                          <span
                            className={`badge badge-${
                              q.status === 'VALID' ? 'success' : q.status === 'MISSING_ANSWER' ? 'warning' : 'info'
                            }`}
                          >
                            {q.status === 'VALID' ? '✅ Valid' : q.status === 'MISSING_ANSWER' ? '⚠️ Missing Answer' : '🔍 Review'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                          >
                            {isEditing ? 'Done' : '✏️ Edit'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger btn-icon"
                            onClick={() => handleRemoveQuestion(idx)}
                            title="Remove from batch"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      {/* Content or Edit Form */}
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <div className="form-group">
                            <label className="form-label required">Question Text</label>
                            <textarea
                              className="form-textarea"
                              rows={4}
                              value={q.questionText}
                              onChange={(e) => handleQuestionChange(idx, 'questionText', e.target.value)}
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                            <div className="form-group">
                              <label className="form-label">Type</label>
                              <select
                                className="form-select"
                                value={q.questionType}
                                onChange={(e) => handleQuestionChange(idx, 'questionType', e.target.value)}
                              >
                                <option value="MCQ">MCQ</option>
                                <option value="SHORT_ANSWER">Short Answer</option>
                                <option value="LONG_ANSWER">Long Answer</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label className="form-label">Marks</label>
                              <input
                                type="number"
                                className="form-input"
                                min={0}
                                step={0.5}
                                value={q.marks}
                                onChange={(e) => handleQuestionChange(idx, 'marks', parseFloat(e.target.value) || 0)}
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Negative</label>
                              <input
                                type="number"
                                className="form-input"
                                min={0}
                                step={0.25}
                                value={q.negativeMarks}
                                onChange={(e) => handleQuestionChange(idx, 'negativeMarks', parseFloat(e.target.value) || 0)}
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Difficulty</label>
                              <select
                                className="form-select"
                                value={q.difficulty}
                                onChange={(e) => handleQuestionChange(idx, 'difficulty', e.target.value)}
                              >
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
                                value={q.category}
                                onChange={(e) => handleQuestionChange(idx, 'category', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Options editor if MCQ */}
                          {q.questionType === 'MCQ' && hasOptions && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <label className="form-label">Options & Correct Answer</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = Array.isArray(q.correctAnswer)
                                    ? q.correctAnswer.includes(opt.letter)
                                    : q.correctAnswer === opt.letter;

                                  return (
                                    <div key={opt._id || oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {q.multipleCorrect ? (
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                                            const nextAns = e.target.checked
                                              ? [...current, opt.letter]
                                              : current.filter((l) => l !== opt.letter);
                                            handleQuestionChange(idx, 'correctAnswer', nextAns);
                                          }}
                                          style={{ accentColor: 'var(--color-primary-500)' }}
                                        />
                                      ) : (
                                        <input
                                          type="radio"
                                          name={`correct_${q._id}`}
                                          checked={isSelected}
                                          onChange={() => handleQuestionChange(idx, 'correctAnswer', opt.letter)}
                                          style={{ accentColor: 'var(--color-primary-500)' }}
                                        />
                                      )}
                                      <span style={{ fontWeight: 700, width: 24, textAlign: 'center' }}>{opt.letter}.</span>
                                      <input
                                        type="text"
                                        className="form-input"
                                        value={opt.text}
                                        onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                                        style={{ flex: 1 }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Correct Answer / Expected Answer editor if not MCQ */}
                          {q.questionType !== 'MCQ' && (
                            <div className="form-group">
                              <label className="form-label required">Expected Answer</label>
                              <textarea
                                className="form-textarea"
                                rows={3}
                                value={q.correctAnswer || ''}
                                onChange={(e) => handleQuestionChange(idx, 'correctAnswer', e.target.value)}
                                placeholder="Enter expected response or evaluation criteria..."
                              />
                            </div>
                          )}

                          <div className="form-group">
                            <label className="form-label">Explanation</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Explanation..."
                              value={q.explanation || ''}
                              onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        /* Read-only Preview Mode for Question */
                        <div>
                          <div
                            style={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: q.questionText.includes('\n') || q.questionText.includes('    ') ? 'var(--font-mono)' : 'inherit',
                              fontSize: '0.95rem',
                              lineHeight: 1.5,
                              color: 'var(--color-text)',
                              marginBottom: '0.75rem',
                              padding: q.questionText.includes('\n') ? '0.75rem' : '0',
                              background: q.questionText.includes('\n') ? 'var(--color-surface-3)' : 'transparent',
                              borderRadius: 'var(--radius)',
                            }}
                          >
                            {q.questionText}
                          </div>

                          {/* Options display */}
                          {q.questionType === 'MCQ' && hasOptions && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              {q.options.map((opt) => {
                                const isCorrect = Array.isArray(q.correctAnswer)
                                  ? q.correctAnswer.includes(opt.letter)
                                  : q.correctAnswer === opt.letter;

                                return (
                                  <div
                                    key={opt._id}
                                    style={{
                                      padding: '0.4rem 0.75rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: isCorrect ? 'rgba(34,197,94,0.12)' : 'var(--color-surface-3)',
                                      border: `1px solid ${isCorrect ? 'var(--color-success-500)' : 'var(--color-border)'}`,
                                      fontSize: '0.85rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                    }}
                                  >
                                    <strong style={{ color: isCorrect ? 'var(--color-success-500)' : 'var(--color-text-3)' }}>
                                      {opt.letter}.
                                    </strong>
                                    <span style={{ color: isCorrect ? '#4ade80' : 'var(--color-text-2)', flex: 1 }}>{opt.text}</span>
                                    {isCorrect && <span style={{ fontSize: '0.75rem', color: 'var(--color-success-500)' }}>✓ Correct</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Answer display for Short/Long Answer */}
                          {q.questionType !== 'MCQ' && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                              Expected Answer:{' '}
                              <span style={{ color: 'var(--color-success-500)', fontWeight: 600 }}>
                                {q.correctAnswer || '(No answer provided — please edit)'}
                              </span>
                            </div>
                          )}

                          {q.explanation && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-4)', marginTop: '0.25rem' }}>
                              💡 {q.explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-bg-2)',
          }}
        >
          {activeTab === 'paste' ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleParse}>
                ⚡ Parse Questions →
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('paste')}>
                ← Back to Edit Paste
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFinalImport}
                  disabled={importing || parsedQuestions.length === 0}
                  style={{ minWidth: 160 }}
                >
                  {importing ? (
                    <>
                      <span className="spinner" /> Importing...
                    </>
                  ) : (
                    `✅ Import ${parsedQuestions.length} Question${parsedQuestions.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
