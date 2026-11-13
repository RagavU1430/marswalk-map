"""
Precompute the Mars grid for Jezero Crater delta front.
Downloads data from NASA sources and creates a unified grid for fast routing.
"""

import numpy as np
import json
import requests
from pathlib import Path
from typing import Dict, Tuple
import warnings
warnings.filterwarnings("ignore")

# Try to import optional dependencies
try:
    import rasterio
    from rasterio.warp import reproject, Resampling, calculate_default_transform
    from rasterio.crs import CRS
    from rasterio.transform import from_bounds
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False
    print("rasterio not available - will generate synthetic grid")

try:
    from scipy.ndimage import gaussian_filter
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

# Configuration for Jezero Crater delta front
JEZERO_BOUNDS = {
    "min_lat": 18.30,
    "max_lat": 18.67,
    "min_lon": -77.58,
    "max_lon": -77.22,
}

GRID_CELL_SIZE_M = 5.0  # 5 meter cells
GRID_SHAPE = (740, 720)  # ~3.7km x 3.6km at 5m resolution

# NASA data URLs
DATA_SOURCES = {
    "dem": {
        "url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif",
        "local": "data/jezero_hirise_dem.tif",
        "description": "HiRISE DTM 1m (1.8 GB) - best for slope",
    },
    "ctx_dem": {
        "url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif",
        "local": "data/jezero_ctx_dem.tif",
        "description": "CTX DTM 20m - fallback for larger area",
    },
    "ctx_ortho": {
        "url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_soc_008_orthomosaic_6m_Eqc_latTs0_lon0.tif",
        "local": "data/jezero_ctx_ortho.tif",
        "description": "CTX Orthoimage 6m - basemap",
    },
    "hirise_ortho": {
        "url": "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_orthomosaic_25cm_Eqc_latTs0_lon0_blend40.tif",
        "local": "data/jezero_hirise_ortho.tif",
        "description": "HiRISE Orthoimage 0.25m - high-res basemap",
    },
    "thermal": {
        "url": "https://astrogeology.usgs.gov/ckan/dataset/e0e063df-dd21-44ca-b931-c410b4268f5f/resource/572fb60c-67cc-4b2f-9d8e-6e6086ce7a52/download/themis_global_thermal-inertia_thumb.png",
        "local": "data/themis_thermal_inertia.tif",
        "description": "THEMIS Thermal Inertia 100m - surface properties",
    },
}


def download_file(url: str, local_path: Path, chunk_size: int = 8192) -> bool:
    """Download a file with progress"""
    try:
        local_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {url}...")
        
        with requests.get(url, stream=True, timeout=30) as r:
            r.raise_for_status()
            total = int(r.headers.get('content-length', 0))
            
            with open(local_path, 'wb') as f:
                downloaded = 0
                for chunk in r.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0:
                            pct = downloaded / total * 100
                            if downloaded % (chunk_size * 1000) == 0:
                                print(f"  {pct:.1f}% ({downloaded/1e6:.1f}/{total/1e6:.1f} MB)")
        
        print(f"  ✓ Saved to {local_path}")
        return True
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False


def clip_and_resample_raster(
    input_path: Path,
    output_path: Path,
    target_bounds: dict,
    target_shape: tuple,
    target_crs: str = "EPSG:4326",
) -> np.ndarray:
    """Clip and resample a raster to the target grid"""
    if not HAS_RASTERIO:
        raise RuntimeError("rasterio required for raster processing")
    
    with rasterio.open(input_path) as src:
        # Calculate transform for target bounds
        transform, width, height = calculate_default_transform(
            src.crs, target_crs,
            target_shape[1], target_shape[0],
            left=target_bounds["min_lon"],
            bottom=target_bounds["min_lat"],
            right=target_bounds["max_lon"],
            top=target_bounds["max_lat"],
        )
        
        # Read and reproject
        data = np.zeros(target_shape, dtype=np.float32)
        reproject(
            source=rasterio.band(src, 1),
            destination=data,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs=target_crs,
            resampling=Resampling.bilinear,
        )
    
    # Save clipped version
    profile = {
        'driver': 'GTiff',
        'dtype': 'float32',
        'width': target_shape[1],
        'height': target_shape[0],
        'count': 1,
        'crs': target_crs,
        'transform': transform,
    }
    
    with rasterio.open(output_path, 'w', **profile) as dst:
        dst.write(data, 1)
    
    return data


