'use client';

import { useEffect, useRef } from 'react';
import { recordPresenceEvent } from '@/app/(app)/attendance/hrms-actions';

export function PresenceTracker() {
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Log Login Event on initial load in session
    const isInitialized = sessionStorage.getItem('presence-initialized');
    if (!isInitialized) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            lastLocationRef.current = loc;
            await recordPresenceEvent('Login', loc);
            sessionStorage.setItem('presence-initialized', 'true');
          },
          async (err) => {
            console.warn('Geolocation blocked or failed on login:', err.message);
            // Fallback: log login event without coordinates
            await recordPresenceEvent('Login');
            sessionStorage.setItem('presence-initialized', 'true');
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        recordPresenceEvent('Login');
        sessionStorage.setItem('presence-initialized', 'true');
      }
    }

    // 2. Watch location for movements (LocationChanged)
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const newLoc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          const lastLoc = lastLocationRef.current;
          if (!lastLoc) {
            lastLocationRef.current = newLoc;
            return;
          }

          // Check if distance change is significant (~50m threshold, approx 0.0005 deg)
          const latDiff = Math.abs(newLoc.latitude - lastLoc.latitude);
          const lonDiff = Math.abs(newLoc.longitude - lastLoc.longitude);

          if (latDiff > 0.0005 || lonDiff > 0.0005) {
            console.log('Location movement detected. Logging presence location change.');
            lastLocationRef.current = newLoc;
            await recordPresenceEvent('LocationChanged', newLoc);
          }
        },
        (err) => {
          console.warn('Watch location tracking issue:', err.message);
        },
        { enableHighAccuracy: true, distanceFilter: 50 } as any // Some browsers support distanceFilter
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return null; // Invisible global tracker
}
