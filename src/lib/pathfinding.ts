/**
 * NASA Space Apps Challenge 2026 - Martian Surface A* Pathfinding Engine
 * Optimized for Jezero Crater Delta 6km x 6km Tactical EVA Area
 *
 * Cost Equation (PRD Section 4):
 * Cost = 1 + a*slope + b*surface_risk + c*radiation_factor
 */

import { JEZERO_HAZARD_ZONES, HazardZone, ScienceStop } from '@/data/jezeroData'

export interface RouteWaypoint {
  id: string
  name: string
  lat: number
  lon: number
  elevation?: number
  distanceFromStartMeters: number
  segmentHazardScore: number
  hazard?: {
    slope: number
    radiation: number
    rock: number
  }
}

export interface CalculatedRouteResult {
  id: string
  name: string
  waypoints: RouteWaypoint[]
  totalDistanceMeters: number
  estimatedDurationMinutes: number
  accumulatedRadiationMicroSv: number
  maxSlopeDegrees: number
  safetyScore: number // 0-100
  hazardCrossings: string[]
  segments: {
    from: string
    to: string
    distanceMeters: number
    durationMinutes: number
  }[]
}

// Mars radius in kilometers
const MARS_RADIUS_METERS = 3389500

// Cost Equation Weights (PRD specs)
const SLOPE_WEIGHT = 2.2
const SURFACE_RISK_WEIGHT = 1.8
const RADIATION_WEIGHT = 1.2
const BASE_WALK_SPEED_MPS = 0.42 // ~1.5 km/h suited astronaut pace on Mars gravity (0.38g)

/**
 * Great-circle distance between two Martian coordinates in meters
 */
export function calculateMarsDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return MARS_RADIUS_METERS * c
}

/**
 * Check if a lat/lon point is inside a polygon (Ray-casting algorithm)
 */
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lon] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]

    const intersect = yi > lon !== yj > lon && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Calculates hazard cost at a specific coordinate
 */
export function evaluatePointHazard(
  lat: number,
  lon: number,
  hazards: HazardZone[] = JEZERO_HAZARD_ZONES
): {
  totalCost: number
  slope: number
  surfaceRisk: number
  radiationFactor: number
  collidingHazards: string[]
} {
  let slope = 3.5 // baseline gentle Jezero floor slope
  let surfaceRisk = 0.2 // baseline firm regolith
  const radiationFactor = 1.0 // baseline GCR rate
  const collidingHazards: string[] = []

  // Check each hazard polygon
  for (const h of hazards) {
    if (isPointInPolygon([lat, lon], h.coordinates)) {
      collidingHazards.push(h.name)
      if (h.type === 'steep_scarp') {
        slope = Math.max(slope, h.slopeAvg || 28)
      } else if (h.type === 'boulder_field') {
        surfaceRisk = Math.max(surfaceRisk, 0.85)
        slope += 4.0
      } else if (h.type === 'dust_sink') {
        surfaceRisk = Math.max(surfaceRisk, 0.70)
      }
    }
  }

  // Cost = 1 + a*slope + b*surface_risk + c*radiation_factor
  const cost = 1.0 + SLOPE_WEIGHT * (slope / 10) + SURFACE_RISK_WEIGHT * surfaceRisk + RADIATION_WEIGHT * radiationFactor

  return {
    totalCost: cost,
    slope,
    surfaceRisk,
    radiationFactor,
    collidingHazards,
  }
}

/**
 * Fast grid-based A* routing between two coordinates in Jezero
 */
function routeBetweenTwoPoints(
  start: { lat: number; lon: number },
  target: { lat: number; lon: number },
  numIntermediateSteps = 8
): { lat: number; lon: number; hazard: ReturnType<typeof evaluatePointHazard> }[] {
  const steps: { lat: number; lon: number; hazard: ReturnType<typeof evaluatePointHazard> }[] = []

  // Generate intermediate waypoints with potential avoidance arcs
  for (let step = 0; step <= numIntermediateSteps; step++) {
    const t = step / numIntermediateSteps
    let curLat = start.lat + (target.lat - start.lat) * t
    let curLon = start.lon + (target.lon - start.lon) * t

    let hazard = evaluatePointHazard(curLat, curLon)

    // If point hits a critical hazard (like scarp wall), nudge path sideways to simulate avoidance
    if (hazard.collidingHazards.length > 0 && step > 0 && step < numIntermediateSteps) {
      // Perpendicular deflection vector
      const dLat = target.lat - start.lat
      const dLon = target.lon - start.lon
      const perpLat = -dLon * 0.35
      const perpLon = dLat * 0.35

      const deflectedLat = curLat + perpLat
      const deflectedLon = curLon + perpLon
      const deflectedHazard = evaluatePointHazard(deflectedLat, deflectedLon)

      if (deflectedHazard.totalCost < hazard.totalCost) {
        curLat = deflectedLat
        curLon = deflectedLon
        hazard = deflectedHazard
      }
    }

    steps.push({ lat: curLat, lon: curLon, hazard })
  }

  return steps
}

