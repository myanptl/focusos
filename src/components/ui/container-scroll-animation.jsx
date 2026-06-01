import React, { useRef } from 'react'
import { useScroll, useTransform, motion } from 'framer-motion'

export const ContainerScroll = ({ titleComponent, children }) => {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1]
  }

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions())
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile ? '60rem' : '80rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: isMobile ? '8px' : '80px',
      }}
    >
      <div
        style={{
          paddingTop: isMobile ? '40px' : '160px',
          paddingBottom: isMobile ? '40px' : '160px',
          width: '100%',
          position: 'relative',
          perspective: '1000px',
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale} isMobile={isMobile}>
          {children}
        </Card>
      </div>
    </div>
  )
}

export const Header = ({ translate, titleComponent }) => {
  return (
    <motion.div
      style={{
        translateY: translate,
        maxWidth: '64rem',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      {titleComponent}
    </motion.div>
  )
}

export const Card = ({ rotate, scale, translate, children, isMobile }) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
        maxWidth: '64rem',
        marginTop: '-48px',
        marginLeft: 'auto',
        marginRight: 'auto',
        height: isMobile ? '30rem' : '40rem',
        width: '100%',
        border: '4px solid #6C6C6C',
        padding: isMobile ? '8px' : '24px',
        background: '#222222',
        borderRadius: '30px',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          borderRadius: '16px',
          background: '#111113',
        }}
      >
        {children}
      </div>
    </motion.div>
  )
}
