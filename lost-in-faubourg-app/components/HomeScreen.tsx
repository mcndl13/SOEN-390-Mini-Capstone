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
import { AccessibilityContext } from './AccessibilitySettings';

type HomeScreenProps = {
  navigation: NavigationProp<any>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { isBlackAndWhite, isLargeText } = React.useContext(AccessibilityContext);

  return (
    <View style={[styles.container, isBlackAndWhite && styles.blackAndWhite]}>
      <Text style={[styles.title, isLargeText && styles.largeText]}>Welcome</Text>
      <ScrollView>
        <TouchableOpacity
          style={[styles.button, isBlackAndWhite && styles.blackAndWhiteButton]}
          onPress={() => navigation.navigate("CampusMap")}
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
          <Text style={[styles.buttonText, isLargeText && styles.largeText]}>Find Points of Interest</Text>
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
