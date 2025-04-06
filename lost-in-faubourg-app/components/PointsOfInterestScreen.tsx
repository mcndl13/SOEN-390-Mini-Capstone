import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import MapView, { 
  Marker, 
  Polygon, 
  PROVIDER_DEFAULT,  
  Region,
  MapStyleElement
} from 'react-native-maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { polygons } from '../components/polygonCoordinates';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibilityContext } from './AccessibilitySettings';

// Constants
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005; // Smaller delta for closer zoom
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Default map region near SGW
const INITIAL_POSITION: Region = {
  latitude: 45.4953534,
  longitude: -73.578549,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

// Define interfaces for our data types
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface POI {
  id: string;
  name: string;
  type: string;
  coordinates: Coordinates;
  description: string;
  address: string;
  rating: number | string;
  place_id: string;
}

// Quick search options
interface QuickSearchOption {
  id: string;
  name: string;
  icon: string;
}

// Define quick search options
const QUICK_SEARCH_OPTIONS: QuickSearchOption[] = [
  { id: 'library', name: 'Library', icon: 'book' },
  { id: 'restaurant', name: 'Restaurant', icon: 'restaurant' },
  { id: 'cafe', name: 'Cafe', icon: 'cafe' },
];

// POI type mapping for icons
const POI_TYPE_ICONS: Record<string, string> = {
  'library': 'book',
  'restaurant': 'restaurant',
  'cafe': 'cafe',
  'gym': 'fitness',
  'bookstore': 'book-outline',
  'default': 'location'
};

// Helper Components
const LoadingIndicator = ({ isLoading, isBlackAndWhite, isLargeText }) => {
  if (!isLoading) return null;
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={isBlackAndWhite ? "#333" : "#912338"} />
      <Text style={[
        styles.loadingText, 
        isBlackAndWhite && { color: "#333" }, 
        isLargeText && { fontSize: 18 }
      ]}>
        Loading...
      </Text>
    </View>
  );
};

const MessageBanner = ({ message, isLargeText }) => {
  if (!message) return null;
  
  return (
    <View style={styles.messageBanner}>
      <Text style={[styles.messageText, isLargeText && { fontSize: 16 }]}>
        {message}
      </Text>
    </View>
  );
};

const SearchBar = ({ searchQuery, setSearchQuery, handleSearch, isLoading, isLargeText, isBlackAndWhite, searchInputRef }) => (
  <View style={styles.searchContainer}>
    <View style={styles.searchBarWrapper}>
      <TextInput
        ref={searchInputRef}
        style={[styles.searchInput, isLargeText && { fontSize: 18 }]}
        placeholder="Search for places..."
        placeholderTextColor="#999999"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      <TouchableOpacity 
        style={[styles.searchButton, isBlackAndWhite && { backgroundColor: "#333" }]}
        onPress={handleSearch}
        disabled={isLoading}
      >
        <Ionicons name="search" size={22} color="white" />
      </TouchableOpacity>
    </View>
  </View>
);

const MapControls = ({ onLocate, isBlackAndWhite }) => (
  <View style={styles.mapControls}>
    <TouchableOpacity 
      style={styles.mapControlButton} 
      onPress={onLocate}
    >
      <Ionicons 
        name="locate" 
        size={22} 
        color={isBlackAndWhite ? "#000" : "#912338"} 
      />
    </TouchableOpacity>
  </View>
);

