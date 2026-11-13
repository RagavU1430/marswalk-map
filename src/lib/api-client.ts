/**
 * NASA Data API Client
 *
 * Provides access to:
 * - Cesium Ion Mars datasets
 * - NASA Earthdata (THEMIS, CRISM)
 * - JPL/GSFC Mars Science Laboratory data
 * - MAVEN radiation data
 */

import { QueryClient, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient()

export const NASA_API_BASE = 'https://api.spaceappschallenge.org/graphql'
export const EARTHDATA_BASE = 'https://earthdata.nasa.gov/api'
export const USGS_API_BASE = 'https://PlanetaryAtlas.usgs.gov/api'

// Cesium Ion Mars dataset IDs
export const MARS_DATASETS = {
  TERRAIN: 'mars-terrain-30m', // 30m DEM
  CTX: 'mars-ctx-6m', // Context imagery
  HiRISE: 'mars-hi-rise-30cm', // HiRISE tiles
  Viking: 'mars-viking-orbital', // Global mosaic
}

// Landing sites for Mars missions
export const MARS_LANDING_SITES = [
  {
    id: 'jezero',
    name: 'Jezero Crater',
    lat: 18.3905,
    lon: -77.5306,
    mission: 'Perseverance',
    description: 'Waterside crater with delta deposits',
  },
  {
    id: 'gusev',
    name: 'Gusev Crater',
    lat: -14.8833,
    lon: 175.45,
    mission: 'Spirit',
    description: 'Volcanic plains, past lava flows',
  },
  {
    id: 'meridiani',
    name: 'Meridiani Planum',
    lat: -4.5333,
    lon: 139.3667,
    mission: 'Opportunity',
    description: 'Hematite-rich region, hematite spherules',
  },
  {
    id: 'gale',
    name: 'Gale Crater',
    lat: -4.5,
    lon: 137.4167,
    mission: 'Curiosity',
    description: 'Mount Sharp, ancient lake deposits',
  },
] as const

export type MarsLandingSite = typeof MARS_LANDING_SITES[number]['id']

/**
 * Fetch Mars terrain data from Cesium Ion
 */
export async function fetchMarsTerrain(
  siteId: MarsLandingSite,
  token: string
): Promise<{ baseUrl: string; headers: Record<string, string> }> {
  const site = MARS_LANDING_SITES.find(s => s.id === siteId)
  if (!site) throw new Error('Invalid site ID')

  return {
    baseUrl: `https://assets.ion.com/api/v1/tilesets/mars-terrain/${siteId}`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.ogc.coverage+json',
    },
  }
}

/**
 * Fetch Mars imagery tiles
 */
export async function fetchMarsImagery(
  z: number,
  x: number,
  y: number,
  dataset: keyof typeof MARS_DATASETS,
  token: string
): Promise<string> {
  const datasetId = MARS_DATASETS[dataset]
  return `https://assets.ion.com/api/v1/tilesets/assets/${datasetId}/items/1/0/${z}/${x}/${y}/image?access_token=${token}`
}

/**
 * Fetch THEMIS thermal infrared data
 */
export async function fetchThemisData(
  lat: number,
  lon: number,
  day: boolean = true
): Promise<{ temperature: number; confidence: number }> {
  // Mock - would call NASA Earthdata API
  const baseTemp = 220 // Kelvin - typical Mars surface temp
  const variation = Math.sin((lat + lon) * 0.01) * 10
  return {
    temperature: baseTemp + variation,
    confidence: 0.95,
  }
}

/**
 * Fetch CRISM mineral map data
 */
export async function fetchCrismData(
  lat: number,
  lon: number
): Promise<{ minerals: string[]; concentration: number }> {
  // Mock - would call CRISM data API
  return {
    minerals: ['iron-magnesium clays', 'sulfates'],
    concentration: Math.abs(Math.sin(lat * lon * 0.001)) + 0.5,
  }
}

/**
 * Fetch radiation hazard data from MAVEN/EPM
 */
export async function fetchRadiationData(
  lat: number,
  lon: number,
  solarCyclePhase: 'minimum' | 'maximum' = 'maximum'
): Promise<{ doseRate: number; solarParticleEvents: number }> {
  // Simplified model based on MAVEN observations
  const baseDose = solarCyclePhase === 'minimum' ? 0.1 : 0.3 // mSv/day
  const latFactor = Math.cos(lat * Math.PI / 180)
  return {
    doseRate: baseDose * (1 + latFactor * 0.5),
    solarParticleEvents: solarCyclePhase === 'maximum' ? 3 : 1,
  }
}

/**
 * Fetch rover traverse track data
 */
export async function fetchRoverTracks(
  rover: 'curiosity' | 'perseverance' | 'opportunity' | 'spirit'
): Promise<Array<{ lat: number; lon: number; timestamp: string; activity: string }>> {
  // Mock data - real implementation would fetch from:
  // https://mars.nasa.gov/msl/mission/traverse/
  // https://mars.nasa.gov/msl/mission/traverse/
  return [
    { lat: 18.3905, lon: -77.5306, timestamp: '2021-02-18', activity: 'landing' },
    { lat: 18.45, lon: -77.6, timestamp: '2021-03-01', activity: 'drive' },
    { lat: 18.5, lon: -77.7, timestamp: '2021-04-15', activity: 'science' },
  ]
}

/**
 * Get scientific points of interest for a region
 */
export async function fetchScientificPois(
  center: { lat: number; lon: number },
  radiusKm: number = 50
): Promise<Array<{
  name: string
  type: 'geology' | 'chemistry' | 'geophysics'
  lat: number
  lon: number
  description: string
  dataSources: string[]
}>> {
  const pois = [
    {
      name: 'Mount Sharp (Aeolis Mons)',
      type: 'geology' as const,
      lat: 18.2,
      lon: -77.5,
      description: 'Layered sedimentary mountain, evidence of ancient lake',
      dataSources: ['CRISM', 'HiRISE', 'Rover traverses'],
    },
    {
      name: 'Boxwork Formations',
      type: 'geology' as const,
      lat: -4.5,
      lon: 137.5,
      description: 'Sulfate-rich rock formations studied by Curiosity',
      dataSources: ['CRISM', 'ChemCam', 'APXS'],
    },
  ]

  return pois.filter(poi => {
    const dLat = poi.lat - center.lat
    const dLon = poi.lon - center.lon
    const distance = Math.sqrt(dLat * dLat + dLon * dLon) * 111
    return distance <= radiusKm
  })
}

// React Query hooks for data fetching
export const useMarsTerrain = (siteId: MarsLandingSite, token: string) => {
  return useQuery({
    queryKey: ['mars-terrain', siteId],
    queryFn: () => fetchMarsTerrain(siteId, token),
    enabled: !!token,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

export const useRadiationData = (lat: number, lon: number) => {
  return useQuery({
    queryKey: ['radiation', lat, lon],
    queryFn: () => fetchRadiationData(lat, lon),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}