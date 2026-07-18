import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';

type CallContextType = {
  // Protection against contact picker noise
  justPickedContactRef: React.MutableRefObject<boolean>;
  setJustPickedContact: (value: boolean) => void;

  // Main stage flag - only true after user clicks "Make Call"
  callInProgress: boolean;
  setCallInProgress: (value: boolean) => void;

  // Optional: clear everything (useful after saving a call)
  resetCallState: () => void;
};

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const justPickedContactRef = useRef(false);
  const [callInProgress, setCallInProgressState] = useState(false);

  const setJustPickedContact = (value: boolean) => {
    justPickedContactRef.current = value;
  };

  const setCallInProgress = (value: boolean) => {
    setCallInProgressState(value);
  };

  const resetCallState = () => {
    justPickedContactRef.current = false;
    setCallInProgressState(false);
  };

  return (
    <CallContext.Provider
      value={{
        justPickedContactRef,
        setJustPickedContact,
        callInProgress,
        setCallInProgress,
        resetCallState,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within CallProvider');
  }
  return context;
};