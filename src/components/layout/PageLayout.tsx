import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  Home, 
  Trophy, 
  Timer, 
  HelpCircle, 
  User,
  Zap
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Zap, label: "Quiz", path: "/quiz" },
  { icon: Timer, label: "Focus", path: "/pomodoro" },
  { icon: Trophy, label: "Rank", path: "/leaderboard" },
  { icon: HelpCircle, label: "Doubts", path: "/doubts" },
  { icon: User, label: "Personal", path: "/personal" },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-auto max-w-lg px-4 pb-2">
        <div className="glass-card px-2 py-2 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 relative z-10", isActive && "drop-shadow-[0_0_8px_hsl(217_91%_60%_/_0.5)]")} />
                <span className="text-2xs font-medium relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

interface HeaderProps {
  title?: string;
  showPoints?: boolean;
  points?: number;
  rightContent?: React.ReactNode;
}

export const Header = ({ title, showPoints = true, points = 0, rightContent }: HeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <header className="sticky top-0 z-40 safe-top">
      <div className="glass-card mx-4 mt-4 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="cursor-pointer"
          >
            <h1 className="text-xl font-bold text-gradient-primary">EDLIFY</h1>
          </motion.div>
          {title && (
            <>
              <div className="w-px h-5 bg-border" />
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {showPoints && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/30"
            >
              <Zap className="w-4 h-4 text-success" />
              <span className="text-sm font-bold text-success">{points.toLocaleString()}</span>
            </motion.div>
          )}
          {rightContent}
        </div>
      </div>
    </header>
  );
};

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNav?: boolean;
  showHeader?: boolean;
  showPoints?: boolean;
  points?: number;
  headerContent?: React.ReactNode;
  className?: string;
}

export const PageLayout = ({
  children,
  title,
  showNav = true,
  showHeader = true,
  showPoints = true,
  points = 0,
  headerContent,
  className,
}: PageLayoutProps) => {
  return (
    <div className="min-h-screen animated-bg">
      {showHeader && (
        <Header 
          title={title} 
          showPoints={showPoints} 
          points={points}
          rightContent={headerContent}
        />
      )}
      <main className={cn(
        "px-4 py-6",
        showNav && "pb-28",
        className
      )}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};
