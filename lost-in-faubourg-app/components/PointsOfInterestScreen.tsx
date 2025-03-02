import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import MapView, { 
  Marker, 
  Polygon, 
  PROVIDER_DEFAULT, 
  Callout, 
  Region
} from 'react-native-maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { polygons } from '../components/polygonCoordinates';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
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

interface POIType {
  id: string;
  name: string;
  icon: string;
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

// Define POI types and their emoji icons
const POI_TYPES: POIType[] = [
  { id: 'library', name: 'Libraries', icon: '📚' },
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️' },
  { id: 'cafe', name: 'Cafes', icon: '☕' },
  { id: 'gym', name: 'Gyms', icon: '💪' },
  { id: 'bookstore', name: 'Bookstores', icon: '📖' },
  { id: 'all', name: 'All', icon: '🔍' },
];

// Places API type mappings
const PLACE_TYPE_MAPPING: Record<string, string> = {
  'library': 'library',
  'restaurant': 'restaurant',
  'cafe': 'cafe',
  'gym': 'gym',
  'bookstore': 'book_store',
  'all': ''
};

export default function POIScreen() {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedPOIType, setSelectedPOIType] = useState<string>('all');
  const [pois, setPOIs] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mapRef = useRef<MapView | null>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  
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
        
        // Fetch POIs near user location
        if (userLoc) {
          await fetchPOIsNearby(userLoc, selectedPOIType);
        }
        
      } catch (error) {
        console.error('Error getting location:', error);
        setMessage('Could not determine your location');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch POIs when POI type changes
  useEffect(() => {
    if (userLocation) {
      fetchPOIsNearby(userLocation, selectedPOIType);
    }
  }, [selectedPOIType]);

  // Fetch POIs from Google Places API
  const fetchPOIsNearby = async (location: Coordinates, poiType: string) => {
    try {
      setIsLoading(true);
      
      const googleType = PLACE_TYPE_MAPPING[poiType] || '';
      const radius = 1500; // 1.5km radius
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${location.latitude},${location.longitude}&` +
        `radius=${radius}&` +
        (googleType ? `type=${googleType}&` : '') +
        `key=${GOOGLE_MAPS_API_KEY}`;
      
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
        description: place.vicinity || '',
        address: place.vicinity || '',
        rating: place.rating || 'N/A',
        place_id: place.place_id
      }));
      
      setPOIs(mappedPOIs);
      
      if (mappedPOIs.length === 0) {
        setMessage('No places found nearby');
      } else {
        setMessage(`Found ${mappedPOIs.length} places nearby`);
        
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
      setMessage('Failed to fetch nearby places');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to determine POI type from Google Places types
  const determinePoiType = (types: string[]): string => {
    for (const type of types) {
      if (type === 'library') return 'library';
      if (type === 'book_store') return 'bookstore';
      if (type === 'restaurant') return 'restaurant';
      if (type === 'cafe' || type === 'bar') return 'cafe';
      if (type === 'gym') return 'gym';
    }
    return 'all';
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
    navigation.navigate('Directions', {
      destination: {
        latitude: poi.coordinates.latitude,
        longitude: poi.coordinates.longitude,
        name: poi.name
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Message Banner */}
      {message && (
        <View style={styles.messageBanner}>
          <Text style={styles.messageText}>{message}</Text>
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

        {/* POI Markers */}
        {pois.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={poi.coordinates}
            title={poi.name}
            description={poi.description}
            onPress={() => setSelectedPOI(poi)}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerIcon}>
                {POI_TYPES.find(type => type.id === poi.type || type.id === 'all')?.icon || '📍'}
              </Text>
            </View>
            <Callout onPress={() => getDirections(poi)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{poi.name}</Text>
                <Text style={styles.calloutAddress}>{poi.address}</Text>
                {poi.rating !== 'N/A' && (
                  <Text style={styles.calloutRating}>Rating: {poi.rating} ⭐</Text>
                )}
                <Text style={styles.directionsText}>Tap for directions</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      
      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#912338" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      {/* POI Type Selection */}
      <View style={styles.poiTypesContainer}>
        <FlatList
          data={POI_TYPES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.poiTypeButton, 
                selectedPOIType === item.id && styles.activePoiTypeButton
              ]}
              onPress={() => setSelectedPOIType(item.id)}
              disabled={isLoading}
            >
              <Text 
                style={[
                  styles.poiTypeIcon,
                  selectedPOIType === item.id && styles.activePoiTypeIcon
                ]}
              >
                {item.icon}
              </Text>
              <Text 
                style={[
                  styles.poiTypeText,
                  selectedPOIType === item.id && styles.activePoiTypeText
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      
      {/* Current Location Button */}
      {userLocation && (
        <TouchableOpacity 
          style={styles.myLocationButton}
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
          <Text style={styles.myLocationButtonText}>My Location</Text>
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
  // POI type selection
  poiTypesContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  poiTypeButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: 'black',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    width: 85,
  },
  activePoiTypeButton: {
    backgroundColor: '#912338',
  },
  poiTypeIcon: {
    fontSize: 24,
    marginBottom: 5,
    textAlign: 'center',
    height: 30,
    lineHeight: 30,
  },
  activePoiTypeIcon: {
    color: 'white',
  },
  poiTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  activePoiTypeText: {
    color: 'white',
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
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 3,
  },
  calloutAddress: {
    fontSize: 12,
    marginBottom: 3,
    color: '#555',
  },
  calloutRating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 5,
  },
  directionsText: {
    fontSize: 12,
    color: '#0066cc',
    textAlign: 'center',
    marginTop: 5,
  },
  // My location button
  myLocationButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#912338',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    shadowColor: 'black',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  myLocationButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});