const QuickSearchButtons = ({ options, searchQuery, handleQuickSearch, isLoading, isLargeText, isBlackAndWhite }) => (
  <View style={styles.quickSearchContainer}>
    {options.map((option) => (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.quickSearchButton,
          searchQuery === option.id && (isBlackAndWhite ? styles.selectedPillBW : styles.selectedPill)
        ]}
        onPress={() => handleQuickSearch(option.id)}
        disabled={isLoading}
      >
        {(() => {
          // Extract the nested ternary into a constant
          const iconColor = searchQuery === option.id 
            ? "white" 
            : (isBlackAndWhite ? "#000" : "#333");
            
          return (
            <Ionicons 
              name={option.icon} 
              size={18} 
              color={iconColor} 
              style={styles.quickSearchIcon} 
            />
          );
        })()}
        <Text 
          style={[
            styles.quickSearchText, 
            isLargeText && { fontSize: 16 },
            searchQuery === option.id && styles.selectedPillText
          ]}
          testID='quickSearchText'
        >
          {option.name}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const POIInfoCard = ({ 
  selectedPOI, 
  closeInfo, 
  getDirections, 
  slideAnimation, 
  fadeAnimation, 
  isBlackAndWhite, 
  isLargeText 
}) => {
  if (!selectedPOI) return null;
  
  const infoContainerTranslateY = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });
  
  return (
    <Animated.View 
      style={[
        styles.infoCard,
        {
          transform: [{ translateY: infoContainerTranslateY }],
          opacity: fadeAnimation
        },
        isBlackAndWhite && styles.infoCardBW
      ]}
    >
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={closeInfo}
      >
        <Ionicons 
          name="close" 
          size={24} 
          color={isBlackAndWhite ? "#000" : "#912338"} 
        />
      </TouchableOpacity>
      
      <Text style={[styles.poiName, isLargeText && styles.largeText]}>
        {selectedPOI.name}
      </Text>
      
      <View style={styles.addressContainer}>
        <Ionicons 
          name="location" 
          size={18} 
          color={isBlackAndWhite ? "#000" : "#912338"} 
          style={styles.addressIcon} 
        />
        <Text style={[styles.address, isLargeText && styles.largeText]}>
          {selectedPOI.address}
        </Text>
      </View>
      
      <View style={styles.separator} />
      
      <ScrollView style={styles.scrollableContent}>
        {selectedPOI.rating !== 'N/A' && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons 
                name="star" 
                size={20} 
                color={isBlackAndWhite ? "#000" : "#FFC107"} 
              />
              <Text style={[styles.sectionTitle, isLargeText && styles.largeText]}>
                Rating
              </Text>
            </View>
            <Text style={[styles.ratingText, isLargeText && styles.largeText]}>
              {selectedPOI.rating} / 5
            </Text>
          </View>
        )}
        
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons 
              name="information-circle" 
              size={20} 
              color={isBlackAndWhite ? "#000" : "#912338"} 
            />
            <Text style={[styles.sectionTitle, isLargeText && styles.largeText]}>
              Description
            </Text>
          </View>
          <Text style={[styles.description, isLargeText && styles.largeText]}>
            {selectedPOI.description ?? "No description available."}
          </Text>
        </View>
        
        {/* Add extra padding at the bottom for better scrolling */}
        <View style={styles.scrollPadding} />
      </ScrollView>
      
      <TouchableOpacity
        style={[
          styles.directionsButton,
          isBlackAndWhite && styles.directionsButtonBW
        ]}
        onPress={() => getDirections(selectedPOI)}
        testID="getDirectionsButton"
      >
        <Ionicons 
          name="navigate" 
          size={20} 
          color="white" 
        />
        <Text style={[styles.directionsText, isLargeText && { fontSize: 16 }]}>
          Get Directions
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Utility Functions
const createMapStyle = (isBlackAndWhite: boolean): MapStyleElement[] => {
  if (isBlackAndWhite) {
    return [
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
    ];
  }
  
  return [
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }]
    }
  ];
};

const determinePoiType = (types: string[]): string => {
  if (!types || types.length === 0) return 'default';
  
  for (const type of types) {
    if (type === 'library') return 'library';
    if (type === 'book_store') return 'bookstore';
    if (type === 'restaurant') return 'restaurant';
    if (type === 'cafe' || type === 'bar') return 'cafe';
    if (type === 'gym') return 'gym';
  }
  return 'default';
};

