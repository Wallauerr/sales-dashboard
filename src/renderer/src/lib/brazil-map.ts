import { canonicalState } from '../../../shared/states'
import brazilGeoJson from '../assets/brazil-ufs.json'

type Position = [number, number]
type Ring = Position[]
type Polygon = Ring[]
type MultiPolygon = Polygon[]

interface StateFeature {
  properties: {
    sigla: string
    centroid: Position
  }
  geometry:
    | { type: 'Polygon'; coordinates: Polygon }
    | { type: 'MultiPolygon'; coordinates: MultiPolygon }
}

interface StateCollection {
  features: StateFeature[]
}

export interface MapPoint {
  x: number
  y: number
}

export interface MapState {
  uf: string
  centroid: MapPoint
  polygons: MapPoint[][][]
}

export interface StateValue {
  state: string
  value: number
  share: number
}

export interface StateBubble extends MapPoint {
  uf: string
  value: number
  share: number
}

const collection = brazilGeoJson as unknown as StateCollection
const meanLatitude =
  collection.features.reduce(
    (total, feature) => total + feature.properties.centroid[1],
    0,
  ) / collection.features.length
const longitudeScale = Math.cos((meanLatitude * Math.PI) / 180)

function project([longitude, latitude]: Position): MapPoint {
  return { x: longitude * longitudeScale, y: latitude }
}

function polygonsOf(feature: StateFeature): Polygon[] {
  return feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates
}

export const MAP_STATES: MapState[] = collection.features.map(feature => ({
  uf: feature.properties.sigla,
  centroid: project(feature.properties.centroid),
  polygons: polygonsOf(feature).map(polygon =>
    polygon.map(ring => ring.map(project)),
  ),
}))

const centroids = Object.fromEntries(
  MAP_STATES.map(state => [state.uf, state.centroid]),
) as Record<string, MapPoint | undefined>

const points = MAP_STATES.flatMap(state =>
  state.polygons.flatMap(polygon => polygon.flat()),
)

export const BRAZIL_BOUNDS = {
  minX: Math.min(...points.map(point => point.x)),
  maxX: Math.max(...points.map(point => point.x)),
  minY: Math.min(...points.map(point => point.y)),
  maxY: Math.max(...points.map(point => point.y)),
}

export function stateBubbles(rows: StateValue[]): StateBubble[] {
  return rows.flatMap(row => {
    const uf = canonicalState(row.state)
    const centroid = centroids[uf]
    if (!centroid || row.value <= 0) return []
    return [{ uf, value: row.value, share: row.share, ...centroid }]
  })
}

export function unmappedStateValue(rows: StateValue[]): number {
  return rows.reduce(
    (total, row) =>
      centroids[canonicalState(row.state)] ? total : total + row.value,
    0,
  )
}
