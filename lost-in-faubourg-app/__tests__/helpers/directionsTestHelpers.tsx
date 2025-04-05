import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DirectionsScreen from '../../components/DirectionsScreen';
import { useRoute } from '@react-navigation/native';

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

// Removed act() wrapper from render call.
export const renderDirectionsScreen = (params = {}) => {
  useRoute.mockReturnValue({ params });
  return render(
    <AccessibilityContextProvider>
      <DirectionsScreen />
    </AccessibilityContextProvider>,
  );
};

// Removed act() wrapper from waitForTimeout.
export const waitForTimeout = (ms = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const traceRoute = async (rendered: any) => {
  await (async () => {
    const findRouteButton = await waitFor(() =>
      rendered.getByTestId('findRouteBtn'),
    );
    fireEvent.press(findRouteButton);
    await waitForTimeout(700);
  })();
};

export const testBackButtonInteraction = async (rendered: any) => {
  await (async () => {
    const backButton = rendered.getByText('Back');
    expect(backButton).toBeTruthy();
    fireEvent.press(backButton);
  })();
  await waitFor(() => {
    expect(rendered.queryByText('Back')).toBeNull();
    expect(rendered.queryByText('Returned to search view')).toBeTruthy();
  });
};

export const selectCampus = async (rendered: any, campus: string) => {
  await (async () => {
    fireEvent.press(rendered.getByText(campus));
    // Relax regex to match text like "SGW Campus set as origin"
    await waitFor(() => {
      expect(rendered.queryByText(new RegExp(`${campus}.*set`))).toBeTruthy();
    });
  })();
};

export const selectMyLocation = async (
  rendered: any,
  expectedPattern: RegExp,
) => {
  await (async () => {
    fireEvent.press(rendered.getByTestId('myLocationBtn'));
    await waitFor(
      () => {
        expect(rendered.queryByText(expectedPattern)).toBeTruthy();
      },
      { timeout: 2000 },
    );
  })();
};
