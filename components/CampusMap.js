// CampusMap.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';

export default function CampusMap() {
  const [location, setLocation] = useState(null);
  const [campusData, setCampusData] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setCampusData([
        {
          name: 'SGW Campus',
          boundaries: [
            { latitude: 45.497215, longitude: -73.610364 },
            { latitude: 45.498215, longitude: -73.611364 },
            { latitude: 45.496215, longitude: -73.612364 },
          ],
        },
        {
          name: 'Loyola Campus',
          boundaries: [
            { latitude: 45.458015, longitude: -73.640204 },
            { latitude: 45.459015, longitude: -73.641204 },
            { latitude: 45.457015, longitude: -73.642204 },
          ],
        },
      ]);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 45.497215,
          longitude: -73.610364,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="You are here"
          />
        )}
        {campusData.map((campus, index) => (
          <Polygon
            key={index}
            coordinates={campus.boundaries}
            fillColor="rgba(0, 200, 0, 0.5)"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
