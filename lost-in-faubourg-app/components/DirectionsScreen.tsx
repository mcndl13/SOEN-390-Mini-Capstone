import React, { useRef, useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  PanResponder,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import MapView, {
  Marker,
  Polygon,
  PROVIDER_DEFAULT,
  MapStyleElement,
} from 'react-native-maps';
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
import { startShuttleTracking, ShuttleData } from '../services/shuttleService';
import { isUserInBuilding } from '../utils/geometry';

// -- Constants and Dimensions --
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const INITIAL_POSITION = {
  latitude: 45.4953534,
  longitude: -73.578549,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};
const SGW_COORDS = { latitude: 45.4953534, longitude: -73.578549 };
const LOYOLA_COORDS = { latitude: 45.4582, longitude: -73.6405 };
const EDGE_PADDING_VALUE = 70;
const EDGE_PADDING = {
  top: EDGE_PADDING_VALUE,
  right: EDGE_PADDING_VALUE,
  bottom: EDGE_PADDING_VALUE,
  left: EDGE_PADDING_VALUE,
};

// -- Helper Functions --
function getMapStyle(isBlackAndWhite: boolean): MapStyleElement[] {
  return isBlackAndWhite
    ? [
        { elementType: 'geometry', stylers: [{ saturation: -100 }] },
        { elementType: 'labels.text.fill', stylers: [{ saturation: -100 }] },
        { elementType: 'labels.text.stroke', stylers: [{ saturation: -100 }] },
      ]
    : [
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
}

function getExpandButtonProps(expanded: boolean) {
  return {
    icon: expanded ? 'chevron-down' : 'chevron-up',
    text: expanded ? 'Collapse' : 'Expand',
  };
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function distanceBetween(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
): number {
  if (!point1 || !point2) return 9999;
  const R = 6371;
  const dLat = deg2rad(point2.latitude - point1.latitude);
  const dLon = deg2rad(point2.longitude - point1.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(point1.latitude)) *
      Math.cos(deg2rad(point2.latitude)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function snapToNearestBuilding(point: { latitude: number; longitude: number }) {
  return isUserInBuilding(point) || point;
}

function formatLocationName(
  location: { latitude: number; longitude: number; name?: string },
  currentUserLocation?: { latitude: number; longitude: number },
): string {
  if (location.name) return location.name;
  if (
    Math.abs(location.latitude - SGW_COORDS.latitude) < 0.001 &&
    Math.abs(location.longitude - SGW_COORDS.longitude) < 0.001
  ) {
    return 'SGW Campus';
  }
  if (
    Math.abs(location.latitude - LOYOLA_COORDS.latitude) < 0.001 &&
    Math.abs(location.longitude - LOYOLA_COORDS.longitude) < 0.001
  ) {
    return 'Loyola Campus';
  }
  if (
    currentUserLocation &&
    Math.abs(location.latitude - currentUserLocation.latitude) < 0.0001 &&
    Math.abs(location.longitude - currentUserLocation.longitude) < 0.0001
  ) {
    return 'My Current Location';
  }
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>?/gm, '');
}

function isShuttleRouteApplicable(
  origin: { latitude: number; longitude: number } | null,
  destination: { latitude: number; longitude: number } | null,
): boolean {
  if (!origin || !destination) return false;
  const finalOrigin = snapToNearestBuilding(origin);
  const finalDestination = snapToNearestBuilding(destination);
  const isOriginNearSGW = distanceBetween(finalOrigin, SGW_COORDS) < 0.5;
  const isOriginNearLoyola = distanceBetween(finalOrigin, LOYOLA_COORDS) < 0.5;
  const isDestNearSGW = distanceBetween(finalDestination, SGW_COORDS) < 0.5;
  const isDestNearLoyola =
    distanceBetween(finalDestination, LOYOLA_COORDS) < 0.5;
  return (
    (isOriginNearSGW && isDestNearLoyola) ||
    (isOriginNearLoyola && isDestNearSGW)
  );
}

function getModeIcon(mode: MapViewDirectionsMode): string {
  const icons: Record<MapViewDirectionsMode, string> = {
    DRIVING: 'car-outline',
    WALKING: 'walk-outline',
    BICYCLING: 'bicycle-outline',
    TRANSIT: 'bus-outline',
  };
  return icons[mode] || 'navigate-outline';
}

// -- Custom Hooks --
function useInitializeLocation(
  setUserLocation: React.Dispatch<
    React.SetStateAction<{ latitude: number; longitude: number } | null>
  >,
) {
  useEffect(() => {
    if (process.env.JEST_WORKER_ID) {
      setUserLocation({ latitude: 45.0, longitude: -73.0 });
      return;
    }
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      setUserLocation({ latitude, longitude });
    })();
  }, [setUserLocation]);
}

function useShuttleTracking(
  setShuttleData: React.Dispatch<React.SetStateAction<ShuttleData | null>>,
) {
  useEffect(() => {
    const stopTracking = startShuttleTracking((data) => {
      setShuttleData(data);
    }, 15000);
    return () => {
      stopTracking();
    };
  }, [setShuttleData]);
}

// -- Reusable Components --

interface InputAutocompleteProps {
  label: string;
  placeholder: string;
  onPlaceSelected: (data: any, details: any) => void;
  currentValue?: string;
  isLargeText?: boolean;
  isBlackAndWhite?: boolean;
}
function InputAutocomplete({
  label,
  placeholder,
  onPlaceSelected,
  currentValue,
  isLargeText,
  isBlackAndWhite,
}: InputAutocompleteProps) {
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
      color: isBlackAndWhite ? '#000000' : '#912338',
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
      <Text
        style={[
          styles.inputLabel,
          isLargeText && styles.largeText,
          isBlackAndWhite && styles.blackAndWhiteText,
        ]}
      >
        {label}
      </Text>
      {currentValue ? (
        <View
          style={[
            googleAutocompleteStyles.textInput,
            { justifyContent: 'center', paddingHorizontal: 16 },
          ]}
        >
          <Text
            style={[
              { fontSize: isLargeText ? 18 : 16 },
              isBlackAndWhite && styles.blackAndWhiteText,
            ]}
          >
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
            components: 'country:ca',
          }}
          styles={googleAutocompleteStyles}
          textInputProps={{
            placeholderTextColor: '#999999',
          }}
          enablePoweredByContainer={false}
          minLength={2}
          debounce={300}
        />
      )}
    </View>
  );
}

