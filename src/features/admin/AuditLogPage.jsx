import { History, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { FEATURE_OPTIONS } from '../../lib/features.js';

const PAGE = 100;
const featureLabel = key => FEATURE_OPTIONS.find(f => f.key === key)?.label || key;
const roleLabel = r => r === 'super_admin' ? 'Super admin' : r === 'owner' ? 'Owner' : 'User';
const settingLabel = { access_requests_enabled: 'Require approval for new users', public_signup_enabled: 'Username sign-up', backup_restore_for_users: 'Show Backup & restore to regular users' };

/** One readable sentence per audit row. */
export function describeAudit(row) {
  const d = row.details || {};
  const list = a => (Array.isArray(a) ? a : []).map(featureLabel).join(', ');
  switch (row.action) {
    case 'user.created': return `Created account (${roleLabel(d.role)})`;
    case 'user.deleted': return `Deleted account (${roleLabel(d.role)})`;
    case 'user.role_changed': return `Changed role from ${roleLabel(d.from)} to ${roleLabel(d.to)}`;
    case 'user.features_changed': return [d.added?.length ? `Granted ${list(d.added)}` : '', d.removed?.length ? `Removed ${list(d.removed)}` : ''].filter(Boolean).join(' · ') || 'Updated features';
    case 'access_request.approved': return 'Approved access request';
    case 'access_request.denied': return 'Denied access request';
    case 'access_request.pending': return 'Reopened access request';
    case 'setting.changed': return `Turned ${d.to === false ? 'off' : 'on'}: ${settingLabel[row.target_label] || row.target_label}`;
    default: return row.action;
  }
}

export function AuditLogPage({ supabase }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load(before = null) {
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.rpc('admin_list_audit_log', { p_limit: PAGE, p_before: before });
      if (error) throw error;
      setRows(prev => before ? [...prev, ...(data || [])] : (data || []));
      setMore((data || []).length === PAGE);
    } catch (e) {
      setError(e?.message || 'Could not load the audit log. Apply the audit-log migration in Supabase first.');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const shown = q ? rows.filter(r => `${r.actor_label} ${r.target_label} ${describeAudit(r)}`.toLowerCase().includes(q)) : rows;

  return <div className="page-content">
    <PageHeading eyebrow="ADMINISTRATION" title="Audit log" subtitle="Every change to roles, feature access, access requests and global settings, newest first."
      actions={<button className="btn btn-secondary" type="button" onClick={() => load()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> Refresh</button>}/>
    <section className="panel">
      <div className="panel-header">
        <div><h2><History size={18}/> Admin activity</h2><p>Entries are written by the database and can’t be edited or deleted.</p></div>
        <label className="access-request-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search person or action" aria-label="Search the audit log"/></label>
      </div>
      {error ? <div className="empty-state"><h3>Couldn’t load the audit log</h3><p>{error}</p><button className="btn btn-primary" type="button" onClick={() => load()}>Try again</button></div>
        : loading && !rows.length ? <div className="loading-row"><LoaderCircle className="spin" size={18}/> Loading activity…</div>
        : shown.length === 0 ? <div className="empty-state"><h3>{rows.length ? 'No matching entries' : 'No admin activity yet'}</h3><p>{rows.length ? 'Try another search.' : 'Role changes, feature grants, request decisions and setting changes will appear here.'}</p></div>
        : <div className="table-wrap"><table className="data-table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Account / setting</th></tr></thead>
            <tbody>{shown.map(r => <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.actor_label || 'Server'}</td>
              <td>{describeAudit(r)}</td>
              <td>{r.action === 'setting.changed' ? '—' : (r.target_label || '—')}</td>
            </tr>)}</tbody>
          </table></div>}
      {more && !q && <div className="panel-footer-actions" style={{ padding: 12, textAlign: 'center' }}><button className="btn btn-secondary" type="button" disabled={loading} onClick={() => load(rows[rows.length - 1]?.id)}>{loading ? 'Loading…' : 'Load older entries'}</button></div>}
    </section>
  </div>;
}
