import React, { useEffect, useState, useCallback } from 'react';
import { reportService } from '../../services/adminService';
import { challengeService } from '../../services/challengeService';
import { useToast } from '../../context/ToastContext';

export default function ReportsPage() {
  const [tab, setTab] = useState('results');
  const [results, setResults] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [challengeId, setChallengeId] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    challengeService.getAll({}).then((d) => setChallenges(d.data.challenges)).catch(() => {});
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (challengeId) params.challengeId = challengeId;
      const d = await reportService.getResults(params);
      setResults(d.data.report);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [challengeId]);

  useEffect(() => { if (tab === 'results') fetchResults(); }, [tab, fetchResults]);

  const handleExportCSV = () => {
    const params = {};
    if (challengeId) params.challengeId = challengeId;
    reportService.exportCSV(params);
    toast.info('CSV download started.');
  };

  const handleExportXLSX = () => {
    const params = {};
    if (challengeId) params.challengeId = challengeId;
    reportService.exportXLSX(params);
    toast.info('XLSX download started.');
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">📈 Reports & Exports</h1>
          <p className="page-subtitle">Generate and download challenge reports</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-success" onClick={handleExportCSV}>⬇️ Export CSV</button>
          <button className="btn btn-primary" onClick={handleExportXLSX}>⬇️ Export XLSX</button>
        </div>
      </div>

      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ minWidth: 280 }}>
          <label className="form-label">Filter by Challenge</label>
          <select className="form-select" value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
            <option value="">All Challenges</option>
            {challenges.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={fetchResults}>Refresh</button>
      </div>

      <div className="tabs">
        {['results'].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'results' ? '📊 Results Report' : t}
          </button>
        ))}
      </div>

      {tab === 'results' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Rank</th><th>Name</th><th>Email</th><th>Challenge</th><th>Score</th><th>%</th><th>Correct</th><th>Wrong</th><th>Time</th><th>Violations</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                : results.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>No results found.</td></tr>
                : results.map((r) => (
                  <tr key={r.email + r.challenge}>
                    <td style={{ fontWeight: 700 }}>#{r.rank}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{r.email}</td>
                    <td>{r.challenge}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-300)' }}>{r.score}/{r.totalMarks}</td>
                    <td><span style={{ fontWeight: 700, color: r.percentage >= 80 ? 'var(--color-success-500)' : r.percentage >= 50 ? 'var(--color-warning-500)' : 'var(--color-danger-500)' }}>{r.percentage?.toFixed(1)}%</span></td>
                    <td style={{ color: 'var(--color-success-500)' }}>{r.correct}</td>
                    <td style={{ color: 'var(--color-danger-500)' }}>{r.wrong}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>{Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</td>
                    <td style={{ color: r.violations > 0 ? 'var(--color-warning-500)' : 'var(--color-text-3)' }}>{r.violations}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
