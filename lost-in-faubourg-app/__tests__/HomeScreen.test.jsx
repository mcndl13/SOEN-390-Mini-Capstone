import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../components/HomeScreen';
import { Linking } from 'react-native';

const mockNavigation = { navigate: jest.fn() };

const renderHomeScreen = () =>
  render(<HomeScreen navigation={mockNavigation} />);

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    const { toJSON } = renderHomeScreen();
    expect(toJSON()).toMatchSnapshot();
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
    ({ buttonText, target }) => {
      const { getByText } = renderHomeScreen();
      const button = getByText(buttonText);
      fireEvent.press(button);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(target);
    },
  );

  test('renders title correctly', () => {
    const { getByText } = renderHomeScreen();
    expect(getByText('Welcome')).toBeTruthy();
  });

  test('opens shuttle schedule on button press', async () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(async () => {});
    const { getByText } = renderHomeScreen();
    const button = getByText('Shuttle Schedule');
    fireEvent.press(button);
    await waitFor(() => {
      expect(openURLSpy).toHaveBeenCalledWith(
        'https://www.concordia.ca/maps/shuttle-bus.html#depart',
      );
    });
    openURLSpy.mockRestore();
  });
});
