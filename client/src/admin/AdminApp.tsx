import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authLink, dashboardUrl, supabase, supabaseConfigured } from '../supabase'
import Dashboard from './Dashboard'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

type AdminStatus = 'checking' | 'allowed' | 'forbidden' | 'error'
type PasswordMode = 'invite' | 'recovery'

export default function AdminApp() {
  // undefined = still restoring the saved session
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // Result of the admin check, tagged with the email it was run for.
  const [adminCheck, setAdminCheck] = useState<{ email: string; status: AdminStatus } | null>(null)
  // Arriving from an invite or reset email: ask for a password before showing the dashboard.
  const [passwordMode, setPasswordMode] = useState<PasswordMode | null>(
    authLink.type === 'invite' ? 'invite' : authLink.type === 'recovery' ? 'recovery' : null,
  )

  useEffect(() => {
    if (!supabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setPasswordMode('recovery')
      if (event === 'SIGNED_OUT') setPasswordMode(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const email = session?.user.email
  const adminStatus: AdminStatus = adminCheck && adminCheck.email === email ? adminCheck.status : 'checking'

  useEffect(() => {
    if (!email) return
    let cancelled = false
    // RLS only lets a user read their own row in admins, so a row back means they're allowed.
    supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setAdminCheck({ email, status: error ? 'error' : data ? 'allowed' : 'forbidden' })
      })
    return () => {
      cancelled = true
    }
  }, [email])

  async function signOut() {
    await supabase.auth.signOut()
  }

  let body
  if (!supabaseConfigured) {
    body = (
      <Card title="Dashboard not configured">
        <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the client, then rebuild.</p>
      </Card>
    )
  } else if (session === undefined || (session && !passwordMode && adminStatus === 'checking')) {
    body = <p className="admin-muted admin-center">Loading…</p>
  } else if (!session) {
    body = <LoginForm />
  } else if (passwordMode) {
    body = <SetPasswordForm mode={passwordMode} onDone={() => setPasswordMode(null)} />
  } else if (adminStatus === 'allowed') {
    body = <Dashboard />
  } else {
    body = (
      <Card title={adminStatus === 'error' ? 'Something went wrong' : 'Not authorized'}>
        <p>
          {adminStatus === 'error'
            ? 'We could not verify your access. Please refresh and try again.'
            : `${email} is signed in but does not have access to this dashboard.`}
        </p>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </Card>
    )
  }

  return (
    <div className="admin">
      <header className="admin-topbar">
        <div className="brand">
          <img src={assetUrl('images/cau-seal.svg')} alt="Clark Atlanta University seal" className="seal admin-seal" />
          <div>
            <div className="admin-title">Responses Dashboard</div>
            <div className="admin-muted">First Year / Second Year Mentorship Initiative</div>
          </div>
        </div>
        {session && (
          <div className="admin-user">
            <span className="admin-muted">
              Signed in as <strong>{email}</strong>
            </span>
            <button type="button" className="btn-secondary" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="admin-main">{body}</main>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-card">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // An expired or already-used invite/reset link comes back with an error in the URL.
  const [error, setError] = useState(
    authLink.error ? `${authLink.error}. Use "Forgot your password?" to get a new link.` : '',
  )
  const [notice, setNotice] = useState('')

  function switchMode(next: 'signin' | 'forgot') {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)
    if (!error) return
    if (/invalid login/i.test(error.message)) setError('Email or password is incorrect.')
    else if (/rate/i.test(error.message)) setError('Too many attempts. Please wait a minute and try again.')
    else setError(`Sign-in failed: ${error.message}`)
  }

  async function handleForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: dashboardUrl })
    setSubmitting(false)
    if (error && /rate|seconds/i.test(error.message)) {
      setError('Too many reset requests. Please wait a few minutes and try again.')
    } else if (error) {
      setError(`Could not send the reset email: ${error.message}`)
    } else {
      // Same message whether or not the account exists, so the form doesn't reveal who has access.
      setNotice('If that email has dashboard access, a reset link is on its way. Check your inbox (and spam).')
    }
  }

  const emailField = (
    <label>
      Email
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>
  )
  const messages = (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </>
  )

  if (mode === 'forgot') {
    return (
      <Card title="Reset your password">
        <p className="admin-muted">Enter your email and we'll send you a link to choose a new password.</p>
        <form onSubmit={handleForgot}>
          {emailField}
          {messages}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <button type="button" className="link-btn" onClick={() => switchMode('signin')}>
          Back to sign in
        </button>
      </Card>
    )
  }

  return (
    <Card title="Sign in">
      <p className="admin-muted">Access is limited to the initiative's organizers.</p>
      <form onSubmit={handleSignIn}>
        {emailField}
        <label>
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {messages}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>
        Forgot your password?
      </button>
    </Card>
  )
}

const MIN_PASSWORD_LENGTH = 8

function SetPasswordForm({ mode, onDone }: { mode: PasswordMode; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) setError(`Could not save your password: ${error.message}`)
    else onDone()
  }

  return (
    <Card title={mode === 'invite' ? 'Welcome! Choose a password' : 'Choose a new password'}>
      <p className="admin-muted">
        {mode === 'invite'
          ? "You'll use this password with your email to sign in to the dashboard from now on."
          : 'Enter a new password for your account.'}
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          New password
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </Card>
  )
}
