// services/mapService.ts
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { isUserInBuilding } from '../utils/geometry';

// Coordinates interface
export interface Coordinates {
  latitude: number;
  longitude: number;
  name?: string;
}

// Campus coordinates
export const SGW_COORDS: Coordinates = { latitude: 45.4953534, longitude: -73.578549 };
export const LOYOLA_COORDS: Coordinates = { latitude: 45.4582, longitude: -73.6405 };

// Default map region near SGW
export const INITIAL_POSITION = {
  latitude: 45.4953534,
  longitude: -73.578549,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02 * (Dimensions.get('window').width / Dimensions.get('window').height),
};

import { Dimensions } from 'react-native';

class MapService {
  private static instance: MapService;
  private userLocation: Coordinates | null = null;
  
  // Private constructor to enforce singleton pattern
  private constructor() {}
  
  // Get the singleton instance
  public static getInstance(): MapService {
    if (!MapService.instance) {
      MapService.instance = new MapService();
    }
    return MapService.instance;
  }
  
  // Request location permissions and get current location
  public async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }
  
  // Get current location
  public async getCurrentLocation(): Promise<Coordinates | null> {
    try {
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) {
        console.log('Permission to access location was denied');
        return null;
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({});
      const coords = currentLocation.coords;
      this.userLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      return this.userLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }
  
  // Get cached user location
  public getUserLocation(): Coordinates | null {
    return this.userLocation;
  }
  
  // Set user location
  public setUserLocation(location: Coordinates | null): void {
    this.userLocation = location;
  }
  
  // Check if user is in a building
  public checkUserInBuilding(location: Coordinates | null = this.userLocation): Coordinates | null {
    if (!location) return null;
    return isUserInBuilding(location);
  }
  
  // Snap to nearest building
  public snapToNearestBuilding(point: Coordinates): Coordinates {
    return this.checkUserInBuilding(point) || point;
  }
  
  // Calculate distance between two points
  public distanceBetween(point1: Coordinates, point2: Coordinates): number {
    if (!point1 || !point2) return 9999;

    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(point2.latitude - point1.latitude);
    const dLon = this.deg2rad(point2.longitude - point1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(point1.latitude)) * Math.cos(this.deg2rad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }
  
  // Convert degrees to radians
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  // Fetch directions from Google Maps API
  public async fetchDirections(
    origin: Coordinates | null,
    destination: Coordinates | null,
    mode: string
  ): Promise<any> {
    try {
      if (!origin || !destination) return null;
      
      const url =
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.latitude},${origin.longitude}&` +
        `destination=${destination.latitude},${destination.longitude}&` +
        `mode=${mode.toLowerCase()}&` +
        `key=${GOOGLE_MAPS_API_KEY}`;

      const res = await fetch(url);
      if (!process.env.JEST_WORKER_ID) {
        console.log('Response status:', res.status);
      }
      
      return await res.json();
    } catch (err) {
      console.error('Directions fetch error', err);
      return null;
    }
  }
  
  // Check if shuttle route is applicable
  public isShuttleRouteApplicable(origin: Coordinates | null, destination: Coordinates | null): boolean {
    if (!origin || !destination) return false;
    
    // Check if origin or destination is near either campus
    const isOriginNearSGW = this.distanceBetween(origin, SGW_COORDS) < 0.5; // 500m radius
    const isOriginNearLoyola = this.distanceBetween(origin, LOYOLA_COORDS) < 0.5;
    const isDestNearSGW = this.distanceBetween(destination, SGW_COORDS) < 0.5;
    const isDestNearLoyola = this.distanceBetween(destination, LOYOLA_COORDS) < 0.5;
    
    // Shuttle is applicable if route is between campuses
    return (isOriginNearSGW && isDestNearLoyola) || (isOriginNearLoyola && isDestNearSGW);
  }
  
  // Format location name
  public formatLocationName(location: Coordinates, userLocation: Coordinates | null = this.userLocation): string {
    if (location.name) {
      return location.name;
    }
    
    // Check if it's one of the campuses
    if (Math.abs(location.latitude - SGW_COORDS.latitude) < 0.001 && 
        Math.abs(location.longitude - SGW_COORDS.longitude) < 0.001) {
      return "SGW Campus";
    }
    
    if (Math.abs(location.latitude - LOYOLA_COORDS.latitude) < 0.001 && 
        Math.abs(location.longitude - LOYOLA_COORDS.longitude) < 0.001) {
      return "Loyola Campus";
    }
    
    // Check if it's the user's current location
    if (userLocation && 
        Math.abs(location.latitude - userLocation.latitude) < 0.0001 && 
        Math.abs(location.longitude - userLocation.longitude) < 0.0001) {
      return "My Current Location";
    }
    
    // Otherwise show coordinates
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }
  
  // Strip HTML from string
  public stripHtml(input: string): string {
    return input.replace(/<[^>]*>?/gm, '');
  }
}

export default MapService;
