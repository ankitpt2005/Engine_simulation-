import React, { useEffect, useState } from "react";
import "./App.css";
import { EngineProvider, useEngine } from "./context/EngineContext";
import { Engine2DView } from "./components/Engine2DView";
import { ControlDeck } from "./components/ui/ControlDeck";
import { MetricsPanel } from "./components/MetricsPanel";
import { ChartsPanel } from "./components/charts/ChartsPanel";
import { LossDonut } from "./components/charts/LossDonut";
import { EfficiencyHeatmap } from "./components/charts/EfficiencyHeatmap";
import { ObservationTable } from "./components/ObservationTable";
import { VirtualLab } from "./components/VirtualLab";
import { DualCompare } from "./components/DualCompare";
import { ReplayPanel } from "./components/ReplayPanel";
import { powerDistributionCurve } from "./physics/engineModel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function Workshop() {
  const {
    targetRpm,
    setTargetRpm,
    targetLoad,
    setTargetLoad,
    viscosityKey,
    setViscosityKey,
    qualityMode,
    setQualityMode,
    explodedView,
    setExplodedView,
    physics,
    smoothedRpm,
    smoothedLoad,
    snapshot,
    observationLog,
    appendRows,
    clearLog,
    recording,
    startRecording,
    stopRecording,
    replayFrames,
    replayIndex,
    setReplayIndex,
    jumpToReplayFrame,
    linkedCompare,
    setLinkedCompare,
    preset,
    setPreset,
    ENGINE_PRESETS,
  } = useEngine();

  const [tab, setTab] = useState("workshop");
  const [streamLog, setStreamLog] = useState(false);

  useEffect(() => {
    if (!streamLog) return;
    const id = setInterval(() => {
      appendRows(
        [
          {
            label: "Stream",
            rpm: physics.rpm,
            load: physics.load,
            viscosity: physics.viscosityKey,
            IP: physics.IP,
            BP: physics.BP,
            FP: physics.FP,
            eta: physics.etaMechanical,
            thermal: physics.thermalIndex,
          },
        ],
        "stream"
      );
    }, 900);
    return () => clearInterval(id);
  }, [streamLog, appendRows, physics]);

  const powerDist = powerDistributionCurve(smoothedRpm, smoothedLoad, viscosityKey, preset);
  const powerSum = powerDist.reduce((s, d) => s + (d?.value || 0), 0);

  return (
    <div className="app-root">
      <header className="hero">
        <div>
          <p className="eyebrow">Digital engine laboratory</p>
          <h1>Spark-ignition mechanical efficiency</h1>
          <p className="lede">
            Physics-driven IP / BP / FP balance with RPM² friction scaling, viscosity-aware losses, and
            synchronized 3D mechanics.
          </p>
        </div>
        <div className="hero-tabs">
          {["workshop", "lab", "compare"].map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? "tab active" : "tab"}
              onClick={() => setTab(t)}
            >
              {t === "workshop" && "Workshop"}
              {t === "lab" && "Virtual tests"}
              {t === "compare" && "Engine compare"}
            </button>
          ))}
        </div>
      </header>

      {tab === "workshop" && (
        <main className="layout">
          <section className="panel viewport-panel">
            <div className="panel-head">
              <span>Live 2D engine model</span>
              <span className={physics.failure ? "pill danger" : "pill ok"}>
                {physics.failure ? "Constraint active" : "Stable"}
              </span>
            </div>
            <div className={`viewport viewport-2d ${physics.failure ? "viewport-alert" : ""}`}>
              <Engine2DView
                rpm={smoothedRpm}
                load={smoothedLoad}
                viscosityKey={viscosityKey}
                physics={physics}
              />
              <div className="engine2d-controls">
                <div>
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
                <div>
                  <label>
                    <span>Load</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={targetLoad}
                      onChange={(e) => setTargetLoad(Number(e.target.value))}
                    />
                    <output>{(targetLoad * 100).toFixed(0)}%</output>
                  </label>
                </div>
                <div>
                  <label>
                    <span>Oil</span>
                    <select
                      value={viscosityKey}
                      onChange={(e) => setViscosityKey(e.target.value)}
                    >
                      <option value="thin">Thin</option>
                      <option value="standard">Standard</option>
                      <option value="thick">Thick</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <ReplayPanel
              frames={replayFrames}
              index={replayIndex}
              onScrub={(i, drive) => {
                setReplayIndex(i);
                if (drive && replayFrames[i]) {
                  jumpToReplayFrame(replayFrames[i]);
                }
              }}
              onApplyFrame={(i) => {
                setReplayIndex(i);
                const f = replayFrames[i];
                if (f) jumpToReplayFrame(f);
              }}
            />
          </section>

          <aside className="panel side-panel">
            <MetricsPanel physics={physics} />
            <ControlDeck
              targetRpm={targetRpm}
              setTargetRpm={setTargetRpm}
              targetLoad={targetLoad}
              setTargetLoad={setTargetLoad}
              viscosityKey={viscosityKey}
              setViscosityKey={setViscosityKey}
              preset={preset}
              setPreset={setPreset}
              enginePresets={ENGINE_PRESETS}
              qualityMode={qualityMode}
              setQualityMode={setQualityMode}
              explodedView={explodedView}
              setExplodedView={setExplodedView}
              onSnapshot={snapshot}
              recording={recording}
              onToggleRecord={recording ? stopRecording : startRecording}
            />
            <label className="chk stream">
              <input type="checkbox" checked={streamLog} onChange={(e) => setStreamLog(e.target.checked)} />
              Stream samples to observation table (~1 Hz)
            </label>
          </aside>

          <section className="panel wide-panel">
            <div className="panel-head">
              <span>Analytics & loss structure</span>
            </div>
            <ChartsPanel
              rpm={smoothedRpm}
              load={smoothedLoad}
              viscosityKey={viscosityKey}
              preset={preset}
            />
            <div className="analytics-split">
              <LossDonut FP={physics.FP} />
              <div className="chart-card">
                <header>Power distribution (IP → BP + FP)</header>
                {powerSum > 0.01 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={powerDist}>
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {powerDist.map((d) => (
                          <Cell key={d.name} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No measurable brake or friction power at this operating point.</div>
                )}
              </div>
            </div>
            <EfficiencyHeatmap
              viscosityKey={viscosityKey}
              preset={preset}
              rpm={smoothedRpm}
              load={smoothedLoad}
            />
          </section>

          <section className="panel full-panel">
            <div className="panel-head">
              <span>Observation & analysis</span>
            </div>
            <ObservationTable rows={observationLog} onClear={clearLog} />
          </section>
        </main>
      )}

      {tab === "lab" && (
        <main className="layout single">
          <section className="panel">
            <div className="panel-head">
              <span>Virtual testing laboratory</span>
            </div>
            <VirtualLab
              baseRpm={targetRpm}
              baseLoad={targetLoad}
              viscosityKey={viscosityKey}
              preset={preset}
              appendRows={appendRows}
            />
          </section>
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="panel-head">
              <span>Observation & analysis (lab)</span>
            </div>
            <ObservationTable rows={observationLog} onClear={clearLog} />
          </section>
        </main>
      )}

      {tab === "compare" && (
        <main className="layout single">
          <section className="panel">
            <div className="panel-head">
              <span>Real-time engine comparison</span>
            </div>
            <DualCompare
              linked={linkedCompare}
              onLinkedChange={setLinkedCompare}
              appendRows={appendRows}
              baseRpm={targetRpm}
              baseLoad={targetLoad}
              viscosityKey={viscosityKey}
            />
          </section>
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="panel-head">
              <span>Observation & analysis (compare)</span>
            </div>
            <ObservationTable rows={observationLog} onClear={clearLog} />
          </section>
        </main>
      )}

      <footer className="footer">
        Modular architecture: physics · simulation control · WebGL · UI · observation data. Extensible hooks
        for exploded view, AI hints, replay, and scenario dashboards.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <EngineProvider>
      <Workshop />
    </EngineProvider>
  );
}
