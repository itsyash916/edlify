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
                background: "radial-gradient(circle, hsl(262 83% 58% / 0.4) 0%, transparent 70%)",
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(0 0% 0% / 0.3) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Logo - Cursive style */}
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
              className="text-6xl md:text-8xl font-bold tracking-tight"
              style={{
                fontFamily: "'Brush Script MT', 'Segoe Script', 'Dancing Script', cursive",
                background: "linear-gradient(135deg, hsl(0 0% 10%), hsl(262 83% 45%), hsl(262 83% 65%))",
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
              animate={{ opacity: [0, 0.6, 0.4] }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="absolute inset-0 blur-3xl -z-10"
              style={{
                background: "linear-gradient(135deg, hsl(262 83% 50% / 0.6), hsl(0 0% 0% / 0.3))",
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
            
            {/* Signature with letter-by-letter reveal */}
            <div className="relative overflow-hidden">
              <motion.p
                className="text-2xl md:text-3xl text-primary relative"
                style={{
                  fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive",
                  fontWeight: 600,
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
              className="h-full w-1/2 rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(262 83% 55%), hsl(262 83% 70%))",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
