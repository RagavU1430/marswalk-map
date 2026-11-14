#!/usr/bin/env python3
"""
Marswalk Map - Grid Precomputation Script
Generates a unified 5m resolution grid for Jezero Crater delta front
with all hazard layers for fast A* pathfinding.
"""

import json
import numpy as np
from pathlib import Path
from typing import Dict, Tuple, List
import math

# Configuration for Jezero Crater delta front
JEZERO_BOUNDS = {
    "min_lat": 18.30,
    "max_lat": 18.67,
    "min_lon": -77.58,
    "max_lon": -77.22,
}

GRID_CELL_SIZE_M = 5.0  # 5 meter cells
# Approximate dimensions at this latitude
# 1 degree lat ≈ 111,000 m
# 1 degree lon ≈ 111,000 * cos(lat) m
LAT_M_PER_DEG = 111000
LON_M_PER_DEG = 111000 * math.cos(math.radians(18.44))  # ~105,400 m

# Grid dimensions
LAT_EXTENT_DEG = JEZERO_BOUNDS["max_lat"] - JEZERO_BOUNDS["min_lat"]
LON_EXTENT_DEG = JEZERO_BOUNDS["max_lon"] - JEZERO_BOUNDS["min_lon"]
LAT_EXTENT_M = LAT_EXTENT_DEG * LAT_M_PER_DEG
LON_EXTENT_M = LON_EXTENT_DEG * LON_M_PER_DEG

GRID_ROWS = int(LAT_EXTENT_M / GRID_CELL_SIZE_M)  # ~740
GRID_COLS = int(LON_EXTENT_M / GRID_CELL_SIZE_M)  # ~720

print(f"Grid: {GRID_ROWS} x {GRID_COLS} cells at {GRID_CELL_SIZE_M}m resolution")
print(f"Area: {LAT_EXTENT_M/1000:.1f} km x {LON_EXTENT_M/1000:.1f} km")


def lat_lon_to_grid(lat: float, lon: float) -> Tuple[int, int]:
    """Convert lat/lon to grid indices (row, col)"""
    lat_norm = (lat - JEZERO_BOUNDS["min_lat"]) / (JEZERO_BOUNDS["max_lat"] - JEZERO_BOUNDS["min_lat"])
    lon_norm = (lon - JEZERO_BOUNDS["min_lon"]) / (JEZERO_BOUNDS["max_lon"] - JEZERO_BOUNDS["min_lon"])
    
    row = int(np.clip((1 - lat_norm) * (GRID_ROWS - 1), 0, GRID_ROWS - 1))
    col = int(np.clip(lon_norm * (GRID_COLS - 1), 0, GRID_COLS - 1))
    return row, col


def grid_to_lat_lon(row: int, col: int) -> Tuple[float, float]:
    """Convert grid indices to lat/lon"""
    lat_norm = 1 - (row / (GRID_ROWS - 1))
    lon_norm = col / (GRID_COLS - 1)
    
    lat = JEZERO_BOUNDS["min_lat"] + lat_norm * (JEZERO_BOUNDS["max_lat"] - JEZERO_BOUNDS["min_lat"])
    lon = JEZERO_BOUNDS["min_lon"] + lon_norm * (JEZERO_BOUNDS["max_lon"] - JEZERO_BOUNDS["min_lon"])
    return lat, lon


def compute_slope(lat: float, lon: float) -> float:
    """Compute slope in degrees at given coordinate"""
    # Simulated slope based on Jezero topography
    # Delta fan descends from west to east
    # Scarp wall at western edge
    x_norm = (lon - JEZERO_BOUNDS["min_lon"]) / (JEZERO_BOUNDS["max_lon"] - JEZERO_BOUNDS["min_lon"])
    
    # Base delta fan slope (gentle descent ~3-5°)
    delta_slope = 4 + x_norm * 3
    
    # Scarp wall at western edge (steep 25-30°)
    scarp_factor = max(0, (0.25 - x_norm) * 40)
    
    # Add some noise
    noise = np.sin(lat * 1000) * np.cos(lon * 1000) * 1.5
    
    slope = delta_slope + scarp_factor + noise
    return max(0, min(45, slope))  # Clamp 0-45°


