import React, { useEffect, useMemo, useState } from "react";
import { EngineScene } from "./Engine3D/EngineScene";
import {
  computeEngineState,
  sweepRpmVsFriction,
  ENGINE_PRESETS,
} from "../physics/engineModel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function DualCompare({
  linked,
  onLinkedChange,
  appendRows,
  baseRpm,
  baseLoad,
  viscosityKey,
}) {
  const [rpmA, setRpmA] = useState(baseRpm);
  const [loadA, setLoadA] = useState(baseLoad);
  const [rpmB, setRpmB] = useState(baseRpm * 0.92);
  const [loadB, setLoadB] = useState(baseLoad);

  useEffect(() => {
    if (!linked) return;
    setRpmA(baseRpm);
    setLoadA(baseLoad);
    setRpmB(baseRpm * 0.98);
    setLoadB(baseLoad);
  }, [linked, baseRpm, baseLoad]);

  const presetA = ENGINE_PRESETS.highSpeed;
  const presetB = ENGINE_PRESETS.downsized;

  const stateA = useMemo(
    () =>
      computeEngineState({
        rpm: rpmA,
        load: loadA,
        viscosityKey,
        preset: presetA,
      }),
    [rpmA, loadA, viscosityKey, presetA]
  );
  const stateB = useMemo(
    () =>
      computeEngineState({
        rpm: rpmB,
        load: loadB,
        viscosityKey,
        preset: presetB,
      }),
    [rpmB, loadB, viscosityKey, presetB]
  );

  const overlay = useMemo(() => {
    const sa = sweepRpmVsFriction(loadA, viscosityKey, presetA, 500, 7200, 40);
    const sb = sweepRpmVsFriction(loadB, viscosityKey, presetB, 500, 7200, 40);
    return sa.map((row, i) => ({
      rpm: row.rpm,
      frictionA: row.friction,
      frictionB: sb[i]?.friction ?? row.friction,
    }));
  }, [loadA, loadB, viscosityKey, presetA, presetB]);

  const logCompare = () => {
    appendRows(
      [
        {
          label: "Compare A",
          engineTag: "A",
          rpm: stateA.rpm,
          load: stateA.load,
          viscosity: viscosityKey,
          IP: stateA.IP,
          BP: stateA.BP,
          FP: stateA.FP,
          eta: stateA.etaMechanical,
          thermal: stateA.thermalIndex,
        },
        {
          label: "Compare B",
          engineTag: "B",
          rpm: stateB.rpm,
          load: stateB.load,
          viscosity: viscosityKey,
          IP: stateB.IP,
          BP: stateB.BP,
          FP: stateB.FP,
          eta: stateB.etaMechanical,
          thermal: stateB.thermalIndex,
        },
      ],
      "compare"
    );
  };

  return (
    <div className="dual-compare">
      <div className="dual-toolbar">
        <label className="chk">
          <input type="checkbox" checked={linked} onChange={(e) => onLinkedChange(e.target.checked)} />
          Link to workshop RPM/load
        </label>
        <button type="button" className="btn ghost" onClick={logCompare}>
          Log both engines
        </button>
      </div>
      <div className="dual-grid">
        <div className="dual-pane">
          <div className="dual-header" style={{ color: presetA.color }}>
            {presetA.label}
          </div>
          <div className="dual-canvas">
            <EngineScene
              rpm={rpmA}
              load={loadA}
              exploded={false}
              filmStress={stateA.filmStress}
              failure={stateA.failure}
              qualityMode="performance"
            />
          </div>
          <div className="dual-readouts">
            <span>BP {stateA.BP.toFixed(1)} kW</span>
            <span>η {(stateA.etaMechanical * 100).toFixed(1)}%</span>
          </div>
          <label>
            RPM A
            <input
              type="range"
              min={500}
              max={7800}
              value={rpmA}
              disabled={linked}
              onChange={(e) => setRpmA(Number(e.target.value))}
            />
          </label>
          <label>
            Load A
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={loadA}
              disabled={linked}
              onChange={(e) => setLoadA(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="dual-pane">
          <div className="dual-header" style={{ color: presetB.color }}>
            {presetB.label}
          </div>
          <div className="dual-canvas">
            <EngineScene
              rpm={rpmB}
              load={loadB}
              exploded={false}
              filmStress={stateB.filmStress}
              failure={stateB.failure}
              qualityMode="performance"
            />
          </div>
          <div className="dual-readouts">
            <span>BP {stateB.BP.toFixed(1)} kW</span>
            <span>η {(stateB.etaMechanical * 100).toFixed(1)}%</span>
          </div>
          <label>
            RPM B
            <input
              type="range"
              min={500}
              max={7800}
              value={rpmB}
              disabled={linked}
              onChange={(e) => setRpmB(Number(e.target.value))}
            />
          </label>
          <label>
            Load B
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={loadB}
              disabled={linked}
              onChange={(e) => setLoadB(Number(e.target.value))}
            />
          </label>
        </div>
      </div>
      <div className="chart-card">
        <header>Overlay: friction vs RPM (both configurations)</header>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={overlay}>
            <XAxis dataKey="rpm" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Legend />
            <Line type="monotone" dataKey="frictionA" name="High-speed" stroke={presetA.color} dot={false} />
            <Line type="monotone" dataKey="frictionB" name="Downsized" stroke={presetB.color} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
