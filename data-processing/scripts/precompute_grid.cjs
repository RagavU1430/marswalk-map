#!/usr/bin/env node
/**
 * Marswalk Map - Grid Precomputation Script (Node.js version)
 * Generates a unified 5m resolution grid for Jezero Crater delta front
 * with all hazard layers for fast A* pathfinding.
 */

const fs = require('fs');
const path = require('path');

// Configuration for Jezero Crater delta front - 6km x 6km area around delta
const JEZERO_BOUNDS = {
    min_lat: 18.42,    // ~2.8km south of delta center
    max_lat: 18.48,    // ~2.8km north of delta center  
    min_lon: -77.48,   // ~3.3km west of delta center
    max_lon: -77.40,   // ~3.3km east of delta center
};

const GRID_CELL_SIZE_M = 5.0;  // 5 meter cells
const LAT_M_PER_DEG = 111000;
const LON_M_PER_DEG = 111000 * Math.cos(18.44 * Math.PI / 180);  // ~105,400 m

// Grid dimensions - approximately 6km x 6km = 1200 x 1200 cells
const LAT_EXTENT_DEG = JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat;
const LON_EXTENT_DEG = JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon;
const LAT_EXTENT_M = LAT_EXTENT_DEG * LAT_M_PER_DEG;
const LON_EXTENT_M = LON_EXTENT_DEG * LON_M_PER_DEG;

const GRID_ROWS = Math.floor(LAT_EXTENT_M / GRID_CELL_SIZE_M);  // ~1200
const GRID_COLS = Math.floor(LON_EXTENT_M / GRID_CELL_SIZE_M);  // ~1200

console.log(`Grid: ${GRID_ROWS} x ${GRID_COLS} cells at ${GRID_CELL_SIZE_M}m resolution`);
console.log(`Area: ${(LAT_EXTENT_M/1000).toFixed(1)} km x ${(LON_EXTENT_M/1000).toFixed(1)} km`);

function latLonToGrid(lat, lon) {
    const latNorm = (lat - JEZERO_BOUNDS.min_lat) / (JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat);
    const lonNorm = (lon - JEZERO_BOUNDS.min_lon) / (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon);
    
    const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((1 - latNorm) * (GRID_ROWS - 1))));
    const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(lonNorm * (GRID_COLS - 1))));
    return [row, col];
}

function gridToLatLon(row, col) {
    const latNorm = 1 - (row / (GRID_ROWS - 1));
    const lonNorm = col / (GRID_COLS - 1);
    
    const lat = JEZERO_BOUNDS.min_lat + latNorm * (JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat);
    const lon = JEZERO_BOUNDS.min_lon + lonNorm * (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon);
    return [lat, lon];
}

function computeSlope(lat, lon) {
    const xNorm = (lon - JEZERO_BOUNDS.min_lon) / (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon);
    
    // Base delta fan slope (gentle descent ~3-5°)
    let deltaSlope = 4 + xNorm * 3;
    
    // Scarp wall at western edge (steep 25-30°)
    let scarpFactor = Math.max(0, (0.25 - xNorm) * 40);
    
    // Add some noise
    let noise = Math.sin(lat * 1000) * Math.cos(lon * 1000) * 1.5;
    
    let slope = deltaSlope + scarpFactor + noise;
    return Math.max(0, Math.min(45, slope));  // Clamp 0-45°
}

function computeSurfaceRisk(lat, lon) {
    const xNorm = (lon - JEZERO_BOUNDS.min_lon) / (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon);
    const yNorm = (lat - JEZERO_BOUNDS.min_lat) / (JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat);
    
    // Baseline firm regolith
    let baseRisk = 0.2;
    
    // Dust sinks at delta front (east side)
    let dustRisk = xNorm * 0.3;
    
    // Boulder fields in specific regions
    let boulderRisk = 0;
    // Séítah region (southwest)
    if (xNorm < 0.4 && yNorm < 0.4) {
        boulderRisk = 0.5;
    }
    
    // Crater rim ejecta
    if (xNorm < 0.15) {
        boulderRisk = Math.max(boulderRisk, 0.4);
    }
    
    // Noise
    let noise = Math.sin(lat * 500) * Math.cos(lon * 500) * 0.1;
    
    let risk = baseRisk + dustRisk + boulderRisk + noise;
    return Math.max(0, Math.min(1, risk));
}

