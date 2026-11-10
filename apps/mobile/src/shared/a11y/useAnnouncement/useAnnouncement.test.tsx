import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, Text } from 'react-native';

import { useAnnouncement } from './useAnnouncement';

function Notice({ message }: { readonly message: string | null }) {
  const liveRegion = useAnnouncement(message);

  return (
    <Text testID="notice" accessibilityLiveRegion={liveRegion}>
      {message}
    </Text>
  );
}

function watchAnnouncement() {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

  announce.mockClear();
  announce.mockImplementation(() => {});

  return announce;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the announcement helper', () => {
  it('speaks a change once on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = watchAnnouncement();

    const view = await render(<Notice message="Saved" />);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Saved');

    await view.rerender(<Notice message="Saved" />);
    expect(announce).toHaveBeenCalledTimes(1);

    await view.rerender(<Notice message="Failed" />);
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith('Failed');
    expect(screen.getByTestId('notice').props.accessibilityLiveRegion).toBe(
      undefined
    );
  });

  it('leaves the announcement to the live region on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const announce = watchAnnouncement();

    const view = await render(<Notice message="Saved" />);

    expect(announce).not.toHaveBeenCalled();
    expect(screen.getByTestId('notice').props.accessibilityLiveRegion).toBe(
      'polite'
    );

    await view.rerender(<Notice message="Failed" />);

    expect(announce).not.toHaveBeenCalled();
  });

  it('stays silent when there is nothing to say', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const announce = watchAnnouncement();

    await render(<Notice message={null} />);

    expect(announce).not.toHaveBeenCalled();
  });
});
