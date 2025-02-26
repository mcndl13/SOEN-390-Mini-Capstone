import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, Polygon, Region, MapStyleElement } from 'react-native-maps';
import * as Location from 'expo-location';
import { polygons } from './polygonCoordinates';
import { AccessibilityContext } from './AccessibilitySettings';

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
}

const CampusMap: React.FC = () => {
  const { isBlackAndWhite, isLargeText } = React.useContext(AccessibilityContext);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  // SGW and Loyola Campus Coordinates
  const SGW_COORDS: LocationCoords = { latitude: 45.4953534, longitude: -73.578549 };
  const LOYOLA_COORDS: LocationCoords = { latitude: 45.4582, longitude: -73.6405 };

  // Function to calculate the center of a polygon
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

  // Buildings for both SGW and Loyola Campuses
  const buildings: Building[] = polygons.map((polygon, index) => ({
    id: index + 1,
    name: polygon.name,
    latitude: getPolygonCenter(polygon.boundaries).latitude,
    longitude: getPolygonCenter(polygon.boundaries).longitude,
    address: `${polygon.name} - Concordia University`,
  }));

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
    (async () => {
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
    })();
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
          {/* Polygon Highlight */}
          {polygons.map((polygon, index) => (
            <Polygon
              key={index}
              coordinates={polygon.boundaries}
              fillColor={isBlackAndWhite ? "#000000cc" : "#912338cc"}
              strokeColor={isBlackAndWhite ? "#000000" : "#912338cc"}
              strokeWidth={isBlackAndWhite ? 2 : 1}
            />
          ))}
        </MapView>
      ) : (
        <Text style={[styles.infoText, isLargeText && styles.largeText]}>
          Loading Map...
        </Text>
      )}

      {selectedBuilding && (
        <View style={[styles.infoContainer, isBlackAndWhite && styles.blackAndWhiteContainer]}>
          <Text style={[styles.infoText, isLargeText && styles.largeText]}>
            Building: {selectedBuilding.name}
          </Text>
          <Text style={[styles.infoText, isLargeText && styles.largeText]}>
            Address: {selectedBuilding.address}
          </Text>
        </View>
      )}

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
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
});

export default CampusMap;
