import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader = ({ onComplete }: PreloaderProps) => {
  const [stage, setStage] = useState<"logo" | "signature" | "exit">("logo");

  useEffect(() => {
    const timer1 = setTimeout(() => setStage("signature"), 1200);
    const timer2 = setTimeout(() => setStage("exit"), 2800);
    const timer3 = setTimeout(() => onComplete(), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage !== "exit" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(217 91% 60% / 0.3) 0%, transparent 70%)",
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(262 83% 58% / 0.3) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 20,
              duration: 0.8 
            }}
            className="relative z-10"
          >
            <motion.h1
              className="text-6xl md:text-8xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(262 83% 58%), hsl(160 84% 39%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              EDLIFY
            </motion.h1>
            
            {/* Glow effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0.3] }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="absolute inset-0 blur-2xl -z-10"
              style={{
                background: "linear-gradient(135deg, hsl(217 91% 60% / 0.5), hsl(262 83% 58% / 0.5))",
              }}
            />
          </motion.div>

          {/* Signature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={stage === "signature" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <motion.p
              className="text-muted-foreground text-sm"
            >
              made with{" "}
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
                className="inline-block text-destructive"
              >
                ❤️
              </motion.span>
              {" "}by
            </motion.p>
            <motion.p
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-xl md:text-2xl text-primary"
              style={{
                fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                fontStyle: "italic",
              }}
            >
              V.Yash.Raj
            </motion.p>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "120px", opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 h-1 rounded-full bg-muted overflow-hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="h-full w-1/2 rounded-full gradient-primary"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
