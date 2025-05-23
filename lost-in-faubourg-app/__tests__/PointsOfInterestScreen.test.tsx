import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import POIScreen from '../components/PointsOfInterestScreen';
import { AccessibilityContext } from '../components/AccessibilitySettings';
import * as Location from 'expo-location';

jest.mock('@expo/vector-icons', () => {
  return {
    Ionicons: 'Ionicons',
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const renderWithContext = (isBlackAndWhite: boolean, isLargeText: boolean) => {
  return render(
    <NavigationContainer>
      <AccessibilityContext.Provider value={{ isBlackAndWhite, isLargeText }}>
        <POIScreen />
      </AccessibilityContext.Provider>
    </NavigationContainer>,
  );
};

const defaultCoords = { latitude: 45.4953534, longitude: -73.578549 };

const setPermissions = (status: string) => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status });
};

const setLocationSuccess = (coords = defaultCoords) => {
  Location.getCurrentPositionAsync.mockResolvedValue({ coords });
};

const setLocationFailure = (errorMsg: string) => {
  Location.getCurrentPositionAsync.mockRejectedValue(new Error(errorMsg));
};

const triggerSearch = (getByPlaceholderText: any, query: string) => {
  const searchInput = getByPlaceholderText('Search for places...');
  fireEvent.changeText(searchInput, query);
  fireEvent(searchInput, 'submitEditing');
};

const setIconsFetchResponse = () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          status: 'OK',
          results: [
            {
              place_id: '1',
              name: 'Library Test',
              types: ['library'],
              geometry: { location: { lat: 45.496, lng: -73.579 } },
              vicinity: 'Library Ave',
              rating: 4.2,
            },
            {
              place_id: '2',
              name: 'Bookstore Test',
              types: ['book_store'],
              geometry: { location: { lat: 45.497, lng: -73.58 } },
              vicinity: 'Book St',
              rating: 4.0,
            },
            {
              place_id: '3',
              name: 'Restaurant Test',
              types: ['restaurant'],
              geometry: { location: { lat: 45.498, lng: -73.581 } },
              vicinity: 'Food Rd',
              rating: 4.3,
            },
            {
              place_id: '4',
              name: 'Bar Test',
              types: ['bar'],
              geometry: { location: { lat: 45.499, lng: -73.582 } },
              vicinity: 'Bar Blvd',
              rating: 4.1,
            },
            {
              place_id: '5',
              name: 'Gym Test',
              types: ['gym'],
              geometry: { location: { lat: 45.5, lng: -73.583 } },
              vicinity: 'Fitness Ln',
              rating: 4.5,
            },
            {
              place_id: '6',
              name: 'Unknown Test',
              types: ['unknown'],
              geometry: { location: { lat: 45.501, lng: -73.584 } },
              vicinity: 'Mystery Rd',
              rating: 3.9,
            },
          ],
        }),
    }),
  );
};

const verifyPoiIcons = async (withinMap: any) => {
  await waitFor(() => {
    expect(
      withinMap.queryAllByTestId('icon-library').length,
    ).toBeGreaterThanOrEqual(1); // Library
    expect(
      withinMap.queryAllByTestId('icon-bookstore').length,
    ).toBeGreaterThanOrEqual(1); // Bookstore
    expect(
      withinMap.queryAllByTestId('icon-restaurant').length,
    ).toBeGreaterThanOrEqual(1); // Restaurant
    expect(
      withinMap.queryAllByTestId('icon-cafe').length,
    ).toBeGreaterThanOrEqual(1); // Cafe
    expect(
      withinMap.queryAllByTestId('icon-gym').length,
    ).toBeGreaterThanOrEqual(1); // Gym
    expect(
      withinMap.queryAllByTestId('icon-default').length,
    ).toBeGreaterThanOrEqual(1); // Default
  });
};

