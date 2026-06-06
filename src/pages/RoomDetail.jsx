import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { Target, Database, DoorOpen, Flame, Mic, Clipboard } from 'lucide-react'

const AVATAR_COLORS = ['#b5f23a', '#60d3f8', '#a78bfa', '#fb923c', '#f472b6', '#4ade80']

function avatarColor(str = '') {
  let h = 0
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getInitial(name = '') {
  return (name.trim()[0] || '?').toUpperCase()
}

function isOnline(last_seen) {
  if (!last_seen) return false
  return Date.now() - new Date(last_seen).getTime() < 2 * 60 * 1000
}

function focusingDuration(focus_start_time) {
  if (!focus_start_time) return 0
  return Math.floor((Date.now() - new Date(focus_start_time).getTime()) / 60000)
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

const R = 100
const CIRC = 2 * Math.PI * R

function CircularTimer({ secs, totalSecs }) {
  const progress = totalSecs > 0 ? secs / totalSecs : 1
  const offset = CIRC * (1 - progress)
  const timeStr = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`

  return (
    <svg width="240" height="240" viewBox="0 0 240 240" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="120" cy="120" r={R} fill="none"
        stroke="#b5f23a" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={CIRC} strokeDashoffset={offset}
        transform="rotate(-90 120 120)"
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
      <text x="120" y="112" textAnchor="middle"
        fontFamily="'Bebas Neue', sans-serif" fontSize="48"
        fill="#b5f23a" letterSpacing="2">
        {timeStr}
      </text>
      <text x="120" y="134" textAnchor="middle"
        fontFamily="'Outfit', sans-serif" fontSize="11"
        fill="rgba(255,255,255,0.4)" letterSpacing="2">
        FOCUS
      </text>
    </svg>
  )
}

export default function RoomDetail() {
  const { roomId } = useParams()
  const { user, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const displayName = profile?.name || profile?.username || user?.email?.split('@')[0] || 'Anonymous'

  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tableError, setTableError] = useState(false)

  const [tick, setTick] = useState(0)

  const [sessionLen, setSessionLen] = useState(25)
  const [timerSecs, setTimerSecs] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [completedLen, setCompletedLen] = useState(0)

  const [currentTask, setCurrentTask] = useState('')
  const [taskInput, setTaskInput] = useState('')

  const [chatInput, setChatInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  const timerRef = useRef(null)
  const tickRef = useRef(0)
  const presenceRef = useRef(null)
  const channelRef = useRef(null)
  const msgChannelRef = useRef(null)
  const messagesEndRef = useRef(null)
  const timerRunningRef = useRef(false)

  useEffect(() => { timerRunningRef.current = timerRunning }, [timerRunning])

  useEffect(() => {
    if (!user) return
    initRoom()

    return () => {
      cleanup()
    }
  }, [roomId, user])

  async function initRoom() {
    const cacheKey = 'room_' + roomId
    let hasCached = false
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const { room: cachedRoom, ts } = JSON.parse(raw)
        if (cachedRoom && Date.now() - ts < 5 * 60 * 1000) {
          setRoom(cachedRoom)
          setLoading(false)
          hasCached = true
        }
      }
    } catch {}

    if (!hasCached) setLoading(true)

    const now = new Date().toISOString()

    const [roomRes, membersRes, msgsRes] = await Promise.all([
      supabase.from('study_rooms').select('*').eq('id', roomId).single(),
      supabase.from('room_members').select('*').eq('room_id', roomId),
      supabase.from('room_messages')
        .select('*').eq('room_id', roomId)
        .order('created_at', { ascending: true }).limit(20),
      supabase.from('room_members').upsert(
        { room_id: roomId, user_id: user.id, display_name: displayName, last_seen: now, is_focusing: false },
        { onConflict: 'room_id,user_id', ignoreDuplicates: false }
      ),
    ])

    if (roomRes.error) {
      if (roomRes.error.code === '42P01') { setTableError(true); setLoading(false); return }
      if (roomRes.error.code === 'PGRST116') { setNotFound(true); setLoading(false); return }
      if (!hasCached) { toast('Failed to load room.', 'error'); setLoading(false) }
      return
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ room: roomRes.data, ts: Date.now() }))
    } catch {}

    setRoom(roomRes.data)
    if (membersRes.data) setMembers(membersRes.data)
    if (msgsRes.data) setMessages(msgsRes.data)

    const me = membersRes.data?.find(m => m.user_id === user.id)
    if (me?.current_task) {
      setCurrentTask(me.current_task)
      setTaskInput(me.current_task)
    }

    setLoading(false)
    subscribeRealtime()
    subscribeMessages()
    startPresence()
  }

  function subscribeRealtime() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }
    const channel = supabase.channel('room:' + roomId)
    channelRef.current = channel

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'room_members',
      filter: 'room_id=eq.' + roomId,
    }, payload => {
      if (payload.eventType === 'INSERT') {
        setMembers(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      } else if (payload.eventType === 'UPDATE') {
        setMembers(prev => {
          const prevMember = prev.find(m => m.user_id === payload.new.user_id)
          const updated = prev.map(m => m.user_id === payload.new.user_id ? payload.new : m)
          if (
            payload.new.user_id !== user.id &&
            payload.new.is_focusing === true &&
            prevMember?.is_focusing === false
          ) {
            toast(`${payload.new.display_name} started a focus session`, 'info')
          }
          if (
            payload.new.user_id !== user.id &&
            prevMember?.is_focusing === true &&
            payload.new.is_focusing === false &&
            prevMember?.focus_start_time
          ) {
            const mins = Math.floor(
              (new Date(payload.new.last_seen).getTime() - new Date(prevMember.focus_start_time).getTime()) / 60000
            )
            if (mins >= 5) {
              toast(`${payload.new.display_name} completed ${mins} min!`, 'success')
            }
          }
          return updated
        })
      } else if (payload.eventType === 'DELETE') {
        setMembers(prev => prev.filter(m => m.id !== payload.old.id))
      }
    })

    channel.subscribe()
  }

  function subscribeMessages() {
    if (msgChannelRef.current) {
      supabase.removeChannel(msgChannelRef.current)
    }
    const ch = supabase.channel('room-messages-' + roomId)
    msgChannelRef.current = ch
    ch.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'room_messages',
      filter: 'room_id=eq.' + roomId,
    }, payload => {
      setMessages(prev => [...prev, payload.new].slice(-20))
    })
    ch.subscribe()
  }

  function startPresence() {
    // Clear any existing interval before starting a new one to prevent leaks on re-init
    if (presenceRef.current) clearInterval(presenceRef.current)
    presenceRef.current = setInterval(async () => {
      await supabase.from('room_members')
        .update({ last_seen: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id)
    }, 30000)
  }

  function cleanup() {
    clearInterval(presenceRef.current)
    clearInterval(timerRef.current)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (msgChannelRef.current) {
      supabase.removeChannel(msgChannelRef.current)
      msgChannelRef.current = null
    }
    if (user) {
      supabase.from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .then(() => {})
    }
  }

  async function cleanStaleMembers() {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .lt('last_seen', twoMinsAgo)
  }

  useEffect(() => {
    cleanStaleMembers()
    const id = setInterval(cleanStaleMembers, 60000)
    return () => clearInterval(id)
  }, [roomId])

  useEffect(() => {
    const handler = () => {
      supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user?.id)
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [roomId, user?.id])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSecs(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            timerRef.current = null
            setTimerRunning(false)
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => clearInterval(timerRef.current)
  }, [timerRunning])

  async function handleStart() {
    setTimerRunning(true)
    setSessionComplete(false)
    const now = new Date().toISOString()
    await supabase.from('room_members').update({
      is_focusing: true,
      focus_start_time: now,
      last_seen: now,
    }).eq('room_id', roomId).eq('user_id', user.id)
  }

  async function handlePause() {
    setTimerRunning(false)
    const now = new Date().toISOString()
    await supabase.from('room_members').update({
      is_focusing: false,
      last_seen: now,
    }).eq('room_id', roomId).eq('user_id', user.id)
  }

  async function handleTimerComplete() {
    setSessionComplete(true)
    setCompletedLen(sessionLen)
    const now = new Date().toISOString()

    await supabase.from('room_members').update({
      is_focusing: false,
      last_seen: now,
    }).eq('room_id', roomId).eq('user_id', user.id)

    await supabase.from('focus_sessions').insert({
      user_id: user.id,
      duration_minutes: sessionLen,
      completed: true,
      session_date: todayKey(),
      completed_at: now,
    })
  }

  async function handleReset() {
    if (timerRunning) {
      clearInterval(timerRef.current)
      timerRef.current = null
      setTimerRunning(false)
      await supabase.from('room_members').update({
        is_focusing: false,
        last_seen: new Date().toISOString(),
      }).eq('room_id', roomId).eq('user_id', user.id)
    }
    setTimerSecs(sessionLen * 60)
    setSessionComplete(false)
  }

  function handleSessionLenChange(len) {
    if (timerRunning) return
    setSessionLen(len)
    setTimerSecs(len * 60)
    setSessionComplete(false)
  }

  async function handleSetTask() {
    const val = taskInput.trim()
    setCurrentTask(val)
    await supabase.from('room_members')
      .update({ current_task: val })
      .eq('room_id', roomId)
      .eq('user_id', user.id)
  }

  async function handleClearTask() {
    setCurrentTask('')
    setTaskInput('')
    await supabase.from('room_members')
      .update({ current_task: '' })
      .eq('room_id', roomId)
      .eq('user_id', user.id)
  }

  async function handleSendMessage() {
    const msg = chatInput.trim()
    if (!msg || sendingMsg) return
    // Bound chat message length (audit #17). 2000 chars matches the server-side
    // limit you should also enforce via a Postgres CHECK constraint:
    //   ALTER TABLE room_messages ADD CONSTRAINT room_messages_message_len
    //   CHECK (char_length(message) <= 2000);
    const MAX_MESSAGE_LENGTH = 2000
    if (msg.length > MAX_MESSAGE_LENGTH) {
      toast(`Message too long (${msg.length}/${MAX_MESSAGE_LENGTH} characters). Please shorten it.`, 'error')
      return
    }
    setSendingMsg(true)
    setChatInput('')
    const msgDisplayName = profile?.name || user?.email?.split('@')[0] || 'User'
    const { error } = await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: user.id,
      display_name: msgDisplayName,
      message: msg,
      created_at: new Date().toISOString(),
    })
    if (error) toast('Failed to send message', 'error')
    setSendingMsg(false)
  }

  function handleLeave() {
    navigate('/rooms')
    supabase.from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .then(() => {})
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (a.is_focusing && !b.is_focusing) return -1
    if (!a.is_focusing && b.is_focusing) return 1
    return (a.display_name || '').localeCompare(b.display_name || '')
  })

  const focusingCount = members.filter(m => m.is_focusing).length

  if (loading) {
    return (
      <div className="page-fade room-detail-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="spinner" style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Joining room...</span>
            </div>
            <div className="skeleton" style={{ height: 20, width: '65%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 13, width: '38%' }} />
          </div>
          <div style={{ padding: 14, flex: 1 }}>
            <div className="skeleton" style={{ height: 10, width: '28%', marginBottom: 14 }} />
            {[58, 72, 45].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="skeleton" style={{ height: 13, width: `${w}%` }} />
                  <div className="skeleton" style={{ height: 11, width: '26%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div className="skeleton" style={{ height: 13, width: '44%', margin: '0 auto 20px' }} />
            <div className="skeleton" style={{ width: 240, height: 240, borderRadius: '50%', margin: '0 auto 24px' }} />
            <div className="skeleton" style={{ height: 52, borderRadius: 10 }} />
          </div>
        </div>
      </div>
    )
  }

  if (tableError) {
    return (
      <div className="page-fade">
        <div className="card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: 36 }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}><Database size={36} color="var(--muted)" /></div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Database Setup Required</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
            The Study Rooms tables don't exist yet. Run the Rooms migration SQL in your Supabase dashboard to get started.
          </p>
          <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => navigate('/rooms')}>
            ← Back to Rooms
          </button>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="page-fade">
        <div className="card" style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center', padding: 36 }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}><DoorOpen size={36} color="var(--muted)" /></div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Room not found</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
            This room may have been deleted or the link is invalid.
          </p>
          <button className="btn btn-ghost" onClick={() => navigate('/rooms')}>
            ← Back to Rooms
          </button>
        </div>
      </div>
    )
  }

  const totalSecs = sessionLen * 60
  const showReset = !timerRunning && timerSecs < totalSecs && !sessionComplete

  return (
    <div className="page-fade room-detail-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

      {/* ── LEFT PANEL ── */}
      <div className="card room-left-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', padding: 0, overflow: 'hidden' }}>

        {/* Top section */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>{room?.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, fontWeight: 600,
                background: 'var(--card2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 8px', color: 'var(--muted)', letterSpacing: '0.08em',
              }}>{room?.room_code}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(room?.room_code || '')
                  toast('Code copied!', 'success')
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', padding: 2, display: 'flex',
                }}
                title="Copy room code"
              >
                <Clipboard size={14} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {focusingCount > 0 && (
              <span> · <span style={{ color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{focusingCount} focusing now <Flame size={12} /></span></span>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex',
              alignItems: 'center', gap: '10px' }}>
              <Mic size={18} color="var(--muted)" />
              <div>
                <div style={{ fontSize: '13px',
                  fontWeight: 600, color: 'white' }}>
                  Voice Chat
                </div>
                <div style={{ fontSize: '11px',
                  color: '#9494a0' }}>
                  Talk with your room members
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1px',
              color: 'var(--accent)',
              background: 'rgba(181,242,58,0.1)',
              border: '1px solid rgba(181,242,58,0.2)',
              padding: '4px 10px',
              borderRadius: '20px',
            }}>
              COMING V2
            </span>
          </div>
        </div>

        {/* Members list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', maxHeight: 300 }}>
          <div className="label" style={{ marginBottom: 10 }}>Members</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedMembers.map(m => {
              const isMe = m.user_id === user.id
              const online = isOnline(m.last_seen)
              const color = avatarColor(m.user_id || m.display_name)
              const dur = m.is_focusing ? focusingDuration(m.focus_start_time) : 0

              return (
                <div key={m.id || m.user_id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  borderLeft: m.is_focusing ? '2px solid var(--accent)' : '2px solid transparent',
                  paddingLeft: m.is_focusing ? 8 : 10,
                  borderRadius: 4,
                  transition: 'border-color 0.4s ease, padding-left 0.4s ease',
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#0a0a0b',
                    }}>
                      {getInitial(m.display_name)}
                    </div>
                    <div
                      className={online ? 'status-dot-online' : ''}
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 8, height: 8, borderRadius: '50%',
                        background: online ? '#4ade80' : 'var(--muted)',
                        border: '1.5px solid var(--card)',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{m.display_name}</span>
                      {isMe && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                          background: 'rgba(181,242,58,0.12)', border: '1px solid rgba(181,242,58,0.3)',
                          color: 'var(--accent)', letterSpacing: '0.05em',
                        }}>You</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {m.is_focusing ? (
                        <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />Focusing — {dur}m</span>
                      ) : (
                        <span style={{ color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block', flexShrink: 0 }} />Idle</span>
                      )}
                    </div>
                    {m.current_task && (
                      <div style={{
                        fontSize: 12, color: 'var(--muted)', fontStyle: 'italic',
                        marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {m.current_task}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat */}
        <div style={{ borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: 240, padding: '12px 14px 14px' }}>
          <div className="label" style={{ marginBottom: 8 }}>Room Chat</div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                No messages yet. Say hi!
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.user_id === user.id
              return (
                <div key={msg.id || i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, marginBottom: 2,
                    color: isOwn ? 'var(--accent)' : '#60d3f8',
                  }}>
                    {msg.display_name}
                  </span>
                  <div style={{
                    maxWidth: '85%',
                    background: isOwn ? 'rgba(181,242,58,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isOwn ? 'rgba(181,242,58,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 8, padding: '5px 9px',
                    fontSize: 13, lineHeight: 1.45,
                    color: 'var(--text)', wordBreak: 'break-word',
                  }}>
                    {msg.message}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    {timeAgo(msg.created_at)}
                  </span>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              placeholder="Send a message..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value.slice(0, 2000))}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, fontSize: 13, padding: '7px 10px' }}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || sendingMsg}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Focus Timer Card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: 14 }}>Focus Timer</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
            {[25, 50, 90].map(len => (
              <button
                key={len}
                className={`pill${sessionLen === len ? ' active' : ''}`}
                onClick={() => handleSessionLenChange(len)}
                disabled={timerRunning}
                style={{ opacity: timerRunning ? 0.5 : 1, cursor: timerRunning ? 'not-allowed' : 'pointer' }}
              >
                {len} min
              </button>
            ))}
          </div>

          <div style={{
            display: 'inline-block', borderRadius: '50%',
            boxShadow: timerRunning ? '0 0 60px rgba(181,242,58,0.15)' : 'none',
            transition: 'box-shadow 0.4s ease',
          }}>
            <CircularTimer secs={timerSecs} totalSecs={totalSecs} />
          </div>

          {sessionComplete ? (
            <div style={{
              marginTop: 18, padding: '16px 20px', borderRadius: 12,
              background: 'rgba(181,242,58,0.12)', border: '1px solid rgba(181,242,58,0.3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={15} /> Session Complete! {completedLen} min logged
              </div>
              <button
                className="btn btn-accent btn-sm"
                onClick={() => {
                  setTimerSecs(sessionLen * 60)
                  setSessionComplete(false)
                }}
              >
                Start Another →
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-accent btn-full"
                style={{ height: 52, fontSize: 15, fontWeight: 700 }}
                onClick={timerRunning ? handlePause : handleStart}
              >
                {timerRunning ? 'PAUSE' : 'START'}
              </button>
              {showReset && (
                <button className="btn btn-ghost btn-full" onClick={handleReset}>
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Current Task Card */}
        <div className="card">
          <div className="label" style={{ marginBottom: 10 }}>What are you working on?</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              placeholder="e.g. Chapter 4 review, practice problems..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetTask()}
              maxLength={120}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleSetTask}
              disabled={!taskInput.trim()}
            >
              Set
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClearTask}
              disabled={!currentTask}
            >
              ×
            </button>
          </div>
        </div>

        {/* Leave Room */}
        <button className="btn btn-ghost" onClick={handleLeave} style={{ alignSelf: 'flex-start' }}>
          ← Leave Room
        </button>
      </div>
    </div>
  )
}
