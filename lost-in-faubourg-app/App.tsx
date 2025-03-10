import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './app/index';
let Clarity: any;
if (!__DEV__) {
  Clarity = require('@microsoft/react-native-clarity');
}
//import * as Clarity from '@microsoft/react-native-clarity';

// Initialize Clarity configuration
const clarityConfig = Clarity ? { logLevel: Clarity.LogLevel.Verbose } : null;

export default function App() {
  useEffect(() => {
    console.log('Clarity Object:', Clarity);

    // Start Clarity session when the app starts
    if (Clarity?.initialize) {
      Clarity.initialize('qlquku27ij', clarityConfig);
      console.log('Clarity session initialized.');

      // Start a new session and log session ID
      Clarity.startNewSession((sessionId: string) => {
        console.log(`New Clarity session started: ${sessionId}`);
      });
    } else {
      console.error('Clarity module is undefined. Recording will not start.');
    }

    // Handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`App state changed: ${nextAppState}`);

      if (Clarity && nextAppState === 'active') {
        const resumed = await Clarity.resume();
        console.log(
          resumed
            ? 'Clarity session resumed.'
            : 'Failed to resume Clarity session.',
        );

        // Retrieve and log the current session ID
        const sessionId = await Clarity.getCurrentSessionId();
        console.log(`Current Clarity session ID: ${sessionId}`);
      } else if (
        Clarity &&
        Clarity.pause &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        const paused = await Clarity.pause();
        console.log(
          paused
            ? 'Clarity session paused.'
            : 'Failed to pause Clarity session.',
        );
      }
    };

    // Listen for app state changes
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      // Cleanup event listener
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}
