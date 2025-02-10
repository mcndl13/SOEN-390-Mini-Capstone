import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Text, Button } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { GOOGLE_MAPS_API_KEY } from '@env'

export default function LocationScreen() {
  const [location, setLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [currentBuilding, setCurrentBuilding] = useState('')
  const [campus, setCampus] = useState('SGW') // Default to SGW

  useEffect(() => {
    ;(async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied')
          return
        }

        let currentLocation = await Location.getCurrentPositionAsync({})
        setLocation(currentLocation)
        fetchBuildingName(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
        )
      } catch (error) {
        setErrorMsg('Failed to fetch location. Please try again.')
      }
    })()
  }, [])

  const fetchBuildingName = async (latitude, longitude) => {
    try {
      let response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`,
      )
      let data = await response.json()
      if (data.results.length > 0) {
        setCurrentBuilding(data.results[0].formatted_address)
      }
    } catch (error) {
      setCurrentBuilding('Building info unavailable')
    }
  }

  const toggleCampus = () => {
    setCampus((prevCampus) => (prevCampus === 'SGW' ? 'Loyola' : 'SGW'))
  }

  return (
    <View style={styles.container}>
      <Button
        title={`Switch to ${campus === 'SGW' ? 'Loyola' : 'SGW'} Campus`}
        onPress={toggleCampus}
      />
      <Text>
        {currentBuilding
          ? `You are at: ${currentBuilding}`
          : 'Fetching building info...'}
      </Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: campus === 'SGW' ? 45.497215 : 45.458015,
          longitude: campus === 'SGW' ? -73.610364 : -73.640204,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="You are here"
            description={currentBuilding}
          />
        )}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
})
