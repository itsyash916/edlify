import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { MusicProvider } from "@/contexts/MusicContext";
import { Preloader } from "@/components/Preloader";
import { FloatingMusicController } from "@/components/FloatingMusicController";
import { useMusic } from "@/contexts/MusicContext";
import Index from "./pages/Index";
import QuizPage from "./pages/QuizPage";
import PomodoroPage from "./pages/PomodoroPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import DoubtsPage from "./pages/DoubtsPage";
import PersonalPage from "./pages/PersonalPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const FloatingMusicWrapper = () => {
  const { showFloatingController, stopMusic } = useMusic();
  return <FloatingMusicController isVisible={showFloatingController} onClose={stopMusic} />;
};

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
        <Route path="/pomodoro" element={<ProtectedRoute><PomodoroPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path="/doubts" element={<ProtectedRoute><DoubtsPage /></ProtectedRoute>} />
        <Route path="/personal" element={<ProtectedRoute><PersonalPage /></ProtectedRoute>} />
        <Route path="/profile" element={<Navigate to="/personal" replace />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <FloatingMusicWrapper />
    </>
  );
};

const App = () => {
  const [showPreloader, setShowPreloader] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MusicProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showPreloader && <Preloader onComplete={() => setShowPreloader(false)} />}
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </MusicProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
