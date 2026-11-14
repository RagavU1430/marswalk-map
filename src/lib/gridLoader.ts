/**
 * Marswalk Map - Grid Data Loader
 * Loads and provides access to the precomputed Jezero Crater grid data
 * for fast A* pathfinding with hazard avoidance.
 */

import { HazardZone } from '@/data/jezeroData'

export interface GridMetadata {
  bounds: {
    min_lat: number
    max_lat: number
    min_lon: number
    max_lon: number
  }
  cell_size_m: number
  rows: number
  cols: number
  lat_per_cell: number
  lon_per_cell: number
}

export interface GridLayers {
  elevation: number[][]
  slope: number[][]
  surface_risk: number[][]
  radiation: number[][]
  cost: number[][]
  blocked: number[][]
  hazard_type: number[][]
}

export interface HazardLegendEntry {
  id: number
  name: string
  type: string
  risk: string
  costMult: number
}

export interface GridData {
  metadata: GridMetadata
  layers: GridLayers
  hazard_legend: HazardLegendEntry[]
  cost_weights: {
    slope: number
    surface_risk: number
    radiation: number
  }
}

export interface GridPointHazard {
  elevation: number
  slope: number
  surfaceRisk: number
  radiation: number
  cost: number
  blocked: boolean
  hazardType: number
  hazardName: string
  hazardRisk: string
}

class GridLoader {
  private gridData: GridData | null = null
  private loadingPromise: Promise<GridData> | null = null

