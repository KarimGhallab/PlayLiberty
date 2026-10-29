import { useI18n } from '@playliberty/i18n';

import Screen from '../src/shared/components/Screen/Screen';

export default function EgressRoute() {
  const { t } = useI18n();

  return <Screen title={t('egress.title')} />;
}
