import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FlaskConical, Scroll, BookOpen, Calculator, Pencil, FileText, Brain, BarChart2, Download, Eye, Edit2, Check, Trash2, Plus } from 'lucide-react'

const SUBJECTS = ['Science', 'History', 'English', 'Math', 'Other']
const SUBJECT_COLORS = {
  Science: '#4ade80', History: '#fb923c', English: '#60d3f8',
  Math: '#a78bfa', Other: '#9494a0',
}
const SUBJECT_ICONS = {
  Science: FlaskConical, History: Scroll, English: BookOpen, Math: Calculator, Other: Pencil,
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

/* Glass card shell */
const glass = (extra = {}) => ({
  background: 'rgba(255,255,255,0.032)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.05)',
  ...extra,
})

export default function NotesV2() {
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

  const textareaRef = useRef(null)
  const timerRef    = useRef(null)

  useEffect(() => {
    const loadNotes = async () => {
      const { data } = await supabase
        .from('notes').select('*').eq('user_id', user.id)
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
        subject: note.subject, word_count: note.word_count, updated_at: now,
      }).eq('id', note.id)
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, ...note, updated_at: now } : n))
      setSaveStatus('saved')
    }, 3000)
  }

  const handleNewNote = async () => {
    const newNote = {
      id: crypto.randomUUID(), title: 'Untitled Note', content: '', subject: 'Other',
      word_count: 0, created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), user_id: user.id,
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
    const start = ta.selectionStart, end = ta.selectionEnd
    const text = selectedNote.content || ''
    const selected = text.substring(start, end)
    const newText = text.substring(0, start) + before + selected + after + text.substring(end)
    const updated = { ...selectedNote, content: newText }
    setSelectedNote(updated)
    debouncedSave(updated)
    setTimeout(() => {
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + selected.length
      ta.focus()
    }, 0)
  }

  function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
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
      const res = await fetch('/api/summarize-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: selectedNote.content, subject: selectedNote.subject }),
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
    if (format === 'copy-plain') { navigator.clipboard.writeText(selectedNote.content); toast('Copied!', 'success'); return }
    if (format === 'copy-formatted') { navigator.clipboard.writeText(formatted); toast('Copied!', 'success'); return }
    const ext = format === 'md' ? '.md' : '.txt'
    const blob = new Blob([formatted], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${selectedNote.title || 'note'}${ext}`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  const filtered = notes.filter(n => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
  })
  const wordCount = selectedNote?.content?.trim().split(/\s+/).filter(Boolean).length || 0

  const subjectColor = SUBJECT_COLORS[selectedNote?.subject] || '#9494a0'

  /* ── Toolbar button helper ── */
  function ToolBtn({ onClick, disabled, children, active }) {
    return (
      <motion.button
        onClick={onClick} disabled={disabled}
        whileHover={disabled ? {} : { y: -1 }}
        whileTap={disabled ? {} : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
          border: active ? '1px solid rgba(181,242,58,0.35)' : '1px solid rgba(255,255,255,0.07)',
          background: active ? 'rgba(181,242,58,0.08)' : 'rgba(255,255,255,0.03)',
          color: active ? '#b5f23a' : disabled ? 'rgba(148,148,160,0.3)' : 'rgba(240,240,242,0.7)',
          transition: 'color 0.15s, border-color 0.15s, background 0.15s',
        }}
      >
        {children}
      </motion.button>
    )
  }

  return (
    <div style={{
      display: 'flex', margin: '-28px -24px',
      height: 'calc(100vh - 60px)', overflow: 'hidden',
    }}>

      {/* ── SIDEBAR ── */}
      <motion.div
        initial={{ x: -16, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 272, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(10,10,11,0.96)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '0.2em', color: '#b5f23a' }}>
              STUDY NOTES
            </div>
            <motion.button
              onClick={handleNewNote}
              whileHover={{ scale: 1.04, boxShadow: '0 4px 16px rgba(181,242,58,0.4)' }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                background: '#b5f23a', border: 'none', borderRadius: 8,
                padding: '5px 11px', fontSize: 12, fontWeight: 700, color: '#0a0a0b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                boxShadow: '0 2px 8px rgba(181,242,58,0.25)',
              }}
            >
              <Plus size={11} /> New
            </motion.button>
          </div>
          <input
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', fontSize: 13, padding: '7px 11px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: 'white', outline: 'none', fontFamily: "'Outfit', sans-serif",
            }}
          />
        </div>

        {/* Note list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {listLoading ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <span className="spinner" style={{ width: 20, height: 20 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              {notes.length === 0 ? (
                <>
                  <FileText size={36} color="rgba(148,148,160,0.25)" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'rgba(240,240,242,0.7)' }}>No notes yet</div>
                  <div style={{ fontSize: 12, color: 'rgba(148,148,160,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                    Create your first note to get started
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleNewNote}
                    style={{
                      background: '#b5f23a', border: 'none', borderRadius: 8,
                      padding: '7px 16px', fontSize: 13, fontWeight: 700, color: '#0a0a0b',
                      cursor: 'pointer',
                    }}
                  >
                    New Note
                  </motion.button>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'rgba(148,148,160,0.5)' }}>No results for "{search}"</div>
              )}
            </div>
          ) : filtered.map((note, idx) => {
            const SIcon = SUBJECT_ICONS[note.subject] || Pencil
            const sColor = SUBJECT_COLORS[note.subject] || '#9494a0'
            const isSelected = selectedNote?.id === note.id
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.035, 0.3), ease: [0.22, 1, 0.36, 1] }}
                onClick={() => openNote(note)}
                whileHover={!isSelected ? { x: 3, backgroundColor: 'rgba(255,255,255,0.04)' } : {}}
                style={{
                  padding: '10px 11px', borderRadius: 9, cursor: 'pointer', marginBottom: 2,
                  background: isSelected ? 'rgba(181,242,58,0.07)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(181,242,58,0.22)' : 'transparent'}`,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: `${sColor}18`, color: sColor, border: `1px solid ${sColor}33`,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <SIcon size={9} /> {note.subject || 'Other'}
                  </span>
                  <motion.button
                    onClick={e => deleteNote(note, e)}
                    whileHover={{ color: '#f25a5a' }}
                    style={{
                      background: 'none', border: 'none', color: 'transparent',
                      cursor: 'pointer', padding: '0 2px', display: 'flex',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f25a5a'}
                    onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
                  >
                    <X size={12} />
                  </motion.button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.3, color: isSelected ? '#f0f0f2' : 'rgba(240,240,242,0.8)' }}>
                  {note.title || 'Untitled Note'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(148,148,160,0.5)', lineHeight: 1.4, marginBottom: 4 }}>
                  {(note.content || '').slice(0, 55)}{(note.content || '').length > 55 ? '…' : ''}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(148,148,160,0.35)', display: 'flex', gap: 8 }}>
                  <span>{relativeDate(note.updated_at)}</span>
                  {note.word_count > 0 && <span>{note.word_count}w</span>}
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ── EDITOR ── */}
      <AnimatePresence mode="wait">
        {selectedNote ? (
          <motion.div
            key={selectedNote.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
          >
            {/* Subject bar */}
            <div style={{
              padding: '9px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 8, background: 'rgba(10,10,11,0.4)',
            }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {SUBJECTS.map(s => {
                  const SI = SUBJECT_ICONS[s] || Pencil
                  const sc = SUBJECT_COLORS[s] || '#9494a0'
                  const active = selectedNote.subject === s
                  return (
                    <motion.button key={s}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const updated = { ...selectedNote, subject: s }
                        setSelectedNote(updated)
                        debouncedSave(updated)
                      }}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: active ? `${sc}18` : 'transparent',
                        border: `1px solid ${active ? sc : 'rgba(255,255,255,0.07)'}`,
                        color: active ? sc : 'rgba(148,148,160,0.6)',
                        transition: 'all 0.12s',
                      }}
                    >
                      <SI size={10} /> {s}
                    </motion.button>
                  )
                })}
              </div>
              <div style={{
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
                color: saveStatus === 'saved' ? 'rgba(148,148,160,0.5)' : '#f2c75a',
              }}>
                {saveStatus === 'saving'
                  ? <><span className="spinner" style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle' }} /> Saving...</>
                  : saveStatus === 'unsaved'
                  ? '● Unsaved'
                  : <><Check size={11} /> Saved</>
                }
              </div>
            </div>

            {/* Toolbar */}
            <div style={{
              padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap',
              background: 'rgba(10,10,11,0.3)',
            }}>
              <ToolBtn
                onClick={() => navigate('/quiz', { state: { prefillNotes: selectedNote.content, prefillSubject: selectedNote.subject } })}
                disabled={!selectedNote.content?.trim()}
              >
                <Brain size={12} /> Quiz me
              </ToolBtn>
              <ToolBtn onClick={handleSummarize} disabled={summaryLoading || !selectedNote.content?.trim()}>
                {summaryLoading
                  ? <><span className="spinner" style={{ width: 11, height: 11 }} /> Summarizing...</>
                  : <><BarChart2 size={12} /> Summarize</>
                }
              </ToolBtn>
              <ToolBtn onClick={() => setPreviewMode(m => !m)} active={previewMode}>
                {previewMode ? <><Edit2 size={12} /> Edit</> : <><Eye size={12} /> Preview</>}
              </ToolBtn>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', position: 'relative' }}>
                <motion.button
                  whileHover={{ color: '#f25a5a' }} whileTap={{ scale: 0.92 }}
                  onClick={() => deleteNote(selectedNote)}
                  style={{
                    background: 'none', border: '1px solid transparent', borderRadius: 7,
                    padding: '5px 8px', cursor: 'pointer', display: 'flex',
                    color: 'rgba(148,148,160,0.5)', transition: 'color 0.15s',
                  }}
                >
                  <Trash2 size={13} />
                </motion.button>
                <ToolBtn onClick={() => setExportOpen(o => !o)} active={exportOpen}>
                  <Download size={12} /> Export
                </ToolBtn>
                {exportOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setExportOpen(false)} />
                    <div style={{
                      position: 'absolute', top: 36, right: 0, zIndex: 99,
                      ...glass({ borderRadius: 12, padding: 6, minWidth: 192 }),
                    }}>
                      {[
                        { id: 'copy-plain',     label: 'Copy as plain text' },
                        { id: 'copy-formatted', label: 'Copy with formatting' },
                        { id: 'txt',            label: 'Download .txt' },
                        { id: 'md',             label: 'Download .md' },
                      ].map(opt => (
                        <button key={opt.id} onClick={() => exportAs(opt.id)} style={{
                          display: 'block', width: '100%', padding: '8px 12px', borderRadius: 7,
                          background: 'transparent', border: 'none', color: 'rgba(240,240,242,0.8)',
                          fontSize: 13, cursor: 'pointer', textAlign: 'left',
                          fontFamily: "'Outfit', sans-serif", transition: 'background 0.12s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
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

            {/* Editor + summary */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', gap: 24 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Title */}
                <input
                  value={selectedNote.title || ''}
                  onChange={e => {
                    const updated = { ...selectedNote, title: e.target.value }
                    setSelectedNote(updated)
                    debouncedSave(updated)
                  }}
                  placeholder="Untitled Note"
                  style={{
                    fontSize: 30, fontWeight: 800, background: 'transparent', border: 'none',
                    outline: 'none', color: '#f0f0f2', marginBottom: 6, padding: 0,
                    fontFamily: "'Outfit', sans-serif", width: '100%', letterSpacing: '-0.025em',
                  }}
                />
                {/* Subject accent line */}
                <div style={{
                  height: 2, width: 36, borderRadius: 2, marginBottom: 20,
                  background: `linear-gradient(90deg, ${subjectColor}, ${subjectColor}55)`,
                  transition: 'background 0.3s ease',
                }} />

                {previewMode ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }}
                    style={{ flex: 1, minHeight: 360, fontSize: 14.5, lineHeight: 1.8, color: '#f0f0f2', padding: 0 }}
                  />
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={selectedNote.content || ''}
                    onChange={e => {
                      const updated = {
                        ...selectedNote, content: e.target.value,
                        word_count: e.target.value.trim().split(/\s+/).filter(Boolean).length,
                      }
                      setSelectedNote(updated)
                      debouncedSave(updated)
                    }}
                    placeholder="Start writing... Use ## for headers, **text** for bold, - for bullets"
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      resize: 'none', color: 'rgba(240,240,242,0.88)', fontSize: 14.5,
                      lineHeight: 1.82, fontFamily: "'Outfit', sans-serif",
                      minHeight: 400, padding: 0, width: '100%',
                    }}
                  />
                )}
                <div style={{ fontSize: 11, color: 'rgba(148,148,160,0.35)', marginTop: 12 }}>
                  {wordCount} word{wordCount !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Summary panel */}
              <AnimatePresence>
                {summaryPanel && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.97 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      width: 260, flexShrink: 0,
                      padding: 18, borderRadius: 14,
                      ...glass({ alignSelf: 'flex-start', position: 'sticky', top: 0, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#b5f23a', textTransform: 'uppercase' }}>AI Summary</div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSummaryPanel(null)}
                        style={{ background: 'none', border: 'none', color: 'rgba(148,148,160,0.5)', cursor: 'pointer', padding: 0, display: 'flex' }}
                      >
                        <X size={15} />
                      </motion.button>
                    </div>
                    {summaryPanel.summary && (
                      <p style={{ fontSize: 12.5, color: 'rgba(148,148,160,0.8)', lineHeight: 1.65, marginBottom: 14 }}>
                        {summaryPanel.summary}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {(summaryPanel.keyPoints || []).map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#b5f23a', flexShrink: 0, marginTop: 7 }} />
                          <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(240,240,242,0.75)' }}>{p}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <motion.button
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                        style={{
                          background: '#b5f23a', border: 'none', borderRadius: 9,
                          padding: '9px 14px', fontSize: 12, fontWeight: 700, color: '#0a0a0b',
                          cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                        }}
                        onClick={() => {
                          const txt = `## Summary\n\n${summaryPanel.summary || ''}\n\n## Key Points\n\n${(summaryPanel.keyPoints || []).map(p => `- ${p}`).join('\n')}`
                          const updated = { ...selectedNote, content: txt }
                          setSelectedNote(updated); debouncedSave(updated)
                          setSummaryPanel(null); toast('Note replaced with summary.', 'success')
                        }}
                      >
                        Replace with summary
                      </motion.button>
                      <motion.button
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                        style={{
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 9, padding: '9px 14px', fontSize: 12, fontWeight: 600,
                          color: 'rgba(240,240,242,0.7)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                        }}
                        onClick={() => {
                          const txt = `\n\n## Summary\n\n${summaryPanel.summary || ''}\n\n## Key Points\n\n${(summaryPanel.keyPoints || []).map(p => `- ${p}`).join('\n')}`
                          const updated = { ...selectedNote, content: selectedNote.content + txt }
                          setSelectedNote(updated); debouncedSave(updated)
                          setSummaryPanel(null); toast('Summary appended.', 'success')
                        }}
                      >
                        Add to note
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(181,242,58,0.06)',
              border: '1px solid rgba(181,242,58,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 4,
            }}>
              <FileText size={30} color="rgba(181,242,58,0.45)" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'rgba(240,240,242,0.6)', letterSpacing: '-0.01em' }}>
              Select a note to edit
            </div>
            <div style={{ fontSize: 13, color: 'rgba(148,148,160,0.4)' }}>or</div>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(181,242,58,0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNewNote}
              style={{
                background: '#b5f23a', border: 'none', borderRadius: 10,
                padding: '10px 24px', fontSize: 14, fontWeight: 700, color: '#0a0a0b',
                cursor: 'pointer', boxShadow: '0 2px 12px rgba(181,242,58,0.2)',
              }}
            >
              + New Note
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
