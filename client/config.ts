/**
 * Client Configuration
 * Extracts SERVER_URL and environment settings into a shared module.
 */

export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';
export const API_URL = `${SERVER_URL}/api`;

export default {
  SERVER_URL,
  API_URL,
};
