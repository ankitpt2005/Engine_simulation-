import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  sweepRpmVsFriction,
  sweepEfficiencyVsLoad,
  computeEngineState,
} from "../../physics/engineModel";

export function ChartsPanel({ rpm, load, viscosityKey, preset }) {
  const rpmFriction = useMemo(
    () => sweepRpmVsFriction(load, viscosityKey, preset),
    [load, viscosityKey, preset]
  );
  const effLoad = useMemo(
    () => sweepEfficiencyVsLoad(rpm, viscosityKey, preset),
    [rpm, viscosityKey, preset]
  );
  const live = useMemo(
    () => computeEngineState({ rpm, load, viscosityKey, preset }),
    [rpm, load, viscosityKey, preset]
  );

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <header>RPM vs friction power</header>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={rpmFriction}>
            <defs>
              <linearGradient id="fr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="rpm" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Area type="monotone" dataKey="friction" stroke="#f43f5e" fill="url(#fr)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <footer>Live FP: {live.FP.toFixed(2)} kW @ {Math.round(rpm)} rpm</footer>
      </div>

      <div className="chart-card">
        <header>Efficiency vs load</header>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={effLoad}>
            <XAxis dataKey="load" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            <Line
              type="monotone"
              dataKey="efficiency"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <footer>η_m: {(live.etaMechanical * 100).toFixed(1)}%</footer>
      </div>
    </div>
  );
}
