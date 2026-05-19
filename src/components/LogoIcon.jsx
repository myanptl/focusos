export default function LogoIcon({ size = 64, style = {} }) {
  return (
    <span style={{
      fontSize: size,
      color: 'var(--accent)',
      display: 'inline-block',
      lineHeight: 1,
      fontWeight: 300,
      animation: 'spin 8s linear infinite',
      transformOrigin: 'center',
      ...style,
    }}>⟳</span>
  )
}