interface ToastProps {
  message: string;
  fadeInAnim: Animated.Value;
}
const Toast = ({ message, fadeInAnim }: ToastProps) => (
  <Animated.View style={[styles.toastContainer, { opacity: fadeInAnim }]}>
    <Text style={styles.toastText}>{message}</Text>
  </Animated.View>
);

interface MapControlsProps {
  isBlackAndWhite: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  onLocatePress: () => void;
  onToggleShuttles: () => void;
}
const MapControls = ({
  isBlackAndWhite,
  userLocation,
  onLocatePress,
  onToggleShuttles,
}: MapControlsProps) => (
  <View style={styles.mapControls}>
    <TouchableOpacity
      style={styles.mapControlButton}
      onPress={onLocatePress}
      testID="locateBtn"
    >
      <Ionicons
        name="locate"
        size={24}
        color={isBlackAndWhite ? '#000' : '#912338'}
      />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.mapControlButton}
      onPress={onToggleShuttles}
      testID="shuttlesBtn"
    >
      <Ionicons
        name="bus"
        size={24}
        color={isBlackAndWhite ? '#000' : '#1E88E5'}
      />
    </TouchableOpacity>
  </View>
);

interface DirectionsPanelProps {
  steps: { html_instructions: string }[];
  origin: any;
  destination: any;
  distance: number;
  duration: number;
  panResponder: any;
  panY: Animated.Value;
  isBlackAndWhite: boolean;
  isLargeText: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  activeRouteTab: 'standard' | 'shuttle';
  setActiveRouteTab: (tab: 'standard' | 'shuttle') => void;
  travelMode: MapViewDirectionsMode;
}
const DirectionsPanel = ({
  steps,
  origin,
  destination,
  distance,
  duration,
  panResponder,
  panY,
  isBlackAndWhite,
  isLargeText,
  expanded,
  onToggleExpand,
  activeRouteTab,
  setActiveRouteTab,
  travelMode,
}: DirectionsPanelProps) => {
  const { icon, text } = getExpandButtonProps(expanded);
  const standardTabIconColor =
    activeRouteTab === 'standard'
      ? isBlackAndWhite
        ? '#000'
        : '#912338'
      : '#666';
  const shuttleTabIconColor =
    activeRouteTab === 'shuttle'
      ? isBlackAndWhite
        ? '#000'
        : '#912338'
      : '#666';

  return (
    <View
      style={[
        styles.directionsContainer,
        { height: expanded ? height * 0.7 : 180 },
      ]}
    >
      <Animated.View
        style={[
          styles.dragHandleContainer,
          { transform: [{ translateY: panY }] },
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
            color={isBlackAndWhite ? '#000' : '#912338'}
            style={styles.directionsIcon}
          />
          <Text
            style={[styles.directionsHeader, isLargeText && styles.largeText]}
          >
            Directions
          </Text>
        </View>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={onToggleExpand}
          testID="expandCollapseBtn"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name={icon}
              size={22}
              color={isBlackAndWhite ? '#000' : '#666'}
            />
            <Text>{text}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.routeSummary}>
        <View style={styles.routePoints}>
          <View style={styles.routePointRow}>
            <View style={[styles.routePointDot, styles.originDot]} />
            <Text
              style={[styles.routePointText, isLargeText && styles.largeText]}
              numberOfLines={1}
            >
              {origin ? formatLocationName(origin) : 'Origin'}
            </Text>
          </View>
          <View style={styles.routeLineConnector} />
          <View style={styles.routePointRow}>
            <View style={[styles.routePointDot, styles.destinationDot]} />
            <Text
              style={[styles.routePointText, isLargeText && styles.largeText]}
              numberOfLines={1}
            >
              {destination ? formatLocationName(destination) : 'Destination'}
            </Text>
          </View>
        </View>
        <View style={styles.routeMetrics}>
          <View style={styles.routeMetricItem}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.routeMetricText}>
              {Math.round(duration)} min
            </Text>
          </View>
          <View style={styles.routeMetricDivider} />
          <View style={styles.routeMetricItem}>
            <Ionicons name="navigate-outline" size={18} color="#666" />
            <Text style={styles.routeMetricText}>{distance.toFixed(1)} km</Text>
          </View>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.routeTabsContainer}>
          <TouchableOpacity
            style={[
              styles.routeTab,
              activeRouteTab === 'standard' && styles.activeRouteTab,
            ]}
            onPress={() => setActiveRouteTab('standard')}
          >
            {(() => {
              const routeTabIconColor =
                activeRouteTab === 'standard'
                  ? isBlackAndWhite
                    ? '#000'
                    : '#912338'
                  : '#666';
              return (
                <Ionicons
                  name={getModeIcon(travelMode)}
                  size={18}
                  color={routeTabIconColor}
                  style={styles.routeTabIcon}
                />
              );
            })()}
            <Text
              style={[
                styles.routeTabText,
                activeRouteTab === 'standard' && styles.activeRouteTabText,
                isLargeText && styles.largeText,
              ]}
            >
              Standard Route
            </Text>
          </TouchableOpacity>
          {showShuttleRouteOption(activeRouteTab) && (
            <TouchableOpacity
              style={[
                styles.routeTab,
                activeRouteTab === 'shuttle' && styles.activeRouteTab,
              ]}
              onPress={() => setActiveRouteTab('shuttle')}
            >
              {(() => {
                const shuttleTabIconColor =
                  activeRouteTab === 'shuttle'
                    ? isBlackAndWhite
                      ? '#000'
                      : '#912338'
                    : '#666';
                return (
                  <Ionicons
                    name="bus"
                    size={18}
                    color={shuttleTabIconColor}
                    style={styles.routeTabIcon}
                  />
                );
              })()}
              <Text
                style={[
                  styles.routeTabText,
                  activeRouteTab === 'shuttle' && styles.activeRouteTabText,
                  isLargeText && styles.largeText,
                ]}
              >
                Shuttle Option
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView style={styles.scrollableContent}>
          {activeRouteTab === 'shuttle' ? (
            <View style={styles.shuttleRouteContainer}>
              <View style={styles.shuttleRouteHeader}>
                <Ionicons
                  name="school"
                  size={20}
                  color={isBlackAndWhite ? '#000' : '#912338'}
                  style={styles.shuttleHeaderIcon}
                />
                <Text
                  style={[
                    styles.shuttleRouteHeaderText,
                    isLargeText && styles.largeText,
                  ]}
                >
                  Concordia Shuttle Service
                </Text>
              </View>
              <View style={styles.shuttleInfoCard}>
                <View style={styles.shuttleInfoItem}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color="#666"
                    style={styles.shuttleInfoIcon}
                  />
                  <Text
                    style={[
                      styles.shuttleRouteText,
                      isLargeText && styles.largeText,
                    ]}
                  >
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
                  <Text
                    style={[
                      styles.shuttleRouteText,
                      isLargeText && styles.largeText,
                    ]}
                  >
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
                  <Text
                    style={[
                      styles.shuttleRouteText,
                      isLargeText && styles.largeText,
                    ]}
                  >
                    Usually faster than public transit
                  </Text>
                </View>
              </View>
              <View style={styles.shuttleDetailRow}>
                <View style={styles.shuttleDetailItem}>
                  <Text style={styles.shuttleDetailLabel}>Duration</Text>
                  <Text
                    style={[
                      styles.shuttleDetailValue,
                      isLargeText && styles.largeText,
                    ]}
                  >
                    ~30 min
                  </Text>
                </View>
                <View style={styles.shuttleDetailItem}>
                  <Text style={styles.shuttleDetailLabel}>Distance</Text>
                  <Text
                    style={[
                      styles.shuttleDetailValue,
                      isLargeText && styles.largeText,
                    ]}
                  >
                    ~6.8 km
                  </Text>
                </View>
                <View style={styles.shuttleDetailItem}>
                  <Text style={styles.shuttleDetailLabel}>Cost</Text>
                  <Text
                    style={[
                      styles.shuttleDetailValue,
                      isLargeText && styles.largeText,
                    ]}
                  >
                    Free
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.shuttleScheduleButton}
                onPress={() =>
                  Linking.openURL(
                    'https://www.concordia.ca/maps/shuttle-bus.html#depart',
                  )
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color="white"
                  style={styles.buttonIcon}
                />
                <Text style={styles.shuttleScheduleButtonText}>
                  View Schedule
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.directionsStepsHeader}>
                <Ionicons
                  name="list"
                  size={18}
                  color={isBlackAndWhite ? '#000' : '#912338'}
                />
                <Text
                  style={[
                    styles.directionsStepsTitle,
                    isLargeText && styles.largeText,
                  ]}
                >
                  Route Steps
                </Text>
              </View>
              <View style={styles.stepsList}>
                {steps.map((step, index) => (
                  <View
                    style={styles.stepItem}
                    key={`step-${index}-${stripHtml(
                      step.html_instructions,
                    ).slice(0, 10)}`}
                  >
                    <View style={styles.stepNumberContainer}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                    <Text
                      style={[styles.stepText, isLargeText && styles.largeText]}
                    >
                      {stripHtml(step.html_instructions)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.routeDetailsContainer}>
                <Text
                  style={[
                    styles.routeDetailsHeader,
                    isLargeText && styles.largeText,
                  ]}
                >
                  Route Summary
                </Text>
                <View style={styles.routeDetailsList}>
                  <View style={styles.routeDetailItem}>
                    <Ionicons name="navigate-outline" size={18} color="#666" />
                    <Text
                      style={[
                        styles.routeDetailsText,
                        isLargeText && styles.largeText,
                      ]}
                    >
                      Distance: {distance.toFixed(1)} km
                    </Text>
                  </View>
                  <View style={styles.routeDetailItem}>
                    <Ionicons name="time-outline" size={18} color="#666" />
                    <Text
                      style={[
                        styles.routeDetailsText,
                        isLargeText && styles.largeText,
                      ]}
                    >
                      Duration: {Math.round(duration)} minutes
                    </Text>
                  </View>
                  <View style={styles.routeDetailItem}>
                    <Ionicons
                      name={getModeIcon(travelMode)}
                      size={18}
                      color="#666"
                    />
                    <Text
                      style={[
                        styles.routeDetailsText,
                        isLargeText && styles.largeText,
                      ]}
                    >
                      Travel Mode:{' '}
                      {travelMode.charAt(0) + travelMode.slice(1).toLowerCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
          <View style={styles.scrollPadding} />
        </ScrollView>
      </View>
    </View>
  );
};

// Helper to decide if the shuttle tab should be shown.
function showShuttleRouteOption(
  activeRouteTab: 'standard' | 'shuttle',
): boolean {
  return activeRouteTab === 'shuttle';
}

// -- Helper Functions for traceRoute refactoring --

// Extract validation of route points to reduce nested conditions.
function validateRoute(
  origin: { latitude: number; longitude: number } | null,
  destination: { latitude: number; longitude: number } | null,
): string | null {
  if (!origin) return 'Please set an origin point';
  if (!destination) return 'Please set a destination point';
  return null;
}

// Extract map movement logic.
function moveMapToRoute(
  mapRef: React.RefObject<MapView>,
  finalOrigin: { latitude: number; longitude: number },
  finalDestination: { latitude: number; longitude: number },
) {
  mapRef.current?.fitToCoordinates([finalOrigin, finalDestination], {
    edgePadding: EDGE_PADDING,
    animated: true,
  });
}

// The missing traceRouteOnReady function is defined here.
const traceRouteOnReady = (result: { distance: number; duration: number }) => {
  if (result) {
    setDistance(result.distance);
    setDuration(result.duration);
    setExpandedDirections(true);
  }
  fetchDetailedDirections(origin, destination, travelMode);
};

// -- Main Component --
export default function DirectionsScreen() {
  const { isBlackAndWhite, isLargeText } = useContext(AccessibilityContext);
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
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [steps, setSteps] = useState<{ html_instructions: string }[]>([]);
  const [showShuttleRoute, setShowShuttleRoute] = useState(false);
  const [expandedDirections, setExpandedDirections] = useState<boolean>(false);
  const [activeRouteTab, setActiveRouteTab] = useState<'standard' | 'shuttle'>(
    'standard',
  );
  const [travelMode, setTravelMode] =
    useState<MapViewDirectionsMode>('DRIVING');
  const [shuttleData, setShuttleData] = useState<ShuttleData | null>(null);
  const [showShuttles, setShowShuttles] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nextPointIsOrigin, setNextPointIsOrigin] = useState<boolean>(true);

  const mapRef = useRef<MapView>(null);
  const panY = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  // PanResponder for handling swipe gestures in the directions panel.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (
          gestureState.dy < 0 ||
          (expandedDirections && gestureState.dy > 0)
        ) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -20 && !expandedDirections) {
          Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
          setExpandedDirections(true);
        } else if (gestureState.dy > 20 && expandedDirections) {
          Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
          setExpandedDirections(false);
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  // Initialize location and shuttle tracking via custom hooks.
  useInitializeLocation(setUserLocation);
  useShuttleTracking(setShuttleData);

  const route = useRoute<
    RouteProp<
      Record<
        string,
        {
          origin?: { latitude: number; longitude: number };
          destination?: { latitude: number; longitude: number };
          travelMode?: MapViewDirectionsMode;
        }
      >,
      string
    >
  >();

  useEffect(() => {
    if (route.params?.origin && route.params?.destination) {
      setOrigin(route.params.origin);
      setDestination(route.params.destination);
      if (route.params.travelMode) setTravelMode(route.params.travelMode);
    } else if (route.params?.origin) {
      setOrigin(route.params.origin);
    } else if (route.params?.destination) {
      setDestination(route.params.destination);
    }
  }, [route.params]);

  // Toast fade effect.
  useEffect(() => {
    if (toastMessage) {
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      if (!process.env.JEST_WORKER_ID) {
        const timer = setTimeout(() => {
          Animated.timing(fadeInAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setToastMessage(null));
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [toastMessage]);

  // Toggle route tab based on shuttle route availability.
  useEffect(() => {
    setActiveRouteTab(showShuttleRoute ? 'shuttle' : 'standard');
  }, [showShuttleRoute]);

  // Update zoom level on region change.
  const onRegionChange = (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    const zoom = Math.round(Math.log(360 / region.latitudeDelta) / Math.LN2);
    setZoomLevel(zoom);
  };

  const moveTo = async (position: { latitude: number; longitude: number }) => {
    const camera = await mapRef.current?.getCamera();
    if (camera) {
      camera.center = position;
      mapRef.current?.animateCamera(camera, { duration: 1000 });
    }
  };

  const checkUserInBuilding = () => {
    if (!userLocation) return null;
    return isUserInBuilding(userLocation) || null;
  };

  const setSmartLocation = (
    position: { latitude: number; longitude: number },
    label: string,
  ) => {
    const snappedPosition = snapToNearestBuilding(position);
    if (nextPointIsOrigin) {
      setOrigin({ ...snappedPosition, name: label });
      setToastMessage(`${label} set as origin`);
      setNextPointIsOrigin(false);
    } else {
      setDestination({ ...snappedPosition, name: label });
      setToastMessage(`${label} set as destination`);
      setNextPointIsOrigin(true);
    }
    moveTo(snappedPosition);
  };

  const setCurrentLocationAsPoint = () => {
    if (!userLocation) {
      Alert.alert(
        'Location Not Available',
        'Please enable location services or manually set your starting point.',
      );
      return;
    }
    const buildingCenter = checkUserInBuilding();
    if (buildingCenter) {
      setSmartLocation(buildingCenter, 'Building location');
      Alert.alert(
        'Building Detected',
        "We've detected you're inside a Concordia building and have set your point accordingly.",
      );
    } else {
      setSmartLocation(userLocation, 'My Location');
    }
  };

  const onPlaceSelected = (data: any, details: any, flag: string) => {
    if (!details?.geometry?.location) {
      console.error('No location data in selected place', details);
      return;
    }
    const position = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    };
    const snappedPosition = snapToNearestBuilding(position);
    const placeName = details.name ?? data?.description ?? '';
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
        setSteps(leg?.steps || []);
      }
    } catch (err) {
      console.error('Directions fetch error', err);
    }
  };

  // --- Refactored traceRoute Function ---
  // Helper: Validate route points.
  function validateRoute(
    origin: { latitude: number; longitude: number } | null,
    destination: { latitude: number; longitude: number } | null,
  ): string | null {
    if (!origin) return 'Please set an origin point';
    if (!destination) return 'Please set a destination point';
    return null;
  }

  // Helper: Animate map to the route coordinates.
  function moveMapToRoute(
    mapRef: React.RefObject<MapView>,
    finalOrigin: { latitude: number; longitude: number },
    finalDestination: { latitude: number; longitude: number },
  ) {
    mapRef.current?.fitToCoordinates([finalOrigin, finalDestination], {
      edgePadding: EDGE_PADDING,
      animated: true,
    });
  }

  // Missing function: traceRouteOnReady – invoked when MapViewDirections is ready.
  const traceRouteOnReady = (result: {
    distance: number;
    duration: number;
  }) => {
    if (result) {
      setDistance(result.distance);
      setDuration(result.duration);
      setExpandedDirections(true);
    }
    fetchDetailedDirections(origin, destination, travelMode);
  };

  // Refactored traceRoute using helper functions.
  const traceRoute = () => {
    console.log('Tracing route with:', { origin, destination });
    const error = validateRoute(origin, destination);
    if (error) {
      setToastMessage(error);
      return;
    }
    const finalOrigin = snapToNearestBuilding(origin!);
    const finalDestination = snapToNearestBuilding(destination!);
    setShowDirections(true);
    setShowShuttleRoute(isShuttleRouteApplicable(origin, destination));
    moveMapToRoute(mapRef, finalOrigin, finalDestination);
    // Optionally fetch detailed directions after moving the map.
    fetchDetailedDirections(origin, destination, travelMode);
  };

  const setCampusPoint = (
    campusCoords: { latitude: number; longitude: number },
    campusName: string,
  ) => {
    setSmartLocation(campusCoords, campusName);
  };

  const toggleShuttles = () => {
    setShowShuttles(!showShuttles);
  };

  const resetOriginAndDestination = () => {
    setOrigin(null);
    setDestination(null);
    setNextPointIsOrigin(true);
  };

  const clearPoints = () => {
    resetOriginAndDestination();
    setShowDirections(false);
    setShowShuttleRoute(false);
    setSteps([]);
    setToastMessage('Points cleared');
    mapRef.current?.animateToRegion(INITIAL_POSITION, 1000);
  };

  // Determine map style based on accessibility settings.
  const mapStyle: MapStyleElement[] = getMapStyle(isBlackAndWhite);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {toastMessage && <Toast message={toastMessage} fadeInAnim={fadeInAnim} />}
      {userLocation && checkUserInBuilding() && (
        <View style={styles.buildingInfoBadge}>
          <Ionicons
            name="location"
            size={20}
            color={isBlackAndWhite ? '#000' : '#912338'}
            style={styles.buildingIcon}
          />
          <Text
            style={[styles.buildingInfoText, isLargeText && styles.largeText]}
          >
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
        {polygons.map((polygon, idx) => (
          <Polygon
            key={idx}
            coordinates={polygon.boundaries}
            fillColor={isBlackAndWhite ? '#00000033' : '#91233833'}
            strokeColor={isBlackAndWhite ? '#000000' : '#912338'}
            strokeWidth={2}
          />
        ))}
        {origin && (
          <Marker
            coordinate={origin}
            title="Origin"
            pinColor={isBlackAndWhite ? 'black' : 'green'}
          >
            <View
              style={[
                styles.customIconMarker,
                isBlackAndWhite ? styles.markerBW : styles.originMarker,
              ]}
            >
              <Ionicons name="locate" size={18} color="white" />
            </View>
          </Marker>
        )}
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
            pinColor={isBlackAndWhite ? 'black' : 'red'}
          >
            <View
              style={[
                styles.customIconMarker,
                isBlackAndWhite ? styles.markerBW : styles.destinationMarker,
              ]}
            >
              <Ionicons name="flag" size={18} color="white" />
            </View>
          </Marker>
        )}
        {showShuttles &&
          shuttleData?.buses.map((bus) => (
            <Marker
              key={bus.ID}
              coordinate={{ latitude: bus.Latitude, longitude: bus.Longitude }}
              title={`Shuttle ${bus.ID}`}
              testID={`marker-${bus.ID}`}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.customIconMarker,
                  isBlackAndWhite ? styles.markerBW : styles.shuttleMarker,
                ]}
              >
                <Ionicons name="bus" size={20} color="white" />
              </View>
            </Marker>
          ))}
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
              <View
                style={[
                  styles.customIconMarker,
                  isBlackAndWhite ? styles.markerBW : styles.stationMarker,
                ]}
              >
                <Ionicons name="bus-outline" size={20} color="white" />
              </View>
            </Marker>
          ))}
        {showDirections && origin && destination && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeColor={isBlackAndWhite ? '#000000' : '#912338'}
            strokeWidth={isBlackAndWhite ? 4 : 3}
            mode={travelMode}
            onReady={traceRouteOnReady}
            onError={(errorMsg) =>
              console.log('MapViewDirections ERROR:', errorMsg)
            }
          />
        )}
      </MapView>
      <MapControls
        isBlackAndWhite={isBlackAndWhite}
        userLocation={userLocation}
        onLocatePress={() => {
          if (userLocation) moveTo(userLocation);
        }}
        onToggleShuttles={toggleShuttles}
      />
      {!showDirections ? (
        <View
          style={[
            styles.searchContainer,
            isBlackAndWhite && styles.blackAndWhiteContainer,
          ]}
        >
          <InputAutocomplete
            label="Origin"
            placeholder="Enter starting point"
            onPlaceSelected={(data, details = null) =>
              onPlaceSelected(data, details, 'origin')
            }
            currentValue={
              origin ? `${formatLocationName(origin, userLocation)}` : undefined
            }
            isLargeText={isLargeText}
            isBlackAndWhite={isBlackAndWhite}
          />
          <InputAutocomplete
            label="Destination"
            placeholder="Enter destination"
            onPlaceSelected={(data, details = null) =>
              onPlaceSelected(data, details, 'destination')
            }
            currentValue={
              destination ? `${formatLocationName(destination)}` : undefined
            }
            isLargeText={isLargeText}
            isBlackAndWhite={isBlackAndWhite}
          />
          <View style={styles.quickActionsSection}>
            <Text
              style={[styles.sectionHeader, isLargeText && styles.largeText]}
            >
              Quick Actions
            </Text>
            <View style={styles.locationButtonsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={setCurrentLocationAsPoint}
                testID="myLocationBtn"
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
                testID="clearPointsBtn"
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
          <View style={styles.quickActionsSection}>
            <View style={styles.campusButtonsContainer}>
              <TouchableOpacity
                style={styles.campusPill}
                onPress={() => setCampusPoint(SGW_COORDS, 'SGW Campus')}
              >
                <Text
                  style={[
                    styles.campusPillText,
                    isLargeText && styles.largeText,
                  ]}
                >
                  SGW
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.campusPill}
                onPress={() => setCampusPoint(LOYOLA_COORDS, 'Loyola Campus')}
              >
                <Text
                  style={[
                    styles.campusPillText,
                    isLargeText && styles.largeText,
                  ]}
                >
                  Loyola
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.quickActionsSection}>
            <Text
              style={[styles.sectionHeader, isLargeText && styles.largeText]}
            >
              Travel Mode
            </Text>
            <View style={styles.modeContainer}>
              {['DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING'].map((mode) => {
                const modeIconColor =
                  travelMode === mode
                    ? 'white'
                    : isBlackAndWhite
                    ? 'black'
                    : '#912338';
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeButton,
                      travelMode === mode && styles.activeModeButton,
                    ]}
                    onPress={() => setTravelMode(mode as MapViewDirectionsMode)}
                    testID={`${mode}`}
                  >
                    <Ionicons
                      name={getModeIcon(mode as MapViewDirectionsMode)}
                      size={22}
                      color={modeIconColor}
                    />
                    <Text
                      style={
                        travelMode === mode
                          ? styles.activeModeButtonText
                          : styles.modeButtonText
                      }
                    >
                      {mode.charAt(0) + mode.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TouchableOpacity
            style={styles.traceButton}
            onPress={traceRoute}
            testID="findRouteBtn"
          >
            <Text
              style={[styles.traceButtonText, isLargeText && styles.largeText]}
            >
              Find Route
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowDirections(false);
              setShowShuttleRoute(false);
              setSteps([]);
              resetOriginAndDestination();
              setToastMessage('Returned to search view');
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
            <Text
              style={[styles.backButtonText, isLargeText && styles.largeText]}
            >
              Back
            </Text>
          </TouchableOpacity>
          {steps.length > 0 && (
            <DirectionsPanel
              steps={steps}
              origin={origin}
              destination={destination}
              distance={distance}
              duration={duration}
              panResponder={panResponder}
              panY={panY}
              isBlackAndWhite={isBlackAndWhite}
              isLargeText={isLargeText}
              expanded={expandedDirections}
              onToggleExpand={() => setExpandedDirections(!expandedDirections)}
              activeRouteTab={activeRouteTab}
              setActiveRouteTab={setActiveRouteTab}
              travelMode={travelMode}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  map: { width, height },
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
  inputContainer: { marginBottom: 2 },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  quickActionsSection: { marginVertical: 4 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
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
  clearButton: { backgroundColor: '#912338' },
  actionButtonIcon: { marginRight: 8 },
  actionButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
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
  campusPillText: { fontSize: 14, fontWeight: '600', color: '#333' },
  modeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
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
  activeModeButton: { backgroundColor: '#912338' },
  modeButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  activeModeButtonText: { color: 'white' },
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
  mapControls: { position: 'absolute', top: 20, right: 16, zIndex: 1 },
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
  markerBW: { backgroundColor: '#000000' },
  originMarker: { backgroundColor: '#4CAF50' },
  destinationMarker: { backgroundColor: '#F44336' },
  shuttleMarker: { backgroundColor: '#1E88E5' },
  stationMarker: { backgroundColor: '#4CAF50' },
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
  buildingIcon: { marginRight: 6 },
  buildingInfoText: { fontSize: 14, fontWeight: '500', color: '#333' },
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
  directionsHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  directionsIcon: { marginRight: 8 },
  directionsHeader: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  expandButton: { padding: 8 },
  routeSummary: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routePoints: { marginBottom: 10 },
  routePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  routePointDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  originDot: { backgroundColor: '#4CAF50' },
  destinationDot: { backgroundColor: '#F44336' },
  routeLineConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 5,
  },
  routePointText: { fontSize: 14, color: '#333', flex: 1 },
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
  routeMetricDivider: { width: 1, height: 20, backgroundColor: '#ddd' },
  routeMetricText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  contentContainer: { flex: 1, paddingHorizontal: 20 },
  scrollableContent: { flex: 1 },
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
  routeTabIcon: { marginRight: 8 },
  activeRouteTab: { borderBottomColor: '#912338' },
  routeTabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  activeRouteTabText: { color: '#912338', fontWeight: 'bold' },
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
  shuttleHeaderIcon: { marginRight: 8 },
  shuttleRouteHeaderText: { fontWeight: 'bold', fontSize: 16, color: '#333' },
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
  shuttleInfoIcon: { marginRight: 10 },
  shuttleRouteText: { fontSize: 14, color: '#555' },
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
  shuttleDetailItem: { alignItems: 'center', flex: 1 },
  shuttleDetailLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  shuttleDetailValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
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
  buttonIcon: { marginRight: 8 },
  shuttleScheduleButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
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
  stepsList: { marginBottom: 20 },
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
  stepNumber: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  stepText: { flex: 1, fontSize: 14, color: '#555', lineHeight: 20 },
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
  routeDetailsList: { marginTop: 5 },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeDetailsText: { fontSize: 14, color: '#555', marginLeft: 10 },
  scrollPadding: { height: 30 },
  largeText: { fontSize: 18 },
  blackAndWhiteText: { color: '#000000' },
  blackAndWhiteContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
});