  /**
   * Load the grid data from the public folder
   */
  async loadGrid(): Promise<GridData> {
    if (this.gridData) {
      return this.gridData
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = this.fetchGrid()
    this.gridData = await this.loadingPromise
    return this.gridData
  }

  private async fetchGrid(): Promise<GridData> {
    try {
      const response = await fetch('/data/mars_grid.json')
      if (!response.ok) {
        throw new Error(`Failed to load grid: ${response.status}`)
      }
      const data = await response.json()
      console.log(`✅ Grid loaded: ${data.metadata.rows}x${data.metadata.cols} cells at ${data.metadata.cell_size_m}m resolution`)
      return data
    } catch (error) {
      console.error('❌ Failed to load grid data:', error)
      throw error
    }
  }

  /**
   * Convert lat/lon to grid coordinates
   */
  latLonToGrid(lat: number, lon: number, grid: GridMetadata): { row: number; col: number } {
    const latNorm = (lat - grid.bounds.min_lat) / (grid.bounds.max_lat - grid.bounds.min_lat)
    const lonNorm = (lon - grid.bounds.min_lon) / (grid.bounds.max_lon - grid.bounds.min_lon)

    const row = Math.max(0, Math.min(grid.rows - 1, Math.floor((1 - latNorm) * (grid.rows - 1))))
    const col = Math.max(0, Math.min(grid.cols - 1, Math.floor(lonNorm * (grid.cols - 1))))

    return { row, col }
  }

  /**
   * Convert grid coordinates to lat/lon
   */
  gridToLatLon(row: number, col: number, grid: GridMetadata): { lat: number; lon: number } {
    const latNorm = 1 - (row / (grid.rows - 1))
    const lonNorm = col / (grid.cols - 1)

    const lat = grid.bounds.min_lat + latNorm * (grid.bounds.max_lat - grid.bounds.min_lat)
    const lon = grid.bounds.min_lon + lonNorm * (grid.bounds.max_lon - grid.bounds.min_lon)

    return { lat, lon }
  }

  /**
   * Get hazard data at a specific lat/lon
   */
  async getHazardAt(lat: number, lon: number): Promise<GridPointHazard> {
    const grid = await this.loadGrid()
    const { row, col } = this.latLonToGrid(lat, lon, grid.metadata)
    const layers = grid.layers
    const hazardType = layers.hazard_type[row][col]
    const legend = grid.hazard_legend.find(h => h.id === hazardType) || grid.hazard_legend[0]

    return {
      elevation: layers.elevation[row][col],
      slope: layers.slope[row][col],
      surfaceRisk: layers.surface_risk[row][col],
      radiation: layers.radiation[row][col],
      cost: layers.cost[row][col],
      blocked: layers.blocked[row][col] === 1,
      hazardType,
      hazardName: legend.name,
      hazardRisk: legend.risk,
    }
  }

  /**
   * Get hazard data at grid coordinates
   */
  async getHazardAtGrid(row: number, col: number): Promise<GridPointHazard> {
    const grid = await this.loadGrid()
    const layers = grid.layers
    const hazardType = layers.hazard_type[row][col]
    const legend = grid.hazard_legend.find(h => h.id === hazardType) || grid.hazard_legend[0]

    return {
      elevation: layers.elevation[row][col],
      slope: layers.slope[row][col],
      surfaceRisk: layers.surface_risk[row][col],
      radiation: layers.radiation[row][col],
      cost: layers.cost[row][col],
      blocked: layers.blocked[row][col] === 1,
      hazardType,
      hazardName: legend.name,
      hazardRisk: legend.risk,
    }
  }

  /**
   * Check if a grid cell is blocked (impassable)
   */
  async isBlocked(row: number, col: number): Promise<boolean> {
    const grid = await this.loadGrid()
    return grid.layers.blocked[row][col] === 1
  }

  /**
   * Get the cost of moving into a grid cell
   */
  async getCellCost(row: number, col: number): Promise<number> {
    const grid = await this.loadGrid()
    return grid.layers.cost[row][col]
  }

  /**
   * Get all neighbors of a grid cell (8-connected)
   */
  getNeighbors(row: number, col: number, maxRows: number, maxCols: number): { row: number; col: number }[] {
    const neighbors: { row: number; col: number }[] = []
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ]

    for (const [dr, dc] of directions) {
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < maxRows && nc >= 0 && nc < maxCols) {
        neighbors.push({ row: nr, col: nc })
      }
    }
    return neighbors
  }

  /**
   * Heuristic for A* (Euclidean distance in grid cells)
   */
  heuristic(a: { row: number; col: number }, b: { row: number; col: number }): number {
    const dr = a.row - b.row
    const dc = a.col - b.col
    return Math.sqrt(dr * dr + dc * dc)
  }

  /**
   * Find path using A* on the grid
   */
  async findPath(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Promise<{ lat: number; lon: number; cost: number }[]> {
    const grid = await this.loadGrid()
    const { row: startRow, col: startCol } = this.latLonToGrid(startLat, startLon, grid.metadata)
    const { row: endRow, col: endCol } = this.latLonToGrid(endLat, endLon, grid.metadata)

    const maxRows = grid.metadata.rows
    const maxCols = grid.metadata.cols

    // A* algorithm
    interface GridNode {
      row: number
      col: number
      f: number
      g: number
      parent: GridNode | null
    }
    const openSet: GridNode[] = []
    const closedSet = new Set<string>()

    const startKey = `${startRow},${startCol}`
    const endKey = `${endRow},${endCol}`

    openSet.push({
      row: startRow,
      col: startCol,
      f: this.heuristic({ row: startRow, col: startCol }, { row: endRow, col: endCol }),
      g: 0,
      parent: null
    })

    const maxIterations = 50000
    let iterations = 0

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++

      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      const currentKey = `${current.row},${current.col}`
      if (currentKey === endKey) {
        // Reconstruct path
        const path: { lat: number; lon: number; cost: number }[] = []
        let node: GridNode | null = current
        
        const pathCoords: { row: number; col: number }[] = []
        while (node) {
          pathCoords.unshift({ row: node.row, col: node.col })
          node = node.parent
        }

        // Convert to lat/lon with costs
        for (let i = 0; i < pathCoords.length; i++) {
          const { row, col } = pathCoords[i]
          const { lat, lon } = this.gridToLatLon(row, col, grid.metadata)
          const hazard = await this.getHazardAtGrid(row, col)
          
          let cost = 0
          if (i > 0) {
            const prev = pathCoords[i - 1]
            const dist = Math.sqrt(
              Math.pow(pathCoords[i].row - prev.row, 2) + 
              Math.pow(pathCoords[i].col - prev.col, 2)
            ) * grid.metadata.cell_size_m
            cost = dist * hazard.cost
          }

          path.push({ lat, lon, cost })
        }

        return path
      }

      closedSet.add(currentKey)

      // Explore neighbors
      for (const neighbor of this.getNeighbors(current.row, current.col, maxRows, maxCols)) {
        const neighborKey = `${neighbor.row},${neighbor.col}`
        
        if (closedSet.has(neighborKey)) continue
        if (await this.isBlocked(neighbor.row, neighbor.col)) continue

        const moveCost = await this.getCellCost(neighbor.row, neighbor.col)
        const g = current.g + moveCost
        const h = this.heuristic(neighbor, { row: endRow, col: endCol })
        const f = g + h

        // Check if already in open set with better cost
        const existingIndex = openSet.findIndex(n => n.row === neighbor.row && n.col === neighbor.col)
        if (existingIndex === -1) {
          openSet.push({
            row: neighbor.row,
            col: neighbor.col,
            f,
            g,
            parent: current
          })
        } else if (f < openSet[existingIndex].f) {
          openSet[existingIndex] = {
            row: neighbor.row,
            col: neighbor.col,
            f,
            g,
            parent: current
          }
        }
      }
    }

    // No path found
    return []
  }

  /**
   * Get grid metadata
   */
  async getMetadata(): Promise<GridMetadata> {
    const grid = await this.loadGrid()
    return grid.metadata
  }
}

// Export singleton instance
export const gridLoader = new GridLoader()

// Convenience functions
export async function getGridHazard(lat: number, lon: number): Promise<GridPointHazard> {
  return gridLoader.getHazardAt(lat, lon)
}

export async function findGridPath(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<{ lat: number; lon: number; cost: number }[]> {
  return gridLoader.findPath(startLat, startLon, endLat, endLon)
}