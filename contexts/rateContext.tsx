import React, { createContext, useContext, useState, ReactNode } from 'react';

type RateContextType = {
  hourlyRate: number;
  setHourlyRate: (rate: number) => void;
};

const RateContext = createContext<RateContextType | undefined>(undefined);

export function RateProvider({ children }: { children: ReactNode }) {
  const [hourlyRate, setHourlyRate] = useState(0);

  return (
    <RateContext.Provider value={{ hourlyRate, setHourlyRate }}>
      {children}
    </RateContext.Provider>
  );
}

export const useRate = () => {
  const context = useContext(RateContext);
  if (!context) {
    throw new Error('useRate must be used within RateProvider');
  }
  return context;
};