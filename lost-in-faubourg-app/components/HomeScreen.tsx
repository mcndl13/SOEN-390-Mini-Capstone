import React, { useEffect, useState } from "react";
import { Linking, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import * as Location from "expo-location";
import { NavigationProp } from "@react-navigation/native";

type HomeScreenProps = {
  navigation: NavigationProp<any>;
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [hasPermission, setHasPermission] = useState(false);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Allow location access to use maps.");
      return false;
    }
    return true;
  };

  useEffect(() => {
    const getPermission = async () => {
      const permission = await requestLocationPermission();
      setHasPermission(permission);
    };
    getPermission();
  }, []);

  // Function to open the shuttle schedule webpage
  const openShuttleSchedule = async () => {
    const url = "https://www.concordia.ca/maps/shuttle-bus.html#depart";
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error("Cannot open URL: " + url);
    }
  };

  return (
    <View style={[styles.container, isBlackAndWhite && styles.blackAndWhite]}>
      <Text style={[styles.title, isLargeText && styles.largeText]}>Welcome</Text>
      <ScrollView>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (hasPermission) {
              navigation.navigate("CampusMap");
            } else {
              Alert.alert("Permission Needed", "You need to allow location access.");
            }
          }}
        >
          <Text style={[styles.buttonText, isLargeText && styles.largeText]}>Explore Campus Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, isBlackAndWhite && styles.blackAndWhiteButton]}
          onPress={() => navigation.navigate("Directions")}
        >
          <Text style={[styles.buttonText, isLargeText && styles.largeText]}>Get Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, isBlackAndWhite && styles.blackAndWhiteButton]}
          onPress={() => navigation.navigate("CalendarIntegration")}
        >
          <Text style={[styles.buttonText, isLargeText && styles.largeText]}>Connect to Google Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, isBlackAndWhite && styles.blackAndWhiteButton]}
          onPress={() => navigation.navigate("IndoorDirections")}
        >
          <Text style={[styles.buttonText, isLargeText && styles.largeText]}>Indoor Navigation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, isBlackAndWhite && styles.blackAndWhiteButton]}
          onPress={() => navigation.navigate("PointsOfInterest")}
        >
          <Text style={styles.buttonText}>Find Points of Interest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={openShuttleSchedule}
        >
          <Text style={styles.buttonText}>Shuttle Schedule</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    marginTop: 60,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#912338",
    padding: 20,
    margin: 5,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
  },
  blackAndWhite: {
    backgroundColor: '#fff',
  },
  blackAndWhiteButton: {
    backgroundColor: '#000',
  },
  largeText: {
    fontSize: 24,
  },
});

export default HomeScreen;