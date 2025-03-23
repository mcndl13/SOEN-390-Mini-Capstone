import axios from 'axios';
import { getPlaceID, getOpeningHours } from '../services/openingHoursService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('openingHoursService', () => {
  const latitude = 45.0;
  const longitude = -73.0;
  const placeId = 'testPlaceId';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getPlaceID returns place_id when response has results', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { results: [{ place_id: placeId }] },
    });
    const result = await getPlaceID(latitude, longitude);
    expect(result).toBe(placeId);
  });

  test('getPlaceID returns null when no results', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { results: [] },
    });
    const result = await getPlaceID(latitude, longitude);
    expect(result).toBeNull();
  });

  test('getPlaceID returns null on error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Error'));
    const result = await getPlaceID(latitude, longitude);
    expect(result).toBeNull();
  });

  test('getOpeningHours returns hours when available', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { results: [{ place_id: placeId }] } })
      .mockResolvedValueOnce({
        data: {
          result: {
            current_opening_hours: { weekday_text: ['Monday: 9AM-5PM'] },
          },
        },
      });
    const result = await getOpeningHours(latitude, longitude);
    expect(result).toBe('Monday: 9AM-5PM');
  });

  test('getOpeningHours returns "No hours available" when no opening hours data', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { results: [{ place_id: placeId }] } })
      .mockResolvedValueOnce({ data: { result: {} } });
    const result = await getOpeningHours(latitude, longitude);
    expect(result).toBe('No hours available');
  });

  test('getOpeningHours returns error message on error', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { results: [{ place_id: placeId }] } })
      .mockRejectedValueOnce(new Error('Error'));
    const result = await getOpeningHours(latitude, longitude);
    expect(result).toBe('Error fetching hours');
  });
});
