import React from "react";
import { Gauge } from "./ui/Gauge";
import { optimizationHints } from "../physics/engineModel";

export function MetricsPanel({ physics }) {
  const hints = optimizationHints(physics);
  return (
    <div className="metrics-panel">
      <div className="metric-gauges">
        <Gauge label="η_m" value={physics.etaMechanical} max={1} unit="%" color="#34d399" />
        <Gauge label="BP" value={physics.BP} max={120} unit=" kW" color="#22d3ee" />
        <Gauge label="FP" value={physics.FP} max={80} unit=" kW" color="#fb7185" />
      </div>
      <div className="metric-grid">
        <div>
          <div className="muted">Indicated power (IP)</div>
          <div className="metric-value">{physics.IP.toFixed(2)} kW</div>
        </div>
        <div>
          <div className="muted">Brake power (BP)</div>
          <div className="metric-value accent">{physics.BP.toFixed(2)} kW</div>
        </div>
        <div>
          <div className="muted">Friction power (FP)</div>
          <div className="metric-value warn">{physics.FP.toFixed(2)} kW</div>
        </div>
        <div>
          <div className="muted">Thermal index</div>
          <div className={physics.overheating ? "metric-value danger" : "metric-value"}>
            {physics.thermalIndex.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="muted">Viscous / mech FP</div>
          <div className="metric-value small">
            {physics.FP_viscous.toFixed(2)} / {physics.FP_mechanical.toFixed(2)} kW
          </div>
        </div>
        <div>
          <div className="muted">Film stress</div>
          <div className="metric-value">{(physics.filmStress * 100).toFixed(0)}%</div>
        </div>
      </div>
      {(physics.failure || physics.frictionCritical || physics.overheating) && (
        <div className="alert danger">
          {physics.overheating && "Thermal limit approached — reduce load or RPM. "}
          {physics.frictionCritical && "Friction power approaching indicated power — mechanical distress. "}
        </div>
      )}
      <div className="hints">
        <div className="muted small">Optimization & diagnostics</div>
        <ul>
          {hints.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
