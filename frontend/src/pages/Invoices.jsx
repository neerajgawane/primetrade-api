import { useState, useEffect, useCallback } from 'react'
import { invoiceService } from '../services/api'

function formatPaise(p) { return p ? `₹${(p / 100).toLocaleString('en-IN')}` : '₹0' }

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', error: false })
  const flash = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }

  const fetchInvoices = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await invoiceService.list(page, 10)
      const d = res.data.data
      setInvoices(d.invoices)
      setPagination({ page: d.page, total: d.total, total_pages: d.total_pages })
    } catch { flash('Failed to load invoices', true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const copyLink = (id) => {
    const url = `${window.location.origin}/pay/${id}`
    navigator.clipboard.writeText(url).then(() => flash('Payment link copied!')).catch(() => flash('Failed to copy', true))
  }

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Invoices</h1>
          <p style={s.subtitle}>{pagination.total} invoice{pagination.total !== 1 ? 's' : ''} • Auto-generated when tasks are completed</p>
        </div>
      </div>

      {msg.text && (
        <div style={msg.error ? s.errorBanner : s.successBanner}>
          <span>{msg.error ? '✕' : '✓'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      {invoices.length > 0 && (
        <div style={s.summaryRow}>
          <div style={{ ...s.summaryCard, borderColor: 'rgba(52,211,153,0.2)' }}>
            <span style={s.summaryLabel}>Collected</span>
            <span style={{ ...s.summaryValue, color: '#34d399' }}>{formatPaise(totalPaid)}</span>
          </div>
          <div style={{ ...s.summaryCard, borderColor: 'rgba(251,191,36,0.2)' }}>
            <span style={s.summaryLabel}>Outstanding</span>
            <span style={{ ...s.summaryValue, color: '#fbbf24' }}>{formatPaise(totalPending)}</span>
          </div>
          <div style={{ ...s.summaryCard, borderColor: 'rgba(99,102,241,0.2)' }}>
            <span style={s.summaryLabel}>Total</span>
            <span style={{ ...s.summaryValue, color: '#818cf8' }}>{formatPaise(totalPaid + totalPending)}</span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={s.loadingWrap}>
          {[...Array(3)].map((_, i) => <div key={i} style={s.skeletonRow} />)}
        </div>
      ) : invoices.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <p style={s.emptyTitle}>No invoices yet</p>
          <p style={s.emptyDesc}>Complete a task with a client and rate to auto-generate your first invoice</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Invoice</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Date</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} style={{ ...s.tr, animationDelay: `${i * 0.05}s` }}>
                  <td style={s.td}>
                    <span style={s.invNum}>{inv.invoice_number}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.amount}>{formatPaise(inv.amount)}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      ...s.statusBadge,
                      color: inv.status === 'paid' ? '#34d399' : '#fbbf24',
                      background: inv.status === 'paid' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                      borderColor: inv.status === 'paid' ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)',
                    }}>
                      <span style={{
                        ...s.statusDot,
                        background: inv.status === 'paid' ? '#34d399' : '#fbbf24',
                      }} />
                      {inv.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={s.date}>
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <div style={s.actions}>
                      <button onClick={() => copyLink(inv.id)} style={s.actionBtn} title="Copy payment link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>Copy Link</span>
                      </button>
                      <button onClick={() => window.open(`/pay/${inv.id}`, '_blank')} style={s.viewBtn} title="View payment page">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        <span>Open</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div style={s.pagination}>
          <button onClick={() => fetchInvoices(pagination.page - 1)} disabled={pagination.page === 1} style={s.pageBtn}>← Previous</button>
          <span style={s.pageInfo}>Page {pagination.page} of {pagination.total_pages}</span>
          <button onClick={() => fetchInvoices(pagination.page + 1)} disabled={pagination.page === pagination.total_pages} style={s.pageBtn}>Next →</button>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' },
  subtitle: { color: 'var(--text-tertiary)', fontSize: '0.9rem', marginTop: '0.25rem' },

  errorBanner: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 500,
    border: '1px solid rgba(248,113,113,0.15)',
  },
  successBanner: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 500,
    border: '1px solid rgba(52,211,153,0.15)',
  },

  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' },
  summaryCard: {
    background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
    border: '1px solid', display: 'flex', flexDirection: 'column', gap: '0.25rem',
  },
  summaryLabel: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  summaryValue: { fontSize: '1.35rem', fontWeight: 700, fontFamily: 'monospace' },

  loadingWrap: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  skeletonRow: {
    height: '56px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)',
    animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%',
    backgroundImage: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%)',
  },

  empty: {
    textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)',
  },
  emptyIcon: { marginBottom: '1rem', opacity: 0.5 },
  emptyTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' },
  emptyDesc: { color: 'var(--text-tertiary)', fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' },

  tableWrap: {
    background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)', overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: '0.72rem', fontWeight: 600,
    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-surface)',
  },
  tr: { animation: 'fadeIn 0.3s ease backwards', transition: 'var(--transition-fast)' },
  td: {
    padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)',
    fontSize: '0.88rem', verticalAlign: 'middle',
  },
  invNum: { fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-accent)', fontSize: '0.85rem' },
  amount: { fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
    border: '1px solid',
  },
  statusDot: { width: '5px', height: '5px', borderRadius: '50%' },
  date: { color: 'var(--text-secondary)', fontSize: '0.82rem' },
  actions: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem',
    background: 'var(--accent-subtle)', color: 'var(--text-accent)', border: '1px solid var(--border-accent)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
    fontFamily: 'inherit', transition: 'var(--transition-fast)',
  },
  viewBtn: {
    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem',
    background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
    fontFamily: 'inherit', transition: 'var(--transition-fast)',
  },

  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' },
  pageBtn: {
    background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.85rem', cursor: 'pointer', fontSize: '0.82rem',
    fontFamily: 'inherit',
  },
  pageInfo: { color: 'var(--text-tertiary)', fontSize: '0.82rem' },
}
