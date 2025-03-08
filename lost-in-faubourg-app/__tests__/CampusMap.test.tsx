import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CampusMap from '../components/CampusMap';
import * as Location from 'expo-location';
import { polygons } from '../components/polygonCoordinates';
import { AccessibilityContext } from '../components/AccessibilitySettings';

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

jest.mock('../services/shuttleService', () => {
  return {
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
    startShuttleTracking: jest
      .fn()
      .mockImplementation((callback, interval = 15000) => {
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
  };
});

describe('CampusMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('map renders correctly with user location', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

    const { getByText, getByTestId } = render(<CampusMap />);

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

  it('switches to SGW campus on button press', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

    const { getByText, getByTestId } = render(<CampusMap />);

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

  it('switches to Loyola campus on button press', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.6405 },
    });

    const { getByText, getByTestId } = render(<CampusMap />);

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

  it('renders "You are here" marker correctly', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      const mapView = getByTestId('mapView');

      if (mapView) {
        const flatChildren = React.Children.toArray(
          mapView.props.children,
        ).flat();
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
      } else {
        console.error('MapView not found');
      }
    });
  });

  polygons.forEach((polygon, index) => {
    it(`displays ${polygon.name} building information on marker press`, async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 45.4953534, longitude: -73.578549 },
      });

      const { getByTestId, getAllByText } = render(<CampusMap />);

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
    });
  });

  it('renders polygons correctly', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      const mapView = getByTestId('mapView');

      if (mapView) {
        const flatChildren = mapView.props.children.flat();
        polygons.forEach((polygon, index) => {
          const polygonComponent = flatChildren.find(
            (child) =>
              child.key === index.toString() &&
              child.type.name === 'MockPolygon',
          );

          if (polygonComponent) {
            expect(polygonComponent.props.coordinates).toEqual(
              polygon.boundaries,
            );
            expect(polygonComponent.props.fillColor).toBe('#912338cc');
            expect(polygonComponent.props.strokeColor).toBe('#912338cc');
            expect(polygonComponent.props.strokeWidth).toBe(1);
          } else {
            console.error(`Polygon ${index} not found`);
          }
          expect(polygonComponent).toBeTruthy();
        });
      } else {
        console.error('MapView not found');
      }
    });
  });

  it('renders shuttle markers correctly', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

    const { getByTestId } = render(<CampusMap />);

    await waitFor(() => {
      const mapView = getByTestId('mapView');
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
  it('handles permission denied gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 0, longitude: 0 },
    });
    const { getByText } = render(<CampusMap />);
    await waitFor(() => {
      expect(getByText('Loading Map...')).toBeTruthy();
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Permission to access location was denied',
    );
    consoleSpy.mockRestore();
  });

  it('calls cleanup for shuttle tracking on unmount', async () => {
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

    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

    const { unmount } = render(<CampusMap />);
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

  it('renders polygons in black and white mode', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

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

  //Faulty test, the marker is not rendered in black and white mode. Waiting for bug to be fixed.
  it('renders current location marker with black pin in black and white mode', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    });

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
