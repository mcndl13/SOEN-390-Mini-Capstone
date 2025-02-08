// PointsOfInterestScreen.js
import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import MapView, { Marker } from 'react-native-maps'

export default function PointsOfInterestScreen() {
  const [poi, setPoi] = useState([])

  useEffect(() => {
    // Example: Fetch points of interest from an API or static data
    setPoi([
      { name: 'Cafe A', latitude: 45.497, longitude: -73.61 },
      { name: 'Library', latitude: 45.498, longitude: -73.611 },
      { name: 'Gym', latitude: 45.496, longitude: -73.609 },
    ])
  }, [])

  return (
    <MapView style={styles.map}>
      {poi.map((point, index) => (
        <Marker
          key={index}
          coordinate={{ latitude: point.latitude, longitude: point.longitude }}
          title={point.name}
        />
      ))}
    </MapView>
  )
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
})
