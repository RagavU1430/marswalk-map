# Martian Map - NASA Space Apps Challenge 2026

## Project Context

This is a **NASA Space Apps Challenge 2026** submission for the challenge:
- **Challenge**: "Interplanetary Survival Guide: Martian Map"
- **Goal**: Build an interactive map/dashboard for human Mars explorers during EVA missions

### Current Status: **Phase 1 - Foundation (Week 1/2)**

This project is being developed as a web application using **React + Vite + CesiumJS** to render a 3D Mars globe with mission data overlays for route planning and hazard avoidance.

### Project Structure
```
martian-map/
├── CLAUDE.md           # This file - project context for Claude
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   └── MarsGlobe.tsx    # Cesium Mars terrain
│   │   └── ui/
│   ├── lib/
│   │   ├── api-client.ts        # NASA data APIs
│   │   └── pathfinding.ts       # A* route algorithm
│   ├── stores/
│   │   └── map-store.ts         # Zustand state
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

### Key Files in Progress
- `package.json` - Vite scaffolding created
- `src/index.css` - Tailwind + Martian theme pending
- `src/App.tsx` - Basic layout pending

### Next Immediate Steps
1. Run `npm install` to install dependencies
2. Configure Cesium Ion token
3. Create MarsGlobe component with basic terrain

### Important Notes
- Cesium Ion requires free account at ion.cesium.com for Mars datasets
- All NASA data sources are public via Earthdata, USGS, and Cesium Ion
- Target deployment: GitHub Pages or Vercel

### Data Sources to Integrate
- Mars DEM (1-2 arc-second) - Cesium Ion
- MRO CTX imagery (6m/pixel) - Cesium Ion
- THEMIS thermal - NASA Earthdata
- Radiation hazards - MAVEN/EPM

---
*Created during NASA Space Apps Challenge 2026 development*