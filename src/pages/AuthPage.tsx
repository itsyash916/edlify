import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { isNativeApp, openOAuthInBrowser, initDeepLinkListener } from "@/lib/capacitor";

const AuthPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();

    // Initialize deep link listener for native OAuth callback
    initDeepLinkListener(() => {
      navigate("/");
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Use external browser for native apps to avoid WebView OAuth block
      if (isNativeApp()) {
        await openOAuthInBrowser();
        // Don't set loading to false - user will be redirected back via deep link
        return;
      }
      
      // Regular web OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <FadeIn>
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-5xl font-black tracking-tight mb-2"
              style={{
                background: "linear-gradient(135deg, hsl(0 0% 0%), hsl(262 83% 40%), hsl(262 83% 58%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              EDLIFY
            </motion.h1>
            <p className="text-muted-foreground">Study. Compete. Improve.</p>
          </div>

          {/* Auth Card */}
          <ScaleIn delay={0.1}>
            <GlassCard className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-2">Welcome!</h2>
                <p className="text-muted-foreground text-sm">
                  Sign in with your Google account to continue
                </p>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full flex items-center justify-center gap-3 py-6"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-6">
                By continuing, you agree to EDLIFY's Terms of Service and Privacy Policy
              </p>
            </GlassCard>
          </ScaleIn>

          {/* Made by */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            made with ❤️ by V.Yash.Raj
          </p>
        </FadeIn>
      </div>
    </div>
  );
};

export default AuthPage;
