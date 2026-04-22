import numpy as np

def calculate_engine_parameters(rpm, engine_load_percent, oil_viscosity_factor):
    """
    SI Engine ki Mechanical Efficiency calculate karne ka mathematical model
    """
    max_ip = 150.0
    load_factor = engine_load_percent / 100.0
    ip = max_ip * load_factor * (rpm / 6000.0)
    
    # Friction Power (FP) - Dynamic Calculation
    base_friction = 2.0 
    dynamic_friction = (0.0015 * rpm) + (0.0000004 * (rpm ** 2))
    fp = base_friction + (dynamic_friction * oil_viscosity_factor)
    
    bp = ip - fp
    if bp < 0:
        bp = 0.0 # Stall condition
        
    mech_efficiency = (bp / ip) * 100.0 if ip > 0 else 0.0
        
    return ip, bp, fp, mech_efficiency

def get_friction_breakdown(fp):
    """
    PPT ke hisab se total friction ko components mein break karna
    """
    return {
        "Piston Rings": fp * 0.30,
        "Piston Skirt": fp * 0.20,      # Piston Assembly = Total 50%
        "Main Bearings": fp * 0.15,
        "Rod Bearings": fp * 0.10,      # Bearings = Total 25%
        "Valvetrain": fp * 0.15,
        "Oil/Water Pump": fp * 0.10     # Aux/Valves = Total 25%
    }

def generate_rpm_curve(engine_load_percent, oil_viscosity_factor):
    """
    Graphs ke liye data points generate karna
    """
    rpms = np.linspace(800, 6000, 50)
    ips, bps, fps, effs = [], [], [], []
    
    for rpm in rpms:
        ip, bp, fp, eff = calculate_engine_parameters(rpm, engine_load_percent, oil_viscosity_factor)
        ips.append(ip)
        bps.append(bp)
        fps.append(fp)
        effs.append(eff)
        
    return rpms, ips, bps, fps, effs