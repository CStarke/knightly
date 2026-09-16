import { router } from 'expo-router';
import React, { createContext, useContext } from 'react';

export type ClubsNavigationContextType = {
  clubsLevel: 0 | 1 | 2;
  activeClubId: string | null;
  openClubsDirectory: () => void;
  openClubDetail: (clubId: string) => void;
  closeClubDetail: () => void;
  closeClubsDirectory: () => void;
};

const defaultContext: ClubsNavigationContextType = {
  clubsLevel: 0,
  activeClubId: null,
  openClubsDirectory: () => {
    router.push('/clubs/index');
  },
  openClubDetail: (clubId: string) => {
    router.push({
      pathname: '/clubs/[id]',
      params: { id: clubId },
    });
  },
  closeClubDetail: () => {
    router.back();
  },
  closeClubsDirectory: () => {
    router.back();
  },
};

const ClubsNavigationContext = createContext<ClubsNavigationContextType>(defaultContext);

export function ClubsNavigationProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ClubsNavigationContextType;
}) {
  return (
    <ClubsNavigationContext.Provider value={value}>
      {children}
    </ClubsNavigationContext.Provider>
  );
}

export function useClubsNavigation() {
  return useContext(ClubsNavigationContext);
}
