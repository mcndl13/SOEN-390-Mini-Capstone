import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './app/(tabs)/index';

export default function App() {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}