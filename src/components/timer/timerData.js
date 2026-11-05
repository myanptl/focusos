import { VolumeX, Waves, Music, Music2 } from 'lucide-react'

// ── Constants ────────────────────────────────────────────
export const LEVELS = [
  { max: 10,  name: 'SCATTERED', desc: 'Building the habit. Short sessions are real.' },
  { max: 20,  name: 'WARMING UP', desc: 'Getting there. Brief bursts of real focus.' },
  { max: 35,  name: 'FOCUSED', desc: 'Solid concentration. You\'re in the zone.' },
  { max: 50,  name: 'DEEP WORK', desc: 'High performance mode. Elite territory.' },
  { max: 999, name: 'FLOW STATE', desc: 'Unbreakable. Your attention span is elite.' },
]

export const BREAK_ACTIVITIES = [
  { text: '10 jumping jacks' },
  { text: 'Look out a window for 60 seconds' },
  { text: 'Drink a glass of water' },
  { text: '5 deep breaths — box breathing' },
  { text: 'Stretch your neck and shoulders' },
  { text: 'Walk to another room and back' },
]

export const DISTRACTIONS = [
  'Phone / social media',
  'Noise or environment',
  'Tired or hungry',
  'My own thoughts',
  'Nothing — I was locked in',
]

export const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Focus is the art of knowing what to ignore.', author: 'Anonymous' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: "You don't rise to your goals, you fall to your systems.", author: 'James Clear' },
  { text: 'The successful warrior is the average person with laser-like focus.', author: 'Bruce Lee' },
  { text: 'Concentrate all your thoughts upon the work at hand.', author: 'Alexander Bell' },
]

export const SPOTIFY_PLAYLISTS = [
  'Lo-fi Hip Hop Beats',
  'Deep Focus — Classical',
  'Brain Food — Spotify',
]

export const SOUND_OPTIONS = [
  { id: 'silent',   label: 'Silent',   Icon: VolumeX },
  { id: 'brown',    label: 'Brown',    Icon: Waves },
  { id: 'baroque',  label: 'Baroque',  Icon: Music },
  { id: 'classical',label: 'Classical',Icon: Music2 },
]


export const STUDY_TIPS = [
  { tip: 'Staring at a blank wall for 10 minutes after studying helps your brain consolidate memories.', source: 'Dewar et al., Psychological Science, 2012' },
  { tip: 'Handwriting notes beats typing — the slower pace forces deeper processing of information.', source: 'Mueller & Oppenheimer, Psychological Science, 2014' },
  { tip: 'Testing yourself is 2× more effective than re-reading the same material.', source: 'Roediger & Karpicke, 2006' },
  { tip: 'A 10-minute walk before studying increases focus and memory retention significantly.', source: 'Hillman et al., Neuroscience, 2009' },
  { tip: 'Studying in different locations strengthens memory — your brain links info to environment.', source: 'Smith, 1982 — Context-dependent memory' },
  { tip: 'The ideal study-to-break ratio is roughly 52 minutes focus, 17 minutes break.', source: 'DeskTime productivity research, 2014' },
  { tip: 'Explaining a concept out loud to yourself reveals gaps in understanding. (The Feynman Technique)', source: 'Richard Feynman — Nobel Prize winner' },
  { tip: 'Mild dehydration (1–2%) reduces cognitive performance by up to 13%.', source: 'Masento et al., British Journal of Nutrition, 2014' },
  { tip: 'Background music with 60–70 BPM can enhance focus — matching the brain\'s alpha waves.', source: 'Rauscher et al., 1993 — Mozart Effect' },
  { tip: 'Sleeping within 12 hours of learning something doubles your retention rate.', source: 'Walker, Why We Sleep, 2017' },
  { tip: 'The spacing effect: studying material over multiple sessions beats cramming 3×.', source: 'Ebbinghaus Forgetting Curve, 1885' },
  { tip: 'Cold water on your face or wrists triggers the dive reflex — instant alertness boost.', source: 'Mammalian dive reflex — physiology research' },
  { tip: 'Interleaving different subjects in one session improves long-term retention vs. blocked practice.', source: 'Kornell & Bjork, Psychological Science, 2008' },
  { tip: 'A 20-minute nap between study sessions restores focus as effectively as a full night\'s sleep.', source: 'Mednick et al., Nature Neuroscience, 2003' },
  { tip: 'Writing your worries down before a test frees up working memory and improves performance.', source: 'Ramirez & Beilock, Science, 2011' },
]

export function shuffleIndices(len) {
  const a = Array.from({ length: len }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const SHORTCUTS = [
  { key: 'Space', desc: 'Start / Pause timer' },
  { key: 'R', desc: 'Reset timer' },
  { key: '1 – 5', desc: 'Switch tabs (Focus, Quiz, Plan, Stats, Rooms)' },
  { key: 'Esc', desc: 'Close modal / dialog' },
  { key: '?', desc: 'Show this help panel' },
]

// ── Helpers ──────────────────────────────────────────────
export function getLevel(mins) {
  return LEVELS.find(l => mins < l.max) || LEVELS[LEVELS.length - 1]
}

export function shuffleBreakTips() {
  return [...BREAK_ACTIVITIES].sort(() => Math.random() - 0.5).slice(0, 3)
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function todayKey() {
  return new Date().toISOString().split('T')[0]
}

export function pad(n) { return String(n).padStart(2, '0') }
export function fmt(secs) { return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}` }
