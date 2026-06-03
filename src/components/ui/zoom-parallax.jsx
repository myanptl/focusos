import { useRef, useEffect } from 'react'

const SLOT_OVERRIDES = [
  null,
  { top: '-30vh', left: '5vw',     height: '30vh', width: '35vw' },
  { top: '-10vh', left: '-25vw',   height: '45vh', width: '20vw' },
  { top: '0',     left: '27.5vw',  height: '25vh', width: '25vw' },
  { top: '27.5vh',left: '5vw',     height: '25vh', width: '20vw' },
  { top: '27.5vh',left: '-22.5vw', height: '25vh', width: '30vw' },
  { top: '22.5vh',left: '25vw',    height: '15vh', width: '15vw' },
]

const MAX_SCALES = [4, 5, 6, 5, 6, 8, 9]

export function ZoomParallax({ images }) {
  const containerRef = useRef(null)
  const itemRefs     = useRef([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId = null
    let last  = -1

    function tick() {
      try {
        const rect     = container.getBoundingClientRect()
        const total    = container.offsetHeight - window.innerHeight
        if (total <= 0) return
        const progress = Math.min(1, Math.max(0, -rect.top / total))
        if (Math.abs(progress - last) < 0.0005) return
        last = progress
        itemRefs.current.forEach((el, i) => {
          if (!el) return
          const max   = MAX_SCALES[i % MAX_SCALES.length]
          const scale = 1 + (max - 1) * progress
          el.style.transform = `scale(${scale})`
        })
      } catch (_) { /* silent — never crash the page */ }
    }

    function onScroll() {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    tick()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '300vh' }}>
      <div style={{
        position: 'sticky', top: 0,
        height: '100vh', overflow: 'hidden',
        background: '#0a0a0b',
      }}>
        {images.map(({ src, alt }, i) => (
          <div
            key={i}
            ref={el => { itemRefs.current[i] = el }}
            style={{
              position: 'absolute', top: 0,
              display: 'flex', height: '100%', width: '100%',
              alignItems: 'center', justifyContent: 'center',
              willChange: 'transform', transformOrigin: 'center center',
            }}
          >
            <div style={{
              position: 'relative',
              height: '25vh', width: '25vw',
              overflow: 'hidden',
              ...(SLOT_OVERRIDES[i] || {}),
            }}>
              <img
                src={src}
                alt={alt || `Feature ${i + 1}`}
                loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none' }}
                style={{ height: '100%', width: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
