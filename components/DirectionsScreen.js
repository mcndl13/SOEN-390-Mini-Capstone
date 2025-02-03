// DirectionsScreen.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { getDirections } from '../services/navigationService';

export default function DirectionsScreen() {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [directions, setDirections] = useState(null);

  const fetchDirections = async () => {
    const data = await getDirections(start, destination);
    setDirections(data);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter Start Location"
        value={start}
        onChangeText={setStart}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Destination"
        value={destination}
        onChangeText={setDestination}
      />
      <TouchableOpacity style={styles.button} onPress={fetchDirections}>
        <Text style={styles.buttonText}>Get Directions</Text>
      </TouchableOpacity>
      {directions && (
        <Text>{JSON.stringify(directions)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    width: '80%',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
});
