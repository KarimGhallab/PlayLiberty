import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import Checkbox, { type CheckboxProps } from './Checkbox';

const label = 'Skip non-music parts';

async function renderCheckbox(overrides: Partial<CheckboxProps> = {}) {
  const props: CheckboxProps = {
    label,
    checked: true,
    onChange: jest.fn(),
    ...overrides
  };

  await render(<Checkbox {...props} />);

  return props;
}

describe('the checkbox', () => {
  it('announces its state and reports the toggle', async () => {
    const { onChange } = await renderCheckbox();
    const box = screen.getByRole('checkbox', { name: label });

    expect(box).toBeChecked();

    fireEvent.press(box);

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('reads its hint with the control', async () => {
    const hint = 'Cut the intros, sponsor reads and outros out of the audio.';
    await renderCheckbox({ hint });

    expect(
      screen.getByText(hint, { includeHiddenElements: true })
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('checkbox', { name: label }).props.accessibilityHint
    ).toBe(hint);
  });

  it('refuses a press while disabled', async () => {
    const { onChange } = await renderCheckbox({ disabled: true });
    const box = screen.getByRole('checkbox', { name: label });

    expect(box).toBeDisabled();

    fireEvent.press(box);

    expect(onChange).not.toHaveBeenCalled();
  });
});
