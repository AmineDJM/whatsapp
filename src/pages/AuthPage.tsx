import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

type Mode = 'login' | 'signup' | 'otp'

function maskEmail(e: string) {
  const [u, d] = e.split('@')
  if (!d) return e
  return `${u[0] ?? ''}${'•'.repeat(Math.max(1, u.length - 1))}@${d}`
}

export default function AuthPage() {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState('')
  const [awaitingVerify, setAwaitingVerify] = useState(false)

  async function doSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return toast('Password must be at least 6 characters', 'error')
    if (password !== confirm) return toast('Passwords do not match', 'error')
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) return toast(error.message, 'error')
    if (data.session) { toast('Welcome!', 'success'); return } // confirmation disabled -> logged in
    setAwaitingVerify(true)
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      if (/confirm/i.test(error.message)) {
        setAwaitingVerify(true)
        toast('Please verify your email first', 'error')
      } else toast(error.message, 'error')
      return
    }
    toast('Signed in', 'success')
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return toast('Enter your email', 'error')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) return toast(error.message, 'error')
    setOtpSent(true)
    toast(`We sent a code to ${maskEmail(email)}`, 'success')
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) return toast(error.message, 'error')
    toast('Verified', 'success')
  }

  async function resend() {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    toast(error ? error.message : 'Verification email resent', error ? 'error' : 'success')
  }

  if (awaitingVerify) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-wa-text">Verify your email</h1>
        <p className="text-sm text-wa-sub">We sent a confirmation link to <b>{maskEmail(email)}</b>. Click it, then come back and sign in.</p>
        <button onClick={resend} className="btn-ghost">Resend email</button>
        <button onClick={() => { setAwaitingVerify(false); setMode('login') }} className="btn-primary">Back to sign in</button>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex gap-1 bg-wa-header rounded-lg p-1 text-sm font-medium">
        <Tab active={mode==='login'} onClick={() => setMode('login')}>Sign in</Tab>
        <Tab active={mode==='signup'} onClick={() => setMode('signup')}>Sign up</Tab>
        <Tab active={mode==='otp'} onClick={() => setMode('otp')}>Email code</Tab>
      </div>

      {mode === 'login' && (
        <form onSubmit={doLogin} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={setEmail} autoFocus />
          <Input type="password" placeholder="Password" value={password} onChange={setPassword} />
          <button disabled={busy} className="btn-primary">{busy ? '…' : 'Sign in'}</button>
        </form>
      )}

      {mode === 'signup' && (
        <form onSubmit={doSignup} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={setEmail} autoFocus />
          <Input type="password" placeholder="Password" value={password} onChange={setPassword} />
          <Input type="password" placeholder="Confirm password" value={confirm} onChange={setConfirm} />
          <button disabled={busy} className="btn-primary">{busy ? '…' : 'Create account'}</button>
        </form>
      )}

      {mode === 'otp' && (
        !otpSent ? (
          <form onSubmit={sendOtp} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={setEmail} autoFocus />
            <button disabled={busy} className="btn-primary">{busy ? '…' : 'Send code'}</button>
            <p className="text-xs text-wa-sub text-center">A 6-digit code will be emailed to you.</p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-3">
            <p className="text-sm text-wa-sub">We sent a code to <b>{maskEmail(email)}</b></p>
            <Input type="text" placeholder="Enter 6-digit code" value={code} onChange={setCode} autoFocus />
            <button disabled={busy} className="btn-primary">{busy ? '…' : 'Verify & continue'}</button>
            <button type="button" onClick={() => setOtpSent(false)} className="btn-ghost">Use a different email</button>
          </form>
        )
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full bg-wa-bg flex flex-col">
      <div className="h-28 bg-wa-teal" />
      <div className="flex-1 -mt-16 px-4 pb-8 flex justify-center">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className="w-9 h-9 rounded-full bg-wa-green flex items-center justify-center text-white text-lg">✆</div>
            <span className="text-lg font-semibold text-wa-teal">WhatsApp</span>
          </div>
          {children}
        </div>
      </div>
      <style>{`
        .btn-primary{width:100%;background:#25D366;color:#fff;font-weight:600;padding:.6rem;border-radius:.6rem}
        .btn-primary:disabled{opacity:.6}
        .btn-ghost{width:100%;color:#075E54;font-weight:600;padding:.5rem;border-radius:.6rem}
      `}</style>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-1.5 rounded-md transition ${active ? 'bg-white text-wa-teal shadow-sm' : 'text-wa-sub'}`}>
      {children}
    </button>
  )
}

function Input({ type, placeholder, value, onChange, autoFocus }:
  { type: string; placeholder: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input type={type} placeholder={placeholder} value={value} autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg border border-wa-divider focus:border-wa-green outline-none text-wa-text" />
  )
}
