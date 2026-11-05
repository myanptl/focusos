// Shared typography for the legal pages (Privacy, Terms): a hairline-ruled
// section with a small heading and readable muted body text.

export function LegalPage({ kicker, title, children }) {
  return (
    <article>
      <header className="page-head">
        <span className="kicker">{kicker}</span>
        <h1 className="page-title">{title}</h1>
        <p>Effective May 2026</p>
      </header>
      {children}
    </article>
  )
}

export default function LegalSection({ title, children }) {
  return (
    <section style={{ borderTop: '1px solid var(--hairline)', padding: '24px 0' }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--muted)', maxWidth: '68ch' }}>
        {children}
      </div>
    </section>
  )
}
