import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Orbs: larger + brighter than Landing, distinct positions/paths
const ORB_CONFIGS = [
  { w: 940, h: 860, left: '52%',  top: '-24%', dur: 32, ax: [0,-72,44,0], ay: [0,54,-36,0], op: 0.088 },
  { w: 820, h: 780, left: '-22%', top: '42%',  dur: 27, ax: [0,64,-40,0], ay: [0,-50,30,0], op: 0.11  },
  { w: 660, h: 640, left: '22%',  top: '14%',  dur: 38, ax: [0,-46,30,0], ay: [0,40,-24,0], op: 0.068 },
]

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
        background: 'linear-gradient(135deg, #0a0a0b 0%, #0d1a00 50%, #0a0a0b 100%)',
        backgroundSize: '400% 400%',
        animation: reduced ? 'none' : 'appMeshShift 20s ease-in-out infinite',
      }} />

      {/* Orbs */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        {ORB_CONFIGS.map((orb, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: orb.left, top: orb.top,
              width: orb.w, height: orb.h,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(181,242,58,${orb.op}) 0%, transparent 70%)`,
              filter: 'blur(80px)',
              willChange: 'transform',
            }}
            animate={reduced ? {} : { x: orb.ax, y: orb.ay }}
            transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

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