// Main Component
export default function POIScreen() {
  // Context and hooks
  const { isBlackAndWhite, isLargeText } = useContext(AccessibilityContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  
  // Refs
  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  
  // State
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [_mapReady, setMapReady] = useState<boolean>(false);
  
  // Animation values
  const [slideAnimation] = useState(new Animated.Value(0));
  const [fadeAnimation] = useState(new Animated.Value(0));
  
  // Map style
  const mapStyle = createMapStyle(isBlackAndWhite);
  
  // Message timeout effect
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Get user location on mount
  useEffect(() => {
    getUserLocation();
  }, []);

  // Animation effect for selected POI
  useEffect(() => {
    animateInfoPanel();
  }, [selectedPOI]);
  
  // Animate POI info panel
  const animateInfoPanel = useCallback(() => {
    if (selectedPOI) {
      // Animate in the info panel
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation values when deselecting
      slideAnimation.setValue(0);
      fadeAnimation.setValue(0);
    }
  }, [selectedPOI, slideAnimation, fadeAnimation]);
  
  // Get user location
  const getUserLocation = async () => {
    setIsLoading(true);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMessage('Location permission is required');
        setIsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setUserLocation(userLoc);
      
      // Fetch default POIs near user location (e.g., popular places)
      if (userLoc) {
        await fetchPOIsNearby(userLoc, 'restaurant'); // Start with restaurants as default
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      setMessage('Could not determine your location');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch POIs from Google Places API
  const fetchPOIsNearby = useCallback(async (location: Coordinates, query: string) => {
    try {
      setIsLoading(true);
      
      const radius = 300; // 300m radius
      
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${location.latitude},${location.longitude}&` +
        `radius=${radius}&` +
        `key=${GOOGLE_MAPS_API_KEY}`;
      
      // If we have a search query, use the text search API instead
      if (query && query.trim() !== '') {
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
          `query=${encodeURIComponent(query)}&` +
          `location=${location.latitude},${location.longitude}&` +
          `radius=${radius}&` +
          `key=${GOOGLE_MAPS_API_KEY}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.error('Places API Error:', data.status);
        setMessage('Error fetching places');
        setPois([]);
        return;
      }
      
      // Map the response to our POI interface
      const mappedPOIs: POI[] = data.results.map((place: any) => ({
        id: place.place_id,
        name: place.name,
        type: determinePoiType(place.types),
        coordinates: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        description: place.vicinity ?? place.formatted_address ?? '',
        address: place.vicinity ?? place.formatted_address ?? '',
        rating: place.rating ?? 'N/A',
        place_id: place.place_id
      }));
      
      setPois(mappedPOIs);
      
      if (mappedPOIs.length === 0) {
        setMessage('No places found');
      } else {
        setMessage(`Found ${mappedPOIs.length} places`);
        
        // Fit map to show all markers
        if (mappedPOIs.length > 0) {
          const coords = mappedPOIs.map(poi => poi.coordinates);
          if (userLocation) {
            coords.push(userLocation);
          }
          fitMapToCoordinates(coords);
        }
      }
    } catch (error) {
      console.error('Error fetching POIs:', error);
      setMessage('Failed to fetch places');
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);
  
  // Handle search submission
  const handleSearch = useCallback(() => {
    if (userLocation) {
      fetchPOIsNearby(userLocation, searchQuery);
      Keyboard.dismiss();
    } else {
      setMessage('Location not available');
    }
  }, [userLocation, searchQuery, fetchPOIsNearby]);
  
  // Handle quick search option selection
  const handleQuickSearch = useCallback((searchType: string) => {
    setSearchQuery(searchType);
    if (userLocation) {
      fetchPOIsNearby(userLocation, searchType);
    } else {
      setMessage('Location not available');
    }
  }, [userLocation, fetchPOIsNearby]);
  
  // Fit map to show all markers
  const fitMapToCoordinates = useCallback((coordinates: Coordinates[]) => {
    if (!mapRef.current || coordinates.length === 0) return;
    
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
      animated: true
    });
  }, []);
  
  // Navigate to directions
  const getDirections = useCallback((poi: POI) => {
    if (!userLocation) {
      setMessage('Your location is not available');
      return;
    }

    closeInfo();
    
    // Short delay to allow the info panel to close smoothly
    setTimeout(() => {
      navigation.navigate('Directions', {
        origin: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          name: 'My Location'
        },
        destination: {
          latitude: poi.coordinates.latitude,
          longitude: poi.coordinates.longitude,
          name: poi.name
        },
        travelMode: 'WALKING' // Set walking as the default travel mode
      });
    }, 100);
  }, [userLocation, navigation]);

  // Close POI info panel
  const closeInfo = useCallback(() => {
    Animated.timing(fadeAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedPOI(null);
    });
  }, [fadeAnimation]);

  // Handle locate button
  const handleLocate = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA
      }, 500);
    }
  }, [userLocation]);

  // Render POI markers
  const renderPOIMarkers = () => {
    return pois.map((poi) => (
      <Marker
        key={poi.id}
        coordinate={poi.coordinates}
        title={poi.name}
        description={poi.description}
        onPress={() => setSelectedPOI(poi)}
        pinColor={isBlackAndWhite ? "black" : undefined}
      >
        <View style={[
          styles.customIconMarker,
          isBlackAndWhite ? styles.markerBW : styles.markerColor
        ]}>
          <Ionicons
            name={POI_TYPE_ICONS[poi.type] || POI_TYPE_ICONS.default}
            size={18}
            color="white"
            testID={`icon-${poi.type ?? 'default'}`}
          />
        </View>
      </Marker>
    ));
  };

  // Render building polygons
  const renderBuildingPolygons = () => {
    return polygons.map((polygon, idx) => (
      <Polygon
        key={idx}
        coordinates={polygon.boundaries}
        fillColor={isBlackAndWhite ? "#00000033" : "#91233833"}
        strokeColor={isBlackAndWhite ? "#000000" : "#912338"}
        strokeWidth={2}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <MessageBanner 
        message={message} 
        isLargeText={isLargeText} 
      />
      
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_POSITION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        customMapStyle={mapStyle}
        onMapReady={() => setMapReady(true)}
        onPress={() => selectedPOI && closeInfo()}
        testID="mapView"
      >
        {renderBuildingPolygons()}
        {renderPOIMarkers()}
      </MapView>
      
      <LoadingIndicator 
        isLoading={isLoading} 
        isBlackAndWhite={isBlackAndWhite} 
        isLargeText={isLargeText} 
      />
      
      <SearchBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        isLoading={isLoading}
        isLargeText={isLargeText}
        isBlackAndWhite={isBlackAndWhite}
        searchInputRef={searchInputRef}
      />
      
      <MapControls 
        onLocate={handleLocate} 
        isBlackAndWhite={isBlackAndWhite} 
      />
      
      <QuickSearchButtons 
        options={QUICK_SEARCH_OPTIONS}
        searchQuery={searchQuery}
        handleQuickSearch={handleQuickSearch}
        isLoading={isLoading}
        isLargeText={isLargeText}
        isBlackAndWhite={isBlackAndWhite}
      />
      
      <POIInfoCard 
        selectedPOI={selectedPOI}
        closeInfo={closeInfo}
        getDirections={getDirections}
        slideAnimation={slideAnimation}
        fadeAnimation={fadeAnimation}
        isBlackAndWhite={isBlackAndWhite}
        isLargeText={isLargeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  // Loading indicator
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#912338',
  },
  // Message banner
  messageBanner: {
    position: 'absolute',
    top: Constants.statusBarHeight + 10,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    zIndex: 200,
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  // Search bar
  searchContainer: {
    position: 'absolute',
    top: Constants.statusBarHeight + 60,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    zIndex: 150,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#912338',
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  // Map controls
  mapControls: {
    position: 'absolute',
    top: Constants.statusBarHeight + 70,
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
  // Marker styles
  customIconMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  markerColor: {
    backgroundColor: '#912338',
  },
  markerBW: {
    backgroundColor: '#000000',
  },
  // Quick search options
  quickSearchContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  quickSearchButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginHorizontal: 6,
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedPill: {
    backgroundColor: '#912338',
  },
  selectedPillBW: {
    backgroundColor: '#000000',
  },
  quickSearchIcon: {
    marginRight: 8,
  },
  quickSearchText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedPillText: {
    color: 'white',
  },
  // POI Info Card
  infoCard: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 70,
    maxHeight: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoCardBW: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  poiName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  address: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  scrollableContent: {
    maxHeight: 170,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  directionsButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#912338',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  directionsButtonBW: {
    backgroundColor: '#000000',
  },
  directionsText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  largeText: {
    fontSize: 20,
  },
  scrollPadding: {
    height: 20,
  },
});