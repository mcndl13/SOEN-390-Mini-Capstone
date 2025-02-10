import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import CampusMap from '../components/CampusMap'
import * as Location from 'expo-location'
import { polygons } from '../components/polygonCoordinates'

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))

jest.mock('react-native-maps', () => {
  const { View } = require('react-native')
  const MockMapView = (props) => <View {...props}>{props.children}</View>
  const MockMarker = (props) => <View {...props}>{props.children}</View>
  const MockPolygon = (props) => <View {...props}>{props.children}</View>
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
  }
})

describe('CampusMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('map renders correctly with user location', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    })
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    })

    const { getByText, getByTestId } = render(<CampusMap />)

    await waitFor(() => {
      expect(getByText('Loading Map...')).toBeTruthy()
    })

    await waitFor(() => {
      const mapView = getByTestId('mapView')
      expect(mapView.props.region).toEqual({
        latitude: 45.4953534,
        longitude: -73.578549,
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      })
    })
  })

  it('switches to SGW campus on button press', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    })
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    })

    const { getByText, getByTestId } = render(<CampusMap />)

    await waitFor(() => {
      expect(getByText('SGW Campus')).toBeTruthy()
    })

    fireEvent.press(getByText('SGW Campus'))

    await waitFor(() => {
      const mapView = getByTestId('mapView')
      expect(mapView.props.region).toEqual({
        latitude: 45.4953534,
        longitude: -73.578549,
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      })
    })
  })

  it('switches to Loyola campus on button press', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    })
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.6405 },
    })

    const { getByText, getByTestId } = render(<CampusMap />)

    await waitFor(() => {
      expect(getByText('Loyola Campus')).toBeTruthy()
    })

    fireEvent.press(getByText('Loyola Campus'))

    await waitFor(() => {
      const mapView = getByTestId('mapView')
      expect(mapView.props.region).toEqual({
        latitude: 45.4582,
        longitude: -73.6405,
        latitudeDelta: expect.any(Number),
        longitudeDelta: expect.any(Number),
      })
    })
  })

  it('renders "You are here" marker correctly', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    })
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    })

    const { getByTestId } = render(<CampusMap />)

    await waitFor(() => {
      const mapView = getByTestId('mapView')

      if (mapView) {
        const flatChildren = mapView.props.children.flat()

        const markerComponent = flatChildren.find(
          (child) => child.props.testID === 'marker-current-location',
        )

        expect(markerComponent).toBeTruthy()
        expect(markerComponent.props.coordinate).toEqual({
          latitude: 45.4953534,
          longitude: -73.578549,
        })
        expect(markerComponent.props.title).toBe('You are here')
        expect(markerComponent.props.pinColor).toBe('blue')
      } else {
        console.error('MapView not found')
      }
    })
  })

  polygons.forEach((polygon, index) => {
    it(`displays ${polygon.name} building information on marker press`, async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      })
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 45.4953534, longitude: -73.578549 },
      })

      const { getByTestId, getByText } = render(<CampusMap />)

      await waitFor(() => {
        expect(getByText('Loading Map...')).toBeTruthy()
      })

      await waitFor(() => {
        const mapView = getByTestId('mapView')
        expect(mapView.props.region).toEqual({
          latitude: 45.4953534,
          longitude: -73.578549,
          latitudeDelta: expect.any(Number),
          longitudeDelta: expect.any(Number),
        })
      })

      fireEvent.press(getByTestId(`marker-${index + 1}`))

      await waitFor(() => {
        expect(getByText(`Building: ${polygon.name}`)).toBeTruthy()
        expect(
          getByText(`Address: ${polygon.name} - Concordia University`),
        ).toBeTruthy()
      })
    })
  })

  it('renders polygons correctly', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    })
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.4953534, longitude: -73.578549 },
    })

    const { getByTestId } = render(<CampusMap />)

    await waitFor(() => {
      const mapView = getByTestId('mapView')

      if (mapView) {
        const flatChildren = mapView.props.children.flat()
        polygons.forEach((polygon, index) => {
          const polygonComponent = flatChildren.find(
            (child) =>
              child.key === index.toString() &&
              child.type.name === 'MockPolygon',
          )

          if (polygonComponent) {
            expect(polygonComponent.props.coordinates).toEqual(
              polygon.boundaries,
            )
            expect(polygonComponent.props.fillColor).toBe('#912338cc')
            expect(polygonComponent.props.strokeColor).toBe('#912338cc')
            expect(polygonComponent.props.strokeWidth).toBe(1)
          } else {
            console.error(`Polygon ${index} not found`)
          }
          expect(polygonComponent).toBeTruthy()
        })
      } else {
        console.error('MapView not found')
      }
    })
  })
})
