// App.js
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import HomeScreen from './components/HomeScreen'
import CampusMap from './components/CampusMap'
import DirectionsScreen from './components/DirectionsScreen'
import CalendarIntegrationScreen from './components/CalendarIntegrationScreen'
import IndoorDirectionsScreen from './components/IndoorDirectionsScreen'
import PointsOfInterestScreen from './components/PointsOfInterestScreen'

const Stack = createStackNavigator()

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CampusMap" component={CampusMap} />
        <Stack.Screen name="Directions" component={DirectionsScreen} />
        <Stack.Screen
          name="CalendarIntegration"
          component={CalendarIntegrationScreen}
        />
        <Stack.Screen
          name="IndoorDirections"
          component={IndoorDirectionsScreen}
        />
        <Stack.Screen
          name="PointsOfInterest"
          component={PointsOfInterestScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
