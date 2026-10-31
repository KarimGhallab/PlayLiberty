import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nProvider, Language } from '@playliberty/i18n';

import SkipSetting from './SkipSetting';

const store = { getItem: () => null, setItem: () => {} };

async function renderSetting(
  props: Partial<Parameters<typeof SkipSetting>[0]> = {}
) {
  const onChange = jest.fn();

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <SkipSetting skipNonMusic canEdit onChange={onChange} {...props} />
    </I18nProvider>
  );

  return { onChange };
}

function settingState() {
  return screen.getByTestId('skip-setting').props.accessibilityState;
}

describe('the skip setting', () => {
  it('asks for the opposite value on a press', async () => {
    const { onChange } = await renderSetting({ skipNonMusic: false });

    expect(screen.getByText('Skip non-music parts')).toBeOnTheScreen();
    expect(settingState()).toMatchObject({ checked: false });
    fireEvent.press(screen.getByTestId('skip-setting'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('keeps the row, disabled, for a read collaborator', async () => {
    await renderSetting({ canEdit: false });

    expect(screen.getByText('Skip non-music parts')).toBeOnTheScreen();
    expect(screen.getByTestId('skip-setting')).toBeDisabled();
    expect(settingState()).toMatchObject({ checked: true, disabled: true });
  });

  it('reports the write waiting', async () => {
    await renderSetting({ saving: true });

    expect(screen.getByTestId('skip-setting')).toBeDisabled();
    expect(settingState()).toMatchObject({ busy: true });
  });
});
