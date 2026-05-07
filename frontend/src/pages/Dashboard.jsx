import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../services/api'

function formatPaise(p) { return p ? `₹${(p / 100).toLocaleString('en-IN')}` : '₹0' }
function formatTime(sec) {
  if (!sec) return '0h 0m'
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return `${h}h ${m}m`
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    dashboardService.getStats()
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={s.skeleton}>
      {[...Array(5)].map((_, i) => <div key={i} style={s.skeletonCard} />)}
    </div>
  )

  const cards = [
    { label: 'Total Earnings', value: formatPaise(stats?.total_earnings), color: '#34d399', icon: '↗', change: '+12.5%' },
    { label: 'Pending', value: formatPaise(stats?.pending_earnings), color: '#fbbf24', icon: '⏳', change: 'Awaiting' },
    { label: 'Clients', value: stats?.total_clients || 0, color: '#60a5fa', icon: '●', sub: 'Active accounts' },
    { label: 'Tasks', value: stats?.active_tasks || 0, color: '#a78bfa', icon: '◆', sub: `${stats?.completed_tasks || 0} completed` },
    { label: 'Invoices', value: `${stats?.paid_invoices || 0}/${stats?.total_invoices || 0}`, color: '#818cf8', icon: '■', sub: 'Paid / Total' },
    { label: 'Time Tracked', value: formatTime(stats?.total_time_tracked), color: '#f472b6', icon: '◎', sub: 'All tasks' },
  ]

  const actions = [
    { label: 'New Client', desc: 'Add a billing client', icon: '+', path: '/clients', gradient: 'linear-gradient(135deg, #1e3a5f, #1a2e4a)' },
    { label: 'New Task', desc: 'Create billable work', icon: '✓', path: '/tasks', gradient: 'linear-gradient(135deg, #2d1b4e, #1f1635)' },
    { label: 'Invoices', desc: 'View & share links', icon: '→', path: '/invoices', gradient: 'linear-gradient(135deg, #1b3a2f, #152e25)' },
  ]

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.subtitle}>Your freelance business at a glance</p>
        </div>
        <div style={s.headerBadge}>
          <span style={s.liveDot} />
          <span style={s.liveText}>Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={s.statsGrid}>
        {cards.map((c, i) => (
          <div key={i} style={{ ...s.statCard, animationDelay: `${i * 0.06}s` }}>
            <div style={s.statTop}>
              <span style={s.statLabel}>{c.label}</span>
              {c.change && <span style={{ ...s.statChange, color: c.color }}>{c.change}</span>}
            </div>
            <div style={{ ...s.statValue, color: c.color }}>{c.value}</div>
            {c.sub && <span style={s.statSub}>{c.sub}</span>}
            <div style={{ ...s.statBar, background: `${c.color}15` }}>
              <div style={{ ...s.statBarFill, background: c.color, width: `${Math.min(100, Math.random() * 60 + 30)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>Quick Actions</h2>
      </div>
      <div style={s.actionsGrid}>
        {actions.map((a, i) => (
          <button key={i} onClick={() => navigate(a.path)} style={{ ...s.actionCard, background: a.gradient }}>
            <div style={s.actionIcon}>{a.icon}</div>
            <div>
              <div style={s.actionLabel}>{a.label}</div>
              <div style={s.actionDesc}>{a.desc}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', opacity: 0.4 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        ))}
      </div>

      {/* Recent Invoices */}
      {stats?.recent_invoices?.length > 0 && (
        <>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Recent Invoices</h2>
            <button onClick={() => navigate('/invoices')} style={s.viewAllBtn}>View all →</button>
          </div>
          <div style={s.recentList}>
            {stats.recent_invoices.map((inv, i) => (
              <div key={i} style={s.recentItem}>
                <div style={s.recentLeft}>
                  <span style={s.recentInvNum}>{inv.invoice_number}</span>
                  <span style={s.recentDate}>{new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>
                <span style={s.recentAmount}>{formatPaise(inv.amount)}</span>
                <span style={{
                  ...s.recentStatus,
                  color: inv.status === 'paid' ? 'var(--success)' : 'var(--warning)',
                  background: inv.status === 'paid' ? 'var(--success-bg)' : 'var(--warning-bg)',
                }}>
                  {inv.status === 'paid' ? '● Paid' : '○ Pending'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  skeleton: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' },
  skeletonCard: {
    height: '120px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)',
    animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%',
    backgroundImage: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%)',
  },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' },
  subtitle: { color: 'var(--text-tertiary)', fontSize: '0.9rem', marginTop: '0.25rem' },
  headerBadge: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem',
    borderRadius: '20px', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.15)',
  },
  liveDot: {
    width: '6px', height: '6px', borderRadius: '50%', background: '#34d399',
    animation: 'pulse-ring 2s infinite',
  },
  liveText: { fontSize: '0.75rem', fontWeight: 600, color: '#34d399' },

  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2.5rem',
  },
  statCard: {
    background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.25rem',
    border: '1px solid var(--border-primary)', animation: 'fadeIn 0.4s ease backwards',
    transition: 'var(--transition-fast)',
  },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  statLabel: { fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  statChange: { fontSize: '0.72rem', fontWeight: 600 },
  statValue: { fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.15rem' },
  statSub: { fontSize: '0.75rem', color: 'var(--text-tertiary)' },
  statBar: { height: '3px', borderRadius: '2px', marginTop: '0.75rem', overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: '2px', transition: 'width 1s ease' },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' },
  viewAllBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-accent)', fontSize: '0.82rem',
    cursor: 'pointer', fontWeight: 500,
  },

  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' },
  actionCard: {
    display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)',
    cursor: 'pointer', transition: 'var(--transition-fast)', color: 'var(--text-primary)',
    textAlign: 'left', fontSize: 'inherit', fontFamily: 'inherit',
  },
  actionIcon: {
    width: '36px', height: '36px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
  },
  actionLabel: { fontSize: '0.9rem', fontWeight: 600 },
  actionDesc: { fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' },

  recentList: {
    background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)',
    overflow: 'hidden',
  },
  recentItem: {
    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem',
    borderBottom: '1px solid var(--border-subtle)', transition: 'var(--transition-fast)',
  },
  recentLeft: { display: 'flex', flexDirection: 'column', flex: 1 },
  recentInvNum: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' },
  recentDate: { fontSize: '0.72rem', color: 'var(--text-tertiary)' },
  recentAmount: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' },
  recentStatus: { fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '20px' },
}
