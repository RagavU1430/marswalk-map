// NASA Space Apps Challenge 2026 - Jezero Crater Data & Mission Presets
// Real-world Jezero Delta Coordinates: ~18.4447°N, 77.4508°E

export interface ScienceStop {
  id: string
  name: string
  lat: number
  lon: number
  elevation: number // meters relative to Martian MOLA datum
  targetType: 'Hab' | 'Clay Outcrop' | 'Carbonate Ridge' | 'Delta Scarp' | 'Boulder Field' | 'Rover Cache'
  scienceGoal: string
  minerals: string[]
  geologicUnit: string
  organicsPotential: 'High' | 'Moderate' | 'Critical Astrobiology Target' | 'Baseline'
  povImageUrl: string
  povImageCaption: string
  samplePriority: 1 | 2 | 3
  hazardMetrics: {
    slopeDegrees: number
    rockDensityScore: number // 0 to 1
    thermalInertia: string // J m^-2 K^-1 s^-1/2
    radiationDoseRate: number // micro-Sieverts / hour
  }
}

export interface HazardZone {
  id: string
  name: string
  type: 'steep_scarp' | 'boulder_field' | 'dust_sink' | 'radiation_hotspot'
  riskLevel: 'caution' | 'critical'
  coordinates: [number, number][] // [lat, lon] polygon vertices
  description: string
  slopeAvg?: number
}

export interface MissionPreset {
  id: string
  name: string
  tagline: string
  description: string
  estimatedDistanceKm: number
  targetDurationHours: number
  scienceObjectives: string[]
  stops: ScienceStop[]
}

// Jezero Delta Center coordinates
export const JEZERO_CENTER = {
  lat: 18.4447,
  lon: 77.4508,
  altitude: 10000, // meters for Cesium camera overview
}

// 7 NASA Layers as defined in PRD
export const NASA_DATA_LAYERS = {
  basemap: {
    id: 'basemap',
    label: 'Basemap (HiRISE/CTX)',
    kind: 'Optical',
    source: 'NASA Mars Trek / MRO CTX & HiRISE',
    description: 'High-resolution optical orbital imagery for visual orientation',
    visible: true,
    opacity: 0.95,
  },
  slope: {
    id: 'slope',
    label: 'Slope Hazard (MOLA/HRSC)',
    kind: 'Topographic',
    source: 'Mars DEM (MOLA/HRSC)',
    description: 'Slopes > 15° flagged for astronaut traverse safety and slip avoidance',
    visible: true,
    opacity: 0.75,
  },
  minerals: {
    id: 'minerals',
    label: 'CRISM Minerals (Clays/Carbonates)',
    kind: 'Spectral',
    source: 'CRISM Compact Reconnaissance Imaging Spectrometer',
    description: 'Aqueous alteration minerals: Fe/Mg smectite clays & magnesium carbonates',
    visible: true,
    opacity: 0.8,
  },
  surface: {
    id: 'surface',
    label: 'Surface Risk (THEMIS Thermal)',
    kind: 'Thermal',
    source: 'THEMIS Thermal Inertia',
    description: 'Low thermal inertia indicates soft dust sinks; high indicates bedrock',
    visible: false,
    opacity: 0.7,
  },
  geologic: {
    id: 'geologic',
    label: 'USGS Geologic Map',
    kind: 'Geologic',
    source: 'USGS-NASA Jezero Crater Geologic Map',
    description: 'Delta top set, foreset, and bottom set rock unit boundaries',
    visible: false,
    opacity: 0.65,
  },
  weather: {
    id: 'weather',
    label: 'Atmospheric Safety (MEDA)',
    kind: 'Atmospheric',
    source: 'Perseverance MEDA Sensor Suite',
    description: 'Real-time wind gusts, surface temperature, and dust optical depth (tau)',
    visible: true,
    opacity: 1.0,
  },
  radiation: {
    id: 'radiation',
    label: 'Radiation Budget (Curiosity/RAD)',
    kind: 'Radiation',
    source: 'MSL RAD Dosimeter Telemetry',
    description: 'Galactic cosmic rays & solar particle event dose accumulator',
    visible: true,
    opacity: 1.0,
  },
}

