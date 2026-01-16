import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Minimize2, Maximize2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TIPS = [
  "Take short breaks every 25-30 minutes to stay fresh! 🧠",
  "Drink water! Staying hydrated helps concentration. 💧",
  "Try the Pomodoro technique - 25 min focus, 5 min break! ⏱️",
  "Review your notes before sleeping - it helps memory! 😴",
  "Exercise boosts brain power! Take a quick stretch. 🏃",
  "Use mnemonics to remember complex information! 🎯",
  "Teach what you learn to others - it reinforces knowledge! 📚",
  "Get enough sleep - your brain consolidates learning while resting! 💤",
];

const FACTS = [
  "Your brain uses 20% of your body's energy! 🧠",
  "Reading rewires your brain and creates new neural pathways! 📖",
  "The brain can process images in just 13 milliseconds! ⚡",
  "Learning a new skill changes your brain structure! 🌟",
  "Your brain generates about 70,000 thoughts per day! 💭",
  "Music can improve memory and focus while studying! 🎵",
];

const QUOTES = [
  "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
  "Education is the passport to the future. - Malcolm X",
  "The more that you read, the more things you will know. - Dr. Seuss",
  "Success is the sum of small efforts repeated day in and day out. - Robert Collier",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
];

export const MrMomo = () => {
  const { profile } = useAuth();
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 150 });
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTip, setCurrentTip] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const lastBreakReminder = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial greeting
  useEffect(() => {
    if (profile?.name) {
      const greeting = `Hi ${profile.name.split(' ')[0]}! I'm Mr. Momo, your study buddy! 🐼 How can I help you today?`;
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [profile?.name]);

  // Random tip every 10 minutes
  useEffect(() => {
    const showRandomTip = () => {
      const allContent = [...TIPS, ...FACTS, ...QUOTES];
      const randomTip = allContent[Math.floor(Math.random() * allContent.length)];
      setCurrentTip(randomTip);
      setShowBubble(true);
      
      setTimeout(() => setShowBubble(false), 8000);
    };

    // Show initial tip after 30 seconds
    const initialTimeout = setTimeout(showRandomTip, 30000);
    
    // Show tips every 10 minutes
    const interval = setInterval(showRandomTip, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Break reminder for infinite mode (check every minute)
  useEffect(() => {
    const checkBreakReminder = () => {
      const now = Date.now();
      if (now - lastBreakReminder.current >= 60 * 60 * 1000) { // 60 mins
        lastBreakReminder.current = now;
        
        // Play sound
        if (audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
        
        const breakMessage = `Hey ${profile?.name?.split(' ')[0] || 'friend'}! 🐼 You've been studying for over 60 minutes. Take a short break to rest your eyes and stretch!`;
        setCurrentTip(breakMessage);
        setShowBubble(true);
        toast.info("Mr. Momo says: Take a break! 🐼");
        
        setTimeout(() => setShowBubble(false), 10000);
      }
    };

    const interval = setInterval(checkBreakReminder, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [profile?.name]);

  // Create audio element
  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audioRef.current.volume = 0.4;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("momo-chat", {
        body: { 
          message: userMessage,
          userName: profile?.name?.split(' ')[0] || "friend",
          conversationHistory: messages.slice(-10) // Last 10 messages for context
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("Momo chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Oops! I'm having trouble thinking right now. Try again in a moment! 🐼" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Draggable Panda */}
      <motion.div
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.1}
        initial={{ x: position.x, y: position.y }}
        className="fixed z-50 cursor-grab active:cursor-grabbing"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onDragEnd={(_, info) => {
          setPosition({
            x: Math.max(0, Math.min(window.innerWidth - 80, position.x + info.offset.x)),
            y: Math.max(0, Math.min(window.innerHeight - 80, position.y + info.offset.y)),
          });
        }}
      >
        {/* Speech Bubble */}
        <AnimatePresence>
          {showBubble && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64"
            >
              <div className="glass-card p-3 rounded-xl text-xs text-foreground shadow-lg">
                {currentTip}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                  <div className="w-3 h-3 bg-background/80 rotate-45 border-r border-b border-border" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panda Avatar */}
        <motion.div
          onClick={() => {
            setIsOpen(!isOpen);
            setShowBubble(false);
          }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-200 shadow-xl border-2 border-border flex items-center justify-center relative overflow-hidden"
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Panda Face */}
          <div className="relative w-12 h-12">
            {/* Face */}
            <div className="absolute inset-0 bg-white rounded-full" />
            
            {/* Ears */}
            <div className="absolute -top-1 left-0 w-4 h-4 bg-gray-800 rounded-full" />
            <div className="absolute -top-1 right-0 w-4 h-4 bg-gray-800 rounded-full" />
            
            {/* Eye patches */}
            <div className="absolute top-3 left-1 w-4 h-3 bg-gray-800 rounded-full transform -rotate-12" />
            <div className="absolute top-3 right-1 w-4 h-3 bg-gray-800 rounded-full transform rotate-12" />
            
            {/* Eyes */}
            <motion.div 
              className="absolute top-3.5 left-2 w-2 h-2 bg-white rounded-full"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.div 
              className="absolute top-3.5 right-2 w-2 h-2 bg-white rounded-full"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            
            {/* Nose */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-2 h-1.5 bg-gray-800 rounded-full" />
            
            {/* Mouth */}
            <div className="absolute top-7.5 left-1/2 -translate-x-1/2 w-3 h-1 border-b-2 border-gray-800 rounded-full" />
          </div>
        </motion.div>
        
        {/* Name tag */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-2xs font-medium text-muted-foreground whitespace-nowrap bg-background/80 px-2 py-0.5 rounded-full">
          Mr. Momo
        </div>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 z-50 w-80 max-h-[60vh]"
          >
            <GlassCard className="p-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-border bg-primary/5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐼</span>
                  <div>
                    <h4 className="text-sm font-semibold">Mr. Momo</h4>
                    <p className="text-2xs text-muted-foreground">Your Study Buddy</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              {!isMinimized && (
                <>
                  <ScrollArea className="h-64 p-3">
                    <div className="space-y-3">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] p-2.5 rounded-xl text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted p-2.5 rounded-xl rounded-bl-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-3 border-t border-border">
                    <div className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask Mr. Momo..."
                        className="flex-1 h-9 text-sm"
                        disabled={isLoading}
                      />
                      <Button
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};