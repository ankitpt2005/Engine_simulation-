import React from "react";
import { VISCOSITY } from "../../physics/engineModel";

export function ControlDeck({
  targetRpm,
  setTargetRpm,
  targetLoad,
  setTargetLoad,
  viscosityKey,
  setViscosityKey,
  preset,
  setPreset,
  enginePresets,
  qualityMode,
  setQualityMode,
  explodedView,
  setExplodedView,
  onSnapshot,
  recording,
  onToggleRecord,
}) {
  return (
    <div className="control-deck">
      <div className="control-row">
        <label>
          <span>RPM</span>
          <input
            type="range"
            min={400}
            max={7800}
            step={10}
            value={targetRpm}
            onChange={(e) => setTargetRpm(Number(e.target.value))}
          />
          <output>{Math.round(targetRpm)}</output>
        </label>
      </div>
      <div className="control-row">
        <label>
          <span>Load</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={targetLoad}
            onChange={(e) => setTargetLoad(Number(e.target.value))}
          />
          <output>{(targetLoad * 100).toFixed(1)}%</output>
        </label>
      </div>
      <div className="control-row">
        <label>
          <span>Oil viscosity</span>
          <select value={viscosityKey} onChange={(e) => setViscosityKey(e.target.value)}>
            {Object.values(VISCOSITY).map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="control-row">
        <label>
          <span>Engine configuration</span>
          <select
            value={preset?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              setPreset(id && enginePresets[id] ? enginePresets[id] : null);
            }}
          >
            <option value="">Baseline (generic)</option>
            {Object.values(enginePresets).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="control-row toggles">
        <label className="chk">
          <input
            type="checkbox"
            checked={explodedView}
            onChange={(e) => setExplodedView(e.target.checked)}
          />
          Exploded view
        </label>
        <label className="chk">
          <input
            type="checkbox"
            checked={qualityMode === "cinematic"}
            onChange={(e) => setQualityMode(e.target.checked ? "cinematic" : "performance")}
          />
          Cinematic 4K
        </label>
      </div>
      <div className="control-actions">
        <button type="button" className="btn ghost" onClick={onSnapshot}>
          Log snapshot
        </button>
        <button type="button" className={recording ? "btn danger" : "btn"} onClick={onToggleRecord}>
          {recording ? "Stop recording" : "Record session"}
        </button>
      </div>
    </div>
  );
}
