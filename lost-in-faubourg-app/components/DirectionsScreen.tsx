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
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import MapViewDirections, {
  MapViewDirectionsMode,
} from 'react-native-maps-directions';
import * as Location from 'expo-location';
import 'react-native-get-random-values';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { polygons } from '../components/polygonCoordinates';
import {
  fetchShuttlePositions,
  startShuttleTracking,
  ShuttleData,
} from '../services/shuttleService';
import { isUserInBuilding, getPolygonCenter } from '../utils/geometry';

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

// Coordinates for the two campuses
const SGW_COORDS = { latitude: 45.4953534, longitude: -73.578549 };
const LOYOLA_COORDS = { latitude: 45.4582, longitude: -73.6405 };

// Reusable Input Autocomplete component
function InputAutocomplete({
  label,
  placeholder,
  onPlaceSelected,
}: {
  label: string;
  placeholder: string;
  onPlaceSelected: (details: any) => void;
}) {
  // Minimal custom styling for Google Autocomplete
  const googleAutocompleteStyles = {
    container: { flex: 0 },
    textInputContainer: {
      width: '100%',
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      borderBottomWidth: 0,
      paddingTop: 5,
      paddingBottom: 10,
    },
    textInput: {
      height: 40,
      color: '#5d5d5d',
      fontSize: 16,
      borderWidth: 0.5,
      borderColor: '#912338',
      borderRadius: 15,
      paddingHorizontal: 10,
    },
    listView: {},
    description: { fontWeight: 'bold' },
    predefinedPlacesDescription: { color: '#1faadb' },
  };

  return (
    <>
      <Text>{label}</Text>
      <GooglePlacesAutocomplete
        placeholder={placeholder || 'Type here...'}
        fetchDetails={true}
        onPress={(data, details = null) => {
          onPlaceSelected && onPlaceSelected(details);
        }}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'en',
          components: 'country:ca', // Limit to Canada for better results
        }}
        styles={googleAutocompleteStyles}
        enablePoweredByContainer={false}
        minLength={2}
        debounce={300}
      />
    </>
  );
}