def compute_slope_from_dem(dem: np.ndarray, cell_size_m: float) -> np.ndarray:
    """Compute slope in degrees from DEM"""
    if not HAS_SCIPY:
        # Simple gradient approximation
        dy, dx = np.gradient(dem, cell_size_m)
        slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
        return np.degrees(slope_rad)
    
    # Use Sobel for better accuracy
    from scipy.ndimage import sobel
    dx = sobel(dem, axis=1) / (8 * cell_size_m)
    dy = sobel(dem, axis=0) / (8 * cell_size_m)
    slope_rad = np.arctan(np.sqrt(dx**2 + dy**2))
    return np.degrees(slope_rad)


def normalize_to_unit(arr: np.ndarray, min_val: float = None, max_val: float = None) -> np.ndarray:
    """Normalize array to 0-1 range"""
    if min_val is None:
        min_val = np.nanmin(arr)
    if max_val is None:
        max_val = np.nanmax(arr)
    
    arr_clipped = np.clip(arr, min_val, max_val)
    return (arr_clipped - min_val) / (max_val - min_val + 1e-10)


def generate_synthetic_grid() -> Dict:
    """Generate a synthetic grid for testing when real data unavailable"""
    print("Generating synthetic grid for Jezero Crater...")
    
    rows, cols = GRID_SHAPE
    
    # Create a synthetic DEM with Jezero-like features
    y, x = np.mgrid[0:rows, 0:cols]
    
    # Base elevation ~ -2600m (Jezero floor)
    dem = -2600 * np.ones((rows, cols), dtype=np.float32)
    
    # Add delta fan structure (gently sloping from west to east)
    delta_slope = (x / cols) * 50  # 50m rise across delta
    dem += delta_slope
    
    # Add crater rim to the west (higher elevation)
    rim_mask = x < cols * 0.3
    dem[rim_mask] += (1 - x[rim_mask] / (cols * 0.3)) * 200
    
    # Add some noise/roughness
    np.random.seed(42)
    dem += np.random.normal(0, 2, dem.shape).astype(np.float32)
    
    # Smooth slightly
    if HAS_SCIPY:
        dem = gaussian_filter(dem, sigma=3)
    
    # Compute slope
    slope = compute_slope_from_dem(dem, GRID_CELL_SIZE_M)
    
    # Surface risk (thermal inertia proxy): 
    # Low thermal inertia = dust/sand = high risk (loose footing)
    # High thermal inertia = rock/bedrock = low risk (good footing)
    # Synthetic: delta front has more loose material
    surface_risk = np.ones((rows, cols), dtype=np.float32) * 0.3  # baseline
    surface_risk += (x / cols) * 0.4  # increases toward delta front
    surface_risk += np.random.normal(0, 0.1, surface_risk.shape).astype(np.float32)
    surface_risk = np.clip(surface_risk, 0, 1)
    
    # Radiation: relatively uniform, slight variation
    radiation = np.ones((rows, cols), dtype=np.float32) * 0.2
    radiation += np.random.normal(0, 0.05, radiation.shape).astype(np.float32)
    radiation = np.clip(radiation, 0, 1)
    
    # Normalize slope to 0-1 for cost computation
    slope_norm = normalize_to_unit(slope, 0, 30)
    
    return {
        "bounds": JEZERO_BOUNDS,
        "shape": [rows, cols],
        "cell_size_m": GRID_CELL_SIZE_M,
        "layers": {
            "elevation": dem.tolist(),
            "slope": slope.tolist(),
            "slope_norm": slope_norm.tolist(),
            "surface": surface_risk.tolist(),
            "radiation": radiation.tolist(),
        }
    }


