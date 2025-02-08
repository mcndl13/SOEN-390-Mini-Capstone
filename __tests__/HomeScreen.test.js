import React from 'react';
import renderer from 'react-test-renderer';
import HomeScreen from '../components/HomeScreen';

const mockNavigation = { navigate: jest.fn() };

test('HomeScreen renders correctly', () => {
  const tree = renderer.create(<HomeScreen navigation={mockNavigation} />).toJSON();
  expect(tree).toMatchSnapshot();
});
