import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

const LEGAL_LINKS = [['/privacy', 'Privacy'], ['/terms', 'Terms'], ['/support', 'Help']]

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="label" style={{ marginBottom: 4 }}>{title}</h2>
      <div style={{ borderBottom: '1px solid var(--hairline)' }}>{children}</div>
    </section>
  )
}

function Row({ label, sub, children, htmlFor }) {
  const Label = htmlFor ? 'label' : 'div'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px 24px', padding: '16px 0', borderTop: '1px solid var(--hairline)' }}>
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <Label htmlFor={htmlFor} style={{ display: 'block', fontSize: 14 }}>{label}</Label>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, maxWidth: '100%' }}>{children}</div>}
    </div>
  )
}

export default function Settings() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const displayName = profile?.name || profile?.username || ''
  const [name, setName] = useState(displayName)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetText, setResetText] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteText, setDeleteText]           = useState('')
  const [deleteLoading, setDeleteLoading]     = useState(false)
  const [deleteError, setDeleteError]         = useState('')

  const nameChanged = name.trim() && name.trim() !== displayName

  async function saveName() {
    const err = await updateProfile({ name: name.trim(), username: name.trim() })
    if (!err) toast('Name updated', 'success')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleReset() {
    if (resetText !== 'RESET') return
    try {
      await Promise.all([
        supabase.from('focus_sessions').delete().eq('user_id', user.id),
        supabase.from('daily_focus_log').delete().eq('user_id', user.id),
        supabase.from('quiz_results').delete().eq('user_id', user.id),
        supabase.from('score_goals').delete().eq('user_id', user.id),
        supabase.from('profiles').update({ streak_count: 0, total_focus_minutes: 0, total_sessions: 0 }).eq('user_id', user.id),
      ])
      toast('Your history was cleared', 'info')
    } catch {
      toast('Could not clear data. Try again.', 'error')
    }
    setResetText('')
    setShowResetModal(false)
  }

  async function handleDeleteAccount() {
    if (deleteText !== 'DELETE') { setDeleteError('Type DELETE to confirm'); return }
    setDeleteLoading(true); setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete account')
      await signOut()
      navigate('/')
    } catch (err) {
      setDeleteError(err.message || 'Something went wrong. Please try again.')
      setDeleteLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <header className="page-head">
        <h1 className="page-title">Settings</h1>
      </header>

      <Section title="Profile">
        <Row label="Name" htmlFor="settings-name">
          <input id="settings-name" type="text" value={name} maxLength={40} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && nameChanged) saveName() }}
            style={{ width: 200, maxWidth: '100%', height: 32, padding: '0 10px', fontSize: 14 }} />
          {nameChanged && <button className="btn btn-accent btn-sm" onClick={saveName}>Save</button>}
        </Row>
        <Row label="Email" sub={user?.email} />
      </Section>

      <Section title="Account">
        <Row label="Sign out">
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
        </Row>
        <Row label="Clear my history" sub="Removes your sessions, quiz results and goals. Your account stays.">
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowResetModal(true); setResetText('') }}>Clear</button>
        </Row>
        <Row label="Delete account" sub="Removes your account and everything in it.">
          <button className="btn btn-danger btn-sm" onClick={() => { setShowDeleteModal(true); setDeleteText(''); setDeleteError('') }}>Delete</button>
        </Row>
      </Section>

      <nav aria-label="Legal" style={{ display: 'flex', gap: 20, fontSize: 12.5 }}>
        {LEGAL_LINKS.map(([to, label]) => (
          <Link key={to} to={to} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{label}</Link>
        ))}
      </nav>

      {showResetModal && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 id="reset-title" style={{ fontSize: 16, marginBottom: 8 }}>Clear your history?</h2>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Your sessions, quiz results, goals and streak go back to zero. This can't be undone.
            </p>
            <label className="label" htmlFor="reset-confirm" style={{ display: 'block', marginBottom: 6 }}>Type RESET to confirm</label>
            <input id="reset-confirm" className="mono" placeholder="RESET" value={resetText} onChange={e => setResetText(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowResetModal(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} disabled={resetText !== 'RESET'} onClick={handleReset}>Clear history</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 id="delete-title" style={{ fontSize: 16, fontWeight: 600 }}>Delete account</h2>
              <button className="btn-quiet" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading} aria-label="Close"><X size={16} strokeWidth={1.6} /></button>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              This permanently deletes your account and all its data: sessions, quiz results, goals and streak. <strong style={{ color: 'var(--text)', fontWeight: 500 }}>This cannot be undone.</strong>
            </p>
            <div style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="delete-confirm" style={{ display: 'block', marginBottom: 6 }}>Type DELETE to confirm</label>
              <input
                id="delete-confirm" type="text" placeholder="DELETE" value={deleteText}
                className="mono"
                onChange={e => setDeleteText(e.target.value)}
                disabled={deleteLoading}
              />
            </div>
            {deleteError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{deleteError}</div>}
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="btn btn-danger btn-full"
              style={{
                justifyContent: 'center',
                background: deleteText === 'DELETE' ? 'var(--red)' : undefined,
                color: deleteText === 'DELETE' ? 'var(--bg)' : undefined,
                opacity: deleteLoading ? 0.7 : 1,
              }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete account and all data'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
