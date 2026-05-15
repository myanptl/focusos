import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

const SUBJECTS = ['Science', 'History', 'English', 'Math', 'Other']
const SUBJECT_COLORS = {
  Science: '#4ade80', History: '#fb923c', English: '#60d3f8',
  Math: '#a78bfa', Other: '#9494a0',
}
const SUBJECT_ICONS = {
  Science: '🔬', History: '📜', English: '📖', Math: '📐', Other: '✏️',
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
  const [isMobile,       setIsMobile]       = useState(window.innerWidth < 768)

  const textareaRef = useRef(null)
  const timerRef    = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Load notes ───────────────────────────────────────────
  useEffect(() => {
    const loadNotes = async () => {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      setNotes(data || [])
      setListLoading(false)
    }
    if (user) loadNotes()
  }, [user])

  // ── Debounced save ───────────────────────────────────────
  const debouncedSave = (note) => {
    clearTimeout(timerRef.current)
    setSaveStatus('unsaved')
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      const now = new Date().toISOString()
      await supabase.from('notes').update({
        title:      note.title,
        content:    note.content,
        subject:    note.subject,
        word_count: note.word_count,
        updated_at: now,
      }).eq('id', note.id)
      setNotes(prev => prev.map(n =>
        n.id === note.id ? { ...n, ...note, updated_at: now } : n
      ))
      setSaveStatus('saved')
    }, 3000)
  }

  // ── Create note ──────────────────────────────────────────
  const handleNewNote = async () => {
    const newNote = {
      id:         crypto.randomUUID(),
      title:      'Untitled Note',
      content:    '',
      subject:    'Other',
      word_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id:    user.id,
    }
    const { data } = await supabase.from('notes').insert(newNote).select().single()
    const saved = data || newNote
    setNotes(prev => [saved, ...prev])
    setSelectedNote(saved)
    setSaveStatus('saved')
    setSummaryPanel(null)
  }

  // ── Open note ────────────────────────────────────────────
  const openNote = (note) => {
    clearTimeout(timerRef.current)
    setSelectedNote(note)
    setSaveStatus('saved')
    setSummaryPanel(null)
  }

  // ── Delete note ──────────────────────────────────────────
  const deleteNote = async (note, e) => {
    e?.stopPropagation()
    await supabase.from('notes').delete().eq('id', note.id)
    setNotes(prev => prev.filter(n => n.id !== note.id))
    if (selectedNote?.id === note.id) setSelectedNote(null)
    toast('Note deleted', 'info')
  }

  // ── Cursor insertion ─────────────────────────────────────
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
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function renderMarkdown(text) {
    return escapeHTML(text || '')
      .replace(/^### (.*)/gm, '<h3 style="font-size:16px;font-weight:700;color:white;margin:14px 0 6px">$1</h3>')
      .replace(/^## (.*)/gm,  '<h2 style="font-size:20px;font-weight:700;color:white;margin:16px 0 8px">$1</h2>')
      .replace(/^# (.*)/gm,   '<h1 style="font-size:24px;font-weight:700;color:white;margin:20px 0 10px">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:white;font-weight:700">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#c0c0cc">$1</em>')
      .replace(/^- (.*)/gm, '<li style="margin:4px 0 4px 16px;color:#f0f0f2;list-style:disc">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
  }

  // ── Summarize ────────────────────────────────────────────
  const handleSummarize = async () => {
    if (!selectedNote?.content?.trim()) return
    setSummaryLoading(true)
    setSummaryPanel(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res  = await fetch('/api/summarize-note', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:    JSON.stringify({ text: selectedNote.content, subject: selectedNote.subject }),
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

  // ── Export ───────────────────────────────────────────────
  const exportAs = (format) => {
    setExportOpen(false)
    if (!selectedNote) return
    const formatted = `# ${selectedNote.title || 'Untitled Note'}\nSubject: ${selectedNote.subject}\n\n${selectedNote.content}`
    if (format === 'copy-plain') {
      navigator.clipboard.writeText(selectedNote.content)
      toast('Copied to clipboard!', 'success')
      return
    }
    if (format === 'copy-formatted') {
      navigator.clipboard.writeText(formatted)
      toast('Copied formatted text!', 'success')
      return
    }
    const ext  = format === 'md' ? '.md' : '.txt'
    const blob = new Blob([formatted], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${selectedNote.title || 'note'}${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  // ── Derived ──────────────────────────────────────────────
  const filtered   = notes.filter(n => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
  })
  const wordCount  = selectedNote?.content?.trim().split(/\s+/).filter(Boolean).length || 0

  // ── Render ───────────────────────────────────────────────
  return (
    <div
      className="page-fade"
      style={{ display: 'flex', margin: isMobile ? '-16px -12px' : '-28px -24px', height: 'calc(100vh - 60px)', overflow: 'hidden' }}
    >
      {/* ── LEFT PANEL ── */}
      <div style={{
        width: isMobile ? '100%' : 280, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        background: 'transparent',
        display: isMobile && selectedNote ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="bebas" style={{ fontSize: 20, letterSpacing: 3, color: 'var(--accent)' }}>STUDY NOTES</div>
            <button className="btn btn-accent btn-sm" onClick={handleNewNote} style={{ fontSize: 12, padding: '4px 10px' }}>
              + New
            </button>
          </div>
          <input
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', fontSize: 13, padding: '7px 10px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {listLoading ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <span className="spinner" style={{ width: 20, height: 20 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              {notes.length === 0 ? (
                <>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>No notes yet</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                    Create your first note to get started
                  </div>
                  <button className="btn btn-accent btn-sm" onClick={handleNewNote}>New Note</button>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>No notes match "{search}"</div>
              )}
            </div>
          ) : filtered.map(note => (
            <div
              key={note.id}
              onClick={() => openNote(note)}
              style={{
                padding: '10px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3,
                background: selectedNote?.id === note.id ? 'rgba(181,242,58,0.08)' : 'transparent',
                border: `1px solid ${selectedNote?.id === note.id ? 'rgba(181,242,58,0.25)' : 'transparent'}`,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (selectedNote?.id !== note.id) e.currentTarget.style.background = 'var(--card2)' }}
              onMouseLeave={e => { if (selectedNote?.id !== note.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: `${SUBJECT_COLORS[note.subject] || '#9494a0'}22`,
                  color: SUBJECT_COLORS[note.subject] || '#9494a0',
                  border: `1px solid ${SUBJECT_COLORS[note.subject] || '#9494a0'}44`,
                }}>
                  {SUBJECT_ICONS[note.subject] || '✏️'} {note.subject || 'Other'}
                </span>
                <button
                  onClick={e => deleteNote(note, e)}
                  style={{
                    background: 'none', border: 'none', color: 'transparent',
                    cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1,
                    transition: 'color 0.15s', fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
                >✕</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>
                {note.title || 'Untitled Note'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, lineHeight: 1.4 }}>
                {(note.content || '').slice(0, 60)}{(note.content || '').length > 60 ? '…' : ''}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(148,148,160,0.5)' }}>
                {relativeDate(note.updated_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      {selectedNote ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Mobile back button */}
          {isMobile && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => setSelectedNote(null)}
                style={{
                  background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, padding: 0, fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >← All Notes</button>
            </div>
          )}

          {/* Subject bar + save status */}
          <div style={{
            padding: '8px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => {
                  const updated = { ...selectedNote, subject: s }
                  setSelectedNote(updated)
                  debouncedSave(updated)
                }} style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, cursor: 'pointer',
                  background: selectedNote.subject === s ? `${SUBJECT_COLORS[s]}22` : 'transparent',
                  border: `1px solid ${selectedNote.subject === s ? SUBJECT_COLORS[s] : 'var(--border)'}`,
                  color: selectedNote.subject === s ? SUBJECT_COLORS[s] : 'var(--muted)',
                  transition: 'all 0.12s',
                }}>
                  {SUBJECT_ICONS[s]} {s}
                </button>
              ))}
            </div>
            <div style={{
              fontSize: 11,
              color: saveStatus === 'saved' ? 'var(--muted)' : 'var(--amber)',
            }}>
              {saveStatus === 'saving' ? '⏳ Saving...' : saveStatus === 'unsaved' ? '● Unsaved' : '✓ Saved'}
            </div>
          </div>

          {/* Toolbar */}
          <div style={{
            padding: '7px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => navigate('/quiz', { state: { prefillNotes: selectedNote.content, prefillSubject: selectedNote.subject } })}
              disabled={!selectedNote.content?.trim()} style={{ fontSize: 12 }}>
              🧠 Generate Quiz
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleSummarize}
              disabled={summaryLoading || !selectedNote.content?.trim()} style={{ fontSize: 12 }}>
              {summaryLoading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span className="spinner" style={{ width: 12, height: 12 }} /> Summarizing...</span>
                : '📊 Summarize'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreviewMode(m => !m)} style={{ fontSize: 12 }}>
              {previewMode ? '✏️ Edit' : '👁 Preview'}
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => deleteNote(selectedNote)}
                title="Delete note"
                style={{ fontSize: 13, color: 'var(--muted)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >🗑</button>

              <button className="btn btn-ghost btn-sm" onClick={() => setExportOpen(o => !o)} style={{ fontSize: 12 }}>
                ⬇️ Export
              </button>
              {exportOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setExportOpen(false)} />
                  <div style={{
                    position: 'absolute', top: 36, right: 0, zIndex: 99,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 6, minWidth: 190,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}>
                    {[
                      { id: 'copy-plain',     label: 'Copy as Text' },
                      { id: 'copy-formatted', label: 'Copy formatted' },
                      { id: 'txt',            label: 'Download as .txt' },
                      { id: 'md',             label: 'Download as .md' },
                    ].map(opt => (
                      <button key={opt.id} onClick={() => exportAs(opt.id)} style={{
                        display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6,
                        background: 'transparent', border: 'none', color: 'var(--text)',
                        fontSize: 13, cursor: 'pointer', textAlign: 'left',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Editor area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: isMobile && summaryPanel ? 'column' : 'row', gap: 20, background: 'transparent' }}>
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
                  fontSize: 28, fontWeight: 800, background: 'transparent', border: 'none',
                  outline: 'none', color: 'var(--text)', marginBottom: 18, padding: 0,
                  fontFamily: "'DM Sans', sans-serif", width: '100%',
                  letterSpacing: '-0.02em',
                }}
              />
              {previewMode ? (
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }}
                  style={{
                    flex: 1, minHeight: 360, fontSize: 14, lineHeight: 1.75,
                    color: '#f0f0f2', padding: 0,
                  }}
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
                  placeholder="Start writing... Use ## for headers, **text** for bold, - for bullets"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none', color: 'var(--text)', fontSize: 14, lineHeight: 1.75,
                    fontFamily: "'DM Sans', sans-serif", minHeight: 360,
                    padding: 0, width: '100%',
                  }}
                />
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Inline summary panel */}
            {summaryPanel && (
              <div style={{
                width: isMobile ? '100%' : 260, flexShrink: 0,
                padding: 16, background: 'var(--card)',
                borderRadius: 12, border: '1px solid var(--border)',
                overflowY: 'auto', alignSelf: 'flex-start',
                position: isMobile ? 'relative' : 'sticky', top: 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--accent)' }}>SUMMARY</div>
                  <button onClick={() => setSummaryPanel(null)} style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: 0,
                  }}>✕</button>
                </div>
                {summaryPanel.summary && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
                    {summaryPanel.summary}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                  {(summaryPanel.keyPoints || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
                      <span style={{ fontSize: 12, lineHeight: 1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn btn-accent btn-sm" style={{ fontSize: 12 }} onClick={() => {
                    const txt     = `## Summary\n\n${summaryPanel.summary || ''}\n\n## Key Points\n\n${(summaryPanel.keyPoints || []).map(p => `- ${p}`).join('\n')}`
                    const updated = { ...selectedNote, content: txt }
                    setSelectedNote(updated)
                    debouncedSave(updated)
                    setSummaryPanel(null)
                    toast('Note replaced with summary.', 'success')
                  }}>Replace with summary</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => {
                    const txt     = `\n\n## Summary\n\n${summaryPanel.summary || ''}\n\n## Key Points\n\n${(summaryPanel.keyPoints || []).map(p => `- ${p}`).join('\n')}`
                    const updated = { ...selectedNote, content: selectedNote.content + txt }
                    setSelectedNote(updated)
                    debouncedSave(updated)
                    setSummaryPanel(null)
                    toast('Summary appended.', 'success')
                  }}>Add to note</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 52 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select a note to start editing</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>or</div>
          <button className="btn btn-accent" onClick={handleNewNote}>+ New Note</button>
        </div>
      )}
    </div>
  )
}
