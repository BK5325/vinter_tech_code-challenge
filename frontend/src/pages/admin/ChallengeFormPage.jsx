import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { challengeService } from '../../services/challengeService';
import { useToast } from '../../context/ToastContext';

const defaultForm = {
  title: '', description: '', instructions: '',
  duration: 60, totalQuestions: 10,
  negativeMarking: false, negativeMarkValue: 0.25,
  questionSelectionMode: 'ALL', questionPoolSize: 0,
  randomizeQuestions: true, randomizeOptions: true,
  status: 'DRAFT',
  scoreVisibility: 'IMMEDIATE', rankVisibility: 'SHOW', correctAnswerVisibility: 'NEVER',
  marksPerQuestion: 1,
  securitySettings: {
    maxTabSwitches: 3, maxWindowBlur: 5, maxFullscreenExits: 3,
    autoSubmitOnViolation: false, violationThreshold: 10,
  },
};

export default function ChallengeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdit) return;
    challengeService.getById(id).then((d) => {
      const c = d.data.challenge;
      setForm({ ...defaultForm, ...c, securitySettings: { ...defaultForm.securitySettings, ...c.securitySettings } });
    }).catch((err) => toast.error(err.message)).finally(() => setFetching(false));
  }, [id, isEdit]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setSec = (field, value) => setForm((prev) => ({ ...prev, securitySettings: { ...prev.securitySettings, [field]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.error('Title is required.'); return; }
    if (!form.duration || form.duration < 1) { toast.error('Duration must be at least 1 minute.'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await challengeService.update(id, form);
        toast.success('Challenge updated.');
      } else {
        const d = await challengeService.create(form);
        toast.success('Challenge created.');
        navigate(`/admin/challenges/${d.data.challenge._id}/questions`);
        return;
      }
      navigate('/admin/challenges');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (fetching) return <div className="page-container"><div className="loading-page"><div className="spinner spinner-lg" /><span>Loading...</span></div></div>;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{isEdit ? '✏️ Edit Challenge' : '➕ Create Challenge'}</h1>
        <p className="page-subtitle">{isEdit ? 'Update challenge settings' : 'Configure a new challenge'}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 800 }}>
        {/* Basic Info */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>📋 Basic Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="chal-title" className="form-label required">Title</label>
              <input id="chal-title" type="text" className="form-input" placeholder="e.g. Python Fundamentals Challenge" value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="chal-desc" className="form-label">Description</label>
              <textarea id="chal-desc" className="form-textarea" placeholder="Brief description..." value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="chal-instructions" className="form-label">Instructions (shown to participants)</label>
              <textarea id="chal-instructions" className="form-textarea" placeholder="Rules and instructions..." value={form.instructions} onChange={(e) => set('instructions', e.target.value)} style={{ minHeight: 120 }} />
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>⚙️ Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="chal-duration" className="form-label required">Duration (minutes)</label>
              <input id="chal-duration" type="number" className="form-input" min={1} max={480} value={form.duration} onChange={(e) => set('duration', parseInt(e.target.value))} required />
            </div>
            <div className="form-group">
              <label htmlFor="chal-total-q" className="form-label required">Total Questions</label>
              <input id="chal-total-q" type="number" className="form-input" min={1} value={form.totalQuestions} onChange={(e) => set('totalQuestions', parseInt(e.target.value))} required />
            </div>
            <div className="form-group">
              <label htmlFor="chal-marks-per-q" className="form-label">Default Marks per Question</label>
              <input id="chal-marks-per-q" type="number" className="form-input" min={0} step={0.5} value={form.marksPerQuestion} onChange={(e) => set('marksPerQuestion', parseFloat(e.target.value))} />
            </div>
            <div className="form-group">
              <label htmlFor="chal-status" className="form-label">Status</label>
              <select id="chal-status" className="form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => set('randomizeQuestions', e.target.checked)} />
              Randomize question order for each participant
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.randomizeOptions} onChange={(e) => set('randomizeOptions', e.target.checked)} />
              Randomize option order for each participant
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.negativeMarking} onChange={(e) => set('negativeMarking', e.target.checked)} />
              Enable negative marking
            </label>
            {form.negativeMarking && (
              <div className="form-group" style={{ maxWidth: 200, marginLeft: '1.75rem' }}>
                <label className="form-label">Negative Mark Value</label>
                <input type="number" className="form-input" min={0} step={0.25} value={form.negativeMarkValue} onChange={(e) => set('negativeMarkValue', parseFloat(e.target.value))} />
              </div>
            )}
          </div>
        </div>

        {/* Question Selection */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>🎲 Question Selection</h3>
          <div className="form-group">
            <label className="form-label">Selection Mode</label>
            <select className="form-select" value={form.questionSelectionMode} onChange={(e) => set('questionSelectionMode', e.target.value)} style={{ maxWidth: 300 }}>
              <option value="ALL">All questions (same set, different order)</option>
              <option value="RANDOM_SUBSET">Random subset from pool</option>
            </select>
          </div>
          {form.questionSelectionMode === 'RANDOM_SUBSET' && (
            <div className="form-group mt-3" style={{ maxWidth: 200 }}>
              <label className="form-label">Pool Size (total questions to pick from)</label>
              <input type="number" className="form-input" min={form.totalQuestions} value={form.questionPoolSize} onChange={(e) => set('questionPoolSize', parseInt(e.target.value))} />
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="card mb-4">
          <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>👁️ Result Visibility</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Score Visibility</label>
              <select className="form-select" value={form.scoreVisibility} onChange={(e) => set('scoreVisibility', e.target.value)}>
                <option value="IMMEDIATE">Show Immediately</option>
                <option value="HIDDEN">Hidden</option>
                <option value="MANUAL">Manual Release</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rank Visibility</label>
              <select className="form-select" value={form.rankVisibility} onChange={(e) => set('rankVisibility', e.target.value)}>
                <option value="SHOW">Show</option>
                <option value="HIDE">Hide</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Correct Answers</label>
              <select className="form-select" value={form.correctAnswerVisibility} onChange={(e) => set('correctAnswerVisibility', e.target.value)}>
                <option value="SHOW_AFTER_SUBMIT">Show After Submit</option>
                <option value="SHOW_AFTER_END">Show After Challenge Ends</option>
                <option value="NEVER">Never Show</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card mb-6">
          <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>🛡️ Security Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Max Tab Switches (before warning)</label>
              <input type="number" className="form-input" min={1} value={form.securitySettings.maxTabSwitches} onChange={(e) => setSec('maxTabSwitches', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Window Blur Events</label>
              <input type="number" className="form-input" min={1} value={form.securitySettings.maxWindowBlur} onChange={(e) => setSec('maxWindowBlur', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Fullscreen Exits</label>
              <input type="number" className="form-input" min={1} value={form.securitySettings.maxFullscreenExits} onChange={(e) => setSec('maxFullscreenExits', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Violation Threshold (total)</label>
              <input type="number" className="form-input" min={1} value={form.securitySettings.violationThreshold} onChange={(e) => setSec('violationThreshold', parseInt(e.target.value))} />
            </div>
          </div>
          <div className="mt-3">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.securitySettings.autoSubmitOnViolation} onChange={(e) => setSec('autoSubmitOnViolation', e.target.checked)} />
              Auto-submit when violation threshold is reached
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : (isEdit ? '✅ Update Challenge' : '✅ Create Challenge')}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/admin/challenges')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
