export default function Loading() {
  return (
    <div className="us-page-skeleton" aria-busy="true">
      <div className="us-skel-hero">
        <div className="us-skel-box us-skel-row" />
        <div className="us-skel-box us-skel-row" />
      </div>
      <div className="us-skel-box us-skel-heading" />
      <div className="us-skel-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="us-skel-card">
            <div className="us-skel-box us-skel-thumb" />
            <div className="us-skel-box us-skel-line short" />
            <div className="us-skel-box us-skel-line" />
            <div className="us-skel-box us-skel-btn" />
          </div>
        ))}
      </div>
    </div>
  );
}