function computeRadiationFactor(lat, lon) {
    let baseRad = 0.2;
    let topoShield = 0.05 * Math.sin(lat * 800) * Math.cos(lon * 800);
    return Math.max(0, Math.min(1, baseRad + topoShield));
}

function computeElevation(lat, lon) {
    const xNorm = (lon - JEZERO_BOUNDS.min_lon) / (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon);
    const yNorm = (lat - JEZERO_BOUNDS.min_lat) / (JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat);
    
    let baseElev = -2600;
    let deltaElev = xNorm * 80;
    let scarpElev = Math.max(0, (0.25 - xNorm) * 200);
    
    let crater = 0;
    let craterDist = Math.sqrt((xNorm - 0.65)**2 + (yNorm - 0.3)**2);
    if (craterDist < 0.15) {
        crater = -Math.cos((craterDist / 0.15) * (Math.PI / 2)) * 30;
    }
    
    return baseElev + deltaElev + scarpElev + crater;
}

function checkHazardZones(lat, lon) {
    const hazards = [];
    
    // Scarp wall
    if (18.447 < lat && lat < 18.458 && -77.426 < lon && lon < -77.418) {
        hazards.push({
            name: "Delta Front Scarp Wall",
            type: "steep_scarp",
            risk: "critical",
            slope: 28.5
        });
    }
    
    // Boulder field (Séítah)
    if (18.434 < lat && lat < 18.441 && -77.442 < lon && lon < -77.431) {
        hazards.push({
            name: "Séítah Boulder Field Chute",
            type: "boulder_field",
            risk: "caution",
            slope: 16.0
        });
    }
    
    // Dust sink
    if (18.457 < lat && lat < 18.465 && -77.439 < lon && lon < -77.430) {
        hazards.push({
            name: "Nerretvands Sand Ripple Field",
            type: "dust_sink",
            risk: "caution",
            slope: 8.0
        });
    }
    
    return { hazards: hazards, hazardCount: hazards.length };
}

