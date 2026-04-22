import React, { useMemo, useState } from "react";

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ObservationTable({ rows, onClear }) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("ts");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      JSON.stringify(r)
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "ts" ? "desc" : "asc");
    }
  };

  const exportCsv = () => {
    const headers = [
      "id",
      "ts",
      "source",
      "engineTag",
      "label",
      "test",
      "rpm",
      "load",
      "viscosity",
      "IP",
      "BP",
      "FP",
      "eta",
      "thermal",
    ];
    const lines = [headers.join(",")];
    for (const r of sorted) {
      lines.push(
        headers
          .map((h) => {
            const v = r[h];
            if (v === undefined || v === null) return "";
            const s = typeof v === "object" ? JSON.stringify(v) : String(v);
            return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      );
    }
    downloadCsv(`engine-lab-${Date.now()}.csv`, lines.join("\n"));
  };

  return (
    <div className="obs-table">
      <div className="obs-toolbar">
        <input
          className="obs-filter"
          placeholder="Filter rows (any field)…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="btn ghost" onClick={exportCsv}>
          Export CSV
        </button>
        <button type="button" className="btn ghost danger-text" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                ["ts", "Time"],
                ["source", "Source"],
                ["engineTag", "Eng"],
                ["label", "Label"],
                ["test", "Test"],
                ["rpm", "RPM"],
                ["load", "Load"],
                ["viscosity", "Oil"],
                ["IP", "IP"],
                ["BP", "BP"],
                ["FP", "FP"],
                ["eta", "η_m"],
              ].map(([k, label]) => (
                <th key={k} onClick={() => toggleSort(k)} className={sortKey === k ? "active" : ""}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{r.ts}</td>
                <td>{r.source}</td>
                <td>{r.engineTag ?? "—"}</td>
                <td>{r.label ?? "—"}</td>
                <td>{r.test ?? "—"}</td>
                <td>{r.rpm != null ? Math.round(r.rpm) : "—"}</td>
                <td>{r.load != null ? (r.load * 100).toFixed(1) + "%" : "—"}</td>
                <td>{r.viscosity ?? r.viscosityKey ?? "—"}</td>
                <td>{r.IP != null ? r.IP.toFixed(2) : "—"}</td>
                <td>{r.BP != null ? r.BP.toFixed(2) : "—"}</td>
                <td>{r.FP != null ? r.FP.toFixed(2) : "—"}</td>
                <td>{r.eta != null ? (r.eta * 100).toFixed(1) + "%" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