def main():
    """Main preprocessing pipeline"""
    print("=" * 60)
    print("Marswalk Map - Grid Precomputation")
    print("Jezero Crater Delta Front")
    print("=" * 60)
    
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    grid_data = None
    
    if HAS_RASTERIO:
        print("\nAttempting to process real NASA data...")
        # Try to download and process real data
        # Note: The HiRISE DTM is 1.8 GB - may need to use CTX 20m instead for speed
        dem_path = data_dir / "jezero_ctx_dem.tif"
        
        if not dem_path.exists():
            print("Downloading CTX DTM (20m)...")
            download_file(DATA_SOURCES["ctx_dem"]["url"], dem_path)
        
        if dem_path.exists():
            try:
                print("Processing DEM...")
                dem = clip_and_resample_raster(
                    dem_path,
                    data_dir / "dem_clipped.tif",
                    JEZERO_BOUNDS,
                    GRID_SHAPE,
                )
                
                print("Computing slope...")
                slope = compute_slope_from_dem(dem, GRID_CELL_SIZE_M)
                
                # Try to load thermal inertia
                thermal_path = data_dir / "themis_thermal.tif"
                if not thermal_path.exists():
                    # Download THEMIS tile for Jezero region
                    print("Downloading THEMIS thermal inertia...")
                    # Using the 30S060E tile which covers Jezero (~18N, 77W = 283E)
                    # Actually Jezero is at ~18N, 283E (77W)
                    # The tile naming is confusing - let's try to find the right one
                    pass
                
                # For now, create synthetic surface/radiation layers
                rows, cols = GRID_SHAPE
                y, x = np.mgrid[0:rows, 0:cols]
                surface_risk = np.clip(0.3 + (x / cols) * 0.4 + np.random.normal(0, 0.1, (rows, cols)), 0, 1)
                radiation = np.clip(0.2 + np.random.normal(0, 0.05, (rows, cols)), 0, 1)
                slope_norm = normalize_to_unit(slope, 0, 30)
                
                grid_data = {
                    "bounds": JEZERO_BOUNDS,
                    "shape": [rows, cols],
                    "cell_size_m": GRID_CELL_SIZE_M,
                    "layers": {
                        "elevation": dem.tolist(),
                        "slope": slope.tolist(),
                        "slope_norm": slope_norm.tolist(),
                        "surface": surface_risk.tolist(),
                        "radiation": radiation.tolist(),
                    }
                }
                print("✓ Real DEM processed successfully")
            except Exception as e:
                print(f"✗ Failed to process real data: {e}")
                print("Falling back to synthetic grid...")
                grid_data = generate_synthetic_grid()
        else:
            print("DEM download failed, using synthetic grid")
            grid_data = generate_synthetic_grid()
    else:
        print("rasterio not available, generating synthetic grid")
        grid_data = generate_synthetic_grid()
    
    # Save grid
    output_file = output_dir / "mars_grid.json"
    print(f"\nSaving grid to {output_file}...")
    with open(output_file, "w") as f:
        json.dump(grid_data, f)
    
    print(f"✓ Grid saved: {grid_data['shape'][0]}x{grid_data['shape'][1]} cells, {GRID_CELL_SIZE_M}m resolution")
    print(f"  Bounds: {JEZERO_BOUNDS}")
    print(f"  Layers: {list(grid_data['layers'].keys())}")
    
    # Also create a smaller preview for quick testing
    preview = {
        "bounds": grid_data["bounds"],
        "shape": grid_data["shape"],
        "cell_size_m": grid_data["cell_size_m"],
        "layers": {k: v for k, v in grid_data["layers"].items() if k != "elevation"},
    }
    preview_file = output_dir / "mars_grid_preview.json"
    with open(preview_file, "w") as f:
        json.dump(preview, f)
    print(f"✓ Preview saved to {preview_file}")


if __name__ == "__main__":
    main()