import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(form.email, form.password); navigate('/dashboard') }
    catch (err) { setError(err.response?.data?.detail || 'Login failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.logo}>⚡ PrimeTrade</h1>
        <h2 style={s.title}>Welcome back</h2>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={submit}>
          <label style={s.label}>Email</label>
          <input name="email" type="email" value={form.email} onChange={handle} required style={s.input} placeholder="you@example.com" />
          <label style={s.label}>Password</label>
          <input name="password" type="password" value={form.password} onChange={handle} required style={s.input} placeholder="••••••••" />
          <button type="submit" disabled={loading} style={s.btn}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p style={s.link}>No account? <Link to="/register" style={s.a}>Create one</Link></p>
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
