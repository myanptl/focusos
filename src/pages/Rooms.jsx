import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { X, Database, Trash2, Flame } from 'lucide-react'

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

// Cryptographically secure 6-char [A-Z0-9] room code. Replaces
// Math.random().toString(36).substr(2,6).toUpperCase() which was both
// non-uniform and predictable (audit #15).
function generateRoomCode() {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' // 36 chars
  const out = []
  // Rejection sampling avoids modulo bias from 256 % 36 != 0.
  const buf = new Uint8Array(16)
  while (out.length < 6) {
    crypto.getRandomValues(buf)
    for (let i = 0; i < buf.length && out.length < 6; i++) {
      if (buf[i] < 252) out.push(ALPHABET[buf[i] % 36]) // 252 = floor(256/36)*36
    }
  }
  return out.join('')
}

function getRoomGradient(name = '') {
  if (name === 'SAT Prep Squad') return 'linear-gradient(135deg, rgba(181,242,58,0.22) 0%, rgba(10,10,11,0) 80%)'
  if (name === 'AP Gauntlet')    return 'linear-gradient(135deg, rgba(96,211,248,0.20) 0%, rgba(10,10,11,0) 80%)'
  if (name === 'General Focus')  return 'linear-gradient(135deg, rgba(168,139,250,0.20) 0%, rgba(10,10,11,0) 80%)'
  return 'linear-gradient(135deg, rgba(181,242,58,0.14) 0%, rgba(10,10,11,0) 80%)'
}

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
  const [hoveredRoom, setHoveredRoom] = useState(null)

  useEffect(() => {
    loadRooms()
  }, [])

  async function loadRooms() {
    setLoading(true)
    let query = supabase
      .from('study_rooms')
      .select('id, name, description, room_code, created_by, is_public, room_members(user_id, display_name, is_focusing, last_seen)')
      .order('created_at')
      .limit(100)

    if (user?.id) {
      query = query.or(`is_public.eq.true,created_by.eq.${user.id}`)
    } else {
      query = query.eq('is_public', true)
    }

    const { data, error } = await query

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
    const code = generateRoomCode()

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

  async function handleDeleteRoom(id) {
    const { error } = await supabase
      .from('study_rooms')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id)
    if (error) { toast('Failed to delete room.', 'error'); return }
    setRooms(prev => prev.filter(r => r.id !== id))
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
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}><Database size={36} color="var(--muted)" /></div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Database Setup Required</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
            The Study Rooms tables don't exist yet. Run the Rooms migration SQL in your Supabase dashboard to get started.
          </p>
        </div>
      </div>
    )
  }

  const publicRooms = rooms.filter(r => r.created_by === 'system')
  const yourRooms = rooms.filter(r => r.created_by === user?.id)

  function renderRoomCard(room, showDelete) {
    const members = room.room_members || []
    const onlineMembers = members.filter(m => isOnline(m.last_seen))
    const focusingCount = onlineMembers.filter(m => m.is_focusing).length
    const onlineCount = onlineMembers.length
    const displayMembers = onlineMembers.slice(0, 5)
    const extraCount = onlineMembers.length - displayMembers.length

    return (
      <div
        key={room.id}
        className="card"
        style={{
          display: 'flex', flexDirection: 'column', position: 'relative',
          padding: 0, overflow: 'hidden',
          transform: hoveredRoom === room.id ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: hoveredRoom === room.id ? '0 16px 48px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.22)',
          transition: 'transform 0.22s var(--ease-out), box-shadow 0.22s var(--ease-out)',
          cursor: 'default',
        }}
        onMouseEnter={() => setHoveredRoom(room.id)}
        onMouseLeave={() => setHoveredRoom(null)}
      >
        <div style={{
          height: 80,
          background: getRoomGradient(room.name),
          padding: '12px 18px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {showDelete && hoveredRoom === room.id && (
            <button
              onClick={e => { e.stopPropagation(); handleDeleteRoom(room.id) }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', padding: 4, display: 'flex',
              }}
              title="Delete room"
            >
              <Trash2 size={15} />
            </button>
          )}
          <div style={{ fontWeight: 700, fontSize: 15 }}>{room.name}</div>
          {room.description && (
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>{room.description}</div>
          )}
        </div>

        <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            {onlineMembers.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>No one online</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: focusingCount > 0 ? 'var(--accent)' : 'var(--muted)' }}>
              {focusingCount > 0 ? <>{focusingCount} focusing now <Flame size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></> : `${onlineCount} online`}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/rooms/${room.id}`)}
            >
              Join Room →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="page-fade" style={{ background: 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="v3-kicker">Focus together · Live</span>
          <h1 className="page-title" style={{ marginBottom: 6 }}><span className="pt-inner">Study Rooms<span className="v3-dot">.</span></span></h1>
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

      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 14,
        }}>Public Rooms</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {publicRooms.map(room => renderRoomCard(room, false))}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 14,
        }}>Your Rooms</div>
        {yourRooms.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>
            No rooms created yet.{' '}
            <button
              onClick={() => { setRoomName(''); setRoomDesc(''); setIsPublic(true); setMaxMembers(20); setCreateError(''); setCreateOpen(true) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 14, padding: 0 }}
            >
              Create your first room →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {yourRooms.map(room => renderRoomCard(room, true))}
          </div>
        )}
      </div>
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
              maxHeight: 'calc(100dvh - 120px)',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>Create a Room</h2>
              <button onClick={() => setCreateOpen(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                cursor: 'pointer', padding: 0, display: 'flex',
              }}><X size={20} /></button>
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
                        fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
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
              maxHeight: 'calc(100dvh - 120px)',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>Join with Code</h2>
              <button onClick={() => setJoinOpen(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                cursor: 'pointer', padding: 0, display: 'flex',
              }}><X size={20} /></button>
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
