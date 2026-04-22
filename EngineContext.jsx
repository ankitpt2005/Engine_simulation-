import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { computeEngineState, ENGINE_PRESETS } from "../physics/engineModel";

const EngineContext = createContext(null);

const LERP = 0.12;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function EngineProvider({ children }) {
  const [targetRpm, setTargetRpm] = useState(2400);
  const [targetLoad, setTargetLoad] = useState(0.55);
  const [viscosityKey, setViscosityKey] = useState("standard");
  const [preset, setPreset] = useState(null);
  const [qualityMode, setQualityMode] = useState("cinematic");
  const [explodedView, setExplodedView] = useState(false);
  const [linkedCompare, setLinkedCompare] = useState(true);

  const [smoothedRpm, setSmoothedRpm] = useState(targetRpm);
  const [smoothedLoad, setSmoothedLoad] = useState(targetLoad);

  const raf = useRef(null);

  useEffect(() => {
    const tick = () => {
      setSmoothedRpm((r) => lerp(r, targetRpm, LERP));
      setSmoothedLoad((l) => lerp(l, targetLoad, LERP));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [targetRpm, targetLoad]);

  const simTime = useRef(0);
  const [timeS, setTimeS] = useState(0);
  useEffect(() => {
    let id;
    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      simTime.current = t;
      setTimeS(t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const physics = useMemo(
    () =>
      computeEngineState({
        rpm: smoothedRpm,
        load: smoothedLoad,
        viscosityKey,
        preset,
        timeS,
      }),
    [smoothedRpm, smoothedLoad, viscosityKey, preset, timeS]
  );

  const [observationLog, setObservationLog] = useState([]);
  const logCounter = useRef(0);

  const appendRows = useCallback((rows, source = "manual") => {
    setObservationLog((prev) => {
      const stamped = rows.map((r) => ({
        id: `row-${++logCounter.current}-${Date.now()}`,
        source,
        ts: new Date().toISOString(),
        engineTag: r.engineTag ?? "A",
        ...r,
      }));
      return [...stamped, ...prev].slice(0, 2000);
    });
  }, []);

  const snapshot = useCallback(() => {
    appendRows(
      [
        {
          label: "Snapshot",
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
      "snapshot"
    );
  }, [appendRows, physics]);

  const clearLog = useCallback(() => setObservationLog([]), []);

  const [replayFrames, setReplayFrames] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [recording, setRecording] = useState(false);

  const liveRef = useRef({});
  liveRef.current = {
    t: timeS,
    rpm: smoothedRpm,
    load: smoothedLoad,
    viscosityKey,
    preset,
    physics,
  };

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const L = liveRef.current;
      setReplayFrames((f) => [
        ...f,
        {
          t: L.t,
          rpm: L.rpm,
          load: L.load,
          viscosityKey: L.viscosityKey,
          presetId: L.preset?.id ?? null,
          IP: L.physics.IP,
          BP: L.physics.BP,
          FP: L.physics.FP,
          eta: L.physics.etaMechanical,
        },
      ]);
    }, 120);
    return () => clearInterval(id);
  }, [recording]);

  const startRecording = () => {
    setReplayFrames([]);
    setReplayIndex(0);
    setRecording(true);
  };
  const stopRecording = () => setRecording(false);

  const jumpToReplayFrame = useCallback((frame) => {
    if (!frame) return;
    setTargetRpm(frame.rpm);
    setTargetLoad(frame.load);
    setViscosityKey(frame.viscosityKey);
    setSmoothedRpm(frame.rpm);
    setSmoothedLoad(frame.load);
    if (Object.prototype.hasOwnProperty.call(frame, "presetId")) {
      if (frame.presetId && ENGINE_PRESETS[frame.presetId]) {
        setPreset(ENGINE_PRESETS[frame.presetId]);
      } else {
        setPreset(null);
      }
    }
  }, []);

  const value = {
    targetRpm,
    setTargetRpm,
    targetLoad,
    setTargetLoad,
    viscosityKey,
    setViscosityKey,
    preset,
    setPreset,
    qualityMode,
    setQualityMode,
    explodedView,
    setExplodedView,
    linkedCompare,
    setLinkedCompare,
    smoothedRpm,
    smoothedLoad,
    physics,
    observationLog,
    appendRows,
    snapshot,
    clearLog,
    replayFrames,
    replayIndex,
    setReplayIndex,
    recording,
    startRecording,
    stopRecording,
    jumpToReplayFrame,
    ENGINE_PRESETS,
  };

  return (
    <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
  );
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be used within EngineProvider");
  return ctx;
}
