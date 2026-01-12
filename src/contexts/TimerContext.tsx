import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface TimerState {
  isVisible: boolean;
  timeLeft: number;
  isRunning: boolean;
  isInfinite: boolean;
  showActivityCheck: boolean;
}

interface TimerContextType {
  timerState: TimerState;
  showFloatingTimer: (visible: boolean) => void;
  updateTimerState: (state: Partial<TimerState>) => void;
  onPause: (() => void) | null;
  onResume: (() => void) | null;
  onReset: (() => void) | null;
  onContinue: (() => void) | null;
  setTimerCallbacks: (callbacks: {
    onPause?: () => void;
    onResume?: () => void;
    onReset?: () => void;
    onContinue?: () => void;
  }) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [timerState, setTimerState] = useState<TimerState>({
    isVisible: false,
    timeLeft: 0,
    isRunning: false,
    isInfinite: false,
    showActivityCheck: false,
  });
  
  const [callbacks, setCallbacks] = useState<{
    onPause?: () => void;
    onResume?: () => void;
    onReset?: () => void;
    onContinue?: () => void;
  }>({});

  const showFloatingTimer = useCallback((visible: boolean) => {
    setTimerState(prev => ({ ...prev, isVisible: visible }));
  }, []);

  const updateTimerState = useCallback((state: Partial<TimerState>) => {
    setTimerState(prev => ({ ...prev, ...state }));
  }, []);

  const setTimerCallbacks = useCallback((newCallbacks: typeof callbacks) => {
    setCallbacks(newCallbacks);
  }, []);

  return (
    <TimerContext.Provider value={{
      timerState,
      showFloatingTimer,
      updateTimerState,
      onPause: callbacks.onPause || null,
      onResume: callbacks.onResume || null,
      onReset: callbacks.onReset || null,
      onContinue: callbacks.onContinue || null,
      setTimerCallbacks,
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
};