def compute_surface_risk(lat: float, lon: float) -> float:
    """Compute surface risk (0-1) based on thermal inertia proxy"""
    x_norm = (lon - JEZERO_BOUNDS["min_lon"]) / (JEZERO_BOUNDS["max_lon"] - JEZERO_BOUNDS["min_lon"])
    y_norm = (lat - JEZERO_BOUNDS["min_lat"]) / (JEZERO_BOUNDS["max_lat"] - JEZERO_BOUNDS["min_lat"])
    
    # Baseline firm regolith
    base_risk = 0.2
    
    # Dust sinks at delta front (east side)
    dust_risk = x_norm * 0.3
    
    # Boulder fields in specific regions
    boulder_risk = 0
    # Séítah region (southwest)
    if x_norm < 0.4 and y_norm < 0.4:
        boulder_risk = 0.5
    
    # Crater rim ejecta
    if x_norm < 0.15:
        boulder_risk = max(boulder_risk, 0.4)
    
    # Noise
    noise = (np.sin(lat * 500) * np.cos(lon * 500) * 0.1)
    
    risk = base_risk + dust_risk + boulder_risk + noise
    return max(0, min(1, risk))


def compute_radiation_factor(lat: float, lon: float) -> float:
    """Compute radiation factor (0-1) based on topography"""
    # Radiation is relatively uniform on Mars surface
    # Slight variation due to topography (shielding in craters)
    base_rad = 0.2
    
    # Craters provide slight shielding
    # Simplified: lower elevation = slightly more shielding
    topo_shield = 0.05 * np.sin(lat * 800) * np.cos(lon * 800)
    
    return max(0, min(1, base_rad + topo_shield))


def compute_elevation(lat: float, lon: float) -> float:
    """Compute elevation in meters (MOLA datum)"""
    x_norm = (lon - JEZERO_BOUNDS["min_lon"]) / (JEZERO_BOUNDS["max_lon"] - JEZERO_BOUNDS["min_lon"])
    y_norm = (lat - JEZERO_BOUNDS["min_lat"]) / (JEZERO_BOUNDS["max_lat"] - JEZERO_BOUNDS["min_lat"])
    
    # Base crater floor elevation
    base_elev = -2600
    
    # Delta fan: descends from west (-2600) to east (-2520)
    delta_elev = x_norm * 80
    
    # Scarp wall at western edge
    scarp_elev = max(0, (0.25 - x_norm) * 200)
    
    # Small craters
    crater = 0
    crater_dist = math.sqrt((x_norm - 0.65)**2 + (y_norm - 0.3)**2)
    if crater_dist < 0.15:
        crater = -math.cos((crater_dist / 0.15) * (math.pi / 2)) * 30
    
    return base_elev + delta_elev + scarp_elev + crater


def check_hazard_zones(lat: float, lon: float) -> Dict:
    """Check if point falls in known hazard zones"""
    hazards = []
    
    # Scarp wall
    if 18.447 < lat < 18.458 and -77.426 < lon < -77.418:
        hazards.append({
            "name": "Delta Front Scarp Wall",
            "type": "steep_scarp",
            "risk": "critical",
            "slope": 28.5
        })
    
    # Boulder field (Séítah)
    if 18.434 < lat < 18.441 and -77.442 < lon < -77.431:
        hazards.append({
            "name": "Séítah Boulder Field Chute",
            "type": "boulder_field",
            "risk": "caution",
            "slope": 16.0
        })
    
    # Dust sink
    if 18.457 < lat < 18.465 and -77.439 < lon < -77.430:
        hazards.append({
            "name": "Nerretvands Sand Ripple Field",
            "type": "dust_sink",
            "risk": "caution",
            "slope": 8.0
        })
    
    return {"hazards": hazards, "hazard_count": len(hazards)}