// Real Perseverance & Jezero Science Stops
export const JEZERO_SCIENCE_STOPS: ScienceStop[] = [
  {
    id: 'hab-alpha',
    name: 'Octavia E. Butler Base (Hab Alpha)',
    lat: 18.4447,
    lon: 77.4508,
    elevation: -2570,
    targetType: 'Hab',
    scienceGoal: 'EVA Depress/Press Airlock, Comms Relay & Life Support Return Hub',
    minerals: ['Basaltic Regolith', 'Plagioclase Feldspar'],
    geologicUnit: 'Crater Floor Fractured 1 (Cf-f1)',
    organicsPotential: 'Baseline',
    povImageUrl: 'https://mars.nasa.gov/system/resources/detail_files/25732_PIA24424-web.jpg',
    povImageCaption: 'Perseverance landing site facing west toward the Jezero delta front rim.',
    samplePriority: 3,
    hazardMetrics: {
      slopeDegrees: 2.1,
      rockDensityScore: 0.15,
      thermalInertia: '310 (Firm Bedrock/Pebble)',
      radiationDoseRate: 23.4, // uSv/h
    },
  },
  {
    id: 'stop-clays',
    name: 'Three Forks Clay Outcrop',
    lat: 18.4552,
    lon: 77.4325,
    elevation: -2545,
    targetType: 'Clay Outcrop',
    scienceGoal: 'Sample Fe/Mg smectite clay layers for biosignature and organic preservation',
    minerals: ['Fe/Mg-Smectite', 'Nontronite', 'Hydrated Silica'],
    geologicUnit: 'Delta Bottomset Mudstones (Delta-bs)',
    organicsPotential: 'Critical Astrobiology Target',
    povImageUrl: 'https://mars.nasa.gov/system/resources/detail_files/26058_PIA24750-web.jpg',
    povImageCaption: 'Finely laminated mudstones at the base of the delta; primary organics trap.',
    samplePriority: 1,
    hazardMetrics: {
      slopeDegrees: 6.4,
      rockDensityScore: 0.28,
      thermalInertia: '260 (Compacted sediment)',
      radiationDoseRate: 24.1,
    },
  },
  {
    id: 'stop-carbonates',
    name: 'Margin Carbonate Ridge (Amalik Ridge)',
    lat: 18.4680,
    lon: 77.4190,
    elevation: -2510,
    targetType: 'Carbonate Ridge',
    scienceGoal: 'Core stromatolite-like carbonate rims for ancient microbial fossil traces',
    minerals: ['Magnesite', 'Dolomite', 'Olivine Cumulate'],
    geologicUnit: 'Marginal Carbonate Unit (Delta-mcu)',
    organicsPotential: 'High',
    povImageUrl: 'https://mars.nasa.gov/system/resources/detail_files/26628_PIA25328-web.jpg',
    povImageCaption: 'Carbonate-rich bench rock exposed along ancient lake paleoshoreline.',
    samplePriority: 1,
    hazardMetrics: {
      slopeDegrees: 9.8,
      rockDensityScore: 0.42,
      thermalInertia: '420 (Lithified Carbonate)',
      radiationDoseRate: 22.8,
    },
  },
  {
    id: 'stop-kodiak',
    name: 'Kodiak Mesa Delta Remnant',
    lat: 18.4310,
    lon: 77.4185,
    elevation: -2480,
    targetType: 'Delta Scarp',
    scienceGoal: 'Document cross-bedding stratigraphy proving ancient river flow velocity',
    minerals: ['Quartz-analog Silicates', 'Jarosite', 'Hematite'],
    geologicUnit: 'Delta Foreset Sandstones (Delta-fs)',
    organicsPotential: 'Moderate',
    povImageUrl: 'https://mars.nasa.gov/system/resources/detail_files/26279_PIA24838-web.jpg',
    povImageCaption: 'Perseverance Mastcam-Z view of Kodiak butte showing steep dipping delta beds.',
    samplePriority: 2,
    hazardMetrics: {
      slopeDegrees: 14.5,
      rockDensityScore: 0.55,
      thermalInertia: '350 (Sandstone/Talus)',
      radiationDoseRate: 25.2,
    },
  },
  {
    id: 'stop-boulder-cache',
    name: 'Castell Henllys Boulder Terrace',
    lat: 18.4410,
    lon: 77.4080,
    elevation: -2460,
    targetType: 'Boulder Field',
    scienceGoal: 'Inspect erratic boulders washed down by catastrophic late-stage flood flows',
    minerals: ['Pyroxene', 'Impact Glass', 'Anorthosite'],
    geologicUnit: 'Upper Delta Boulder Conglomerate',
    organicsPotential: 'Moderate',
    povImageUrl: 'https://mars.nasa.gov/system/resources/detail_files/26792_PIA25488-web.jpg',
    povImageCaption: 'Sub-rounded meter-scale boulders transported from crater rim highlands.',
    samplePriority: 2,
    hazardMetrics: {
      slopeDegrees: 11.2,
      rockDensityScore: 0.72,
      thermalInertia: '480 (Dense boulder cluster)',
      radiationDoseRate: 24.6,
    },
  },
]

