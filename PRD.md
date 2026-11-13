# Marswalk Map: PRD for a 24-hour build
Nov 13, 2026 · @Ragav

## Summary
We are building **Marswalk Map**: a tablet-style web app that layers at least seven NASA Mars datasets over a hyperlocal site (the Jezero Crater delta front) and plans a safe, science-rich walking route for an astronaut.

**Pitch**: "Google Maps for the first Marswalk. Pick your science stops, and it draws the safest route, with the terrain, radiation, and weather context a crew needs."

## Mission Scenario
The crew lands near the Jezero delta and walks a 2 to 4 km loop (adjustable) to study the ancient river delta.

- **Science goal 1**: Reach clay- and carbonate-rich outcrops (best for organics).
- **Science goal 2**: Sample contrasting rock units from the geologic map.
- **Science goal 3**: Document layered delta sediments (POV imagery).
- **Safety rule**: Stay on gentle slopes, avoid boulder fields/steep scarps, and finish before dusk or a dust spike.

## Data Layers
| Layer | Kind | Source | What it tells the astronaut |
| :--- | :--- | :--- | :--- |
| **Basemap** | Optical | [HiRISE / CTX (via Mars Trek)](https://trek.nasa.gov) | Visual orientation |
| **Slope** | Topographic | [Mars DEM (MOLA/HRSC)](https://trek.nasa.gov) | Walkability (slope limits) |
| **Minerals** | Spectral | [CRISM mineral maps](https://trek.nasa.gov) | Science targets (clays/carbonates) |
| **Surface** | Thermal | [THEMIS thermal inertia](https://trek.nasa.gov) | Rock vs. dust footing risk |
| **Geologic** | Geologic | [USGS-NASA Geologic Map](https://planetarymapping.wr.usgs.gov) | Rock unit sampling |
| **Weather** | Atmospheric | [Perseverance MEDA](https://mars.nasa.gov/mars2020/mission/status/) | EVA window safety |
| **Radiation** | Radiation | [Curiosity RAD](https://mars.nasa.gov/msl/mission/science/measurements/) | EVA dose budget |
| **POV** | Photos | [Perseverance Raw Images](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | Ground-level view |

## Features (MVP)
1. Layered map with toggles and opacity sliders.
2. Waypoint tool: tap to add science stops (start/end at habitat).
3. Auto-route engine: avoids hazards and highlights risk zones.
4. Stop cards: mineral/geologic info + Perseverance POV photos.
5. EVA Dashboard: distance, estimated time, and radiation budget bar.

## Route Engine Logic
- **Grid**: 5m cells over a 6km x 6km area.
- **Cost**: `1 + a*slope + b*surface_risk + c*radiation_factor`.
- **A***: Runs on precomputed JSON grid for speed.

## 24-Hour Build Plan
1. **0–2h**: Finalize site/data URLs and environment setup.
2. **2–6h**: Data clipping, resampling, and grid creation (D, B).
3. **2–8h**: App shell, map, toggles (F).
4. **6–12h**: A* route engine and API integration (B).
5. **8–14h**: Waypoints, interactive cards, route drawing (F, S).
6. **12–16h**: Safety panel, EVA budget, risk colors (F, B).
7. **16–20h**: Polish, HUD mode, mobile responsiveness.
8. **20–22h**: Video/story/pitch (S).
9. **22–24h**: Rehearsal, buffer, final submission.

## Tech Stack
- **Frontend**: React + Vite + CesiumJS (Tailwind CSS for UI).
- **Backend/Data**: Python (FastAPI, rasterio, numpy) for precomputed grid/routing.
- **Hosting**: Vercel (Frontend), Render (API).
