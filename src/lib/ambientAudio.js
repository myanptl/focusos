// ── Shared AudioContext + mobile unlock ───────────────────
// iOS/Android silence any AudioContext that is created or resumed outside a
// user gesture. We keep ONE shared context for the app's lifetime and unlock
// it (resume + play a 1-sample silent buffer) the first time the user taps.
// Once unlocked, the same context can be (re)used from effects without a
// gesture, which is why brown noise reuses this instead of `new AudioContext`.
let sharedCtx = null
let audioUnlocked = false

function getAudioCtx() {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    sharedCtx = new Ctor()
  }
  return sharedCtx
}

// Call synchronously from inside a user gesture (e.g. the START tap).
export function unlockAudio() {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  if (!audioUnlocked) {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
      audioUnlocked = true
    } catch { /* unlock best-effort */ }
  }
}

// Belt-and-suspenders: unlock on the very first interaction anywhere, so the
// context is ready even if the user changes the sound type before pressing start.
if (typeof window !== 'undefined') {
  const firstGesture = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', firstGesture)
    window.removeEventListener('touchend', firstGesture)
    window.removeEventListener('keydown', firstGesture)
  }
  window.addEventListener('pointerdown', firstGesture, { once: false })
  window.addEventListener('touchend', firstGesture, { once: false })
  window.addEventListener('keydown', firstGesture, { once: false })
}

// ── Web Audio: Brown Noise ────────────────────────────────
function makeBrownNoise(ctx) {
  const masterGain = ctx.createGain()
  masterGain.gain.value = 0.4
  masterGain.connect(ctx.destination)

  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      lastOut = (lastOut + 0.02 * white) / 1.02
      data[i] = lastOut * 3.5
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 500
  lowpass.Q.value = 0.5

  source.connect(lowpass)
  lowpass.connect(masterGain)
  source.start()

  return {
    stop: () => { source.stop(); masterGain.disconnect() },
    setVolume: (v) => { masterGain.gain.value = v * 0.4 },
  }
}

// ── Ambient Sound Engine ──────────────────────────────────
// Baroque/Classical are self-hosted public-domain recordings decoded through
// the shared (gesture-unlocked) AudioContext — the same path as brown noise.
// This is what makes them play on iOS: a hidden YouTube iframe can't be
// unlocked by a gesture and is blocked by mobile autoplay policy.
//   baroque.mp3   — Bach, Cello Suite No. 1 Prélude (BWV 1007), CC0
//   classical.mp3 — Satie, Gymnopédie No. 2, Public Domain
// Both via Wikimedia Commons; CC0/PD require no attribution.
const SOUND_FILES = {
  baroque:   '/sounds/baroque.mp3',
  classical: '/sounds/classical.mp3',
}

// Decode once, reuse — repeated plays are instant and don't re-download.
const decodedBufferCache = {}
async function loadAudioBuffer(ctx, url) {
  if (decodedBufferCache[url]) return decodedBufferCache[url]
  const res = await fetch(url)
  if (!res.ok) throw new Error(`audio fetch failed (${res.status}) for ${url}`)
  const arrayBuf = await res.arrayBuffer()
  const audioBuf = await ctx.decodeAudioData(arrayBuf)
  decodedBufferCache[url] = audioBuf
  return audioBuf
}

// Looping file playback on the shared unlocked context (volume via GainNode,
// which iOS honours — unlike HTMLMediaElement.volume).
function createFileSound(url, volume) {
  const ctx = getAudioCtx()
  if (!ctx) return null
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  const gain = ctx.createGain()
  gain.gain.value = volume
  gain.connect(ctx.destination)
  let source = null
  let stopped = false
  loadAudioBuffer(ctx, url)
    .then((buf) => {
      if (stopped) return
      source = ctx.createBufferSource()
      source.buffer = buf
      source.loop = true
      source.connect(gain)
      source.start()
    })
    .catch((err) => { console.error('[FocusOS] ambient audio failed:', err) })
  return {
    stop: () => {
      stopped = true
      if (source) { try { source.stop() } catch { /* already stopped */ } }
      gain.disconnect()
    },
    setVolume: (v) => { gain.gain.value = v },
  }
}

export function createAmbientSound(type, volume) {
  if (type === 'silent') return null

  // Brown noise: instant Web Audio synthesis on the shared (unlocked) context.
  if (type === 'brown') {
    const ctx = getAudioCtx()
    if (!ctx) return null
    // Resume in case we got here without a prior gesture (desktop autoplay-ok).
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const sound = makeBrownNoise(ctx)
    sound.setVolume(volume)
    // Do NOT close the shared context on stop — just tear down this graph,
    // so the next play can reuse the already-unlocked context.
    return {
      stop: () => { sound.stop() },
      setVolume: (v) => sound.setVolume(v),
    }
  }

  // Baroque / Classical: self-hosted public-domain MP3, decoded and looped on
  // the shared unlocked context (works on iOS; volume honoured via GainNode).
  if (SOUND_FILES[type]) {
    return createFileSound(SOUND_FILES[type], volume)
  }

  return null
}
