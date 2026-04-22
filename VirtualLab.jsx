import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { simulateMorseTest, simulateMotoringTest, simulateRetardationTest } from "../physics/laboratoryTests";
import { ENGINE_PRESETS } from "../physics/engineModel";
import { Lab2DSimulation } from "./Lab2DSimulation";

export function VirtualLab({
  baseRpm,
  baseLoad,
  viscosityKey,
  preset,
  appendRows,
}) {
  const [active, setActive] = useState(null);
  const [series, setSeries] = useState([]);
  const [playIndex, setPlayIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const run = (kind) => {
    setActive(kind);
    let res;
    if (kind === "morse") {
      res = simulateMorseTest({
        baseRpm,
        baseLoad,
        viscosityKey,
        preset,
      });
    } else if (kind === "motoring") {
      res = simulateMotoringTest({ viscosityKey, preset });
    } else {
      res = simulateRetardationTest({
        startRpm: Math.min(baseRpm + 800, 6200),
        viscosityKey,
        preset,
      });
    }
    setSeries(res.series);
    setPlayIndex(0);
    setPlaying(true);
    appendRows(
      res.rows.map((r) => ({
        ...r,
        engineTag: "Lab",
      })),
      `lab-${kind}`
    );
  };

  useEffect(() => {
    if (!active || !playing || series.length < 2) return;
    const id = setInterval(() => {
      setPlayIndex((idx) => (idx + 1 >= series.length ? 0 : idx + 1));
    }, 90);
    return () => clearInterval(id);
  }, [active, playing, series.length]);

  const currentPoint = useMemo(
    () => series[Math.min(playIndex, Math.max(series.length - 1, 0))],
    [series, playIndex]
  );

  return (
    <div className="virtual-lab">
      <div className="lab-actions">
        <button type="button" className="btn" onClick={() => run("morse")}>
          Morse (cut sequence)
        </button>
        <button type="button" className="btn" onClick={() => run("motoring")}>
          Motoring sweep
        </button>
        <button type="button" className="btn" onClick={() => run("retardation")}>
          Retardation coast
        </button>
      </div>
      {active && (
        <div className="lab-chart">
          <header>
            {active === "morse" && "Morse test — BP vs cylinder activity"}
            {active === "motoring" && "Motoring test — friction vs RPM"}
            {active === "retardation" && "Retardation test — coast-down proxy"}
          </header>
          <div className="lab2d-panel">
            <Lab2DSimulation
              testKind={active}
              point={currentPoint}
              progress={series.length > 1 ? playIndex / (series.length - 1) : 0}
            />
            <div className="lab2d-controls">
              <button type="button" className="btn ghost" onClick={() => setPlaying((p) => !p)}>
                {playing ? "Pause 2D" : "Play 2D"}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(series.length - 1, 0)}
                value={playIndex}
                onChange={(e) => setPlayIndex(Number(e.target.value))}
              />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            {active === "morse" && (
              <LineChart data={series}>
                <XAxis dataKey="t" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                <Legend />
                <Line type="monotone" dataKey="bp" name="BP" stroke="#22d3ee" dot={false} />
                <Line type="monotone" dataKey="fp" name="FP" stroke="#fb7185" dot={false} />
              </LineChart>
            )}
            {active === "motoring" && (
              <LineChart data={series}>
                <XAxis dataKey="rpm" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                <Line type="monotone" dataKey="motoringFp" name="Motoring FP" stroke="#fbbf24" dot={false} />
              </LineChart>
            )}
            {active === "retardation" && (
              <LineChart data={series}>
                <XAxis dataKey="t" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                <Legend />
                <Line type="monotone" dataKey="rpm" name="RPM" stroke="#38bdf8" dot={false} />
                <Line type="monotone" dataKey="fpProxy" name="FP proxy" stroke="#f472b6" dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <p className="muted small">
        Laboratory routines append structured rows to the observation log for correlation with the 3D view.
        Presets: {Object.values(ENGINE_PRESETS).map((p) => p.label).join(" · ")}.
      </p>
    </div>
  );
}
