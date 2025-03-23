import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  PanResponder,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_DEFAULT, MapStyleElement } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import MapViewDirections, {
  MapViewDirectionsMode,
} from 'react-native-maps-directions';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import 'react-native-get-random-values';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { Ionicons } from '@expo/vector-icons';

import { AccessibilityContext } from './AccessibilitySettings';
import { polygons } from '../components/polygonCoordinates';
import {
  startShuttleTracking,
  ShuttleData,
} from '../services/shuttleService';
import { isUserInBuilding } from '../utils/geometry';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Default map region near SGW
const INITIAL_POSITION = {
  latitude: 45.4953534,
  longitude: -73.578549,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

type DirectionsParams = {
  origin?: {
    latitude: number;
    longitude: number;
  };
  destination?: {
    latitude: number;
    longitude: number;
  };
  travelMode?: MapViewDirectionsMode;
};

// Coordinates for the two campuses
const SGW_COORDS = { latitude: 45.4953534, longitude: -73.578549 };
const LOYOLA_COORDS = { latitude: 45.4582, longitude: -73.6405 };

// Reusable Input Autocomplete component
function InputAutocomplete({
  label,
  placeholder,
  onPlaceSelected,
  currentValue,
  isLargeText,
  isBlackAndWhite,
}: {
  label: string;
  placeholder: string;
  onPlaceSelected: (data: any, details: any) => void;
  currentValue?: string;
  isLargeText?: boolean;
  isBlackAndWhite?: boolean;
}) {
  // Modern styling for Google Autocomplete
  const googleAutocompleteStyles = {
    container: { flex: 0, marginBottom: 6 },
    textInputContainer: {
      width: '100%',
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      borderBottomWidth: 0,
      paddingVertical: 2,
    },
    textInput: {
      height: 40,
      color: isBlackAndWhite ? '#000000' : '#333333',
      fontSize: isLargeText ? 18 : 16,
      borderWidth: 1,
      borderColor: isBlackAndWhite ? '#000000' : '#912338',
      borderRadius: 12,
      paddingHorizontal: 12,
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    listView: {
      marginTop: 5,
      borderRadius: 8,
      overflow: 'hidden',
    },
    description: { 
      fontWeight: '500',
      color: isBlackAndWhite ? '#000000' : '#333333', 
      fontSize: isLargeText ? 16 : 14,
    },
    predefinedPlacesDescription: { 
      color: isBlackAndWhite ? '#000000' : '#912338' 
    },
    row: {
      backgroundColor: 'white',
      padding: 13,
      height: 'auto',
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={[
        styles.inputLabel, 
        isLargeText && styles.largeText,
        isBlackAndWhite && styles.blackAndWhiteText
      ]}>
        {label}
      </Text>
      {currentValue ? (
        <View style={[
          googleAutocompleteStyles.textInput, 
          { justifyContent: 'center', paddingHorizontal: 16 }
        ]}>
          <Text style={[
            { fontSize: isLargeText ? 18 : 16 },
            isBlackAndWhite && styles.blackAndWhiteText
          ]}>
            {currentValue}
          </Text>
        </View>
      ) : (
        <GooglePlacesAutocomplete
          placeholder={placeholder || 'Type here...'}
          fetchDetails={true}
          onPress={(data, details = null) => {
            onPlaceSelected && onPlaceSelected(data, details);
          }}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
            components: 'country:ca', // Limit to Canada for better results
          }}
          styles={googleAutocompleteStyles}
          textInputProps={{
            placeholderTextColor: "#999999"
          }}
          enablePoweredByContainer={false}
          minLength={2}
          debounce={300}
        />
      )}
    </View>
  );
}

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>?/gm, '');
}