describe('POIScreen', () => {
  test('mapStyle is black and white when isBlackAndWhite is true', () => {
    const { getByTestId } = renderWithContext(true, false);
    const mapView = getByTestId('mapView');
    const mapStyle = mapView.props.customMapStyle;

    expect(mapStyle).toEqual([
      { elementType: 'geometry', stylers: [{ saturation: -100 }] },
      { elementType: 'labels.text.fill', stylers: [{ saturation: -100 }] },
      { elementType: 'labels.text.stroke', stylers: [{ saturation: -100 }] },
    ]);
  });

  test('mapStyle is default when isBlackAndWhite is false', () => {
    const { getByTestId } = renderWithContext(false, false);
    const mapView = getByTestId('mapView');
    const mapStyle = mapView.props.customMapStyle;

    expect(mapStyle).toEqual([
      {
        elementType: 'geometry',
        featureType: 'water',
        stylers: [{ color: '#e9e9e9' }, { lightness: 17 }],
      },
      {
        elementType: 'geometry',
        featureType: 'landscape',
        stylers: [{ color: '#f5f5f5' }, { lightness: 20 }],
      },
      {
        elementType: 'geometry.fill',
        featureType: 'road.highway',
        stylers: [{ color: '#ffffff' }, { lightness: 17 }],
      },
      {
        elementType: 'geometry',
        featureType: 'poi',
        stylers: [{ color: '#f5f5f5' }, { lightness: 21 }],
      },
    ]);
  });

  test('displays loading indicator when fetching location', async () => {
    setPermissions('granted');
    setLocationSuccess();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 'OK', results: [] }),
      }),
    );

    const { getByText } = renderWithContext(false, false);

    expect(getByText('Loading...')).toBeTruthy();
    await waitFor(() => expect(() => getByText('Loading...')).toThrow());
  });

  test('displays error message when location permission is denied', async () => {
    setPermissions('denied');

    const { getByText } = renderWithContext(false, false);

    await waitFor(() =>
      expect(getByText('Location permission is required')).toBeTruthy(),
    );
  });

  test('displays error message when location cannot be determined', async () => {
    setPermissions('granted');
    setLocationFailure('Location error');

    const { getByText } = renderWithContext(false, false);

    await waitFor(() =>
      expect(getByText('Could not determine your location')).toBeTruthy(),
    );
  });

  test('fetches POIs on search submission', async () => {
    setPermissions('granted');
    setLocationSuccess();

    const { getByPlaceholderText, getByTestId } = renderWithContext(
      false,
      false,
    );
    triggerSearch(getByPlaceholderText, 'cafe');

    await waitFor(() => expect(getByTestId('mapView')).toBeTruthy());
  });

  test('displays message when no POIs are found', async () => {
    setPermissions('granted');
    setLocationSuccess();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 'OK', results: [] }),
      }),
    );

    const { getByPlaceholderText, getByText } = renderWithContext(false, false);
    triggerSearch(getByPlaceholderText, 'cafe');

    await waitFor(() => expect(getByText('No places found')).toBeTruthy());
  });

  test('displays POIs on the map', async () => {
    setPermissions('granted');
    setLocationSuccess();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: 'OK',
            results: [
              {
                place_id: '1',
                name: 'Cafe',
                types: ['cafe'],
                geometry: { location: { lat: 45.495, lng: -73.578 } },
                vicinity: '123 Street',
                rating: 4.5,
              },
            ],
          }),
      }),
    );

    const { getByPlaceholderText, getByTestId } = renderWithContext(
      false,
      false,
    );
    triggerSearch(getByPlaceholderText, 'cafe');

    await waitFor(() => expect(getByTestId('mapView')).toBeTruthy());
  });
});

describe('POIScreen additional coverage', () => {
  test('applies large text styles when isLargeText is true', () => {
    const { getAllByTestId } = renderWithContext(false, true);
    const quickSearchTexts = getAllByTestId('quickSearchText');
    const flattenedStyle = Array.isArray(quickSearchTexts[0].props.style)
      ? Object.assign({}, ...quickSearchTexts[0].props.style)
      : quickSearchTexts[0].props.style;
    expect(flattenedStyle.fontSize).toBeGreaterThanOrEqual(16);
  });

  test('displays error message when POI fetch fails', async () => {
    setPermissions('granted');
    setLocationSuccess();

    global.fetch = jest.fn(() => Promise.reject(new Error('API error')));

    const { getByPlaceholderText, getByText } = renderWithContext(false, false);
    triggerSearch(getByPlaceholderText, 'museum');

    await waitFor(() =>
      expect(getByText('Failed to fetch places')).toBeTruthy(),
    );
  });

  // Modified test to use helper functions
  test('displays correct icons for various POI types (covers determinePoiType)', async () => {
    setPermissions('granted');
    setLocationSuccess();
    setIconsFetchResponse();

    const { getByPlaceholderText, getByTestId } = renderWithContext(
      false,
      false,
    );
    triggerSearch(getByPlaceholderText, 'test');

    const mapView = await waitFor(() => getByTestId('mapView'));
    const withinMap = within(mapView);
    await verifyPoiIcons(withinMap);
  });
});

