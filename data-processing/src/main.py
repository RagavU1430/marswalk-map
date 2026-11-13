"""
Marswalk Map - FastAPI Backend
Precomputed grid-based routing for Jezero Crater delta front
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
import json
from pathlib import Path

app = FastAPI(title="Marswalk Map API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
GRID_CELL_SIZE = 5.0  # meters
GRID_BOUNDS = {
    "min_lat": 18.30,
    "max_lat": 18.67,
    "min_lon": -77.58,
    "max_lon": -77.22,
}

# Data paths
DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR = Path(__file__).parent.parent / "output"

# Global cache for grid
GRID_CACHE = None


class Waypoint(BaseModel):
    lat: float
    lon: float


class RouteRequest(BaseModel):
    start: Waypoint
    end: Waypoint
    slope_weight: float = Field(default=15.0, ge=0, le=100)
    surface_weight: float = Field(default=25.0, ge=0, le=100)
    radiation_weight: float = Field(default=8.0, ge=0, le=100)
    max_slope_deg: float = Field(default=15.0, ge=0, le=45)


class RouteSegment(BaseModel):
    lat: float
    lon: float
    distance_m: float
    risk: str  # "green", "amber", "red"
    slope_deg: float
    surface_risk: float
    radiation_factor: float


class RouteResponse(BaseModel):
    waypoints: List[RouteSegment]
    total_distance_m: float
    estimated_time_min: float
    estimated_dose_mSv: float
    budget_ok: bool


def load_grid():
    """Load precomputed grid from JSON"""
    global GRID_CACHE
    if GRID_CACHE is not None:
        return GRID_CACHE
    
    grid_file = OUTPUT_DIR / "mars_grid.json"
    if not grid_file.exists():
        raise HTTPException(status_code=500, detail="Grid not precomputed. Run precompute_grid.py first.")
    
    with open(grid_file, "r") as f:
        GRID_CACHE = json.load(f)
    return GRID_CACHE


def lat_lon_to_grid(lat: float, lon: float, grid_info: dict) -> tuple:
    """Convert lat/lon to grid indices"""
    min_lat, max_lat = grid_info["bounds"]["min_lat"], grid_info["bounds"]["max_lat"]
    min_lon, max_lon = grid_info["bounds"]["min_lon"], grid_info["bounds"]["max_lon"]
    rows, cols = grid_info["shape"]
    
    # Normalize to 0-1
    lat_norm = (lat - min_lat) / (max_lat - min_lat)
    lon_norm = (lon - min_lon) / (max_lon - min_lon)
    
    # Convert to grid indices (clamp)
    row = int(np.clip((1 - lat_norm) * (rows - 1), 0, rows - 1))
    col = int(np.clip(lon_norm * (cols - 1), 0, cols - 1))
    
    return row, col


def grid_to_lat_lon(row: int, col: int, grid_info: dict) -> tuple:
    """Convert grid indices to lat/lon"""
    min_lat, max_lat = grid_info["bounds"]["min_lat"], grid_info["bounds"]["max_lat"]
    min_lon, max_lon = grid_info["bounds"]["min_lon"], grid_info["bounds"]["max_lon"]
    rows, cols = grid_info["shape"]
    
    lat_norm = 1 - (row / (rows - 1))
    lon_norm = col / (cols - 1)
    
    lat = min_lat + lat_norm * (max_lat - min_lat)
    lon = min_lon + lon_norm * (max_lon - min_lon)
    
    return lat, lon


def heuristic(a: tuple, b: tuple) -> float:
    """Euclidean distance heuristic for A*"""
    return np.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)


def a_star(grid: dict, start: tuple, end: tuple, weights: dict, max_slope: float) -> list:
    """
    A* pathfinding on the precomputed grid.
    Returns list of (row, col) tuples.
    """
    from heapq import heappush, heappop
    
    rows, cols = grid["shape"]
    slope_layer = np.array(grid["layers"]["slope"])
    surface_layer = np.array(grid["layers"]["surface"])
    radiation_layer = np.array(grid["layers"]["radiation"])
    
    start_node = (start[0], start[1])
    end_node = (end[0], end[1])
    
    open_set = []
    heappush(open_set, (0, start_node))
    
    came_from = {}
    g_score = {start_node: 0}
    f_score = {start_node: heuristic(start_node, end_node)}
    
    directions = [(-1, -1), (-1, 0), (-1, 1),
                  (0, -1),           (0, 1),
                  (1, -1),  (1, 0),  (1, 1)]
    
    max_iterations = 50000
    iterations = 0
    
    while open_set and iterations < max_iterations:
        iterations += 1
        _, current = heappop(open_set)
        
        if current == end_node:
            # Reconstruct path
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start_node)
            path.reverse()
            return path
        
        for dr, dc in directions:
            nr, nc = current[0] + dr, current[1] + dc
            
            if not (0 <= nr < rows and 0 <= nc < cols):
                continue
            
            neighbor = (nr, nc)
            
            # Check slope constraint
            if slope_layer[nr, nc] > max_slope:
                continue
            
            # Calculate cost
            slope_cost = slope_layer[nr, nc] / 45.0  # Normalize 0-1
            surface_cost = surface_layer[nr, nc]  # Already 0-1
            radiation_cost = radiation_layer[nr, nc]  # Already 0-1
            
            step_cost = 1.0 + (
                weights["slope"] * slope_cost +
                weights["surface"] * surface_cost +
                weights["radiation"] * radiation_cost
            )
            
            # Diagonal movement costs more
            if dr != 0 and dc != 0:
                step_cost *= 1.414
            
            tentative_g = g_score[current] + step_cost
            
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, end_node)
                heappush(open_set, (f_score[neighbor], neighbor))
    
    return []  # No path found


@app.get("/")
async def root():
    return {"service": "Marswalk Map API", "version": "1.0.0", "status": "ready"}


@app.get("/health")
async def health():
    try:
        grid = load_grid()
        return {"status": "healthy", "grid_shape": grid["shape"]}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.post("/api/route", response_model=RouteResponse)
async def calculate_route(request: RouteRequest):
    """Calculate a safe route between two waypoints"""
    grid = load_grid()
    
    start_grid = lat_lon_to_grid(request.start.lat, request.start.lon, grid)
    end_grid = lat_lon_to_grid(request.end.lat, request.end.lon, grid)
    
    weights = {
        "slope": request.slope_weight,
        "surface": request.surface_weight,
        "radiation": request.radiation_weight,
    }
    
    path = a_star(grid, start_grid, end_grid, weights, request.max_slope_deg)
    
    if not path:
        raise HTTPException(status_code=400, detail="No valid route found. Try adjusting waypoints or slope limit.")
    
    # Build response with risk assessment
    waypoints = []
    total_distance = 0.0
    total_dose = 0.0
    
    slope_layer = np.array(grid["layers"]["slope"])
    surface_layer = np.array(grid["layers"]["surface"])
    radiation_layer = np.array(grid["layers"]["radiation"])
    
    cell_size_m = grid["cell_size_m"]
    
    for i, (row, col) in enumerate(path):
        lat, lon = grid_to_lat_lon(row, col, grid)
        
        slope = float(slope_layer[row, col])
        surface = float(surface_layer[row, col])
        radiation = float(radiation_layer[row, col])
        
        # Determine risk level
        if slope > 20 or surface > 0.7 or radiation > 0.7:
            risk = "red"
        elif slope > 12 or surface > 0.4 or radiation > 0.4:
            risk = "amber"
        else:
            risk = "green"
        
        # Distance from previous point
        if i > 0:
            prev_lat, prev_lon = grid_to_lat_lon(path[i-1][0], path[i-1][1], grid)
            # Approximate distance in meters
            dlat = (lat - prev_lat) * 111000
            dlon = (lon - prev_lon) * 111000 * np.cos(np.radians(prev_lat))
            step_dist = np.sqrt(dlat**2 + dlon**2)
            total_distance += step_dist
        else:
            step_dist = 0.0
        
        # Radiation dose estimation (mSv per hour at this location)
        dose_rate = 0.3 * (1 + radiation)  # mSv/hr, higher in high-radiation areas
        step_time_hr = step_dist / 1000 / 3.0  # 3 km/hr walking speed adjusted for slope
        step_dose = dose_rate * step_time_hr
        total_dose += step_dose
        
        waypoints.append(RouteSegment(
            lat=lat,
            lon=lon,
            distance_m=step_dist,
            risk=risk,
            slope_deg=slope,
            surface_risk=surface,
            radiation_factor=radiation,
        ))
    
    # EVA budget check
    eva_time_limit_hr = 6.0  # 6 hour EVA limit
    eva_dose_limit_mSv = 50.0  # 50 mSv career limit proxy
    
    estimated_time = total_distance / 1000 / 3.0 * 60  # minutes
    budget_ok = (estimated_time / 60 < eva_time_limit_hr) and (total_dose < eva_dose_limit_mSv)
    
    return RouteResponse(
        waypoints=waypoints,
        total_distance_m=total_distance,
        estimated_time_min=estimated_time,
        estimated_dose_mSv=total_dose,
        budget_ok=budget_ok,
    )


@app.get("/api/grid/info")
async def grid_info():
    """Get grid metadata"""
    grid = load_grid()
    return {
        "bounds": grid["bounds"],
        "shape": grid["shape"],
        "cell_size_m": grid["cell_size_m"],
        "layers": list(grid["layers"].keys()),
    }


@app.get("/api/layers/{layer_name}")
async def get_layer(layer_name: str):
    """Get a specific layer as a 2D array (for visualization)"""
    grid = load_grid()
    if layer_name not in grid["layers"]:
        raise HTTPException(status_code=404, detail=f"Layer {layer_name} not found")
    return {"layer": layer_name, "data": grid["layers"][layer_name]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)