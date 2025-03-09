import React from 'react';
import { render, act } from '@testing-library/react-native';
import DirectionsScreen from '../../components/DirectionsScreen';
import { useRoute } from '@react-navigation/native';

// ...existing code if any...

// Helper: Accessibility Provider
export const AccessibilityContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <React.Fragment>
      {React.cloneElement(children as React.ReactElement, {
        isBlackAndWhite: false,
        isLargeText: false,
      })}
    </React.Fragment>
  );
};

// Helper functions to reduce duplication
export const renderDirectionsScreen = (params = {}) => {
  useRoute.mockReturnValue({ params });
  return render(
    <AccessibilityContextProvider>
      <DirectionsScreen />
    </AccessibilityContextProvider>,
  );
};

export const waitForTimeout = (ms = 0) =>
  act(() => new Promise((resolve) => setTimeout(resolve, ms)));
