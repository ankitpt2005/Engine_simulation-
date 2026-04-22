import React, { useId } from "react";

export function Gauge({ value, max = 1, label, unit = "", color = "#22d3ee", size = 120 }) {
  const gid = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(1, value / max));
  const rot = -120 + pct * 240;
  const display = unit.includes("%")
    ? (value * 100).toFixed(1)
    : value.toFixed(1);
  return (
    <div className="gauge" style={{ width: size, height: size * 0.72 }}>
      <div className="gauge-label">{label}</div>
      <svg viewBox="0 0 100 70" className="gauge-svg">
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" x2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path
          d="M 12 60 A 38 38 0 0 1 88 60"
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 12 60 A 38 38 0 0 1 88 60"
          fill="none"
          stroke={`url(#g-${gid})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="150"
          strokeDashoffset={150 * (1 - pct)}
        />
        <g transform={`rotate(${rot} 50 60)`}>
          <line x1="50" y1="60" x2="50" y2="28" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
        </g>
        <text x="50" y="48" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="inherit">
          {display}
          {unit}
        </text>
      </svg>
    </div>
  );
}
