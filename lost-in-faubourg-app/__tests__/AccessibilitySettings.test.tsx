jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => <Text {...props}>{props.name}</Text>,
  };
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AccessibilitySettings, {
  AccessibilityProvider,
} from '../components/AccessibilitySettings';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>{children}</AccessibilityProvider>
);

describe('AccessibilitySettings', () => {
  it('opens modal and toggles accessibility options', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <Wrapper>
        <AccessibilitySettings />
      </Wrapper>,
    );

    fireEvent.press(getByTestId('settings-button'));

    await waitFor(() => {
      expect(getByText('Accessibility Settings')).toBeTruthy();
    });

    fireEvent(getByTestId('black-and-white-switch'), 'valueChange', true);
    fireEvent(getByTestId('larger-text-switch'), 'valueChange', true);

    fireEvent.press(getByTestId('close-button'));

    await waitFor(() => {
      expect(queryByText('Accessibility Settings')).toBeNull();
    });
  }, 10000);
});
