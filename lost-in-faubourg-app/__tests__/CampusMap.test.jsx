import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CampusMap from '../components/CampusMap';
import * as Location from 'expo-location';
import { polygons } from '../components/polygonCoordinates';
import { AccessibilityContext } from '../components/AccessibilitySettings';
import { MapComponentFactory } from '../components/CampusMap';

process.env.EXPO_OS = 'ios';

// Override console.warn to ignore "No Place ID found" warnings.
const originalConsoleWarn = console.warn;
console.warn = (message, ...args) => {
  if (typeof message === 'string' && message.includes('No Place ID found')) {
    return;
  }
  originalConsoleWarn(message, ...args);
};

// --- Mocks ---
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const PropTypes = require('prop-types');

  const MockMapView = (props) => <View {...props}>{props.children}</View>;
  MockMapView.propTypes = {
    children: PropTypes.node,
  };

  const MockMarker = (props) => <View {...props}>{props.children}</View>;
  MockMarker.propTypes = {
    children: PropTypes.node,
  };

  const MockPolygon = (props) => <View {...props}>{props.children}</View>;
  MockPolygon.propTypes = {
    children: PropTypes.node,
  };

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('../services/shuttleService', () => ({
  fetchShuttlePositions: jest.fn().mockResolvedValue({
    buses: [
      {
        ID: 'BUS1',
        Latitude: 45.4953534,
        Longitude: -73.578549,
        IconImage: 'bus.png',
      },
    ],
    stations: [
      {
        ID: 'GP1',
        Latitude: 45.496,
        Longitude: -73.579,
        IconImage: 'station.png',
      },
    ],
    centerPoint: { Latitude: 45.4953534, Longitude: -73.578549 },
  }),
  startShuttleTracking: jest.fn().mockImplementation((callback) => {
    callback({
      buses: [
        {
          ID: 'BUS1',
          Latitude: 45.4953534,
          Longitude: -73.578549,
          IconImage: 'bus.png',
        },
      ],
      stations: [
        {
          ID: 'GP1',
          Latitude: 45.496,
          Longitude: -73.579,
          IconImage: 'station.png',
        },
      ],
      centerPoint: { Latitude: 45.4953534, Longitude: -73.578549 },
    });
    return () => {};
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props) => <Text {...props} />,
  };
});

// --- Helper functions ---
const setLocationMock = (
  coords = { latitude: 45.4953534, longitude: -73.578549 },
  status = 'granted',
) => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status });
  Location.getCurrentPositionAsync.mockResolvedValue({ coords });
};

const renderCampusMap = () => render(<CampusMap />);

