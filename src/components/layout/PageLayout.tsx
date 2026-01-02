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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom bg-background border-t border-border">
      <div className="mx-auto max-w-lg px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-muted rounded-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
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
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/")}
            className="cursor-pointer"
          >
            <h1 className="text-lg font-semibold">EDLIFY</h1>
          </motion.div>
          {title && (
            <>
              <div className="w-px h-4 bg-border" />
              <span className="text-sm text-muted-foreground">{title}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {showPoints && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted">
              <Zap className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{points.toLocaleString()}</span>
            </div>
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
    <div className="min-h-screen bg-background">
      {showHeader && (
        <Header 
          title={title} 
          showPoints={showPoints} 
          points={points}
          rightContent={headerContent}
        />
      )}
      <main className={cn(
        "px-4 py-6 mx-auto max-w-lg",
        showNav && "pb-24",
        className
      )}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};