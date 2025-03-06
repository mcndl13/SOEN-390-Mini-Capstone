import React, { useState, useEffect } from "react";
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { getCalendarEvents } from "../services/calendarService";

WebBrowser.maybeCompleteAuthSession();

interface CalendarEvent {
  summary: string;
  start: string;
  location?: string;
}

export default function CalendarIntegrationScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null);

  //generate uri
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
    
    redirectUri, //redirect URI
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

      {events.length > 0 ? (
        events.map((event, index) => (
          <View key={index} style={styles.eventContainer}>
            <Text style={styles.eventTitle}>{event.summary}</Text>
            <Text style={styles.eventDetails}>{`Start: ${event.start}`}</Text>
            <Text style={styles.eventDetails}>{`Location: ${
              event.location || "N/A"
            }`}</Text>
          </View>
        ))
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
});