import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';

const getPlaceID = async (
  latitude: number,
  longitude: number,
): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      {
        params: {
          location: `${latitude},${longitude}`,
          radius: 100,
          type: 'university',
          key: GOOGLE_MAPS_API_KEY,
        },
      },
    );

    const place = response.data.results[0];
    return place ? place.place_id : null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching Place ID:', error);
    }
    return null;
  }
};

const getOpeningHours = async (
  latitude: number,
  longitude: number,
): Promise<string | null> => {
  try {
    const placeId = await getPlaceID(latitude, longitude);
    if (!placeId) {
      console.warn('No Place ID found for the given location.');
      return 'No hours available';
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id: placeId,
          fields: 'current_opening_hours',
          key: GOOGLE_MAPS_API_KEY,
        },
      },
    );

    return (
      response.data.result?.current_opening_hours?.weekday_text?.join('\n') ||
      'No hours available'
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching opening hours:', error);
    }
    return 'Error fetching hours';
  }
};

export { getPlaceID, getOpeningHours };
