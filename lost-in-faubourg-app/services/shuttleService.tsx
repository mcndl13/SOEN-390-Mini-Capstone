import { Alert } from 'react-native';

// Types for the shuttle data structure
export interface ShuttlePoint {
  ID: string;
  Latitude: number;
  Longitude: number;
  IconImage: string;
}

export interface ShuttleData {
  buses: ShuttlePoint[];
  stations: ShuttlePoint[];
  centerPoint: {
    Latitude: number;
    Longitude: number;
  };
}

// Constants
const BASE_URL = 'https://shuttle.concordia.ca/concordiabusmap';
const MAP_URL = `${BASE_URL}/Map.aspx`;
const API_URL = `${BASE_URL}/WebService/GService.asmx/GetGoogleObject`;

/**
 * Fetches the current positions of Concordia shuttle buses
 * @param {number} refreshInterval - Refresh interval in milliseconds (default: 15000ms)
 * @returns {Promise<ShuttleData>} - Promise resolving to shuttle data
 */
export const fetchShuttlePositions = async (): Promise<ShuttleData> => {
  try {
    // Step 1: Get session cookies
    const sessionResponse = await fetch(MAP_URL, {
      method: 'GET',
      headers: {
        'Host': 'shuttle.concordia.ca',
      },
    });

    if (!sessionResponse.ok) {
      throw new Error(`Failed to get session: ${sessionResponse.status}`);
    }
    
    // Step 2: Fetch the shuttle positions
    const dataResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Host': 'shuttle.concordia.ca',
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': '0',
      },
      body: '',
    });

    if (!dataResponse.ok) {
      throw new Error(`Failed to fetch shuttle data: ${dataResponse.status}`);
    }

    const jsonData = await dataResponse.json();
    
    // Process the response to extract relevant information
    return processShuttleData(jsonData);
  } catch (error) {
    console.error('Error fetching shuttle positions:', error);
    Alert.alert('Error', 'Failed to fetch shuttle positions. Please try again later.');
    // Return empty data structure on error
    return {
      buses: [],
      stations: [],
      centerPoint: {
        Latitude: 45.48469766613475,
        Longitude: -73.6083984375,
      }
    };
  }
};

/**
 * Process the raw API response into a more usable format
 * @param {any} data - Raw API response
 * @returns {ShuttleData} - Processed shuttle data
 */
const processShuttleData = (data: any): ShuttleData => {
  // Extract the Points array from the response
  const points = data.d?.Points || [];
  
  // Filter the points to separate buses and stations
  const buses = points.filter((point: ShuttlePoint) => 
    point.ID.startsWith('BUS')
  );
  
  const stations = points.filter((point: ShuttlePoint) => 
    point.ID.startsWith('GP')
  );
  
  // Get the center point
  const centerPoint = data.d?.CenterPoint || {
    Latitude: 45.48469766613475,
    Longitude: -73.6083984375,
  };
  
  return {
    buses,
    stations,
    centerPoint,
  };
};

/**
 * Sets up a periodic fetch of shuttle positions
 * @param {(data: ShuttleData) => void} callback - Function to call with updated data
 * @param {number} interval - Time in milliseconds between updates (default: 15000ms)
 * @returns {() => void} - Function to call to stop the periodic updates
 */
export const startShuttleTracking = (
  callback: (data: ShuttleData) => void,
  interval = 15000
): (() => void) => {
  // Fetch immediately
  fetchShuttlePositions().then(callback);
  
  // Then set up interval
  const timerId = setInterval(async () => {
    const data = await fetchShuttlePositions();
    callback(data);
  }, interval);
  
  // Return function to cancel the interval
  return () => clearInterval(timerId);
};