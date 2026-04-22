import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { frictionLossSplit, FRICTION_BREAKDOWN } from "../../physics/engineModel";

const COLORS = {
  piston: "#f97316",
  bearings: "#38bdf8",
  valveTrain: "#a78bfa",
  auxiliary: "#94a3b8",
};

export function LossDonut({ FP }) {
  const data = useMemo(() => {
    const s = frictionLossSplit(FP);
    return [
      { name: "Piston assy (~50%)", value: s.piston, key: "piston" },
      { name: "Bearings", value: s.bearings, key: "bearings" },
      { name: "Valve train", value: s.valveTrain, key: "valveTrain" },
      { name: "Auxiliary", value: s.auxiliary, key: "auxiliary" },
    ];
  }, [FP]);

  return (
    <div className="chart-card donut-card">
      <header>Friction loss breakdown (FP)</header>
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="#0f172a"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={COLORS[d.key]} stroke="#0b1220" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => `${v.toFixed(2)} kW`}
              contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <div className="muted">Total FP</div>
          <div className="big">{FP.toFixed(1)} kW</div>
          <div className="muted small">Piston share ≈ {(FRICTION_BREAKDOWN.piston * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}
