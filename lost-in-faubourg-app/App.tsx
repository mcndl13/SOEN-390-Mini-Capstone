import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './app/index';
import Smartlook from 'react-native-smartlook-analytics';

export default function App() {
  useEffect(() => {
    Smartlook.instance.preferences.setProjectKey(
      '3bd71789c4bde426a3918d06387a634e35a46c1d',
    );

    Smartlook.instance.start();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        Smartlook.instance.stop();
      } else if (nextAppState === 'active') {
        Smartlook.instance.start();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
      Smartlook.instance.stop();
    };
  }, []);

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}