describe('Additional POIScreen tests', () => {
  test('displays multiple POIs markers on the map', async () => {
    setPermissions('granted');
    setLocationSuccess();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: 'OK',
            results: [
              {
                place_id: '1',
                name: 'Cafe',
                types: ['cafe'],
                geometry: { location: { lat: 45.495, lng: -73.578 } },
                vicinity: '123 Street',
                rating: 4.5,
              },
              {
                place_id: '2',
                name: 'Museum',
                types: ['museum'],
                geometry: { location: { lat: 45.496, lng: -73.579 } },
                vicinity: '456 Avenue',
                rating: 4.2,
              },
            ],
          }),
      }),
    );
    const { getByPlaceholderText, getByTestId } = renderWithContext(
      false,
      false,
    );
    triggerSearch(getByPlaceholderText, 'park');
    await waitFor(() => {
      const mapView = getByTestId('mapView');
      const withinMap = within(mapView);
      expect(
        withinMap.queryAllByTestId('icon-cafe').length,
      ).toBeGreaterThanOrEqual(1); // Cafe icon
      expect(
        withinMap.queryAllByTestId('icon-default').length,
      ).toBeGreaterThanOrEqual(1); // Default icon
    });
  });

  test('handles empty search query gracefully', async () => {
    setPermissions('granted');
    setLocationSuccess();
    global.fetch = jest.fn();
    const { getByPlaceholderText, queryByText } = renderWithContext(
      false,
      false,
    );
    triggerSearch(getByPlaceholderText, '');
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
      expect(queryByText('Please enter a search term')).toBeNull();
    });
  });

  test('displays error message when POI fetch returns non OK status', async () => {
    setPermissions('granted');
    setLocationSuccess();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 'FAIL', results: [] }),
      }),
    );
    const { getByPlaceholderText, getByText } = renderWithContext(false, false);
    triggerSearch(getByPlaceholderText, 'library');
    await waitFor(() =>
      expect(getByText('Error fetching places')).toBeTruthy(),
    );
  });
});

describe('Increased coverage tests', () => {
  test('does not fetch POIs for whitespace-only query', async () => {
    setPermissions('granted');
    setLocationSuccess();
    global.fetch = jest.fn();
    const { getByPlaceholderText } = renderWithContext(false, false);
    triggerSearch(getByPlaceholderText, '    ');
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  test('displays POIs with incomplete data', async () => {
    setPermissions('granted');
    setLocationSuccess();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: 'OK',
            results: [
              {
                place_id: 'incomplete1',
                name: 'No Rating Cafe',
                types: ['cafe'],
                geometry: { location: { lat: 45.495, lng: -73.578 } },
              },
            ],
          }),
      }),
    );
    const { getByPlaceholderText, getByTestId } = renderWithContext(
      false,
      false,
    );
    triggerSearch(getByPlaceholderText, 'cafe');
    await waitFor(() => {
      const mapView = getByTestId('mapView');
      const withinMap = within(mapView);
      expect(
        withinMap.queryAllByTestId('icon-cafe').length,
      ).toBeGreaterThanOrEqual(1); // Cafe icon
    });
  });
});

describe('Additional missing lines coverage', () => {
  // Removed duplicate test for "displays correct icons for various POI types (covers determinePoiType)"
  // ...existing code for other tests remains unchanged...
  test('shows success message when POIs are found (covers line 115)', async () => {
    setPermissions('granted');
    setLocationSuccess();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            status: 'OK',
            results: [
              {
                place_id: '1',
                name: 'Success Test',
                types: ['restaurant'],
                geometry: { location: { lat: 45.496, lng: -73.579 } },
                vicinity: 'Success Rd',
                rating: 4.0,
              },
            ],
          }),
      }),
    );
    const { getByPlaceholderText, findByText } = renderWithContext(
      false,
      false,
    );
    const searchInput = getByPlaceholderText('Search for places...');
    fireEvent.changeText(searchInput, 'Success');
    fireEvent(searchInput, 'submitEditing');
    const successMessage = await findByText(/Found 1 places/);
    expect(successMessage).toBeTruthy();
  });
});
