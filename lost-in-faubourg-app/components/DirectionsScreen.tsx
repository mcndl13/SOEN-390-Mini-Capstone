import React, { useRef, useState, useEffect } from 'react';
import {
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
  Region,
} from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
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
import styles from '../styles/DirectionsScreenStyles';

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
  origin?: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number };
  travelMode?: MapViewDirectionsMode;
};

const SGW_COORDS = { latitude: 45.4953534, longitude: -73.578549 };
const LOYOLA_COORDS = { latitude: 45.4582, longitude: -73.6405 };

//////////////////////////
// PanResponder Helpers //
//////////////////////////

function getPanGestureAction(
  dy: number,
  vy: number,
  isExpanded: boolean,
): 'expand' | 'collapse' | 'reset' {
  // Method 1: Determine based on displacement
  const shouldExpandByDisplacement = dy < -20 && !isExpanded;
  const shouldCollapseByDisplacement = dy > 20 && isExpanded;
  // Method 2: Determine based on vertical velocity
  const shouldExpandByVelocity = vy < -0.5 && !isExpanded;
  const shouldCollapseByVelocity = vy > 0.5 && isExpanded;

  if (shouldExpandByDisplacement || shouldExpandByVelocity) return 'expand';
  if (shouldCollapseByDisplacement || shouldCollapseByVelocity)
    return 'collapse';
  return 'reset';
}

function createPanResponder(
  panY: Animated.Value,
  expandedDirections: boolean,
  setExpandedDirections: React.Dispatch<React.SetStateAction<boolean>>,
  setDirectionsHeight: React.Dispatch<React.SetStateAction<number>>,
) {
  const expandDirections = () => {
    Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
    setExpandedDirections(true);
    setDirectionsHeight(height * 0.7);
  };
  const collapseDirections = () => {
    Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
    setExpandedDirections(false);
    setDirectionsHeight(180);
  };
  const resetDirections = () => {
    Animated.spring(panY, { toValue: 0, useNativeDriver: false }).start();
  };

  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy < 0 || (expandedDirections && gestureState.dy > 0)) {
        panY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const action = getPanGestureAction(
        gestureState.dy,
        gestureState.vy,
        expandedDirections,
      );
      if (action === 'expand') {
        expandDirections();
      } else if (action === 'collapse') {
        collapseDirections();
      } else {
        resetDirections();
      }
    },
  });
}

//////////////////////////
// Helper Components    //
//////////////////////////

export const stripHtml = (html = '') => html.replace(/<[^>]*>?/gm, '');

function InputAutocomplete({
  label,
  placeholder,
  onPlaceSelected,
  currentValue,
  isLargeText,
  isBlackAndWhite,
}: Readonly<{
  label: string;
  placeholder: string;
  onPlaceSelected: (data: any, details: any) => void;
  currentValue?: string;
  isLargeText?: boolean;
  isBlackAndWhite?: boolean;
}>) {
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
    listView: { marginTop: 5, borderRadius: 8, overflow: 'hidden' },
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
          onPress={(data, details = null) => onPlaceSelected(data, details)}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
            components: 'country:ca',
          }}
          styles={googleAutocompleteStyles}
          textInputProps={{ placeholderTextColor: '#999999' }}
          enablePoweredByContainer={false}
          minLength={2}
          debounce={300}
        />
      )}
    </View>
  );
}