export default function DirectionsScreen() {
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destination, setDestination] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // We still fetch userLocation if you want to show the user's position,
  // but no button for "Use My Location" (optional).
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [showDirections, setShowDirections] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [steps, setSteps] = useState<{ html_instructions: string }[]>([]);
  const [showShuttleRoute, setShowShuttleRoute] = useState(false);
  
  // States for expandable directions panel
  const [expandedDirections, setExpandedDirections] = useState<boolean>(false);
  const [directionsHeight, setDirectionsHeight] = useState<number>(150);
  
  // State for route tabs
  const [activeRouteTab, setActiveRouteTab] = useState<'standard' | 'shuttle'>('standard');

  // Keep track of travel mode: DRIVING, WALKING, BICYCLING, TRANSIT
  const [travelMode, setTravelMode] =
    useState<MapViewDirectionsMode>('DRIVING');

  // Shuttle states
  const [shuttleData, setShuttleData] = useState<ShuttleData | null>(null);
  const [showShuttles, setShowShuttles] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState(15); // Default zoom level

  const mapRef = useRef<MapView>(null);
  
  // Create an animated value for the directions panel height
  const panY = useRef(new Animated.Value(0)).current;

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
          setDirectionsHeight(height * 0.6);
        } 
        // If swiped down and expanded
        else if (gestureState.dy > 20 && expandedDirections) {
          // Collapse the panel
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          setExpandedDirections(false);
          setDirectionsHeight(150);
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

  // Use this function to potentially set the origin to the building the user is in
  const setCurrentLocationAsOrigin = () => {
    // First check if user is in a building
    const buildingCenter = checkUserInBuilding();
    
    if (buildingCenter) {
      // If user is in a building, use the building center as origin for better accuracy
      setOrigin(buildingCenter);
      
      // Optionally show a message to the user
      Alert.alert(
        "Building Detected",
        "We've detected you're inside a Concordia building and have set your starting point accordingly."
      );
    } else if (userLocation) {
      // Just use regular user location if not in a building
      setOrigin(userLocation);
    } else {
      // Handle case where location is not available
      Alert.alert(
        "Location Not Available",
        "Please enable location services or manually set your starting point."
      );
    }
  };

  // Function to snap points to nearest building when appropriate
  const snapToNearestBuilding = (point: { latitude: number; longitude: number }) => {
    // This will return either the center of a building if the point is inside a building,
    // or the original point if not in any building
    return isUserInBuilding(point) || point;
  };

  // Helper to calculate distance between two coordinates in km
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
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Directions API response:', data.status);

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
      console.error('No origin set');
      return;
    }
    
    if (!destination) {
      console.error('No destination set');
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
  const onPlaceSelected = (details: any, flag: string) => {
    if (!details?.geometry?.location) {
      console.error('No location data in selected place', details);
      return;
    }
    
    const position = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    };
    
    // Try to snap the selected point to a building if it's close to one
    const snappedPosition = snapToNearestBuilding(position);
    
    console.log(`Setting ${flag} to:`, snappedPosition);
    
    if (flag === 'origin') {
      setOrigin(snappedPosition);
    } else {
      setDestination(snappedPosition);
    }
    
    moveTo(snappedPosition);
  };

  // Simple helper to remove HTML tags
  // Safely removes HTML tags without relying on DOMParser
  const stripHtml = (html = '') => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ''); // Use a regex to strip tags
  };

  // Button handlers to set origin to SGW or Loyola
  const setCampusOrigin = (campusCoords: {
    latitude: number;
    longitude: number;
  }) => {
    setOrigin(campusCoords);
    moveTo(campusCoords);
  };

  // Toggle shuttle visibility
  const toggleShuttles = () => {
    setShowShuttles(!showShuttles);
  };

  // Test directions with hardcoded values (for debugging)
  const testDirections = () => {
    const testOrigin = { latitude: 45.4953534, longitude: -73.578549 }; // SGW
    const testDest = { latitude: 45.4582, longitude: -73.6405 }; // Loyola
    
    setOrigin(testOrigin);
    setDestination(testDest);
    
    // Wait a moment for state to update
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.fitToCoordinates([testOrigin, testDest], {
          edgePadding,
          animated: true,
        });
        setShowDirections(true);
        setShowShuttleRoute(true);
      }
    }, 500);
  };

  return (
    <View style={styles.container}>
      {/* Building Detection Badge */}
      {userLocation && checkUserInBuilding() && (
        <View style={styles.buildingInfoBadge}>
          <Text style={styles.buildingInfoText}>
            You are in a Concordia building
          </Text>
        </View>
      )}
      
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_POSITION}
        onRegionChangeComplete={onRegionChange}
      >
        {/* Polygons for Concordia buildings */}
        {polygons.map((polygon, idx) => (
          <Polygon
            key={idx}
            coordinates={polygon.boundaries}
            fillColor="#912338cc"
            strokeColor="#912338cc"
            strokeWidth={2}
          />
        ))}

        {/* Markers */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="My Location"
            pinColor="blue"
          />
        )}
        {origin && (
          <Marker coordinate={origin} title="Origin" pinColor="green" />
        )}
        {destination && (
          <Marker coordinate={destination} title="Destination" pinColor="red" />
        )}

        {/* Shuttle bus markers */}
        {showShuttles &&
          shuttleData &&
          shuttleData.buses.map((bus) => (
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
              {/* Custom marker for bus icon */}
              <View style={styles.busMarker}>
                <Image
                  source={require('../assets/images/transportModes/busBlack.png')} //bus icon
                  style={styles.busIcon}
                  resizeMode="contain"
                />
              </View>
            </Marker>
          ))}

        {/* Shuttle station markers */}
        {showShuttles &&
          shuttleData &&
          shuttleData.stations.map((station) => (
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
              {/* Custom marker for station icon */}
              <View style={styles.stationMarker}>
                <Image
                  source={require('../assets/images/transportModes/busStation.png')}
                  style={styles.stationIcon}
                  resizeMode="contain"
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
            strokeColor="#6644ff"
            strokeWidth={4}
            mode={travelMode}
            onReady={traceRouteOnReady}
            onError={(errorMsg) =>
              console.log('MapViewDirections ERROR:', errorMsg)
            }
          />
        )}
      </MapView>

      {/* Shuttle Toggle Button */}
      <TouchableOpacity
        style={styles.shuttleToggleButton}
        onPress={toggleShuttles}
      >
        <Text style={styles.shuttleToggleText}>
          {showShuttles ? 'Hide Shuttles' : 'Show Shuttles'}
        </Text>
      </TouchableOpacity>

      {/* Conditionally Render the Search Bar */}
      {!showDirections && (
        <View style={styles.searchContainer}>
          <InputAutocomplete
            label="Origin"
            placeholder="Enter origin"
            onPlaceSelected={(details) => onPlaceSelected(details, 'origin')}
          />
          <InputAutocomplete
            label="Destination"
            placeholder="Enter destination"
            onPlaceSelected={(details) =>
              onPlaceSelected(details, 'destination')
            }
          />

          {/* Use My Location Button */}
          <TouchableOpacity
            style={styles.useLocationButton}
            onPress={setCurrentLocationAsOrigin}
          >
            <Text style={styles.useLocationButtonText}>Use My Location</Text>
          </TouchableOpacity>

          {/* Campus Buttons */}
          <View style={styles.campusButtonsContainer}>
            <TouchableOpacity
              style={styles.campusButton}
              onPress={() => setCampusOrigin(SGW_COORDS)}
            >
              <Text style={styles.campusButtonText}>SGW Campus</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.campusButton}
              onPress={() => setCampusOrigin(LOYOLA_COORDS)}
            >
              <Text style={styles.campusButtonText}>Loyola Campus</Text>
            </TouchableOpacity>
          </View>

          {/* Travel Mode Buttons */}
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                travelMode === 'DRIVING' && styles.activeModeButton,
              ]}
              onPress={() => setTravelMode('DRIVING')}
            >
              <Image
                source={
                  travelMode === 'DRIVING'
                    ? require('../assets/images/transportModes/carWhite.png')
                    : require('../assets/images/transportModes/carBlack.png')
                }
                style={styles.modeButtonIcon}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  travelMode === 'DRIVING' && styles.activeModeButtonText,
                ]}
              >
                Driving
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                travelMode === 'WALKING' && styles.activeModeButton,
              ]}
              onPress={() => setTravelMode('WALKING')}
            >
              <Image
                source={
                  travelMode === 'WALKING'
                    ? require('../assets/images/transportModes/walkWhite.png')
                    : require('../assets/images/transportModes/walkBlack.png')
                }
                style={styles.modeButtonIcon}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  travelMode === 'WALKING' && styles.activeModeButtonText,
                ]}
              >
                Walking
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                travelMode === 'BICYCLING' && styles.activeModeButton,
              ]}
              onPress={() => setTravelMode('BICYCLING')}
            >
              <Image
                source={
                  travelMode === 'BICYCLING'
                    ? require('../assets/images/transportModes/bikeWhite.png')
                    : require('../assets/images/transportModes/bikeBlack.png')
                }
                style={styles.modeButtonIcon}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  travelMode === 'BICYCLING' && styles.activeModeButtonText,
                ]}
              >
                Bicycling
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                travelMode === 'TRANSIT' && styles.activeModeButton,
              ]}
              onPress={() => setTravelMode('TRANSIT')}
            >
              <Image
                source={
                  travelMode === 'TRANSIT'
                    ? require('../assets/images/transportModes/busWhite.png')
                    : require('../assets/images/transportModes/busBlack.png')
                }
                style={styles.modeButtonIcon}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  travelMode === 'TRANSIT' && styles.activeModeButtonText,
                ]}
              >
                Transit
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.traceButton} onPress={traceRoute}>
            <Text style={styles.buttonText}>Trace route</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Directions */}
      {steps.length > 0 && (
        <View style={[styles.directionsContainer, { height: directionsHeight }]}>
          {/* Handle for expanding/collapsing with PanResponder for swipe gestures */}
          <Animated.View 
            style={[styles.dragHandleContainer, { transform: [{ translateY: panY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.dragIndicator} />
          </Animated.View>
          
          <View style={styles.directionsHeaderRow}>
            <Text style={styles.directionsHeader}>Directions</Text>
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => {
                setExpandedDirections(!expandedDirections);
                setDirectionsHeight(expandedDirections ? 150 : height * 0.6);
              }} 
            >
              <Text style={styles.expandButtonText}>
                {expandedDirections ? 'Collapse' : 'Expand'}
              </Text>
            </TouchableOpacity>
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
                <Text style={[
                  styles.routeTabText,
                  activeRouteTab === 'standard' && styles.activeRouteTabText
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
                  <Text style={[
                    styles.routeTabText,
                    activeRouteTab === 'shuttle' && styles.activeRouteTabText
                  ]}>Shuttle Option</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Scrollable content area */}
            <ScrollView style={styles.scrollableContent}>
              {/* Shuttle route details */}
              {showShuttleRoute && activeRouteTab === 'shuttle' && (
                <View style={styles.shuttleRouteContainer}>
                  <Text style={styles.shuttleRouteHeader}>Concordia Shuttle Option</Text>
                  <Text style={styles.shuttleRouteText}>Take the Concordia Shuttle between campuses (30 minutes)</Text>
                  <Text style={styles.shuttleRouteText}>Shuttle runs every 30 minutes on weekdays</Text>
                  <Text style={styles.shuttleRouteText}>This direct route is usually faster than public transit!</Text>
                  
                  <View style={styles.shuttleDetailRow}>
                    <View style={styles.shuttleDetailItem}>
                      <Text style={styles.shuttleDetailLabel}>Duration</Text>
                      <Text style={styles.shuttleDetailValue}>~30 min</Text>
                    </View>
                    <View style={styles.shuttleDetailItem}>
                      <Text style={styles.shuttleDetailLabel}>Distance</Text>
                      <Text style={styles.shuttleDetailValue}>~6.8 km</Text>
                    </View>
                    <View style={styles.shuttleDetailItem}>
                      <Text style={styles.shuttleDetailLabel}>Cost</Text>
                      <Text style={styles.shuttleDetailValue}>Free</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.shuttleScheduleButton}
                    onPress={() => Linking.openURL('https://www.concordia.ca/maps/shuttle-bus.html#depart')}
                  >
                    <Text style={styles.shuttleScheduleButtonText}>View Schedule</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Standard route details */}
              {activeRouteTab === 'standard' && (
                <>
                  <Text style={styles.regularRouteHeader}>Route Steps</Text>
                  {steps.map((step, index) => (
                    <Text style={styles.stepText} key={index}>
                      {index + 1}. {stripHtml(step.html_instructions)}
                    </Text>
                  ))}
                  
                  {/* Show additional info only for standard route */}
                  <View style={styles.routeDetailsContainer}>
                    <Text style={styles.routeDetailsHeader}>Route Details</Text>
                    <Text style={styles.routeDetailsText}>Distance: {distance.toFixed(1)} km</Text>
                    <Text style={styles.routeDetailsText}>Duration: {Math.round(duration)} min</Text>
                    <Text style={styles.routeDetailsText}>Travel Mode: {travelMode}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

//--------------------------------------
// Styles
//--------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width,
    height,
  },
  searchContainer: {
    position: 'absolute',
    width: '90%',
    backgroundColor: 'white',
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    padding: 20,
    borderRadius: 8,
    top: Constants.statusBarHeight,
  },
  campusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  campusButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginLeft: 8,
    marginRight: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#912338',
  },
  campusButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  modeContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#fff',
    marginRight: 8,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: '#912338',
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: '#912338',
  },
  modeButtonIcon: {
    width: 32,
    height: 25,
  },
  modeButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  activeModeButtonText: {
    color: '#fff',
  },
  traceButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: '#912338',
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  // Shuttle styles
  shuttleToggleButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: '#912338',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  shuttleToggleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  busMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busIcon: {
    width: 30,
    height: 30,
  },
  stationMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationIcon: {
    width: 25,
    height: 25,
  },
  // Updated directions container styles
  directionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 5,
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
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  directionsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expandButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  scrollableContent: {
    flex: 1,
  },
  // Route tabs styles
  routeTabsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeTab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeRouteTab: {
    borderBottomColor: '#912338',
  },
  routeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  activeRouteTabText: {
    color: '#912338',
    fontWeight: 'bold',
  },
  // Shuttle route styles
  shuttleRouteContainer: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#912338',
  },
  shuttleRouteHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
    color: '#912338',
  },
  shuttleRouteText: {
    fontSize: 14,
    marginBottom: 5,
  },
  regularRouteHeader: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  shuttleScheduleButton: {
    backgroundColor: '#912338',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  shuttleScheduleButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  stepText: {
    marginBottom: 8,
    fontSize: 14,
  },
  // Shuttle detail styles
  shuttleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  shuttleDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  shuttleDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  shuttleDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  // Route details styles
  routeDetailsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 20,
  },
  routeDetailsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  routeDetailsText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  // Geometry integration styles
  useLocationButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 15,
    alignItems: 'center',
  },
  useLocationButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  buildingInfoBadge: {
    position: 'absolute',
    top: 10,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 999,
  },
  buildingInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});