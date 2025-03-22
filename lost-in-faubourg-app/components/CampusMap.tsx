import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Animated } from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Region,
  MapStyleElement,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { polygons } from './polygonCoordinates';
import { AccessibilityContext } from './AccessibilitySettings';
import { startShuttleTracking, ShuttleData } from '../services/shuttleService';
import { getOpeningHours } from '../services/openingHoursService';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface Building {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  description: string | undefined;
}

const SGW_COORDS: LocationCoords = {
  latitude: 45.4953534,
  longitude: -73.578549,
};
const LOYOLA_COORDS: LocationCoords = {
  latitude: 45.4582,
  longitude: -73.6405,
};

const getPolygonCenter = (boundaries: LocationCoords[]): LocationCoords => {
  let latSum = 0,
    lonSum = 0;
  boundaries.forEach((coord) => {
    latSum += coord.latitude;
    lonSum += coord.longitude;
  });
  return {
    latitude: latSum / boundaries.length,
    longitude: lonSum / boundaries.length,
  };
};

const createBuildings = () => {
  return polygons.map((polygon, index) => ({
    id: index + 1,
    name: polygon.name,
    latitude: getPolygonCenter(polygon.boundaries).latitude,
    longitude: getPolygonCenter(polygon.boundaries).longitude,
    address: `${polygon.address} - Concordia University`,
    description: polygon.description,
  }));
};

