import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import CampusMap from '../components/CampusMap'
import * as Location from 'expo-location'

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))

jest.mock('react-native-maps', () => {
  const { View } = require('react-native')
  const MockMapView = (props) => <View {...props}>{props.children}</View>
  const MockMarker = (props) => <View>{props.children}</View>
  const MockPolygon = (props) => <View>{props.children}</View>
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
})
