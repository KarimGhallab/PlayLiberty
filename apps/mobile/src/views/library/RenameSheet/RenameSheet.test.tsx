import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider, Language } from '@playliberty/i18n';

import RenameSheet, { type RenameSheetProps } from './RenameSheet';

const store = { getItem: () => null, setItem: () => {} };

/* Modal renders are slow under the parallel run. */
jest.setTimeout(15000);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

function sheetElement(props: RenameSheetProps) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <RenameSheet {...props} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

async function renderSheet(overrides: Partial<RenameSheetProps> = {}) {
  const props: RenameSheetProps = {
    visible: true,
    currentName: 'Rain On The Window',
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
async function typeName(value: string) {
  fireEvent.changeText(screen.getByLabelText('Playlist name'), value);

  await waitFor(
    () => {
      expect(screen.getByLabelText('Playlist name')).toHaveDisplayValue(value);
    },
    { timeout: 3000 }
  );
}

describe('the rename sheet', () => {
  it('prefills the current name and selects it on focus', async () => {
    await renderSheet();

    const field = screen.getByLabelText('Playlist name');

    expect(field).toHaveDisplayValue('Rain On The Window');
    expect(field.props.selectTextOnFocus).toBe(true);
  });

  it('keeps Save disabled for an empty trimmed name', async () => {
    const { onSubmit } = await renderSheet();

    await typeName('   ');

    const save = screen.getByRole('button', { name: 'Save' });

    expect(save).toBeDisabled();
    fireEvent.press(save);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses an overlong name before a request', async () => {
    const { onSubmit } = await renderSheet();

    await typeName('a'.repeat(201));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A name is required, up to 200 characters.'
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('trims the name and sends it once', async () => {
    const { onSubmit } = await renderSheet();

    await typeName('  New Name  ');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith('New Name');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the refusal and keeps the sheet open', async () => {
    await renderSheet({ problem: 'The playlist could not be renamed.' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The playlist could not be renamed.'
    );
    expect(screen.getByTestId('rename-sheet')).toBeOnTheScreen();
  });

  it('locks the field and Save while the rename runs', async () => {
    const { onSubmit, onClose } = await renderSheet({ busy: true });

    expect(screen.getByLabelText('Playlist name')).toBeDisabled();

    const saving = screen.getByRole('button', { name: 'Saving' });

    expect(saving).toBeDisabled();
    fireEvent.press(saving);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('rename-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
