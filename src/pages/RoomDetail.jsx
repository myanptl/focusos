import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'
import { Database, DoorOpen, Copy, X, ArrowLeft } from 'lucide-react'

function getInitial(name = '') {
  return (name.trim()[0] || '?').toUpperCase()
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

const R = 104
const CIRC = 2 * Math.PI * R
const SPRING = { type: 'spring', stiffness: 500, damping: 40 }

function CircularTimer({ secs, totalSecs, running }) {
  const progress = totalSecs > 0 ? secs / totalSecs : 1
  const offset = CIRC * (1 - progress)
  const timeStr = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`

  return (
    <div style={{ position: 'relative', width: 232, height: 232, margin: '0 auto' }}>
      <svg width="232" height="232" viewBox="0 0 232 232" style={{ display: 'block' }} aria-hidden="true">
        <circle cx="116" cy="116" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="1.5" />
        <circle
          cx="116" cy="116" r={R} fill="none"
          stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          transform="rotate(-90 116 116)"
          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="num" style={{ fontSize: 48, lineHeight: 1, color: 'var(--text)' }} role="timer" aria-live="off">{timeStr}</span>
        <span className="label" style={{ marginTop: 8, color: running ? 'var(--accent)' : 'var(--faint)' }}>{running ? 'Focusing' : 'Focus'}</span>
      </div>
    </div>
  )
}

function StatusDot({ on }) {
  return (
    <span
      className={on ? 'live-dot' : undefined}
      aria-hidden="true"
      style={{ width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--accent)' : 'var(--faint)', display: 'inline-block', flexShrink: 0 }}
    />
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
  const messagesEndRef = useRef(null)
  const timerRunningRef = useRef(false)
  const [onlineUserIds, setOnlineUserIds] = useState(new Set())

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

    const [roomRes, membersRes, msgsRes, meRes] = await Promise.all([
      supabase.from('study_rooms')
        .select('id, name, room_code, created_by')
        .eq('id', roomId).single(),
      supabase.from('room_members')
        .select('id, user_id, display_name, is_focusing, focus_start_time, current_task, last_seen')
        .eq('room_id', roomId),
      supabase.from('room_messages')
        .select('id, user_id, display_name, message, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true }).limit(20),
      supabase.from('room_members').upsert(
        { room_id: roomId, user_id: user.id, display_name: displayName, last_seen: now, is_focusing: false },
        { onConflict: 'room_id,user_id', ignoreDuplicates: false }
      ).select('id, user_id, display_name, is_focusing, focus_start_time, current_task, last_seen').single(),
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
    // The query and upsert run concurrently — if the query completes before the upsert
    // commits, the current user's row won't appear in membersRes. Merge it from meRes.
    let initialMembers = membersRes.data || []
    if (meRes.data && !initialMembers.find(m => m.user_id === user.id)) {
      initialMembers = [...initialMembers, meRes.data]
    }
    setMembers(initialMembers)
    if (msgsRes.data) setMessages(msgsRes.data)

    const me = initialMembers.find(m => m.user_id === user.id)
    if (me?.current_task) {
      setCurrentTask(me.current_task)
      setTaskInput(me.current_task)
    }

    setLoading(false)
    subscribeRealtime()
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
          if (prev.find(m => m.id === payload.new.id || m.user_id === payload.new.user_id)) return prev
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

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'room_messages',
      filter: 'room_id=eq.' + roomId,
    }, payload => {
      setMessages(prev => [...prev, payload.new].slice(-20))
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setOnlineUserIds(new Set(Object.values(state).flat().map(p => p.user_id)))
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, display_name: displayName })
        // 5-min last_seen refresh so stale-member cleanup has a valid timestamp
        if (presenceRef.current) clearInterval(presenceRef.current)
        presenceRef.current = setInterval(async () => {
          await supabase.from('room_members')
            .update({ last_seen: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', user.id)
        }, 5 * 60 * 1000)
      }
    })
  }

  function cleanup() {
    clearInterval(presenceRef.current)
    clearInterval(timerRef.current)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
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
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .lt('last_seen', tenMinsAgo)
  }

  useEffect(() => {
    if (!room || !user) return
    if (room.created_by !== user.id) return
    cleanStaleMembers()
  }, [room?.id, user?.id])

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
      <div>
        <header className="page-head">
          <span className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" style={{ width: 12, height: 12 }} /> Joining room
          </span>
          <div className="skeleton" style={{ height: 30, width: 260, maxWidth: '70%' }} />
        </header>
        <div className="room-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 48, alignItems: 'start' }}>
          <div className="skeleton" style={{ width: 232, height: 232, borderRadius: '50%', margin: '0 auto' }} />
          <div>
            {[58, 72, 45].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--hairline)' }}>
                <div className="skeleton" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 12, width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (tableError || notFound) {
    const Icon = tableError ? Database : DoorOpen
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center' }}>
        <Icon size={16} strokeWidth={1.6} color="var(--muted)" />
        <h2 style={{ fontSize: 18, marginTop: 12, marginBottom: 8 }}>
          {tableError ? 'Database setup required' : 'Room not found'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
          {tableError
            ? 'The Study Rooms tables don\'t exist yet. Run the Rooms migration SQL in your Supabase dashboard to get started.'
            : 'This room may have been deleted or the link is invalid.'}
        </p>
        <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => navigate('/rooms')}>
          Back to rooms
        </button>
      </div>
    )
  }

  const totalSecs = sessionLen * 60
  const showReset = !timerRunning && timerSecs < totalSecs && !sessionComplete

  return (
    <div>
      <header className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <span className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Room · {room?.room_code}
            <button
              className="btn-quiet"
              style={{ padding: 2 }}
              onClick={() => {
                navigator.clipboard.writeText(room?.room_code || '')
                toast('Code copied', 'success')
              }}
              title="Copy room code"
              aria-label="Copy room code"
            >
              <Copy size={12} strokeWidth={1.6} />
            </button>
          </span>
          <h1 className="page-title">{room?.name}</h1>
          <p className="mono" style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {focusingCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <StatusDot on /> {focusingCount} focusing
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLeave}>
          <ArrowLeft size={14} strokeWidth={1.6} /> Leave room
        </button>
      </header>

      <div className="room-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 48, alignItems: 'start' }}>

        {/* ── Timer + task ── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {[25, 50, 90].map(len => (
              <button
                key={len}
                className={`pill mono${sessionLen === len ? ' active' : ''}`}
                onClick={() => handleSessionLenChange(len)}
                disabled={timerRunning}
                style={{ opacity: timerRunning ? 0.4 : 1, cursor: timerRunning ? 'not-allowed' : 'pointer' }}
              >
                {len}m
              </button>
            ))}
          </div>

          <CircularTimer secs={timerSecs} totalSecs={totalSecs} running={timerRunning} />

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 44 }}>
            {sessionComplete ? (
              <>
                <span className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>{completedLen} min logged</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setTimerSecs(sessionLen * 60)
                    setSessionComplete(false)
                  }}
                >
                  Start another
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-accent btn-lg"
                  style={{ minWidth: 140, justifyContent: 'center' }}
                  onClick={timerRunning ? handlePause : handleStart}
                >
                  {timerRunning ? 'Pause' : 'Start'}
                </button>
                {showReset && (
                  <button className="btn btn-ghost btn-lg" onClick={handleReset}>Reset</button>
                )}
              </>
            )}
          </div>

          <div style={{ marginTop: 40, borderTop: '1px solid var(--hairline)', paddingTop: 20 }}>
            <label className="label" htmlFor="room-task" style={{ display: 'block', marginBottom: 8 }}>Working on</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="room-task"
                placeholder="e.g. Chapter 4 review"
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetTask()}
                maxLength={120}
                style={{ flex: 1, minWidth: 0 }}
              />
              <button className="btn btn-ghost" onClick={handleSetTask} disabled={!taskInput.trim()}>Set</button>
              <button className="btn-quiet" onClick={handleClearTask} disabled={!currentTask} aria-label="Clear task" style={{ opacity: currentTask ? 1 : 0.4 }}>
                <X size={14} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Presence + chat ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
          <section>
            <div className="label" style={{ marginBottom: 8 }}>Here now</div>
            <ul style={{ maxHeight: 320, overflowY: 'auto', borderBottom: '1px solid var(--hairline)' }}>
              <AnimatePresence initial={false}>
                {sortedMembers.map(m => {
                  const isMe = m.user_id === user.id
                  const online = onlineUserIds.has(m.user_id)
                  const dur = m.is_focusing ? focusingDuration(m.focus_start_time) : 0
                  const status = m.is_focusing ? `focusing ${dur}m` : online ? 'idle' : 'away'

                  return (
                    <motion.li
                      key={m.id || m.user_id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={SPRING}
                      style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--hairline)' }}
                    >
                      <span className="avatar" style={{ opacity: online || m.is_focusing ? 1 : 0.5 }}>{getInitial(m.display_name)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.display_name}</span>
                          {isMe && <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>you</span>}
                        </div>
                        {m.current_task && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.current_task}
                          </div>
                        )}
                      </div>
                      <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, flexShrink: 0, color: m.is_focusing ? 'var(--accent)' : 'var(--faint)' }}>
                        {m.is_focusing && <StatusDot on />}
                        {status}
                      </span>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="label" style={{ marginBottom: 8 }}>Chat</div>
            <div style={{ height: 260, overflowY: 'auto', borderTop: '1px solid var(--hairline)', padding: '4px 0 8px' }}>
              {messages.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--faint)', padding: '12px 0' }}>No messages yet.</div>
              )}
              {messages.map((msg, i) => {
                const isOwn = msg.user_id === user.id
                return (
                  <div key={msg.id || i} style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: isOwn ? 'var(--muted)' : 'var(--text)' }}>
                        {isOwn ? 'You' : msg.display_name}
                      </span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{timeAgo(msg.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)', wordBreak: 'break-word', marginTop: 2 }}>
                      {msg.message}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
              <input
                placeholder="Message"
                aria-label="Chat message"
                value={chatInput}
                onChange={e => setChatInput(e.target.value.slice(0, 2000))}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, minWidth: 0 }}
              />
              <button className="btn btn-ghost" onClick={handleSendMessage} disabled={!chatInput.trim() || sendingMsg}>
                Send
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
