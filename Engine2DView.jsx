import React, { useEffect, useRef } from "react";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function Engine2DView({ rpm, load, viscosityKey, physics }) {
  const req = useRef(0);
  const thetaRef = useRef(0);
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const crank = svg.querySelector("[data-crank]");
    const pin = svg.querySelector("[data-pin]");
    const piston = svg.querySelector("[data-piston]");

    const r = 26;
    const cx = 76;
    const cy = 86;
    const rodLen = 42;

    function loop(ts) {
      const omega = (rpm / 60) * Math.PI * 2;
      const dt = 1 / 60;
      thetaRef.current += omega * dt;
      const th = thetaRef.current;

      const pinX = cx + Math.cos(th) * r;
      const pinY = cy + Math.sin(th) * r;
      const ySlider =
        r * Math.cos(th) +
        Math.sqrt(Math.max(rodLen * rodLen - (r * Math.sin(th)) ** 2, 0));
      const pistonY = 30 + (ySlider / (r + rodLen)) * 30;
      const pistonX = pinX - 28; // keep pin roughly at piston centre

      const crankAngleDeg = (th * 180) / Math.PI;

      if (crank) {
        crank.setAttribute(
          "transform",
          `translate(${cx} ${cy}) rotate(${crankAngleDeg} 0 0)`
        );
      }
      if (pin) {
        pin.setAttribute("cx", String(pinX));
        pin.setAttribute("cy", String(pinY));
      }
      if (piston) {
        piston.setAttribute("x", String(pistonX));
        piston.setAttribute("y", String(pistonY));
      }

      req.current = requestAnimationFrame(loop);
    }

    req.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(req.current);
  }, [rpm]);

  const eff = physics?.etaMechanical ?? 0;
  const fp = physics?.FP ?? 0;

  const effPct = clamp(eff, 0, 1) * 100;
  const barEff = effPct / 100;
  const barFp = clamp(fp / 80, 0, 1);

  return (
    <div className="engine2d">
      <svg
        ref={svgRef}
        viewBox="0 0 360 190"
        className="engine2d-svg"
        aria-label="2D spark-ignition engine"
      >
        <defs>
          <linearGradient id="e2d-crank" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="e2d-cylinder" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="360" height="190" fill="#020617" />

        <rect x="26" y="16" width="120" height="132" rx="10" fill="#020617" stroke="#1f2937" />
        <rect
          x="46"
          y="20"
          width="80"
          height="80"
          rx="10"
          fill="url(#e2d-cylinder)"
          stroke="#1d4ed8"
          opacity="0.9"
        />

        <rect
          data-piston
          x="58"
          y="60"
          width="56"
          height="18"
          rx="4"
          fill="#ef4444"
          stroke="#b91c1c"
        />

        <g data-crank transform="translate(76 86)">
          <circle r="22" fill="none" stroke="#1f2937" strokeWidth="6" />
          <line x1="0" y1="0" x2="22" y2="0" stroke="url(#e2d-crank)" strokeWidth="6" />
        </g>

        <circle data-pin cx="102" cy="86" r="5.5" fill="#38bdf8" />

        <text x="24" y="160" fill="#94a3b8" fontSize="11">
          RPM {Math.round(rpm)}
        </text>
        <text x="24" y="174" fill="#94a3b8" fontSize="11">
          Load {(load * 100).toFixed(0)}% · Oil {viscosityKey}
        </text>

        <rect x="180" y="22" width="156" height="60" rx="9" fill="#020617" stroke="#1f2937" />
        <text x="188" y="38" fill="#94a3b8" fontSize="11">
          Mechanical efficiency
        </text>
        <rect x="188" y="44" width="140" height="12" rx="6" fill="#020617" stroke="#1f2937" />
        <rect
          x="188"
          y="44"
          width={140 * barEff}
          height="12"
          rx="6"
          fill="#22c55e"
        />
        <text x="188" y="60" fill="#e5e7eb" fontSize="11">
          {effPct.toFixed(1)}%
        </text>

        <text x="188" y="82" fill="#94a3b8" fontSize="11">
          Friction power
        </text>
        <rect x="188" y="88" width="140" height="10" rx="5" fill="#020617" stroke="#1f2937" />
        <rect
          x="188"
          y="88"
          width={140 * barFp}
          height="10"
          rx="5"
          fill="#f97316"
        />
        <text x="188" y="104" fill="#e5e7eb" fontSize="11">
          {fp.toFixed(2)} kW
        </text>
      </svg>
    </div>
  );
}

