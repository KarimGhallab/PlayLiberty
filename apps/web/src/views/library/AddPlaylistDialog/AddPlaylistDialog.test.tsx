import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import AddPlaylistDialog from './AddPlaylistDialog';

function renderDialog(
  props: Partial<Parameters<typeof AddPlaylistDialog>[0]> = {}
) {
  return render(
    <I18nProvider preferred={['en']}>
      <AddPlaylistDialog open onSubmit={vi.fn()} onClose={vi.fn()} {...props} />
    </I18nProvider>
  );
}

describe('AddPlaylistDialog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts open on the playlist link field', () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: 'Add a playlist' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Playlist link')).toHaveFocus();
  });

  it('draws nothing while it has never been opened', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('holds the primary disabled until the field has a value', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });
    const add = screen.getByRole('button', { name: 'Add' });

    expect(add).toBeDisabled();
    fireEvent.click(add);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-demo' }
    });

    expect(add).toBeEnabled();
  });

  it('asks before a dirty scrim click discards the link', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    const field = screen.getByLabelText('Playlist link');

    fireEvent.change(field, {
      target: { value: 'https://www.youtube.com/playlist?list=PL-demo' }
    });
    fireEvent.mouseDown(
      screen.getByRole('dialog').parentElement as HTMLElement
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Discard this link?');

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(field).toHaveValue('https://www.youtube.com/playlist?list=PL-demo');

    fireEvent.mouseDown(
      screen.getByRole('dialog').parentElement as HTMLElement
    );
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('refuses a malformed URL with the schema and makes no request', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'not a url' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('submits a valid URL and the trimmed value, with the setting on', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: '  https://www.youtube.com/playlist?list=PL-demo  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/playlist?list=PL-demo',
      true
    );
  });

  it('sends the setting off when the control is turned off', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-demo' }
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Skip non-music parts' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/playlist?list=PL-demo',
      false
    );
  });

  it('shows the server problem beside the field', () => {
    renderDialog({
      problem:
        'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    );
    expect(screen.getByLabelText('Playlist link')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('marks the field busy and refuses a second submit while working', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit, isWorking: true });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-demo' }
    });
    fireEvent.click(screen.getByRole('button', { name: /adding/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Playlist link')).toBeDisabled();
  });

  it('asks to close on Escape', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = renderDialog();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