// --- Tests ---
describe('CampusMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('map renders correctly with user location', async () => {
    setLocationMock();
    const { getByText, getByTestId } = renderCampusMap();

    await waitFor(() => {
      expect(getByText('Loading Map...')).toBeTruthy();
    });

    await waitFor(() => {
      const mapView = getByTestId('mapView');
      expect(mapView.props.region).toEqual({
        latitude: 45.4953534,
        longitude: -73.578549,
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      });
    });
  });

  test('switches to SGW campus on button press', async () => {
    setLocationMock();
    const { getByText, getByTestId } = renderCampusMap();

    await waitFor(() => {
      expect(getByText('SGW Campus')).toBeTruthy();
    });

    fireEvent.press(getByText('SGW Campus'));

    await waitFor(() => {
      const mapView = getByTestId('mapView');
      expect(mapView.props.region).toEqual({
        latitude: 45.4953534,
        longitude: -73.578549,
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      });
    });
  });

  test('switches to Loyola campus on button press', async () => {
    setLocationMock({ latitude: 45.4953534, longitude: -73.6405 });
    const { getByText, getByTestId } = renderCampusMap();

    await waitFor(() => {
      expect(getByText('Loyola Campus')).toBeTruthy();
    });

    fireEvent.press(getByText('Loyola Campus'));

    await waitFor(() => {
      const mapView = getByTestId('mapView');
      expect(mapView.props.region).toEqual({
        latitude: 45.4582,
        longitude: -73.6405,
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      });
    });
  });

  test.each(polygons.map((polygon, index) => [polygon.name, index, polygon]))(
    'displays %s building information on marker press',
    async (name, index, polygon) => {
      setLocationMock();
      const { getByTestId, getAllByText } = renderCampusMap();

      await waitFor(() => {
        expect(getAllByText('Loading Map...')).toBeTruthy();
      });

      await waitFor(() => {
        const mapView = getByTestId('mapView');
        expect(mapView.props.region).toEqual({
          latitude: 45.4953534,
          longitude: -73.578549,
          latitudeDelta: expect.any(Number),
          longitudeDelta: expect.any(Number),
        });
      });

      fireEvent.press(getByTestId(`marker-${index + 1}`));

      await waitFor(() => {
        const nameElements = getAllByText(polygon.name);
        expect(nameElements.length).toBeGreaterThan(0);
        const addressElements = getAllByText(
          `${polygon.address} - Concordia University`,
        );
        expect(addressElements.length).toBeGreaterThan(0);
      });
    },
  );

  test('renders polygons correctly', async () => {
    setLocationMock();
    const { getByTestId } = renderCampusMap();

    await waitFor(() => {
      const mapView = getByTestId('mapView');
      const flatChildren = mapView.props.children.flat();
      polygons.forEach((polygon, index) => {
        const polygonComponent = flatChildren.find(
          (child) =>
            child.key === index.toString() && child.type.name === 'MockPolygon',
        );
        expect(polygonComponent).toBeTruthy();
        expect(polygonComponent.props.coordinates).toEqual(polygon.boundaries);
        expect(polygonComponent.props.fillColor).toBe('#91233833');
        expect(polygonComponent.props.strokeColor).toBe('#912338');
        expect(polygonComponent.props.strokeWidth).toBe(2);
      });
    });
  });

  test('renders shuttle markers correctly', async () => {
    setLocationMock();
    const { getByTestId } = renderCampusMap();

    await waitFor(() => {
      const shuttleMarker = getByTestId('marker-BUS1');
      expect(shuttleMarker).toBeTruthy();
      expect(shuttleMarker.props.coordinate).toEqual({
        latitude: 45.4953534,
        longitude: -73.578549,
      });
    });
  });
});

describe('CampusMap additional tests', () => {
  test('handles permission denied gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    setLocationMock({ latitude: 0, longitude: 0 }, 'denied');
    const { getByText } = renderCampusMap();
    await waitFor(() => {
      expect(getByText('Loading Map...')).toBeTruthy();
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Permission to access location was denied',
    );
    consoleSpy.mockRestore();
  });

  test('calls cleanup for shuttle tracking on unmount', async () => {
    const cleanupMock = jest.fn();
    const originalStartShuttleTracking =
      require('../services/shuttleService').startShuttleTracking;
    require('../services/shuttleService').startShuttleTracking = jest.fn(
      (callback) => {
        callback({
          buses: [],
          stations: [],
          centerPoint: { Latitude: 45.0, Longitude: -73.0 },
        });
        return cleanupMock;
      },
    );

    setLocationMock();
    const { unmount } = renderCampusMap();
    unmount();
    expect(cleanupMock).toHaveBeenCalled();
    require('../services/shuttleService').startShuttleTracking =
      originalStartShuttleTracking;
  });
});

