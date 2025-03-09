process.env.EXPO_OS = process.env.EXPO_OS || 'ios';

jest.mock('expo-constants', () => ({
  statusBarHeight: 20,
  platform: { os: 'ios' },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
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

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DirectionsScreen, { stripHtml } from '../components/DirectionsScreen';
import { renderDirectionsScreen, waitForTimeout, traceRoute, testBackButtonInteraction, selectCampus, selectMyLocation } from './helpers/directionsTestHelpers';

// Add default location definitions to be used in tests
const defaultOrigin = { latitude: 45.4953534, longitude: -73.578549 };
const defaultDestination = { latitude: 45.4582, longitude: -73.6405 };

beforeAll(() => {
  process.env.EXPO_OS = 'ios';
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

jest.mock('react-native-maps-directions', () => {
  const React = require('react');
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
  it('renders origin and destination input placeholders', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('Enter origin')).toBeTruthy();
    expect(rendered.getByText('Enter destination')).toBeTruthy();
  });

  it('renders Use My Location and Clear Points buttons', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('Use My Location')).toBeTruthy();
    expect(rendered.getByText('Clear Points')).toBeTruthy();
  });

  it('renders Trace route button', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.getByText('Trace route')).toBeTruthy();
  });

  it('calls clearPoints when Clear Points is pressed', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    await act(async () => {
      fireEvent.press(rendered.getByText('Clear Points'));
    });
    await waitFor(() => {
      expect(rendered.queryByText('Points cleared')).toBeTruthy();
    });
  });

  it('matches snapshot', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(0);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('sets steps to empty when API returns no steps', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        json: async () => ({
          status: 'OK',
          routes: [{ legs: [{}] }],
        }),
      } as any),
    );
    await act(async () => {
      await traceRoute(rendered);
      await waitForTimeout(700);
    });
    expect(rendered.queryByText('Route Steps')).toBeNull();
    expect(rendered.queryAllByText(/^\d+\./).length).toBe(0);
  });
});

// Refactored duplicate interactions using helper functions
describe('More DirectionsScreen interactions', () => {
  const { useRoute } = require('@react-navigation/native');

  afterEach(() => {
    useRoute.mockReturnValue({ params: {} });
  });

  it('shows error when tracing route with no origin', async () => {
    const rendered = renderDirectionsScreen({
      destination: { latitude: 45.5, longitude: -73.6 },
    });
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Trace route'));
    await waitFor(() => {
      expect(rendered.queryByText('Please set an origin point')).toBeTruthy();
    });
  });

  it('shows error when tracing route with no destination', async () => {
    const rendered = renderDirectionsScreen({
      origin: { latitude: 45.5, longitude: -73.6 },
    });
    await waitForTimeout(600);
    fireEvent.press(rendered.getByText('Trace route'));
    await waitFor(() => {
      expect(rendered.queryByText('Please set a destination point')).toBeTruthy();
    });
  });

  it('sets campus points and toggles shuttle route', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectCampus(rendered, 'SGW Campus');
    await selectCampus(rendered, 'Loyola Campus');
    await traceRoute(rendered);
    await waitForTimeout(600);
    expect(rendered.getByText('Back to Search')).toBeTruthy();
  });

  it('toggles shuttle visibility', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    const toggleButton = rendered.getByText(/Show Shuttles|Hide Shuttles/);
    const initialText = toggleButton.props.children;
    fireEvent.press(toggleButton);
    await waitForTimeout(200);
    const toggledText = rendered.getByText(/Show Shuttles|Hide Shuttles/).props.children;
    expect(toggledText).not.toEqual(initialText);
  });

  it('handles back button press in directions view', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    await waitForTimeout(600);
    await testBackButtonInteraction(rendered);
  });

  it('processes current location button press', async () => {
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
  const { useRoute } = require('@react-navigation/native');

  it('changes travel mode when mode buttons are pressed', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    const drivingButton = rendered.getAllByText('Driving')[0];
    const walkingButton = rendered.getAllByText('Walking')[0];
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

  it('expands and collapses the directions panel when expand button is pressed', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    await waitForTimeout(700);
    const expandButton = await waitFor(() =>
      rendered.getByText(/Expand|Collapse/),
    );
    expect(expandButton).toBeTruthy();
    expect(expandButton.props.children).toBe('Expand');
    fireEvent.press(expandButton);
    await waitForTimeout(200);
    expect(rendered.getByText('Collapse')).toBeTruthy();
    fireEvent.press(rendered.getByText('Collapse'));
    await waitForTimeout(200);
    expect(rendered.getByText('Expand')).toBeTruthy();
  });

  it('handles campus button presses via onPlaceSelected callback', async () => {
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectCampus(rendered, 'SGW Campus');
    await selectCampus(rendered, 'Loyola Campus');
  });

  it('handles back button press in directions view', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    await waitForTimeout(600);
    await testBackButtonInteraction(rendered);
  });

  it('processes current location button press with building detection', async () => {
    const geometry = require('../utils/geometry');
    jest.spyOn(geometry, 'isUserInBuilding').mockReturnValue({
      latitude: 45.0 + 0.0001,
      longitude: -73.0 + 0.0001,
    });
    const rendered = renderDirectionsScreen();
    await waitForTimeout(600);
    await selectMyLocation(rendered, /Building location set/);
  });

  it('handles error in fetching detailed directions', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.reject(new Error('Test error')),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fireEvent.press(rendered.getByText('Trace route'));
    await waitForTimeout(800);
    expect(errorSpy).toHaveBeenCalledWith(
      'Directions fetch error',
      new Error('Test error'),
    );
    errorSpy.mockRestore();
  });

  it('expands directions panel via button press', async () => {
    const rendered = renderDirectionsScreen({
      origin: defaultOrigin,
      destination: defaultDestination,
    });
    fireEvent.press(rendered.getByText('Trace route'));
    await waitForTimeout(800);
    const expandButton = rendered.getByText(/Expand|Collapse/);
    expect(expandButton.props.children).toBe('Expand');
    fireEvent.press(expandButton);
    await waitFor(() => {
      expect(rendered.getByText('Collapse')).toBeTruthy();
    });
  });

  it('renders route steps when API returns steps', async () => {
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
    expect(rendered.getByText(/^1\./)).toBeTruthy();
  });
});

describe('Helper function stripHtml', () => {
  it('removes HTML tags correctly', () => {
    const input = '<b>Hello</b> <i>World</i>! This is <u>test</u>.';
    const output = stripHtml(input);
    expect(output).toBe('Hello World! This is test.');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});
