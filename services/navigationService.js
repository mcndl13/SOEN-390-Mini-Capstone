import axios from 'axios';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDfv2-YoXgh3gE2ck-LhfNj9njU8Hj9LxU';

/**
 * Function to convert an address to latitude/longitude using Google Geocoding API.
 */
async function getCoordinates(address) {
  try {
    console.log(`Converting address to coordinates: ${address}`);

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: address,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    console.log("Geocoding API Response:", response.data);

    if (!response.data || response.data.status !== 'OK' || response.data.results.length === 0) {
      console.error(`Geocoding failed for address: ${address}`, response.data);
      return null;
    }

    const coordinates = response.data.results[0].geometry.location;
    console.log(`Coordinates for ${address}:`, coordinates);
    return coordinates;
  } catch (error) {
    console.error('Error fetching coordinates:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Function to get directions using Google Directions API.
 */
export async function getDirections(start, destination, mode) {
  try {
    const startCoords = typeof start === 'string' ? await getCoordinates(start) : start;
    const destinationCoords = typeof destination === 'string' ? await getCoordinates(destination) : destination;

    if (!startCoords || !destinationCoords) {
      console.error('Invalid start or destination location.');
      return null;
    }

    console.log("Calling Google Directions API...");
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json`,
      {
        params: {
          origin: `${startCoords.lat},${startCoords.lng}`,
          destination: `${destinationCoords.lat},${destinationCoords.lng}`,
          mode: mode,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    console.log("Google API Response:", response.data);

    if (!response.data || response.data.status !== 'OK' || response.data.routes.length === 0) {
      console.error('No routes found:', response.data);
      return null;
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    if (!leg) {
      console.error('No legs found in the route:', route);
      return null;
    }

    // Extract full polyline
    const polyline = decodePolyline(route.overview_polyline.points);

    return {
      startLocation: startCoords,
      endLocation: destinationCoords,
      path: polyline,
      duration: leg.duration.text, // ✅ Estimated arrival time
    };
  } catch (error) {
    console.error('Error fetching directions:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Decodes a Google Maps polyline string into latitude/longitude coordinates.
 */
function decodePolyline(encoded) {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng; 

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}
