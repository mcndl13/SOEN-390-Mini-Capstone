import React, { useRef, useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import MapView, { 
  Marker, 
  Polygon, 
  PROVIDER_DEFAULT, 
  Callout, 
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
  { id: 'library', name: 'Library', icon: '📚' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'cafe', name: 'Cafe', icon: '☕' },
];

// POI type mapping for icons
const POI_TYPE_ICONS: Record<string, string> = {
  'library': '📚',
  'restaurant': '🍽️',
  'cafe': '☕',
  'gym': '💪',
  'bookstore': '📖',
  'default': '📍'
};

export default function POIScreen() {
  const { isBlackAndWhite, isLargeText } = useContext(AccessibilityContext);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  
  // Black and white map style for accessibility
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
  ] : [];
  
  // Message timeout effect
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Get user location and fetch nearby POIs on mount
  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  // Fetch POIs from Google Places API
  const fetchPOIsNearby = async (location: Coordinates, query: string) => {
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
        setPOIs([]);
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
        description: place.vicinity || place.formatted_address || '',
        address: place.vicinity || place.formatted_address || '',
        rating: place.rating || 'N/A',
        place_id: place.place_id
      }));
      
      setPOIs(mappedPOIs);
      
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
  };
  
  // Handle search submission
  const handleSearch = () => {
    if (userLocation) {
      fetchPOIsNearby(userLocation, searchQuery);
      Keyboard.dismiss();
    } else {
      setMessage('Location not available');
    }
  };
  
  // Handle quick search option selection
  const handleQuickSearch = (searchType: string) => {
    setSearchQuery(searchType);
    if (userLocation) {
      fetchPOIsNearby(userLocation, searchType);
    } else {
      setMessage('Location not available');
    }
  };
  
  // Helper to determine POI type from Google Places types
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
  
  // Fit map to show all markers
  const fitMapToCoordinates = (coordinates: Coordinates[]) => {
    if (!mapRef.current || coordinates.length === 0) return;
    
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
      animated: true
    });
  };
  
  // Navigate to directions
  const getDirections = (poi: POI) => {
    if (!userLocation) {
      setMessage('Your location is not available');
      return;
    }
    
    // Looking at the DirectionsScreen, it expects a direct latitude/longitude object
    navigation.navigate('Directions', {
      origin: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      },
      destination: {
        latitude: poi.coordinates.latitude,
        longitude: poi.coordinates.longitude
      }
    });
    
    // After navigation, show a message to help the user
    setTimeout(() => {
      setMessage('Tap "Trace route" to see directions');
    }, 500);
  };

  return (
    <View style={styles.container}>
      {/* Message Banner */}
      {message && (
        <View style={styles.messageBanner}>
          <Text style={[styles.messageText, isLargeText && { fontSize: 16 }]}>
            {message}
          </Text>
        </View>
      )}
      
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_POSITION}
        showsUserLocation={true}
        showsMyLocationButton={true}
        customMapStyle={mapStyle}
      >
        {/* Polygons for Concordia buildings */}
        {polygons.map((polygon, idx) => (
          <Polygon
            key={idx}
            coordinates={polygon.boundaries}
            fillColor={isBlackAndWhite ? "#333333cc" : "#912338cc"}
            strokeColor={isBlackAndWhite ? "#333333cc" : "#912338cc"}
            strokeWidth={2}
          />
        ))}

        {/* POI Markers */}
        {pois.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={poi.coordinates}
            title={poi.name}
            description={poi.description}
            onPress={() => setSelectedPOI(poi)}
            pinColor={isBlackAndWhite ? "black" : undefined}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerIcon}>
                {POI_TYPE_ICONS[poi.type] || POI_TYPE_ICONS.default}
              </Text>
            </View>
            <Callout tooltip onPress={() => getDirections(poi)}>
              <View style={styles.calloutContainer}>
                <Text style={[styles.calloutTitle, isLargeText && { fontSize: 16 }]}>{poi.name}</Text>
                <Text style={[styles.calloutAddress, isLargeText && { fontSize: 14 }]}>{poi.address}</Text>
                {poi.rating !== 'N/A' && (
                  <Text style={[styles.calloutRating, isLargeText && { fontSize: 14 }]}>Rating: {poi.rating} ⭐</Text>
                )}
                <View style={styles.directionsButton}>
                  <Ionicons name="navigate" size={isLargeText ? 18 : 16} color="white" style={styles.directionsIcon} />
                  <Text style={[styles.directionsText, isLargeText && { fontSize: 14 }]}>Get Directions</Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      
      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isBlackAndWhite ? "#333" : "#912338"} />
          <Text style={[styles.loadingText, 
            isBlackAndWhite && { color: "#333" }, 
            isLargeText && { fontSize: 18 }
          ]}>
            Loading...
          </Text>
        </View>
      )}
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBarWrapper}>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, isLargeText && { fontSize: 18 }]}
            placeholder="Search for places..."
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
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Quick Search Buttons */}
      <View style={styles.quickSearchContainer}>
        {QUICK_SEARCH_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.quickSearchButton}
            onPress={() => handleQuickSearch(option.id)}
            disabled={isLoading}
          >
            <Text style={styles.quickSearchIcon}>{option.icon}</Text>
            <Text style={[styles.quickSearchText, isLargeText && { fontSize: 16 }]}>{option.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Current Location Button */}
      {userLocation && (
        <TouchableOpacity 
          style={[styles.myLocationButton, isBlackAndWhite && { backgroundColor: "#333" }]}
          onPress={() => {
            if (userLocation && mapRef.current) {
              mapRef.current.animateToRegion({
                ...userLocation,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA
              }, 500);
            }
          }}
        >
          <Ionicons name="locate" size={22} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width,
    height,
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
    top: Constants.statusBarHeight + 10,
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
  // Marker styles
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  markerIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  // Callout styles
  calloutContainer: {
    width: 220,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutAddress: {
    fontSize: 12,
    marginBottom: 5,
    color: '#555',
  },
  calloutRating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  directionsButton: {
    backgroundColor: '#912338',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  directionsIcon: {
    marginRight: 5,
  },
  directionsText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  quickSearchIcon: {
    fontSize: 18,
    marginRight: 5,
  },
  quickSearchText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  // My location button
  myLocationButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#912338',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});