/**
 * Universal Backend API Configuration
 *
 * ARCHITECTURAL RATIONALE:
 * Dynamically resolves the backend Express server endpoint across environments:
 * 1. Web Browsers (Local Dev): `http://localhost:3000/api`
 * 2. Physical Devices (Expo Go over LAN): Resolves your workstation's WiFi IP via `Constants.expoConfig.hostUri`
 *    (e.g. `http://192.168.1.150:3000/api`) so physical phones can reach the local backend without hardcoding.
 * 3. Android Emulators: `http://10.0.2.2:3000/api`
 * 4. Production / Custom: Configurable via `EXPO_PUBLIC_API_URL` environment variable.
 */

import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
  // Priority 1: Explicit environment variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Priority 2: Node / unit test environment tests offline resilience deterministically
  if (process.env.NODE_ENV === 'test') {
    return 'http://127.0.0.1:54399/api';
  }

  // Priority 3: Web platform uses current window host (or localhost)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      return `http://${hostname}:3000/api`;
    }
    return 'http://localhost:3000/api';
  }

  // Priority 4: Expo Go on physical device (resolves developer workstation IP)
  try {
    const rawConstants = require('expo-constants');
    const Constants = rawConstants?.default ?? rawConstants;
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants?.manifest?.debuggerHost;

    if (hostUri) {
      const ip = String(hostUri).split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:3000/api`;
      }
    }
  } catch {
    // Fall back cleanly if native module is absent
  }

  // Priority 5: Android official emulator loopback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  return 'http://localhost:3000/api';
}

export const API_BASE_URL = getApiBaseUrl();
