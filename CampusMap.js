import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Marker, Callout, Polygon } from "react-native-maps";
import * as Location from "expo-location";
import { polygons } from "./polygonCoordinates";

const CampusMap = () => {
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [selectedCampus, setSelectedCampus] = useState(null);

  // SGW and Loyola Campus Coordinates
  const SGW_COORDS = { latitude: 45.4953534, longitude: -73.578549 };
  const LOYOLA_COORDS = { latitude: 45.4582, longitude: -73.6405 };

  // SGW Campus Buildings with Corrected Data
  const buildings = [
    {
      id: 1,
      name: "EV Building",
      address: "1515 Ste-Catherine W",
      latitude: 45.4957,
      longitude: -73.5781,
    },
    {
      id: 2,
      name: "Hall Building",
      address: "1455 De Maisonneuve W",
      latitude: 45.4972,
      longitude: -73.578,
    },
    {
      id: 3,
      name: "Black Perspectives Office",
      address: "4847 GM-806",
      latitude: 45.4965,
      longitude: -73.579,
    },
    {
      id: 4,
      name: "Birks Student Service Centre",
      address: "2668 LB-185",
      latitude: 45.4975,
      longitude: -73.5775,
    },
    {
      id: 5,
      name: "Book Stop",
      address: "3615 LB-03",
      latitude: 45.498,
      longitude: -73.5765,
    },
    {
      id: 6,
      name: "Career and Planning Services",
      address: "7345 H-745",
      latitude: 45.4962,
      longitude: -73.5778,
    },
    {
      id: 7,
      name: "Centre de la Petite Enfance Concordia",
      address: "8789 GN-110",
      latitude: 45.4959,
      longitude: -73.5789,
    },
  ];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
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

  const switchToCampus = (campusCoords, campusName) => {
    setRegion({
      latitude: campusCoords.latitude,
      longitude: campusCoords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    setSelectedCampus(campusName);
  };

  return (
    <View style={styles.container}>
      {region ? (
        <MapView style={styles.map} region={region}>
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
              pinColor="blue"
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
            >
              <Callout>
                <View>
                  <Text style={{ fontWeight: "bold" }}>{building.name}</Text>
                  <Text>{building.address}</Text>
                </View>
              </Callout>
            </Marker>
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.circularButton,
            selectedCampus === "SGW" && styles.selectedButton, // Apply selected style if SGW is selected
          ]}
          onPress={() => switchToCampus(SGW_COORDS, "SGW")}
        >
          <Text
            style={[
              styles.buttonText,
              selectedCampus === "SGW" && styles.selectedButtonText, // Change text color for selected button
            ]}
          >
            SGW Campus
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.circularButton,
            selectedCampus === "Loyola" && styles.selectedButton, // Apply selected style if Loyola is selected
          ]}
          onPress={() => switchToCampus(LOYOLA_COORDS, "Loyola")}
        >
          <Text
            style={[
              styles.buttonText,
              selectedCampus === "Loyola" && styles.selectedButtonText, // Change text color for selected button
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
  map: { width: "100%", height: "100%" },
  buttonContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  circularButton: {
    backgroundColor: "white", // Burgundy color
    width: 150,
    height: 50,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    //add a shadow:
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    color: "black",
    textAlign: "center",
    fontWeight: "bold",
  },
  selectedButton: {
    backgroundColor: "#912338", // Change button background color when selected
  },
  selectedButtonText: {
    color: "white", // Change text color when selected
  },
});

export default CampusMap;
