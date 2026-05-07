import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { path: '/dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: 'Dashboard' },
  { path: '/clients', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: 'Clients' },
  { path: '/tasks', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, label: 'Tasks' },
  { path: '/invoices', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, label: 'Invoices' },
]

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={s.container}>
      <aside style={s.sidebar}>
        {/* Logo */}
        <div style={s.logoSection}>
          <div style={s.logoMark}>P</div>
          <div style={s.logoTextWrap}>
            <span style={s.logoText}>PrimePay</span>
            <span style={s.logoTag}>Freelancer Suite</span>
          </div>
        </div>

        {/* Navigation */}
        <div style={s.navSection}>
          <span style={s.navLabel}>MAIN MENU</span>
          <nav style={s.nav}>
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  ...s.navItem,
                  ...(isActive ? s.navItemActive : {}),
                })}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {item.path === '/tasks' && <span style={s.navBadge} />}
              </NavLink>
            ))}
          </nav>
        </div>

        {isAdmin && (
          <div style={{ ...s.navSection, borderTop: '1px solid var(--border-primary)', paddingTop: '1rem' }}>
            <span style={s.navLabel}>ADMIN</span>
            <nav style={s.nav}>
              <NavLink to="/admin" style={({ isActive }) => ({ ...s.navItem, ...(isActive ? s.navItemActive : {}) })}>
                <span style={s.navIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </span>
                <span>Settings</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* User Profile */}
        <div style={s.sidebarFooter}>
          <div style={s.userCard}>
            <div style={s.avatar}>
              <span>{user?.username?.[0]?.toUpperCase() || '?'}</span>
            </div>
            <div style={s.userMeta}>
              <span style={s.username}>{user?.username}</span>
              <span style={s.role}>{user?.role === 'admin' ? '⭐ Admin' : 'Free plan'}</span>
            </div>
            <button onClick={handleLogout} style={s.logoutIcon} title="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <main style={s.main}>
        <div style={s.mainInner}>{children}</div>
      </main>
    </div>
  )
}

const s = {
  container: { display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' },

  sidebar: {
    width: 'var(--sidebar-width)', background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-primary)',
    display: 'flex', flexDirection: 'column', position: 'fixed',
    top: 0, left: 0, bottom: 0, zIndex: 50,
    backdropFilter: 'blur(20px)',
  },

  logoSection: {
    padding: '1.5rem 1.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
  },
  logoMark: {
    width: '34px', height: '34px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: '1rem',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  logoTextWrap: { display: 'flex', flexDirection: 'column' },
  logoText: { fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  logoTag: { fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.02em' },

  navSection: { flex: 0, padding: '0.5rem 1rem' },
  navLabel: {
    display: 'block', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)',
    letterSpacing: '0.08em', padding: '0.5rem 0.75rem 0.5rem', textTransform: 'uppercase',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.88rem',
    fontWeight: 500, transition: 'var(--transition-fast)', cursor: 'pointer', textDecoration: 'none',
    position: 'relative',
  },
  navItemActive: {
    background: 'var(--accent-subtle)', color: 'var(--text-accent)',
    fontWeight: 600,
  },
  navIcon: { width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  navBadge: {
    width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)',
    marginLeft: 'auto', boxShadow: '0 0 6px rgba(52, 211, 153, 0.4)',
  },

  sidebarFooter: {
    marginTop: 'auto', padding: '1rem 1rem 1.25rem',
    borderTop: '1px solid var(--border-primary)',
  },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.6rem 0.65rem', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
  },
  avatar: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
  },
  userMeta: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
  username: {
    color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  role: { color: 'var(--text-tertiary)', fontSize: '0.7rem' },
  logoutIcon: {
    background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
    cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex',
    transition: 'var(--transition-fast)', flexShrink: 0,
  },

  main: {
    flex: 1, marginLeft: 'var(--sidebar-width)', minHeight: '100vh',
    background: 'var(--bg-primary)',
  },
  mainInner: { padding: '2rem 2.5rem', maxWidth: '1200px' },
}
