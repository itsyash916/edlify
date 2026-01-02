import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader = ({ onComplete }: PreloaderProps) => {
  const [stage, setStage] = useState<"logo" | "signature" | "exit">("logo");

  useEffect(() => {
    const timer1 = setTimeout(() => setStage("signature"), 1200);
    const timer2 = setTimeout(() => setStage("exit"), 3200);
    const timer3 = setTimeout(() => onComplete(), 3900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  const signatureText = "V.Yash.Raj";
  const logoText = "edlify";

  return (
    <AnimatePresence>
      {stage !== "exit" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          {/* Animated background - subtle and elegant */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ duration: 1.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(262 83% 58% / 0.3) 0%, transparent 60%)",
              }}
            />
          </div>

          {/* Logo - Thin elegant signature reveal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 15,
              duration: 1 
            }}
            className="relative z-10"
          >
            <div className="relative overflow-hidden">
              {/* Letter by letter reveal like a signature */}
              <motion.h1
                className="text-6xl md:text-8xl tracking-wide"
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  fontWeight: 400,
                  letterSpacing: "0.05em",
                }}
              >
                {logoText.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 20, x: -10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: 0.1 + index * 0.12,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className="inline-block"
                    style={{
                      background: "linear-gradient(135deg, hsl(262 83% 70%), hsl(262 83% 55%), hsl(262 50% 40%))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      textShadow: "0 0 40px hsl(262 83% 58% / 0.3)",
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.h1>
              
              {/* Signature underline that draws from left to right */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="h-[2px] mt-2 rounded-full origin-left"
                style={{
                  background: "linear-gradient(90deg, hsl(262 83% 60%), hsl(262 83% 70%), transparent)",
                }}
              />
            </div>
            
            {/* Subtle glow effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 2, delay: 0.5 }}
              className="absolute inset-0 blur-3xl -z-10"
              style={{
                background: "radial-gradient(ellipse, hsl(262 83% 50% / 0.4), transparent 70%)",
              }}
            />
          </motion.div>

          {/* Signature with left-to-right reveal animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={stage === "signature" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <motion.p
              className="text-muted-foreground text-sm tracking-wider"
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
            
            {/* Signature with letter-by-letter reveal */}
            <div className="relative overflow-hidden">
              <motion.p
                className="text-2xl md:text-3xl text-primary relative"
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  fontWeight: 500,
                }}
              >
                {signatureText.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.15, 
                      delay: 0.3 + index * 0.08,
                      ease: "easeOut"
                    }}
                    className="inline-block"
                    style={{
                      background: "linear-gradient(135deg, hsl(262 83% 60%), hsl(262 83% 80%))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.p>
              
              {/* Signature underline animation */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
                className="h-0.5 mt-1 rounded-full origin-left"
                style={{
                  background: "linear-gradient(90deg, hsl(262 83% 60%), transparent)",
                }}
              />
            </div>
          </motion.div>

          {/* Loading bar - thin and elegant */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100px", opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 h-[2px] rounded-full bg-muted/30 overflow-hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="h-full w-1/2 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(262 83% 60%), transparent)",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
