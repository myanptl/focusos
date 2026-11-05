import { motion, useReducedMotion } from 'framer-motion'

/* The FocusOS arrow. It draws itself in on mount, idles still, and only turns
   while a focus block is actually running — so the mark doubles as a status
   light. Hover gives it one quick wind. */
export default function LogoIcon({ size = 24, spinning = false, stroke = 1.6, style }) {
  const reduce = useReducedMotion()
  const draw = reduce ? {} : { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 } }

  return (
    <span className="logo-mark" style={style} aria-hidden="true">
      <motion.svg
        viewBox="0 0 24 24" width={size} height={size}
        fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeLinecap="round" strokeLinejoin="round"
        animate={spinning && !reduce ? { rotate: 360 } : { rotate: 0 }}
        transition={spinning
          ? { duration: 6, ease: 'linear', repeat: Infinity }
          : { type: 'spring', stiffness: 120, damping: 18 }}
        whileHover={spinning || reduce ? undefined : { rotate: 360, transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } }}
      >
        <motion.path
          d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
          {...draw}
          transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.path
          d="M21 3v5h-5"
          {...draw}
          transition={{ duration: 0.4, delay: 0.9, ease: 'easeOut' }}
        />
      </motion.svg>
    </span>
  )
}
