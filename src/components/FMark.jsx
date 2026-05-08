export default function FMark({ size = 20, color = 'var(--accent)' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <rect x="3" y="3"  width="14" height="3" />
      <rect x="3" y="3"  width="3"  height="18" />
      <rect x="3" y="10" width="10" height="3" />
    </svg>
  )
}
