export default function LogoIcon({ size = 64, style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="focus-logo-arrow"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <g transform="translate(5.33,5.33) scale(0.889)" fill="none" stroke="#b5f23a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      </g>
    </svg>
  )
}
