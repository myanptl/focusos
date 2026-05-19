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
      const count = Math.max(45, Math.floor((canvas.width * canvas.height) / 12000))
      particles = Array.from({ length: count }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.30,
        vy: (Math.random() - 0.5) * 0.30,
        r:  Math.random() * 1.6 + 0.5,
        a:  Math.random() * 0.38 + 0.12,
      }))
    }

    function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < 130) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(181,242,58,${(1 - d / 130) * 0.10})`
            ctx.lineWidth = 0.55
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        }
      }

      // Dots
      for (const p of particles) {
        // Cursor attraction
        const cx = mouseX - p.x, cy = mouseY - p.y
        const cd = Math.sqrt(cx * cx + cy * cy)
        if (cd < 200 && cd > 0) {
          const force = ((200 - cd) / 200) * 0.012
          p.vx += (cx / cd) * force
          p.vy += (cy / cd) * force
        }
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 0.85) { p.vx = (p.vx / spd) * 0.85; p.vy = (p.vy / spd) * 0.85 }

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
      {/* Animated gradient mesh */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(135deg, #0a0a0b 0%, #0c1005 50%, #0a0a0b 100%)',
        backgroundSize: '400% 400%',
        animation: reduced ? 'none' : 'appMeshShift 20s ease-in-out infinite',
      }} />

      {/* Single seamless ambient glow — center off-viewport at top, no visible edge or ring */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 110% 70% at 60% -15%, rgba(181,242,58,0.055) 0%, rgba(181,242,58,0) 65%)',
      }} />

      {/* Grain */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.038,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
      }} />

      {/* Particles with cursor drift */}
      <AppParticles reduced={reduced} />
    </>
  )
}
