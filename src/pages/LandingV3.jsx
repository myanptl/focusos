import { useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useAuth } from '../context/AuthContext'
import LogoIcon from '../components/LogoIcon'
import SessionStory from '../components/landing/SessionStory'
import '../styles/landing-v3.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SESSION_SECONDS = 25 * 60

const SUBJECTS = ['SAT MATH', 'AP BIO', 'WORLD HISTORY', 'CALC AB', 'CHEM', 'ACT ENGLISH', 'PHYSICS', 'AP CSA', 'SPANISH', 'STATS']

const RECEIPTS = [
  {
    text: <>Practice testing is the <em>#1 rated study technique</em> out of ten — ahead of highlighting, re-reading, and summarizing.</>,
    src: 'Dunlosky et al., 2013 · 242 studies · 169,179 participants',
  },
  {
    text: <>Implementation intentions — deciding <em>when and where</em> you'll study — increase follow-through roughly 3×.</>,
    src: 'Gollwitzer, 1999 · Psychological Bulletin',
  },
  {
    text: <>Spaced repetition schedules reviews right before you'd forget, so the same material costs <em>less time each pass</em>.</>,
    src: 'Cepeda et al., 2006 · meta-analysis of 254 studies',
  },
]

function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export default function LandingV3() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const page = useRef(null)
  const hudTime = useRef(null)
  const bar = useRef(null)

  const ctaTarget = user ? '/timer' : '/signup'

  useGSAP(() => {
    if (reduced) return

    // ── signature: whole-page scroll = one 25:00 session elapsing
    ScrollTrigger.create({
      trigger: page.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        if (hudTime.current) hudTime.current.textContent = fmt(SESSION_SECONDS * (1 - self.progress))
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
      },
    })

    // ── hero load choreography (one orchestrated moment)
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
    intro
      .from('.lv3-nav', { y: -18, autoAlpha: 0, duration: 0.6 }, 0.05)
      .from('.lv3-hero-line > span', { yPercent: 105, duration: 0.9, stagger: 0.12 }, 0.15)
      .from('.lv3-hero-eyebrow', { autoAlpha: 0, y: 12, duration: 0.5 }, 0.5)
      .from('.lv3-hero-sub, .lv3-hero-ctas', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.1 }, 0.7)
      .from('.lv3-hero-arrow', { rotate: -120, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.6)' }, 0.55)
      .from('.lv3-marquee', { autoAlpha: 0, duration: 0.6 }, 0.95)

    // hero headline drifts up slightly as you leave it (kinetic, subtle)
    gsap.to('.lv3-hero-title', {
      yPercent: -8, autoAlpha: 0.25, ease: 'none',
      scrollTrigger: { trigger: '.lv3-hero', start: 'top top', end: 'bottom top', scrub: true },
    })

    // receipts reveal
    gsap.from('.lv3-receipt', {
      autoAlpha: 0, x: -22, duration: 0.6, stagger: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: '.lv3-receipts', start: 'top 74%' },
    })

    // final 00:00 stamp
    gsap.from('.lv3-final-time', {
      scale: 0.85, autoAlpha: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: '.lv3-final', start: 'top 70%' },
    })
  }, { scope: page })

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  const mono = { fontFamily: "'JetBrains Mono', monospace" }
  const bebas = { fontFamily: "'Bebas Neue', 'Outfit', sans-serif" }

  return (
    <div ref={page} style={{
      background: '#0a0a0b', color: '#f0f0f2',
      fontFamily: "'Outfit', 'DM Sans', sans-serif", overflowX: 'hidden', position: 'relative',
    }}>
      {/* session chrome */}
      <div className="lv3-progress" ref={bar} aria-hidden />
      <div className="lv3-hud" aria-hidden>
        <span className="lv3-hud-time" ref={hudTime}>25:00</span>
        <span className="lv3-hud-label">session</span>
      </div>

      {/* ════ HERO ════ */}
      <section className="lv3-hero" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 28%, rgba(181,242,58,0.055) 0%, transparent 70%)',
        }} />

        {/* nav — kept pill style, it's brand */}
        <nav className="lv3-nav" style={{ position: 'relative', zIndex: 10, padding: 'clamp(16px,2.5vw,24px) clamp(16px,3vw,40px) 0' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(10,10,11,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: 50,
            padding: '0 6px 0 20px', height: 52, maxWidth: 1100, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogoIcon size={22} />
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '4px' }}>FOCUSOS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {!user && (
                <button onClick={() => navigate('/login')} style={{
                  background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 14px', fontFamily: 'inherit',
                }}>Sign in</button>
              )}
              <button className="lv3-btn" style={{ padding: '10px 22px', fontSize: 13 }} onClick={() => navigate(ctaTarget)}>
                {user ? 'Open app' : 'Start free'}
              </button>
            </div>
          </div>
        </nav>

        {/* headline */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 clamp(20px,4vw,56px)', maxWidth: 1150, margin: '0 auto', width: '100%',
          position: 'relative', zIndex: 2,
        }}>
          <span className="lv3-hero-eyebrow" style={{
            ...mono, fontSize: 11, letterSpacing: '4px', color: 'var(--accent)', marginBottom: 'clamp(14px,2vw,22px)',
          }}>
            THIS PAGE IS ONE FOCUS SESSION — SCROLL TO RUN IT
          </span>

          <h1 className="lv3-hero-title" style={{
            ...bebas, fontSize: 'clamp(88px, 19vw, 300px)', lineHeight: 0.84,
            letterSpacing: '1px', margin: 0, textTransform: 'uppercase',
          }}>
            <span className="lv3-line-mask lv3-hero-line"><span>Deep</span></span>
            <span className="lv3-line-mask lv3-hero-line">
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                Work<span style={{ color: 'var(--accent)' }}>.</span>
                <span className="lv3-hero-arrow" style={{ display: 'inline-flex', marginLeft: 'clamp(20px,3.5vw,56px)' }} aria-hidden>
                  {/* size via CSS clamp in landing-v3.css — reactive to resize, unlike a JS read */}
                  <LogoIcon size={120} />
                </span>
              </span>
            </span>
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'clamp(20px,4vw,64px)', marginTop: 'clamp(24px,3.5vw,44px)' }}>
            <p className="lv3-hero-sub" style={{
              fontSize: 'clamp(15px,1.5vw,18px)', lineHeight: 1.65, color: 'rgba(240,240,242,0.6)', maxWidth: 460, margin: 0,
            }}>
              FocusOS turns study time into scores — an adaptive timer, AI quizzes built from your notes,
              and streaks that hold. Built on the research, not vibes.
            </p>
            <div className="lv3-hero-ctas" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="lv3-btn" onClick={() => navigate(ctaTarget)}>
                Start your first session <span aria-hidden>→</span>
              </button>
              <button className="lv3-btn lv3-btn-ghost" onClick={() => document.querySelector('.lv3-story')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })}>
                Watch one run ↓
              </button>
            </div>
          </div>
        </div>

        {/* subject marquee */}
        <div className="lv3-marquee" aria-hidden style={{ position: 'relative', zIndex: 2, padding: '14px 0' }}>
          <div className="lv3-marquee-track">
            {[0, 1].map(dup => (
              <span key={dup}>
                {SUBJECTS.map(s => <span key={s}><b>■</b>&nbsp;&nbsp;{s}</span>)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════ THE SESSION (pinned scrub story) ════ */}
      <div className="lv3-story">
        <SessionStory />
      </div>

      {/* ════ RECEIPTS ════ */}
      <section className="lv3-receipts" aria-label="The research" style={{ padding: 'clamp(80px,10vw,150px) clamp(20px,4vw,56px)', maxWidth: 900, margin: '0 auto' }}>
        <span style={{ ...mono, fontSize: 11, letterSpacing: '4px', color: 'var(--accent)', display: 'block', marginBottom: 18 }}>
          THE RECEIPTS
        </span>
        <h2 style={{ ...bebas, fontSize: 'clamp(40px,6vw,84px)', lineHeight: 0.95, margin: '0 0 clamp(28px,4vw,48px)', textTransform: 'uppercase' }}>
          Every feature has a citation<span style={{ color: 'var(--accent)' }}>.</span>
        </h2>
        <div style={{ display: 'grid', gap: 'clamp(20px,3vw,30px)' }}>
          {RECEIPTS.map((r, i) => (
            <div key={i} className="lv3-receipt">
              {r.text}
              <span className="src">{r.src}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════ SESSION COMPLETE / CTA ════ */}
      <section className="lv3-final" style={{
        padding: 'clamp(90px,12vw,170px) clamp(20px,4vw,56px)', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 60% at 50% 100%, rgba(181,242,58,0.07) 0%, transparent 70%)',
        }} />
        <div className="lv3-final-time" style={{ ...mono, fontSize: 'clamp(52px,9vw,120px)', color: 'var(--accent)', letterSpacing: '2px', lineHeight: 1 }}>
          00:00
        </div>
        <p style={{ ...mono, fontSize: 12, letterSpacing: '3.5px', color: 'rgba(240,240,242,0.45)', margin: '16px 0 clamp(28px,4vw,44px)' }}>
          SESSION COMPLETE · YOUR TURN
        </p>
        <button className="lv3-btn" style={{ fontSize: 'clamp(15px,1.5vw,17px)' }} onClick={() => navigate(ctaTarget)}>
          Start your first session <span aria-hidden>→</span>
        </button>
        <p style={{ fontSize: 13, color: 'rgba(240,240,242,0.42)', marginTop: 18 }}>
          Free · No credit card · Join 2,400+ students building real focus
        </p>
      </section>

      {/* footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.07)', padding: '28px clamp(20px,4vw,56px)',
        display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1150, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoIcon size={18} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '3px', color: 'rgba(240,240,242,0.55)' }}>FOCUSOS</span>
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Support', '/support']].map(([label, to]) => (
            <Link key={to} to={to} style={{ fontSize: 12.5, color: 'rgba(240,240,242,0.45)', textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <span style={{ ...mono, fontSize: 11, color: 'rgba(240,240,242,0.3)' }}>© 2026 FocusOS</span>
      </footer>
    </div>
  )
}
