'use client';

import { useEffect } from 'react';

export function CronStarter() {
  useEffect(() => {
    // Silently ping the backend to start the cron engine if it's not already running
    fetch('/api/cron/start', { method: 'POST' }).catch(() => {
      // Ignore errors silently
    });
  }, []);

  return null;
}
