import { Link } from 'expo-router';

import { useI18n } from '@playliberty/i18n';

import Screen from '../src/shared/components/Screen/Screen';

export default function NotFoundRoute() {
  const { t } = useI18n();

  return (
    <Screen title={t('notFound.heading')} subtitle={t('notFound.prose')}>
      <Link href="/">{t('notFound.back')}</Link>
    </Screen>
  );
}
