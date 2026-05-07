import { useState, useEffect, useCallback } from 'react'
import { clientService } from '../services/api'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', error: false })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const flash = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }

  const fetchClients = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await clientService.list(page)
      const d = res.data.data
      setClients(d.clients)
      setPagination({ page: d.page, total: d.total, total_pages: d.total_pages })
    } catch { flash('Failed to load clients', true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', phone: '', company: '', notes: '' }); setShowModal(true) }
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', notes: c.notes || '' }); setShowModal(true) }

  const save = async () => {
    if (!form.name.trim()) return flash('Name is required', true)
    setSaving(true)
    try {
      if (editing) { await clientService.update(editing.id, form); flash('Client updated') }
      else { await clientService.create(form); flash('Client created') }
      setShowModal(false); fetchClients(pagination.page)
    } catch (err) { flash(err.response?.data?.detail || 'Failed to save', true) }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this client? Tasks and invoices linked to them will also be removed.')) return
    try { await clientService.delete(id); flash('Client deleted'); fetchClients(pagination.page) }
    catch { flash('Failed to delete', true) }
  }

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const getColor = (name) => colors[name.charCodeAt(0) % colors.length]

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Clients</h1>
          <p style={s.subtitle}>{pagination.total} client{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} style={s.primaryBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Client
        </button>
      </div>

      {msg.text && <div style={msg.error ? s.errorBanner : s.successBanner}>{msg.error ? '✕' : '✓'} {msg.text}</div>}

      {loading ? (
        <div style={s.grid}>{[...Array(3)].map((_, i) => <div key={i} style={s.skeletonCard} />)}</div>
      ) : clients.length === 0 ? (
        <div style={s.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p style={s.emptyTitle}>No clients yet</p>
          <p style={s.emptyDesc}>Add your first client to start tracking work and invoicing</p>
        </div>
      ) : (
        <div style={s.grid}>
          {clients.map((c, i) => (
            <div key={c.id} style={{ ...s.card, animationDelay: `${i * 0.05}s` }}>
              <div style={s.cardTop}>
                <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${getColor(c.name)}, ${getColor(c.name)}90)` }}>
                  {c.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={s.cardName}>{c.name}</h3>
                  {c.company && <p style={s.cardCompany}>{c.company}</p>}
                </div>
                <div style={s.cardMenu}>
                  <button onClick={() => openEdit(c)} style={s.iconBtn} title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => remove(c.id)} style={{ ...s.iconBtn, color: 'var(--danger)' }} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div style={s.detailList}>
                {c.email && <div style={s.detail}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>{c.email}</span></div>}
                {c.phone && <div style={s.detail}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>{c.phone}</span></div>}
              </div>
              {c.notes && <p style={s.cardNotes}>{c.notes}</p>}
              <div style={s.cardFooter}>
                <span style={s.cardDate}>Added {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div style={s.pagination}>
          <button onClick={() => fetchClients(pagination.page - 1)} disabled={pagination.page === 1} style={s.pageBtn}>← Prev</button>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Page {pagination.page}/{pagination.total_pages}</span>
          <button onClick={() => fetchClients(pagination.page + 1)} disabled={pagination.page === pagination.total_pages} style={s.pageBtn}>Next →</button>
        </div>
      )}

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editing ? 'Edit Client' : 'Add Client'}</h2>
            <div style={s.field}><label style={s.label}>Name *</label><input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client name" /></div>
            <div style={s.field}><label style={s.label}>Email</label><input style={s.input} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@email.com" type="email" /></div>
            <div style={s.row}>
              <div style={s.col}><label style={s.label}>Phone</label><input style={s.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
              <div style={s.col}><label style={s.label}>Company</label><input style={s.input} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" /></div>
            </div>
            <div style={s.field}><label style={s.label}>Notes</label><textarea style={{ ...s.input, height: '70px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
            <div style={s.modalActions}>
              <button onClick={() => setShowModal(false)} style={s.cancelBtn}>Cancel</button>
              <button onClick={save} disabled={saving} style={s.primaryBtn}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 },
  subtitle: { color: 'var(--text-tertiary)', fontSize: '0.9rem', marginTop: '0.25rem' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' },
  errorBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(248,113,113,0.15)' },
  successBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(52,211,153,0.15)' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' },
  skeletonCard: { height: '160px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%)' },

  empty: { textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' },
  emptyTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1rem 0 0.25rem' },
  emptyDesc: { color: 'var(--text-tertiary)', fontSize: '0.85rem' },

  card: { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '0.65rem', animation: 'fadeIn 0.3s ease backwards', transition: 'var(--transition-fast)' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatar: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
  cardName: { color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardCompany: { color: 'var(--text-tertiary)', margin: 0, fontSize: '0.78rem' },
  cardMenu: { display: 'flex', gap: '0.25rem', marginLeft: 'auto', flexShrink: 0 },
  iconBtn: { background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex' },

  detailList: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  detail: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.82rem' },
  cardNotes: { color: 'var(--text-tertiary)', fontSize: '0.78rem', margin: 0, lineHeight: 1.5, padding: '0.5rem 0.65rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--border-primary)' },
  cardFooter: { paddingTop: '0.35rem', borderTop: '1px solid var(--border-subtle)' },
  cardDate: { color: 'var(--text-tertiary)', fontSize: '0.72rem' },

  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' },
  pageBtn: { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.85rem', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '2rem', width: '100%', maxWidth: '520px', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-lg)', animation: 'scaleIn 0.2s ease' },
  modalTitle: { color: 'var(--text-primary)', margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: 700 },
  field: { marginBottom: '1rem' },
  label: { display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  row: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  col: { flex: 1 },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' },
  cancelBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.2rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' },
}
