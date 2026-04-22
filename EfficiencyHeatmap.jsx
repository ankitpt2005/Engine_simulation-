import React, { useMemo } from "react";
import { efficiencyHeatmap } from "../../physics/engineModel";

export function EfficiencyHeatmap({ viscosityKey, preset, rpm, load }) {
  const grid = useMemo(
    () => efficiencyHeatmap(viscosityKey, preset, 10, 14),
    [viscosityKey, preset]
  );

  const minEta = 0.35;
  const maxEta = 0.95;

  // Find the single closest cell to the current operating point and mark it as live
  const liveIndex = useMemo(() => {
    if (!grid || grid.length === 0) return { ri: -1, ci: -1 };
    let best = { ri: -1, ci: -1, dist: Infinity };
    for (let ri = 0; ri < grid.length; ri++) {
      const row = grid[ri];
      for (let ci = 0; ci < row.length; ci++) {
        const cell = row[ci];
        const dr = (cell.rpm - (rpm || 0)) / 6600; // normalize rpm
        const dl = (cell.load - (load || 0));
        const d = Math.hypot(dr, dl);
        if (d < best.dist) best = { ri, ci, dist: d };
      }
    }
    return { ri: best.ri, ci: best.ci };
  }, [grid, rpm, load]);

  return (
    <div className="chart-card heatmap-card">
      <header>Efficiency landscape (η_m)</header>
      <div className="heatmap">
        {grid.map((row, ri) => (
          <div key={ri} className="heatmap-row">
            {row.map((cell, ci) => {
              const t = (cell.eta - minEta) / (maxEta - minEta);
              const hue = 210 - t * 120;
              const lit = 35 + t * 35;
              const isLive = ri === liveIndex.ri && ci === liveIndex.ci;
              return (
                <div
                  key={ci}
                  className={isLive ? "cell live" : "cell"}
                  style={{ background: `hsl(${hue} 70% ${lit}%)` }}
                  title={`RPM ${cell.rpm.toFixed(0)}, load ${(cell.load * 100).toFixed(
                    0
                  )}%, η ${(cell.eta * 100).toFixed(1)}%`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <footer>Brighter = higher η_m · Crosshair follows operating point</footer>
    </div>
  );
}
