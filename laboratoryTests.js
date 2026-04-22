import { computeEngineState } from "./engineModel";

/**
 * Morse test (simulated): sequential "cut" of cylinders — BP drops; estimate friction per active bank.
 * Returns time series + table rows for observation log.
 */
export function simulateMorseTest({
  baseRpm,
  baseLoad,
  viscosityKey,
  preset,
  cylinders = 4,
  durationMs = 8000,
  sampleMs = 200,
}) {
  const series = [];
  const rows = [];
  const steps = Math.ceil(durationMs / sampleMs);

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (durationMs / 1000);
    const active = cylinders - Math.floor((i / steps) * cylinders);
    const loadEff = baseLoad * (active / cylinders);
    const s = computeEngineState({
      rpm: baseRpm,
      load: loadEff,
      viscosityKey,
      preset,
      timeS: t,
    });
    series.push({
      t,
      rpm: baseRpm,
      activeCylinders: Math.max(active, 0.25),
      bp: s.BP,
      ip: s.IP,
      fp: s.FP,
      eta: s.etaMechanical * 100,
    });
    if (i % 4 === 0) {
      rows.push({
        label: `Morse cyl ${Math.max(active, 0)} active`,
        rpm: baseRpm,
        load: loadEff,
        viscosity: viscosityKey,
        IP: s.IP,
        BP: s.BP,
        FP: s.FP,
        eta: s.etaMechanical,
        test: "Morse",
        meta: { activeCylinders: active },
      });
    }
  }
  return { series, rows, name: "Morse (cylinder cut)" };
}

/** Motoring test: zero indicated torque; friction measured as motoring power at RPM sweep */
export function simulateMotoringTest({
  viscosityKey,
  preset,
  rpmMin = 800,
  rpmMax = 5500,
  durationMs = 6000,
  sampleMs = 150,
}) {
  const series = [];
  const rows = [];
  const steps = Math.ceil(durationMs / sampleMs);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (durationMs / 1000);
    const rpm = rpmMin + (i / steps) * (rpmMax - rpmMin);
    const s = computeEngineState({
      rpm,
      load: 0.02,
      viscosityKey,
      preset,
      timeS: t,
    });
    const motoringFp = s.FP;
    const omega = (rpm / 60) * 2 * Math.PI;
    const motoringTorque = (motoringFp * 1000) / (omega + 1e-6);
    series.push({ t, rpm, motoringFp, motoringTorque, bp: s.BP });
    if (i % 5 === 0) {
      rows.push({
        label: `Motoring @ ${rpm.toFixed(0)} rpm`,
        rpm,
        load: 0.02,
        viscosity: viscosityKey,
        IP: s.IP,
        BP: s.BP,
        FP: motoringFp,
        eta: s.etaMechanical,
        test: "Motoring",
        meta: { motoring: true },
      });
    }
  }
  return { series, rows, name: "Motoring (friction sweep)" };
}

/** Retardation test: coast-down from high RPM; model FP proxy from deceleration curve */
export function simulateRetardationTest({
  startRpm,
  viscosityKey,
  preset,
  durationMs = 7000,
  sampleMs = 120,
}) {
  const series = [];
  const rows = [];
  const steps = Math.ceil(durationMs / sampleMs);
  let rpm = startRpm;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (durationMs / 1000);
    const s = computeEngineState({
      rpm,
      load: 0.08,
      viscosityKey,
      preset,
      timeS: t,
    });
    const J = 0.22;
    const omega = (rpm / 60) * 2 * Math.PI;
    const FP_equiv = s.FP;
    const decel = (FP_equiv * 1000) / (J * omega * omega + 1e-6);
    const velocity = omega * 0.11;
    series.push({
      t,
      rpm,
      fpProxy: FP_equiv,
      decel,
      velocity,
    });
    if (i % 4 === 0) {
      rows.push({
        label: `Retardation ${rpm.toFixed(0)} rpm`,
        rpm,
        load: 0.08,
        viscosity: viscosityKey,
        IP: s.IP,
        BP: s.BP,
        FP: s.FP,
        eta: s.etaMechanical,
        test: "Retardation",
        meta: { decel },
      });
    }
    rpm = Math.max(400, rpm - decel * (sampleMs / 1000) * 18);
  }
  return { series, rows, name: "Retardation (coast-down)" };
}