function MapMarkers({
  origin,
  destination,
  shuttleData,
  showShuttles,
  isBlackAndWhite,
  getModeIcon,
  travelMode,
  showDirections,
  mapRef,
}: Readonly<{
  origin: { latitude: number; longitude: number; name?: string } | null;
  destination: { latitude: number; longitude: number; name?: string } | null;
  shuttleData: ShuttleData | null;
  showShuttles: boolean;
  isBlackAndWhite: boolean;
  getModeIcon: (mode: MapViewDirectionsMode) => keyof typeof Ionicons.glyphMap;
  travelMode: MapViewDirectionsMode;
  showDirections: boolean;
  mapRef: React.RefObject<MapView>;
}>) {
  return (
    <>
      {polygons.map((polygon) => (
        <Polygon
          key={polygon.name}
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
          onReady={() => {}}
          onError={(errorMsg) =>
            console.log('MapViewDirections ERROR:', errorMsg)
          }
        />
      )}
    </>
  );
}

// Define a union type for allowed Ionicons names
type IoniconsName =
  | 'bus'
  | 'calendar-outline'
  | 'list'
  | 'navigate-outline'
  | 'time-outline' /* | ... other allowed icon names */;

// Update getModeIcon to return IoniconsName
function getModeIcon(mode: MapViewDirectionsMode): IoniconsName {
  // Your logic to choose an icon name
  return mode === 'DRIVING' ? 'bus' : 'list';
}

interface PanelHeaderProps {
  readonly isBlackAndWhite: boolean;
  readonly isLargeText: boolean;
  readonly expandedDirections: boolean;
  readonly setExpandedDirections: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setDirectionsHeight: React.Dispatch<React.SetStateAction<number>>;
}

function PanelHeader({
  isBlackAndWhite,
  isLargeText,
  expandedDirections,
  setExpandedDirections,
  setDirectionsHeight,
}: PanelHeaderProps) {
  return (
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
        onPress={() => {
          const newState = !expandedDirections;
          setExpandedDirections(newState);
          setDirectionsHeight(
            newState ? Dimensions.get('window').height * 0.7 : 180,
          );
        }}
        testID="expandCollapseBtn"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons
            name={expandedDirections ? 'chevron-down' : 'chevron-up'}
            size={22}
            color={isBlackAndWhite ? '#000' : '#666'}
          />
          <Text>{expandedDirections ? 'Collapse' : 'Expand'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function RouteSummary({
  origin,
  destination,
  duration,
  distance,
  isLargeText,
}: Readonly<{
  origin: { latitude: number; longitude: number; name?: string } | null;
  destination: { latitude: number; longitude: number; name?: string } | null;
  duration: number;
  distance: number;
  isLargeText: boolean;
}>) {
  return (
    <View style={styles.routeSummary}>
      <View style={styles.routePoints}>
        <View style={styles.routePointRow}>
          <View style={[styles.routePointDot, styles.originDot]} />
          <Text
            style={[styles.routePointText, isLargeText && styles.largeText]}
            numberOfLines={1}
          >
            {origin ? origin.name ?? 'Origin' : 'Origin'}
          </Text>
        </View>
        <View style={styles.routeLineConnector} />
        <View style={styles.routePointRow}>
          <View style={[styles.routePointDot, styles.destinationDot]} />
          <Text
            style={[styles.routePointText, isLargeText && styles.largeText]}
            numberOfLines={1}
          >
            {destination ? destination.name ?? 'Destination' : 'Destination'}
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
  );
}

interface ShuttleRouteDetailsProps {
  readonly isBlackAndWhite: boolean;
  readonly isLargeText: boolean;
}

function ShuttleRouteDetails({
  isBlackAndWhite,
  isLargeText,
}: ShuttleRouteDetailsProps) {
  return (
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
            style={[styles.shuttleRouteText, isLargeText && styles.largeText]}
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
            style={[styles.shuttleRouteText, isLargeText && styles.largeText]}
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
            style={[styles.shuttleRouteText, isLargeText && styles.largeText]}
          >
            Usually faster than public transit
          </Text>
        </View>
      </View>

      <View style={styles.shuttleDetailRow}>
        <View style={styles.shuttleDetailItem}>
          <Text style={styles.shuttleDetailLabel}>Duration</Text>
          <Text
            style={[styles.shuttleDetailValue, isLargeText && styles.largeText]}
          >
            ~30 min
          </Text>
        </View>
        <View style={styles.shuttleDetailItem}>
          <Text style={styles.shuttleDetailLabel}>Distance</Text>
          <Text
            style={[styles.shuttleDetailValue, isLargeText && styles.largeText]}
          >
            ~6.8 km
          </Text>
        </View>
        <View style={styles.shuttleDetailItem}>
          <Text style={styles.shuttleDetailLabel}>Cost</Text>
          <Text
            style={[styles.shuttleDetailValue, isLargeText && styles.largeText]}
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
        <Text style={styles.shuttleScheduleButtonText}>View Schedule</Text>
      </TouchableOpacity>
    </View>
  );
}

type PanelContentProps = Readonly<{
  activeRouteTab: 'standard' | 'shuttle';
  showShuttleRoute: boolean;
  isBlackAndWhite: boolean;
  isLargeText: boolean;
  travelMode: string;
  getModeIcon: (mode: MapViewDirectionsMode) => keyof typeof Ionicons.glyphMap;
  setActiveRouteTab: React.Dispatch<
    React.SetStateAction<'standard' | 'shuttle'>
  >;
}>;

function PanelContent({
  activeRouteTab,
  showShuttleRoute,
  isBlackAndWhite,
  isLargeText,
  travelMode,
  getModeIcon,
  setActiveRouteTab,
  steps,
  distance,
  duration,
}: PanelContentProps & {
  steps: { html_instructions: string }[];
  distance: number;
  duration: number;
}) {
  const isShuttleTab = activeRouteTab === 'shuttle' && showShuttleRoute;

  const renderRouteTabs = () => {
    // Extracted nested ternary operation into an independent statement
    const isStandardTabActive = activeRouteTab === 'standard';

    let standardRouteIconColor = '#666';
    if (isStandardTabActive) {
      standardRouteIconColor = isBlackAndWhite ? '#000' : '#912338';
    }

    return (
      <View style={styles.routeTabsContainer}>
        <TouchableOpacity
          style={[
            styles.routeTab,
            activeRouteTab === 'standard' && styles.activeRouteTab,
          ]}
          onPress={() => setActiveRouteTab('standard')}
        >
          <Ionicons
            name={
              getModeIcon(travelMode as MapViewDirectionsMode) as IoniconsName
            }
            size={18}
            color={standardRouteIconColor}
            style={styles.routeTabIcon}
          />
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

        {showShuttleRoute && (
          <TouchableOpacity
            style={[
              styles.routeTab,
              activeRouteTab === 'shuttle' && styles.activeRouteTab,
            ]}
            onPress={() => setActiveRouteTab('shuttle')}
          >
            <Ionicons
              name="bus"
              size={18}
              color={standardRouteIconColor}
              style={styles.routeTabIcon}
            />
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
    );
  };

  const renderRouteSteps = () => (
    <>
      <View style={styles.directionsStepsHeader}>
        <Ionicons
          name="list"
          size={18}
          color={isBlackAndWhite ? '#000' : '#912338'}
        />
        <Text
          style={[styles.directionsStepsTitle, isLargeText && styles.largeText]}
        >
          Route Steps
        </Text>
      </View>
      <View style={[styles.stepsList, { paddingHorizontal: 16 }]}>
        {steps.map((step, index) => (
          <View
            style={styles.stepItem}
            key={`step-${index}-${stripHtml(step.html_instructions).slice(
              0,
              10,
            )}`}
          >
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepText, isLargeText && styles.largeText]}>
              {stripHtml(step.html_instructions)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );

  const renderRouteSummary = () => (
    <View style={styles.routeDetailsContainer}>
      <Text
        style={[styles.routeDetailsHeader, isLargeText && styles.largeText]}
      >
        Route Summary
      </Text>
      <View style={styles.routeDetailsList}>
        <View style={styles.routeDetailItem}>
          <Ionicons name="navigate-outline" size={18} color="#666" />
          <Text
            style={[styles.routeDetailsText, isLargeText && styles.largeText]}
          >
            Distance: {distance.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.routeDetailItem}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text
            style={[styles.routeDetailsText, isLargeText && styles.largeText]}
          >
            Duration: {Math.round(duration)} minutes
          </Text>
        </View>
        <View style={styles.routeDetailItem}>
          <Ionicons
            name={
              getModeIcon(travelMode as MapViewDirectionsMode) as IoniconsName
            }
            size={18}
            color="#666"
          />
          <Text
            style={[styles.routeDetailsText, isLargeText && styles.largeText]}
          >
            Travel Mode:{' '}
            {travelMode.charAt(0) + travelMode.slice(1).toLowerCase()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      {renderRouteTabs()}
      <ScrollView style={styles.scrollableContent}>
        {isShuttleTab ? (
          <ShuttleRouteDetails
            isBlackAndWhite={isBlackAndWhite}
            isLargeText={isLargeText}
          />
        ) : (
          <>
            {renderRouteSteps()}
            {renderRouteSummary()}
          </>
        )}
        <View style={styles.scrollPadding} />
      </ScrollView>
    </>
  );
}

// ...existing code...
function DirectionsPanel({
  steps,
  origin,
  destination,
  duration,
  distance,
  expandedDirections,
  isBlackAndWhite,
  isLargeText,
  panY,
  panResponder,
  activeRouteTab,
  setActiveRouteTab,
  travelMode,
  getModeIcon,
  showShuttleRoute,
  stripHtml,
  setExpandedDirections,
  setDirectionsHeight,
  directionsHeight,
}: {
  readonly steps: { html_instructions: string }[];
  readonly origin: {
    latitude: number;
    longitude: number;
    name?: string;
  } | null;
  readonly destination: {
    latitude: number;
    longitude: number;
    name?: string;
  } | null;
  readonly duration: number;
  readonly distance: number;
  readonly expandedDirections: boolean;
  readonly isBlackAndWhite: boolean;
  readonly isLargeText: boolean;
  readonly panY: any;
  readonly panResponder: any;
  readonly activeRouteTab: 'standard' | 'shuttle';
  readonly setActiveRouteTab: React.Dispatch<
    React.SetStateAction<'standard' | 'shuttle'>
  >;
  readonly travelMode: MapViewDirectionsMode;
  readonly getModeIcon: (
    mode: MapViewDirectionsMode,
  ) => keyof typeof Ionicons.glyphMap;
  readonly showShuttleRoute: boolean;
  readonly stripHtml: (html?: string) => string;
  readonly setExpandedDirections: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setDirectionsHeight: React.Dispatch<React.SetStateAction<number>>;
  readonly directionsHeight: number;
}) {
  return (
    <View style={[styles.directionsContainer, { height: directionsHeight }]}>
      <PanelHeader
        isBlackAndWhite={isBlackAndWhite}
        isLargeText={isLargeText}
        expandedDirections={expandedDirections}
        setExpandedDirections={setExpandedDirections}
        setDirectionsHeight={setDirectionsHeight}
      />
      <Animated.View
        style={[
          styles.dragHandleContainer,
          { transform: [{ translateY: panY }] },
        ]}
        {...panResponder.panHandlers}
      />
      <View style={styles.dragIndicator} />
      <RouteSummary
        origin={origin}
        destination={destination}
        duration={duration}
        distance={distance}
        isLargeText={isLargeText}
      />

      {/* The scrollable content with tabs for standard vs shuttle */}
      <View style={{ flex: 1 }}>
        <PanelContent
          activeRouteTab={activeRouteTab}
          showShuttleRoute={showShuttleRoute}
          isBlackAndWhite={isBlackAndWhite}
          isLargeText={isLargeText}
          travelMode={travelMode} // added travelMode prop
          getModeIcon={getModeIcon}
          setActiveRouteTab={setActiveRouteTab} // added setActiveRouteTab prop
          steps={steps}
          duration={duration}
          distance={distance}
        />
      </View>
    </View>
  );
}

////////////////////
// Main Component //
////////////////////

export default function DirectionsScreen() {
  const { isBlackAndWhite, isLargeText } =
    React.useContext(AccessibilityContext);
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
  const [expandedDirections, setExpandedDirections] = useState(false);
  const [directionsHeight, setDirectionsHeight] = useState(180);
  const [activeRouteTab, setActiveRouteTab] = useState<'standard' | 'shuttle'>(
    'standard',
  );
  const [travelMode, setTravelMode] =
    useState<MapViewDirectionsMode>('DRIVING');
  const [shuttleData, setShuttleData] = useState<ShuttleData | null>(null);
  const [showShuttles, setShowShuttles] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nextPointIsOrigin, setNextPointIsOrigin] = useState(true);

  const mapRef = useRef<MapView>(null);
  const panY = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    createPanResponder(
      panY,
      expandedDirections,
      setExpandedDirections,
      setDirectionsHeight,
    ),
  ).current;

  const route = useRoute<RouteProp<Record<string, DirectionsParams>, string>>();

  useEffect(() => {
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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
          }).start(() => {
            setToastMessage(null);
          });
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [toastMessage]);

  useEffect(() => {
    setActiveRouteTab(showShuttleRoute ? 'shuttle' : 'standard');
  }, [showShuttleRoute]);

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) {
      setUserLocation({ latitude: 45.0, longitude: -73.0 });
      return;
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    })();
  }, []);

  useEffect(() => {
    const stopTracking = startShuttleTracking(
      (data) => setShuttleData(data),
      15000,
    );
    return () => stopTracking();
  }, []);

  const moveTo = async (position: { latitude: number; longitude: number }) => {
    const camera = await mapRef.current?.getCamera();
    if (camera) {
      camera.center = position;
      mapRef.current?.animateCamera(camera, { duration: 1000 });
    }
  };

  const checkUserInBuilding = () =>
    userLocation && isUserInBuilding(userLocation);
  const snapToNearestBuilding = (point: {
    latitude: number;
    longitude: number;
  }) => isUserInBuilding(point) || point;
  const formatLocationName = (
    location:
      | { latitude: number; longitude: number; name?: string }
      | null
      | undefined,
    currentUserLocation?: { latitude: number; longitude: number } | null,
  ) => {
    if (!location) return '';
    if (location.name) return location.name;
    if (
      Math.abs(location.latitude - SGW_COORDS.latitude) < 0.001 &&
      Math.abs(location.longitude - SGW_COORDS.longitude) < 0.001
    )
      return 'SGW Campus';
    if (
      Math.abs(location.latitude - LOYOLA_COORDS.latitude) < 0.001 &&
      Math.abs(location.longitude - LOYOLA_COORDS.longitude) < 0.001
    )
      return 'Loyola Campus';
    if (
      currentUserLocation &&
      Math.abs(location.latitude - currentUserLocation.latitude) < 0.0001 &&
      Math.abs(location.longitude - currentUserLocation.longitude) < 0.0001
    )
      return 'My Current Location';
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  function distanceBetween(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number },
  ): number {
    const R = 6371;
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const isShuttleRouteApplicable = () => {
    if (process.env.JEST_WORKER_ID) return false;
    if (!origin || !destination) return false;
    const finalOrigin = snapToNearestBuilding(origin);
    const finalDestination = snapToNearestBuilding(destination);
    const isOriginNearSGW = distanceBetween(finalOrigin, SGW_COORDS) < 0.5;
    const isOriginNearLoyola =
      distanceBetween(finalOrigin, LOYOLA_COORDS) < 0.5;
    const isDestNearSGW = distanceBetween(finalDestination, SGW_COORDS) < 0.5;
    const isDestNearLoyola =
      distanceBetween(finalDestination, LOYOLA_COORDS) < 0.5;
    return (
      (isOriginNearSGW && isDestNearLoyola) ||
      (isOriginNearLoyola && isDestNearSGW)
    );
  };

  const edgePadding = { top: 70, right: 70, bottom: 70, left: 70 };

  const traceRouteOnReady = (result: {
    distance: number;
    duration: number;
  }) => {
    if (result) {
      setDistance(result.distance);
      setDuration(result.duration);
      // Always expand the panel on route ready so the button displays "Collapse"
      setExpandedDirections(true);
      setDirectionsHeight(height * 0.7);
    }
    fetchDetailedDirections(origin, destination, travelMode);
  };

  const fetchDetailedDirections = async (
    orig: { latitude: number; longitude: number } | null,
    dest: { latitude: number; longitude: number } | null,
    mode: string,
  ) => {
    try {
      if (!orig || !dest) return;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${
        orig.latitude
      },${orig.longitude}&destination=${dest.latitude},${
        dest.longitude
      }&mode=${mode.toLowerCase()}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Directions API response:', data.status);
      if (data.routes?.length) {
        const leg = data.routes[0].legs?.[0];
        setSteps(leg?.steps ?? []);
      }
    } catch (err) {
      console.error('Directions fetch error', err);
    }
  };

  function traceRoute() {
    console.log('Tracing route with:', { origin, destination });
    if (!origin) {
      setToastMessage('Please set an origin point');
      return;
    }
    if (!destination) {
      setToastMessage('Please set a destination point');
      return;
    }
    const finalOrigin = snapToNearestBuilding(origin);
    const finalDestination = snapToNearestBuilding(destination);
    setShowDirections(true);
    setShowShuttleRoute(isShuttleRouteApplicable());
    mapRef.current?.fitToCoordinates([finalOrigin, finalDestination], {
      edgePadding,
      animated: true,
    });
  }

  function onPlaceSelected(data: any, details: any, flag: string) {
    if (!details?.geometry?.location) {
      console.error('No location data in selected place', details);
      return;
    }
    const position = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
    };
    const snappedPosition = snapToNearestBuilding(position);
    const newLocation = {
      ...snappedPosition,
      name: details.name ?? data?.description ?? '',
    };
    if (flag === 'origin') {
      setOrigin(newLocation);
      setToastMessage('Origin set');
    } else {
      setDestination(newLocation);
      setToastMessage('Destination set');
    }
    moveTo(snappedPosition);
  }

  function setSmartLocation(
    position: { latitude: number; longitude: number },
    label: string,
  ) {
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
  }

  function setCurrentLocationAsPoint() {
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
  }

  function clearPoints() {
    setOrigin(null);
    setDestination(null);
    setNextPointIsOrigin(true);
    setShowDirections(false);
    setShowShuttleRoute(false);
    setSteps([]);
    setToastMessage('Points cleared');
    mapRef.current?.animateToRegion(INITIAL_POSITION, 1000);
  }

  function toggleShuttles() {
    setShowShuttles(!showShuttles);
  }

  const getModeIcon = (mode: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<MapViewDirectionsMode, keyof typeof Ionicons.glyphMap> =
      {
        DRIVING: 'car-outline',
        WALKING: 'walk-outline',
        BICYCLING: 'bicycle-outline',
        TRANSIT: 'bus-outline',
      };
    return icons[mode as MapViewDirectionsMode] ?? 'navigate-outline';
  };

  function onRegionChange(region: Region) {
    console.log('Region changed to:', region);
  }

  // --- Render Helpers ---
  const renderSearchContainer = () => (
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
          origin ? formatLocationName(origin, userLocation) : undefined
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
        currentValue={destination ? formatLocationName(destination) : undefined}
        isLargeText={isLargeText}
        isBlackAndWhite={isBlackAndWhite}
      />

      <View style={styles.quickActionsSection}>
        <Text style={[styles.sectionHeader, isLargeText && styles.largeText]}>
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
            onPress={() => setSmartLocation(SGW_COORDS, 'SGW Campus')}
          >
            <Text
              style={[styles.campusPillText, isLargeText && styles.largeText]}
            >
              SGW
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.campusPill}
            onPress={() => setSmartLocation(LOYOLA_COORDS, 'Loyola Campus')}
          >
            <Text
              style={[styles.campusPillText, isLargeText && styles.largeText]}
            >
              Loyola
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={[styles.sectionHeader, isLargeText && styles.largeText]}>
          Travel Mode
        </Text>
        <View style={styles.modeContainer}>
          {['DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING'].map((mode) => (
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
                color={
                  travelMode === mode
                    ? 'white'
                    : (() => {
                        const color = isBlackAndWhite ? 'black' : '#912338';
                        return color;
                      })()
                }
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
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.traceButton}
        onPress={traceRoute}
        testID="findRouteBtn"
      >
        <Text style={[styles.traceButtonText, isLargeText && styles.largeText]}>
          Find Route
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderBackButton = () => (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => {
        setShowDirections(false);
        setShowShuttleRoute(false);
        setSteps([]);
        setOrigin(null);
        setDestination(null);
        setNextPointIsOrigin(true);
        setToastMessage('Returned to search view');
      }}
    >
      <Ionicons name="arrow-back" size={20} color="white" />
      <Text style={[styles.backButtonText, isLargeText && styles.largeText]}>
        Back
      </Text>
    </TouchableOpacity>
  );

  // --- Main Render ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {toastMessage && (
        <Animated.View
          style={[styles.toastContainer, { opacity: fadeInAnim }]}
          testID="toastMessage"
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
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
        customMapStyle={
          isBlackAndWhite
            ? [
                { elementType: 'geometry', stylers: [{ saturation: -100 }] },
                {
                  elementType: 'labels.text.fill',
                  stylers: [{ saturation: -100 }],
                },
                {
                  elementType: 'labels.text.stroke',
                  stylers: [{ saturation: -100 }],
                },
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
              ]
        }
        onRegionChangeComplete={onRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        <MapMarkers
          origin={origin}
          destination={destination}
          shuttleData={shuttleData}
          showShuttles={showShuttles}
          isBlackAndWhite={isBlackAndWhite}
          getModeIcon={getModeIcon}
          travelMode={travelMode}
          showDirections={showDirections}
          mapRef={mapRef}
        />
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
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => userLocation && moveTo(userLocation)}
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
          onPress={toggleShuttles}
          testID="shuttlesBtn"
        >
          <Ionicons
            name="bus"
            size={24}
            color={(() => {
              const color = isBlackAndWhite ? '#000' : '#757575';
              return showShuttles ? '#1E88E5' : color;
            })()}
          />
        </TouchableOpacity>
      </View>
      {!showDirections ? renderSearchContainer() : renderBackButton()}
      {steps.length > 0 && (
        <DirectionsPanel
          steps={steps}
          origin={origin}
          destination={destination}
          duration={duration}
          distance={distance}
          expandedDirections={expandedDirections}
          isBlackAndWhite={isBlackAndWhite}
          isLargeText={isLargeText}
          panY={panY}
          panResponder={panResponder}
          activeRouteTab={activeRouteTab}
          setActiveRouteTab={setActiveRouteTab}
          travelMode={travelMode}
          getModeIcon={getModeIcon}
          showShuttleRoute={showShuttleRoute}
          stripHtml={stripHtml}
          setExpandedDirections={setExpandedDirections}
          setDirectionsHeight={setDirectionsHeight}
          directionsHeight={directionsHeight}
        />
      )}
    </View>
  );
}
