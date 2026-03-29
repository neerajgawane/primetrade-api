import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { taskService } from '../services/api'

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const PRIORITY_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' }
const STATUS_COLORS = { todo: '#94a3b8', in_progress: '#6366f1', done: '#22c55e' }

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', error: false })
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium' })
  const [saving, setSaving] = useState(false)

  const flash = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await taskService.list(page)
      const d = res.data.data
      setTasks(d.tasks); setPagination({ page: d.page, total: d.total, total_pages: d.total_pages })
    } catch { flash('Failed to load tasks', true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const openCreate = () => { setEditingTask(null); setForm({ title: '', description: '', status: 'todo', priority: 'medium' }); setShowModal(true) }
  const openEdit = (t) => { setEditingTask(t); setForm({ title: t.title, description: t.description || '', status: t.status, priority: t.priority }); setShowModal(true) }

  const saveTask = async () => {
    if (!form.title.trim()) return flash('Title is required', true)
    setSaving(true)
    try {
      if (editingTask) { await taskService.update(editingTask.id, form); flash('Task updated') }
      else { await taskService.create(form); flash('Task created') }
      setShowModal(false); fetchTasks(pagination.page)
    } catch (err) { flash(err.response?.data?.detail || 'Failed to save', true) }
    finally { setSaving(false) }
  }

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return
    try { await taskService.delete(id); flash('Task deleted'); fetchTasks(pagination.page) }
    catch { flash('Failed to delete', true) }
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo}>⚡ PrimeTrade</span>
        <div style={s.navRight}>
          {isAdmin && <button onClick={() => navigate('/admin')} style={s.navBtn}>👑 Admin Panel</button>}
          <span style={s.navUser}>👤 {user?.username}</span>
          <span style={{ ...s.badge, background: user?.role === 'admin' ? '#7c3aed' : '#1e40af' }}>{user?.role}</span>
          <button onClick={async () => { await logout(); navigate('/login') }} style={s.logoutBtn}>Logout</button>
        </div>
      </nav>
      <div style={s.content}>
        <div style={s.header}>
          <div><h1 style={s.h1}>My Tasks</h1><p style={s.sub}>{pagination.total} tasks</p></div>
          <button onClick={openCreate} style={s.primaryBtn}>+ New Task</button>
        </div>
        {msg.text && <div style={msg.error ? s.errorBanner : s.successBanner}>{msg.text}</div>}
        {loading ? <p style={{ color:'#64748b',textAlign:'center',padding:'3rem' }}>Loading...</p>
          : tasks.length === 0 ? <div style={s.emptyCard}><p style={{ fontSize:'2rem',margin:0 }}>📋</p><p style={{ color:'#94a3b8',margin:'0.5rem 0 0' }}>No tasks yet. Create your first one!</p></div>
          : <div style={s.taskGrid}>{tasks.map(task => (
            <div key={task.id} style={s.taskCard}>
              <div style={s.taskTop}>
                <span style={{ ...s.dot, background: PRIORITY_COLORS[task.priority] }} />
                <span style={{ ...s.statusBadge, background: STATUS_COLORS[task.status]+'22', color: STATUS_COLORS[task.status] }}>{STATUS_LABELS[task.status]}</span>
              </div>
              <h3 style={s.taskTitle}>{task.title}</h3>
              {task.description && <p style={s.taskDesc}>{task.description}</p>}
              <div style={s.taskMeta}>
                <span style={{ color:'#64748b',fontSize:'0.75rem' }}>{new Date(task.created_at).toLocaleDateString()}</span>
                <div style={{ display:'flex',gap:'0.5rem' }}>
                  <button onClick={() => openEdit(task)} style={s.editBtn}>Edit</button>
                  <button onClick={() => deleteTask(task.id)} style={s.deleteBtn}>Delete</button>
                </div>
              </div>
            </div>
          ))}</div>}
        {pagination.total_pages > 1 && (
          <div style={s.pagination}>
            <button onClick={() => fetchTasks(pagination.page - 1)} disabled={pagination.page === 1} style={s.pageBtn}>← Prev</button>
            <span style={{ color:'#94a3b8' }}>Page {pagination.page} of {pagination.total_pages}</span>
            <button onClick={() => fetchTasks(pagination.page + 1)} disabled={pagination.page === pagination.total_pages} style={s.pageBtn}>Next →</button>
          </div>
        )}
      </div>
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingTask ? 'Edit Task' : 'New Task'}</h2>
            <label style={s.label}>Title *</label>
            <input style={s.input} value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Task title" />
            <label style={s.label}>Description</label>
            <textarea style={{ ...s.input, height:'80px', resize:'vertical' }} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Optional" />
            <div style={{ display:'flex',gap:'1rem' }}>
              <div style={{ flex:1 }}><label style={s.label}>Priority</label><select style={s.input} value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div style={{ flex:1 }}><label style={s.label}>Status</label><select style={s.input} value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div>
            </div>
            <div style={{ display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'1.5rem' }}>
              <button onClick={() => setShowModal(false)} style={s.cancelBtn}>Cancel</button>
              <button onClick={saveTask} disabled={saving} style={s.primaryBtn}>{saving ? 'Saving...' : editingTask ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:{ minHeight:'100vh',background:'#0f172a' },
  nav:{ background:'#1e293b',padding:'0 2rem',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #334155' },
  logo:{ color:'#6366f1',fontWeight:700,fontSize:'1.1rem' },
  navRight:{ display:'flex',alignItems:'center',gap:'0.75rem' },
  navBtn:{ background:'#312e81',color:'#a5b4fc',border:'none',borderRadius:'6px',padding:'0.4rem 0.8rem',cursor:'pointer',fontSize:'0.85rem' },
  navUser:{ color:'#94a3b8',fontSize:'0.9rem' },
  badge:{ color:'#fff',borderRadius:'4px',padding:'0.2rem 0.5rem',fontSize:'0.75rem',fontWeight:600 },
  logoutBtn:{ background:'transparent',color:'#ef4444',border:'1px solid #ef4444',borderRadius:'6px',padding:'0.35rem 0.75rem',cursor:'pointer',fontSize:'0.85rem' },
  content:{ maxWidth:'900px',margin:'0 auto',padding:'2rem 1rem' },
  header:{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem' },
  h1:{ color:'#f1f5f9',margin:0,fontSize:'1.75rem' },
  sub:{ color:'#64748b',margin:'0.25rem 0 0',fontSize:'0.9rem' },
  primaryBtn:{ background:'#6366f1',color:'#fff',border:'none',borderRadius:'8px',padding:'0.65rem 1.25rem',cursor:'pointer',fontSize:'0.95rem',fontWeight:600 },
  errorBanner:{ background:'#7f1d1d',color:'#fca5a5',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'1rem' },
  successBanner:{ background:'#14532d',color:'#86efac',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'1rem' },
  emptyCard:{ textAlign:'center',background:'#1e293b',borderRadius:'12px',padding:'3rem',border:'2px dashed #334155' },
  taskGrid:{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:'1rem' },
  taskCard:{ background:'#1e293b',borderRadius:'10px',padding:'1.25rem',border:'1px solid #334155',display:'flex',flexDirection:'column',gap:'0.5rem' },
  taskTop:{ display:'flex',alignItems:'center',justifyContent:'space-between' },
  dot:{ width:'10px',height:'10px',borderRadius:'50%',display:'inline-block' },
  statusBadge:{ fontSize:'0.75rem',fontWeight:600,padding:'0.2rem 0.6rem',borderRadius:'20px' },
  taskTitle:{ color:'#f1f5f9',margin:0,fontSize:'1rem',fontWeight:600 },
  taskDesc:{ color:'#64748b',margin:0,fontSize:'0.85rem',lineHeight:1.5 },
  taskMeta:{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'0.25rem' },
  editBtn:{ background:'#1d4ed8',color:'#93c5fd',border:'none',borderRadius:'5px',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.8rem' },
  deleteBtn:{ background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:'5px',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.8rem' },
  pagination:{ display:'flex',justifyContent:'center',alignItems:'center',gap:'1rem',marginTop:'2rem' },
  pageBtn:{ background:'#1e293b',color:'#94a3b8',border:'1px solid #334155',borderRadius:'6px',padding:'0.5rem 1rem',cursor:'pointer' },
  overlay:{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100 },
  modal:{ background:'#1e293b',borderRadius:'12px',padding:'2rem',width:'100%',maxWidth:'480px',border:'1px solid #334155' },
  modalTitle:{ color:'#f1f5f9',margin:'0 0 1.5rem',fontSize:'1.25rem' },
  label:{ display:'block',color:'#94a3b8',fontSize:'0.85rem',marginBottom:'0.4rem',marginTop:'1rem' },
  input:{ width:'100%',padding:'0.65rem 0.75rem',background:'#0f172a',border:'1px solid #334155',borderRadius:'8px',color:'#f1f5f9',fontSize:'0.9rem',boxSizing:'border-box' },
  cancelBtn:{ background:'transparent',color:'#94a3b8',border:'1px solid #334155',borderRadius:'8px',padding:'0.65rem 1.25rem',cursor:'pointer' },
}
