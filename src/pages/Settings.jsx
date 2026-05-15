import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

const ACCENT_COLORS = [
  { name: 'Lime',   value: '#b5f23a' },
  { name: 'Cyan',   value: '#60d3f8' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Amber',  value: '#ffb340' },
  { name: 'Red',    value: '#ff4d4d' },
]

const CITATIONS = [
  { ref: 'Pew Research Center, April 2025 (N=1,391 U.S. teens)', note: 'Teen social media and attention study' },
  { ref: 'Nivins et al., Pediatrics Open Science, Dec 2025', note: 'Screen time and cognitive outcomes in adolescents' },
  { ref: 'Dunlosky et al., Psychological Science in the Public Interest, 2013', note: 'Improving students\' learning with effective study techniques' },
  { ref: 'Kornell et al., Frontiers in Education, 2021', note: 'Retrieval practice confirmed across 242 studies and 169,179 participants' },
  { ref: 'Xu et al., Journal of Affective Disorders, 2024', note: 'Social media use and academic performance in adolescents' },
  { ref: 'Ariga & Lleras, Cognition, 2011', note: 'Brief and rare mental "breaks" keep you focused' },
  { ref: 'Gollwitzer, American Psychologist, 1999', note: 'Implementation intentions: strong effects of simple plans' },
]

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="label" style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, sub, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div>{right}</div>
    </div>
  )
}

