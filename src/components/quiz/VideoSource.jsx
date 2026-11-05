import { Note, Kicker } from './parts'

const TRANSCRIPT_STEPS = [
  'Open the video on YouTube',
  'Click "..." below the video',
  'Click "Show transcript"',
  'Copy all the text',
  'Paste it above',
]

function Spinner() {
  return <span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--on-accent)' }} />
}

function NoTranscript({ videoError, manualTranscript, setManualTranscript, summarizeVideo, videoLoading, resetVideo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Note tone="amber">
        <div style={{ color: 'var(--text)', marginBottom: 2 }}>No auto-transcript for this video.</div>
        {videoError}
      </Note>

      <div>
        <Kicker>01 · Paste the transcript</Kicker>
        <textarea
          value={manualTranscript}
          onChange={e => setManualTranscript(e.target.value)}
          placeholder="Paste the transcript text here"
          rows={5}
          style={{ lineHeight: 1.6, marginBottom: 10 }}
        />
        <button className="btn btn-accent" onClick={summarizeVideo} disabled={videoLoading || !manualTranscript.trim()}>
          {videoLoading ? <><Spinner /> Summarizing</> : 'Summarize transcript'}
        </button>
      </div>

      <div>
        <Kicker>02 · Get it from YouTube</Kicker>
        <ol style={{ listStyle: 'none' }}>
          {TRANSCRIPT_STEPS.map((step, i) => (
            <li key={step} style={{ display: 'flex', gap: 14, padding: '8px 0', borderTop: '1px solid var(--hairline)', fontSize: 13, color: 'var(--muted)' }}>
              <span className="mono" style={{ color: 'var(--faint)', fontSize: 12 }}>{i + 1}</span>{step}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <Kicker>03 · Use a different video</Kicker>
        <button className="btn btn-ghost" onClick={resetVideo}>Try another video</button>
      </div>
    </div>
  )
}

export default function VideoSource(props) {
  const {
    videoUrl, onVideoUrlChange, summarizeVideo, videoSubject, setVideoSubject,
    videoLoading, videoError, videoNoTranscript, showLengthWarning,
  } = props

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input
        type="url"
        placeholder="YouTube URL"
        aria-label="YouTube URL"
        value={videoUrl}
        onChange={e => onVideoUrlChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && videoUrl.trim() && !videoNoTranscript) summarizeVideo() }}
      />

      {showLengthWarning && (
        <Note tone="amber">Long video. Only the first ~45 minutes were summarized.</Note>
      )}

      {videoNoTranscript ? <NoTranscript {...props} /> : (
        <>
          <input
            type="text" placeholder="Subject (optional)" aria-label="Video subject"
            value={videoSubject} onChange={e => setVideoSubject(e.target.value)}
          />
          {videoError && <Note tone="red">{videoError}</Note>}
          <div>
            <button className="btn btn-accent btn-lg" onClick={summarizeVideo} disabled={videoLoading || !videoUrl.trim()}>
              {videoLoading ? <><Spinner /> Analyzing video</> : 'Summarize video'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
