import { router, useLocalSearchParams } from 'expo-router';

import NoticePrototype from '../../src/views/prototype/NoticePrototype/NoticePrototype';

export default function NoticePrototypeRoute() {
  const { variant } = useLocalSearchParams<{ variant?: string }>();

  return (
    <NoticePrototype
      variant={variant}
      onVariantChange={next => router.setParams({ variant: next })}
    />
  );
}