def generate_grid() -> Dict:
    """Generate the complete grid with all layers"""
    print("Generating grid layers...")
    
    # Initialize arrays
    elevation = np.zeros((GRID_ROWS, GRID_COLS), dtype=np.float32)
    slope = np.zeros((GRID_ROWS, GRID_COLS), dtype=np.float32)
    surface_risk = np.zeros((GRID_ROWS, GRID_COLS), dtype=np.float32)
    radiation = np.zeros((GRID_ROWS, GRID_COLS), dtype=np.float32)
    hazard_mask = np.zeros((GRID_ROWS, GRID_COLS), dtype=np.uint8)
    hazard_names = []
    
    # Pre-compute hazard zones for each cell
    hazard_grid = np.full((GRID_ROWS, GRID_COLS), -1, dtype=np.int16)
    hazard_info = [
        {"name": "Safe", "type": "none", "risk": "none", "cost_mult": 1.0},
        {"name": "Delta Front Scarp Wall", "type": "steep_scarp", "risk": "critical", "cost_mult": 10.0},
        {"name": "Séítah Boulder Field Chute", "type": "boulder_field", "risk": "caution", "cost_mult": 3.0},
        {"name": "Nerretvands Sand Ripple Field", "type": "dust_sink", "risk": "caution", "cost_mult": 2.5},
    ]
    
    for row in range(GRID_ROWS):
        if row % 100 == 0:
            print(f"  Processing row {row}/{GRID_ROWS}")
        
        for col in range(GRID_COLS):
            lat, lon = grid_to_lat_lon(row, col)
            
            # Compute layers
            elev = compute_elevation(lat, lon)
            slp = compute_slope(lat, lon)
            surf = compute_surface_risk(lat, lon)
            rad = compute_radiation_factor(lat, lon)
            
            elevation[row, col] = elev
            slope[row, col] = slp
            surface_risk[row, col] = surf
            radiation[row, col] = rad
            
            # Check hazard zones
            hz = check_hazard_zones(lat, lon)
            if hz["hazard_count"] > 0:
                # Use the highest risk hazard
                for h in hz["hazards"]:
                    if h["risk"] == "critical":
                        hazard_grid[row, col] = 1
                        break
                    elif h["risk"] == "caution" and hazard_grid[row, col] <= 0:
                        hazard_grid[row, col] = 2 if h["type"] == "boulder_field" else 3
    
    # Compute cost grid for A*
    # Cost = 1 + a*slope_norm + b*surface_risk + c*radiation_factor + hazard_multiplier
    SLOPE_WEIGHT = 2.2
    SURFACE_WEIGHT = 1.8
    RADIATION_WEIGHT = 1.2
    
    slope_norm = slope / 45.0  # Normalize to 0-1
    
    cost = (1.0 + 
            SLOPE_WEIGHT * slope_norm + 
            SURFACE_WEIGHT * surface_risk + 
            RADIATION_WEIGHT * radiation)
    
    # Apply hazard multipliers
    cost[hazard_grid == 1] *= 10.0   # Scarp wall
    cost[hazard_grid == 2] *= 3.0    # Boulder field
    cost[hazard_grid == 3] *= 2.5    # Dust sink
    
    # Mark blocked cells (cost > threshold)
    blocked = cost > 50.0
    
    # Convert arrays to lists for JSON serialization
    print("Converting to JSON format...")
    
    # Downsample for JSON size (every 2nd cell = 10m resolution)
    # Keep full resolution for critical pathfinding
    stride = 1  # Keep full resolution
    
    grid_data = {
        "metadata": {
            "bounds": JEZERO_BOUNDS,
            "cell_size_m": GRID_CELL_SIZE_M,
            "rows": GRID_ROWS,
            "cols": GRID_COLS,
            "lat_per_cell": (JEZERO_BOUNDS["max_lat"] - JEZERO_BOUNDS["min_lat"]) / GRID_ROWS,
            "lon_per_cell": (JEZERO_BOUNDS["max_lon"] - JEZERO_BOUNDS["min_lon"]) / GRID_COLS,
            "generated_at": "2026-11-14",
            "version": "1.0"
        },
        "layers": {
            "elevation": elevation[::stride, ::stride].tolist(),
            "slope": slope[::stride, ::stride].tolist(),
            "surface_risk": surface_risk[::stride, ::stride].tolist(),
            "radiation": radiation[::stride, ::stride].tolist(),
            "cost": cost[::stride, ::stride].tolist(),
            "blocked": blocked[::stride, ::stride].astype(int).tolist(),
            "hazard_type": hazard_grid[::stride, ::stride].astype(int).tolist(),
        },
        "hazard_legend": hazard_info,
        "cost_weights": {
            "slope": SLOPE_WEIGHT,
            "surface_risk": SURFACE_WEIGHT,
            "radiation": RADIATION_WEIGHT
        }
    }
    
    return grid_data