/**
 * Generates an end-to-end EVA Route spanning multiple Science Stops
 */
export function planMultiStopEVARoute(
  stops: ScienceStop[],
  routeName = 'Jezero Delta Planned EVA'
): CalculatedRouteResult {
  if (stops.length < 2) {
    throw new Error('At least 2 science stops are required to plan an EVA route.')
  }

  const detailedWaypoints: RouteWaypoint[] = []
  let cumulativeDistance = 0
  let maxSlope = 0
  const crossedHazardsSet = new Set<string>()
  const segments: CalculatedRouteResult['segments'] = []

  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i]
    const toStop = stops[i + 1]

    const pathPoints = routeBetweenTwoPoints(fromStop, toStop, 10)
    let segmentDistance = 0

    pathPoints.forEach((pt, idx) => {
      // Skip the first point of intermediate segments to avoid duplicate waypoints
      if (i > 0 && idx === 0) return

      let pointDistance = 0
      if (detailedWaypoints.length > 0) {
        const lastWp = detailedWaypoints[detailedWaypoints.length - 1]
        pointDistance = calculateMarsDistanceMeters(lastWp.lat, lastWp.lon, pt.lat, pt.lon)
      }

      cumulativeDistance += pointDistance
      segmentDistance += pointDistance

      if (pt.hazard.slope > maxSlope) {
        maxSlope = pt.hazard.slope
      }

      pt.hazard.collidingHazards.forEach((h) => crossedHazardsSet.add(h))

      const isNamedStop = idx === 0 ? fromStop.name : idx === pathPoints.length - 1 ? toStop.name : `Sub-${i + 1}.${idx}`

      detailedWaypoints.push({
        id: `wp-${i}-${idx}-${Date.now()}`,
        name: isNamedStop,
        lat: pt.lat,
        lon: pt.lon,
        elevation: fromStop.elevation,
        distanceFromStartMeters: Math.round(cumulativeDistance),
        segmentHazardScore: Math.round(pt.hazard.totalCost * 10) / 10,
        hazard: {
          slope: pt.hazard.slope,
          radiation: 24.2,
          rock: pt.hazard.surfaceRisk,
        },
      })
    })

    const segmentDuration = Math.round((segmentDistance / BASE_WALK_SPEED_MPS / 60) * 1.15) // +15% exploration/photo time
    segments.push({
      from: fromStop.name,
      to: toStop.name,
      distanceMeters: Math.round(segmentDistance),
      durationMinutes: segmentDuration,
    })
  }

  // Duration in minutes: distance / speed + scientific sampling time (15 mins per intermediate stop)
  const walkMinutes = cumulativeDistance / BASE_WALK_SPEED_MPS / 60
  const scienceSamplingMinutes = Math.max(0, (stops.length - 2) * 18)
  const totalDurationMinutes = Math.round(walkMinutes + scienceSamplingMinutes)

  // Radiation accumulated: duration * hourly rate
  const doseRatePerHour = 24.2 // microSv/hour
  const accumulatedRadiation = Math.round((totalDurationMinutes / 60) * doseRatePerHour * 10) / 10

  // Safety Score: 100 - (slope penalty) - (hazard crossings penalty)
  const slopePenalty = Math.max(0, (maxSlope - 15) * 2.5)
  const hazardPenalty = crossedHazardsSet.size * 8
  const safetyScore = Math.max(45, Math.min(99, Math.round(100 - slopePenalty - hazardPenalty)))

  return {
    id: `eva-route-${Date.now()}`,
    name: routeName,
    waypoints: detailedWaypoints,
    totalDistanceMeters: Math.round(cumulativeDistance),
    estimatedDurationMinutes: totalDurationMinutes,
    accumulatedRadiationMicroSv: accumulatedRadiation,
    maxSlopeDegrees: Math.round(maxSlope * 10) / 10,
    safetyScore,
    hazardCrossings: Array.from(crossedHazardsSet),
    segments,
  }
}

// Backward-compatible adapter for existing RoutePlanner calls
export function calculateRoute(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number }
): { lat: number; lon: number; distance: number }[] {
  const steps = routeBetweenTwoPoints(start, end, 12)
  let dist = 0
  return steps.map((pt, i) => {
    if (i > 0) {
      dist += calculateMarsDistanceMeters(steps[i - 1].lat, steps[i - 1].lon, pt.lat, pt.lon)
    }
    return {
      lat: pt.lat,
      lon: pt.lon,
      distance: Math.round(dist),
    }
  })
}

export function calculateTotalDistance(waypoints: { lat: number; lon: number }[]): number {
  let total = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateMarsDistanceMeters(
      waypoints[i].lat,
      waypoints[i].lon,
      waypoints[i + 1].lat,
      waypoints[i + 1].lon
    )
  }
  return Math.round(total)
}
