import React, { useState } from "react";

export function ReplayPanel({
  frames,
  index,
  onScrub,
  onApplyFrame,
  driveEnabled,
  onDriveChange,
}) {
  const [localDrive, setLocalDrive] = useState(true);
  const drive = driveEnabled ?? localDrive;
  const setDrive = onDriveChange ?? setLocalDrive;

  if (!frames.length) {
    return (
      <div className="replay-panel muted small">
        Record a session to enable replay scrubbing. Scrubbing can drive RPM, load, oil, and preset to match
        the recording.
      </div>
    );
  }
  const f = frames[Math.min(index, frames.length - 1)];
  return (
    <div className="replay-panel">
      <div className="replay-head">
        <span>Replay ({frames.length} samples)</span>
        <button type="button" className="btn ghost" onClick={() => onApplyFrame(index)}>
          Apply frame
        </button>
      </div>
      <label className="chk replay-drive">
        <input
          type="checkbox"
          checked={drive}
          onChange={(e) => setDrive(e.target.checked)}
        />
        Scrub drives simulator (instant)
      </label>
      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={index}
        onChange={(e) => {
          const i = Number(e.target.value);
          onScrub(i, drive);
        }}
      />
      {f && (
        <div className="replay-meta small">
          t={f.t.toFixed(2)}s · RPM {f.rpm.toFixed(0)} · load {(f.load * 100).toFixed(0)}% · η{" "}
          {(f.eta * 100).toFixed(1)}%
          {f.presetId != null && f.presetId !== "" && (
            <span> · preset {String(f.presetId)}</span>
          )}
        </div>
      )}
    </div>
  );
}
