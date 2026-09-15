import React, { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export interface StarfieldContextType {
  translateX: SharedValue<number>;
  scrollY: SharedValue<number>;
}

export const StarfieldContext = createContext<StarfieldContextType | null>(null);

export function useStarfield() {
  return useContext(StarfieldContext);
}
