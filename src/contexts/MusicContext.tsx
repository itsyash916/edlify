import { createContext, useContext, useState, ReactNode } from "react";

interface MusicContextType {
  isMusicPlaying: boolean;
  showFloatingController: boolean;
  setIsMusicPlaying: (playing: boolean) => void;
  setShowFloatingController: (show: boolean) => void;
  startMusicFromPomodoro: () => void;
  stopMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showFloatingController, setShowFloatingController] = useState(false);

  const startMusicFromPomodoro = () => {
    setIsMusicPlaying(true);
    setShowFloatingController(true);
  };

  const stopMusic = () => {
    setIsMusicPlaying(false);
    setShowFloatingController(false);
  };

  return (
    <MusicContext.Provider value={{
      isMusicPlaying,
      showFloatingController,
      setIsMusicPlaying,
      setShowFloatingController,
      startMusicFromPomodoro,
      stopMusic,
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
