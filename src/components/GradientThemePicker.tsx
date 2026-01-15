import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Check, Lock } from "lucide-react";

interface GradientThemePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GradientTheme {
  color1: string;
  color2: string;
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#A855F7", // Violet
  "#F43F5E", // Rose
];

export const GradientThemePicker = ({ open, onOpenChange }: GradientThemePickerProps) => {
  const { profile, refreshProfile } = useAuth();
  const [color1, setColor1] = useState("#3B82F6");
  const [color2, setColor2] = useState("#8B5CF6");
  const [saving, setSaving] = useState(false);

  const gradientTheme = (profile as any)?.gradient_theme as GradientTheme | null;
  const expiresAt = (profile as any)?.gradient_theme_expires_at;
  const isActive = expiresAt && new Date(expiresAt) > new Date();

  useEffect(() => {
    if (gradientTheme) {
      setColor1(gradientTheme.color1 || "#3B82F6");
      setColor2(gradientTheme.color2 || "#8B5CF6");
    }
  }, [gradientTheme]);

  const daysRemaining = isActive
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const saveTheme = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    
    const theme: GradientTheme = { color1, color2 };
    
    const { error } = await supabase
      .from("profiles")
      .update({ gradient_theme: theme } as any)
      .eq("id", profile.id);
    
    if (error) {
      toast.error("Failed to save theme");
    } else {
      await refreshProfile();
      toast.success("Theme saved!");
      onOpenChange(false);
    }
    
    setSaving(false);
  };

  const resetTheme = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    
    await supabase
      .from("profiles")
      .update({ gradient_theme: null } as any)
      .eq("id", profile.id);
    
    await refreshProfile();
    toast.success("Theme reset to default!");
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-secondary" />
            Custom Theme
          </DialogTitle>
        </DialogHeader>

        {!isActive ? (
          <div className="text-center py-8">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Theme Locked</p>
            <p className="text-sm text-muted-foreground mb-4">
              Win a theme unlock from Lucky Spin to customize your app colors!
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/30">
              <span className="text-sm font-medium text-success">Theme Active</span>
              <span className="text-xs text-muted-foreground">{daysRemaining} days remaining</span>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <motion.div
                className="h-24 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${color1}, ${color2})`,
                }}
                animate={{
                  background: `linear-gradient(135deg, ${color1}, ${color2})`,
                }}
              >
                <span className="text-white font-bold text-xl drop-shadow-lg">EDLIFY</span>
              </motion.div>
            </div>

            {/* Color 1 */}
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColor1(color)}
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: color1 === color ? "white" : "transparent",
                    }}
                  >
                    {color1 === color && <Check className="w-4 h-4 text-white mx-auto" />}
                  </button>
                ))}
              </div>
              <input
                type="color"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Color 2 */}
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColor2(color)}
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: color2 === color ? "white" : "transparent",
                    }}
                  >
                    {color2 === color && <Check className="w-4 h-4 text-white mx-auto" />}
                  </button>
                ))}
              </div>
              <input
                type="color"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetTheme} disabled={saving} className="flex-1">
                Reset to Default
              </Button>
              <Button variant="gradient" onClick={saveTheme} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Apply Theme"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
