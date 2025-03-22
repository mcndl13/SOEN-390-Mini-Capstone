import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '../components/HomeScreen';
import { Linking } from 'react-native';
import * as Location from 'expo-location';

const mockNavigation = { navigate: jest.fn() };

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
}));

const renderHomeScreen = () => {
  return render(<HomeScreen navigation={mockNavigation} />);
};

describe('HomeScreen', () => {
  beforeAll(() => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', async () => {
    const { toJSON } = renderHomeScreen();
    await waitFor(() => {
      expect(toJSON()).toMatchSnapshot();
    });
  });

  const navigationTests = [
    { buttonText: 'Explore Campus Map', target: 'CampusMap' },
    { buttonText: 'Get Directions', target: 'Directions' },
    { buttonText: 'Connect to Google Calendar', target: 'CalendarIntegration' },
    { buttonText: 'Indoor Navigation', target: 'IndoorDirections' },
    { buttonText: 'Find Points of Interest', target: 'PointsOfInterest' },
  ];

  test.each(navigationTests)(
    'navigates to $target when "$buttonText" button is pressed',
    async ({ buttonText, target }) => {
      const { getByText } = renderHomeScreen();
      // Wait for useEffect updates and button to render
      await waitFor(() => getByText(buttonText));
      const button = getByText(buttonText);
      act(() => {
        fireEvent.press(button);
      });
      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(target);
      });
    },
  );

  test('renders title correctly', async () => {
    const { getByText } = renderHomeScreen();
    await waitFor(() => {
      expect(getByText('Welcome')).toBeTruthy();
    });
  });

  test('opens shuttle schedule on button press', async () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(async () => {});
    const { getByText } = renderHomeScreen();
    await waitFor(() => getByText('Shuttle Schedule'));
    const button = getByText('Shuttle Schedule');
    act(() => {
      fireEvent.press(button);
    });
    await waitFor(() => {
      expect(openURLSpy).toHaveBeenCalledWith(
        'https://www.concordia.ca/maps/shuttle-bus.html#depart',
      );
    });
    openURLSpy.mockRestore();
  });
});