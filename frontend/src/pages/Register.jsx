import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 2) return { label: 'Weak', color: '#f87171', pct: 33 }
  if (score <= 3) return { label: 'Medium', color: '#fbbf24', pct: 66 }
  return { label: 'Strong', color: '#34d399', pct: 100 }
}

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { register, googleLogin } = useAuth()
  const navigate = useNavigate()

  const strength = form.password ? getStrength(form.password) : null

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.email, form.username, form.password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) setError(detail.map(d => d.msg).join('. '))
      else setError(detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleGoogleSignup = () => {
    setError('')
    setGLoading(true)
    try {
      const google = window.google
      if (!google) { setError('Google SDK failed to load.'); setGLoading(false); return }
      google.accounts.id.initialize({
        client_id: window.__GOOGLE_CLIENT_ID__ || '411510098498-example.apps.googleusercontent.com',
        callback: async (response) => {
          try {
            await googleLogin(response.credential)
            navigate('/dashboard')
          } catch (err) { setError(err.response?.data?.detail || 'Google sign-up failed') }
          finally { setGLoading(false) }
        },
      })
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          google.accounts.id.renderButton(
            document.getElementById('google-signup-container'),
            { theme: 'filled_black', size: 'large', width: '100%', text: 'signup_with' }
          )
          setGLoading(false)
        }
      })
    } catch { setError('Google sign-up unavailable'); setGLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.bgGlow} />
      <div style={s.bgGlow2} />

      <div style={s.container}>
        <div style={s.logoSection}>
          <div style={s.logoMark}>P</div>
          <span style={s.logoText}>PrimePay</span>
        </div>

        <div style={s.card}>
          <h1 style={s.title}>Create your account</h1>
          <p style={s.subtitle}>Start managing your freelance billing in minutes</p>

          {error && <div style={s.error}><span style={{ fontWeight: 700 }}>✕</span> {error}</div>}
          {success && <div style={s.successBanner}>✓ Account created! Redirecting to login...</div>}

          {/* Google Sign-Up */}
          <button onClick={handleGoogleSignup} disabled={gLoading} style={s.googleBtn}>
            {gLoading ? <span style={s.spinner} /> : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Sign up with Google
          </button>
          <div id="google-signup-container" />

          <div style={s.divider}>
            <span style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <span style={s.dividerLine} />
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="john_doe" required style={s.input} />
              <span style={s.hint}>Letters, numbers, and underscores only</span>
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <div style={s.pwWrap}>
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars, 1 uppercase, 1 number" required style={{ ...s.input, paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={s.eyeBtn} tabIndex={-1}>
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {strength && (
                <div style={s.strengthWrap}>
                  <div style={s.strengthTrack}>
                    <div style={{ ...s.strengthBar, width: `${strength.pct}%`, background: strength.color }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading || success} style={s.button}>
              {loading ? <span style={s.spinner} /> : 'Create account'}
            </button>
          </form>

          <p style={s.footer}>
            Already have an account? <Link to="/login" style={s.link}>Sign in</Link>
          </p>
        </div>

        <p style={s.credit}>Built for freelancers who value their time</p>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' },
  bgGlow: { position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', top: '-100px', right: '-100px', pointerEvents: 'none' },
  bgGlow2: { position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', bottom: '-100px', left: '-100px', pointerEvents: 'none' },
  container: { width: '100%', maxWidth: '400px', padding: '2rem', zIndex: 1 },

  logoSection: { display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem' },
  logoMark: { width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' },
  logoText: { fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' },

  card: { background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '2.5rem', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-lg)', animation: 'scaleIn 0.3s ease' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 },
  subtitle: { color: 'var(--text-tertiary)', fontSize: '0.88rem', marginTop: '0.35rem', marginBottom: '1.5rem' },

  error: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.7rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 500, marginBottom: '1rem', border: '1px solid rgba(248,113,113,0.15)' },
  successBanner: { background: 'var(--success-bg)', color: 'var(--success)', padding: '0.7rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem', border: '1px solid rgba(52,211,153,0.15)' },

  googleBtn: { width: '100%', padding: '0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'var(--transition-fast)', minHeight: '44px' },

  divider: { display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' },
  dividerLine: { flex: 1, height: '1px', background: 'var(--border-primary)' },
  dividerText: { fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' },

  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' },
  hint: { fontSize: '0.72rem', color: 'var(--text-tertiary)' },
  input: { width: '100%', padding: '0.7rem 0.85rem', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem', transition: 'var(--transition-fast)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },

  pwWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex' },

  strengthWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' },
  strengthTrack: { flex: 1, height: '3px', background: 'var(--border-primary)', borderRadius: '2px', overflow: 'hidden' },
  strengthBar: { height: '100%', borderRadius: '2px', transition: 'width 0.3s ease, background 0.3s ease' },

  button: { marginTop: '0.25rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)', boxShadow: '0 2px 10px rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', fontFamily: 'inherit' },
  spinner: { width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' },

  footer: { textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '1.5rem' },
  link: { color: 'var(--text-accent)', fontWeight: 600, textDecoration: 'none' },
  credit: { textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '2rem', opacity: 0.5 },
}
