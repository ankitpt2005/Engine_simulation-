import React, { useMemo } from "react";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function needle(cx, cy, r, valueNorm) {
  const a = (-140 + valueNorm * 280) * (Math.PI / 180);
  return {
    x: cx + Math.cos(a) * r,
    y: cy + Math.sin(a) * r,
  };
}

export function Lab2DSimulation({ testKind, point, progress }) {
  const theta = (progress ?? 0) * Math.PI * 10;
  const cx = 76;
  const cy = 86;
  const r = 26;
  const pinX = cx + Math.cos(theta) * r;
  const pinY = cy + Math.sin(theta) * r;
  const pistonY = 36 + Math.cos(theta) * 14;
  const heat = clamp((point?.fpProxy ?? point?.fp ?? point?.motoringFp ?? 0) / 40, 0, 1);
  const rpmNorm = clamp((point?.rpm ?? 0) / 6500, 0, 1);
  const torqueNorm = clamp((point?.motoringTorque ?? 0) / 110, 0, 1);
  const decelNorm = clamp((point?.decel ?? 0) / 2.2, 0, 1);
  const velocityNorm = clamp((point?.velocity ?? 0) / 85, 0, 1);

  const bars = useMemo(() => {
    const vals =
      testKind === "morse"
        ? [
            point?.activeCylinders >= 1 ? 1 : 0.15,
            point?.activeCylinders >= 2 ? 1 : 0.15,
            point?.activeCylinders >= 3 ? 1 : 0.15,
            point?.activeCylinders >= 4 ? 1 : 0.15,
          ]
        : [0.35 + rpmNorm * 0.65, 0.2 + heat * 0.8, 0.18 + decelNorm * 0.82, 0.2 + velocityNorm * 0.8];
    return vals.map((v) => clamp(v, 0.08, 1));
  }, [testKind, point, heat, rpmNorm, decelNorm, velocityNorm]);

  const tNeedle = needle(225, 82, 25, torqueNorm);
  const fNeedle = needle(298, 82, 25, heat);

  return (
    <div className="lab2d-wrap">
      <div className="lab2d-title">
        2D simulation - {testKind === "morse" ? "Morse" : testKind === "motoring" ? "Motoring" : "Retardation"}
      </div>
      <svg viewBox="0 0 360 190" className="lab2d-svg">
        <defs>
          <linearGradient id="rodGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="heatGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="100%" stopColor={`hsl(${24 - heat * 24} 90% ${46 + heat * 20}%)`} />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="360" height="190" fill="#090f1a" />
        <rect x="18" y="18" width="140" height="130" rx="8" fill="#0f172a" stroke="#243447" />
        <rect x="58" y="20" width="36" height="70" rx="7" fill="url(#heatGrad)" stroke="#334155" />

        <line x1={cx} y1={cy} x2={pinX} y2={pinY} stroke="#94a3b8" strokeWidth="5" />
        <line x1={pinX} y1={pinY} x2="76" y2={pistonY + 8} stroke="url(#rodGrad)" strokeWidth="5" />
        <circle cx={cx} cy={cy} r="27" fill="none" stroke="#334155" strokeWidth="2" />
        <circle cx={pinX} cy={pinY} r="5.5" fill="#38bdf8" />
        <circle cx={cx} cy={cy} r="4.5" fill="#e2e8f0" />
        <rect x="60" y={pistonY} width="32" height="18" rx="3" fill="#ef4444" />

        <text x="22" y="164" fill="#94a3b8" fontSize="11">
          RPM: {Math.round(point?.rpm ?? 0)}
        </text>
        <text x="84" y="164" fill="#94a3b8" fontSize="11">
          FP: {(point?.fp ?? point?.motoringFp ?? point?.fpProxy ?? 0).toFixed(2)} kW
        </text>

        <rect x="176" y="18" width="166" height="130" rx="8" fill="#0f172a" stroke="#243447" />

        {testKind === "morse" && (
          <>
            {[0, 1, 2, 3].map((i) => {
              const active = (point?.activeCylinders ?? 0) >= i + 1;
              const x = 188 + i * 38;
              return (
                <g key={i}>
                  <rect x={x} y="32" width="28" height="70" rx="5" fill="#0b1220" stroke="#334155" />
                  <rect x={x + 4} y={active ? 44 : 74} width="20" height={active ? 52 : 22} rx="4" fill={active ? "#22d3ee" : "#475569"} />
                  <text x={x + 14} y="118" textAnchor="middle" fill="#94a3b8" fontSize="10">
                    C{i + 1}
                  </text>
                </g>
              );
            })}
            <text x="182" y="164" fill="#94a3b8" fontSize="11">
              Active cylinders: {(point?.activeCylinders ?? 0).toFixed(2)}
            </text>
          </>
        )}

        {testKind === "motoring" && (
          <>
            <circle cx="225" cy="82" r="30" fill="none" stroke="#334155" />
            <line x1="225" y1="82" x2={tNeedle.x} y2={tNeedle.y} stroke="#22d3ee" strokeWidth="2.5" />
            <circle cx="225" cy="82" r="3" fill="#e2e8f0" />
            <text x="225" y="122" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Torque
            </text>

            <circle cx="298" cy="82" r="30" fill="none" stroke="#334155" />
            <line x1="298" y1="82" x2={fNeedle.x} y2={fNeedle.y} stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx="298" cy="82" r="3" fill="#e2e8f0" />
            <text x="298" y="122" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Friction
            </text>

            <text x="182" y="164" fill="#94a3b8" fontSize="11">
              Tm: {(point?.motoringTorque ?? 0).toFixed(1)} Nm - FP: {(point?.motoringFp ?? 0).toFixed(2)} kW
            </text>
          </>
        )}

        {testKind === "retardation" && (
          <>
            <line x1="188" y1="112" x2="332" y2="112" stroke="#334155" strokeWidth="2" />
            <line x1="188" y1="112" x2={188 + velocityNorm * 120} y2={112 - decelNorm * 34} stroke="#f472b6" strokeWidth="4" strokeLinecap="round" />
            <circle cx={188 + velocityNorm * 120} cy={112 - decelNorm * 34} r="5" fill="#f472b6" />
            <text x="182" y="36" fill="#94a3b8" fontSize="11">
              Coast vector
            </text>
            <text x="182" y="164" fill="#94a3b8" fontSize="11">
              Decel: {(point?.decel ?? 0).toFixed(3)} - Velocity: {(point?.velocity ?? 0).toFixed(1)} m/s
            </text>
          </>
        )}

        {bars.map((v, i) => {
          const h = v * 38;
          const x = 196 + i * 36;
          return (
            <g key={i}>
              <rect x={x} y={132} width="24" height="40" rx="4" fill="#1e293b" />
              <rect
                x={x}
                y={132 + (40 - h)}
                width="24"
                height={h}
                rx="4"
                fill={i === 0 ? "#22d3ee" : i === 1 ? "#f59e0b" : i === 2 ? "#f472b6" : "#34d399"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
