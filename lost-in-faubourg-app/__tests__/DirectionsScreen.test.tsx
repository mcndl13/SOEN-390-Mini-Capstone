import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { stripHtml } from '../components/DirectionsScreen';
import {
  renderDirectionsScreen,
  waitForTimeout,
  traceRoute,
  testBackButtonInteraction,
  selectCampus,
  selectMyLocation,
} from './helpers/directionsTestHelpers';

// --- Existing mocks and setup remain unchanged ---
jest.mock(
  '@env',
  () => ({
    GOOGLE_MAPS_API_KEY: 'dummy-key',
  }),
  { virtual: true },
);

try {
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
} catch (err) {
  console.log(`NativeAnimatedHelper not found ${err}`);
}

jest.mock('expo-constants', () => ({
  statusBarHeight: 20,
  platform: { os: 'ios' },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => <Text {...props}>icon</Text>,
  };
});

beforeAll(() => {
  process.env.EXPO_OS = 'ios';
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

jest.mock('react-native-maps-directions', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      if (props.onReady) {
        setTimeout(() => props.onReady({ distance: 5, duration: 10 }), 10);
      }
      return null;
    },
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const FakeMapView = React.forwardRef((props: any, ref: React.Ref<any>) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      animateCamera: jest.fn(),
      fitToCoordinates: jest.fn(),
      getCamera: jest.fn().mockResolvedValue({ center: props.initialRegion }),
    }));
    return <View {...props} />;
  });
  return {
    __esModule: true,
    default: FakeMapView,
    Marker: (props: any) => <View {...props} />,
    Polygon: (props: any) => <View {...props} />,
  };
});

jest.mock('react-native-google-places-autocomplete', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    GooglePlacesAutocomplete: (props: any) => (
      <View>
        <Text>{props.placeholder}</Text>
      </View>
    ),
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' }),
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 45.0, longitude: -73.0 } }),
  ),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
}));

jest.mock('../services/shuttleService', () => ({
  fetchShuttlePositions: jest.fn(),
  startShuttleTracking: (callback: Function) => {
    callback({ buses: [], stations: [] });
    return () => {};
  },
}));

// --- Existing tests ---
describe('DirectionsScreen', () => {
  test('renders origin and destination input placeholders', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('Enter starting point')).toBeTruthy();
    expect(rendered.getByText('Enter destination')).toBeTruthy();
  });

  test('renders Use My Location and Clear Points buttons', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('My Location')).toBeTruthy();
    expect(rendered.getByText('Clear Points')).toBeTruthy();
  });

  test('renders Trace route button', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('Find Route')).toBeTruthy();
  });

  test('calls clearPoints when Clear Points is pressed', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    await act(async () => {
      fireEvent.press(rendered.getByText('Clear Points'));
    });
    await waitFor(() => {
      expect(rendered.queryByText('Points cleared')).toBeTruthy();
    });
  });

  test('matches snapshot', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.toJSON()).toMatchSnapshot();
  });
});

describe('More DirectionsScreen interactions', () => {
  const { useRoute } = require('@react-navigation/native');

  afterEach(() => {
    useRoute.mockReturnValue({ params: {} });
  });

  test('shows error when tracing route with no origin', async () => {
    const rendered = renderDirectionsScreen({
      destination: { latitude: 45.5, longitude: -73.6 },
    });
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Find Route'));
    await waitFor(() => {
      expect(rendered.queryByText('Please set an origin point')).toBeTruthy();
    });
  });

  test('shows error when tracing route with no destination', async () => {
    const rendered = renderDirectionsScreen({
      origin: { latitude: 45.5, longitude: -73.6 },
    });
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Find Route'));
    await waitFor(() => {
      expect(
        rendered.queryByText('Please set a destination point'),
      ).toBeTruthy();
    });
  });

  test('sets campus points and toggles shuttle route', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectCampus(rendered, 'SGW');
    await selectCampus(rendered, 'Loyola');
    await traceRoute(rendered);
    await waitForTimeout(600);
    expect(rendered.getByText('Back')).toBeTruthy();
  });

  test('toggles shuttle visibility', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    const toggleButton = rendered.getByTestId('shuttlesBtn');
    const initialText = toggleButton.props.children;
    fireEvent.press(toggleButton);
    await waitForTimeout(200);
    const toggledText = rendered.getByTestId('shuttlesBtn').props.children;
    expect(toggledText).not.toEqual(initialText);
  });

  test('handles back button press in directions view', async () => {
    const defaultOrigin = { latitude: 45.4953534, longitude: -73.578549 };
    const defaultDestination = { latitude: 45.4582, longitude: -73.6405 };
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    fireEvent.press(rendered.getByText('Find Route'));
    await waitForTimeout(600);
    await testBackButtonInteraction(rendered);
  });

  test('processes current location button press', async () => {
    const geometry = require('../utils/geometry');
    jest.spyOn(geometry, 'isUserInBuilding').mockReturnValue({
      latitude: 45.0 + 0.0001,
      longitude: -73.0 + 0.0001,
    });
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectMyLocation(rendered, /Building location set/);
  });
});

// --- Additional tests to increase coverage ---
describe('Additional DirectionsScreen interactions - Increased Coverage', () => {
  const defaultOrigin = { latitude: 45.4953534, longitude: -73.578549 };
  const defaultDestination = { latitude: 45.4582, longitude: -73.6405 };

  test('renders route summary when valid origin and destination are provided', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Find Route'));
    await waitForTimeout(600);
    // Expect that the "Back" button appears indicating the directions panel is expanded
    expect(rendered.getByText('Back')).toBeTruthy();
    // Additional route summary details (like duration or distance) could be checked here if rendered
  });


  test('shows error when tracing route with both origin and destination missing', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Find Route'));
    await waitForTimeout(600);
    // Check that at least one error message appears (either for missing origin or destination)
    const originError = rendered.queryByText('Please set an origin point');
    const destinationError = rendered.queryByText('Please set a destination point');
    expect(originError || destinationError).toBeTruthy();
  });
});