const requestLocationPermission = async (
  setLocation: React.Dispatch<
    React.SetStateAction<Location.LocationObjectCoords | null>
  >,
  setRegion: React.Dispatch<React.SetStateAction<Region | null>>,
) => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('Permission to access location was denied');
    return;
  }

  let currentLocation = await Location.getCurrentPositionAsync({});
  setLocation(currentLocation.coords);
  setRegion({
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
};

const CampusMap: React.FC = () => {
  const { isBlackAndWhite, isLargeText } =
    React.useContext(AccessibilityContext);
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );
  const [shuttleData, setShuttleData] = useState<ShuttleData | null>(null);
  const [showShuttles, setShowShuttles] = useState<boolean>(true);
  const [openingHours, setOpeningHours] = useState<string>('Loading...');
  const [showOpeningHours, setShowOpeningHours] = useState<boolean>(true);
  const [mapReady, setMapReady] = useState<boolean>(false);
  
  // Animation values
  const slideAnimation = useState(new Animated.Value(0))[0];
  const fadeAnimation = useState(new Animated.Value(0))[0];

  const buildings = createBuildings();

  const mapStyle: MapStyleElement[] = isBlackAndWhite
    ? [
        {
          elementType: 'geometry',
          stylers: [{ saturation: -100 }],
        },
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
      ];

  useEffect(() => {
    requestLocationPermission(setLocation, setRegion);
  }, []);

  useEffect(() => {
    const stopTracking = startShuttleTracking((data) => {
      setShuttleData(data);
    }, 15000);

    return () => {
      stopTracking();
    };
  }, []);

  useEffect(() => {
    const fetchOpeningHours = async () => {
      if (!selectedBuilding) {
        setOpeningHours('No hours available');
        return;
      }

      const hours = await getOpeningHours(
        selectedBuilding.latitude,
        selectedBuilding.longitude,
      );

      setOpeningHours(hours || 'No hours available');
    };

    fetchOpeningHours();
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedBuilding) {
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
  }, [selectedBuilding]);

  const switchToCampus = (campusCoords: LocationCoords, campusName: string) => {
    setRegion({
      latitude: campusCoords.latitude,
      longitude: campusCoords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    setSelectedCampus(campusName);
    setSelectedBuilding(null);
  };

  const toggleShuttles = () => {
    setShowShuttles(!showShuttles);
  };

  const recenterMap = () => {
    if (location) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  const closeInfo = () => {
    Animated.timing(fadeAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBuilding(null);
    });
  };

  const infoContainerTranslateY = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {region ? (
        <MapView
          style={styles.map}
          region={region}
          testID="mapView"
          customMapStyle={mapStyle}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          onMapReady={() => setMapReady(true)}
        >
          {buildings.map((building) => (
            <Marker
              key={building.id}
              coordinate={{
                latitude: building.latitude,
                longitude: building.longitude,
              }}
              pinColor={isBlackAndWhite ? 'black' : '#912338'}
              onPress={() => setSelectedBuilding(building)}
              testID={`marker-${building.id}`}
            />
          ))}

          {polygons.map((polygon, index) => (
            <Polygon
              key={index}
              coordinates={polygon.boundaries}
              fillColor={isBlackAndWhite ? '#00000033' : '#91233833'}
              strokeColor={isBlackAndWhite ? '#000000' : '#912338'}
              strokeWidth={2}
            />
          ))}

          {showShuttles &&
            shuttleData?.buses.map((bus) => (
              <Marker
                key={bus.ID}
                coordinate={{
                  latitude: bus.Latitude,
                  longitude: bus.Longitude,
                }}
                title={`Shuttle ${bus.ID}`}
                pinColor={isBlackAndWhite ? "black" : "#1E88E5"}
                testID={`marker-${bus.ID}`}
              />
            ))}

          {showShuttles &&
            shuttleData?.stations.map((station) => (
              <Marker
                key={station.ID}
                coordinate={{
                  latitude: station.Latitude,
                  longitude: station.Longitude,
                }}
                title={
                  station.ID === 'GPLoyola' ? 'Loyola Campus' : 'SGW Campus'
                }
                pinColor={isBlackAndWhite ? "black" : "#4CAF50"}
                testID={`marker-${station.ID}`}
              />
            ))}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, isLargeText && styles.largeText]}>
            Loading Map...
          </Text>
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.mapControlButton} 
          onPress={recenterMap}
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

      {/* Campus Selection Pills */}
      <View style={styles.campusSelector}>
        <TouchableOpacity
          style={[
            styles.campusPill,
            selectedCampus === 'SGW' && (isBlackAndWhite ? styles.selectedPillBW : styles.selectedPill),
          ]}
          onPress={() => switchToCampus(SGW_COORDS, 'SGW')}
        >
          <Text
            style={[
              styles.campusPillText,
              selectedCampus === 'SGW' && styles.selectedPillText,
              isLargeText && styles.largeText,
            ]}
          >
            SGW Campus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.campusPill,
            selectedCampus === 'Loyola' && (isBlackAndWhite ? styles.selectedPillBW : styles.selectedPill),
          ]}
          onPress={() => switchToCampus(LOYOLA_COORDS, 'Loyola')}
        >
          <Text
            style={[
              styles.campusPillText,
              selectedCampus === 'Loyola' && styles.selectedPillText,
              isLargeText && styles.largeText,
            ]}
          >
            Loyola Campus
          </Text>
        </TouchableOpacity>
      </View>

      {/* Building Info Card */}
      {selectedBuilding && (
        <Animated.View 
          style={[
            styles.infoCard,
            {
              transform: [{ translateY: infoContainerTranslateY }],
              opacity: fadeAnimation,
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
          
          <Text style={[styles.buildingName, isLargeText && styles.largeText]}>
            {selectedBuilding.name}
          </Text>
          
          <View style={styles.addressContainer}>
            <Ionicons 
              name="location" 
              size={18} 
              color={isBlackAndWhite ? "#000" : "#912338"} 
              style={styles.addressIcon} 
            />
            <Text style={[styles.address, isLargeText && styles.largeText]}>
              {selectedBuilding.address}
            </Text>
          </View>
          
          <View style={styles.separator} />
          
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
              {selectedBuilding.description || "No description available."}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.hoursToggle}
            onPress={() => setShowOpeningHours(!showOpeningHours)}
          >
            <View style={styles.sectionHeader}>
              <Ionicons 
                name="time" 
                size={20} 
                color={isBlackAndWhite ? "#000" : "#912338"} 
              />
              <Text style={[styles.sectionTitle, isLargeText && styles.largeText]}>
                Opening Hours
              </Text>
              <Ionicons 
                name={showOpeningHours ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={isBlackAndWhite ? "#000" : "#757575"} 
                style={styles.toggleIcon}
              />
            </View>
          </TouchableOpacity>

          {showOpeningHours && (
            <Text style={[styles.hoursText, isLargeText && styles.largeText]}>
              {openingHours}
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
  buildingName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressIcon: {
    marginRight: 6,
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
  hoursToggle: {
    paddingVertical: 8,
  },
  toggleIcon: {
    marginLeft: 'auto',
  },
  hoursText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginTop: 8,
  },
  campusSelector: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  campusPill: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedPill: {
    backgroundColor: '#912338',
  },
  selectedPillBW: {
    backgroundColor: '#000000',
  },
  campusPillText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedPillText: {
    color: 'white',
  },
  mapControls: {
    position: 'absolute',
    top: 50,
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
  largeText: {
    fontSize: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  markerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  markerColor: {
    backgroundColor: '#912338',
  },
  markerBW: {
    backgroundColor: '#000000',
  },
  busMarker: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  stationMarker: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default CampusMap;