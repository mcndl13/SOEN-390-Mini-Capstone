import axios from 'axios'
import { GOOGLE_MAPS_API_KEY } from '@env'

/**
 * Function to convert an address to latitude/longitude using Google Geocoding API.
 */
async function getCoordinates(address) {
  try {
    console.log(`Converting address to coordinates: ${address}`)

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: address,
          key: GOOGLE_MAPS_API_KEY,
        },
      },
    )

    console.log('Geocoding API Response:', response.data)

    if (
      !response.data ||
      response.data.status !== 'OK' ||
      response.data.results.length === 0
    ) {
      console.error(`Geocoding failed for address: ${address}`, response.data)
      return null
    }

    const coordinates = response.data.results[0].geometry.location
    console.log(`Coordinates for ${address}:`, coordinates)
    return coordinates
  } catch (error) {
    console.error(
      'Error fetching coordinates:',
      error.response?.data || error.message,
    )
    return null
  }
}

/**
 * Function to get directions using Google Directions API.
 */
console.log('API Key available:', !!GOOGLE_MAPS_API_KEY);

// Inside navigationService.js
export async function getDirections(startCoords, endCoords, mode = 'walking') {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    console.log('Making directions request with:', {
      startCoords,
      endCoords,
      mode
    });

    const url = `https://maps.googleapis.com/maps/api/directions/json`;
    const params = {
      origin: `${startCoords.latitude},${startCoords.longitude}`,
      destination: `${endCoords.latitude},${endCoords.longitude}`,
      mode: mode,
      key: GOOGLE_MAPS_API_KEY,
    };

    console.log('Request URL:', url);
    console.log('Request Params:', params);

    const response = await axios.get(url, { 
      params,
      timeout: 10000 
    });

    console.log('Raw API Response:', response.data);

    if (response.data.status !== 'OK') {
      throw new Error(`API returned status: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];
    const path = decodePolyline(route.overview_polyline.points);

    console.log('Processed route:', {
      points: path.length,
      duration: leg.duration.text,
      distance: leg.distance.text
    });

    return {
      path: path,
      duration: Math.ceil(leg.duration.value / 60)
    };

  } catch (error) {
    console.error('Directions API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}

function decodePolyline(encoded) {
  if (!encoded) {
    console.error('No polyline to decode');
    return [];
  }

  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return poly;
}