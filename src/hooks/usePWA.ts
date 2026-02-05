import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePWA() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const {
    offlineReady: [offlineReadyState, setOfflineReadyState],
    needRefresh: [needRefreshState, setNeedRefreshState],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration);
    },
    onRegisterError(error) {
      console.log('SW Registration Error:', error);
    },
  });

  useEffect(() => {
    setOfflineReady(offlineReadyState);
    setNeedRefresh(needRefreshState);
  }, [offlineReadyState, needRefreshState]);

  const close = () => {
    setOfflineReadyState(false);
    setNeedRefreshState(false);
  };

  return {
    offlineReady,
    needRefresh,
    updateServiceWorker,
    close,
  };
}