function generateGrid() {
    console.log("Generating grid layers...");
    
    // Initialize arrays
    const elevation = new Array(GRID_ROWS).fill(0).map(() => new Array(GRID_COLS).fill(0));
    const slope = new Array(GRID_ROWS).fill(0).map(() => new Array(GRID_COLS).fill(0));
    const surfaceRisk = new Array(GRID_ROWS).fill(0).map(() => new Array(GRID_COLS).fill(0));
    const radiation = new Array(GRID_ROWS).fill(0).map(() => new Array(GRID_COLS).fill(0));
    const hazardType = new Array(GRID_ROWS).fill(0).map(() => new Array(GRID_COLS).fill(0));
    
    const hazardInfo = [
        { id: 0, name: "Safe", type: "none", risk: "none", costMult: 1.0 },
        { id: 1, name: "Delta Front Scarp Wall", type: "steep_scarp", risk: "critical", costMult: 10.0 },
        { id: 2, name: "Séítah Boulder Field Chute", type: "boulder_field", risk: "caution", costMult: 3.0 },
        { id: 3, name: "Nerretvands Sand Ripple Field", type: "dust_sink", risk: "caution", costMult: 2.5 },
    ];
    
    for (let row = 0; row < GRID_ROWS; row++) {
        if (row % 100 === 0) {
            console.log(`  Processing row ${row}/${GRID_ROWS}`);
        }
        
        for (let col = 0; col < GRID_COLS; col++) {
            const [lat, lon] = gridToLatLon(row, col);
            
            // Compute layers
            const elev = computeElevation(lat, lon);
            const slp = computeSlope(lat, lon);
            const surf = computeSurfaceRisk(lat, lon);
            const rad = computeRadiationFactor(lat, lon);
            
            elevation[row][col] = elev;
            slope[row][col] = slp;
            surfaceRisk[row][col] = surf;
            radiation[row][col] = rad;
            
            // Check hazard zones
            const hz = checkHazardZones(lat, lon);
            if (hz.hazardCount > 0) {
                for (const h of hz.hazards) {
                    if (h.risk === "critical") {
                        hazardType[row][col] = 1;
                        break;
                    } else if (h.risk === "caution" && hazardType[row][col] <= 0) {
                        hazardType[row][col] = h.type === "boulder_field" ? 2 : 3;
                    }
                }
            }
        }
    }
    
    // Compute cost grid for A*
    const SLOPE_WEIGHT = 2.2;
    const SURFACE_WEIGHT = 1.8;
    const RADIATION_WEIGHT = 1.2;
    
    const cost = new Array(GRID_ROWS).fill(0).map(() => new Array(GRID_COLS).fill(0));
    const blocked = new Array(GRID_ROWS).fill(0).map(() => new Array(GRID_COLS).fill(0));
    
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const slopeNorm = slope[row][col] / 45.0;  // Normalize to 0-1
            
            let c = (1.0 + 
                SLOPE_WEIGHT * slopeNorm + 
                SURFACE_WEIGHT * surfaceRisk[row][col] + 
                RADIATION_WEIGHT * radiation[row][col]);
            
            // Apply hazard multipliers
            if (hazardType[row][col] === 1) c *= 10.0;   // Scarp wall
            else if (hazardType[row][col] === 2) c *= 3.0;    // Boulder field
            else if (hazardType[row][col] === 3) c *= 2.5;    // Dust sink
            
            cost[row][col] = c;
            blocked[row][col] = (c > 50.0) ? 1 : 0;
        }
    }
    
    console.log("Converting to JSON format...");
    
    // Downsample for web version (stride 4 = 20m cells, much smaller)
    const stride = 4;
    const webRows = Math.floor(GRID_ROWS / stride);
    const webCols = Math.floor(GRID_COLS / stride);
    
    function downsample(arr) {
        const result = new Array(webRows).fill(0).map(() => new Array(webCols).fill(0));
        for (let r = 0; r < webRows; r++) {
            for (let c = 0; c < webCols; c++) {
                result[r][c] = arr[r * stride][c * stride];
            }
        }
        return result;
    }
    
    // Ultra-compact version for frontend (stride 8 = 40m cells)
    const compactStride = 8;
    const compactRows = Math.floor(GRID_ROWS / compactStride);
    const compactCols = Math.floor(GRID_COLS / compactStride);
    
    function downsampleCompact(arr) {
        const result = new Array(compactRows).fill(0).map(() => new Array(compactCols).fill(0));
        for (let r = 0; r < compactRows; r++) {
            for (let c = 0; c < compactCols; c++) {
                result[r][c] = arr[r * compactStride][c * compactStride];
            }
        }
        return result;
    }
    
    const gridData = {
        metadata: {
            bounds: JEZERO_BOUNDS,
            cell_size_m: GRID_CELL_SIZE_M,
            rows: GRID_ROWS,
            cols: GRID_COLS,
            lat_per_cell: (JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat) / GRID_ROWS,
            lon_per_cell: (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon) / GRID_COLS,
            generated_at: "2026-11-14",
            version: "1.0"
        },
        layers: {
            elevation: elevation,
            slope: slope,
            surface_risk: surfaceRisk,
            radiation: radiation,
            cost: cost,
            blocked: blocked,
            hazard_type: hazardType,
        },
        hazard_legend: hazardInfo,
        cost_weights: {
            slope: SLOPE_WEIGHT,
            surface_risk: SURFACE_WEIGHT,
            radiation: RADIATION_WEIGHT
        }
    };
    
    const webGrid = {
        metadata: {
            bounds: JEZERO_BOUNDS,
            cell_size_m: GRID_CELL_SIZE_M * stride,
            rows: webRows,
            cols: webCols,
            lat_per_cell: (JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat) / webRows,
            lon_per_cell: (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon) / webCols,
            generated_at: "2026-11-14",
            version: "1.0"
        },
        layers: {
            elevation: downsample(elevation),
            slope: downsample(slope),
            surface_risk: downsample(surfaceRisk),
            radiation: downsample(radiation),
            cost: downsample(cost),
            blocked: downsample(blocked),
            hazard_type: downsample(hazardType),
        },
        hazard_legend: hazardInfo,
        cost_weights: {
            slope: SLOPE_WEIGHT,
            surface_risk: SURFACE_WEIGHT,
            radiation: RADIATION_WEIGHT
        }
    };
    
    const compactGrid = {
        metadata: {
            bounds: JEZERO_BOUNDS,
            cell_size_m: GRID_CELL_SIZE_M * compactStride,
            rows: compactRows,
            cols: compactCols,
            lat_per_cell: (JEZERO_BOUNDS.max_lat - JEZERO_BOUNDS.min_lat) / compactRows,
            lon_per_cell: (JEZERO_BOUNDS.max_lon - JEZERO_BOUNDS.min_lon) / compactCols,
            generated_at: "2026-11-14",
            version: "1.0"
        },
        layers: {
            elevation: downsampleCompact(elevation),
            slope: downsampleCompact(slope),
            surface_risk: downsampleCompact(surfaceRisk),
            radiation: downsampleCompact(radiation),
            cost: downsampleCompact(cost),
            blocked: downsampleCompact(blocked),
            hazard_type: downsampleCompact(hazardType),
        },
        hazard_legend: hazardInfo,
        cost_weights: {
            slope: SLOPE_WEIGHT,
            surface_risk: SURFACE_WEIGHT,
            radiation: RADIATION_WEIGHT
        }
    };
    
    return { gridData, webGrid, compactGrid };
}

