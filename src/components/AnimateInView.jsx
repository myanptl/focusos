import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function AnimateInView({ children, delay = 0, style, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}