describe('CampusMap accessibility customization', () => {
  const CustomAccessibilityProvider = ({ children }) => (
    <AccessibilityContext.Provider
      value={{
        isBlackAndWhite: true,
        isLargeText: false,
        setIsBlackAndWhite: jest.fn(),
        setIsLargeText: jest.fn(),
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );

  test('renders polygons in black and white mode', async () => {
    setLocationMock();
    const { getByTestId } = render(
      <CustomAccessibilityProvider>
        <CampusMap />
      </CustomAccessibilityProvider>,
    );

    await waitFor(() => {
      const mapView = getByTestId('mapView');
      const flatChildren = React.Children.toArray(
        mapView.props.children,
      ).flat();
      const polygonComponents = flatChildren.filter(
        (child) =>
          child.props && child.props.coordinates && child.props.fillColor,
      );
      expect(polygonComponents.length).toBe(polygons.length);
      polygonComponents.forEach((pc) => {
        expect(pc.props.fillColor).toBe('#00000033');
        expect(pc.props.strokeColor).toBe('#000000');
        expect(pc.props.strokeWidth).toBe(2);
      });
    });
  });
});

describe('Toggle buttons functionality', () => {
  test('toggles opening hours text on press', async () => {
    setLocationMock();
    const { getByTestId, getByText, queryByText } = renderCampusMap();

    await waitFor(() => expect(getByTestId('marker-1')).toBeTruthy());
    fireEvent.press(getByTestId('marker-1'));

    const toggleBtn = await waitFor(() => getByText('Opening Hours'));
    expect(toggleBtn).toBeTruthy();

    fireEvent.press(toggleBtn);

    expect(getByText('Opening Hours')).toBeTruthy();
    expect(queryByText('Loading...')).toBeNull();
  });

  test('toggles shuttle markers on press', async () => {
    setLocationMock();
    const { getByTestId, queryByTestId } = renderCampusMap();

    await waitFor(() => expect(getByTestId('marker-BUS1')).toBeTruthy());

    const toggleBtn = await waitFor(() => getByTestId('shuttlesBtn'));
    expect(toggleBtn).toBeTruthy();

    fireEvent.press(toggleBtn);

    await waitFor(() => {
      expect(queryByTestId('marker-BUS1')).toBeNull();
    });

    fireEvent.press(getByTestId('shuttlesBtn'));

    await waitFor(() => {
      expect(getByTestId('marker-BUS1')).toBeTruthy();
    });
  });
});

import { MapComponentFactory } from './MapComponentFactory';

const mockBuildings = [
  { latitude: 45.495, name: 'SGW Building 1' },
  { latitude: 45.496, name: 'SGW Building 2' },
  { latitude: 45.455, name: 'Loyola Building 1' },
  { latitude: 45.456, name: 'Loyola Building 2' },
  { latitude: 45.48, name: 'Out of Range' },
];

// Mock coordinates
const SGW_COORDS = { lat: 45.4971, lng: -73.5790 };
const LOYOLA_COORDS = { lat: 45.4580, lng: -73.6405 };

describe('MapComponentFactory.createMapConfiguration', () => {
  beforeAll(() => {
    jest.spyOn(MapComponentFactory, 'createBuildings').mockImplementation(() => mockBuildings);
  });

  const testCases = [
    {
      campus: 'SGW',
      expectedCoords: SGW_COORDS,
      expectedBuildings: [
        { latitude: 45.495, name: 'SGW Building 1' },
        { latitude: 45.496, name: 'SGW Building 2' },
      ],
    },
    {
      campus: 'Loyola',
      expectedCoords: LOYOLA_COORDS,
      expectedBuildings: [
        { latitude: 45.455, name: 'Loyola Building 1' },
        { latitude: 45.456, name: 'Loyola Building 2' },
      ],
    },
    {
      campus: 'Unknown',
      expectedCoords: SGW_COORDS,
      expectedBuildings: mockBuildings,
    },
  ];

  testCases.forEach(({ campus, expectedCoords, expectedBuildings }) => {
    it(`returns correct config for campus: ${campus}`, () => {
      const config = MapComponentFactory.createMapConfiguration(campus);
      expect(config.coords).toEqual(expectedCoords);
      expect(config.zoomLevel).toBe(0.005);
      expect(config.defaultBuildings).toEqual(expectedBuildings);
    });
  });
});

