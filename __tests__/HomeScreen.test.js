import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import HomeScreen from "../components/HomeScreen";

const mockNavigation = { navigate: jest.fn() };

test("HomeScreen renders correctly", () => {
  const { toJSON } = render(<HomeScreen navigation={mockNavigation} />);
  expect(toJSON()).toMatchSnapshot();
});

test("HomeScreen navigates to CampusMap on button press", () => {
  const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
  const button = getByText("Explore Campus Map");
  fireEvent.press(button);
  expect(mockNavigation.navigate).toHaveBeenCalledWith("CampusMap");
});

test("HomeScreen navigates to Directions on button press", () => {
  const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
  const button = getByText("Get Directions");
  fireEvent.press(button);
  expect(mockNavigation.navigate).toHaveBeenCalledWith("Directions");
});

test("HomeScreen navigates to CalendarIntegration on button press", () => {
  const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
  const button = getByText("Connect to Google Calendar");
  fireEvent.press(button);
  expect(mockNavigation.navigate).toHaveBeenCalledWith("CalendarIntegration");
});

test("HomeScreen navigates to IndoorDirections on button press", () => {
  const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
  const button = getByText("Indoor Navigation");
  fireEvent.press(button);
  expect(mockNavigation.navigate).toHaveBeenCalledWith("IndoorDirections");
});

test("HomeScreen navigates to PointsOfInterest on button press", () => {
  const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
  const button = getByText("Find Points of Interest");
  fireEvent.press(button);
  expect(mockNavigation.navigate).toHaveBeenCalledWith("PointsOfInterest");
});

test("HomeScreen renders title correctly", () => {
  const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
  const title = getByText("Welcome");
  expect(title).toBeTruthy();
});
