// IndoorDirectionsScreen.js
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getIndoorMapData } from '../services/navigationService'

export default function IndoorDirectionsScreen() {
  const [floorData, setFloorData] = useState([])

  useEffect(() => {
    ;(async () => {
      const data = await getIndoorMapData()
      setFloorData(data)
    })()
  }, [])

  return (
    <View style={styles.container}>
      {floorData.length > 0 ? (
        floorData.map((floor, index) => (
          <View key={index} style={styles.floorContainer}>
            <Text style={styles.floorTitle}>{`Floor: ${floor.name}`}</Text>
            <Text
              style={styles.floorDetails}
            >{`Points of Interest: ${floor.pointsOfInterest.join(', ')}`}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noData}>No indoor map data available.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  floorContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#e6e6e6',
    borderRadius: 5,
  },
  floorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  floorDetails: {
    fontSize: 14,
  },
  noData: {
    textAlign: 'center',
    fontSize: 16,
  },
})
