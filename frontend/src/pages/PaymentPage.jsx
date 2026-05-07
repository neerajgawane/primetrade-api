import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { invoiceService, paymentService } from '../services/api'

function formatPaise(p) { return p ? `₹${(p / 100).toLocaleString('en-IN')}` : '₹0' }

export default function PaymentPage() {
  const { invoiceId } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    invoiceService.getPublic(invoiceId)
      .then(r => setInvoice(r.data.data))
      .catch(() => setError('Invoice not found or is no longer available'))
      .finally(() => setLoading(false))
  }, [invoiceId])

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await paymentService.createOrder(invoiceId)
      const order = res.data.data
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'PrimePay',
        description: `Payment for ${order.invoice_number}`,
        order_id: order.order_id,
        prefill: { name: order.client_name || '', email: order.client_email || '', contact: order.client_phone || '' },
        theme: { color: '#6366f1', backdrop_color: '#0a0e1a' },
        handler: () => { setSuccess(true); setPaying(false) },
        modal: { ondismiss: () => setPaying(false) },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate payment')
      setPaying(false)
    }
  }

  if (loading) return (
    <div style={s.page}><div style={s.bgGlow} /><div style={s.center}>
      <div style={s.spinnerLg} />
      <p style={{ color: 'var(--text-tertiary)', marginTop: '1rem' }}>Loading invoice...</p>
    </div></div>
  )

  if (error && !invoice) return (
    <div style={s.page}><div style={s.bgGlow} /><div style={s.center}>
      <div style={s.errorIcon}>!</div>
      <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '1.1rem' }}>{error}</p>
    </div></div>
  )

  if (success) return (
    <div style={s.page}><div style={s.bgGlowSuccess} /><div style={s.center}>
      <div style={s.successIcon}>✓</div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', margin: '1rem 0 0.5rem' }}>Payment Successful!</h2>
      <p style={{ color: 'var(--text-tertiary)', maxWidth: '340px', textAlign: 'center' }}>Thank you for your payment. A confirmation has been sent to your email.</p>
    </div></div>
  )

  return (
    <div style={s.page}>
      <div style={s.bgGlow} />
      <div style={s.bgGlow2} />

      <div style={s.container}>
        {/* Header */}
        <div style={s.brandBar}>
          <div style={s.logoMark}>P</div>
          <span style={s.logoText}>PrimePay</span>
        </div>

        {/* Invoice Card */}
        <div style={s.invoiceCard}>
          {/* Invoice Header */}
          <div style={s.invHeader}>
            <div>
              <span style={s.invLabel}>INVOICE</span>
              <h1 style={s.invNumber}>{invoice.invoice_number}</h1>
            </div>
            <div style={s.invStatus}>
              <span style={s.statusDot} />
              {invoice.status === 'paid' ? 'Paid' : 'Payment Due'}
            </div>
          </div>

          <div style={s.divider} />

          {/* Details Grid */}
          <div style={s.detailsGrid}>
            <div style={s.detailBox}>
              <span style={s.detailLabel}>From</span>
              <span style={s.detailValue}>{invoice.freelancer_name}</span>
            </div>
            <div style={s.detailBox}>
              <span style={s.detailLabel}>Bill To</span>
              <span style={s.detailValue}>{invoice.client_name || '—'}</span>
            </div>
            <div style={s.detailBox}>
              <span style={s.detailLabel}>Date Issued</span>
              <span style={s.detailValue}>{new Date(invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
            <div style={s.detailBox}>
              <span style={s.detailLabel}>Status</span>
              <span style={{ ...s.detailValue, color: invoice.status === 'paid' ? '#34d399' : '#fbbf24' }}>
                {invoice.status === 'paid' ? '● Paid' : '○ Pending'}
              </span>
            </div>
          </div>

          <div style={s.divider} />

          {/* Line Item */}
          <div style={s.lineItemHeader}>
            <span style={s.lineLabel}>Description</span>
            <span style={s.lineLabel}>Amount</span>
          </div>
          <div style={s.lineItem}>
            <div>
              <span style={s.lineTitle}>{invoice.task_title || 'Professional Services'}</span>
              <span style={s.lineDesc}>Freelance work completed</span>
            </div>
            <span style={s.lineAmount}>{formatPaise(invoice.amount)}</span>
          </div>

          <div style={s.divider} />

          {/* Total */}
          <div style={s.totalRow}>
            <span style={s.totalLabel}>Total Due</span>
            <span style={s.totalAmount}>{formatPaise(invoice.amount)}</span>
          </div>

          {/* Pay Button */}
          {invoice.status !== 'paid' && (
            <button onClick={handlePay} disabled={paying} style={s.payBtn}>
              {paying ? (
                <><span style={s.spinner} /> Processing...</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  Pay {formatPaise(invoice.amount)}
                </>
              )}
            </button>
          )}

          {invoice.status === 'paid' && invoice.paid_at && (
            <div style={s.paidBanner}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Paid on {new Date(invoice.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <span>Secured by</span>
          <strong style={{ color: 'var(--text-accent)' }}>Razorpay</strong>
          <span>•</span>
          <span>Powered by PrimePay</span>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '2rem' },
  bgGlow: { position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', top: '-150px', right: '-150px', pointerEvents: 'none' },
  bgGlow2: { position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', bottom: '-100px', left: '-100px', pointerEvents: 'none' },
  bgGlowSuccess: { position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', top: '-150px', right: '-150px', pointerEvents: 'none' },

  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 },
  spinnerLg: { width: '36px', height: '36px', border: '3px solid var(--border-primary)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  errorIcon: { width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-bg)', border: '2px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' },
  successIcon: { width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '2px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontWeight: 800, fontSize: '2rem', animation: 'scaleIn 0.3s ease' },

  container: { width: '100%', maxWidth: '500px', zIndex: 1 },

  brandBar: { display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', marginBottom: '1.5rem' },
  logoMark: { width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem' },
  logoText: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' },

  invoiceCard: { background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '2rem', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-lg)', animation: 'scaleIn 0.3s ease' },

  invHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  invLabel: { fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em' },
  invNumber: { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.15rem 0 0', fontFamily: 'monospace', letterSpacing: '0.02em' },
  invStatus: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24', background: 'rgba(251,191,36,0.08)', padding: '0.3rem 0.7rem', borderRadius: '20px', border: '1px solid rgba(251,191,36,0.15)' },
  statusDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' },

  divider: { height: '1px', background: 'var(--border-primary)', margin: '1.25rem 0' },

  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  detailBox: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  detailLabel: { fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  detailValue: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' },

  lineItemHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' },
  lineLabel: { fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  lineItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' },
  lineTitle: { display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' },
  lineDesc: { display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' },
  lineAmount: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' },

  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' },
  totalLabel: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' },
  totalAmount: { fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '-0.02em' },

  payBtn: { width: '100%', marginTop: '1.25rem', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontFamily: 'inherit', transition: 'var(--transition-fast)' },
  spinner: { width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' },

  paidBanner: { display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center', marginTop: '1.25rem', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', color: '#34d399', fontWeight: 600, fontSize: '0.9rem' },

  footer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' },
}
