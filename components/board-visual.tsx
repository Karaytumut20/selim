const palettes: Record<string, { board: string; trace: string; accent: string }> = {
  control: { board: "#153e36", trace: "#8aa989", accent: "#e85d26" },
  comms: { board: "#14354f", trace: "#5d8eb0", accent: "#f0bc56" },
  drive: { board: "#26323c", trace: "#7e929e", accent: "#e85d26" },
  hmi: { board: "#293d48", trace: "#82a7ad", accent: "#2d6cdf" },
  power: { board: "#303a2d", trace: "#9ca68d", accent: "#e3a840" },
  cnc: { board: "#253949", trace: "#7999a8", accent: "#e85d26" },
  inspection: { board: "#184138", trace: "#89ac91", accent: "#d4af62" },
};

export function BoardVisual({ variant = "control", label, compact = false }: { variant?: string; label: string; compact?: boolean }) {
  const colors = palettes[variant] || palettes.control;
  return (
    <div
      className={`board-visual ${compact ? "board-visual-compact" : ""}`}
      role="img"
      aria-label={label}
      style={{ "--board": colors.board, "--trace": colors.trace, "--accent": colors.accent } as React.CSSProperties}
    >
      <span className="board-ref">NCW / {variant.toUpperCase()} / 01</span>
      <div className="pcb-line pcb-line-a" />
      <div className="pcb-line pcb-line-b" />
      <div className="pcb-line pcb-line-c" />
      <div className="chip chip-main"><i /><i /><i /><i /></div>
      <div className="chip chip-small" />
      <div className="capacitor cap-a" />
      <div className="capacitor cap-b" />
      <div className="relay relay-a" />
      <div className="relay relay-b" />
      <div className="connector"><i /><i /><i /><i /><i /></div>
      <div className="test-point tp-a" />
      <div className="test-point tp-b" />
      <span className="board-serial">94-7A / QC</span>
    </div>
  );
}

