import React, { createContext, useContext } from 'react';

type DiningActivityContextType = {
  isActivityOpen: boolean;
  openActivity: () => void;
  closeActivity: () => void;
};

const DiningActivityContext = createContext<DiningActivityContextType>({
  isActivityOpen: false,
  openActivity: () => {},
  closeActivity: () => {},
});

export function DiningActivityProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DiningActivityContextType;
}) {
  return (
    <DiningActivityContext.Provider value={value}>
      {children}
    </DiningActivityContext.Provider>
  );
}

export function useDiningActivity() {
  return useContext(DiningActivityContext);
}
