// HomeScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { NavigationProp } from '@react-navigation/native';

type HomeScreenProps = {
  navigation: NavigationProp<any>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <ScrollView>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("CampusMap")}
        >
          <Text style={styles.buttonText}>Explore Campus Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Directions")}
        >
          <Text style={styles.buttonText}>Get Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("CalendarIntegration")}
        >
          <Text style={styles.buttonText}>Connect to Google Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("IndoorDirections")}
        >
          <Text style={styles.buttonText}>Indoor Navigation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("PointsOfInterest")}
        >
          <Text style={styles.buttonText}>Find Points of Interest</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

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
});
