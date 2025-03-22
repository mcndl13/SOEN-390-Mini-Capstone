import { getPolygonCenter, isUserInBuilding } from '../utils/geometry';

jest.mock('../components/polygonCoordinates', () => ({
  polygons: [
    {
      boundaries: [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 4 },
        { latitude: 3, longitude: 0 },
      ],
    },
  ],
}));

describe('geometry utilities', () => {
  test('getPolygonCenter returns correct center for a triangle', () => {
    const boundaries = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 4 },
      { latitude: 3, longitude: 0 },
    ];
    const center = getPolygonCenter(boundaries);
    expect(center.latitude).toBeCloseTo((0 + 0 + 3) / 3);
    expect(center.longitude).toBeCloseTo((0 + 4 + 0) / 3);
  });

  test('isUserInBuilding returns center when point is inside polygon', () => {
    const result = isUserInBuilding({ latitude: 1, longitude: 1 });
    expect(result).not.toBeNull();
    expect(result!.latitude).toBeCloseTo((0 + 0 + 3) / 3);
    expect(result!.longitude).toBeCloseTo((0 + 4 + 0) / 3);
  });

  test('isUserInBuilding returns null when point is outside polygon', () => {
    const result = isUserInBuilding({ latitude: 10, longitude: 10 });
    expect(result).toBeNull();
  });
});
