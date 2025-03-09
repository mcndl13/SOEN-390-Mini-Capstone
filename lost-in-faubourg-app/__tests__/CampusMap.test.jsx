import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CampusMap from '../components/CampusMap';
import * as Location from 'expo-location';
import { polygons } from '../components/polygonCoordinates';
import { AccessibilityContext } from '../components/AccessibilitySettings';

// --- Mocks ---
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MockMapView = (props) => <View {...props}>{props.children}</View>;
  const MockMarker = (props) => <View {...props}>{props.children}</View>;
  const MockPolygon = (props) => <View {...props}>{props.children}</View>;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
  };
});

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

// --- Helper functions ---
const setLocationMock = (
  coords = { latitude: 45.4953534, longitude: -73.578549 },
  status = 'granted',
) => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status });
  Location.getCurrentPositionAsync.mockResolvedValue({ coords });
};

const renderCampusMap = () => render(<CampusMap />);

/**
 * Helper that waits for "Loading Map..." text to appear.
 * This avoids inline nesting of waitFor inside each test.
 */
async function waitForLoadingMap(getByText) {
  await waitFor(() => {
    expect(getByText('Loading Map...')).toBeTruthy();
  });
}

/**
 * Helper that waits for the map region to match a given set of coords.
 */
async function waitForMapRegion(getByTestId, expectedCoords) {
  await waitFor(() => {
    const mapView = getByTestId('mapView');
    expect(mapView.props.region).toEqual({
      latitude: expectedCoords.latitude,
      longitude: expectedCoords.longitude,
      latitudeDelta: expect.any(Number),
      longitudeDelta: expect.any(Number),
    });
  });
}

/**
 * Helper that finds the user-location marker and checks its props.
 */
async function waitForCurrentLocationMarker(getByTestId) {
  await waitFor(() => {
    const mapView = getByTestId('mapView');
    const flatChildren = React.Children.toArray(mapView.props.children).flat();
    const markerComponent = flatChildren.find(
      (child) => child.props.testID === 'marker-current-location',
    );
    expect(markerComponent).toBeTruthy();
    expect(markerComponent.props.coordinate).toEqual({
      latitude: 45.4953534,
      longitude: -73.578549,
    });
    expect(markerComponent.props.title).toBe('You are here');
    expect(markerComponent.props.pinColor).toBe('blue');
  });
}

/**
 * Helper that presses a building marker and waits for the building info.
 */
async function pressMarkerAndCheckBuilding(
  getByTestId,
  getAllByText,
  markerId,
  polygon,
) {
  fireEvent.press(getByTestId(markerId));
  await waitFor(() => {
    const nameElements = getAllByText(polygon.name);
    expect(nameElements.length).toBeGreaterThan(0);
    const addressElements = getAllByText(
      `${polygon.address} - Concordia University`,
    );
    expect(addressElements.length).toBeGreaterThan(0);
  });
}

/**
 * Helper that waits for polygons to be rendered.
 */
async function waitForPolygons(getByTestId) {
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
      expect(polygonComponent.props.fillColor).toBe('#912338cc');
      expect(polygonComponent.props.strokeColor).toBe('#912338cc');
      expect(polygonComponent.props.strokeWidth).toBe(1);
    });
  });
}

/**
 * Helper that waits for a shuttle marker with a given ID to appear.
 */
async function waitForShuttleMarker(getByTestId, markerId, coords) {
  await waitFor(() => {
    const shuttleMarker = getByTestId(markerId);
    expect(shuttleMarker).toBeTruthy();
    expect(shuttleMarker.props.coordinate).toEqual(coords);
  });
}

// --- Tests ---
describe('CampusMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('map renders correctly with user location', async () => {
    setLocationMock();
    const { getByText, getByTestId } = renderCampusMap();

    // Flatten nesting by using helpers
    await waitForLoadingMap(getByText);
    await waitForMapRegion(getByTestId, {
      latitude: 45.4953534,
      longitude: -73.578549,
    });
  });

  test('switches to SGW campus on button press', async () => {
    setLocationMock();
    const { getByText, getByTestId } = renderCampusMap();

    await waitFor(() => {
      expect(getByText('SGW Campus')).toBeTruthy();
    });

    fireEvent.press(getByText('SGW Campus'));
    await waitForMapRegion(getByTestId, {
      latitude: 45.4953534,
      longitude: -73.578549,
    });
  });

  test('switches to Loyola campus on button press', async () => {
    setLocationMock({ latitude: 45.4953534, longitude: -73.6405 });
    const { getByText, getByTestId } = renderCampusMap();

    await waitFor(() => {
      expect(getByText('Loyola Campus')).toBeTruthy();
    });

    fireEvent.press(getByText('Loyola Campus'));
    await waitForMapRegion(getByTestId, {
      latitude: 45.4582,
      longitude: -73.6405,
    });
  });

  test('renders "You are here" marker correctly', async () => {
    setLocationMock();
    const { getByTestId } = renderCampusMap();
    await waitForCurrentLocationMarker(getByTestId);
  });

  test.each(polygons.map((polygon, index) => [polygon.name, index, polygon]))(
    'displays %s building information on marker press',
    async (_name, idx, polygon) => {
      setLocationMock();
      const { getByTestId, getAllByText } = renderCampusMap();

      // Wait for loading and region checks
      await waitFor(() => {
        expect(getAllByText('Loading Map...')).toBeTruthy();
      });
      await waitForMapRegion(getByTestId, {
        latitude: 45.4953534,
        longitude: -73.578549,
      });

      // Press the marker and check building info
      const markerId = `marker-${idx + 1}`;
      await pressMarkerAndCheckBuilding(
        getByTestId,
        getAllByText,
        markerId,
        polygon,
      );
    },
  );

  test('renders polygons correctly', async () => {
    setLocationMock();
    const { getByTestId } = renderCampusMap();
    await waitForPolygons(getByTestId);
  });

  test('renders shuttle markers correctly', async () => {
    setLocationMock();
    const { getByTestId } = renderCampusMap();
    await waitForShuttleMarker(getByTestId, 'marker-BUS1', {
      latitude: 45.4953534,
      longitude: -73.578549,
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
        expect(pc.props.fillColor).toBe('#000000cc');
        expect(pc.props.strokeColor).toBe('#000000');
        expect(pc.props.strokeWidth).toBe(2);
      });
    });
  });

  test('renders current location marker with black pin in black and white mode', async () => {
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
      const userMarker = flatChildren.find(
        (child) => child.props.testID === 'marker-current-location',
      );
      expect(userMarker).toBeTruthy();
      expect(userMarker.props.pinColor).toBe('black');
    });
  });
});
