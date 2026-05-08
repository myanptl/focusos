import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

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

const DEFAULT_ROOMS = [
  { name: 'Late Night Grind', description: 'For night owls studying after 9pm', room_code: 'NIGHT1' },
  { name: 'SAT Prep Squad', description: 'SAT/ACT focused study sessions', room_code: 'SATPQ1' },
  { name: 'AP Gauntlet', description: 'AP exam preparation', room_code: 'APGNT1' },
  { name: 'General Focus', description: 'Open to everyone', room_code: 'FOCUS1' },
]

export default function Rooms() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const [roomName, setRoomName] = useState('')
  const [roomDesc, setRoomDesc] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [maxMembers, setMaxMembers] = useState(20)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    seedAndLoad()
  }, [])

  async function seedAndLoad() {
    setLoading(true)
    try {
      const { data: existing, error: checkErr } = await supabase
        .from('study_rooms')
        .select('name')
        .eq('is_public', true)

      if (checkErr) {
        if (checkErr.code === '42P01') {
          setTableError(true)
          setLoading(false)
          return
        }
        throw checkErr
      }

      const existingNames = new Set((existing || []).map(r => r.name))
      const toInsert = DEFAULT_ROOMS.filter(r => !existingNames.has(r.name)).map(r => ({
        ...r,
        created_by: 'system',
        is_public: true,
        max_members: 20,
      }))

      if (toInsert.length > 0) {
        await supabase.from('study_rooms').insert(toInsert)
      }

      await loadRooms()
    } catch (err) {
      toast('Failed to load rooms.', 'error')
      setLoading(false)
    }
  }

  async function loadRooms() {
    const { data, error } = await supabase
      .from('study_rooms')
      .select('*, room_members(user_id, display_name, is_focusing, last_seen)')
      .eq('is_public', true)
      .order('created_at')

    if (error) {
      if (error.code === '42P01') {
        setTableError(true)
      } else {
        toast('Failed to load rooms.', 'error')
      }
      setLoading(false)
      return
    }

    setRooms(data || [])
    setLoading(false)
  }

  async function handleCreateRoom() {
    if (!roomName.trim()) return
    setCreating(true)
    setCreateError('')
    const code = Math.random().toString(36).substr(2, 6).toUpperCase()

    const { data, error } = await supabase
      .from('study_rooms')
      .insert({
        name: roomName.trim(),
        description: roomDesc.trim() || null,
        created_by: user.id,
        is_public: isPublic,
        max_members: maxMembers,
        room_code: code,
      })
      .select('id')
      .single()

    setCreating(false)

    if (error) {
      if (error.code === '42P01') {
        setCreateError('Database tables not set up. Run the Rooms migration SQL in Supabase.')
      } else {
        setCreateError(error.message || 'Failed to create room.')
      }
      return
    }

    setCreateOpen(false)
    setRoomName('')
    setRoomDesc('')
    setIsPublic(true)
    setMaxMembers(20)
    navigate(`/rooms/${data.id}`)
  }

  async function handleJoinWithCode() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    setJoining(true)

    const { data, error } = await supabase
      .from('study_rooms')
      .select('id')
      .eq('room_code', code)
      .single()

    setJoining(false)

    if (error || !data) {
      toast('Room not found. Check the code and try again.', 'error')
      return
    }

    setJoinOpen(false)
    setJoinCode('')
    navigate(`/rooms/${data.id}`)
  }

  if (loading) {
    return (
      <div className="page-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (tableError) {
    return (
      <div className="page-fade">
        <div className="card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🗄️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Database Setup Required</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
            The Study Rooms tables don't exist yet. Run the Rooms migration SQL in your Supabase dashboard to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="page-fade" style={{ background: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Study Rooms</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Focus alongside others. Silent co-working, real accountability.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => { setJoinCode(''); setJoinOpen(true) }}>
            Join with Code
          </button>
          <button className="btn btn-accent" onClick={() => { setRoomName(''); setRoomDesc(''); setIsPublic(true); setMaxMembers(20); setCreateError(''); setCreateOpen(true) }}>
            + Create Room
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {rooms.map(room => {
          const members = room.room_members || []
          const onlineMembers = members.filter(m => isOnline(m.last_seen))
          const focusingCount = onlineMembers.filter(m => m.is_focusing).length
          const onlineCount = onlineMembers.length
          const displayMembers = members.slice(0, 5)
          const extraCount = members.length - displayMembers.length

          return (
            <div key={room.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{room.name}</div>
                {room.description && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{room.description}</div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {displayMembers.map((m, i) => {
                    const key = m.user_id || m.display_name || String(i)
                    const color = avatarColor(key)
                    return (
                      <div key={key + i} style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#0a0a0b',
                        border: '2px solid var(--card)',
                        marginLeft: i === 0 ? 0 : -8,
                        zIndex: displayMembers.length - i,
                        position: 'relative',
                      }}>
                        {getInitial(m.display_name)}
                      </div>
                    )
                  })}
                </div>
                {extraCount > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>+{extraCount} more</span>
                )}
                {members.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>No members yet</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: focusingCount > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                  {focusingCount > 0 ? `${focusingCount} focusing now 🔥` : `${onlineCount} online`}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/rooms/${room.id}`)}
                >
                  Join Room →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {rooms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
          No public rooms yet. Create one to get started!
        </div>
      )}
    </div>

      {createOpen && (
        <div
          onClick={() => setCreateOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '80px',
            paddingBottom: '40px',
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111113',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '32px',
              width: '440px',
              maxWidth: '92vw',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>Create a Room</h2>
              <button onClick={() => setCreateOpen(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1,
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: 7 }}>Room Name</label>
                <input
                  placeholder="e.g. Late Night Grind"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  maxLength={60}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: 7 }}>Description <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
                <input
                  placeholder="What's this room for?"
                  value={roomDesc}
                  onChange={e => setRoomDesc(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: 7 }}>Visibility</label>
                <div style={{ display: 'flex', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
                  {[{ label: 'Public', val: true }, { label: 'Private', val: false }].map(opt => (
                    <button
                      key={String(opt.val)}
                      onClick={() => setIsPublic(opt.val)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        transition: 'all 0.15s',
                        background: isPublic === opt.val ? 'var(--accent)' : 'transparent',
                        color: isPublic === opt.val ? '#0a0a0b' : 'var(--muted)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: 7 }}>Max Members</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[5, 10, 20].map(n => (
                    <button
                      key={n}
                      className={`pill${maxMembers === n ? ' active' : ''}`}
                      onClick={() => setMaxMembers(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)',
                  color: 'var(--red)', lineHeight: 1.5,
                }}>
                  {createError}
                </div>
              )}

              <button
                className="btn btn-accent btn-full"
                style={{ marginTop: 4, height: 46 }}
                disabled={!roomName.trim() || creating}
                onClick={handleCreateRoom}
              >
                {creating ? <span className="spinner" /> : 'Create Room →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {joinOpen && (
        <div
          onClick={() => setJoinOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '80px',
            paddingBottom: '40px',
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111113',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '32px',
              width: '440px',
              maxWidth: '92vw',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>Join with Code</h2>
              <button onClick={() => setJoinOpen(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1,
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label" style={{ display: 'block', marginBottom: 7 }}>Room Code</label>
                <input
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 22,
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              <button
                className="btn btn-accent btn-full"
                style={{ height: 46 }}
                disabled={!joinCode.trim() || joining}
                onClick={handleJoinWithCode}
              >
                {joining ? <span className="spinner" /> : 'Join Room →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
