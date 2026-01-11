import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Palette, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GradientThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const GradientThemePicker = ({ isOpen, onClose, onSave }: GradientThemePickerProps) => {
  const { profile, refreshProfile } = useAuth();
  
  // Color 1 (Primary gradient start)
  const [hue1, setHue1] = useState(217);
  const [saturation1, setSaturation1] = useState(91);
  const [lightness1, setLightness1] = useState(60);
  
  // Color 2 (Primary gradient end)
  const [hue2, setHue2] = useState(262);
  const [saturation2, setSaturation2] = useState(83);
  const [lightness2, setLightness2] = useState(58);
  
  const [saving, setSaving] = useState(false);
  const [activeColor, setActiveColor] = useState<1 | 2>(1);

  // Parse current accent color on open
  useEffect(() => {
    if (isOpen && profile?.accent_color) {
      try {
        const [color1, color2] = profile.accent_color.split("|");
        if (color1) {
          const parts1 = color1.split(" ");
          if (parts1.length === 3) {
            setHue1(parseInt(parts1[0]) || 217);
            setSaturation1(parseInt(parts1[1]) || 91);
            setLightness1(parseInt(parts1[2]) || 60);
          }
        }
        if (color2) {
          const parts2 = color2.split(" ");
          if (parts2.length === 3) {
            setHue2(parseInt(parts2[0]) || 262);
            setSaturation2(parseInt(parts2[1]) || 83);
            setLightness2(parseInt(parts2[2]) || 58);
          }
        }
      } catch (e) {
        // Use defaults
      }
    }
  }, [isOpen, profile?.accent_color]);

  const color1Hsl = `hsl(${hue1}, ${saturation1}%, ${lightness1}%)`;
  const color2Hsl = `hsl(${hue2}, ${saturation2}%, ${lightness2}%)`;
  const gradientPreview = `linear-gradient(135deg, ${color1Hsl}, ${color2Hsl})`;
  
  const currentHue = activeColor === 1 ? hue1 : hue2;
  const currentSaturation = activeColor === 1 ? saturation1 : saturation2;
  const currentLightness = activeColor === 1 ? lightness1 : lightness2;
  
  const setHue = (v: number) => activeColor === 1 ? setHue1(v) : setHue2(v);
  const setSaturation = (v: number) => activeColor === 1 ? setSaturation1(v) : setSaturation2(v);
  const setLightness = (v: number) => activeColor === 1 ? setLightness1(v) : setLightness2(v);

  const saveGradient = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    
    const gradientValue = `${hue1} ${saturation1}% ${lightness1}%|${hue2} ${saturation2}% ${lightness2}%`;
    
    await supabase
      .from("profiles")
      .update({ accent_color: gradientValue })
      .eq("id", profile.id);
    
    // Apply theme immediately
    applyTheme(hue1, saturation1, lightness1, hue2, saturation2, lightness2);
    
    await refreshProfile();
    setSaving(false);
    toast.success("Theme gradient applied!");
    onSave?.();
    onClose();
  };

  // Apply theme to CSS variables
  const applyTheme = (h1: number, s1: number, l1: number, h2: number, s2: number, l2: number) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", `${h1} ${s1}% ${l1}%`);
    root.style.setProperty("--primary-glow", `${h1} ${s1}% ${Math.min(100, l1 + 10)}%`);
    root.style.setProperty("--secondary", `${h2} ${s2}% ${l2}%`);
    root.style.setProperty("--secondary-glow", `${h2} ${s2}% ${Math.min(100, l2 + 10)}%`);
    root.style.setProperty("--ring", `${h1} ${s1}% ${l1}%`);
  };

  // Preview theme on color change
  useEffect(() => {
    if (isOpen && isAccentActive) {
      applyTheme(hue1, saturation1, lightness1, hue2, saturation2, lightness2);
    }
  }, [hue1, saturation1, lightness1, hue2, saturation2, lightness2, isOpen]);

  // Check if accent color is active (has valid expiry)
  const isAccentActive = profile?.accent_expires_at && 
    new Date(profile.accent_expires_at) > new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Theme Gradient Customizer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Gradient preview */}
          <div className="relative">
            <div
              className="w-full h-32 rounded-2xl shadow-lg border border-border overflow-hidden"
              style={{ background: gradientPreview }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-lg font-bold drop-shadow-lg">Your Theme</span>
              </div>
            </div>
            {isAccentActive && (
              <p className="text-xs text-success mt-2 text-center">
                Active until {new Date(profile!.accent_expires_at!).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Color selection tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveColor(1)}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                activeColor === 1 ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <div 
                  className="w-6 h-6 rounded-full shadow-md"
                  style={{ backgroundColor: color1Hsl }}
                />
                <span className="text-sm font-medium">Color 1</span>
                {activeColor === 1 && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
            <button
              onClick={() => setActiveColor(2)}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                activeColor === 2 ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <div 
                  className="w-6 h-6 rounded-full shadow-md"
                  style={{ backgroundColor: color2Hsl }}
                />
                <span className="text-sm font-medium">Color 2</span>
                {activeColor === 2 && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          </div>

          {/* Color wheel visualization */}
          <div className="flex justify-center">
            <div className="relative w-48 h-48">
              <div 
                className="w-full h-full rounded-full"
                style={{
                  background: `conic-gradient(
                    hsl(0, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(60, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(120, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(180, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(240, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(300, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(360, ${currentSaturation}%, ${currentLightness}%)
                  )`,
                }}
              />
              <motion.div
                className="absolute w-6 h-6 rounded-full border-4 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
                style={{
                  backgroundColor: activeColor === 1 ? color1Hsl : color2Hsl,
                  top: `${50 - 40 * Math.cos((currentHue - 90) * Math.PI / 180)}%`,
                  left: `${50 + 40 * Math.sin((currentHue - 90) * Math.PI / 180)}%`,
                }}
                animate={{
                  top: `${50 - 40 * Math.cos((currentHue - 90) * Math.PI / 180)}%`,
                  left: `${50 + 40 * Math.sin((currentHue - 90) * Math.PI / 180)}%`,
                }}
              />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label>Hue</Label>
                <span className="text-sm text-muted-foreground">{currentHue}°</span>
              </div>
              <div 
                className="h-3 rounded-full mb-2"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(60, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(120, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(180, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(240, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(300, ${currentSaturation}%, ${currentLightness}%), 
                    hsl(360, ${currentSaturation}%, ${currentLightness}%)
                  )`
                }}
              />
              <Slider
                value={[currentHue]}
                onValueChange={([v]) => setHue(v)}
                max={360}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Saturation</Label>
                <span className="text-sm text-muted-foreground">{currentSaturation}%</span>
              </div>
              <div 
                className="h-3 rounded-full mb-2"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(${currentHue}, 0%, ${currentLightness}%), 
                    hsl(${currentHue}, 100%, ${currentLightness}%)
                  )`
                }}
              />
              <Slider
                value={[currentSaturation]}
                onValueChange={([v]) => setSaturation(v)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Lightness</Label>
                <span className="text-sm text-muted-foreground">{currentLightness}%</span>
              </div>
              <div 
                className="h-3 rounded-full mb-2"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(${currentHue}, ${currentSaturation}%, 10%), 
                    hsl(${currentHue}, ${currentSaturation}%, 50%), 
                    hsl(${currentHue}, ${currentSaturation}%, 90%)
                  )`
                }}
              />
              <Slider
                value={[currentLightness]}
                onValueChange={([v]) => setLightness(v)}
                min={20}
                max={80}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Preview elements */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <p className="text-sm text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="px-4 py-2 rounded-lg text-white font-medium text-sm"
                style={{ background: gradientPreview }}
              >
                Button
              </button>
              <span 
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${color1Hsl}20`, 
                  color: color1Hsl 
                }}
              >
                Badge
              </span>
              <div
                className="w-8 h-8 rounded-full shadow-lg"
                style={{ background: gradientPreview }}
              />
              <div
                className="flex-1 h-2 rounded-full"
                style={{ background: gradientPreview }}
              />
            </div>
          </div>

          <Button
            variant="gradient"
            onClick={saveGradient}
            disabled={saving || !isAccentActive}
            className="w-full"
          >
            {!isAccentActive ? "Purchase Theme Color First" : saving ? "Saving..." : "Apply Theme Gradient"}
          </Button>

          {!isAccentActive && (
            <p className="text-xs text-center text-muted-foreground">
              Win or purchase Theme Color from the shop to customize your app colors
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
