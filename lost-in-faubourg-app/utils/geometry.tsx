import { polygons } from '../components/polygonCoordinates'

interface Coordinate {
  latitude: number
  longitude: number
}

interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

interface BuildingPolygon {
  boundaries: Coordinate[]
}

/**
 * Calculates the bounding box for a polygon.
 * @param {Coordinate[]} polygon - Array of points, each with `latitude` and `longitude`.
 * @returns {BoundingBox} The bounding box { minLat, maxLat, minLng, maxLng }.
 */
function getBoundingBox(polygon: Coordinate[]): BoundingBox {
  let minLat = Infinity,
    maxLat = -Infinity
  let minLng = Infinity,
    maxLng = -Infinity

  polygon.forEach((point) => {
    if (point.latitude < minLat) minLat = point.latitude
    if (point.latitude > maxLat) maxLat = point.latitude
    if (point.longitude < minLng) minLng = point.longitude
    if (point.longitude > maxLng) maxLng = point.longitude
  })

  return { minLat, maxLat, minLng, maxLng }
}

/**
 * Returns true if the given point is inside the polygon using the ray-casting algorithm.
 * This function first checks a bounding box for a quick exclusion.
 * @param {Coordinate} point - An object with `latitude` and `longitude`.
 * @param {Coordinate[]} polygon - An array of objects with `latitude` and `longitude`.
 * @returns {boolean} True if the point is inside the polygon.
 */
function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  // Quick bounding box check
  const { minLat, maxLat, minLng, maxLng } = getBoundingBox(polygon)
  if (
    point.latitude < minLat ||
    point.latitude > maxLat ||
    point.longitude < minLng ||
    point.longitude > maxLng
  ) {
    return false
  }

  // Ray-casting algorithm
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude,
      yi = polygon[i].longitude
    const xj = polygon[j].latitude,
      yj = polygon[j].longitude
    const intersect =
      yi > point.longitude !== yj > point.longitude &&
      point.latitude < ((xj - xi) * (point.longitude - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Returns the polygon that contains the given point.
 * If the point is not inside any polygon, returns null.
 * @param {Coordinate} point - An object with `latitude` and `longitude`.
 * @returns {Coordinate | null} The center of the polygon containing the point, or null if none found.
 */
export function isUserInBuilding(point: Coordinate): Coordinate | null {
  for (const buildingPolygon of polygons as BuildingPolygon[]) {
    if (isPointInPolygon(point, buildingPolygon.boundaries)) {
      return getPolygonCenter(buildingPolygon.boundaries)
    }
  }
  return null
}

/**
 * Calculates the center of a polygon given its boundary coordinates.
 * @param {Coordinate[]} boundaries - An array of coordinate objects (each with `latitude` and `longitude`).
 * @returns {Coordinate} An object containing the average `latitude` and `longitude` of the polygon.
 */
export const getPolygonCenter = (boundaries: Coordinate[]): Coordinate => {
  let latSum = 0,
    lonSum = 0
  boundaries.forEach((coord) => {
    latSum += coord.latitude
    lonSum += coord.longitude
  })
  return {
    latitude: latSum / boundaries.length,
    longitude: lonSum / boundaries.length,
  }
}
