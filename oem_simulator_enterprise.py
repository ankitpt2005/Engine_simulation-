"""
OEM R&D ENGINE SIMULATOR v12.0 - MINIMALIST EDITION
Clean, professional UI focused entirely on data and usability.
"""

import sys
import os
import json
import sqlite3
import hashlib
import time
import math
import warnings
import threading
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Mock heavy optional libs so the app starts even when they're absent
# ---------------------------------------------------------------------------
for _mod in ("sounddevice", "pyaudio", "cv2", "mediapipe", "speech_recognition", "pyttsx3"):
    if _mod not in sys.modules:
        sys.modules[_mod] = type("_Mock", (), {"__getattr__": lambda s, a: lambda *args, **kw: None})()

try:
    import cupy as cp
    GPU_AVAILABLE = True
except ImportError:
    import numpy as cp
    GPU_AVAILABLE = False

try:
    import mediapipe as _mp
    AI_AVAILABLE = True
except Exception:
    AI_AVAILABLE = False

try:
    import speech_recognition as _sr
    import pyttsx3 as _tts
    VOICE_AVAILABLE = True
except Exception:
    VOICE_AVAILABLE = False

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots


# ===========================================================================
# PAGE CONFIG
# ===========================================================================
st.set_page_config(
    page_title="OEM Simulator | R&D",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ===========================================================================
# CSS / CLEAN THEMING
# ===========================================================================
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=JetBrains+Mono:wght@400;700&display=swap');

/* Base Styles */
.stApp {
    font-family: 'Inter', sans-serif;
    background-color: #0e1117;
    color: #e2e8f0;
}

/* Header */
.main-header {
    font-size: 1.75rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0px;
    padding-bottom: 0px;
    letter-spacing: -0.5px;
}
.sub-header {
    font-size: 0.85rem;
    color: #64748b;
    margin-top: -5px;
    margin-bottom: 20px;
}

/* Compact KPI Grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
    margin-bottom: 30px;
}

.kpi-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 12px 16px;
    transition: background 0.2s;
}

.kpi-card:hover {
    background: rgba(255, 255, 255, 0.04);
}

.kpi-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
    margin-bottom: 4px;
}

.kpi-value {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1;
}

.kpi-unit { 
    font-size: 0.75rem; 
    color: #64748b; 
    font-weight: 400;
    margin-left: 2px;
}

/* Colors */
.col-green  { color: #10b981; }
.col-orange { color: #f59e0b; }
.col-red    { color: #ef4444; }
.col-blue   { color: #38bdf8; }
.col-white  { color: #f8fafc; }

/* Alerts */
.alert-box {
    border-radius: 6px;
    padding: 10px 14px;
    margin: 10px 0;
    font-size: 0.85rem;
    border-left: 3px solid;
    background: rgba(255,255,255,0.03);
}
.alert-critical { border-color: #ef4444; color: #fca5a5; }
.alert-warning  { border-color: #f59e0b; color: #fcd34d; }
.alert-success  { border-color: #10b981; color: #6ee7b7; }

/* Sidebar clean up */
section[data-testid="stSidebar"] {
    background-color: #111827;
    border-right: 1px solid rgba(255,255,255,0.05);
}
.sidebar-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 15px;
    margin-bottom: -10px;
}

/* Hide default streamlit expander backgrounds if any */
.streamlit-expanderHeader {
    background-color: transparent !important;
}

</style>
""", unsafe_allow_html=True)


# ===========================================================================
# DATA STRUCTURES
# ===========================================================================
@dataclass
class TelemetryRecord:
    timestamp: str
    engine_id: str
    rpm: float
    load_pct: float
    bp_kw: float
    torque_nm: float
    bsfc_gkwh: float
    imep_bar: float
    bmep_bar: float
    nox_ppm: float
    nvh_db: float
    hash_id: str
    session_id: str


@dataclass
class EngineGeometry:
    bore_mm: float
    stroke_mm: float
    conrod_mm: float
    compression_ratio: float
    cylinders: int
    valve_count: int
    displacement_cc: float
    max_rpm: float = 8000.0


@dataclass
class VehicleConfig:
    mass_kg: float = 1500.0
    wheelbase_m: float = 2.7
    cg_height_m: float = 0.55
    track_width_m: float = 1.6
    tire_radius_m: float = 0.32
    final_drive: float = 3.73
    gear_ratios: List[float] = field(default_factory=lambda: [3.5, 2.0, 1.4, 1.0, 0.8, 0.65])
    Cd: float = 0.30
    frontal_area_m2: float = 2.2


# ===========================================================================
# ENTERPRISE DATA MANAGER
# ===========================================================================
class EnterpriseDataManager:
    DB_PATH = "oem_simulator.db"

    def __init__(self):
        self._lock = threading.Lock()
        self._init_db()
        self.session_id = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]

    def _init_db(self):
        with self._lock, sqlite3.connect(self.DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS telemetry (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp   TEXT,
                    engine_id   TEXT,
                    rpm         REAL,
                    load_pct    REAL,
                    bp_kw       REAL,
                    torque_nm   REAL,
                    bsfc_gkwh   REAL,
                    imep_bar    REAL,
                    bmep_bar    REAL,
                    nox_ppm     REAL,
                    nvh_db      REAL,
                    hash_id     TEXT,
                    session_id  TEXT
                )
            """)
            conn.commit()

    def log(self, rec: TelemetryRecord):
        with self._lock, sqlite3.connect(self.DB_PATH) as conn:
            conn.execute("""
                INSERT INTO telemetry
                    (timestamp,engine_id,rpm,load_pct,bp_kw,torque_nm,
                     bsfc_gkwh,imep_bar,bmep_bar,nox_ppm,nvh_db,hash_id,session_id)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (rec.timestamp, rec.engine_id, rec.rpm, rec.load_pct, rec.bp_kw,
                  rec.torque_nm, rec.bsfc_gkwh, rec.imep_bar, rec.bmep_bar,
                  rec.nox_ppm, rec.nvh_db, rec.hash_id, rec.session_id))
            conn.commit()

    def get_session(self, session_id: str, limit: int = 2000) -> pd.DataFrame:
        with self._lock, sqlite3.connect(self.DB_PATH) as conn:
            df = pd.read_sql_query(
                "SELECT * FROM telemetry WHERE session_id=? ORDER BY id DESC LIMIT ?",
                conn, params=(session_id, limit)
            )
        return df

    def export_csv(self, session_id: str) -> bytes:
        return self.get_session(session_id).to_csv(index=False).encode()

    def record_count(self, session_id: str) -> int:
        with self._lock, sqlite3.connect(self.DB_PATH) as conn:
            cur = conn.execute(
                "SELECT COUNT(*) FROM telemetry WHERE session_id=?", (session_id,))
            return cur.fetchone()[0]


# ===========================================================================
# ENGINE DATABASE
# ===========================================================================
def _build_engine_db() -> Dict[str, Dict]:
    db: Dict[str, Dict] = {}
    real = [
        ("🏎️ Honda K20A2 (Type R)",       "Honda",   "K20A2",       1998, "I4-DOHC",          86.0,  86.0,  139.0, 11.5,  4,  16, 130, 8400,  850,  164,  196),
        ("🏎️ Honda B18C (Integra)",        "Honda",   "B18C",        1797, "I4-DOHC VTEC",     81.0,  87.2,  137.9, 10.6,  4,  16, 125, 8200,  800,  140,  174),
        ("🏎️ Toyota 2JZ-GTE (Supra)",      "Toyota",  "2JZ-GTE",     2997, "I6-TwinTurbo",     86.0,  86.0,  142.0,  8.5,  6,  24, 230, 6800,  700,  320,  441),
        ("🏎️ Nissan RB26DETT (GT-R)",      "Nissan",  "RB26DETT",    2568, "I6-TwinTurbo",     86.0,  73.7,  121.5,  8.5,  6,  24, 255, 8000,  950,  280,  353),
        ("🇺🇸 Chevrolet LS3 V8",          "GM",      "LS3",         6162, "V8-Pushrod",      103.25, 92.0, 155.6, 10.7,  8,  16, 188, 6600,  600,  320,  540),
        ("🇺🇸 Ford Coyote 5.0",           "Ford",    "Coyote 5.0",  5038, "V8-DOHC",          92.2,  92.7, 150.7, 12.0,  8,  32, 200, 7500,  650,  350,  515),
        ("🇮🇹 Ferrari F154CB V8 TT",      "Ferrari", "F154CB",      3902, "V8-TwinTurbo",     86.5,  83.1, 131.0,  9.4,  8,  32, 168, 8000,  950,  530,  660),
        ("🇩🇪 BMW S58 B30T (M3/M4)",      "BMW",     "S58",         2993, "I6-TwinTurbo",     84.0,  90.0, 142.0,  9.3,  6,  24, 195, 7200,  700,  375,  500),
        ("🇩🇪 Porsche 4.0 Flat-6 GT3",    "Porsche", "MA1.03",      3996, "Flat-6-NA",       102.0,  77.5, 130.0, 12.9,  6,  24, 175, 9000,  850,  368,  445),
        ("🏁 F1 1.6L V6 Hybrid",          "FIA",     "1.6L V6T-H",  1600, "V6-Turbo-Hybrid",  80.0,  53.0, 110.0, 15.0,  6,  24, 145,15000, 4000, 1000,  800),
        ("🚜 Cummins 6.7L I6 Diesel",     "Cummins", "6.7L",        6700, "I6-TDI",          107.0, 124.0, 203.0, 17.3,  6,  24, 550, 3800,  600,  300, 1200),
    ]

    for label, mfr, model, disp, cfg, bore, stroke, conrod, cr, cyl, valves, mass, max_rpm, idle, maxP, maxT in real:
        db[label] = {
            "manufacturer": mfr, "model": model, "displacement": disp, "config": cfg,
            "bore": bore, "stroke": stroke, "conrod": conrod, "cr": cr,
            "cyl": cyl, "valves": valves, "mass_kg": mass,
            "max_rpm": max_rpm, "idle_rpm": idle, "max_power": maxP, "max_torque": maxT
        }
    return db

ENGINE_DATABASE = _build_engine_db()

# ===========================================================================
# MATERIAL DATABASE
# ===========================================================================
MATERIAL_DB: Dict[str, Dict[str, Dict]] = {
    "Piston": {
        "Al-Si Hypereutectic":    {"density_kgm3": 2700, "thermal_cond_Wm": 150, "yield_MPa": 250, "fatigue_MPa": 120, "max_temp_C": 350},
        "Forged 2618-T61":        {"density_kgm3": 2700, "thermal_cond_Wm": 130, "yield_MPa": 380, "fatigue_MPa": 180, "max_temp_C": 300},
        "Steel Crown Composite":  {"density_kgm3": 7500, "thermal_cond_Wm":  45, "yield_MPa": 900, "fatigue_MPa": 400, "max_temp_C": 500},
    }
}


# ===========================================================================
# KINEMATICS ENGINE
# ===========================================================================
class AdvancedKinematics:
    def __init__(self, geo: EngineGeometry):
        self.geo   = geo
        self.B     = geo.bore_mm   / 1000
        self.S     = geo.stroke_mm / 1000
        self.L     = geo.conrod_mm / 1000
        self.R     = self.S / 2
        self.lam   = self.R / self.L
        self.Ncyl  = geo.cylinders
        self.CR    = geo.compression_ratio
        Vd_cyl       = (math.pi / 4) * self.B**2 * self.S
        self.Vc      = Vd_cyl / (self.CR - 1)

    def state(self, ca_deg: np.ndarray, rpm: float) -> Dict[str, np.ndarray]:
        ca  = np.asarray(ca_deg, dtype=float)
        th  = np.deg2rad(ca)
        om  = 2 * math.pi * rpm / 60
        sin_th  = np.sin(th)
        cos_th  = np.cos(th)
        sin2    = sin_th ** 2
        root    = np.sqrt(np.maximum(1 - self.lam**2 * sin2, 1e-12))
        x = self.R * (1 - cos_th + (1/self.lam) * (1 - root))
        v = om * self.R * (sin_th + self.lam * sin_th * cos_th / root)
        a = om**2 * self.R * (cos_th + self.lam * (cos_th**2 - sin2 * (1 + cos_th**2 / (1 - self.lam**2 * sin2))) / root)
        V = self.Vc + (math.pi / 4) * self.B**2 * x
        mps = 2 * self.S * rpm / 60
        return {"ca_deg": ca, "position_m": x, "velocity_ms": v, "accel_ms2": a, "volume_m3": V, "mps": np.full_like(ca, mps)}


# ===========================================================================
# THERMODYNAMICS
# ===========================================================================
class MultiZoneThermo:
    GAMMA, R_AIR, CP_AIR, LHV_GAS, RHO_AIR = 1.35, 287.0, 1050.0, 44.0e6, 1.20

    def __init__(self, kin: AdvancedKinematics):
        self.k = kin

    def wiebe(self, ca: np.ndarray, soc: float = -15.0, dur: float = 50.0, a: float = 5.0, m: float = 2.0) -> Tuple[np.ndarray, np.ndarray]:
        theta = ca - soc
        mask  = (theta >= 0) & (theta <= dur)
        mfb   = np.zeros_like(ca)
        mfb[mask] = 1 - np.exp(-a * (theta[mask] / dur) ** m)
        mfb[theta > dur] = 1.0
        hrr = np.gradient(mfb, ca) * 100
        return mfb, hrr

    def pressure_trace(self, state: Dict[str, np.ndarray], mfb: np.ndarray, T_intake: float = 320.0, P_intake: float = 1.0e5, afr: float = 14.7, eta_vol: float = 0.92) -> np.ndarray:
        V = state["volume_m3"]
        P = np.zeros_like(V)
        P[0] = P_intake
        Vd_cyl = (math.pi / 4) * self.k.B**2 * self.k.S
        m_air  = eta_vol * self.RHO_AIR * P_intake / 1e5 * Vd_cyl
        Q_total = (m_air / afr) * self.LHV_GAS
        for i in range(1, len(V)):
            dV = V[i] - V[i-1]
            dQ = max(mfb[i] - mfb[i-1], 0) * Q_total
            P[i] = max(P[i-1] + (self.GAMMA - 1) / V[i-1] * dQ - self.GAMMA * P[i-1] / V[i-1] * dV, 0.5e5)
        return P

    def woschni_htc(self, P: np.ndarray, T: np.ndarray, mps: float, bore: float) -> np.ndarray:
        return 3.26 * bore**(-0.2) * P**(0.8) * T**(-0.53) * (2.28 * mps)**(0.8)

    def imep(self, P: np.ndarray, V: np.ndarray) -> float:
        Vd = V.max() - V.min()
        return np.trapezoid(P, V) / Vd if Vd >= 1e-12 else 0.0

    def bsfc(self, bp_kw: float, mfr_gs: float) -> float:
        return mfr_gs * 3600 / max(bp_kw, 0.001) if bp_kw > 0 else 9999.0

    def nox_model(self, P_max_bar: float, T_max_K: float, phi: float = 1.0) -> float:
        if T_max_K < 1800: return 5.0
        nox = 50 * math.exp(0.004 * (T_max_K - 1800)) * (P_max_bar / 70)**0.5
        return float(nox * (0.6 if phi > 1.05 else (1.3 if phi < 0.95 else 1.0)))


# ===========================================================================
# PERFORMANCE CALCULATOR
# ===========================================================================
class PerformanceCalc:
    def __init__(self, kin: AdvancedKinematics, thermo: MultiZoneThermo):
        self.k, self.t = kin, thermo

    def brake_power(self, imep_pa: float, rpm: float, eta_mech: float = 0.88) -> float:
        return (imep_pa * ((math.pi / 4) * self.k.B**2 * self.k.S * self.k.Ncyl) * (rpm / 120) * eta_mech) / 1000

    def brake_torque(self, bp_kw: float, rpm: float) -> float:
        return bp_kw * 1000 / (2 * math.pi * rpm / 60) if rpm > 0 else 0.0

    def volumetric_efficiency(self, rpm: float, boost_bar: float = 0.0) -> float:
        rpm_peak = self.k.geo.max_rpm * 0.65
        eta_base = 0.95 * math.exp(-0.5 * ((rpm - rpm_peak) / (rpm_peak * 0.45))**2)
        return min(1.0, eta_base * (1.0 + 0.85 * boost_bar))

    def nvh_index(self, rpm: float, load: float) -> float:
        return 60 + 15 * (rpm / 8000) + 8 * load + np.random.uniform(-1, 1)

    def full_curve(self, rpm_range: np.ndarray, throttle: float = 1.0, afr: float = 14.7, spark_btdc: float = 25.0, boost_bar: float = 0.0) -> pd.DataFrame:
        rows = []
        for rpm in np.maximum(rpm_range, 100):
            ca = np.linspace(-180, 540, 720)
            st_ = self.k.state(ca, rpm)
            eta_v = self.volumetric_efficiency(rpm, boost_bar)
            mfb, _ = self.t.wiebe(ca, soc=-spark_btdc, dur=50)
            P = self.t.pressure_trace(st_, mfb, eta_vol=eta_v * throttle, afr=afr)
            IMEP = self.t.imep(P, st_["volume_m3"])
            bp = self.brake_power(IMEP, rpm) * throttle
            mfr_s = 0.5 * self.t.RHO_AIR * eta_v * ((math.pi/4)*self.k.B**2*self.k.S) * rpm/60 / afr * 1000
            rows.append({
                "rpm": rpm, "bp_kw": bp, "torque_nm": self.brake_torque(bp, rpm),
                "bsfc": self.t.bsfc(bp, mfr_s)
            })
        return pd.DataFrame(rows)


# ===========================================================================
# VEHICLE DYNAMICS
# ===========================================================================
class VehicleDynamics:
    def __init__(self, vc: VehicleConfig): self.vc = vc
    def wheel_force(self, tq: float, gear: int, thr: float) -> float:
        ratio = self.vc.gear_ratios[max(0, min(gear, len(self.vc.gear_ratios)-1))] * self.vc.final_drive
        return (tq * ratio * 0.93 / self.vc.tire_radius_m) * thr
    def net_accel(self, F_wheel: float, v_ms: float) -> float:
        drag = 0.5 * 1.225 * self.vc.Cd * self.vc.frontal_area_m2 * v_ms**2
        roll = 0.013 * self.vc.mass_kg * 9.81
        return (F_wheel - drag - roll) / self.vc.mass_kg


# ===========================================================================
# PLOTLY THEME
# ===========================================================================
_DARK_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(color="#94a3b8", family="Inter, sans-serif", size=11),
    xaxis=dict(gridcolor="rgba(255,255,255,0.03)", zerolinecolor="rgba(255,255,255,0.05)"),
    yaxis=dict(gridcolor="rgba(255,255,255,0.03)", zerolinecolor="rgba(255,255,255,0.05)"),
    margin=dict(l=40, r=20, t=40, b=30)
)

def _dark(fig: go.Figure, height: int = 320) -> go.Figure:
    fig.update_layout(height=height, **_DARK_LAYOUT)
    return fig


# ===========================================================================
# INIT STATE
# ===========================================================================
def _init_state():
    for k, v in {"engine_key": list(ENGINE_DATABASE.keys())[0], "rpm": 3000.0, "throttle": 0.5, "afr": 14.7, "spark_btdc": 25.0, "boost_bar": 0.0, "oil_temp_c": 90.0, "coolant_temp_c": 85.0, "safety_on": True, "log_rate_hz": 10, "session_start": datetime.now().strftime("%H:%M"), "data_mgr": None, "kin": None, "thermo": None, "perf": None, "vdyn": None, "current_kpis": {}, "dyno_curve": None, "last_built_engine": None}.items():
        if k not in st.session_state: st.session_state[k] = v
    if st.session_state["data_mgr"] is None: st.session_state["data_mgr"] = EnterpriseDataManager()

def _build_engine_models(engine_key: str):
    cfg = ENGINE_DATABASE[engine_key]
    geo = EngineGeometry(bore_mm=cfg["bore"], stroke_mm=cfg["stroke"], conrod_mm=cfg["conrod"], compression_ratio=cfg["cr"], cylinders=cfg["cyl"], valve_count=cfg["valves"], displacement_cc=cfg["displacement"], max_rpm=float(cfg["max_rpm"]))
    kin = AdvancedKinematics(geo)
    thermo = MultiZoneThermo(kin)
    st.session_state.update({"kin": kin, "thermo": thermo, "perf": PerformanceCalc(kin, thermo), "vdyn": VehicleDynamics(VehicleConfig(mass_kg=1200 + cfg["mass_kg"] * 0.8)), "last_built_engine": engine_key, "dyno_curve": None})

def _kpi_card(label: str, value: float, unit: str, color_class: str = "col-white") -> str:
    return f'<div class="kpi-card"><div class="kpi-label">{label}</div><div class="kpi-value {color_class}">{value:.1f}<span class="kpi-unit">{unit}</span></div></div>'


# ===========================================================================
#  MAIN APP
# ===========================================================================
def main():
    _init_state()

    # HEADER
    st.markdown("<h1 class='main-header'>Engine Telemetry Dashboard</h1>", unsafe_allow_html=True)
    st.markdown("<p class='sub-header'>Real-time thermodynamic and kinematic simulation interface.</p>", unsafe_allow_html=True)

    dm = st.session_state["data_mgr"]
    sid = dm.session_id

    # ── FLAT SIDEBAR (REMOVED CLUNKY EXPANDERS) ───────────────────────────
    with st.sidebar:
        st.markdown("<h2 style='font-size:1.2rem; font-weight:700; margin-bottom:0;'>⚙️ Controls</h2>", unsafe_allow_html=True)
        
        st.markdown("<div class='sidebar-title'>Engine Selection</div>", unsafe_allow_html=True)
        st.write("")
        engine_keys = list(ENGINE_DATABASE.keys())
        sel_idx = engine_keys.index(st.session_state["engine_key"]) if st.session_state["engine_key"] in engine_keys else 0
        chosen = st.selectbox("Model", engine_keys, index=sel_idx, label_visibility="collapsed")
        st.session_state["engine_key"] = chosen
        if st.session_state["last_built_engine"] != chosen:
            _build_engine_models(chosen)

        st.markdown("<div class='sidebar-title'>ECU Calibration</div>", unsafe_allow_html=True)
        st.write("")
        cfg = ENGINE_DATABASE[chosen]
        st.session_state["rpm"]       = st.slider("Target RPM", cfg["idle_rpm"], cfg["max_rpm"], int(st.session_state["rpm"]), step=100)
        st.session_state["throttle"]  = st.slider("Throttle %", 0, 100, int(st.session_state["throttle"]*100)) / 100
        st.session_state["afr"]       = st.slider("Air/Fuel Ratio", 10.0, 20.0, float(st.session_state["afr"]), 0.1)
        st.session_state["spark_btdc"]= st.slider("Spark Timing (°BTDC)", -10, 55, int(st.session_state["spark_btdc"]))
        st.session_state["boost_bar"] = st.slider("Boost Pressure (bar)", 0.0, 3.0, float(st.session_state["boost_bar"]), 0.05)

        st.markdown("<div class='sidebar-title'>Environment</div>", unsafe_allow_html=True)
        st.write("")
        st.session_state["oil_temp_c"] = st.slider("Oil Temp (°C)", 40, 160, int(st.session_state["oil_temp_c"]), 5)

        st.divider()
        st.session_state["safety_on"] = st.toggle("Enable Safety Limits", True)
        if st.button("Download Data (CSV)", use_container_width=True):
            st.download_button("Click to Save", dm.export_csv(sid), f"log_{sid}.csv", "text/csv", use_container_width=True)

    # ── COMPUTE PHYSICS ──────────────────────────────────────────────────
    if st.session_state["kin"] is None: _build_engine_models(st.session_state["engine_key"])
    kin, thermo, perf = st.session_state["kin"], st.session_state["thermo"], st.session_state["perf"]
    rpm, thr, afr, spark, boost = st.session_state["rpm"], st.session_state["throttle"], st.session_state["afr"], st.session_state["spark_btdc"], st.session_state["boost_bar"]

    ca_arr   = np.linspace(-180, 540, 1440)
    st_now   = kin.state(ca_arr, rpm)
    eta_v    = perf.volumetric_efficiency(rpm, boost)
    mfb, hrr = thermo.wiebe(ca_arr, soc=-spark, dur=45)
    P_arr    = thermo.pressure_trace(st_now, mfb, eta_vol=eta_v * thr, afr=afr, T_intake=280 + boost*20)
    T_arr    = (P_arr * st_now["volume_m3"]) / (thermo.R_AIR * max(kin.Vc, 1e-12) * kin.Ncyl)
    
    IMEP_pa   = thermo.imep(P_arr, st_now["volume_m3"])
    bp_kw     = perf.brake_power(IMEP_pa, rpm) * thr
    tq_nm     = perf.brake_torque(bp_kw, rpm)
    P_max_bar = P_arr.max() / 1e5
    T_max_K   = T_arr.max()
    mfr_gs    = 0.5 * thermo.RHO_AIR * eta_v * ((math.pi/4)*kin.B**2*kin.S) * rpm/60 / afr * 1000
    bsfc      = thermo.bsfc(bp_kw, mfr_gs)
    nox_ppm   = thermo.nox_model(P_max_bar, T_max_K, phi=14.7/max(afr, 1))

    dm.log(TelemetryRecord(datetime.now().isoformat(), chosen, rpm, thr*100, bp_kw, tq_nm, bsfc, IMEP_pa/1e5, IMEP_pa/1e5*0.88, nox_ppm, 75.0, "hash", sid))

    # ── ALERTS ───────────────────────────────────────────────────────────
    if st.session_state["safety_on"]:
        alerts = []
        if P_max_bar > 110: alerts.append(("critical", "Critical: Peak cylinder pressure > 110 bar (Detonation risk)"))
        if T_max_K > 2800: alerts.append(("critical", "Critical: Peak gas temperature > 2800 K"))
        if rpm > cfg["max_rpm"] * 0.96: alerts.append(("warning", "Warning: Approaching structural redline"))
        if afr < 11.0: alerts.append(("warning", "Warning: Overly rich mixture"))
        if alerts:
            for lvl, msg in alerts: st.markdown(f'<div class="alert-box alert-{lvl}">{msg}</div>', unsafe_allow_html=True)

    # ── COMPACT KPI GRID ─────────────────────────────────────────────────
    st.markdown('<div class="kpi-grid">', unsafe_allow_html=True)
    cards = (
        _kpi_card("Power", bp_kw, "kW", "col-blue"),
        _kpi_card("Torque", tq_nm, "Nm", "col-white"),
        _kpi_card("RPM", rpm, "rpm", "col-white"),
        _kpi_card("IMEP", IMEP_pa/1e5, "bar", "col-white"),
        _kpi_card("Peak Press", P_max_bar, "bar", "col-red" if P_max_bar > 110 else "col-white"),
        _kpi_card("Peak Temp", T_max_K, "K", "col-red" if T_max_K > 2500 else "col-white"),
        _kpi_card("BSFC", bsfc, "g/kWh", "col-white"),
        _kpi_card("NOx", nox_ppm, "ppm", "col-orange" if nox_ppm > 800 else "col-white"),
    )
    st.markdown("".join(cards) + "</div>", unsafe_allow_html=True)

    # ── TABS (CLEANER) ───────────────────────────────────────────────────
    t1, t2 = st.tabs(["Real-Time Telemetry", "Engine Tools"])

    with t1:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Combustion Pressure Trace**")
            fig_p = go.Figure(go.Scatter(x=ca_arr, y=P_arr/1e5, fill="tozeroy", fillcolor="rgba(56, 189, 248, 0.1)", line=dict(color="#38bdf8", width=2)))
            fig_p.update_layout(xaxis_title="Crank Angle (°)", yaxis_title="Pressure (bar)")
            st.plotly_chart(_dark(fig_p, 300), use_container_width=True)

            st.markdown("**Mass Fraction Burned (MFB)**")
            fig_m = go.Figure(go.Scatter(x=ca_arr, y=mfb*100, line=dict(color="#f59e0b", width=2)))
            fig_m.update_layout(xaxis_title="Crank Angle (°)", yaxis_title="Burned (%)")
            st.plotly_chart(_dark(fig_m, 220), use_container_width=True)

        with col2:
            st.markdown("**P-V Diagram**")
            fig_pv = go.Figure(go.Scatter(x=st_now["volume_m3"]*1e6, y=P_arr/1e5, fill="toself", fillcolor="rgba(16, 185, 129, 0.05)", line=dict(color="#10b981", width=2)))
            fig_pv.update_layout(xaxis_title="Volume (cc)", yaxis_title="Pressure (bar)")
            st.plotly_chart(_dark(fig_pv, 300), use_container_width=True)

            st.markdown("**Piston Kinematics**")
            fig_k = go.Figure(go.Scatter(x=ca_arr, y=st_now["position_m"]*1000, line=dict(color="#94a3b8", width=2)))
            fig_k.update_layout(xaxis_title="Crank Angle (°)", yaxis_title="Position (mm)")
            st.plotly_chart(_dark(fig_k, 220), use_container_width=True)

    with t2:
        st.markdown("### Engineering Utilities")
        tool = st.selectbox("Select Tool", ["Displacement Calculator", "Conrod Ratio Analyser", "Compression Ratio Designer"], label_visibility="collapsed")
        st.write("")
        
        if tool == "Displacement Calculator":
            c1, c2, c3 = st.columns(3)
            b = c1.number_input("Bore [mm]", value=float(cfg["bore"]))
            s = c2.number_input("Stroke [mm]", value=float(cfg["stroke"]))
            n = c3.number_input("Cylinders", value=cfg["cyl"])
            disp = (math.pi/4) * (b/10)**2 * (s/10) * n * 1000
            st.info(f"Calculated Engine Displacement: **{disp:.1f} cc**")

        elif tool == "Conrod Ratio Analyser":
            c1, c2 = st.columns(2)
            crd = c1.number_input("Conrod Length [mm]", value=float(cfg["conrod"]))
            stk = c2.number_input("Stroke [mm]", value=float(cfg["stroke"]))
            ratio = (stk/2) / crd
            st.info(f"Conrod to Stroke Ratio (Lambda): **{ratio:.4f}**")

        elif tool == "Compression Ratio Designer":
            c1, c2, c3 = st.columns(3)
            b = c1.number_input("Bore [mm]", value=float(cfg["bore"]))
            s = c2.number_input("Stroke [mm]", value=float(cfg["stroke"]))
            vc = c3.number_input("Clearance Vol [cc]", value=50.0)
            vd = (math.pi/4) * (b/10)**2 * (s/10) * 1000
            st.info(f"Calculated Compression Ratio: **{(vd + vc) / vc:.2f}:1**")

if __name__ == "__main__":
    main()