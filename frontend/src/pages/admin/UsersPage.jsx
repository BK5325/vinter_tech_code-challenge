import React, { useEffect, useState, useCallback } from 'react';
import { userService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

const ROLES = ['PARTICIPANT', 'STAFF', 'ADMIN'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const roleBadge = { ADMIN: 'danger', STAFF: 'warning', PARTICIPANT: 'primary' };
const statusBadge = { ACTIVE: 'success', INACTIVE: 'gray', SUSPENDED: 'danger' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { type: 'role'|'status'|'delete', user }
  const [modalValue, setModalValue] = useState('');
  const [modalReason, setModalReason] = useState('');
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const d = await userService.getAll(params);
      setUsers(d.data.users);
      setTotal(d.data.total);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openModal = (type, user) => { setModal({ type, user }); setModalValue(''); setModalReason(''); };
  const closeModal = () => setModal(null);

  const handleConfirm = async () => {
    if (!modal) return;
    try {
      if (modal.type === 'role') {
        await userService.changeRole(modal.user._id, modalValue, modalReason);
        toast.success(`Role changed to ${modalValue}.`);
      } else if (modal.type === 'status') {
        await userService.changeStatus(modal.user._id, modalValue);
        toast.success(`Status changed to ${modalValue}.`);
      } else if (modal.type === 'delete') {
        await userService.delete(modal.user._id);
        toast.success('User deleted.');
      }
      closeModal();
      fetchUsers();
    } catch (err) { toast.error(err.message); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{total} users total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1', minWidth: 200 }}>
          <label htmlFor="user-search" className="form-label">Search</label>
          <input id="user-search" type="text" className="form-input" placeholder="Name, email, student ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="form-group" style={{ minWidth: 140 }}>
          <label htmlFor="role-filter" className="form-label">Role</label>
          <select id="role-filter" className="form-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 140 }}>
          <label htmlFor="status-filter" className="form-label">Status</label>
          <select id="status-filter" className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={fetchUsers}>Refresh</button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Institution</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u._id}>
                <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{u.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{u.email}</td>
                <td><span className={`badge badge-${roleBadge[u.role]}`}>{u.role}</span></td>
                <td><span className={`badge badge-${statusBadge[u.status]}`}>{u.status}</span></td>
                <td style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>{u.institution || '—'}</td>
                <td style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openModal('role', u)} title="Change Role">Role</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openModal('status', u)} title="Change Status">Status</button>
                    <button className="btn btn-sm btn-danger" onClick={() => openModal('delete', u)} title="Delete User">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination mt-4" style={{ justifyContent: 'center' }}>
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <span className="page-info">{page} / {totalPages}</span>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-sm animate-scale-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">
                {modal.type === 'role' ? '🔄 Change Role' : modal.type === 'status' ? '⚙️ Change Status' : '🗑️ Delete User'}
              </h2>
              <p style={{ color: 'var(--color-text-3)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                {modal.type === 'delete' ? `Are you sure you want to delete ${modal.user.name}? This cannot be undone.`
                  : `Update for: ${modal.user.name}`}
              </p>
            </div>

            {modal.type === 'role' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">New Role</label>
                  <select className="form-select" value={modalValue} onChange={(e) => setModalValue(e.target.value)}>
                    <option value="">Select role...</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason (optional)</label>
                  <input type="text" className="form-input" placeholder="Reason for role change" value={modalReason} onChange={(e) => setModalReason(e.target.value)} />
                </div>
              </div>
            )}

            {modal.type === 'status' && (
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-select" value={modalValue} onChange={(e) => setModalValue(e.target.value)}>
                  <option value="">Select status...</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className={`btn ${modal.type === 'delete' ? 'btn-danger' : 'btn-primary'}`} onClick={handleConfirm} disabled={modal.type !== 'delete' && !modalValue}>
                {modal.type === 'delete' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