export default function DirectionsScreen() {
  const { isBlackAndWhite, isLargeText } = React.useContext(AccessibilityContext);
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);
  const [destination, setDestination] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  // We still fetch userLocation if you want to show the user's position,
  // but no button for "Use My Location" (optional).
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const route = useRoute<RouteProp<Record<string, DirectionsParams>, string>>();
  const [showDirections, setShowDirections] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [steps, setSteps] = useState<{ html_instructions: string }[]>([]);
  const [showShuttleRoute, setShowShuttleRoute] = useState(false);
  
  // States for expandable directions panel
  const [expandedDirections, setExpandedDirections] = useState<boolean>(false);
  const [directionsHeight, setDirectionsHeight] = useState<number>(180);
  
  // State for route tabs
  const [activeRouteTab, setActiveRouteTab] = useState<'standard' | 'shuttle'>('standard');

  // Keep track of travel mode: DRIVING, WALKING, CYCLING, TRANSIT
  const [travelMode, setTravelMode] =
    useState<MapViewDirectionsMode>('DRIVING');

  // Shuttle states
  const [shuttleData, setShuttleData] = useState<ShuttleData | null>(null);
  const [showShuttles, setShowShuttles] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState(15); // Default zoom level
  
  // Toast message state for user feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  
  // Create an animated value for the directions panel height
  const panY = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  // Set up pan responder for swipe gestures on the handle only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // Only allow upward movement for expansion or downward for collapse
        if (gestureState.dy < 0 || (expandedDirections && gestureState.dy > 0)) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped up
        if (gestureState.dy < -20 && !expandedDirections) {
          // Expand the panel
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          setExpandedDirections(true);
          setDirectionsHeight(height * 0.7);
        } 
        // If swiped down and expanded
        else if (gestureState.dy > 20 && expandedDirections) {
          // Collapse the panel
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          setExpandedDirections(false);
          setDirectionsHeight(180);
        } 
        // Return to original position for small movements
        else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Handle navigation parameters
  useEffect(() => {
    // Animate toast message appearance
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  
    // Only proceed if we have both origin and destination in params
    if (route.params?.origin && route.params?.destination) {
      // Immediately show directions to prevent the search container from flashing
      setShowDirections(true);
      
      // Set both values after showing directions
      setOrigin(route.params.origin);
      setDestination(route.params.destination);
      
      // Set travel mode if provided in params
      if (route.params.travelMode) {
        setTravelMode(route.params.travelMode);
      }

      setExpandedDirections(true);
      setDirectionsHeight(height * 0.7);
      
      // Then use setTimeout to ensure state updates have been processed
      setTimeout(() => {
        // Now it's safe to process the route
        if (mapRef.current) {
          // Get finalized coordinates
          const finalOrigin = route.params.origin ? snapToNearestBuilding(route.params.origin) : INITIAL_POSITION;
          const finalDestination = route.params.destination ? snapToNearestBuilding(route.params.destination) : INITIAL_POSITION;
          
          // Check if shuttle route applies
          const shuttleApplicable = isShuttleRouteApplicable();
          setShowShuttleRoute(shuttleApplicable);
          
          // Fit map to show both points
          mapRef.current.fitToCoordinates([finalOrigin, finalDestination], {
            edgePadding,
            animated: true,
          });
        }
      }, 300); // Reduced timeout for better responsiveness
    } else if (route.params?.origin) {
      setOrigin(route.params.origin);
    } else if (route.params?.destination) {
      setDestination(route.params.destination);
    }
  }, [route.params]);

  // Toast message timeout effect
  useEffect(() => {
    if (toastMessage) {
      // First fade in
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Then set a timer to fade out and clear
      const timer = setTimeout(() => {
        Animated.timing(fadeInAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setToastMessage(null);
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Update tab selection when shuttle becomes available
  useEffect(() => {
    // If shuttle route becomes available, automatically select it to highlight the option
    if (showShuttleRoute) {
      setActiveRouteTab('shuttle');
    } else {
      setActiveRouteTab('standard');
    }
  }, [showShuttleRoute]);

  // Request location permission & get user location on mount (optional)
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      const coords = currentLocation.coords;
      setUserLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    })();
  }, []);

  // Initialize shuttle tracking
  useEffect(() => {
    // Start tracking the shuttles
    const stopTracking = startShuttleTracking((data) => {
      setShuttleData(data);
    }, 15000); // Update every 15 seconds

    // Cleanup function to stop tracking when component unmounts
    return () => {
      stopTracking();
    };
  }, []);

  // Helper to animate camera
  const moveTo = async (position: { latitude: number; longitude: number }) => {
    const camera = await mapRef.current?.getCamera();
    if (camera) {
      camera.center = position;
      mapRef.current?.animateCamera(camera, { duration: 1000 });
    }
  };

  // Track map zoom level changes
  const onRegionChange = (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    // Calculate approximate zoom level based on latitudeDelta
    const zoom = Math.round(Math.log(360 / region.latitudeDelta) / Math.LN2);
    setZoomLevel(zoom);
  };

  // Function to check if user is in a building and provide specific guidance
  const checkUserInBuilding = () => {
    if (!userLocation) return null;
    
    const buildingCenter = isUserInBuilding(userLocation);
    if (buildingCenter) {
      // User is in a building, we can provide specific guidance
      return buildingCenter;
    }
    return null;
  };

  // State to track whether next point should be origin or destination
  const [nextPointIsOrigin, setNextPointIsOrigin] = useState<boolean>(true);

  // Updated smart location setter with alternating logic
  const setSmartLocation = (position: { latitude: number; longitude: number }, label: string) => {
    // Snap the location to nearest building if appropriate
    const snappedPosition = snapToNearestBuilding(position);
    
    // Determine where to set the position using alternating logic
    if (nextPointIsOrigin) {
      setOrigin({...snappedPosition, name: label});
      setToastMessage(`${label} set as origin`);
      setNextPointIsOrigin(false); // Next one will be destination
    } else {
      setDestination({...snappedPosition, name: label});
      setToastMessage(`${label} set as destination`);
      setNextPointIsOrigin(true); // Next one will be origin
    }
    
    // Move the map to the location
    moveTo(snappedPosition);
  };

  // Update this to use our smart location setter
  const setCurrentLocationAsPoint = () => {
    // First check if user location is available
    if (!userLocation) {
      Alert.alert(
        "Location Not Available",
        "Please enable location services or manually set your starting point."
      );
      return;
    }
    
    // Check if user is in a building
    const buildingCenter = checkUserInBuilding();
    
    if (buildingCenter) {
      // If user is in a building, use the building center for better accuracy
      setSmartLocation(buildingCenter, "Building location");
      
      // Optionally show additional info in alert
      Alert.alert(
        "Building Detected",
        "We've detected you're inside a Concordia building and have set your point accordingly."
      );
    } else {
      // Use regular user location
      setSmartLocation(userLocation, "My Location");
    }
  };

  // Function to snap points to nearest building when appropriate
  const snapToNearestBuilding = (point: { latitude: number; longitude: number }) => {
    // This will return either the center of a building if the point is inside a building,
    // or the original point if not in any building
    return isUserInBuilding(point) || point;
  };

  // Helper function to format location names
  const formatLocationName = (location: { latitude: number; longitude: number; name?: string }) => {
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
  };
  

  interface Coordinates {
    latitude: number;
    longitude: number;
  }

  const distanceBetween = (point1: Coordinates, point2: Coordinates): number => {
    if (!point1 || !point2) return 9999;

    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(point2.latitude - point1.latitude);
    const dLon = deg2rad(point2.longitude - point1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  // Enhanced isShuttleRouteApplicable function
  const isShuttleRouteApplicable = () => {
    if (!origin || !destination) return false;
    
    // Use the snapped coordinates for better accuracy
    const finalOrigin = snapToNearestBuilding(origin);
    const finalDestination = snapToNearestBuilding(destination);
    
    // Check if origin or destination is near either campus
    const isOriginNearSGW = distanceBetween(finalOrigin, SGW_COORDS) < 0.5; // 500m radius
    const isOriginNearLoyola = distanceBetween(finalOrigin, LOYOLA_COORDS) < 0.5;
    const isDestNearSGW = distanceBetween(finalDestination, SGW_COORDS) < 0.5;
    const isDestNearLoyola = distanceBetween(finalDestination, LOYOLA_COORDS) < 0.5;
    
    // Shuttle is applicable if route is between campuses
    return (isOriginNearSGW && isDestNearLoyola) || (isOriginNearLoyola && isDestNearSGW);
  };

  // Padding around route
  const edgePaddingValue = 70;
  const edgePadding = {
    top: edgePaddingValue,
    right: edgePaddingValue,
    bottom: edgePaddingValue,
    left: edgePaddingValue,
  };

  // On route ready
  const traceRouteOnReady = (result: {
    distance: number;
    duration: number;
  }) => {
    if (result) {
      setDistance(result.distance);
      setDuration(result.duration);
      setExpandedDirections(true);
      setDirectionsHeight(height * 0.7);
    }
    fetchDetailedDirections(origin, destination, travelMode);
  };

  // Fetch step-by-step instructions separately
  const fetchDetailedDirections = async (
    orig: { latitude: number; longitude: number } | null,
    dest: { latitude: number; longitude: number } | null,
    mode: string,
  ) => {
    try {
      if (!orig || !dest) return;
      const url =
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${orig.latitude},${orig.longitude}&` +
        `destination=${dest.latitude},${dest.longitude}&` +
        `mode=${mode.toLowerCase()}&` +
        `key=${GOOGLE_MAPS_API_KEY}`;

      const res = await fetch(url);
      if (!process.env.JEST_WORKER_ID) {
        console.log('Response status:', res.status);
      }
      const data = await res.json();
      if (!process.env.JEST_WORKER_ID) {
        console.log('Directions API response:', data.status);
      }

      if (data.routes?.length) {
        const firstRoute = data.routes[0];
        const leg = firstRoute.legs?.[0];
        if (leg?.steps) {
          setSteps(leg.steps);
        } else {
          setSteps([]);
        }
      }
    } catch (err) {
      console.error('Directions fetch error', err);
    }
  };

  // Enhanced traceRoute function
  const traceRoute = () => {
    console.log('Tracing route with:', { origin, destination });
    
    if (!origin) {
      setToastMessage('Please set an origin point');
      return;
    }
    
    if (!destination) {
      setToastMessage('Please set a destination point');
      return;
    }
    
    // Check if either origin or destination is in a building
    // and use building centers for more accurate routing
    const finalOrigin = snapToNearestBuilding(origin);
    const finalDestination = snapToNearestBuilding(destination);
    
    setShowDirections(true);
    
    // Check if shuttle route applies using the final coordinates
    const shuttleApplicable = isShuttleRouteApplicable();
    setShowShuttleRoute(shuttleApplicable);
    
    mapRef.current?.fitToCoordinates([finalOrigin, finalDestination], {
      edgePadding,
      animated: true,
    });
  };

  // Enhanced onPlaceSelected function
  const onPlaceSelected = (data: any, details: any, flag: string) => {
    if (!details?.geometry?.location) {
      console.error('No location data in selected place', details);
      return;
    }
    
    const position = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    };
    
    // Snap the location to the nearest building if needed
    const snappedPosition = snapToNearestBuilding(position);
    
    // Extract the place name from details (or fallback to the description)
    const placeName = details.name || data?.description || '';
    
    // Create a new object that includes the name
    const newLocation = { ...snappedPosition, name: placeName };
    
    if (flag === 'origin') {
      setOrigin(newLocation);
      setToastMessage('Origin set');
    } else {
      setDestination(newLocation);
      setToastMessage('Destination set');
    }
    
    moveTo(snappedPosition);
  };
  
  // Simple helper to remove HTML tags
  // Safely removes HTML tags without relying on DOMParser
  const stripHtml = (html = '') => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ''); // Use a regex to strip tags
  };

  // UPDATED: Set campus location as either origin or destination based on what's already filled
  const setCampusPoint = (campusCoords: {
    latitude: number;
    longitude: number;
  }, campusName: string) => {
    setSmartLocation(campusCoords, campusName);
  };

  // Toggle shuttle visibility
  const toggleShuttles = () => {
    setShowShuttles(!showShuttles);
  };
  
  // Reset origin and destination with a visual reset too
  const resetOriginAndDestination = () => {
    setOrigin(null);
    setDestination(null);
    setNextPointIsOrigin(true);
  }; 

  // Clear all points and reset the map
  const clearPoints = () => {
    resetOriginAndDestination();
    setShowDirections(false);
    setShowShuttleRoute(false);
    setSteps([]);
    setToastMessage('Points cleared');
    
    // Reset map view
    mapRef.current?.animateToRegion(INITIAL_POSITION, 1000);
  };

  // Add map style for black and white mode
  const mapStyle: MapStyleElement[] = isBlackAndWhite ? [
    {
      "elementType": "geometry",
      "stylers": [{ "saturation": -100 }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "saturation": -100 }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "saturation": -100 }]
    }
  ] : [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#e9e9e9' }, { lightness: 17 }],
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }, { lightness: 20 }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffffff' }, { lightness: 17 }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }, { lightness: 21 }],
    },
  ];

  // Get appropriate icon for mode button
  const getModeIcon = (mode: MapViewDirectionsMode): string => {
    const icons: Record<MapViewDirectionsMode, string> = {
      'DRIVING': 'car-outline',
      'WALKING': 'walk-outline',
      'BICYCLING': 'bicycle-outline',
      'TRANSIT': 'bus-outline'
    };
    return icons[mode] || 'navigate-outline';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Toast Message */}
      {toastMessage && (
        <Animated.View 
          style={[
            styles.toastContainer,
            { opacity: fadeInAnim }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
      
      {/* Building Detection Badge */}
      {userLocation && checkUserInBuilding() && (
        <View style={styles.buildingInfoBadge}>
          <Ionicons 
            name="location" 
            size={20} 
            color={isBlackAndWhite ? "#000" : "#912338"} 
            style={styles.buildingIcon} 
          />
          <Text style={[
            styles.buildingInfoText,
            isLargeText && styles.largeText
          ]}>
            Concordia Building
          </Text>
        </View>
      )}
      
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_POSITION}
        customMapStyle={mapStyle}
        onRegionChangeComplete={onRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Polygons for Concordia buildings */}
        {polygons.map((polygon, idx) => (
          <Polygon
            key={idx}
            coordinates={polygon.boundaries}
            fillColor={isBlackAndWhite ? "#00000033" : "#91233833"}
            strokeColor={isBlackAndWhite ? "#000000" : "#912338"}
            strokeWidth={2}
          />
        ))}

        {/* Origin and destination markers */}
        {origin && (
          <Marker 
            coordinate={origin} 
            title="Origin" 
            pinColor={isBlackAndWhite ? "black" : "green"} 
          >
            <View style={[
              styles.customIconMarker,
              isBlackAndWhite ? styles.markerBW : styles.originMarker
            ]}>
              <Ionicons 
                name="locate" 
                size={18} 
                color="white" 
              />
            </View>
          </Marker>
        )}
        {destination && (
          <Marker 
            coordinate={destination} 
            title="Destination" 
            pinColor={isBlackAndWhite ? "black" : "red"} 
          >
            <View style={[
              styles.customIconMarker,
              isBlackAndWhite ? styles.markerBW : styles.destinationMarker
            ]}>
              <Ionicons 
                name="flag" 
                size={18} 
                color="white" 
              />
            </View>
          </Marker>
        )}

        {/* Shuttle bus markers */}
        {showShuttles &&
          shuttleData?.buses.map((bus) => (
            <Marker
              key={bus.ID}
              coordinate={{
                latitude: bus.Latitude,
                longitude: bus.Longitude,
              }}
              title={`Shuttle ${bus.ID}`}
              testID={`marker-${bus.ID}`}
              tracksViewChanges={false}
            >
              <View style={[
                styles.customIconMarker,
                isBlackAndWhite ? styles.markerBW : styles.shuttleMarker
              ]}>
                <Ionicons 
                  name="bus" 
                  size={20} 
                  color="white" 
                />
              </View>
            </Marker>
          ))}

        {/* Shuttle station markers */}
        {showShuttles &&
          shuttleData?.stations.map((station) => (
            <Marker
              key={station.ID}
              coordinate={{
                latitude: station.Latitude,
                longitude: station.Longitude,
              }}
              title={station.ID === 'GPLoyola' ? 'Loyola Campus' : 'SGW Campus'}
              testID={`marker-${station.ID}`}
              tracksViewChanges={false}
            >
              <View style={[
                styles.customIconMarker,
                isBlackAndWhite ? styles.markerBW : styles.stationMarker
              ]}>
                <Ionicons 
                  name="bus-outline" 
                  size={20} 
                  color="white" 
                />
              </View>
            </Marker>
          ))}

        {/* Directions Line */}
        {showDirections && origin && destination && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeColor={isBlackAndWhite ? "#000000" : "#912338"}
            strokeWidth={isBlackAndWhite ? 4 : 3}
            mode={travelMode}
            onReady={traceRouteOnReady}
            onError={(errorMsg) => console.log('MapViewDirections ERROR:', errorMsg)}
          />
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.mapControlButton} 
          onPress={() => {
            if (userLocation) {
              moveTo(userLocation);
            }
          }}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color={isBlackAndWhite ? "#000" : "#912338"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.mapControlButton} 
          onPress={toggleShuttles}
        >
          <Ionicons 
            name="bus" 
            size={24} 
            color={isBlackAndWhite ? "#000" : showShuttles ? "#1E88E5" : "#757575"} 
          />
        </TouchableOpacity>
      </View>

      {/* Conditionally Render the Search Bar */}
      {!showDirections && (
        <View style={[
          styles.searchContainer,
          isBlackAndWhite && styles.blackAndWhiteContainer
        ]}>
          
          <InputAutocomplete
            label="Origin"
            placeholder="Enter starting point"
            onPlaceSelected={(data, details = null) => onPlaceSelected(data, details, 'origin')}
            currentValue={origin ? `${formatLocationName(origin)}` : undefined}
            isLargeText={isLargeText}
            isBlackAndWhite={isBlackAndWhite}
          />
          
          <InputAutocomplete
            label="Destination"
            placeholder="Enter destination"
            onPlaceSelected={(data, details = null) => onPlaceSelected(data, details, 'destination')}
            currentValue={destination ? `${formatLocationName(destination)}` : undefined}
            isLargeText={isLargeText}
            isBlackAndWhite={isBlackAndWhite}
          />

          {/* Quick Actions Section */}
          <View style={styles.quickActionsSection}>
            <Text style={[
              styles.sectionHeader,
              isLargeText && styles.largeText
            ]}>
              Quick Actions
            </Text>
            
            {/* Location Buttons Row */}
            <View style={styles.locationButtonsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={setCurrentLocationAsPoint}
              >
                <Ionicons 
                  name="locate" 
                  size={18} 
                  color="white"
                  style={styles.actionButtonIcon} 
                />
                <Text style={styles.actionButtonText}>My Location</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={clearPoints}
              >
                <Ionicons 
                  name="trash-outline" 
                  size={18} 
                  color="white"
                  style={styles.actionButtonIcon} 
                />
                <Text style={styles.actionButtonText}>Clear Points</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Campus Shortcuts Section */}
          <View style={styles.quickActionsSection}>
            <View style={styles.campusButtonsContainer}>
              <TouchableOpacity
                style={styles.campusPill}
                onPress={() => setCampusPoint(SGW_COORDS, "SGW Campus")}
              >
                <Text style={[
                  styles.campusPillText,
                  isLargeText && styles.largeText
                ]}>SGW</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.campusPill}
                onPress={() => setCampusPoint(LOYOLA_COORDS, "Loyola Campus")}
              >
                <Text style={[
                  styles.campusPillText,
                  isLargeText && styles.largeText
                ]}>Loyola</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Travel Mode Section */}
          <View style={styles.quickActionsSection}>
            <Text style={[
              styles.sectionHeader,
              isLargeText && styles.largeText
            ]}>
              Travel Mode
            </Text>
            
            <View style={styles.modeContainer}>
            {['DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    travelMode === mode && styles.activeModeButton
                  ]}
                  onPress={() => setTravelMode(mode as MapViewDirectionsMode)}
                >
                  <Ionicons 
                    name={getModeIcon(mode as MapViewDirectionsMode)} 
                    size={22} 
                    color={travelMode === mode ? 'white' : (isBlackAndWhite ? 'black' : '#912338')}
                  />
                  
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.traceButton} 
            onPress={traceRoute}
          >
            <Text style={[
              styles.traceButtonText,
              isLargeText && styles.largeText
            ]}>
              Find Route
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Back Button when directions are showing */}
      {showDirections && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            setShowDirections(false);
            setShowShuttleRoute(false);
            setSteps([]);
            resetOriginAndDestination(); // Clear all points when going back to search
            setToastMessage('Returned to search view');
          }}
        >
          <Ionicons 
            name="arrow-back" 
            size={20} 
            color="white" 
          />
          <Text style={[
            styles.backButtonText, 
            isLargeText && styles.largeText
          ]}>
            Back
          </Text>
        </TouchableOpacity>
      )}

      {/* Directions */}
      {steps.length > 0 && (
        <View style={[
          styles.directionsContainer, 
          { height: directionsHeight }
        ]}>
          {/* Handle for expanding/collapsing with PanResponder for swipe gestures */}
          <Animated.View 
            style={[
              styles.dragHandleContainer, 
              { transform: [{ translateY: panY }] }
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.dragIndicator} />
          </Animated.View>
          
          <View style={styles.directionsHeaderRow}>
            <View style={styles.directionsHeaderLeft}>
              <Ionicons 
                name="navigate" 
                size={22} 
                color={isBlackAndWhite ? "#000" : "#912338"} 
                style={styles.directionsIcon}
              />
              <Text style={[
                styles.directionsHeader, 
                isLargeText && styles.largeText
              ]}>
                Directions
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => {
                setExpandedDirections(!expandedDirections);
                setDirectionsHeight(expandedDirections ? 180 : height * 0.7);
              }} 
            >
              <Ionicons 
                name={expandedDirections ? "chevron-down" : "chevron-up"} 
                size={22} 
                color={isBlackAndWhite ? "#000" : "#666"} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Route summary */}
          <View style={styles.routeSummary}>
            <View style={styles.routePoints}>
              <View style={styles.routePointRow}>
                <View style={[styles.routePointDot, styles.originDot]} />
                <Text style={[styles.routePointText, isLargeText && styles.largeText]} numberOfLines={1}>
                  {origin ? formatLocationName(origin) : "Origin"}
                </Text>
              </View>
              <View style={styles.routeLineConnector} />
              <View style={styles.routePointRow}>
                <View style={[styles.routePointDot, styles.destinationDot]} />
                <Text style={[styles.routePointText, isLargeText && styles.largeText]} numberOfLines={1}>
                  {destination ? formatLocationName(destination) : "Destination"}
                </Text>
              </View>
            </View>
            <View style={styles.routeMetrics}>
              <View style={styles.routeMetricItem}>
                <Ionicons name="time-outline" size={18} color="#666" />
                <Text style={styles.routeMetricText}>{Math.round(duration)} min</Text>
              </View>
              <View style={styles.routeMetricDivider} />
              <View style={styles.routeMetricItem}>
                <Ionicons name="navigate-outline" size={18} color="#666" />
                <Text style={styles.routeMetricText}>{distance.toFixed(1)} km</Text>
              </View>
            </View>
          </View>
          
          {/* Content container with scrollable area */}
          <View style={styles.contentContainer}>
            {/* Both shuttle and standard routes are available in a tabbed view */}
            <View style={styles.routeTabsContainer}>
              <TouchableOpacity 
                style={[
                  styles.routeTab, 
                  activeRouteTab === 'standard' && styles.activeRouteTab
                ]}
                onPress={() => setActiveRouteTab('standard')}
              >
                <Ionicons 
                  name={getModeIcon(travelMode)} 
                  size={18} 
                  color={activeRouteTab === 'standard' ? (isBlackAndWhite ? "#000" : "#912338") : "#666"} 
                  style={styles.routeTabIcon}
                />
                <Text style={[
                  styles.routeTabText,
                  activeRouteTab === 'standard' && styles.activeRouteTabText,
                  isLargeText && styles.largeText
                ]}>Standard Route</Text>
              </TouchableOpacity>
              
              {showShuttleRoute && (
                <TouchableOpacity 
                  style={[
                    styles.routeTab,
                    activeRouteTab === 'shuttle' && styles.activeRouteTab
                  ]}
                  onPress={() => setActiveRouteTab('shuttle')}
                >
                  <Ionicons 
                    name="bus" 
                    size={18} 
                    color={activeRouteTab === 'shuttle' ? (isBlackAndWhite ? "#000" : "#912338") : "#666"} 
                    style={styles.routeTabIcon}
                  />
                  <Text style={[
                    styles.routeTabText,
                    activeRouteTab === 'shuttle' && styles.activeRouteTabText,
                    isLargeText && styles.largeText
                  ]}>Shuttle Option</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Scrollable content area */}
            <ScrollView style={styles.scrollableContent}>
              {/* Shuttle route details */}
              {showShuttleRoute && activeRouteTab === 'shuttle' && (
                <View style={styles.shuttleRouteContainer}>
                  <View style={styles.shuttleRouteHeader}>
                    <Ionicons 
                      name="school" 
                      size={20} 
                      color={isBlackAndWhite ? "#000" : "#912338"} 
                      style={styles.shuttleHeaderIcon}
                    />
                    <Text style={[
                      styles.shuttleRouteHeaderText,
                      isLargeText && styles.largeText
                    ]}>Concordia Shuttle Service</Text>
                  </View>
                  
                  <View style={styles.shuttleInfoCard}>
                    <View style={styles.shuttleInfoItem}>
                      <Ionicons 
                        name="information-circle-outline" 
                        size={18} 
                        color="#666" 
                        style={styles.shuttleInfoIcon}
                      />
                      <Text style={[styles.shuttleRouteText, isLargeText && styles.largeText]}>
                        Take the Concordia Shuttle between campuses
                      </Text>
                    </View>
                    <View style={styles.shuttleInfoItem}>
                      <Ionicons 
                        name="time-outline" 
                        size={18} 
                        color="#666" 
                        style={styles.shuttleInfoIcon}
                      />
                      <Text style={[styles.shuttleRouteText, isLargeText && styles.largeText]}>
                        Runs every 30 minutes on weekdays
                      </Text>
                    </View>
                    <View style={styles.shuttleInfoItem}>
                      <Ionicons 
                        name="speedometer-outline" 
                        size={18} 
                        color="#666" 
                        style={styles.shuttleInfoIcon}
                      />
                      <Text style={[styles.shuttleRouteText, isLargeText && styles.largeText]}>
                        Usually faster than public transit
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.shuttleDetailRow}>
                    <View style={styles.shuttleDetailItem}>
                      <Text style={styles.shuttleDetailLabel}>Duration</Text>
                      <Text style={[styles.shuttleDetailValue, isLargeText && styles.largeText]}>~30 min</Text>
                    </View>
                    <View style={styles.shuttleDetailItem}>
                      <Text style={styles.shuttleDetailLabel}>Distance</Text>
                      <Text style={[styles.shuttleDetailValue, isLargeText && styles.largeText]}>~6.8 km</Text>
                    </View>
                    <View style={styles.shuttleDetailItem}>
                      <Text style={styles.shuttleDetailLabel}>Cost</Text>
                      <Text style={[styles.shuttleDetailValue, isLargeText && styles.largeText]}>Free</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.shuttleScheduleButton}
                    onPress={() => Linking.openURL('https://www.concordia.ca/maps/shuttle-bus.html#depart')}
                  >
                    <Ionicons name="calendar-outline" size={16} color="white" style={styles.buttonIcon} />
                    <Text style={styles.shuttleScheduleButtonText}>View Schedule</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Standard route details */}
              {activeRouteTab === 'standard' && (
                <>
                  <View style={styles.directionsStepsHeader}>
                    <Ionicons 
                      name="list" 
                      size={18} 
                      color={isBlackAndWhite ? "#000" : "#912338"} 
                    />
                    <Text style={[
                      styles.directionsStepsTitle, 
                      isLargeText && styles.largeText
                    ]}>
                      Turn-by-turn Directions
                    </Text>
                  </View>
                  
                  <View style={styles.stepsList}>
                    {steps.map((step, index) => (
                      <View style={styles.stepItem} key={index}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>{index + 1}</Text>
                        </View>
                        <Text style={[
                          styles.stepText, 
                          isLargeText && styles.largeText
                        ]}>
                          {stripHtml(step.html_instructions)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Show additional info only for standard route */}
                  <View style={styles.routeDetailsContainer}>
                    <Text style={[
                      styles.routeDetailsHeader,
                      isLargeText && styles.largeText
                    ]}>
                      Route Summary
                    </Text>
                    <View style={styles.routeDetailsList}>
                      <View style={styles.routeDetailItem}>
                        <Ionicons name="navigate-outline" size={18} color="#666" />
                        <Text style={[
                          styles.routeDetailsText,
                          isLargeText && styles.largeText
                        ]}>
                          Distance: {distance.toFixed(1)} km
                        </Text>
                      </View>
                      <View style={styles.routeDetailItem}>
                        <Ionicons name="time-outline" size={18} color="#666" />
                        <Text style={[
                          styles.routeDetailsText,
                          isLargeText && styles.largeText
                        ]}>
                          Duration: {Math.round(duration)} minutes
                        </Text>
                      </View>
                      <View style={styles.routeDetailItem}>
                        <Ionicons name={getModeIcon(travelMode)} size={18} color="#666" />
                        <Text style={[
                          styles.routeDetailsText,
                          isLargeText && styles.largeText
                        ]}>
                          Travel Mode: {travelMode.charAt(0) + travelMode.slice(1).toLowerCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
              
              {/* Add extra padding at bottom for better scrolling */}
              <View style={styles.scrollPadding} />
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    width,
    height,
  },
  // Updated search container styles
  searchContainer: {
    position: 'absolute',
    width: '85%',
    backgroundColor: 'white',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    padding: 15,
    borderRadius: 16,
    top: Constants.statusBarHeight + 80,
    alignSelf: 'center',
    maxHeight: height * 0.7,
  },
  inputContainer: {
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  // Quick actions section styles
  quickActionsSection: {
    marginVertical: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  // Updated location buttons
  locationButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  actionButton: {
    backgroundColor: '#0088ff',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  clearButton: {
    backgroundColor: '#912338',
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Updated campus buttons
  campusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  campusPill: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 25,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#912338',
  },
  campusPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  // Updated travel mode buttons
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white',
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#912338',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activeModeButton: {
    backgroundColor: '#912338',
  },
  modeButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  activeModeButtonText: {
    color: 'white',
  },
  // Updated trace button
  traceButton: {
    backgroundColor: '#912338',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  traceButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  // Map controls
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 1,
  },
  mapControlButton: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Custom markers
  customIconMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'white',
  },
  markerBW: {
    backgroundColor: '#000000',
  },
  originMarker: {
    backgroundColor: '#4CAF50', // Green
  },
  destinationMarker: {
    backgroundColor: '#F44336', // Red
  },
  shuttleMarker: {
    backgroundColor: '#1E88E5', // Blue
  },
  stationMarker: {
    backgroundColor: '#4CAF50', // Green
  },
  // Building detection badge
  buildingInfoBadge: {
    position: 'absolute',
    top: Constants.statusBarHeight,
    alignSelf: 'center',
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 999,
  },
  buildingIcon: {
    marginRight: 6,
  },
  buildingInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  // Toast message styles
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    zIndex: 9999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Back button
  backButton: {
    position: 'absolute',
    top: Constants.statusBarHeight,
    left: 20,
    backgroundColor: '#912338',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  // Directions drawer styles
  directionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 5,
  },
  directionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  directionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionsIcon: {
    marginRight: 8,
  },
  directionsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  expandButton: {
    padding: 8,
  },
  // Route summary
  routeSummary: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routePoints: {
    marginBottom: 10,
  },
  routePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  routePointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  originDot: {
    backgroundColor: '#4CAF50', // Green
  },
  destinationDot: {
    backgroundColor: '#F44336', // Red
  },
  routeLineConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 5,
  },
  routePointText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  routeMetrics: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  routeMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  routeMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
  },
  routeMetricText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  // Content container
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollableContent: {
    flex: 1,
  },
  // Route tabs
  routeTabsContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  routeTabIcon: {
    marginRight: 8,
  },
  activeRouteTab: {
    borderBottomColor: '#912338',
  },
  routeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeRouteTabText: {
    color: '#912338',
    fontWeight: 'bold',
  },
  // Shuttle route styles
  shuttleRouteContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#912338',
  },
  shuttleRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shuttleHeaderIcon: {
    marginRight: 8,
  },
  shuttleRouteHeaderText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  shuttleInfoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  shuttleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shuttleInfoIcon: {
    marginRight: 10,
  },
  shuttleRouteText: {
    fontSize: 14,
    color: '#555',
  },
  shuttleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 10,
  },
  shuttleDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  shuttleDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  shuttleDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  shuttleScheduleButton: {
    backgroundColor: '#912338',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  shuttleScheduleButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Direction steps styles
  directionsStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  directionsStepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  stepsList: {
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#912338',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  // Route details styles
  routeDetailsContainer: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  routeDetailsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  routeDetailsList: {
    marginTop: 5,
  },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeDetailsText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  scrollPadding: {
    height: 30,
  },
  // General
  largeText: {
    fontSize: 18, // Increase base font size
  },
  blackAndWhiteText: {
    color: '#000000',
  },
  blackAndWhiteContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
});