def save_grid(grid_data: Dict, output_path: Path):
    """Save grid to JSON file"""
    print(f"Saving grid to {output_path}...")
    
    # Create a compact version for web (stride=2 for smaller file)
    web_grid = grid_data.copy()
    stride = 2
    web_grid["metadata"]["cell_size_m"] = GRID_CELL_SIZE_M * stride
    web_grid["metadata"]["rows"] = grid_data["metadata"]["rows"] // stride
    web_grid["metadata"]["cols"] = grid_data["metadata"]["cols"] // stride
    
    for key in web_grid["layers"]:
        arr = np.array(grid_data["layers"][key])
        web_grid["layers"][key] = arr[::stride, ::stride].tolist()
    
    # Save both versions
    with open(output_path, 'w') as f:
        json.dump(grid_data, f, separators=(',', ':'))
    
    web_path = output_path.parent / "mars_grid_web.json"
    with open(web_path, 'w') as f:
        json.dump(web_grid, f, separators=(',', ':'))
    
    # Report sizes
    full_size = output_path.stat().st_size / (1024*1024)
    web_size = web_path.stat().st_size / (1024*1024)
    print(f"Full grid: {full_size:.1f} MB")
    print(f"Web grid (2x stride): {web_size:.1f} MB")
    
    return web_path


def main():
    print("=" * 60)
    print("Marswalk Map - Grid Precomputation")
    print("Jezero Crater Delta Front")
    print("=" * 60)
    
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate grid
    grid_data = generate_grid()
    
    # Save
    output_path = output_dir / "mars_grid.json"
    web_path = save_grid(grid_data, output_path)
    
    print("\n" + "=" * 60)
    print("✅ Grid generation complete!")
    print(f"📁 Full resolution: {output_path}")
    print(f"📁 Web optimized: {web_path}")
    print("=" * 60)
    
    # Print sample values for verification
    print("\nSample values at center (row=370, col=360):")
    lat, lon = grid_to_lat_lon(370, 360)
    print(f"  Coordinates: {lat:.4f}°, {lon:.4f}°")
    print(f"  Elevation: {grid_data['layers']['elevation'][370][360]:.1f} m")
    print(f"  Slope: {grid_data['layers']['slope'][370][360]:.1f}°")
    print(f"  Surface Risk: {grid_data['layers']['surface_risk'][370][360]:.2f}")
    print(f"  Radiation: {grid_data['layers']['radiation'][370][360]:.2f}")
    print(f"  Cost: {grid_data['layers']['cost'][370][360]:.2f}")
    print(f"  Hazard: {grid_data['hazard_legend'][grid_data['layers']['hazard_type'][370][360]]['name']}")


if __name__ == "__main__":
    main()