function saveGrids(gridData, webGrid, compactGrid) {
    const outputDir = path.join(__dirname, '..', 'output');
    
    const fullPath = path.join(outputDir, 'mars_grid.json');
    const webPath = path.join(outputDir, 'mars_grid_web.json');
    const compactPath = path.join(outputDir, 'mars_grid_compact.json');
    
    console.log(`Saving full grid to ${fullPath}...`);
    fs.writeFileSync(fullPath, JSON.stringify(gridData));
    
    console.log(`Saving web grid to ${webPath}...`);
    fs.writeFileSync(webPath, JSON.stringify(webGrid));
    
    console.log(`Saving compact grid to ${compactPath}...`);
    fs.writeFileSync(compactPath, JSON.stringify(compactGrid));
    
    const fullSize = fs.statSync(fullPath).size / (1024 * 1024);
    const webSize = fs.statSync(webPath).size / (1024 * 1024);
    const compactSize = fs.statSync(compactPath).size / (1024 * 1024);
    
    console.log(`Full grid (5m): ${fullSize.toFixed(1)} MB`);
    console.log(`Web grid (20m): ${webSize.toFixed(1)} MB`);
    console.log(`Compact grid (40m): ${compactSize.toFixed(1)} MB`);
    
    return { fullPath, webPath, compactPath };
}

function main() {
    console.log("=".repeat(60));
    console.log("Marswalk Map - Grid Precomputation");
    console.log("Jezero Crater Delta Front");
    console.log("=".repeat(60));
    
    const { gridData, webGrid, compactGrid } = generateGrid();
    saveGrids(gridData, webGrid, compactGrid);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Grid generation complete!");
    console.log("=".repeat(60));
    
    // Print sample values for verification
    const centerRow = Math.floor(GRID_ROWS / 2);
    const centerCol = Math.floor(GRID_COLS / 2);
    const [lat, lon] = gridToLatLon(centerRow, centerCol);
    
    console.log("\nSample values at center:");
    console.log(`  Coordinates: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
    console.log(`  Elevation: ${gridData.layers.elevation[centerRow][centerCol].toFixed(1)} m`);
    console.log(`  Slope: ${gridData.layers.slope[centerRow][centerCol].toFixed(1)}°`);
    console.log(`  Surface Risk: ${gridData.layers.surface_risk[centerRow][centerCol].toFixed(2)}`);
    console.log(`  Radiation: ${gridData.layers.radiation[centerRow][centerCol].toFixed(2)}`);
    console.log(`  Cost: ${gridData.layers.cost[centerRow][centerCol].toFixed(2)}`);
    console.log(`  Hazard: ${gridData.hazard_legend[gridData.layers.hazard_type[centerRow][centerCol]].name}`);
}

main();