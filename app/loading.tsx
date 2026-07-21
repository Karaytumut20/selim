export default function Loading() {
  return (
    <main
      className="site-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading Northstar Circuit Works"
    >
      <div className="site-loader-panel">
        <div className="site-loader-spinner" aria-hidden="true">
          <span>NW</span>
        </div>
        <div className="site-loader-wordmark" aria-hidden="true">
          <strong>NORTHSTAR</strong>
          <small>CIRCUIT WORKS</small>
        </div>
        <p>Loading</p>
      </div>
    </main>
  );
}
