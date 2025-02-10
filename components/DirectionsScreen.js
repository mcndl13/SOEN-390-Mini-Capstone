import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { getDirections } from '../services/navigationService';
import {polygons} from './polygonCoordinates';

const buildings = polygons; // Using the polygons array you provided

export default function CampusDirectionsScreen() {
  // State management
  const [startBuilding, setStartBuilding] = useState(null);
  const [destinationBuilding, setDestinationBuilding] = useState(null);
  const [route, setRoute] = useState(null);
  const [eta, setEta] = useState(null);
  const [mode, setMode] = useState('walking');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  // Calculate center point of a building's boundaries
  const getBuildingCenter = (boundaries) => {
    const latSum = boundaries.reduce((sum, coord) => sum + coord.latitude, 0);
    const lngSum = boundaries.reduce((sum, coord) => sum + coord.longitude, 0);
    alert(latSum);
    alert(lngSum);

    return {
      latitude: latSum / boundaries.length,
      longitude: lngSum / boundaries.length,
    };
  };

  // Get directions between selected buildings
  const fetchDirections = async () => {
    if (!startBuilding || !destinationBuilding) {
      alert('Please select both buildings');
      return;
    }
    
    // Debug logs
    console.log('Start Building:', startBuilding.name);
    console.log('Destination Building:', destinationBuilding.name);

    try {
      setLoading(true);
      //alert('true')
      const startCoords = getBuildingCenter(startBuilding.boundaries);
      const destCoords = getBuildingCenter(destinationBuilding.boundaries);
      
      //alert(startCoords);
      console.log('Destination Coordinates:', destCoords);
      //alert('getDirections');

      const result = await getDirections(startCoords, destCoords, mode);
      //alert(result)

      if (result && result.path) {
        setRoute(result.path);
        setEta(result.duration);

        // Fit map to show the entire route
        if (mapRef.current) {
          alert('mapRef')
          mapRef.current.fitToCoordinates(result.path, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      } else {
        alert('Could not find a route between these buildings');
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      alert('Error getting directions');
    } finally {
      setLoading(false);
    }
  };

  // Building selection modal component
  const BuildingSelector = ({ visible, onClose, onSelect, title }) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.buildingList}>
            {buildings.map((building) => (
              <TouchableOpacity
                key={building.name}
                style={styles.buildingItem}
                onPress={() => {
                  onSelect(building);
                  onClose();
                }}
              >
                <Text>{building.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 45.458825,
          longitude: -73.640408,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Start Building Marker */}
        {startBuilding && (
          <Marker
            coordinate={getBuildingCenter(startBuilding.boundaries)}
            title={startBuilding.name}
            pinColor="green"
          />
        )}
        
        {/* Destination Building Marker */}
        {destinationBuilding && (
          <Marker
            coordinate={getBuildingCenter(destinationBuilding.boundaries)}
            title={destinationBuilding.name}
            pinColor="red"
          />
        )}
        
        {/* Route Line */}
        {route && (
          <Polyline
            coordinates={route}
            strokeWidth={4}
            strokeColor="#007AFF"
          />
        )}
      </MapView>

      {/* Controls */}
      <View style={styles.overlay}>
        {/* Building Selection Buttons */}
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowStartModal(true)}
        >
          <Text>
            {startBuilding ? startBuilding.name : 'Select Start Building'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDestModal(true)}
        >
          <Text>
            {destinationBuilding ? destinationBuilding.name : 'Select Destination Building'}
          </Text>
        </TouchableOpacity>

        {/* Travel Mode Buttons */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'walking' && styles.selectedMode,
            ]}
            onPress={() => setMode('walking')}
          >
            <Text style={[
              styles.modeText,
              mode === 'walking' && styles.selectedModeText,
            ]}>
              🚶 Walk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'bicycling' && styles.selectedMode,
            ]}
            onPress={() => setMode('bicycling')}
          >
            <Text style={[
              styles.modeText,
              mode === 'bicycling' && styles.selectedModeText,
            ]}>
              🚲 Bike
            </Text>
          </TouchableOpacity>
        </View>

        {/* ETA Display */}
        {eta && (
          <View style={styles.etaContainer}>
            <Text style={styles.etaText}>
              Estimated arrival: {eta} mins
            </Text>
          </View>
        )}

        {/* Get Directions Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={fetchDirections}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Directions</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Building Selection Modals */}
      <BuildingSelector
        visible={showStartModal}
        onClose={() => setShowStartModal(false)}
        onSelect={setStartBuilding}
        title="Select Start Building"
      />
      <BuildingSelector
        visible={showDestModal}
        onClose={() => setShowDestModal(false)}
        onSelect={setDestinationBuilding}
        title="Select Destination Building"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    padding: 20,
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 10,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  selectedMode: {
    backgroundColor: '#007AFF',
  },
  modeText: {
    color: '#666',
  },
  selectedModeText: {
    color: '#fff',
  },
  etaContainer: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  etaText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  buildingList: {
    maxHeight: '80%',
  },
  buildingItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});