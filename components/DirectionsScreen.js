import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { getDirections, getCoordinates } from '../services/navigationService';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDfv2-YoXgh3gE2ck-LhfNj9njU8Hj9LxU';

export default function DirectionsScreen() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [route, setRoute] = useState(null);
  const [eta, setEta] = useState(null);
  const [mode, setMode] = useState('driving'); // Default to driving mode
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const mapRef = useRef(null);

  // Get live location updates
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      // Get and track live location
      const locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCurrentLocation(loc);

          if (mapRef.current) {
            mapRef.current.animateToRegion({
              ...loc,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        }
      );

      return () => locationSubscription.remove();
    })();
  }, []);

  useEffect(() => {
    if (currentLocation && !start) {
      (async () => {
        try {
          const [addressData] = await Location.reverseGeocodeAsync(currentLocation);
          const address = `${addressData.name || ''} ${addressData.street || ''}, ${addressData.city || ''}`.trim();
          setStart(address);
        } catch (error) {
          console.error("Error during reverse geocoding:", error);
        }
      })();
    }
  }, [currentLocation]);

  // Function to fetch autocomplete suggestions
  const fetchAutocomplete = async (input, setSuggestions) => {
    if (!input) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input,
            key: GOOGLE_MAPS_API_KEY,
            types: 'geocode',
          },
        }
      );

      if (response.data.status === 'OK') {
        setSuggestions(response.data.predictions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching autocomplete:', error);
      setSuggestions([]);
    }
  };

  // Fetch route based on current location
  const fetchDirections = async () => {
    if ((!currentLocation && !start) || !destination) {
      alert('Please enter a valid start and destination');
      return;
    }
  
    console.log("Fetching directions...");
    console.log("Start input:", start);
    console.log("Destination input:", destination);
  
    let startCoords = start ? await getCoordinates(start) : currentLocation;
    let destinationCoords = await getCoordinates(destination);
  
    console.log("Start Coordinates:", startCoords);
    console.log("Destination Coordinates:", destinationCoords);
  
    if (!startCoords || !destinationCoords) {
      alert('Invalid start or destination');
      console.error('Start or destination coordinates are null.');
      return;
    }
  
    const polyline = await getDirections(startCoords, destinationCoords, mode);
  
    console.log("Google API Response:", polyline);
  
    if (!polyline || !polyline.path || polyline.path.length === 0) {
      alert('No route found');
      console.log("API response:", polyline);
      return;
    }
  
    console.log("Route successfully fetched:", polyline);
  
    setRoute(polyline.path);
    setEta(polyline.duration); // ✅ Store ETA
  
    // Fit map to route
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(polyline.path, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };
  
  

  return (
    <View style={styles.container}>
      {currentLocation ? (
        <>
          {/* Start Location Input */}
          <TextInput
            style={styles.input}
            placeholder="Start Location"
            onChangeText={(text) => {
              setStart(text);
              fetchAutocomplete(text, setStartSuggestions);
            }}
            value={start}
          />
          {/* Start Location Suggestions */}
          {startSuggestions.length > 0 && (
            <FlatList
              data={startSuggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => {
                    setStart(item.description);
                    setStartSuggestions([]);
                  }}
                >
                  <Text>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Destination Input */}
          <TextInput
            style={styles.input}
            placeholder="Destination"
            onChangeText={(text) => {
              setDestination(text);
              fetchAutocomplete(text, setDestinationSuggestions);
            }}
            value={destination}
          />
          {/* Destination Suggestions */}
          {destinationSuggestions.length > 0 && (
            <FlatList
              data={destinationSuggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => {
                    setDestination(item.description);
                    setDestinationSuggestions([]);
                  }}
                >
                  <Text>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity onPress={() => setMode('walking')}>
              <Text style={mode === 'walking' ? styles.selectedMode : styles.mode}>Walk</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('driving')}>
              <Text style={mode === 'driving' ? styles.selectedMode : styles.mode}>Drive</Text>
            </TouchableOpacity>
          </View>

          {/* Map */}
          <MapView ref={mapRef} style={styles.map}>
            {currentLocation && <Marker coordinate={currentLocation} title="You are here" />}
            {route && <Polyline coordinates={route} strokeWidth={5} strokeColor="blue" />}
          </MapView>

          {/* Estimated Time of Arrival (ETA) */}
          {eta && (
            <Text style={styles.etaText}>
              Estimated Arrival Time: {eta} mins
            </Text>
          )}

          {/* Get Directions Button */}
          <TouchableOpacity style={styles.button} onPress={fetchDirections}>
            <Text style={styles.buttonText}>Get Directions</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator size="large" />
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  suggestionItem: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    alignItems: 'center',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  map: {
    flex: 1,
    marginTop: 10,
  },
  etaText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
});

