import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Play, Pause, X, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingMusicControllerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const FloatingMusicController = ({ isVisible, onClose }: FloatingMusicControllerProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isVisible && !audioRef.current) {
      // Create audio element for lofi stream
      audioRef.current = new Audio();
      audioRef.current.src = "https://streams.ilovemusic.de/iloveradio17.mp3";
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isVisible && isPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isVisible, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(true);
    setIsMuted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-20 right-4 z-50"
        >
          <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 p-3">
            <div className="flex items-center gap-2">
              {/* Music icon */}
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
              >
                <Music2 className="w-5 h-5 text-primary-foreground" />
              </motion.div>
              
              {/* Controls */}
              <div className="flex items-center gap-1">
                {/* Play/Pause */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </motion.button>
                
                {/* Volume */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </motion.button>
                  
                  {/* Volume Slider */}
                  <AnimatePresence>
                    {showVolumeSlider && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onMouseLeave={() => setShowVolumeSlider(false)}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-card border border-border rounded-lg shadow-lg"
                      >
                        <input
                          type="range"
                          min="0"
                          max="100"
                          defaultValue={50}
                          onChange={(e) => {
                            if (audioRef.current) {
                              audioRef.current.volume = Number(e.target.value) / 100;
                            }
                          }}
                          className="w-20 h-1 accent-primary"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Close */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            
            {/* Playing indicator */}
            {isPlaying && (
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
