import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { polygons } from './polygonCoordinates';

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

const CampusMap: React.FC = () => {
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
    address: `${polygon.address} - Concordia University`,
    description: polygon.description,
  }));

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
    <View style={styles.container}>
      {region ? (
        <MapView style={styles.map} 
        region={region}
        testID="mapView"
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
              pinColor="blue"
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
              pinColor="red"
              onPress={() => setSelectedBuilding(building)}
              testID={`marker-${building.id}`}
            />
          ))}
          {/* Polygon Highlight */}
          {polygons.map((polygon, index) => (
            <Polygon
              key={index}
              coordinates={polygon.boundaries}
              fillColor="#912338cc"
              strokeColor="#912338cc"
              strokeWidth={1}
            />
          ))}
        </MapView>
      ) : (
        <Text>Loading Map...</Text>
      )}

      {selectedBuilding && (
        <View style={styles.infoContainer}>
          <Text style={styles.buildingName}>{selectedBuilding.name}</Text>
          <Text style={styles.description}>{selectedBuilding.address}</Text>
          <View style={styles.horizontalRule} />
          <Text style={styles.infoText}>Description</Text>
          <Text style={styles.description}>{selectedBuilding.description}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.circularButton,
            selectedCampus === 'SGW' && styles.selectedButton,
          ]}
          onPress={() => switchToCampus(SGW_COORDS, 'SGW')}
        >
          <Text
            style={[
              styles.buttonText,
              selectedCampus === 'SGW' && styles.selectedButtonText,
            ]}
          >
            SGW Campus
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.circularButton,
            selectedCampus === 'Loyola' && styles.selectedButton,
          ]}
          onPress={() => switchToCampus(LOYOLA_COORDS, 'Loyola')}
        >
          <Text
            style={[
              styles.buttonText,
              selectedCampus === 'Loyola' && styles.selectedButtonText,
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
  horizontalRule: {
    borderBottomColor: '#912338',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
});

export default CampusMap;
