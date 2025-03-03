// CalendarIntegrationScreen.js
import React, { useState, useEffect } from "react";
import { View, ScrollView, Text, StyleSheet } from "react-native";
import { getCalendarEvents } from "../services/calendarService";
import { AccessibilityContext } from './AccessibilitySettings';

interface CalendarEvent {
  summary: string;
  start: string;
  location?: string;
}

export default function CalendarIntegrationScreen() {
  const { isBlackAndWhite, isLargeText } = React.useContext(AccessibilityContext);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    (async () => {
      const data: any = await getCalendarEvents();
      setEvents(data);
    })();
  }, []);

  return (
    <ScrollView style={[
      styles.container,
      isBlackAndWhite && styles.blackAndWhiteContainer
    ]}>
      {events.length > 0 ? (
        events.map((event, index) => (
          <View 
            key={index} 
            style={[
              styles.eventContainer,
              isBlackAndWhite && styles.blackAndWhiteEventContainer
            ]}
          >
            <Text style={[
              styles.eventTitle,
              isLargeText && styles.largeText,
              isBlackAndWhite && styles.blackAndWhiteText
            ]}>
              {event.summary}
            </Text>
            <Text style={[
              styles.eventDetails,
              isLargeText && styles.largeEventDetails,
              isBlackAndWhite && styles.blackAndWhiteText
            ]}>
              {`Start: ${event.start}`}
            </Text>
            <Text style={[
              styles.eventDetails,
              isLargeText && styles.largeEventDetails,
              isBlackAndWhite && styles.blackAndWhiteText
            ]}>
              {`Location: ${event.location || "N/A"}`}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[
          styles.noEvents,
          isLargeText && styles.largeText,
          isBlackAndWhite && styles.blackAndWhiteText
        ]}>
          No events found.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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
  // New accessibility styles
  largeText: {
    fontSize: 24,
  },
  largeEventDetails: {
    fontSize: 18,
  },
  blackAndWhiteContainer: {
    backgroundColor: '#ffffff',
  },
  blackAndWhiteEventContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#000000',
    borderWidth: 1,
  },
  blackAndWhiteText: {
    color: '#000000',
  },
});

