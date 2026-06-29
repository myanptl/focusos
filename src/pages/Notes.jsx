import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import {
  X, FlaskConical, Scroll, BookOpen, Calculator, Pencil,
  FileText, Brain, BarChart2, Download, Eye, Edit2, Check,
  Trash2, Search, Plus,
} from 'lucide-react'

const SUBJECTS = ['Science', 'History', 'English', 'Math', 'Other']
const SUBJECT_COLORS = {
  Science: '#4ade80', History: '#fb923c', English: 'var(--cyan)',
  Math: 'var(--purple)', Other: 'var(--muted)',
}
const SUBJECT_ICONS = {
  Science: FlaskConical, History: Scroll, English: BookOpen,
  Math: Calculator, Other: Pencil,
}

function relativeDate(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  if (days < 7)  return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Notes() {
  const { user } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  const [notes,          setNotes]          = useState([])
  const [selectedNote,   setSelectedNote]   = useState(null)
  const [search,         setSearch]         = useState('')
  const [listLoading,    setListLoading]    = useState(true)
  const [saveStatus,     setSaveStatus]     = useState('saved')
  const [exportOpen,     setExportOpen]     = useState(false)
  const [summaryPanel,   setSummaryPanel]   = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [previewMode,    setPreviewMode]    = useState(false)
  const [searchFocused,  setSearchFocused]  = useState(false)

  const textareaRef = useRef(null)
  const timerRef    = useRef(null)

  useEffect(() => {
    const loadNotes = async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, user_id, title, content, subject, word_count, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      setNotes(data || [])
      setListLoading(false)
    }
    if (user) loadNotes()
  }, [user])

  const debouncedSave = (note) => {
    clearTimeout(timerRef.current)
    setSaveStatus('unsaved')
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      const now = new Date().toISOString()
      await supabase.from('notes').update({
        title: note.title, content: note.content,
        subject: note.subject, word_count: note.word_count,
        updated_at: now,
      }).eq('id', note.id)
      setNotes(prev => prev.map(n =>
        n.id === note.id ? { ...n, ...note, updated_at: now } : n
      ))
      setSaveStatus('saved')
    }, 3000)
  }

  const handleNewNote = async () => {
    const newNote = {
      id: crypto.randomUUID(), title: 'Untitled Note', content: '',
      subject: 'Other', word_count: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      user_id: user.id,
    }
    const { data } = await supabase.from('notes').insert(newNote).select().single()
    const saved = data || newNote
    setNotes(prev => [saved, ...prev])
    setSelectedNote(saved)
    setSaveStatus('saved')
    setSummaryPanel(null)
  }

  const openNote = (note) => {
    clearTimeout(timerRef.current)
    setSelectedNote(note)
    setSaveStatus('saved')
    setSummaryPanel(null)
  }

  const deleteNote = async (note, e) => {
    e?.stopPropagation()
    await supabase.from('notes').delete().eq('id', note.id)
    setNotes(prev => prev.filter(n => n.id !== note.id))
    if (selectedNote?.id === note.id) setSelectedNote(null)
    toast('Note deleted', 'info')
  }

  const insertAtCursor = (before, after = '') => {
    const ta = textareaRef.current
    if (!ta || !selectedNote) return
    const start    = ta.selectionStart
    const end      = ta.selectionEnd
    const text     = selectedNote.content || ''
    const selected = text.substring(start, end)
    const newText  = text.substring(0, start) + before + selected + after + text.substring(end)
    const updated  = { ...selectedNote, content: newText }
    setSelectedNote(updated)
    debouncedSave(updated)
    setTimeout(() => {
      ta.selectionStart = start + before.length
      ta.selectionEnd   = start + before.length + selected.length
      ta.focus()
    }, 0)
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  function renderMarkdown(text) {
    return escapeHTML(text || '')
      .replace(/^### (.*)/gm, '<h3 style="font-size:16px;font-weight:700;color:white;margin:14px 0 6px">$1</h3>')
      .replace(/^## (.*)/gm,  '<h2 style="font-size:20px;font-weight:700;color:white;margin:16px 0 8px">$1</h2>')
      .replace(/^# (.*)/gm,   '<h1 style="font-size:24px;font-weight:700;color:white;margin:20px 0 10px">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:white;font-weight:700">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#c0c0cc">$1</em>')
      .replace(/^- (.*)/gm, '<li style="margin:4px 0 4px 16px;color:#f0f0f2;list-style:disc">$1</li>')
      .replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>')
  }

  const handleSummarize = async () => {
    if (!selectedNote?.content?.trim()) return
    setSummaryLoading(true)
    setSummaryPanel(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res   = await fetch('/api/summarize-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:   JSON.stringify({ text: selectedNote.content, subject: selectedNote.subject }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Summarization failed.')
      setSummaryPanel(data)
    } catch (err) {
      toast(err.message || 'Summarization failed.', 'error')
    } finally {
      setSummaryLoading(false)
    }
  }

  const exportAs = (format) => {
    setExportOpen(false)
    if (!selectedNote) return
    const formatted = `# ${selectedNote.title || 'Untitled Note'}\nSubject: ${selectedNote.subject}\n\n${selectedNote.content}`
    if (format === 'copy-plain')     { navigator.clipboard.writeText(selectedNote.content); toast('Copied!', 'success'); return }
    if (format === 'copy-formatted') { navigator.clipboard.writeText(formatted); toast('Copied formatted!', 'success'); return }
    const ext  = format === 'md' ? '.md' : '.txt'
    const blob = new Blob([formatted], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${selectedNote.title || 'note'}${ext}`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  const filtered  = notes.filter(n => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
  })
  const wordCount = selectedNote?.content?.trim().split(/\s+/).filter(Boolean).length || 0

  const toolbarButtons = [
    { label: 'B',  title: 'Bold',    action: () => insertAtCursor('**', '**'), mono: true,   fw: 700 },
    { label: 'I',  title: 'Italic',  action: () => insertAtCursor('*', '*'),   mono: true,   italic: true },
    { label: 'H',  title: 'Heading', action: () => insertAtCursor('## '),      mono: true,   fw: 700 },
    { label: '—',  title: 'Divider', action: () => insertAtCursor('\n---\n'),  mono: true },
    { label: '•',  title: 'Bullet',  action: () => insertAtCursor('- '),       mono: false,  fs: 20 },
  ]

  return (
    <div className="page-fade" style={{
      display: 'flex', margin: '-28px -24px',
      height: 'calc(100dvh - 60px)', overflow: 'hidden', position: 'relative',
    }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
      <div className="notes-sidebar" style={{
        width: 290, flexShrink: 0,
        background: 'var(--card)',
        backgroundImage: 'linear-gradient(90deg, rgba(181,242,58,0.055) 0%, transparent 30%), linear-gradient(160deg, rgba(255,255,255,0.028) 0%, transparent 55%)',
        borderLeft: '2px solid var(--accent)',
        borderRight: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 4px 0 28px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '22px 16px 14px' }}>
          <div className="bebas" style={{
            fontSize: 30, letterSpacing: 4, color: 'var(--accent)',
            marginBottom: 16, lineHeight: 1,
          }}>NOTES</div>

          {/* Search */}
          <div style={{
            position: 'relative', marginBottom: 12,
            background: 'var(--card2)',
            border: searchFocused
              ? '1px solid rgba(181,242,58,0.45)'
              : '1px solid rgba(255,255,255,0.09)',
            borderRadius: 10,
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: searchFocused ? '0 0 0 3px rgba(181,242,58,0.09)' : 'none',
          }}>
            <Search size={13} color="var(--muted)" style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none',
            }} />
            <input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%', fontSize: 13, padding: '8px 10px 8px 30px',
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* New Note */}
          <button className="btn btn-ghost btn-full" onClick={handleNewNote}
            style={{ border: '1px solid rgba(181,242,58,0.35)', color: 'var(--accent)' }}
          >
            <Plus size={14} />New Note
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.09)' }} />

        {/* Note list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 12px' }}>
          {listLoading ? (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <span className="spinner" style={{ width: 20, height: 20 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              {notes.length === 0 ? (
                <>
                  <FileText size={36} color="rgba(181,242,58,0.3)" style={{ marginBottom: 14 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>No notes yet</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
                    Hit New Note to start writing
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  No results for "{search}"
                </div>
              )}
            </div>
          ) : filtered.map(note => {
            const isActive  = selectedNote?.id === note.id
            const subColor  = SUBJECT_COLORS[note.subject] || 'var(--muted)'
            const SubIcon   = SUBJECT_ICONS[note.subject] || Pencil
            return (
              <div
                key={note.id}
                onClick={() => openNote(note)}
                style={{
                  padding: '11px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                  background: isActive ? 'rgba(181,242,58,0.08)' : 'var(--card)',
                  backgroundImage: isActive
                    ? 'linear-gradient(90deg, rgba(181,242,58,0.08) 0%, transparent 35%)'
                    : 'linear-gradient(90deg, rgba(181,242,58,0.03) 0%, transparent 35%), linear-gradient(160deg, rgba(255,255,255,0.018) 0%, transparent 55%)',
                  border: `1px solid ${isActive ? 'rgba(181,242,58,0.25)' : 'rgba(255,255,255,0.09)'}`,
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'rgba(181,242,58,0.25)'}`,
                  boxShadow: isActive
                    ? '0 0 0 rgba(181,242,58,0), 0 1px 0 rgba(255,255,255,0.05) inset'
                    : '0 1px 0 rgba(255,255,255,0.04) inset',
                  transition: 'all 0.13s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--card2)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
                    e.currentTarget.style.borderLeftColor = 'rgba(181,242,58,0.5)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--card)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
                    e.currentTarget.style.borderLeftColor = 'rgba(181,242,58,0.25)'
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                    background: `${subColor}18`, color: subColor,
                    border: `1px solid ${subColor}33`,
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                    <SubIcon size={9} />{note.subject || 'Other'}
                  </span>
                  <button
                    onClick={e => deleteNote(note, e)}
                    style={{
                      background: 'none', border: 'none', color: 'transparent',
                      cursor: 'pointer', padding: '0 2px', display: 'flex',
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
                  ><X size={12} /></button>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.35,
                  color: isActive ? 'var(--text)' : 'rgba(240,240,242,0.85)',
                }}>
                  {note.title || 'Untitled Note'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, lineHeight: 1.4 }}>
                  {(note.content || '').slice(0, 55)}{(note.content || '').length > 55 ? '…' : ''}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(148,148,160,0.4)' }}>
                  {relativeDate(note.updated_at)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────────── */}
      {selectedNote ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* Grain texture overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.022,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat', backgroundSize: '200px 200px',
          }} />

          {/* Subject pill bar */}
          <div style={{
            padding: '9px 28px', borderBottom: '1px solid rgba(181,242,58,0.07)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 1,
            background: 'rgba(10,10,11,0.65)', backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {SUBJECTS.map(s => {
                const sc     = SUBJECT_COLORS[s]
                const SI     = SUBJECT_ICONS[s] || Pencil
                const active = selectedNote.subject === s
                return (
                  <button key={s} onClick={() => {
                    const updated = { ...selectedNote, subject: s }
                    setSelectedNote(updated)
                    debouncedSave(updated)
                  }} style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 11px',
                    borderRadius: 20, cursor: 'pointer',
                    background: active ? `${sc}1a` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? sc + '44' : 'rgba(255,255,255,0.07)'}`,
                    color: active ? sc : 'var(--muted)',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    transition: 'all 0.12s', fontFamily: "'Outfit', sans-serif",
                  }}>
                    <SI size={10} />{s}
                  </button>
                )
              })}
            </div>
            <div style={{
              fontSize: 11,
              color: saveStatus === 'saved' ? 'rgba(148,148,160,0.6)' : 'var(--amber)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {saveStatus === 'saving'
                ? <><span className="spinner" style={{ width: 10, height: 10 }} />Saving</>
                : saveStatus === 'unsaved'
                ? <>● Unsaved</>
                : <><Check size={10} />Saved</>}
            </div>
          </div>

          {/* Formatting toolbar */}
          <div style={{
            padding: '6px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap',
            background: 'rgba(10,10,11,0.45)', position: 'relative', zIndex: 1,
          }}>
            {toolbarButtons.map(btn => (
              <button key={btn.label} onClick={btn.action} title={btn.title} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 7, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)', cursor: 'pointer',
                fontSize: btn.fs || 12,
                fontStyle: btn.italic ? 'italic' : 'normal',
                fontWeight: btn.fw || 400,
                fontFamily: btn.mono ? "'JetBrains Mono', monospace" : "'Outfit', sans-serif",
                transition: 'all 0.12s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(181,242,58,0.09)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.borderColor = 'rgba(181,242,58,0.22)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = 'var(--muted)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                }}
              >
                {btn.label}
              </button>
            ))}

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/quiz', { state: { prefillNotes: selectedNote.content, prefillSubject: selectedNote.subject } })}
              disabled={!selectedNote.content?.trim()}
              style={{ fontSize: 12 }}
            >
              <Brain size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Quiz
            </button>

            <button className="btn btn-ghost btn-sm" onClick={() => setPreviewMode(m => !m)} style={{ fontSize: 12 }}>
              {previewMode
                ? <><Edit2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Edit</>
                : <><Eye size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Preview</>}
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => deleteNote(selectedNote)}
                style={{ fontSize: 13, color: 'var(--muted)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                <Trash2 size={13} />
              </button>

              <button className="btn btn-ghost btn-sm" onClick={() => setExportOpen(o => !o)} style={{ fontSize: 12 }}>
                <Download size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Export
              </button>

              {exportOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setExportOpen(false)} />
                  <div style={{
                    position: 'absolute', top: 36, right: 0, zIndex: 99,
                    background: 'rgba(14,14,16,0.96)', backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 12, padding: 6, minWidth: 190,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}>
                    {[
                      { id: 'copy-plain',     label: 'Copy as Text' },
                      { id: 'copy-formatted', label: 'Copy Formatted' },
                      { id: 'txt',            label: 'Download .txt' },
                      { id: 'md',             label: 'Download .md' },
                    ].map(opt => (
                      <button key={opt.id} onClick={() => exportAs(opt.id)} style={{
                        display: 'block', width: '100%', padding: '8px 12px',
                        borderRadius: 7, background: 'transparent', border: 'none',
                        color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                        textAlign: 'left', fontFamily: "'Outfit', sans-serif",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >{opt.label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Editor area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '36px 44px 24px',
            display: 'flex', gap: 26, position: 'relative', zIndex: 1,
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <input
                value={selectedNote.title || ''}
                onChange={e => {
                  const updated = { ...selectedNote, title: e.target.value }
                  setSelectedNote(updated)
                  debouncedSave(updated)
                }}
                placeholder="Untitled Note"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  fontWeight: 400, letterSpacing: '0.04em',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text)', marginBottom: 28, padding: 0,
                  width: '100%', lineHeight: 1.05,
                }}
              />
              {previewMode ? (
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }}
                  style={{ flex: 1, minHeight: 360, fontSize: 15, lineHeight: 1.82, color: 'var(--text)' }}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={selectedNote.content || ''}
                  onChange={e => {
                    const updated = {
                      ...selectedNote,
                      content:    e.target.value,
                      word_count: e.target.value.trim().split(/\s+/).filter(Boolean).length,
                    }
                    setSelectedNote(updated)
                    debouncedSave(updated)
                  }}
                  placeholder="Start writing...   ## Heading   **bold**   - bullet"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none', color: 'var(--text)', fontSize: 15, lineHeight: 1.82,
                    fontFamily: "'Outfit', sans-serif", minHeight: 420, padding: 0, width: '100%',
                  }}
                />
              )}
            </div>

            {/* Summary panel */}
            {summaryPanel && (
              <div style={{
                width: 272, flexShrink: 0, padding: '18px 18px',
                background: 'rgba(14,14,16,0.92)', backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderRadius: 14, border: '1px solid rgba(181,242,58,0.14)',
                overflowY: 'auto', alignSelf: 'flex-start', position: 'sticky', top: 0,
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(181,242,58,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--accent)' }}>
                    AI SUMMARY
                  </div>
                  <button onClick={() => setSummaryPanel(null)} style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                    padding: 0, display: 'flex',
                  }}><X size={15} /></button>
                </div>
                {summaryPanel.summary && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 14 }}>
                    {summaryPanel.summary}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {(summaryPanel.keyPoints || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)',
                        flexShrink: 0, marginTop: 7,
                      }} />
                      <span style={{ fontSize: 13, lineHeight: 1.55 }}>{p}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn btn-accent btn-sm" style={{ fontSize: 12 }} onClick={() => {
                    const txt = `## Summary\n\n${summaryPanel.summary || ''}\n\n## Key Points\n\n${(summaryPanel.keyPoints || []).map(p => `- ${p}`).join('\n')}`
                    const updated = { ...selectedNote, content: txt }
                    setSelectedNote(updated); debouncedSave(updated); setSummaryPanel(null)
                    toast('Note replaced with summary.', 'success')
                  }}>Replace with summary</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => {
                    const txt = `\n\n## Summary\n\n${summaryPanel.summary || ''}\n\n## Key Points\n\n${(summaryPanel.keyPoints || []).map(p => `- ${p}`).join('\n')}`
                    const updated = { ...selectedNote, content: selectedNote.content + txt }
                    setSelectedNote(updated); debouncedSave(updated); setSummaryPanel(null)
                    toast('Summary appended.', 'success')
                  }}>Add to note</button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{
            padding: '10px 44px', borderTop: '1px solid rgba(181,242,58,0.07)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(10,10,11,0.65)', backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)', position: 'relative', zIndex: 1,
          }}>
            <span style={{
              fontSize: 12, color: 'rgba(148,148,160,0.5)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-accent btn-sm"
              onClick={handleSummarize}
              disabled={summaryLoading || !selectedNote.content?.trim()}
              style={{ fontSize: 12 }}
            >
              {summaryLoading
                ? <><span className="spinner" style={{ width: 11, height: 11 }} />Summarizing…</>
                : <><BarChart2 size={12} />AI Summarize</>}
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 14, position: 'relative', zIndex: 1,
        }}>
          <div style={{ position: 'relative', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', width: 88, height: 88, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(181,242,58,0.14) 0%, transparent 70%)',
              filter: 'blur(10px)',
            }} />
            <FileText size={38} color="rgba(181,242,58,0.42)" style={{ position: 'relative' }} />
          </div>
          <div className="bebas" style={{ fontSize: 22, letterSpacing: 4, color: 'var(--text)' }}>
            SELECT A NOTE
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            or create a new one to start writing
          </div>
          <button className="btn btn-accent" onClick={handleNewNote} style={{ marginTop: 6 }}>
            <Plus size={14} />New Note
          </button>
        </div>
      )}
    </div>
  )
}
