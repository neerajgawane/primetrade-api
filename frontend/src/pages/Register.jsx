import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setErrors({}); setLoading(true)
    try {
      await register(form.email, form.username, form.password)
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        const mapped = {}
        detail.forEach(d => { const field = d.loc?.[d.loc.length - 1]; mapped[field] = d.msg })
        setErrors(mapped)
      } else { setErrors({ general: detail || 'Registration failed' }) }
    } finally { setLoading(false) }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.logo}>⚡ PrimeTrade</h1>
        <h2 style={s.title}>Create account</h2>
        {errors.general && <div style={s.error}>{errors.general}</div>}
        <form onSubmit={submit}>
          {[{ name:'email',type:'email',label:'Email',placeholder:'you@example.com' }, { name:'username',type:'text',label:'Username',placeholder:'yourname' }, { name:'password',type:'password',label:'Password',placeholder:'Min 8 chars, 1 uppercase, 1 number' }].map(({ name, type, label, placeholder }) => (
            <div key={name}>
              <label style={s.label}>{label}</label>
              <input name={name} type={type} value={form[name]} onChange={handle} required style={{ ...s.input, borderColor: errors[name] ? '#ef4444' : '#334155' }} placeholder={placeholder} />
              {errors[name] && <p style={{ color:'#f87171',fontSize:'0.8rem',margin:'0.25rem 0 0' }}>{errors[name]}</p>}
            </div>
          ))}
          <button type="submit" disabled={loading} style={s.btn}>{loading ? 'Creating...' : 'Create account'}</button>
        </form>
        <p style={s.link}>Have an account? <Link to="/login" style={s.a}>Sign in</Link></p>
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' },
  card: { background: '#1e293b', padding: '2.5rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
  logo: { color: '#6366f1', margin: '0 0 1rem', fontSize: '1.5rem' },
  title: { color: '#f1f5f9', margin: '0 0 1.5rem', fontSize: '1.5rem' },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', marginTop: '1rem' },
  input: { width: '100%', padding: '0.65rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.95rem', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '0.75rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', marginTop: '1.25rem' },
  error: { background: '#7f1d1d', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  link: { textAlign: 'center', color: '#94a3b8', marginTop: '1.25rem', fontSize: '0.9rem' },
  a: { color: '#6366f1' },
}
