import { useState, useEffect, useCallback } from 'react'
import { taskService, clientService } from '../services/api'

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', archived: 'Archived' }
const PRIORITY_COLORS = { low: '#34d399', medium: '#fbbf24', high: '#f87171' }
const STATUS_COLORS = { todo: '#8b95a8', in_progress: '#818cf8', done: '#34d399', archived: '#5a657a' }

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const sec = seconds % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function formatPaise(paise) {
  if (!paise) return '—'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

function LiveTimer({ startedAt, baseTime }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const start = new Date(startedAt + 'Z').getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'monospace', fontSize: '1.3rem', letterSpacing: '0.05em' }}>{formatTime((baseTime || 0) + elapsed)}</span>
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', error: false })
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', client_id: '', rate_type: 'fixed', rate: '' })
  const [saving, setSaving] = useState(false)

  const flash = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 4000) }

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await taskService.list(page, 20)
      const d = res.data.data
      setTasks(d.tasks); setPagination({ page: d.page, total: d.total, total_pages: d.total_pages })
    } catch { flash('Failed to load tasks', true) }
    finally { setLoading(false) }
  }, [])

  const fetchClients = useCallback(async () => {
    try { const res = await clientService.list(1, 100); setClients(res.data.data.clients) } catch {}
  }, [])

  useEffect(() => { fetchTasks(); fetchClients() }, [fetchTasks, fetchClients])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', description: '', status: 'todo', priority: 'medium', client_id: '', rate_type: 'fixed', rate: '' })
    setShowModal(true)
  }
  const openEdit = (t) => {
    setEditing(t)
    setForm({ title: t.title, description: t.description || '', status: t.status, priority: t.priority, client_id: t.client_id || '', rate_type: t.rate_type || 'fixed', rate: t.rate ? String(t.rate / 100) : '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) return flash('Title is required', true)
    setSaving(true)
    try {
      const payload = { ...form, client_id: form.client_id || null, rate: form.rate ? Math.round(Number(form.rate) * 100) : null }
      if (editing) { await taskService.update(editing.id, payload); flash('Task updated') }
      else { await taskService.create(payload); flash('Task created') }
      setShowModal(false); fetchTasks(pagination.page)
    } catch (err) { flash(err.response?.data?.detail || 'Failed to save', true) }
    finally { setSaving(false) }
  }

  const handleTimer = async (task) => {
    try {
      if (task.timer_started_at) { await taskService.stopTimer(task.id); flash('Timer stopped') }
      else { await taskService.startTimer(task.id); flash('Timer started — tracking time') }
      fetchTasks(pagination.page)
    } catch (err) { flash(err.response?.data?.detail || 'Timer error', true) }
  }

  const handleComplete = async (task) => {
    if (!confirm('Mark as done? This will auto-generate an invoice if client & rate are set.')) return
    try {
      const res = await taskService.complete(task.id)
      const d = res.data.data
      if (d.invoice) flash(`Done! Invoice ${d.invoice.invoice_number} generated (${formatPaise(d.invoice.amount)})`)
      else flash('Task completed!')
      fetchTasks(pagination.page)
    } catch (err) { flash(err.response?.data?.detail || 'Failed to complete', true) }
  }

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return
    try { await taskService.delete(id); flash('Task deleted'); fetchTasks(pagination.page) }
    catch { flash('Failed to delete', true) }
  }

  const getClientName = (cid) => { const c = clients.find(cl => cl.id === cid); return c ? c.name : null }
  const runningTask = tasks.find(t => t.timer_started_at)

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Tasks</h1>
          <p style={s.subtitle}>{pagination.total} task{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} style={s.primaryBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>

      {msg.text && <div style={msg.error ? s.errorBanner : s.successBanner}>{msg.error ? '✕' : '✓'} {msg.text}</div>}

      {/* Active Timer Bar */}
      {runningTask && (
        <div style={s.timerBar}>
          <div style={s.timerPulse} />
          <div style={s.timerInfo}>
            <span style={s.timerLabel}>TRACKING</span>
            <span style={s.timerTaskName}>{runningTask.title}</span>
          </div>
          <LiveTimer startedAt={runningTask.timer_started_at} baseTime={runningTask.time_spent} />
          <button onClick={() => handleTimer(runningTask)} style={s.timerStopBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            Stop
          </button>
        </div>
      )}

      {loading ? (
        <div style={s.loadWrap}>{[...Array(3)].map((_,i) => <div key={i} style={s.skeletonCard} />)}</div>
      ) : tasks.length === 0 ? (
        <div style={s.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1rem 0 0.25rem' }}>No tasks yet</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Create one to start tracking work!</p>
        </div>
      ) : (
        <div style={s.taskList}>
          {tasks.map((task, i) => (
            <div key={task.id} style={{ ...s.taskCard, borderLeftColor: STATUS_COLORS[task.status], animationDelay: `${i*0.04}s` }}>
              <div style={s.taskBody}>
                <div style={s.taskTop}>
                  <span style={{ ...s.priorityDot, background: PRIORITY_COLORS[task.priority] }} title={task.priority} />
                  <h3 style={s.taskTitle}>{task.title}</h3>
                  <span style={{ ...s.statusChip, color: STATUS_COLORS[task.status], background: STATUS_COLORS[task.status] + '15', borderColor: STATUS_COLORS[task.status] + '30' }}>{STATUS_LABELS[task.status]}</span>
                </div>
                {task.description && <p style={s.taskDesc}>{task.description}</p>}
                <div style={s.taskMeta}>
                  {task.client_id && <span style={s.metaTag}>👤 {getClientName(task.client_id)}</span>}
                  {task.rate && <span style={s.metaTag}>{formatPaise(task.rate)}{task.rate_type === 'hourly' ? '/hr' : ' fixed'}</span>}
                  <span style={s.metaTag}>
                    ⏱ {task.timer_started_at ? <LiveTimer startedAt={task.timer_started_at} baseTime={task.time_spent} /> : <span style={{ fontFamily: 'monospace' }}>{formatTime(task.time_spent)}</span>}
                  </span>
                </div>
              </div>
              <div style={s.taskActions}>
                {task.status !== 'done' && task.status !== 'archived' && (
                  <>
                    <button onClick={() => handleTimer(task)} style={task.timer_started_at ? s.stopBtn : s.startBtn}>
                      {task.timer_started_at ? '⏹ Stop' : '▶ Start'}
                    </button>
                    <button onClick={() => handleComplete(task)} style={s.doneBtn}>✓ Done</button>
                  </>
                )}
                <button onClick={() => openEdit(task)} style={s.editBtn}>Edit</button>
                <button onClick={() => deleteTask(task.id)} style={s.delBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div style={s.pagination}>
          <button onClick={() => fetchTasks(pagination.page - 1)} disabled={pagination.page === 1} style={s.pageBtn}>← Prev</button>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Page {pagination.page}/{pagination.total_pages}</span>
          <button onClick={() => fetchTasks(pagination.page + 1)} disabled={pagination.page === pagination.total_pages} style={s.pageBtn}>Next →</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editing ? 'Edit Task' : 'New Task'}</h2>
            <div style={s.field}><label style={s.label}>Title *</label><input style={s.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What are you working on?" /></div>
            <div style={s.field}><label style={s.label}>Description</label><textarea style={{ ...s.input, height: '70px', resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details" /></div>
            <div style={s.row}>
              <div style={s.col}><label style={s.label}>Priority</label><select style={s.input} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div style={s.col}><label style={s.label}>Client</label><select style={s.input} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}><option value="">No client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div style={s.row}>
              <div style={s.col}><label style={s.label}>Rate Type</label><select style={s.input} value={form.rate_type} onChange={e => setForm({ ...form, rate_type: e.target.value })}><option value="fixed">Fixed Price</option><option value="hourly">Hourly</option></select></div>
              <div style={s.col}><label style={s.label}>Rate (₹)</label><input style={s.input} value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder={form.rate_type === 'hourly' ? '₹/hour' : 'Total ₹'} type="number" min="0" /></div>
            </div>
            {!form.client_id && form.rate && <div style={s.hint}>⚠ Select a client to enable auto-invoicing when this task is completed</div>}
            <div style={s.modalActions}>
              <button onClick={() => setShowModal(false)} style={s.cancelBtn}>Cancel</button>
              <button onClick={save} disabled={saving} style={s.primaryBtn}>{saving ? 'Saving...' : editing ? 'Update' : 'Create Task'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' },
  subtitle: { color: 'var(--text-tertiary)', fontSize: '0.9rem', marginTop: '0.25rem' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' },
  errorBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(248,113,113,0.15)' },
  successBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(52,211,153,0.15)' },

  timerBar: { display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 'var(--radius-lg)', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' },
  timerPulse: { width: '10px', height: '10px', borderRadius: '50%', background: '#34d399', animation: 'pulse-ring 2s infinite', flexShrink: 0 },
  timerInfo: { display: 'flex', flexDirection: 'column', flex: 1 },
  timerLabel: { fontSize: '0.65rem', fontWeight: 700, color: '#34d399', letterSpacing: '0.1em' },
  timerTaskName: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' },
  timerStopBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' },

  loadWrap: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  skeletonCard: { height: '90px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-elevated) 50%, var(--bg-card) 100%)' },
  empty: { textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' },

  taskList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  taskCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', border: '1px solid var(--border-primary)', borderLeft: '3px solid', animation: 'fadeIn 0.3s ease backwards', transition: 'var(--transition-fast)' },
  taskBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  taskTop: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  priorityDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  taskTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  statusChip: { fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '20px', border: '1px solid' },
  taskDesc: { color: 'var(--text-tertiary)', margin: 0, fontSize: '0.82rem', lineHeight: 1.5 },
  taskMeta: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.2rem' },
  metaTag: { color: 'var(--text-secondary)', fontSize: '0.78rem', background: 'var(--bg-primary)', padding: '0.15rem 0.5rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' },

  taskActions: { display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 },
  startBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  stopBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', animation: 'pulse-ring 2s infinite' },
  doneBtn: { background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  editBtn: { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  delBtn: { background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

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
  hint: { background: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontWeight: 500, marginBottom: '1rem', border: '1px solid rgba(251,191,36,0.15)' },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' },
  cancelBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.2rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' },
}
