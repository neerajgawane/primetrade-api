import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminService } from '../services/api'

export default function AdminPanel() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', error: false })

  useEffect(() => { if (!isAdmin) { navigate('/dashboard'); return } fetchUsers() }, [isAdmin])

  const fetchUsers = async () => {
    setLoading(true)
    try { const res = await adminService.listUsers(); setUsers(res.data.data) }
    catch { setMsg({ text: 'Failed to load users', error: true }) }
    finally { setLoading(false) }
  }

  const flash = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }

  const toggleRole = async (user) => {
    try { await adminService.updateRole(user.id, user.role === 'admin' ? 'user' : 'admin'); flash(`${user.username} role updated`); fetchUsers() }
    catch { flash('Failed to update role', true) }
  }

  const toggleActive = async (user) => {
    try {
      if (user.is_active) { await adminService.deactivate(user.id); flash(`${user.username} deactivated`) }
      else { await adminService.activate(user.id); flash(`${user.username} activated`) }
      fetchUsers()
    } catch (err) { flash(err.response?.data?.detail || 'Failed', true) }
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo}>⚡ PrimeTrade — Admin Panel</span>
        <button onClick={() => navigate('/dashboard')} style={s.backBtn}>← Back</button>
      </nav>
      <div style={s.content}>
        <h1 style={s.h1}>User Management</h1>
        <p style={s.sub}>{users.length} registered users</p>
        {msg.text && <div style={msg.error ? s.errorBanner : s.successBanner}>{msg.text}</div>}
        {loading ? <p style={{ color:'#64748b',textAlign:'center',padding:'3rem' }}>Loading...</p> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{['Username','Email','Role','Status','Joined','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{users.map(user => (
                <tr key={user.id} style={s.tr}>
                  <td style={s.td}><span style={{ color:'#f1f5f9',fontWeight:600 }}>{user.username}</span></td>
                  <td style={s.td}><span style={{ color:'#94a3b8',fontSize:'0.85rem' }}>{user.email}</span></td>
                  <td style={s.td}><span style={{ ...s.roleBadge, background:user.role==='admin'?'#312e81':'#1e3a5f', color:user.role==='admin'?'#a5b4fc':'#7dd3fc' }}>{user.role==='admin'?'👑':' 👤'} {user.role}</span></td>
                  <td style={s.td}><span style={{ padding:'0.25rem 0.6rem',borderRadius:'20px',fontSize:'0.8rem', background:user.is_active?'#14532d':'#7f1d1d', color:user.is_active?'#86efac':'#fca5a5' }}>{user.is_active?'● Active':'● Inactive'}</span></td>
                  <td style={s.td}><span style={{ color:'#64748b',fontSize:'0.8rem' }}>{new Date(user.created_at).toLocaleDateString()}</span></td>
                  <td style={s.td}><div style={{ display:'flex',gap:'0.5rem' }}>
                    <button onClick={() => toggleRole(user)} style={s.roleBtn}>{user.role==='admin'?'Demote':'Promote'}</button>
                    <button onClick={() => toggleActive(user)} style={user.is_active?s.deactivateBtn:s.activateBtn}>{user.is_active?'Deactivate':'Activate'}</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page:{ minHeight:'100vh',background:'#0f172a' },
  nav:{ background:'#1e293b',padding:'0 2rem',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #334155' },
  logo:{ color:'#6366f1',fontWeight:700,fontSize:'1.05rem' },
  backBtn:{ background:'transparent',color:'#94a3b8',border:'1px solid #334155',borderRadius:'6px',padding:'0.4rem 0.8rem',cursor:'pointer',fontSize:'0.85rem' },
  content:{ maxWidth:'1000px',margin:'0 auto',padding:'2rem 1rem' },
  h1:{ color:'#f1f5f9',margin:'0 0 0.25rem',fontSize:'1.75rem' },
  sub:{ color:'#64748b',margin:'0 0 1.5rem',fontSize:'0.9rem' },
  errorBanner:{ background:'#7f1d1d',color:'#fca5a5',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'1rem' },
  successBanner:{ background:'#14532d',color:'#86efac',padding:'0.75rem 1rem',borderRadius:'8px',marginBottom:'1rem' },
  tableWrap:{ overflowX:'auto',borderRadius:'10px',border:'1px solid #334155' },
  table:{ width:'100%',borderCollapse:'collapse',background:'#1e293b' },
  th:{ padding:'0.85rem 1rem',textAlign:'left',color:'#64748b',fontSize:'0.8rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #334155' },
  tr:{ borderBottom:'1px solid #0f172a' },
  td:{ padding:'0.85rem 1rem' },
  roleBadge:{ padding:'0.25rem 0.6rem',borderRadius:'20px',fontSize:'0.8rem',fontWeight:600 },
  roleBtn:{ background:'#1d4ed8',color:'#93c5fd',border:'none',borderRadius:'5px',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.8rem' },
  deactivateBtn:{ background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:'5px',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.8rem' },
  activateBtn:{ background:'#14532d',color:'#86efac',border:'none',borderRadius:'5px',padding:'0.3rem 0.7rem',cursor:'pointer',fontSize:'0.8rem' },
}
