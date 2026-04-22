/**
 * Spark-ignition mechanical efficiency model (modular, deterministic).
 * IP = indicated power, FP = friction power, BP = brake power, η_m = BP/IP.
 */

export const VISCOSITY = {
  thin: { key: "thin", label: "Thin", factor: 0.55 },
  standard: { key: "standard", label: "Standard", factor: 1 },
  thick: { key: "thick", label: "Thick", factor: 1.85 },
};

/** Presets for comparison mode */
export const ENGINE_PRESETS = {
  highSpeed: {
    id: "highSpeed",
    label: "High-speed SI",
    ipScale: 1.05,
    frictionScale: 0.92,
    rpmBias: 1.08,
    color: "#3b82f6",
  },
  downsized: {
    id: "downsized",
    label: "Downsized turbo",
    ipScale: 0.92,
    frictionScale: 1.08,
    rpmBias: 0.96,
    color: "#f97316",
  },
};

/** Shares of total friction power (piston assembly dominant ~50%) */
export const FRICTION_BREAKDOWN = {
  piston: 0.5,
  bearings: 0.2,
  valveTrain: 0.15,
  auxiliary: 0.15,
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function viscosityFactor(viscosityKey) {
  return VISCOSITY[viscosityKey]?.factor ?? VISCOSITY.standard.factor;
}

/**
 * Core power balance. FP has a strong ω² (RPM²) viscous term plus load-dependent mechanical loss.
 */
export function computeEngineState({
  rpm,
  load,
  viscosityKey = "standard",
  preset = null,
  timeS = 0,
}) {
  const rpmSafe = clamp(rpm, 0, 12000);
  const loadSafe = clamp(load, 0, 1);
  const vf = viscosityFactor(viscosityKey);
  const ipScale = preset?.ipScale ?? 1;
  const frictionScale = preset?.frictionScale ?? 1;
  const rpmBias = preset?.rpmBias ?? 1;

  const rpmEff = rpmSafe * rpmBias;

  // Indicated power (kW): scales with load and speed; mild high-RPM enrichment then roll-off
  const rpmNorm = rpmEff / 1000;
  const enrichment = 1 + 0.12 * Math.sin((rpmEff / 6500) * Math.PI * 0.5) * step(rpmEff, 3500);
  const rollOff = 1 - 0.22 * Math.pow(clamp((rpmEff - 5200) / 3800, 0, 1), 1.35);
  let IP = 95 * loadSafe * rpmNorm * enrichment * rollOff * ipScale;

  // Friction power (kW): ω² dominant + load × speed (bearings) + viscosity multiplier
  const FP_viscous = 6.8e-6 * rpmEff * rpmEff * vf * frictionScale;
  const FP_mechanical = 0.018 * loadSafe * Math.sqrt(rpmEff + 1) * frictionScale;
  const FP_base = FP_viscous + FP_mechanical;

  let BP = Math.max(IP - FP_base, 0);
  let etaMechanical = IP > 1e-6 ? BP / IP : 0;

  // High-RPM mechanical efficiency penalty (valve float, ring bounce, pumping)
  const highRpmPenalty =
    1 - 0.18 * Math.pow(clamp((rpmEff - 4800) / 4200, 0, 1), 1.4);
  etaMechanical *= highRpmPenalty;

  BP = IP * etaMechanical;
  const FP = Math.max(IP - BP, 0);

  // Thermal / stress index (unitless): drives overheating warnings
  const thermalIndex = 0.55 * (IP / 85) + 0.35 * (rpmEff / 6000) + 0.25 * loadSafe;
  const split = frictionLossSplit(FP);

  const overheating = thermalIndex > 1.35;
  const frictionCritical = FP > 0.88 * IP && IP > 5;
  const failure = overheating || frictionCritical;

  // "Oil film" stress for visualization (0–1)
  const filmStress = clamp(
    0.35 * vf + 0.4 * (rpmEff / 7000) + 0.35 * loadSafe,
    0,
    1
  );

  return {
    rpm: rpmSafe,
    load: loadSafe,
    viscosityKey,
    IP,
    BP,
    FP,
    etaMechanical: clamp(etaMechanical, 0, 1),
    thermalIndex,
    overheating,
    frictionCritical,
    failure,
    filmStress,
    FP_viscous,
    FP_mechanical,
    lossSplit: split,
    presetId: preset?.id ?? null,
    timeS,
  };
}

function step(x, t) {
  return x >= t ? 1 : 0;
}

export function frictionLossSplit(FP) {
  const total = FP;
  return {
    piston: total * FRICTION_BREAKDOWN.piston,
    bearings: total * FRICTION_BREAKDOWN.bearings,
    valveTrain: total * FRICTION_BREAKDOWN.valveTrain,
    auxiliary: total * FRICTION_BREAKDOWN.auxiliary,
  };
}

/** Sweep for charts */
export function sweepRpmVsFriction(load, viscosityKey, preset, rpmMin = 400, rpmMax = 7200, steps = 48) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const rpm = rpmMin + (i / steps) * (rpmMax - rpmMin);
    const s = computeEngineState({ rpm, load, viscosityKey, preset });
    out.push({ rpm, friction: s.FP, bp: s.BP, ip: s.IP, eta: s.etaMechanical * 100 });
  }
  return out;
}

export function sweepEfficiencyVsLoad(rpm, viscosityKey, preset) {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const load = i / 20;
    const s = computeEngineState({ rpm, load, viscosityKey, preset });
    pts.push({ load: load * 100, efficiency: s.etaMechanical * 100, bp: s.BP });
  }
  return pts;
}

/** 2D grid for heatmap: rows load, cols rpm */
export function efficiencyHeatmap(viscosityKey, preset, loadSteps = 8, rpmSteps = 12) {
  const grid = [];
  for (let li = 0; li <= loadSteps; li++) {
    const row = [];
    const load = li / loadSteps;
    for (let ri = 0; ri <= rpmSteps; ri++) {
      const rpm = 600 + (ri / rpmSteps) * 6600;
      const s = computeEngineState({ rpm, load, viscosityKey, preset });
      row.push({
        rpm,
        load,
        eta: s.etaMechanical,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function powerDistributionCurve(rpm, load, viscosityKey, preset) {
  const s = computeEngineState({ rpm, load, viscosityKey, preset });
  const items = [
    { name: "Brake (BP)", value: Math.max(s.BP, 0), fill: "#22d3ee" },
    { name: "Friction (FP)", value: Math.max(s.FP, 0), fill: "#f43f5e" },
  ];
  // If both values are tiny, still return both as zero to keep chart layout stable
  if (items.every((it) => it.value < 0.01)) {
    return items.map((it) => ({ ...it, value: 0 }));
  }
  return items.filter((d) => d.value > 0.01);
}

/** Heuristic optimization hints (extensible AI hook) */
export function optimizationHints(state) {
  const hints = [];
  if (state.etaMechanical < 0.72 && state.rpm > 5000) {
    hints.push("High RPM is eroding mechanical efficiency; reduce speed or increase load modestly.");
  }
  if (state.viscosityKey === "thick" && state.rpm > 5500) {
    hints.push("Thick oil at high speed increases viscous friction sharply; consider standard grade for this operating point.");
  }
  if (state.thermalIndex > 1.15) {
    hints.push("Thermal index elevated: enrich cooling / reduce sustained high-load at this RPM.");
  }
  if (state.FP_viscous > state.FP_mechanical * 2.2) {
    hints.push("Viscous friction dominates; viscosity and RPM are the primary levers.");
  }
  if (hints.length === 0) {
    hints.push("Operating point is within a balanced regime for this model.");
  }
  return hints;
}
