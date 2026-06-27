import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

function AppParticles({ reduced }) {
  const ref = useRef(null)

  useEffect(() => {
    if (reduced) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf
    let particles = []
    let mouseX = -9999, mouseY = -9999

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      // Calmer field: fewer, fainter, slower — a quiet starfield behind
      // a focus app, not a busy network graph.
      const count = Math.min(28, Math.max(18, Math.floor((canvas.width * canvas.height) / 26000)))
      particles = Array.from({ length: count }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r:  Math.random() * 1.3 + 0.4,
        a:  Math.random() * 0.22 + 0.05,
      }))
    }

    function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY }

    function tick() {
      if (document.hidden) { raf = requestAnimationFrame(tick); return }
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // No connecting-line web — just gently drifting motes with a soft
      // cursor draw. Calmer, and cheaper (drops the O(n²) line pass).
      for (const p of particles) {
        const cx = mouseX - p.x, cy = mouseY - p.y
        const cd = Math.sqrt(cx * cx + cy * cy)
        if (cd < 180 && cd > 0) {
          const force = ((180 - cd) / 180) * 0.006
          p.vx += (cx / cd) * force
          p.vy += (cy / cd) * force
        }
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 0.5) { p.vx = (p.vx / spd) * 0.5; p.vy = (p.vy / spd) * 0.5 }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(181,242,58,${p.a})`
        ctx.fill()

        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      }

      raf = requestAnimationFrame(tick)
    }

    resize(); tick()
    window.addEventListener('resize',    resize)
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize',    resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [reduced])

  if (reduced) return null
  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  )
}

export default function AppBackground() {
  const reduced = useReducedMotion()

  return (
    <>
      {/* Static gradient base — a faint lime-warmed wash, no perpetual motion */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(155deg, #09090a 0%, #0b0e06 52%, #09090a 100%)',
      }} />

      {/* Primary lime spotlight — top center (endlesstools.io style) */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 85% 60% at 50% -8%, rgba(181,242,58,0.11) 0%, rgba(181,242,58,0.02) 55%, transparent 75%)',
      }} />

      {/* Secondary depth glow — bottom right (color interest) */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 40% at 92% 98%, rgba(96,211,248,0.038) 0%, transparent 65%)',
      }} />

      {/* Dot grid — subtle like endlesstools.io, fades out downward */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.065) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 0%, transparent 70%)',
      }} />

      {/* Grain */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.042,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '200px 200px',
      }} />

      {/* Particles with cursor drift */}
      <AppParticles reduced={reduced} />
    </>
  )
}
