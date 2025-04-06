import React, { useState, useEffect } from "react";
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Location from "expo-location";
import { makeRedirectUri } from "expo-auth-session";
import { getCalendarEvents } from "../services/calendarService";
import { useNavigation } from "@react-navigation/native";
import { GOOGLE_MAPS_API_KEY } from "@env";

WebBrowser.maybeCompleteAuthSession();

interface CalendarEvent {
  summary: string;
  start: string;
  location?: string;
}

export default function CalendarIntegrationScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null);
  const navigation = useNavigation();

  // Generate URI for redirect
  const redirectUri = makeRedirectUri();

  // Google Sign-In request
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "876949776030-i8f75o4us24vdeavtfv4q4rnjfpfg00b.apps.googleusercontent.com",
    webClientId: "876949776030-i8f75o4us24vdeavtfv4q4rnjfpfg00b.apps.googleusercontent.com",
    iosClientId : "876949776030-uot2pvtbrfq8ushvtgn1rp54f70i9b2h.apps.googleusercontent.com",
    scopes: [
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly", 
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar"
    ],
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      console.log("OAuth response:", response);
      getUserInfo(response.authentication.accessToken);
      fetchCalendarEvents(response.authentication.accessToken);
    } else if (response?.type === "error") {
      console.log("Google Sign-In Error:", response.error);
    }
  }, [response]);

  // Fetch Google User Info
  async function getUserInfo(token: string) {
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      setUserInfo(user);
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  }

  // Fetch Calendar Events
  async function fetchCalendarEvents(token: string) {
    try {
      const data = await getCalendarEvents(token);
      setEvents(data);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    }
  }

  // Geocode an address to get latitude/longitude using Google Maps Geocoding API
  async function geocodeAddress(address: string) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { latitude: location.lat, longitude: location.lng, name: address };
      } else {
        throw new Error("Geocoding failed");
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
      throw error;
    }
  }

  // Handler for "Get directions" button for the next event
  async function handleGetDirections() {
    if (events.length > 0) {
      const nextEvent = events[0];
      if (!nextEvent.location || nextEvent.location === "N/A") {
        Alert.alert("No valid location", "The next event doesn't have a valid location.");
        return;
      }
      try {
        // Geocode the event's location to get destination coordinates
        const destination = await geocodeAddress(nextEvent.location);
        
        // Request location permission and get the current location for the origin
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Location permission is required to get your current location.");
          return;
        }
        const currentLocation = await Location.getCurrentPositionAsync({});
        const origin = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          name: "My Current Location",
        };

        // Navigate to the Directions screen with both origin and destination
        navigation.navigate("Directions", { origin, destination });
      } catch (error) {
        Alert.alert("Error", "Could not determine the location for directions.");
        console.error("Error getting directions:", error);
      }
    } else {
      Alert.alert("No upcoming events", "There are no upcoming events available.");
    }
  }

  return (
    <ScrollView style={styles.container}>
      {userInfo ? (
        <Text style={styles.welcomeText}>Welcome, {userInfo.name}!</Text>
      ) : (
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => promptAsync()}
        >
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>
      )}

      {/* Render the next event with "Get directions" button */}
      {events.length > 0 ? (
        <>
          {events.map((event, index) => (
            <View key={index} style={styles.eventContainer}>
              <Text style={styles.eventTitle}>{event.summary}</Text>
              <Text style={styles.eventDetails}>{`Start: ${event.start}`}</Text>
              <Text style={styles.eventDetails}>{`Location: ${event.location ?? "N/A"}`}</Text>
              {index === 0 && event.location && event.location !== "N/A" && (
                <TouchableOpacity style={styles.getDirectionsButton} onPress={handleGetDirections}>
                  <Text style={styles.buttonText}>Get directions</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.noEvents}>No events found.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  googleButton: {
    backgroundColor: "#DB4437",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  eventContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  eventDetails: {
    fontSize: 14,
  },
  noEvents: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  getDirectionsButton: {
    backgroundColor: "#4285F4",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
});
