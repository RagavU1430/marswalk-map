/**
 * Modified A* Pathfinding for Martian Surface Navigation
 *
 * Algorithm accounts for:
 * - Terrain slope (steep grades cost more)
 * - Radiation levels (Mars environment hazard)
 * - Rock density (solid obstacles)
 * - Elevation changes (climbing costs)
 */

interface Waypoint {
  lat: number
  lon: number
  distance: number
}

interface Node {
  lat: number
  lon: number
  g: number // cost from start
  h: number // heuristic to end
  f: number // g + h
  parent?: Node
}

// Cost weights for different hazards
const SLOPE_WEIGHT = 15
const RADIATION_WEIGHT = 8
const ROCK_WEIGHT = 25
const ELEVATION_WEIGHT = 2
const BASE_COST = 1

// Mock hazard data - in production this would come from NASA APIs
const getSlope = (lat: number, lon: number): number => {
  // Simulated slope in degrees (0-90)
  // TODO: Replace with actual DEM data from Cesium Ion
  return Math.sin((lat + lon) * 0.01) * 10 + 15
}

const getRadiationLevel = (lat: number, lon: number): number => {
  // Simulated radiation exposure (0-1)
  // Based on MARIE/MAVEN data patterns
  return Math.cos(lat * 0.1) * 0.3 + 0.2
}

const getRockDensity = (lat: number, lon: number): number => {
  // Simulated rock coverage (0-1)
  // Higher = more obstacles
  return Math.abs(Math.sin(lon * 0.05)) * 0.4 + 0.3
}

const getElevationDelta = (lat: number, lon: number): number => {
  // Simulated elevation change in meters
  return Math.cos(lat * 0.05) * 50 + 100
}

function heuristic(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  // Euclidean distance approximation
  const dLat = a.lat - b.lat
  const dLon = a.lon - b.lon
  return Math.sqrt(dLat * dLat + dLon * dLon) * 0.11 // degrees to km approximation
}

function calculateCost(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const slope = getSlope(b.lat, b.lon)
  const radiation = getRadiationLevel(b.lat, b.lon)
  const rock = getRockDensity(b.lat, b.lon)
  const elevation = getElevationDelta(b.lat, b.lon)

  const distance = heuristic(a, b)

  return distance * (
    BASE_COST +
    SLOPE_WEIGHT * (slope / 90) +
    RADIATION_WEIGHT * radiation +
    ROCK_WEIGHT * rock +
    ELEVATION_WEIGHT * (Math.abs(elevation) / 1000)
  )
}

function isBlocked(lat: number, lon: number): boolean {
  const rock = getRockDensity(lat, lon)
  return rock > 0.85 // High rock density = blocked
}

/**
 * Modified A* algorithm for Mars surface path planning
 */
export function calculateRoute(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  resolution: number = 0.001 // ~111m grid cells
): Waypoint[] {
  const openSet: Node[] = []
  const closedSet = new Set<string>()
  const route: Waypoint[] = []

  // Starting node
  const startNode: Node = {
    lat: start.lat,
    lon: start.lon,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
  }

  openSet.push(startNode)

  // Direction vectors: 8 neighbors (queen's movement)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1],
  ]

  let iterations = 0
  const maxIterations = 5000 // Prevent infinite loops

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++

    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f)
    const current = openSet.shift()!

    // Check if reached destination
    if (Math.abs(current.lat - end.lat) < resolution && Math.abs(current.lon - end.lon) < resolution) {
      // Reconstruct path
      let node: Node | undefined = current
      const path: { lat: number; lon: number; distance: number }[] = []

      while (node) {
        path.unshift({
          lat: node.lat,
          lon: node.lon,
          distance: node.g,
        })
        // @ts-ignore - parent may not exist
        node = node.parent
      }

      return path.map((p, i) => ({
        lat: p.lat,
        lon: p.lon,
        distance: i > 0 ? path[i - 1].distance +
          calculateCost({ lat: path[i - 1].lat, lon: path[i - 1].lon }, p) : p.distance,
      }))
    }

    const nodeKey = `${current.lat},${current.lon}`
    closedSet.add(nodeKey)

    // Explore neighbors
    for (const [dLat, dLon] of directions) {
      const neighborLat = current.lat + dLat * resolution
      const neighborLon = current.lon + dLon * resolution
      const neighborKey = `${neighborLat},${neighborLon}`

      if (closedSet.has(neighborKey)) continue
      if (isBlocked(neighborLat, neighborLon)) continue

      const neighbor: Node = {
        lat: neighborLat,
        lon: neighborLon,
        g: current.g + calculateCost({ lat: current.lat, lon: current.lon }, { lat: neighborLat, lon: neighborLon }),
        h: heuristic({ lat: neighborLat, lon: neighborLon }, end),
        parent: current,
      }
      neighbor.f = neighbor.g + neighbor.h

      // Check if already in openSet with better cost
      const existingIndex = openSet.findIndex(n => n.lat === neighbor.lat && n.lon === neighbor.lon)
      if (existingIndex === -1) {
        openSet.push(neighbor)
      } else if (neighbor.f < openSet[existingIndex].f) {
        openSet[existingIndex] = neighbor
      }
    }
  }

  // Return empty array if no path found
  return route
}

/**
 * Calculate total distance of a route in meters
 */
export function calculateTotalDistance(route: Waypoint[]): number {
  let total = 0
  for (let i = 1; i < route.length; i++) {
    const dLat = (route[i].lat - route[i - 1].lat) * 111000
    const dLon = (route[i].lon - route[i - 1].lon) * 111000 * Math.cos(route[i - 1].lat * Math.PI / 180)
    total += Math.sqrt(dLat * dLat + dLon * dLon)
  }
  return total
}