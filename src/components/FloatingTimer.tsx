import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, X, Eye, EyeOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

interface FloatingTimerProps {
  isVisible: boolean;
  timeLeft: number;
  isRunning: boolean;
  isInfinite: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onClose: () => void;
  showActivityCheck?: boolean;
  onContinue?: () => void;
}

export const FloatingTimer = ({
  isVisible,
  timeLeft,
  isRunning,
  isInfinite,
  onPause,
  onResume,
  onReset,
  onClose,
  showActivityCheck,
  onContinue,
}: FloatingTimerProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isVisible) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        className="fixed z-[9999] cursor-grab active:cursor-grabbing"
        style={{ top: position.y, right: position.x }}
      >
        {showActivityCheck ? (
          // Activity check prompt
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="glass-card p-4 border-2 border-warning shadow-[0_0_30px_hsl(38_92%_50%_/_0.4)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-5 h-5 text-warning animate-bounce" />
              <span className="font-semibold text-warning">Are you still there?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Click continue to keep earning points
            </p>
            <Button 
              variant="gradient" 
              size="sm" 
              onClick={onContinue}
              className="w-full"
            >
              Continue Studying
            </Button>
          </motion.div>
        ) : isMinimized ? (
          // Minimized view
          <motion.div
            className="glass-card p-2 flex items-center gap-2 cursor-pointer"
            onClick={() => setIsMinimized(false)}
            whileHover={{ scale: 1.05 }}
          >
            <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-success animate-pulse" : "bg-warning"}`} />
            <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        ) : (
          // Full view
          <div className="glass-card p-4 min-w-[180px] shadow-[0_0_30px_hsl(var(--primary)_/_0.3)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">Focus Timer</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <EyeOff className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
            
            <div className="text-center mb-3">
              <span className={`text-3xl font-bold font-mono ${isRunning ? "text-primary" : "text-muted-foreground"}`}>
                {formatTime(timeLeft)}
              </span>
              {isInfinite && (
                <p className="text-xs text-muted-foreground mt-1">Infinite Mode</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              {isRunning ? (
                <Button variant="outline" size="sm" onClick={onPause} className="h-8 px-3">
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button variant="gradient" size="sm" onClick={onResume} className="h-8 px-3">
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-3">
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
            
            <div className={`mt-2 h-1 rounded-full overflow-hidden bg-muted`}>
              <motion.div
                className="h-full bg-primary"
                animate={{ width: isRunning ? "100%" : "0%" }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  // Use portal to render at body level
  return createPortal(content, document.body);
};
