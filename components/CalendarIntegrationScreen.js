// CalendarIntegrationScreen.js
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { getCalendarEvents } from '../services/calendarService';

export default function CalendarIntegrationScreen() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await getCalendarEvents();
      setEvents(data);
    })();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {events.length > 0 ? (
        events.map((event, index) => (
          <View key={index} style={styles.eventContainer}>
            <Text style={styles.eventTitle}>{event.summary}</Text>
            <Text style={styles.eventDetails}>{`Start: ${event.start}`}</Text>
            <Text style={styles.eventDetails}>{`Location: ${event.location || 'N/A'}`}</Text>
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
  eventContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventDetails: {
    fontSize: 14,
  },
  noEvents: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});