// Real Jezero Hazard zones to route around
export const JEZERO_HAZARD_ZONES: HazardZone[] = [
  {
    id: 'scarp-wall-alpha',
    name: 'Delta Front Scarp Wall',
    type: 'steep_scarp',
    riskLevel: 'critical',
    slopeAvg: 28.5,
    description: 'Extreme vertical scarp cliff (>25° grade). High astronaut tumbling risk.',
    coordinates: [
      [18.4480, 77.4260],
      [18.4520, 77.4240],
      [18.4570, 77.4210],
      [18.4540, 77.4180],
      [18.4470, 77.4220],
    ],
  },
  {
    id: 'boulder-chute',
    name: 'Séítah Boulder Field Chute',
    type: 'boulder_field',
    riskLevel: 'caution',
    slopeAvg: 16.0,
    description: 'Dense jumble of razor-sharp basalt blocks. High spacesuit puncture hazard.',
    coordinates: [
      [18.4360, 77.4420],
      [18.4410, 77.4380],
      [18.4390, 77.4310],
      [18.4340, 77.4350],
    ],
  },
  {
    id: 'dust-dune-sink',
    name: 'Nerretvands Sand Ripple Field',
    type: 'dust_sink',
    riskLevel: 'caution',
    slopeAvg: 8.0,
    description: 'Thick unconsolidated aeolian dust. Astronaut footing slips up to 40%.',
    coordinates: [
      [18.4600, 77.4390],
      [18.4650, 77.4350],
      [18.4620, 77.4300],
      [18.4570, 77.4330],
    ],
  },
]

// Current MEDA Atmospheric Telemetry (Perseverance Sol 980 baseline)
export const JEZERO_WEATHER_TELEMETRY = {
  sol: 980,
  season: 'Northern Winter (Ls ~320°)',
  localMarsTime: '11:42 LMST',
  surfaceTempC: -22.4,
  airTempC: -54.1,
  pressurePa: 742, // ~7.4 mbar
  windSpeedMs: 6.2,
  windGustMs: 14.8,
  windDirection: 'ENE (68°)',
  dustOpticalDepthTau: 0.42, // Low dust, clear EVA conditions
  evaStatus: 'GO FOR EVA' as const,
  uvIndex: 'High (Sol-peak in 1.2 hrs)',
}

// Curiosity/Perseverance RAD Radiation Telemetry
export const JEZERO_RADIATION_TELEMETRY = {
  doseRateMicroSvPerHour: 24.2, // normal quiet sun GCR background on Mars surface
  dailyBudgetMicroSv: 1000, // safe EVA threshold per mission protocol
  crewLimitWarningPercent: 60,
  crewLimitDangerPercent: 85,
  spaceWeatherStatus: 'Nominal GCR, No Solar Proton Event Detected',
}

// Curated Mission Scenarios for 1-Click Judges Demo
export const MISSION_PRESETS: MissionPreset[] = [
  {
    id: 'organics-hunt',
    name: 'Jezero Delta Organics Loop',
    tagline: 'Primary Astrobiology Sortie (Clay & Carbonate Search)',
    description: 'Traverses west from Hab Alpha across the delta base, sampling high-priority smectite mudstones and stromatolite carbonates while bypassing the steep scarp cliffs.',
    estimatedDistanceKm: 3.4,
    targetDurationHours: 2.3,
    scienceObjectives: [
      'Core 2 samples of Fe/Mg smectite clay for organic matter analysis',
      'Document contact boundary between crater floor and delta bottomset',
      'Sample marginal carbonates along the paleolake shoreline',
      'Return to Hab before 14:00 LMST dust/thermal cooldown',
    ],
    stops: [
      JEZERO_SCIENCE_STOPS[0], // Hab
      JEZERO_SCIENCE_STOPS[1], // Clays
      JEZERO_SCIENCE_STOPS[2], // Carbonates
      JEZERO_SCIENCE_STOPS[0], // Return to Hab
    ],
  },
  {
    id: 'kodiak-survey',
    name: 'Kodiak Butte Stratigraphy Survey',
    tagline: 'Fluvial Geomorphology & Delta Architecture',
    description: 'Focuses on the southern delta remnant to measure sedimentary bed strike and dip angles, verifying ancient river flow dynamics.',
    estimatedDistanceKm: 2.2,
    targetDurationHours: 1.5,
    scienceObjectives: [
      'High-resolution stereoscopic imagery of Kodiak foreset beds',
      'Assess scree slope stability for future rover ascent',
      'Collect baseline regolith sample at southern fan terminus',
    ],
    stops: [
      JEZERO_SCIENCE_STOPS[0], // Hab
      JEZERO_SCIENCE_STOPS[3], // Kodiak
      JEZERO_SCIENCE_STOPS[0], // Hab
    ],
  },
  {
    id: 'boulder-deep-survey',
    name: 'Grand Delta Full Traverse',
    tagline: 'Comprehensive 4km Multi-Discipline Expedition',
    description: 'Full perimeter exploration passing clay outcroppings, carbonate terraces, and flood boulder erratics.',
    estimatedDistanceKm: 4.8,
    targetDurationHours: 3.2,
    scienceObjectives: [
      'Multi-spectral sampling across 3 distinct geologic formations',
      'Radiation monitoring across different topographic elevations',
      'Document high-energy flood boulders from Jezero crater rim',
    ],
    stops: [
      JEZERO_SCIENCE_STOPS[0], // Hab
      JEZERO_SCIENCE_STOPS[1], // Clays
      JEZERO_SCIENCE_STOPS[2], // Carbonates
      JEZERO_SCIENCE_STOPS[4], // Boulders
      JEZERO_SCIENCE_STOPS[0], // Hab
    ],
  },
]

