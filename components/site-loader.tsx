export function SiteLoader({
  transition = false,
  leaving = false,
}: {
  transition?: boolean;
  leaving?: boolean;
}) {
  return (
    <div
      className={`site-loader${transition ? " site-loader-transition" : ""}${
        leaving ? " site-loader-leaving" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading Global White Star LLC"
    >
      <div className="site-loader-progress-bar" aria-hidden="true" />
      <div className="site-loader-panel">
        <div className="site-loader-spinner" aria-hidden="true">
          <span>GWS</span>
        </div>
        <div className="site-loader-wordmark" aria-hidden="true">
          <strong>GLOBAL WHITE STAR</strong>
          <small>LLC</small>
        </div>
        <p>Loading</p>
      </div>
    </div>
  );
}
