import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import MapView, { Marker, Polygon, Region, MapStyleElement } from 'react-native-maps';
import * as Location from 'expo-location';
import { polygons } from './polygonCoordinates';
import { AccessibilityContext } from './AccessibilitySettings';
import { fetchShuttlePositions, startShuttleTracking, ShuttleData, ShuttlePoint } from '../services/shuttleService';

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

const SGW_COORDS: LocationCoords = { latitude: 45.4953534, longitude: -73.578549 };
const LOYOLA_COORDS: LocationCoords = { latitude: 45.4582, longitude: -73.6405 };

const getPolygonCenter = (boundaries: LocationCoords[]): LocationCoords => {
  let latSum = 0, lonSum = 0;
  boundaries.forEach(coord => {
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

const requestLocationPermission = async (setLocation: React.Dispatch<React.SetStateAction<Location.LocationObjectCoords | null>>, setRegion: React.Dispatch<React.SetStateAction<Region | null>>) => {
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
  const { isBlackAndWhite, isLargeText } = React.useContext(AccessibilityContext);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [shuttleData, setShuttleData] = useState<ShuttleData | null>(null);
  const [showShuttles, setShowShuttles] = useState<boolean>(true);

  const buildings = createBuildings();

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

  return (
    <View style={[styles.container, isBlackAndWhite && { filter: 'grayscale(100%)' }]}>
      {region ? (
        <MapView style={styles.map} 
        region={region}
        testID="mapView"
        customMapStyle={mapStyle}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
              pinColor={isBlackAndWhite ? "black" : "blue"}
              testID="marker-current-location"
            />
          )}

          {buildings.map((building) => (
            <Marker
              key={building.id}
              coordinate={{
                latitude: building.latitude,
                longitude: building.longitude,
              }}
              pinColor={isBlackAndWhite ? "black" : "red"}
              onPress={() => setSelectedBuilding(building)}
              testID={`marker-${building.id}`}
            />
          ))}

          {polygons.map((polygon, index) => (
            <Polygon
              key={index}
              coordinates={polygon.boundaries}
              fillColor={isBlackAndWhite ? "#000000cc" : "#912338cc"}
              strokeColor={isBlackAndWhite ? "#000000" : "#912338cc"}
              strokeWidth={isBlackAndWhite ? 2 : 1}
            />
          ))}

          {showShuttles && shuttleData && shuttleData.buses.map((bus) => (
            <Marker
              key={bus.ID}
              coordinate={{
                latitude: bus.Latitude,
                longitude: bus.Longitude,
              }}
              title={`Shuttle ${bus.ID}`}
              testID={`marker-${bus.ID}`}
            >
              <View style={styles.busMarker}>
                <Image 
                  source={require('../assets/images/transportModes/busBlack.png')}
                  style={styles.busIcon}
                  resizeMode="contain"
                />
              </View>
            </Marker>
          ))}

          {showShuttles && shuttleData && shuttleData.stations.map((station) => (
            <Marker
              key={station.ID}
              coordinate={{
                latitude: station.Latitude,
                longitude: station.Longitude,
              }}
              title={station.ID === 'GPLoyola' ? 'Loyola Campus' : 'SGW Campus'}
              testID={`marker-${station.ID}`}
            >
              <View style={styles.stationMarker}>
                <Image 
                  source={require('../assets/images/transportModes/busStation.png')}
                  style={styles.stationIcon}
                  resizeMode="contain"
                />
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <Text style={[styles.infoText, isLargeText && styles.largeText]}>
          Loading Map...
        </Text>
      )}

      {selectedBuilding && (
        <BuildingInfo 
          building={selectedBuilding} 
          isBlackAndWhite={isBlackAndWhite} 
          isLargeText={isLargeText} 
        />
      )}

      <CampusButtons 
        selectedCampus={selectedCampus} 
        switchToCampus={switchToCampus} 
        isBlackAndWhite={isBlackAndWhite} 
        isLargeText={isLargeText} 
      />

      <TouchableOpacity
        style={styles.shuttleToggleButton}
        onPress={toggleShuttles}
      >
        <Text style={styles.shuttleToggleText}>
          {showShuttles ? 'Hide Shuttles' : 'Show Shuttles'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const BuildingInfo: React.FC<{ building: Building, isBlackAndWhite: boolean, isLargeText: boolean }> = ({ building, isBlackAndWhite, isLargeText }) => (
  <View style={[styles.infoContainer, isBlackAndWhite && styles.blackAndWhiteContainer]}>
    <Text style={[styles.buildingName, isLargeText && styles.largeText]}>{building.name}</Text>
    <Text style={[styles.description, isLargeText && styles.largeText]}>{building.address}</Text>
    <View style={styles.horizontalRule} />
    <Text style={[styles.infoText, isLargeText && styles.largeText]}>Description</Text>
    <Text style={[styles.description, isLargeText && styles.largeText]}>{building.description}</Text>
  </View>
);

const CampusButtons: React.FC<{ selectedCampus: string | null, switchToCampus: (coords: LocationCoords, name: string) => void, isBlackAndWhite: boolean, isLargeText: boolean }> = ({ selectedCampus, switchToCampus, isBlackAndWhite, isLargeText }) => (
  <View style={styles.buttonContainer}>
    <TouchableOpacity
      style={[
        styles.circularButton,
        selectedCampus === 'SGW' && styles.selectedButton,
        isBlackAndWhite && styles.blackAndWhiteButton,
      ]}
      onPress={() => switchToCampus(SGW_COORDS, 'SGW')}
    >
      <Text
        style={[
          styles.buttonText,
          selectedCampus === 'SGW' && styles.selectedButtonText,
          isLargeText && styles.largeText,
          isBlackAndWhite && styles.blackAndWhiteText,
        ]}
      >
        SGW Campus
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[
        styles.circularButton,
        selectedCampus === 'Loyola' && styles.selectedButton,
        isBlackAndWhite && styles.blackAndWhiteButton,
      ]}
      onPress={() => switchToCampus(LOYOLA_COORDS, 'Loyola')}
    >
      <Text
        style={[
          styles.buttonText,
          selectedCampus === 'Loyola' && styles.selectedButtonText,
          isLargeText && styles.largeText,
          isBlackAndWhite && styles.blackAndWhiteText,
        ]}
      >
        Loyola Campus
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },
  infoContainer: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
  },
  buildingName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  circularButton: {
    backgroundColor: 'white',
    width: 150,
    height: 50,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    color: 'black',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  selectedButton: {
    backgroundColor: '#912338',
  },
  selectedButtonText: {
    color: 'white',
  },
  largeText: {
    fontSize: 20,
  },
  blackAndWhiteContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 1,
  },
  blackAndWhiteButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 1,
  },
  blackAndWhiteText: {
    color: '#000000',
  },
  shuttleToggleButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#912338',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  shuttleToggleText: {
    color: 'white',
    fontWeight: 'bold',
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
  horizontalRule: {
    borderBottomColor: '#912338',
    borderBottomWidth: 1,
    marginVertical: 10,
  }
});

export default CampusMap;