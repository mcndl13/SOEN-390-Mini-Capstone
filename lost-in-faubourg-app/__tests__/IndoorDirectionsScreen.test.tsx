jest.mock("react-native-webview", () => {
  const React = require("react");
  const reloadMock = jest.fn();
  const WebView = React.forwardRef((props: any, ref: React.Ref<{ reload: () => void }>) => {
    React.useImperativeHandle(ref, () => ({
      reload: reloadMock,
    }));
    return null;
  });
  return { WebView, reloadMock };
});

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import IndoorDirectionsScreen from "../components/IndoorDirectionsScreen";

describe("IndoorDirectionsScreen", () => {
  it("renders building options", () => {
    const { getByText } = render(<IndoorDirectionsScreen />);
    expect(getByText("Select a Building")).toBeTruthy();
    expect(getByText("CC Building")).toBeTruthy();
    expect(getByText("Hall Building")).toBeTruthy();
    expect(getByText("JMSB")).toBeTruthy();
    expect(getByText("VE Building")).toBeTruthy();
    expect(getByText("VL Building")).toBeTruthy();
  });

  it("opens and closes modal when a building is selected", async () => {
    const { getByText, queryByText } = render(<IndoorDirectionsScreen />);
    fireEvent.press(getByText("CC Building"));
    await waitFor(() => {
      expect(getByText("Close")).toBeTruthy();
    });
    fireEvent.press(getByText("Close"));
    await waitFor(() => {
      expect(queryByText("Close")).toBeNull();
    });
  });

  it("calls WebView.reload when Reload button is pressed", async () => {
    const { getByText } = render(<IndoorDirectionsScreen />);
    fireEvent.press(getByText("CC Building"));
    await waitFor(() => {
      expect(getByText("Reload")).toBeTruthy();
    });
    fireEvent.press(getByText("Reload"));
    // Assert that the reload function was called
    const { reloadMock } = require("react-native-webview");
    expect(reloadMock).toHaveBeenCalled();
  });

  it("closes modal on onRequestClose", async () => {
    const { getByText, getByTestId, queryByText } = render(<IndoorDirectionsScreen />);
    fireEvent.press(getByText("CC Building"));
    await waitFor(() => {
      expect(getByTestId("building-modal")).toBeTruthy();
    });
    const modal = getByTestId("building-modal");
    await act(async () => {
      modal.props.onRequestClose();
    });
    await waitFor(() => {
      expect(queryByText("Close")).toBeNull();
    });
  });
});