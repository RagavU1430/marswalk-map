<div align="center">

# 🪐 Marswalk Map

### *Google Maps for the first Marswalk.*

**Pick your science stops. It draws the safest route — with terrain, radiation, and weather context a crew needs.**

[![NASA Space Apps 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-E03C31?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r167-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![CesiumJS](https://img.shields.io/badge/CesiumJS-1.117-6CADDF?style=for-the-badge)](https://cesium.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

```
 ███╗   ███╗ █████╗ ██████╗ ███████╗██╗    ██╗ █████╗ ██╗     ██╗  ██╗
 ████╗ ████║██╔══██╗██╔══██╗██╔════╝██║    ██║██╔══██╗██║     ██║ ██╔╝
 ██╔████╔██║███████║██████╔╝███████╗██║ █╗ ██║███████║██║     █████╔╝ 
 ██║╚██╔╝██║██╔══██║██╔══██╗╚════██║██║███╗██║██╔══██║██║     ██╔═██╗ 
 ██║ ╚═╝ ██║██║  ██║██║  ██║███████║╚███╔███╔╝██║  ██║███████╗██║  ██╗
 ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
                     M A P  •  Jezero Crater Delta Front
```

---

## 🌌 What is Marswalk Map?

**Marswalk Map** is a tactical EVA (Extravehicular Activity) route planner designed for the first human missions to Mars. Set in the **Jezero Crater Delta Front** — the richest astrobiological target on Mars — it fuses 7 NASA science data layers, real-time hazard awareness, and a cinematic **Three.js 3D sandtable** so mission planners and future astronauts can design the safest, most scientifically productive walks before they ever leave the habitat.

> Think of it as **Google Maps meets Mission Control** — but for a world 225 million km away.

---

## ✨ Features

### 🗺️ 7 NASA Science Data Layers
Toggle and blend real NASA datasets over the Jezero Crater region:

| Layer | Source | Purpose |
|---|---|---|
| HiRISE / CTX Imagery | NASA MRO | High-res surface imagery |
| MOLA Slope Map | NASA MGS | Terrain steepness — 25° max safe slope |
| CRISM Mineral Overlay | NASA MRO | Phyllosilicate, carbonate, olivine signatures |
| THEMIS Thermal | NASA Odyssey | Surface temperature — thermal stability |
| USGS Geologic Map | USGS | Bedrock and deposit classification |
| MEDA Weather HUD | Perseverance rover | Real-time wind, pressure, temperature |
| RAD Radiation | Perseverance rover | Instantaneous & cumulative dose (µSv) |

---

### 🚀 Three.js 3D Tactical Sandtable

A fully real-time **3D mission briefing environment** — not a video, not a static image. A live simulation:

- 🧑‍🚀 **Articulated NASA EMU astronaut** walks your planned route with realistic stride animation
- 🌋 **Procedural Jezero terrain** generated from elevation data with Martian dust texture
- 💡 **Glowing laser route path** with holographic beacon markers at every science stop
- 📷 **3 camera perspectives**:
  - 🛸 **Orbital Drone** — top-down tactical overview
  - 🏃 **3rd-Person Chase** — follow the astronaut in-flight
  - 🕶️ **Visor POV** — first-person helmet view of Mars
- 🎬 Real-time 60 FPS rendering with post-processing glow effects

---

### 🧭 Hazard-Aware A* Route Planning

No straight lines here. The route engine weights every path segment by:

$$\text{cost} = 1 + \alpha \cdot \text{slope} + \beta \cdot \text{surface\_risk} + \gamma \cdot \text{radiation\_factor}$$

- Avoids **boulder fields**, **steep ravines**, and **high-radiation zones**
- Returns the **safety score** (0–100) for the full EVA
- Breaks the route into **per-leg segments** with individual distance and time estimates
- Runs entirely **client-side** in TypeScript — no backend required

---

### 📍 1-Click Mission Presets

| Preset | Stops | Distance | Focus |
|---|---|---|---|
| 🔬 Jezero Delta Organics Loop | 3 | 4.2 km | Biosignature search at delta front |
| 📡 Kodiak Survey | 2 | 2.8 km | High-ground reconnaissance |
| 🏔️ Grand Delta Traverse | 5 | 8.1 km | Full delta-front geological survey |

---

### 📊 Real-Time EVA Dashboard

A collapsible mission HUD displays:
- **Total distance** (km) and **EVA duration** (hrs)
- **Radiation dose** vs. 1,000 µSv daily crew budget (color-coded gauge)
- **Route risk profile** — green/amber/red slope breakdown
- **Segment cue sheet** — time and distance per leg for mission ops

---

### 🏠 Perseverance POV Stop Cards

Each science waypoint shows:
- 📸 Mastcam-Z ground-level perspective (Perseverance rover POV)
- 🧪 CRISM-identified minerals at that location
- 🌡️ MEDA ambient conditions
- 📐 Terrain slope and surface hazard rating

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/RagavU1430/marswalk-map.git
cd marswalk-map

# 2. Install dependencies
npm install

# 3. Launch dev server (includes NASA Trek tile proxy)
npm run dev

# 4. Open http://localhost:5173
```

> **Optional** — Generate terrain grid data with Python 3.11+:
> ```bash
> cd data-processing
> pip install -r requirements.txt
> py -3.11 scripts/precompute_grid.py   # Outputs mars_grid.json (49MB)
> ```

---

## 🏗️ Architecture

```
marswalk-map/
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   ├── MarsGlobe.tsx       # CesiumJS globe — NASA Trek tiles, hazard polygons, route lines
│   │   │   └── MarsThreeViewer.tsx # Three.js sandtable — terrain, astronaut, beacons, cameras
│   │   └── ui/
│   │       ├── EVADashboard.tsx    # Telemetry HUD
│   │       ├── LayerManager.tsx    # 7-layer toggles + opacity
│   │       ├── MissionPresets.tsx  # One-click EVA scenarios
│   │       ├── ModeSelector.tsx    # Tablet / 3D Walk / Globe / HUD modes
│   │       ├── RoutePlanner.tsx    # Waypoint sequence manager
│   │       ├── RouteSelector.tsx   # EVA cue sheet
│   │       └── StopCard.tsx        # Perseverance POV + science metadata
│   ├── data/
│   │   └── jezeroData.ts           # 5 science stops, 3 hazard zones, MEDA/RAD telemetry
│   ├── lib/
│   │   └── pathfinding.ts          # Hazard-weighted A* algorithm
│   ├── stores/
│   │   └── map-store.ts            # Zustand global state
│   └── App.tsx                     # Root — full-bleed UI, drawer, dock
├── data-processing/
│   └── scripts/
│       └── precompute_grid.py      # 740×720 synthetic Jezero grid generator
└── vite.config.ts                  # Cesium static assets + NASA Trek CORS proxy
```

**Key design decision:** Everything runs in the browser — zero backend. The A\* pathfinder, telemetry calculations, and 3D rendering are all client-side. Deploy instantly to Vercel or any static host.

---

## 🌍 Data Sources

| Dataset | Provider | Access |
|---|---|---|
| Mars Viking MDIM 2.1 Color Mosaic | NASA/USGS via Trek | WMS/TMS tiles |
| HiRISE Imagery (Jezero) | NASA MRO / USGS | Trek WMS |
| MOLA Elevation Model | NASA MGS | Trek WMS |
| CRISM Mineral Signatures | NASA MRO | Trek WMS |
| THEMIS Thermal Inertia | NASA Odyssey | Trek WMS |
| MEDA Environmental Data | NASA Perseverance | Public API |
| RAD Radiation Data | NASA Perseverance | Public reports |
| Jezero Crater Geologic Map | USGS | GeoJSON / WMS |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React 18 + TypeScript 5 |
| **Build Tool** | Vite 5 |
| **3D Globe** | CesiumJS 1.117 |
| **3D Sandtable** | Three.js r167 |
| **Styling** | Tailwind CSS 3 |
| **State Management** | Zustand 4 |
| **Routing Algorithm** | Custom A\* (TypeScript) |
| **Data Processing** | Python 3.11 + NumPy |
| **Dev Proxy** | Vite proxy → NASA Trek tile servers |

---

## 👨‍🚀 Team

Built for the **[NASA International Space Apps Challenge 2026](https://www.spaceappschallenge.org/)** 🚀

> *"One small step for a planner, one giant leap for the first crew on Mars."*

---

## 📄 License

[MIT](LICENSE) — free to use, modify, and deploy. We just ask that you cite the NASA data sources above if you build on this work.

---

<div align="center">

**Made with ❤️ and cosmic ambition** · [NASA Space Apps 2026](https://www.spaceappschallenge.org/) · Jezero Crater, Mars 🔴

*"The best time to plan your Marswalk was 10 years ago. The second best time is now."*

</div>
