import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
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

export const traceRoute = async (rendered: any) => {
	// press and wait for route trace to complete
	fireEvent.press(rendered.getByText('Trace route'));
	await waitForTimeout(700);
};

export const testBackButtonInteraction = async (rendered: any) => {
	// common back button assertions
	const backButton = rendered.getByText('Back to Search');
	expect(backButton).toBeTruthy();
	fireEvent.press(backButton);
	await waitForTimeout(200);
	expect(rendered.queryByText('Back to Search')).toBeNull();
	expect(rendered.queryByText('Returned to search view')).toBeTruthy();
};

export const selectCampus = async (rendered: any, campus: string) => {
	fireEvent.press(rendered.getByText(campus));
	await waitFor(() => {
		expect(rendered.queryByText(new RegExp(`${campus} set`))).toBeTruthy();
	});
};

export const selectMyLocation = async (rendered: any, expectedPattern: RegExp) => {
	fireEvent.press(rendered.getByText('Use My Location'));
	await waitFor(() => {
		expect(rendered.queryByText(expectedPattern)).toBeTruthy();
	});
};
