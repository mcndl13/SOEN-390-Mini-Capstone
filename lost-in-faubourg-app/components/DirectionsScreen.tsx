import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
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
import { polygons } from './polygonCoordinates';
import {
  fetchShuttlePositions,
  startShuttleTracking,
  ShuttleData,
} from '../services/shuttleService';

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
        }}
        styles={googleAutocompleteStyles}
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

  // Keep track of travel mode: DRIVING, WALKING, BICYCLING, TRANSIT
  const [travelMode, setTravelMode] =
    useState<MapViewDirectionsMode>('DRIVING');

  // Shuttle states
  const [shuttleData, setShuttleData] = useState<ShuttleData | null>(null);
  const [showShuttles, setShowShuttles] = useState<boolean>(true);

  const mapRef = useRef<MapView>(null);

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
      const data = await res.json();

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

  // "Trace route" button
  const traceRoute = () => {
    if (origin && destination) {
      setShowDirections(true);
      mapRef.current?.fitToCoordinates([origin, destination], {
        edgePadding,
        animated: true,
      });
    }
  };

  // Called by GooglePlacesAutocomplete
  const onPlaceSelected = (details: any, flag: string) => {
    const position = {
      latitude: details?.geometry.location.lat || 0,
      longitude: details?.geometry.location.lng || 0,
    };
    if (flag === 'origin') {
      setOrigin(position);
    } else {
      setDestination(position);
    }
    moveTo(position);
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_POSITION}
      >
        {/* Polygons for Concordia buildings */}
        {polygons.map((polygon, idx) => (
          <Polygon
            key={idx}
            coordinates={polygon.boundaries}
            fillColor="#91233855" // semi-transparent fill
            strokeColor="#912338" // outline color
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
        <View style={styles.directionsContainer}>
          <Text style={styles.directionsHeader}>Directions</Text>
          <ScrollView>
            {steps.map((step, index) => (
              <Text style={styles.stepText} key={index}>
                {index + 1}. {stripHtml(step.html_instructions)}
              </Text>
            ))}
          </ScrollView>
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
  directionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 200, // Limit how tall the list can grow
    backgroundColor: '#fff',
    padding: 10,
  },
  directionsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  stepText: {
    marginBottom: 4,
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
});
