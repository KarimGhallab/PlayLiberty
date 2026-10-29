import { router } from 'expo-router';

import NotFound from '../src/shared/components/NotFound/NotFound';

export default function NotFoundRoute() {
  return (
    <NotFound
      onBack={() => {
        router.replace('/');
      }}
    />
  );
}
