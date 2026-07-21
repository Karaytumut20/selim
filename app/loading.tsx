export default function Loading() {
  return (
    <main
      className="site-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading Northstar Circuit Works"
    >
      <div className="site-loader-grid" aria-hidden="true" />

      <header className="site-loader-header" aria-hidden="true">
        <div className="site-loader-brand">
          <span className="site-loader-brand-mark">NW</span>
          <span>
            <strong>NORTHSTAR</strong>
            <small>CIRCUIT WORKS</small>
          </span>
        </div>
        <span className="site-loader-reference">SYSTEM / 03</span>
      </header>

      <section className="site-loader-core">
        <div className="site-loader-chip" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
          <span>NW</span>
        </div>
        <div className="site-loader-copy">
          <span className="site-loader-eyebrow"><i /> Secure catalog link</span>
          <h1>Preparing the catalog.</h1>
          <p>Synchronizing technical records and repair services.</p>
        </div>
        <div className="site-loader-trace" aria-hidden="true">
          <i /><i /><i />
          <span />
        </div>
      </section>

      <footer className="site-loader-footer" aria-hidden="true">
        <span>NCW / LOAD SEQUENCE</span>
        <span>INDUSTRIAL ELECTRONICS</span>
      </footer>
    </main>
  );
}
