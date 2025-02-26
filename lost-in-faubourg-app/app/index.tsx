// App.js
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { AccessibilityProvider } from "../components/AccessibilitySettings";

// Import all your screens
import HomeScreen from "../components/HomeScreen";
import CampusMap from "../components/CampusMap";
import DirectionsScreen from "../components/DirectionsScreen"; 
import CalendarIntegrationScreen from "../components/CalendarIntegrationScreen";
import IndoorDirectionsScreen from "../components/IndoorDirectionsScreen";
import PointsOfInterestScreen from "../components/PointsOfInterestScreen";
import AccessibilitySettings from "../components/AccessibilitySettings";

const Stack = createStackNavigator();

export default function MainNavigator() {

  return (
    <AccessibilityProvider>
      <AccessibilitySettings />
      <Stack.Navigator initialRouteName="Home">
        {/* Make HomeScreen the first screen */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerTitle: "Home" }}
        />

        <Stack.Screen
          name="CampusMap"
          component={CampusMap}
          options={{ headerTitle: "Campus Map" }}
        />

        <Stack.Screen
          name="Directions"
          component={DirectionsScreen}
          options={{ headerTitle: "Directions" }}
        />

        <Stack.Screen
          name="CalendarIntegration"
          component={CalendarIntegrationScreen}
          options={{ headerTitle: "Calendar Integration" }}
        />

        <Stack.Screen
          name="IndoorDirections"
          component={IndoorDirectionsScreen}
          options={{ headerTitle: "Indoor Directions" }}
        />

        <Stack.Screen
          name="PointsOfInterest"
          component={PointsOfInterestScreen}
          options={{ headerTitle: "Points of Interest" }}
        />

        <Stack.Screen
          name="Settings"
          component={AccessibilitySettings}
          options={{ headerTitle: "Settings/Accessibilities" }}
        />
      </Stack.Navigator>
      
    </AccessibilityProvider>
  );
}