jest.mock('react-native-google-places-autocomplete', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    GooglePlacesAutocomplete: (props: any) => (
      <View>
        <Text>{props.placeholder}</Text>
      </View>
    ),
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' }),
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 45.0, longitude: -73.0 } }),
  ),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
}));

jest.mock('../services/shuttleService', () => ({
  fetchShuttlePositions: jest.fn(),
  startShuttleTracking: (callback: Function) => {
    callback({ buses: [], stations: [] });
    return () => {};
  },
}));

describe('DirectionsScreen', () => {
  test('renders origin and destination input placeholders', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('Enter starting point')).toBeTruthy();
    expect(rendered.getByText('Enter destination')).toBeTruthy();
  });

  test('renders Use My Location and Clear Points buttons', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('My Location')).toBeTruthy();
    expect(rendered.getByText('Clear Points')).toBeTruthy();
  });

  test('renders Trace route button', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('Find Route')).toBeTruthy();
  });

  test('calls clearPoints when Clear Points is pressed', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    await act(async () => {
      fireEvent.press(rendered.getByText('Clear Points'));
    });
    await waitFor(() => {
      expect(rendered.queryByText('Points cleared')).toBeTruthy();
    });
  });

  test('matches snapshot', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.toJSON()).toMatchSnapshot();
  });
});

describe('More DirectionsScreen interactions', () => {
  const { useRoute } = require('@react-navigation/native');

  afterEach(() => {
    useRoute.mockReturnValue({ params: {} });
  });

  test('shows error when tracing route with no origin', async () => {
    const rendered = renderDirectionsScreen({
      destination: { latitude: 45.5, longitude: -73.6 },
    });
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Find Route'));
    await waitFor(() => {
      expect(rendered.queryByText('Please set an origin point')).toBeTruthy();
    });
  });

  test('shows error when tracing route with no destination', async () => {
    const rendered = renderDirectionsScreen({
      origin: { latitude: 45.5, longitude: -73.6 },
    });
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Find Route'));
    await waitFor(() => {
      expect(
        rendered.queryByText('Please set a destination point'),
      ).toBeTruthy();
    });
  });

  test('sets campus points and toggles shuttle route', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectCampus(rendered, 'SGW');
    await selectCampus(rendered, 'Loyola');
    await traceRoute(rendered);
    await waitForTimeout(600);
    expect(rendered.getByText('Back')).toBeTruthy();
  });

  test('toggles shuttle visibility', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    const toggleButton = rendered.getByTestId('shuttlesBtn');
    const initialText = toggleButton.props.children;
    fireEvent.press(toggleButton);
    await waitForTimeout(200);
    const toggledText = rendered.getByTestId('shuttlesBtn').props.children;
    expect(toggledText).not.toEqual(initialText);
  });

  test('handles back button press in directions view', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    fireEvent.press(rendered.getByText('Find Route'));
    await waitForTimeout(600);
    await testBackButtonInteraction(rendered);
  });

  test('processes current location button press', async () => {
    const geometry = require('../utils/geometry');
    jest.spyOn(geometry, 'isUserInBuilding').mockReturnValue({
      latitude: 45.0 + 0.0001,
      longitude: -73.0 + 0.0001,
    });
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectMyLocation(rendered, /Building location set/);
  });
});

const defaultOrigin = { latitude: 45.4953534, longitude: -73.578549 };
const defaultDestination = { latitude: 45.4582, longitude: -73.6405 };

describe('Additional DirectionsScreen interactions - New Tests', () => {
  test('collapses directions panel on pressing the "Back" button', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    await act(async () => {
      fireEvent.press(rendered.getByText('Find Route'));
    });
    await waitForTimeout(1200);
    // The "Back" button appears in the expanded panel.
    const backButton = rendered.getByText('Back');
    expect(backButton).toBeTruthy();
    // Press the "Back" button to collapse the panel.
    fireEvent.press(backButton);
    await waitForTimeout(600);
    // After collapse, the panel should no longer show route steps.
    expect(rendered.queryByText('Route Steps')).toBeNull();
  });
});

describe('Helper function stripHtml', () => {
  test('removes HTML tags correctly', () => {
    const input = '<b>Hello</b> <i>World</i>! This is <u>test</u>.';
    const output = stripHtml(input);
    expect(output).toBe('Hello World! This is test.');
  });

  test('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('Stable tests for DirectionsScreen', () => {

  test('shows origin and destination when set', () => {
    const origin = { latitude: 45.5, longitude: -73.6 };
    const destination = { latitude: 45.51, longitude: -73.61 };
    const { getByText } = renderDirectionsScreen({ origin, destination });

    expect(getByText('Origin')).toBeTruthy();
    expect(getByText('Destination')).toBeTruthy();
  });

  test('shuttle button is present and can be pressed', () => {
    const { getByTestId } = renderDirectionsScreen();
    const shuttleButton = getByTestId('shuttlesBtn');
    fireEvent.press(shuttleButton); // Should be no-op or toggle state
  });

  test('locate button is present and clickable', () => {
    const { getByTestId } = renderDirectionsScreen();
    const locateButton = getByTestId('locateBtn');
    fireEvent.press(locateButton); // Simulate press
  });

  test('can press My Location button', () => {
    const { getByText } = renderDirectionsScreen();
    fireEvent.press(getByText('My Location')); // Should set origin or destination
  });
});