export default function Settings() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const displayName = profile?.name || profile?.username || ''
  const [name, setName] = useState(displayName)
  const [focusMins, setFocusMins] = useState(profile?.focus_duration ?? profile?.baseline_attention_span ?? 25)
  const [breakMins, setBreakMins] = useState(profile?.break_duration ?? 5)
  const [autoBreak, setAutoBreak] = useState(profile?.auto_start_break ?? false)
  const [sound, setSound] = useState(profile?.sound_enabled ?? true)
  const [accent, setAccent] = useState(profile?.accent_color || localStorage.getItem('focusos_accent') || '#b5f23a')
  const [resetText, setResetText] = useState('')
  const [showCitations, setShowCitations] = useState(false)
  const [stats, setStats] = useState({ sessions: 0, mins: 0, goals: 0 })
  const [aiModelPref, setAiModelPref] = useState(profile?.ai_model_preference || 'auto')
  const [ollamaStatus, setOllamaStatus] = useState(null) // null=pending, 'running', 'offline'
  const [ollamaChecking, setOllamaChecking] = useState(false)

  const [copiedCmd, setCopiedCmd] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteText, setDeleteText]           = useState('')
  const [deleteLoading, setDeleteLoading]     = useState(false)
  const [deleteError, setDeleteError]         = useState('')

  useEffect(() => { loadStats(); checkOllama() }, [user])
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--lime', accent)
  }, [accent])
  useEffect(() => {
    if (profile?.ai_model_preference) setAiModelPref(profile.ai_model_preference)
  }, [profile])

  async function checkOllama() {
    // localhost:11434 is only reachable from http:// origins (dev).
    // In production (https) browsers block mixed-content requests, so Ollama
    // will always appear offline — that's expected and handled gracefully.
    if (location.protocol === 'https:') { setOllamaStatus('offline'); return }
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
      setOllamaStatus(res.ok ? 'running' : 'offline')
    } catch {
      setOllamaStatus('offline')
    }
  }

  function copyCmd(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCmd(text)
      setTimeout(() => setCopiedCmd(null), 1800)
    })
  }

  async function recheckOllama() {
    setOllamaChecking(true)
    if (location.protocol === 'https:') { setOllamaStatus('offline'); setOllamaChecking(false); return }
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
      setOllamaStatus(res.ok ? 'running' : 'offline')
    } catch {
      setOllamaStatus('offline')
    }
    setOllamaChecking(false)
  }

  async function saveAiModelPref(pref) {
    setAiModelPref(pref)
    const err = await updateProfile({ ai_model_preference: pref })
    if (!err) toast('AI model preference saved!', 'success')
  }

  async function loadStats() {
    if (!user) return
    const [sessRes, goalRes] = await Promise.all([
      supabase.from('focus_sessions').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('score_goals').select('id', { count: 'exact' }).eq('user_id', user.id),
    ])
    setStats({ sessions: sessRes.count || 0, mins: profile?.total_focus_minutes || 0, goals: goalRes.count || 0 })
  }

  async function saveName() {
    const err = await updateProfile({ name, username: name })
    if (!err) toast('Name updated!', 'success')
  }

  async function savePreferences() {
    const err = await updateProfile({ focus_duration: focusMins, break_duration: breakMins, auto_start_break: autoBreak, sound_enabled: sound })
    if (!err) toast('Preferences saved!', 'success')
  }

  async function applyAccent(color) {
    setAccent(color)
    document.documentElement.style.setProperty('--accent', color)
    document.documentElement.style.setProperty('--lime', color)
    localStorage.setItem('focusos_accent', color)
    await updateProfile({ accent_color: color })
    toast('Accent color updated!', 'success')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleReset() {
    if (resetText !== 'RESET') { toast('Type RESET to confirm', 'error'); return }
    await Promise.all([
      supabase.from('focus_sessions').delete().eq('user_id', user.id),
      supabase.from('daily_focus_log').delete().eq('user_id', user.id),
      supabase.from('quiz_results').delete().eq('user_id', user.id),
      supabase.from('score_goals').delete().eq('user_id', user.id),
      supabase.from('profiles').update({ streak_count: 0, total_focus_minutes: 0, total_sessions: 0 }).eq('user_id', user.id),
    ])
    toast('All data reset.', 'info')
    setResetText('')
    loadStats()
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

  const initials = (displayName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'
  const focusPct = ((focusMins - 5) / (90 - 5)) * 100
  const breakPct = ((breakMins - 1) / (30 - 1)) * 100

  return (
    <div className="page-fade" style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', width: '100%' }}>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Settings</h1>

      <div className="card card-top" style={{ marginBottom: 16 }}>
        <Section title="Account">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(181,242,58,0.15)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{displayName || 'User'}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.email}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Member since {memberSince}</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Display Name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={saveName}>Save</button>
            </div>
          </div>
          <div style={{ marginBottom: 4 }}>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          </div>
          <button className="btn btn-full" onClick={handleSignOut}
            style={{ marginTop: 16, background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(242,90,90,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>Sign Out</button>
        </Section>
      </div>

      <div className="card card-top" style={{ marginBottom: 16 }}>
        <Section title="Focus Preferences">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label">Default Session</label>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{focusMins} min</span>
              </div>
              <input type="range" min={5} max={90} step={1} value={focusMins}
                onChange={e => setFocusMins(Number(e.target.value))}
                style={{
                  width: '100%', height: '4px', borderRadius: '2px',
                  appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: 'pointer',
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${focusPct}%, #222226 ${focusPct}%, #222226 100%)`,
                }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label">Default Break</label>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{breakMins} min</span>
              </div>
              <input type="range" min={1} max={30} step={1} value={breakMins}
                onChange={e => setBreakMins(Number(e.target.value))}
                style={{
                  width: '100%', height: '4px', borderRadius: '2px',
                  appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: 'pointer',
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${breakPct}%, #222226 ${breakPct}%, #222226 100%)`,
                }} />
            </div>
          </div>
          <Row label="Auto-start break" sub="Automatically start break when session ends"
            right={<label className="toggle"><input type="checkbox" checked={autoBreak} onChange={e => setAutoBreak(e.target.checked)} /><span className="toggle-slider" /></label>}
          />
          <Row label="Sound alerts" sub="Play a sound when timer completes"
            right={<label className="toggle"><input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} /><span className="toggle-slider" /></label>}
          />
          <button className="btn btn-accent btn-full" onClick={savePreferences} style={{ marginTop: 16 }}>Save Preferences</button>
        </Section>
      </div>

      <div className="card card-top" style={{ marginBottom: 16 }}>
        <Section title="AI Preferences">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>AI Model</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Choose how your quizzes and notes are generated</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                {
                  key: 'auto',
                  icon: '🤖',
                  title: 'Auto (recommended)',
                  desc: 'Uses Claude for best quality (5/day free), switches to Llama when limit reached',
                  badge: null,
                },
                {
                  key: 'claude',
                  icon: '✨',
                  title: 'Claude Always',
                  desc: 'Always use Claude Sonnet for highest accuracy',
                  badge: '5 free per day',
                },
                {
                  key: 'ollama',
                  icon: '🦙',
                  title: 'Llama 3.1 (Free)',
                  desc: 'Always use local Ollama model. Completely free, good quality.',
                  badge: 'Requires Ollama installed',
                },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => saveAiModelPref(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    background: aiModelPref === opt.key ? 'rgba(181,242,58,0.08)' : 'var(--card2)',
                    outline: aiModelPref === opt.key ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: aiModelPref === opt.key ? 'var(--accent)' : '#f0f0f2' }}>{opt.title}</div>
                    <div style={{ fontSize: 11, color: '#9494a0', lineHeight: 1.4 }}>{opt.desc}</div>
                  </div>
                  {opt.badge && (
                    <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px', color: 'var(--muted)', flexShrink: 0 }}>
                      {opt.badge}
                    </span>
                  )}
                  {aiModelPref === opt.key && (
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9, color: '#0a0a0b', fontWeight: 900 }}>✓</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Ollama Setup Guide — always visible */}
          <div style={{ marginTop: 8, marginBottom: 8, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--card2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🦙</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Llama Setup Guide</span>
            </div>
            <div>
                <div style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Step 1 */}
                  <div style={{ display: 'flex', gap: 12, paddingTop: 14 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(181,242,58,0.15)', border: '1px solid rgba(181,242,58,0.35)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>1</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Download Ollama</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 6 }}>
                        Go to ollama.com and download for your OS (Mac, Windows, or Linux)
                      </div>
                      <a
                        href="https://ollama.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                          textDecoration: 'none', padding: '4px 10px',
                          background: 'rgba(181,242,58,0.08)', border: '1px solid rgba(181,242,58,0.25)',
                          borderRadius: 6,
                        }}
                      >
                        → ollama.com
                      </a>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(181,242,58,0.15)', border: '1px solid rgba(181,242,58,0.35)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>2</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Install a model</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 6 }}>Open your terminal and run:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, overflow: 'hidden' }}>
                        <code style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#b5f23a', display: 'block' }}>
                          ollama pull llama3.2
                        </code>
                        <button
                          onClick={() => copyCmd('ollama pull llama3.2')}
                          style={{
                            padding: '0 12px', height: '100%', background: 'none', border: 'none',
                            borderLeft: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                            fontSize: 11, color: copiedCmd === 'ollama pull llama3.2' ? 'var(--accent)' : 'var(--muted)',
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: 'nowrap',
                            transition: 'color 0.15s', minWidth: 48,
                          }}
                        >
                          {copiedCmd === 'ollama pull llama3.2' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(181,242,58,0.15)', border: '1px solid rgba(181,242,58,0.35)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>3</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Start Ollama</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 6 }}>Run this in terminal to start the server:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, overflow: 'hidden' }}>
                        <code style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#b5f23a', display: 'block' }}>
                          ollama serve
                        </code>
                        <button
                          onClick={() => copyCmd('ollama serve')}
                          style={{
                            padding: '0 12px', height: '100%', background: 'none', border: 'none',
                            borderLeft: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                            fontSize: 11, color: copiedCmd === 'ollama serve' ? 'var(--accent)' : 'var(--muted)',
                            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: 'nowrap',
                            transition: 'color 0.15s', minWidth: 48,
                          }}
                        >
                          {copiedCmd === 'ollama serve' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(181,242,58,0.15)', border: '1px solid rgba(181,242,58,0.35)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>4</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Come back here</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
                        Click <strong style={{ color: 'var(--text)' }}>Recheck</strong> below — it should turn green
                      </div>
                    </div>
                  </div>

                </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14 }}>
              {ollamaChecking || ollamaStatus === null ? '⏳' : ollamaStatus === 'running' ? '🟢' : '🔴'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {ollamaChecking ? 'Checking...' : ollamaStatus === null ? 'Checking Ollama...' : ollamaStatus === 'running' ? 'Ollama running locally' : 'Ollama not detected'}
              </div>
              {ollamaStatus === 'offline' && !ollamaChecking && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Install from ollama.com for free AI — then run <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>ollama pull llama3.1</code>
                </div>
              )}
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={recheckOllama} disabled={ollamaChecking}>
              {ollamaChecking ? 'Checking...' : 'Recheck'}
            </button>
          </div>
        </Section>
      </div>

      <div className="card card-top" style={{ marginBottom: 16 }}>
        <Section title="Notifications">
          <Row label="Weekly progress email"
            sub={<span>Disabled · <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>Coming V2</span></span>}
            right={<label className="toggle"><input type="checkbox" disabled /><span className="toggle-slider" /></label>}
          />
          <Row label="Streak reminder"
            sub={<span>Disabled · <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>Coming V2</span></span>}
            right={<label className="toggle"><input type="checkbox" disabled /><span className="toggle-slider" /></label>}
          />
        </Section>
      </div>

      <div className="card card-top" style={{ marginBottom: 16 }}>
        <Section title="Appearance">
          <div style={{ marginBottom: 16 }}>
            <label className="label" style={{ display: 'block', marginBottom: 10 }}>Accent Color</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {ACCENT_COLORS.map(c => (
                <button key={c.value} onClick={() => applyAccent(c.value)} title={c.name} style={{
                  width: 36, height: 36, borderRadius: '50%', background: c.value, border: 'none', cursor: 'pointer',
                  boxShadow: accent === c.value ? `0 0 0 2px var(--bg), 0 0 0 4px rgba(255,255,255,0.8)` : 'none',
                  transition: 'box-shadow 0.15s',
                }} />
              ))}
            </div>
          </div>
        </Section>
      </div>

      <div className="card card-top" style={{ marginBottom: 16 }}>
        <Section title="Data">
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Sessions', value: stats.sessions },
              { label: 'Minutes Focused', value: stats.mins },
              { label: 'Goals Set', value: stats.goals },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--card2)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Reset All Data</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Type RESET to confirm" value={resetText} onChange={e => setResetText(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-danger" onClick={handleReset}>Reset</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Permanently deletes all sessions, quiz results, and goals.</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteText(''); setDeleteError('') }}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.07)',
                color: '#f87171', fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.14)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.07)' }}
            >
              Delete Account &amp; All Data
            </button>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Permanently deletes your account and all associated data.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost" disabled style={{ opacity: 0.4 }}>Export Data</button>
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px', color: 'var(--muted)' }}>Coming V2</span>
          </div>
        </Section>
      </div>

      <div className="card">
        <Section title="About">
          <Row label="Version" right={<span style={{ color: 'var(--muted)', fontSize: 13 }}>FocusOS V1.0 · May 2026</span>} />
          <Row label="Built by" right={<span style={{ color: 'var(--muted)', fontSize: 13 }}>Myan Patel · Westford Academy · Class of 2028</span>} />
          <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/review" className="btn btn-ghost btn-full" style={{ textDecoration: 'none', justifyContent: 'center' }}>
              📊 Weekly Review
            </Link>
            <button className="btn btn-ghost btn-full" onClick={() => setShowCitations(true)}>View Research Citations (7 papers)</button>
          </div>
        </Section>
      </div>

      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f87171' }}>Delete Account</h2>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              This will permanently delete your account and all associated data — sessions, quiz results, goals, notes, and streaks. <strong style={{ color: 'var(--text)' }}>This cannot be undone.</strong>
            </p>
            <div style={{ marginBottom: 16 }}>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Type DELETE to confirm</label>
              <input
                type="text" placeholder="DELETE" value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                disabled={deleteLoading}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            {deleteError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{deleteError}</div>}
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 8, cursor: deleteLoading ? 'not-allowed' : 'pointer',
                border: 'none', background: deleteText === 'DELETE' ? '#f87171' : 'rgba(248,113,113,0.3)',
                color: deleteText === 'DELETE' ? '#0a0a0b' : '#f87171', fontSize: 14, fontWeight: 700,
                transition: 'all 0.15s', opacity: deleteLoading ? 0.7 : 1,
              }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete Account & All Data'}
            </button>
          </div>
        </div>
      )}

      {showCitations && (
        <div className="modal-backdrop" onClick={() => setShowCitations(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Research Citations</h2>
              <button onClick={() => setShowCitations(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {CITATIONS.map((c, i) => (
                <div key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{c.ref}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{c.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
