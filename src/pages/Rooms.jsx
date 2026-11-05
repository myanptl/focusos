import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Database, Trash2, ArrowRight } from 'lucide-react'

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

const SPRING = { type: 'spring', stiffness: 500, damping: 40 }

export default function Rooms() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)

  const [roomName, setRoomName] = useState('')
  const [roomDesc, setRoomDesc] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [maxMembers, setMaxMembers] = useState(20)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

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

    setJoinCode('')
    navigate(`/rooms/${data.id}`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <span className="spinner" />
      </div>
    )
  }

  if (tableError) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <Database size={16} strokeWidth={1.6} color="var(--muted)" />
        <h2 style={{ fontSize: 18, marginTop: 12, marginBottom: 8 }}>Database setup required</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
          The Study Rooms tables don&apos;t exist yet. Run the Rooms migration SQL in your Supabase dashboard to get started.
        </p>
      </div>
    )
  }

  const publicRooms = rooms.filter(r => r.created_by === 'system')
  const yourRooms = rooms.filter(r => r.created_by === user?.id)

  function openCreate() {
    setRoomName(''); setRoomDesc(''); setIsPublic(true); setMaxMembers(20); setCreateError(''); setCreateOpen(true)
  }

  function renderRoomRow(room, showDelete) {
    const onlineMembers = (room.room_members || []).filter(m => isOnline(m.last_seen))
    const focusingCount = onlineMembers.filter(m => m.is_focusing).length
    const onlineCount = onlineMembers.length

    return (
      <motion.li
        key={room.id}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={SPRING}
        style={{ listStyle: 'none', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <button
          onClick={() => navigate(`/rooms/${room.id}`)}
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
            font: 'inherit', color: 'inherit', textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{room.name}</div>
            {room.description && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {room.description}
              </div>
            )}
          </div>
          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
            {focusingCount > 0 && (
              <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} aria-hidden="true" />
            )}
            {focusingCount > 0 ? `${focusingCount} focusing` : `${onlineCount} online`}
          </span>
          <ArrowRight size={14} strokeWidth={1.6} color="var(--faint)" style={{ flexShrink: 0 }} />
        </button>
        {showDelete && (
          <button
            className="btn-quiet"
            onClick={() => handleDeleteRoom(room.id)}
            title="Delete room"
            aria-label={`Delete ${room.name}`}
          >
            <Trash2 size={14} strokeWidth={1.6} />
          </button>
        )}
      </motion.li>
    )
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Study rooms</h1>
        <p>Silent co-working. See who is focusing and work alongside them.</p>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
        <input
          placeholder="Room code"
          aria-label="Room code"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
          maxLength={6}
          onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
          className="mono code-input"
          style={{ width: 150, height: 38 }}
        />
        <button className="btn btn-ghost" disabled={!joinCode.trim() || joining} onClick={handleJoinWithCode}>
          {joining ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Join'}
        </button>
        <button className="btn btn-accent" onClick={openCreate} style={{ marginLeft: 'auto' }}>
          New room
        </button>
      </div>

      <section style={{ marginBottom: 40 }}>
        <div className="label" style={{ marginBottom: 8 }}>Public</div>
        <ul style={{ borderBottom: '1px solid var(--hairline)' }}>
          <AnimatePresence initial={false}>
            {publicRooms.map(room => renderRoomRow(room, false))}
          </AnimatePresence>
        </ul>
      </section>

      <section>
        <div className="label" style={{ marginBottom: 8 }}>Yours</div>
        {yourRooms.length === 0 ? (
          <div style={{ borderTop: '1px solid var(--hairline)', padding: '16px 0', fontSize: 14, color: 'var(--muted)' }}>
            No rooms yet.{' '}
            <button className="btn-quiet" onClick={openCreate} style={{ padding: 0, color: 'var(--text)' }}>
              Create one
            </button>
          </div>
        ) : (
          <ul style={{ borderBottom: '1px solid var(--hairline)' }}>
            <AnimatePresence initial={false}>
              {yourRooms.map(room => renderRoomRow(room, true))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-room-title" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 id="create-room-title" style={{ fontSize: 16 }}>New room</h2>
              <button className="btn-quiet" onClick={() => setCreateOpen(false)} aria-label="Close"><X size={16} strokeWidth={1.6} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label" htmlFor="room-name" style={{ display: 'block', marginBottom: 6 }}>Name</label>
                <input
                  id="room-name"
                  placeholder="e.g. Late Night Grind"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  maxLength={60}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                />
              </div>

              <div>
                <label className="label" htmlFor="room-desc" style={{ display: 'block', marginBottom: 6 }}>
                  Description <span style={{ color: 'var(--faint)', textTransform: 'none', letterSpacing: 0 }}>optional</span>
                </label>
                <input
                  id="room-desc"
                  placeholder="What's this room for?"
                  value={roomDesc}
                  onChange={e => setRoomDesc(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div>
                <div className="label" style={{ marginBottom: 6 }}>Visibility</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ label: 'Public', val: true }, { label: 'Private', val: false }].map(opt => (
                    <button
                      key={String(opt.val)}
                      className={`pill${isPublic === opt.val ? ' active' : ''}`}
                      onClick={() => setIsPublic(opt.val)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 6 }}>Max members</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[5, 10, 20].map(n => (
                    <button
                      key={n}
                      className={`pill mono${maxMembers === n ? ' active' : ''}`}
                      onClick={() => setMaxMembers(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <div style={{ fontSize: 13, color: 'var(--red)', lineHeight: 1.5 }}>{createError}</div>
              )}

              <button
                className="btn btn-accent btn-full"
                style={{ marginTop: 4 }}
                disabled={!roomName.trim() || creating}
                onClick={handleCreateRoom}
              >
                {creating ? <span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--on-accent)' }} /> : 'Create room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
