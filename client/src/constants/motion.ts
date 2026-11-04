import { Easing } from 'react-native-reanimated';

/** Shared gentle acceleration and settling for login docking and floating-header motion. */
export const HeaderMotion = {
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  loginDuration: 900,
  revealDuration: 340,
  fadeDuration: 220,
} as const;
