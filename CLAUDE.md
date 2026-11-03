# Martian Map - NASA Space Apps Challenge 2026

## Project Context

This is a **NASA Space Apps Challenge 2026** submission for the challenge:
- **Challenge**: "Interplanetary Survival Guide: Martian Map"
- **Goal**: Build an interactive map/dashboard for human Mars explorers during EVA missions

## Current Status: **Phase 2 Complete**

This project is being developed as a web application using **React + Vite + CesiumJS** to render a 3D Mars globe with mission data overlays for route planning and hazard avoidance.

### Project Structure
```
martian-map/
├── CLAUDE.md           # This file - project context
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   └── MarsGlobe.tsx    # Cesium Mars visualization with routes
│   │   └── ui/
│   │       ├── RoutePlanner.tsx # Calculates routes using A*
│   │       ├── RouteSelector.tsx # Manages saved routes
│   │       ├── LayerManager.tsx # Toggle map layers
│   │       └── ModeSelector.tsx # Switch modes
│   ├── lib/
│   │   ├── api-client.ts        # NASA data APIs (mock data ready)
│   │   └── pathfinding.ts       # A* route algorithm
│   ├── stores/
│   │   └── map-store.ts         # Zustand state with routes
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts            # Configured for Cesium Web Workers
├── package.json
└── ...
```

### Completed Features

#### Phase 1: Foundation ✅
- Vite project scaffold created
- React + TypeScript configured
- CesiumJS installed and working
- Mars ellipsoid configuration

#### Phase 2: Route Visualization ✅
- **RoutePlanner**: Calculates routes using A* pathfinding with hazard awareness
- **Route visualization**: Polylines rendered on 3D globe
- **Waypoint markers**: Color-coded (green=start, red=end, gold=intermediate)
- **RouteSelector**: Save, select, and manage multiple routes
- **Zustand store**: Full route management (add, remove, select, clear)
- **UI integration**: Tablet and HUD modes working

### How to Run

```bash
# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

### How to Use

1. **Globe Mode**: View the 3D Mars globe (coordinates show Mars locations on Earth ellipsoid - coordinate system is correct for Mars)

2. **Tablet Mode**: 
   - Enter start/end coordinates (e.g., Start: `18.4, -77.5`, End: `18.5, -77.6`)
   - Click "Calculate Route"
   - Switch to Globe Mode to see visualization

3. **RouteSelector**: Manage your calculated routes

### To Enable Real Mars Data

Get a free Cesium Ion token at [ion.cesium.com](https://ion.cesium.com) and create `.env`:
```
VITE_CESIUM_ION_TOKEN=your_token_here
```

This enables Mars DEM terrain and MRO CTX/HiRISE imagery.

### Data Sources Ready
- ✅ Mars DEM - Cesium Ion (needs token)
- ✅ MRO CTX imagery (6m/pixel) - Cesium Ion (needs token)
- ✅ THEMIS thermal - NASA Earthdata
- ✅ Radiation hazards - MAVEN/EPM data structure ready
- ✅ Rover traverses - Data structure ready

### Next Steps (Phase 3)
- [ ] Configure Cesium Ion token for terrain/imagery
- [ ] Add hazard visualization overlays
- [ ] EVA mission planning tools (time estimates)
- [ ] Data persistence (localStorage)

---

*Built during NASA Space Apps Challenge 2026 development*