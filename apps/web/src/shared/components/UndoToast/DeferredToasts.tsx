import { useI18n } from '@playliberty/i18n';

import { useDeferredAction } from '../useDeferredAction/useDeferredAction';
import UndoToastStack from './UndoToastStack';

/*
 * The one toast surface, above the routes. The store owns the windows, so a
 * route change neither drops a toast nor cancels its commit.
 */

export default function DeferredToasts() {
  const { t } = useI18n();
  const { windows, cancel } = useDeferredAction();

  return (
    <UndoToastStack
      windows={windows}
      actionLabel={t('common.cancel')}
      onCancel={cancel}
    />
  );
}
