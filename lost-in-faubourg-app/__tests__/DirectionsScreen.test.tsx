import React from 'react';
import { fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { stripHtml } from '../components/DirectionsScreen';
import {
  renderDirectionsScreen,
  waitForTimeout,
  traceRoute,
  testBackButtonInteraction,
  selectCampus,
  selectMyLocation,
} from './helpers/directionsTestHelpers';

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

jest.spyOn(global, 'fetch').mockImplementation(() => {
  return Promise.resolve({
    status: 200,
    json: async () => ({
      status: 'OK',
      routes: [
        {
          legs: [
            { steps: [{ html_instructions: '<b>Step 1 instruction</b>' }] },
          ],
        },
      ],
    }),
  } as any);
});

const defaultOrigin = { latitude: 45.4953534, longitude: -73.578549 };
const defaultDestination = { latitude: 45.4582, longitude: -73.6405 };

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
  test('sets steps to empty when API returns no steps', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });

    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        json: async () => ({
          status: 'OK',
          routes: [{ legs: [] }], // Ensure legs is empty
        }),
      } as any),
    );

    await act(async () => {
      await traceRoute(rendered);
      await waitForTimeout(1000); // Increased timeout
    });

    console.log('Rendered output:', rendered.toJSON()); // Debug log

    expect(rendered.queryByText('Turn-by-turn Directions')).toBeNull();

    const steps = rendered.queryAllByText(/^\d+\./);
    console.log('Matched steps:', steps); // Debug log
    expect(steps.length).toBe(0);
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

describe('Additional DirectionsScreen interactions', () => {
  test('changes travel mode when mode buttons are pressed', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    const drivingButton = rendered.getByTestId('DRIVING');
    const walkingButton = rendered.getByTestId('WALKING');
    await act(async () => {
      fireEvent.press(walkingButton);
      await waitForTimeout(100);
    });
    expect(rendered.getByText('Walking')).toBeTruthy();
    await act(async () => {
      fireEvent.press(drivingButton);
      await waitForTimeout(100);
    });
    expect(rendered.getByText('Driving')).toBeTruthy();
  });

  test('expands and collapses the directions panel when expand button is pressed', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    fireEvent.press(rendered.getByText('Find Route'));
    await waitForTimeout(800);
    const expandButton = await waitFor(() =>
      rendered.getByTestId('expandCollapseBtn'),
    );
    expect(expandButton).toBeTruthy();
    const { getByText } = within(expandButton);
    expect(getByText('Collapse')).toBeTruthy();
    fireEvent.press(expandButton);
    await waitFor(() => {
      expect(within(expandButton).getByText('Expand')).toBeTruthy();
    });
    fireEvent.press(expandButton);
    await waitFor(() => {
      expect(within(expandButton).getByText('Collapse')).toBeTruthy();
    });
  });

  test('handles campus button presses via onPlaceSelected callback', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectCampus(rendered, 'SGW');
    await selectCampus(rendered, 'Loyola');
  });

  test('handles error in fetching detailed directions', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce(() => Promise.reject(new Error('Test error')));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fireEvent.press(rendered.getByText('Find Route'));
    await waitForTimeout(800);
    expect(errorSpy).toHaveBeenCalledWith(
      'Directions fetch error',
      new Error('Test error'),
    );
    errorSpy.mockRestore();
  });

  test('expands directions panel via button press', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    fireEvent.press(rendered.getByText('Find Route'));
    await waitForTimeout(800);
    const expandButton = rendered.getByText(/Expand|Collapse/);
    expect(expandButton.props.children).toBe('Collapse');
    fireEvent.press(expandButton);
    await waitFor(() => {
      expect(rendered.getByText('Expand')).toBeTruthy();
    });
  });

  test('renders route steps when API returns steps', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    await act(async () => {
      await traceRoute(rendered);
      await waitForTimeout(700);
    });
    const routeStepsHeaders = await waitFor(() =>
      rendered.getAllByText('Route Steps'),
    );
    expect(routeStepsHeaders[0]).toBeTruthy();
    expect(rendered.getByText(/^1$/)).toBeTruthy();
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
