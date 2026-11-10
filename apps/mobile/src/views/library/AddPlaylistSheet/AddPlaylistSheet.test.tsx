import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider, Language } from '@playliberty/i18n';

import AddPlaylistSheet, {
  type AddPlaylistSheetProps
} from './AddPlaylistSheet';

const store = { getItem: () => null, setItem: () => {} };

/* The suite's modal renders are slow under the parallel run, so a loaded
 * machine must not turn a render into a failure. */
jest.setTimeout(15000);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const link = 'https://www.youtube.com/playlist?list=PL-demo';

function sheetElement(props: AddPlaylistSheetProps) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <AddPlaylistSheet {...props} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

async function renderSheet(overrides: Partial<AddPlaylistSheetProps> = {}) {
  const props: AddPlaylistSheetProps = {
    visible: true,
    busy: false,
    problem: null,
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    ...overrides
  };

  await render(sheetElement(props));

  return props;
}

/* React 19 defers the state an event writes, so the test waits for the field to
 * hold what was typed before pressing a control that reads it. */
async function typeLink(value: string) {
  await fireEvent.changeText(screen.getByLabelText('Playlist link'), value);

  await waitFor(
    () => {
      expect(screen.getByLabelText('Playlist link')).toHaveDisplayValue(value);
    },
    { timeout: 3000 }
  );
}

async function turnSkipOff() {
  const skip = screen.getByRole('checkbox', { name: 'Skip non-music parts' });
  await fireEvent.press(skip);

  await waitFor(
    () => {
      expect(skip).not.toBeChecked();
    },
    { timeout: 3000 }
  );
}

async function pressAdd() {
  const add = screen.getByRole('button', { name: 'Add' });

  await waitFor(
    () => {
      expect(add).toBeEnabled();
    },
    { timeout: 3000 }
  );
  await fireEvent.press(add);
}

describe('the add sheet', () => {
  it('sends the link and the skip setting, on by default', async () => {
    const { onSubmit } = await renderSheet();

    expect(
      screen.getByRole('checkbox', { name: 'Skip non-music parts' })
    ).toBeChecked();

    await typeLink(` ${link} `);
    await pressAdd();

    expect(onSubmit).toHaveBeenCalledWith(link, true);
  });

  it('sends the skip setting off when the checkbox is turned off', async () => {
    const { onSubmit } = await renderSheet();

    await typeLink(link);
    await turnSkipOff();
    await pressAdd();

    expect(onSubmit).toHaveBeenCalledWith(link, false);
  });

  it('refuses a malformed link before it makes a request', async () => {
    const { onSubmit } = await renderSheet();

    await typeLink('not a url');
    await pressAdd();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Paste a YouTube playlist link/
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server refusal beside the field', async () => {
    await renderSheet({
      problem:
        'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    );
  });

  it('disables Add and marks it busy while the create is running', async () => {
    const { onSubmit, onClose } = await renderSheet({ busy: true });

    expect(screen.getByTestId('add-url')).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Skip non-music parts' })
    ).toBeDisabled();

    const adding = screen.getByRole('button', { name: 'Adding' });
    expect(adding).toBeDisabled();

    await fireEvent.press(adding);
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('add-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks before a typed link is discarded', async () => {
    const { onClose } = await renderSheet();

    await typeLink(link);
    await fireEvent.press(screen.getByTestId('add-backdrop'));

    await waitFor(() => {
      expect(screen.getByText(/Discard this link\?/)).toBeOnTheScreen();
    });
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));

    await waitFor(() => {
      expect(screen.queryByText(/Discard this link\?/)).not.toBeOnTheScreen();
    });
    expect(screen.getByLabelText('Playlist link')).toHaveDisplayValue(link);

    await fireEvent.press(screen.getByTestId('add-backdrop'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Discard' })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes at once when nothing was typed', async () => {
    const { onClose } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
