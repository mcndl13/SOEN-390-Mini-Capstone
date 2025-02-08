/**
 * Calculates the bounding box for a polygon.
 * @param {Array} polygon - Array of points, each with `latitude` and `longitude`.
 * @returns {Object} The bounding box { minLat, maxLat, minLng, maxLng }.
 */
function getBoundingBox(polygon) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    polygon.forEach(point => {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    });
    return { minLat, maxLat, minLng, maxLng };
}
  
/**
 * Returns true if the given point is inside the polygon using the ray-casting algorithm.
 * This function first checks a bounding box for a quick exclusion.
 * @param {Object} point - An object with `latitude` and `longitude`.
 * @param {Array} polygon - An array of objects with `latitude` and `longitude`.
 * @returns {boolean} True if the point is inside the polygon.
 */
function isPointInPolygon(point, polygon) {
    // Quick bounding box check
    const { minLat, maxLat, minLng, maxLng } = getBoundingBox(polygon);
    if (
        point.latitude < minLat ||
        point.latitude > maxLat ||
        point.longitude < minLng ||
        point.longitude > maxLng
    ) {
        return false;
    }

    // Ray-casting algorithm
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].latitude, yi = polygon[i].longitude;
        const xj = polygon[j].latitude, yj = polygon[j].longitude;
        const intersect =
        ((yi > point.longitude) !== (yj > point.longitude)) &&
        (point.latitude < (xj - xi) * (point.longitude - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
  
/**
 * Returns the polygon that contains the given point.
 * If the point is not inside any polygon, returns null.
 * @param {Object} point - An object with `latitude` and `longitude`.
 * @param {Array} polygons - Array of polygon objects (each with `name` and `boundaries`).
 */
export function isUserInBuilding(point, polygons) {
    for (const buildingPolygon of polygons) {
      if (isPointInPolygon(point, buildingPolygon.boundaries)) {
        return buildingPolygon.address; //Assuming the address is stored in the buildingPolygon object
      }
    }
    return null;
}